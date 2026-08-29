// Deterministic natural-language -> transaction inference, used so the
// backend derives the actual transaction from whatever text is in the
// intent box instead of a hardcoded UI toggle silently overriding it.
//
// This is intentionally a regex/keyword heuristic rather than an LLM call:
// it sits on the hot "Analyze Action" path, and we've observed the NVIDIA
// LLM call (used elsewhere for intent classification) occasionally take
// 3+ seconds. A security gate that fails open because an API call was slow
// is a bad trade, so the transaction that actually gets risk-scored is
// always derived deterministically. The AI service is still used for the
// lower-stakes "generate a sample scenario" feature below, where latency
// is acceptable.

const KNOWN_CONTRACTS = ['Uniswap', 'Aave', 'Compound'];

const SUSPICIOUS_KEYWORDS = [
  'anonymous', 'untrusted', 'unverified', 'hacker', 'drain',
  'exfiltrate', 'scam', 'malicious', 'unknown'
];

const UNLIMITED_PATTERN = /\b(unlimited|no limit|any amount|infinite|entire balance|all (of )?(my |the )?funds|max(imum)?\s*(uint|allowance|approval|access))\b/i;

function extractAmount(text) {
  const match = text.match(/\$?\s?([\d][\d,]*(?:\.\d+)?)/);
  if (!match) return undefined;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isNaN(value) ? undefined : value;
}

function extractTarget(text) {
  const addressMatch = text.match(/0x[a-fA-F0-9]{4,}/);
  if (addressMatch) return addressMatch[0];

  const knownMatch = KNOWN_CONTRACTS.find((c) => text.toLowerCase().includes(c.toLowerCase()));
  if (knownMatch) return knownMatch;

  // Account/contract-like identifiers written in caps, e.g. ANONYMOUS_ACC, ACC-123456
  const capsMatch = text.match(/\b([A-Z][A-Z0-9_-]{3,})\b/);
  if (capsMatch) return capsMatch[1];

  return undefined;
}

function isSuspiciousText(text) {
  const lower = text.toLowerCase();
  return SUSPICIOUS_KEYWORDS.some((kw) => lower.includes(kw));
}

function inferTransactionFromText(text) {
  const raw = text || '';
  const amount = extractAmount(raw);
  const target = extractTarget(raw);
  const unlimited = UNLIMITED_PATTERN.test(raw);
  const suspicious = isSuspiciousText(raw);

  if (/\b(rebalance|swap)\b/i.test(raw)) {
    return { type: 'swap', from: 'USDC', to: 'ETH', amount: amount ?? 500 };
  }

  if (/\b(approve|approval|authoriz|allowance|grant)\b/i.test(raw)) {
    return {
      type: 'approve',
      token: 'USDC',
      spender: target || (suspicious ? '0xUnknownContract' : 'Uniswap'),
      amount: unlimited ? 'unlimited' : (amount ?? 100)
    };
  }

  if (/\b(transfer|send|pay|wire|remit)\b/i.test(raw)) {
    return {
      type: 'transfer',
      token: 'USDC',
      to: target || (suspicious ? 'UNKNOWN_RECIPIENT' : 'Treasury'),
      amount: unlimited ? 'unlimited' : (amount ?? 100)
    };
  }

  if (/\b(stake|staking)\b/i.test(raw)) {
    return { type: 'stake', token: 'ETH', protocol: target || 'Aave', amount: amount ?? 100 };
  }

  // No recognizable action verb. If the text still reads as an attack
  // attempt, model the worst-case interpretation rather than shrugging.
  if (suspicious || unlimited) {
    return {
      type: 'approve',
      token: 'USDC',
      spender: target || '0xUnknownContract',
      amount: unlimited ? 'unlimited' : (amount ?? 100)
    };
  }

  return { type: 'unknown', raw };
}

// Each entry is a genuinely paired (userIntent, transaction) example rather
// than just a scary sentence. Safe pairs are consistent with each other;
// injection pairs are deliberately mismatched — an authorized-sounding
// intent paired with a transaction that actually does something else —
// because that divergence is the actual thing ARIA exists to catch.
const LOCAL_SAFE_SCENARIOS = [
  (n) => ({ userIntent: `Rebalance my portfolio using ${n} USDC`, transaction: { type: 'swap', from: 'USDC', to: 'ETH', amount: n } }),
  (n) => ({ userIntent: `Swap ${n} USDC for ETH to rebalance holdings`, transaction: { type: 'swap', from: 'USDC', to: 'ETH', amount: n } }),
  (n) => ({ userIntent: `Approve Uniswap to spend ${n} USDC for an upcoming trade`, transaction: { type: 'approve', token: 'USDC', spender: 'Uniswap', amount: n } }),
  (n) => ({ userIntent: `Stake ${n} ETH into Aave for yield`, transaction: { type: 'stake', token: 'ETH', protocol: 'Aave', amount: n } }),
];

const LOCAL_INJECTION_SCENARIOS = [
  (n) => ({ userIntent: `Rebalance my portfolio using ${n} USDC`, transaction: { type: 'approve', token: 'USDC', spender: '0xUnknownContract', amount: 'unlimited' } }),
  (n) => ({ userIntent: `Swap ${n} USDC for ETH as part of routine rebalancing`, transaction: { type: 'transfer', token: 'USDC', to: 'ANONYMOUS_ACC', amount: n * 100 } }),
  (n) => ({ userIntent: `Approve Uniswap for a small routine trade`, transaction: { type: 'approve', token: 'USDC', spender: '0xUnknownContract', amount: 'unlimited' } }),
  (n) => ({ userIntent: `Stake my ETH into Aave for yield`, transaction: { type: 'approve', token: 'ETH', spender: '0xDrainContract', amount: 'unlimited' } }),
];

function randomAmount() {
  return [250, 500, 750, 1200, 2500, 15000][Math.floor(Math.random() * 6)];
}

function localSampleScenario(scenarioType) {
  const pool = scenarioType === 'injection' ? LOCAL_INJECTION_SCENARIOS : LOCAL_SAFE_SCENARIOS;
  const build = pool[Math.floor(Math.random() * pool.length)];
  return build(randomAmount());
}

async function generateSampleScenario(scenarioType) {
  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (aiServiceUrl) {
    try {
      const controller = new AbortController();
      // Generous timeout deliberately: this is the one call on the
      // non-security-critical path (see note above), and free-tier hosts
      // like Render spin the AI service down after idle, so a cold start
      // alone can take 20s+. A short timeout here would make every
      // "generate scenario" click after idle silently fall back to the
      // canned local templates instead of actually reaching the LLM.
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${aiServiceUrl}/generate-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_type: scenarioType }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`AI service returned ${response.status}`);

      const data = await response.json();
      if (data.userIntent && typeof data.userIntent === 'string' && data.transaction && typeof data.transaction === 'object') {
        return { userIntent: data.userIntent, transaction: data.transaction };
      }
      throw new Error('AI service returned an unexpected shape');
    } catch (err) {
      console.error('AI scenario generation unavailable, using local template:', err.message);
      return localSampleScenario(scenarioType);
    }
  }

  return localSampleScenario(scenarioType);
}

module.exports = { inferTransactionFromText, generateSampleScenario };
