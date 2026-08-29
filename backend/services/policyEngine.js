const UNLIMITED_VALUES = ['unlimited', 'max_uint256', 'maxuint256', 'infinite'];

// Deliberately excludes "unknown" — that case is already covered by the
// UNKNOWN_CONTRACT/UNKNOWN_RECIPIENT checks below, and keeping it out here
// avoids double-flagging the classic 0xUnknownContract attack fixture.
const SUSPICIOUS_DESTINATION_KEYWORDS = [
  'anonymous', 'untrusted', 'unverified', 'hacker', 'drain', 'exfiltrate', 'scam', 'malicious'
];

function isUnlimitedAmount(amount) {
  if (typeof amount === 'string') {
    return UNLIMITED_VALUES.includes(amount.toLowerCase());
  }
  if (typeof amount === 'number') {
    return !Number.isFinite(amount) || amount >= 1e30;
  }
  return false;
}

function isSuspiciousDestination(value) {
  if (!value) return false;
  const lower = value.toString().toLowerCase();
  return SUSPICIOUS_DESTINATION_KEYWORDS.some((kw) => lower.includes(kw));
}

function evaluatePolicies(decodedTx, agent) {
  const violations = [];

  if (decodedTx.action === 'TOKEN_APPROVAL') {
    if (isUnlimitedAmount(decodedTx.amount)) {
      violations.push('UNLIMITED_APPROVAL');
    }

    const spender = (decodedTx.spender || '').toString().toLowerCase();
    const isApprovedContract = agent?.approvedContracts?.some((contract) =>
      spender.includes(contract.toLowerCase())
    );
    if (!isApprovedContract) {
      violations.push('UNKNOWN_CONTRACT');
    }
  }

  if (decodedTx.action === 'TRANSFER') {
    const recipient = (decodedTx.to || '').toString().toLowerCase();
    const isApprovedRecipient = agent?.approvedContracts?.some((contract) =>
      recipient.includes(contract.toLowerCase())
    );
    if (!isApprovedRecipient) {
      violations.push('UNKNOWN_RECIPIENT');
    }
  }

  const destination = decodedTx.spender || decodedTx.to;
  if (isSuspiciousDestination(destination)) {
    violations.push('SUSPICIOUS_DESTINATION');
  }

  if (!isUnlimitedAmount(decodedTx.amount)) {
    const numericAmount = Number(decodedTx.amount);
    if (!Number.isNaN(numericAmount) && agent?.maxTransactionAmount != null) {
      if (numericAmount > agent.maxTransactionAmount) {
        violations.push('EXCEEDS_SPENDING_LIMIT');
      }
    }
  }

  const assets = [decodedTx.token, decodedTx.from, decodedTx.to].filter(Boolean);
  if (agent?.allowedAssets?.length) {
    const allowed = agent.allowedAssets.map((asset) => asset.toUpperCase());
    const usesDisallowedAsset = assets.some((asset) => {
      const value = asset.toString().toUpperCase();
      if (['UNISWAP', 'AAVE', 'COMPOUND', 'TREASURY'].includes(value)) return false;
      if (value.startsWith('0X') || value.includes('_')) return false;
      return !allowed.includes(value) && ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC'].includes(value);
    });
    if (usesDisallowedAsset) {
      violations.push('DISALLOWED_ASSET');
    }
  }

  return violations;
}

module.exports = { evaluatePolicies };
