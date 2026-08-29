function numericAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  if (['unlimited', 'max_uint256', 'infinite'].includes(value.toLowerCase())) return Number.POSITIVE_INFINITY;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function destinationOf(tx = {}) {
  return (tx.spender || tx.to || tx.protocol || '').toString().toLowerCase();
}

function detectBehavioralAnomalies(history, agentId, currentTx) {
  const flags = [];
  const agentHistory = (history || []).filter((record) => record.agentId === agentId);
  const now = Date.now();
  const recent = agentHistory.filter((record) => {
    const ts = Date.parse(record.timestamp || '');
    return Number.isFinite(ts) && now - ts < 10 * 60 * 1000;
  });

  if (recent.length >= 3) {
    flags.push('RAPID_SEQUENCE');
  }

  const last = agentHistory[agentHistory.length - 1];
  if (last) {
    const lastTs = Date.parse(last.timestamp || '');
    const lastDecision = last.result?.decision;
    if (Number.isFinite(lastTs) && now - lastTs < 60 * 1000 && ['BLOCK', 'CONSTRAIN'].includes(lastDecision)) {
      flags.push('CASCADE_AFTER_CONTROL');
    }
  }

  const currentAmount = numericAmount(currentTx?.amount);
  const pastAmounts = agentHistory
    .map((record) => numericAmount(record.transaction?.amount))
    .filter((value) => value != null && Number.isFinite(value));

  if (currentAmount != null && Number.isFinite(currentAmount) && pastAmounts.length >= 3) {
    const sorted = [...pastAmounts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0 && currentAmount > median * 5) {
      flags.push('AMOUNT_ANOMALY');
    }
  }

  const dest = destinationOf(currentTx);
  if (dest) {
    const seen = new Set(agentHistory.map((record) => destinationOf(record.transaction)).filter(Boolean));
    if (agentHistory.length > 0 && !seen.has(dest)) {
      flags.push('NEW_COUNTERPARTY');
    }
  }

  return flags;
}

function monitorPostExecution(history, agentId, decision) {
  if (decision !== 'ALLOW') {
    return { status: 'not_executed', alerts: [] };
  }

  const alerts = [];
  const agentHistory = (history || []).filter((record) => record.agentId === agentId);
  const recentAllows = agentHistory.filter((record) => record.result?.decision === 'ALLOW').slice(-5);
  const destinations = recentAllows
    .map((record) => destinationOf(record.transaction))
    .filter(Boolean);
  const uniqueDestinations = new Set(destinations);

  if (uniqueDestinations.size >= 3) {
    alerts.push('DIVERGING_COUNTERPARTIES');
  }

  if (recentAllows.length >= 4) {
    alerts.push('ELEVATED_POST_EXECUTION_VOLUME');
  }

  return {
    status: alerts.length ? 'watch' : 'stable',
    alerts
  };
}

module.exports = { detectBehavioralAnomalies, monitorPostExecution };
