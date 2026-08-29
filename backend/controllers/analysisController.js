const path = require('path');
const fs = require('fs');
const { extractIntent } = require('../services/intentService');
const { verifyAuthority } = require('../services/authorityService');
const { decodeTransaction } = require('../services/transactionDecoder');
const { simulateTransaction } = require('../services/simulator');
const { evaluatePolicies } = require('../services/policyEngine');
const { verifyIntentConsistency } = require('../services/consistencyEngine');
const { calculateRisk } = require('../services/riskEngine');
const { inferTransactionFromText, generateSampleScenario } = require('../services/scenarioService');
const { scoreFraudRisk } = require('../services/mlFraudService');
const { detectPromptInjection } = require('../services/injectionDetector');
const { detectBehavioralAnomalies, monitorPostExecution } = require('../services/behaviorMonitor');

const dataDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, '../data');
const transactionsFilePath = path.join(dataDir, 'transactions.json');
const agentsFilePath = path.join(__dirname, '../data/agents.json');

function loadTransactionRecords() {
  try {
    if (!fs.existsSync(transactionsFilePath)) return [];
    const fileData = fs.readFileSync(transactionsFilePath, 'utf8');
    return JSON.parse(fileData || '[]');
  } catch (err) {
    console.error('Failed to read transaction log:', err);
    return [];
  }
}

function logTransactionRecord(record) {
  try {
    // Vercel's deployment bundle is read-only, which is why dataDir is
    // /tmp there instead of the repo's data/ folder -- but /tmp is also
    // only local to a single serverless instance and isn't guaranteed to
    // survive a cold start, so this is best-effort persistence for the
    // demo (transactions logged during a warm instance's lifetime show up
    // in the Dashboard/Transactions/Security Log), not a durable store.
    // A previous version skipped writing entirely on Vercel, which meant
    // the transaction log was permanently empty in production. For real
    // durability this should write to a proper database (a Supabase
    // client already exists at services/supabaseClient.js but isn't wired
    // up to a transactions table yet).
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const records = loadTransactionRecords();
    records.push({ ...record, timestamp: new Date().toISOString() });
    fs.writeFileSync(transactionsFilePath, JSON.stringify(records, null, 2));
  } catch (err) {
    console.error('Failed to write transaction log:', err);
  }
}

function normalizeLog(record, index) {
  const result = record.result || {};
  return {
    id: record.id || index + 1,
    timestamp: record.timestamp,
    agentId: record.agentId,
    userIntent: record.userIntent,
    transaction: record.transaction,
    decision: result.decision,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    policyViolations: result.policyViolations || [],
    behaviorFlags: result.behaviorFlags || [],
    postExecution: result.postExecution || null,
    consistency: result.consistency,
    autonomy: result.autonomy
  };
}

async function speakHighRiskAlert(reason) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return;

  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  try {
    await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: `Security alert. High risk transaction blocked. ${reason}`,
        model_id: 'eleven_monolingual_v1'
      })
    });
  } catch (err) {
    console.error('ElevenLabs voice alert failed:', err.message);
  }
}

function buildBlockedResult({ extractedIntent, transaction, transactionSource, reason, violations, extras }) {
  const risk = calculateRisk(
    violations,
    { matched: false, reason },
    extras
  );

  return {
    decision: 'BLOCK',
    riskLevel: 'HIGH',
    riskScore: Math.max(risk.riskScore, 90),
    autonomy: 'blocked_escalated',
    delaySeconds: 0,
    intent: extractedIntent,
    transaction,
    transactionSource,
    consistency: { matched: false, reason },
    policyViolations: violations,
    behaviorFlags: extras.behaviorFlags || [],
    injection: extras.injection || false,
    mlFraudScore: extras.mlFraudScore || null,
    simulation: null,
    postExecution: { status: 'not_executed', alerts: [] },
    summary: reason
  };
}

exports.analyzeTransaction = async (req, res) => {
  try {
    const agentId = req.body.agentId || req.body.agent_id;
    const userIntent = req.body.userIntent || req.body.user_intent;
    let transaction = req.body.transaction;

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing agentId' });
    }
    if (!userIntent || typeof userIntent !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing userIntent' });
    }
    if (transaction != null && typeof transaction !== 'object') {
      return res.status(400).json({ error: 'Invalid transaction structure' });
    }

    const injection = detectPromptInjection(userIntent);
    const history = loadTransactionRecords();

    let transactionSource = 'provided';
    if (transaction == null) {
      transaction = inferTransactionFromText(userIntent);
      transactionSource = 'inferred';
    }

    const extractedIntent = await extractIntent(userIntent);
    const authorityCheck = verifyAuthority(agentId, transaction);
    const behaviorFlags = detectBehavioralAnomalies(history, agentId, transaction);

    if (!authorityCheck.authorized) {
      const result = buildBlockedResult({
        extractedIntent,
        transaction,
        transactionSource,
        reason: authorityCheck.reason,
        violations: ['UNAUTHORIZED_AGENT_ACTION'],
        extras: { injection: injection.detected, behaviorFlags }
      });
      await speakHighRiskAlert(authorityCheck.reason);
      logTransactionRecord({ agentId, userIntent, transaction, result });
      return res.status(200).json(result);
    }

    if (injection.detected) {
      const result = buildBlockedResult({
        extractedIntent,
        transaction,
        transactionSource,
        reason: injection.reason,
        violations: ['PROMPT_INJECTION'],
        extras: { injection: true, behaviorFlags }
      });
      await speakHighRiskAlert(injection.reason);
      logTransactionRecord({ agentId, userIntent, transaction, result });
      return res.status(200).json(result);
    }

    const decodedTx = decodeTransaction(transaction);
    const simulation = simulateTransaction(decodedTx);
    const policyViolations = evaluatePolicies(decodedTx, authorityCheck.agent);
    const mlFraudScore = await scoreFraudRisk(decodedTx, simulation);
    if (mlFraudScore?.isFraud) {
      policyViolations.push('ML_FRAUD_FLAGGED');
    }

    const consistency = verifyIntentConsistency(userIntent, extractedIntent, decodedTx);
    const risk = calculateRisk(policyViolations, consistency, {
      injection: false,
      mlFraud: Boolean(mlFraudScore?.isFraud),
      behaviorFlags
    });

    const postExecution = monitorPostExecution(
      [...history, { agentId, transaction, result: { decision: risk.decision } }],
      agentId,
      risk.decision
    );

    const result = {
      decision: risk.decision,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      autonomy: risk.autonomy,
      delaySeconds: risk.delaySeconds,
      intent: extractedIntent,
      transaction,
      transactionSource,
      consistency,
      policyViolations,
      behaviorFlags,
      injection: false,
      mlFraudScore,
      simulation,
      postExecution,
      summary: risk.summary
    };

    if (risk.decision === 'BLOCK' && risk.riskLevel === 'HIGH') {
      await speakHighRiskAlert(consistency.reason || risk.summary);
    }

    logTransactionRecord({ agentId, userIntent, transaction, result });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in analysis controller:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.generateScenario = async (req, res) => {
  try {
    const scenarioType = req.body.scenarioType === 'injection' ? 'injection' : 'safe';
    const { userIntent, transaction } = await generateSampleScenario(scenarioType);
    return res.status(200).json({ userIntent, transaction, scenarioType });
  } catch (error) {
    console.error('Error generating scenario:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getTransactionLog = (req, res) => {
  try {
    const records = loadTransactionRecords();
    const normalized = records.map(normalizeLog).reverse();
    return res.status(200).json(normalized.slice(0, 50));
  } catch (error) {
    console.error('Error reading transaction log:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAgents = (req, res) => {
  try {
    const fileData = fs.readFileSync(agentsFilePath, 'utf8');
    return res.status(200).json(JSON.parse(fileData || '[]'));
  } catch (error) {
    console.error('Error reading agents:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getPolicies = (req, res) => {
  return res.status(200).json([
    {
      name: 'Spending Limit',
      description: 'Caps each agent to its assigned maximum transaction amount.',
      rule: 'Per-agent max_transaction_amount',
      status: 'ACTIVE',
      severity: 'HIGH'
    },
    {
      name: 'Approved Counterparties',
      description: 'Blocks unknown spenders, recipients, and protocols.',
      rule: 'BLOCK UNKNOWN CONTRACT / RECIPIENT',
      status: 'ACTIVE',
      severity: 'CRITICAL'
    },
    {
      name: 'Unlimited Token Approval',
      description: 'Prevents agents from granting unrestricted spending authority.',
      rule: 'BLOCK UNLIMITED APPROVAL',
      status: 'ACTIVE',
      severity: 'CRITICAL'
    },
    {
      name: 'Intent Consistency',
      description: 'The proposed transaction must match the authorised financial objective.',
      rule: 'INTENT MUST MATCH ACTION',
      status: 'ACTIVE',
      severity: 'CRITICAL'
    },
    {
      name: 'Adversarial Input Defence',
      description: 'Detects prompt injection and instruction override attempts.',
      rule: 'BLOCK PROMPT INJECTION',
      status: 'ACTIVE',
      severity: 'CRITICAL'
    },
    {
      name: 'Graduated Autonomy',
      description: 'Low risk executes autonomously; moderate risk is delayed; high risk is blocked.',
      rule: 'ALLOW / CONSTRAIN / BLOCK',
      status: 'ACTIVE',
      severity: 'HIGH'
    }
  ]);
};

exports.getOverview = (req, res) => {
  try {
    const records = loadTransactionRecords().map(normalizeLog);
    const allowed = records.filter((r) => r.decision === 'ALLOW').length;
    const constrained = records.filter((r) => r.decision === 'CONSTRAIN').length;
    const blocked = records.filter((r) => r.decision === 'BLOCK').length;
    return res.status(200).json({
      total: records.length,
      allowed,
      constrained,
      blocked,
      recent: records.slice(-8).reverse()
    });
  } catch (error) {
    console.error('Error building overview:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
