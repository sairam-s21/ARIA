const KEYWORD_MAP = [
  { keywords: ['rebalance'], type: 'REBALANCE', expectedAction: 'SWAP', description: 'User intends a portfolio rebalance (asset swap).' },
  { keywords: ['swap'], type: 'SWAP', expectedAction: 'SWAP', description: 'User intends to swap one asset for another.' },
  { keywords: ['stake'], type: 'STAKE', expectedAction: 'STAKE', description: 'User intends to stake assets into a yield protocol.' },
  { keywords: ['approve', 'approval'], type: 'APPROVAL', expectedAction: 'APPROVE', description: 'User intends to grant a token spending approval.' },
  { keywords: ['transfer', 'send'], type: 'TRANSFER', expectedAction: 'TRANSFER', description: 'User intends to transfer funds to another party.' }
];

function firstKeywordIndex(text, keyword) {
  // Word-boundary match, not substring: a plain text.includes(keyword) would
  // match "swap" inside "Uniswap" and misclassify any "approve Uniswap..."
  // intent as a SWAP, causing a false intent/transaction mismatch (and a
  // false BLOCK/CONSTRAIN) on a legitimate approve-to-Uniswap action.
  const found = new RegExp(`\\b${keyword}\\b`, 'i').exec(text);
  return found ? found.index : -1;
}

function extractIntentFromKeywords(userIntent) {
  const text = (userIntent || '').toLowerCase();

  // Rank candidates by where their keyword first appears in the sentence,
  // not by fixed array order. A sentence naming its actual verb up front
  // and mentioning another action word later only as context — e.g.
  // "Approve Uniswap to spend 500 USDC for a scheduled swap" — has a real,
  // non-substring "swap" near the end; picking the earliest verb instead of
  // whichever KEYWORD_MAP entry happens to come first avoids misreading
  // that as a SWAP intent when "approve" is the one actually being acted on.
  let best = null;
  for (const entry of KEYWORD_MAP) {
    for (const keyword of entry.keywords) {
      const index = firstKeywordIndex(text, keyword);
      if (index !== -1 && (best === null || index < best.index)) {
        best = { index, entry };
      }
    }
  }

  if (best) {
    const { type, expectedAction, description } = best.entry;
    return { type, expectedAction, description };
  }

  return {
    type: 'UNKNOWN',
    expectedAction: 'UNKNOWN',
    description: 'Could not determine a structured intent from the provided text.'
  };
}

async function extractIntent(userIntent) {
  // Keyword match runs first: it's the only classifier that actually knows
  // ARIA's DeFi vocabulary (SWAP/STAKE/APPROVE/REBALANCE). The AI service's
  // intent schema was built for fiat banking (TRANSFER/PAYMENT/QUERY/...)
  // and has no concept of those actions, so calling it first would mean a
  // clear "swap my USDC for ETH" gets mis-tagged as something like QUERY —
  // which would silently defeat the intent-vs-transaction consistency
  // check for exactly the actions ARIA cares most about. The AI service is
  // still useful (and used) for text the keyword matcher can't classify at
  // all — general banking-style phrasing, or genuine injection attempts
  // with no DeFi verb in them.
  const keywordResult = extractIntentFromKeywords(userIntent);
  if (keywordResult.type !== 'UNKNOWN') {
    return keywordResult;
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL;

  if (!aiServiceUrl) {
    return keywordResult;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${aiServiceUrl}/extract-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userIntent }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }

    const data = await response.json();
    return {
      type: data.type || 'UNKNOWN',
      expectedAction: data.expectedAction || 'UNKNOWN',
      description: data.description || ''
    };
  } catch (err) {
    console.error('AI intent service unavailable, falling back to keywords:', err.message);
    return keywordResult;
  }
}

module.exports = { extractIntent, extractIntentFromKeywords };
