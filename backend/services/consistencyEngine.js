// Maps every vocabulary the rest of the pipeline uses for "what action is
// this" onto one shared set, so a stated intent and an actual transaction
// can be compared regardless of which layer produced which label.
const ACTION_ALIASES = {
  SWAP: 'SWAP',
  REBALANCE: 'SWAP',
  TOKEN_APPROVAL: 'APPROVE',
  APPROVAL: 'APPROVE',
  APPROVE: 'APPROVE',
  TRANSFER: 'TRANSFER',
  STAKE: 'STAKE'
};

function normalizeAction(action) {
  if (!action) return 'UNKNOWN';
  return ACTION_ALIASES[action.toUpperCase()] || 'UNKNOWN';
}

function describeAction(action) {
  if (action === 'APPROVE') return 'a token spending approval';
  return action.toLowerCase();
}

function verifyIntentConsistency(userIntent, extractedIntent, decodedTx) {
  const statedAction = normalizeAction(extractedIntent?.expectedAction);
  const actualAction = normalizeAction(decodedTx.action);

  // Primary check: compare the classified intent against the actual
  // decoded transaction for ANY action pair (not just one special case).
  if (statedAction !== 'UNKNOWN' && actualAction !== 'UNKNOWN' && statedAction !== actualAction) {
    return {
      matched: false,
      reason: `Intent indicates a ${statedAction} action, but the transaction actually performs ${describeAction(actualAction)}.`
    };
  }

  // Fallback: if intent classification failed to produce a usable action
  // (e.g. keyword extraction returned UNKNOWN), still catch the flagship
  // "said rebalance/swap, executed an approval" pattern directly off the
  // raw text so a classification miss doesn't silently pass a mismatch.
  const intentLower = (userIntent || '').toLowerCase();
  // Word-boundary match: a plain .includes('swap') would also match inside
  // "Uniswap", wrongly flagging a legitimate "approve Uniswap..." intent.
  const statedSwapByKeyword = /\b(rebalance|swap)\b/.test(intentLower);

  if (statedAction === 'UNKNOWN' && statedSwapByKeyword && actualAction === 'APPROVE') {
    return {
      matched: false,
      reason: 'Intent requested a portfolio rebalance/swap, but the transaction instead grants token spending approval to another contract.'
    };
  }

  return {
    matched: true,
    reason: 'Transaction outcome aligns with stated intent.'
  };
}

module.exports = { verifyIntentConsistency };
