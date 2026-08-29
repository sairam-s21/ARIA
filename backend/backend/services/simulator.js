const DEFAULT_PORTFOLIO = { usdcBalance: 5000, ethBalance: 10 };

function simulateTransaction(decodedTx, currentPortfolio = DEFAULT_PORTFOLIO) {
  // Clone current state
  let simulatedState = { ...currentPortfolio };
  let simulationNotes = [];

  const numericAmount = Number(decodedTx.amount);
  const hasNumericAmount = Number.isFinite(numericAmount);

  if (decodedTx.action === "TOKEN_APPROVAL") {
    simulatedState.allowance = {
      spender: decodedTx.spender,
      token: decodedTx.token,
      amount: decodedTx.amount
    };
    simulationNotes.push(`Granted ${decodedTx.amount} allowance for ${decodedTx.token} to ${decodedTx.spender}`);
  } else if (decodedTx.action === "SWAP" && hasNumericAmount) {
    simulatedState.usdcBalance = simulatedState.usdcBalance - numericAmount;
    simulatedState.ethBalance = simulatedState.ethBalance + (numericAmount / 3000); // Mock exchange rate
    simulationNotes.push(`Swapped ${decodedTx.amount} ${decodedTx.from} for ${decodedTx.to}`);
  } else if (decodedTx.action === "TRANSFER") {
    if (hasNumericAmount) {
      simulatedState.usdcBalance = simulatedState.usdcBalance - numericAmount;
    }
    simulationNotes.push(`Transferred ${decodedTx.amount} ${decodedTx.token || 'USDC'} to ${decodedTx.to}`);
  } else if (decodedTx.action === "STAKE") {
    if (hasNumericAmount) {
      simulatedState.ethBalance = simulatedState.ethBalance - numericAmount;
    }
    simulatedState.staked = {
      protocol: decodedTx.protocol,
      token: decodedTx.token,
      amount: decodedTx.amount
    };
    simulationNotes.push(`Staked ${decodedTx.amount} ${decodedTx.token || 'ETH'} into ${decodedTx.protocol}`);
  }

  return {
    stateBefore: currentPortfolio,
    stateAfter: simulatedState,
    notes: simulationNotes
  };
}

module.exports = { simulateTransaction };
