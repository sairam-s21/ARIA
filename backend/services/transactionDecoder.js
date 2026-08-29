function decodeTransaction(transaction) {
  const func = (transaction.function || transaction.type || '').toLowerCase();

  if (func === 'approve') {
    return {
      action: 'TOKEN_APPROVAL',
      token: transaction.token || 'USDC',
      spender: transaction.target || transaction.spender,
      amount: transaction.amount
    };
  } else if (func === 'swap') {
    return {
      action: 'SWAP',
      from: transaction.fromToken || transaction.from || 'USDC',
      to: transaction.toToken || transaction.to || 'ETH',
      amount: transaction.amount,
      slippage: transaction.slippage || 0.01
    };
  } else if (func === 'transfer') {
    return {
      action: 'TRANSFER',
      token: transaction.token || transaction.asset || 'USDC',
      to: transaction.to || transaction.target,
      amount: transaction.amount
    };
  } else if (func === 'stake') {
    return {
      action: 'STAKE',
      token: transaction.token || 'USDC',
      protocol: transaction.protocol || transaction.target,
      amount: transaction.amount
    };
  }

  return {
    action: 'UNKNOWN',
    raw: transaction
  };
}

module.exports = { decodeTransaction };
