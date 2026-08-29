function calculateRisk(policyViolations, consistencyResult, extras = {}) {
  let riskScore = 0;
  const reasons = [];

  if (!consistencyResult?.matched) {
    riskScore += 50;
    reasons.push('Intent and proposed action are inconsistent.');
  }

  const violations = policyViolations || [];
  riskScore += violations.length * 25;
  if (violations.length) {
    reasons.push(`${violations.length} policy control(s) failed.`);
  }

  if (extras.injection) {
    riskScore += 50;
    reasons.push('Adversarial prompt or instruction manipulation detected.');
  }

  if (extras.mlFraud) {
    riskScore += 30;
    reasons.push('Fraud model flagged the transfer pattern.');
  }

  const behaviorFlags = extras.behaviorFlags || [];
  riskScore += behaviorFlags.length * 15;
  if (behaviorFlags.length) {
    reasons.push('Behavioral deviation from this agent’s baseline.');
  }

  if (riskScore > 100) riskScore = 100;

  let riskLevel = 'LOW';
  let decision = 'ALLOW';
  let autonomy = 'autonomous';
  let delaySeconds = 0;

  if (riskScore >= 75) {
    riskLevel = 'HIGH';
    decision = 'BLOCK';
    autonomy = 'blocked_escalated';
  } else if (riskScore >= 30) {
    riskLevel = 'MEDIUM';
    decision = 'CONSTRAIN';
    autonomy = 'delayed_verification';
    delaySeconds = 15;
  }

  return {
    riskScore,
    riskLevel,
    decision,
    autonomy,
    delaySeconds,
    summary: reasons.join(' ') || 'Action is consistent with identity, authority, and policy.'
  };
}

module.exports = { calculateRisk };
