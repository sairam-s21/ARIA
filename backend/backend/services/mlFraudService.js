// Invokes the AI service's /fraud-score endpoint, which runs the trained
// XGBoost PaySim fraud classifier — a real, previously-unused model. It
// only applies to TRANSFER actions: the model was trained on PaySim's
// fiat wire-transfer fraud patterns (draining an account, sending to a
// fresh empty destination), which has no equivalent for swap/approve/stake.
//
// The balance context PaySim expects is derived from our own simulated
// portfolio state. We don't track a real destination balance, so we assume
// 0 (a genuinely unknown recipient has no prior relationship with this
// agent) — which is itself one of the model's own fraud signals
// (is_zero_dest_before), so this is a faithful translation, not a hack.
async function scoreFraudRisk(decodedTx, simulation) {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (!aiServiceUrl || decodedTx.action !== 'TRANSFER') {
    return null;
  }

  const amount = Number(decodedTx.amount);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const oldBalanceOrg = Number(simulation?.stateBefore?.usdcBalance) || 0;
  const newBalanceOrig = Number(simulation?.stateAfter?.usdcBalance) || 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${aiServiceUrl}/fraud-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        oldBalanceOrg,
        newBalanceOrig,
        oldBalanceDest: 0,
        newBalanceDest: amount
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`AI service returned ${response.status}`);

    const data = await response.json();
    if (!data.modelAvailable) return null;

    return { isFraud: !!data.isFraud, fraudProbability: Number(data.fraudProbability) || 0 };
  } catch (err) {
    console.error('ML fraud scoring unavailable, skipping:', err.message);
    return null;
  }
}

module.exports = { scoreFraudRisk };
