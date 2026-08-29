const fs = require('fs');
const path = require('path');

const agentsFilePath = path.join(__dirname, '../data/agents.json');

function loadAgents() {
  try {
    const fileData = fs.readFileSync(agentsFilePath, 'utf8');
    return JSON.parse(fileData || '[]');
  } catch (err) {
    console.error('Failed to load agents.json:', err);
    return [];
  }
}

function getAgentProfile(agentId) {
  const agents = loadAgents();
  const record = agents.find((a) => a.agent_id === agentId);
  if (!record) return null;

  return {
    agentId: record.agent_id,
    role: record.role,
    allowedAssets: record.allowed_assets,
    maxTransactionAmount: record.max_transaction_amount,
    approvedContracts: record.approved_contracts,
    allowedActions: record.allowed_actions
  };
}

function verifyAuthority(agentId, transaction) {
  const agent = getAgentProfile(agentId);
  if (!agent) {
    return { authorized: false, reason: `Agent ID '${agentId}' not found in registry` };
  }

  const rawAction = transaction.type || transaction.function || '';
  const actionType = rawAction.toUpperCase();

  if (!agent.allowedActions.includes(actionType)) {
    return {
      authorized: false,
      agent,
      reason: `Agent role '${agent.role}' is not authorized to perform action '${actionType}'.`
    };
  }

  const asset = (transaction.token || transaction.from || '').toString().toUpperCase();
  if (asset && agent.allowedAssets?.length && !agent.allowedAssets.includes(asset)) {
    return {
      authorized: false,
      agent,
      reason: `Agent role '${agent.role}' is not authorized to use asset '${asset}'.`
    };
  }

  return { authorized: true, agent };
}

module.exports = { getAgentProfile, verifyAuthority };
