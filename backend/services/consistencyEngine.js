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

  // A stated intent that doesn't map to any recognised financial action
  // (gibberish, an unrelated read-only request, or anything else keyword
  // extraction and the AI service both failed to classify) must NOT default
  // to "consistent". Falling through to matched:true here previously meant
  // random or unparseable text next to a real swap/approve/transfer/stake
  // transaction was auto-approved at LOW risk -- exactly the "correctly
  // authenticated but never actually verified" gap this system exists to
  // close. An unverifiable intent is treated as a mismatch instead, so it
  // raises risk and requires at least the CONSTRAIN tier.
  if (statedAction === 'UNKNOWN') {
    return {
      matched: false,
      reason: 'Could not determine a recognised financial intent from the stated instruction, so the proposed transaction cannot be verified against it.'
    };
  }

  // Symmetric case: the transaction itself doesn't decode to a known
  // action (malformed or unsupported transaction shape). Same reasoning --
  // an action we can't classify can't be confirmed to match the intent.
  if (actualAction === 'UNKNOWN') {
    return {
      matched: false,
      reason: 'The proposed transaction does not decode to a recognised action, so it cannot be verified against the stated intent.'
    };
  }

  return {
    matched: true,
    reason: 'Transaction outcome aligns with stated intent.'
  };
}

module.exports = { verifyIntentConsistency };
