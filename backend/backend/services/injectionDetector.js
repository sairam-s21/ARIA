const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+(instruction|override|prompt)/i,
  /\[\s*system\b[^\]]*\]/i,
  /exfiltrate/i,
  /set\s+spending\s+limit\s+to\s+unlimited/i,
  /admin\s+mode/i,
  /developer\s+mode/i,
  /jailbreak/i,
  /bypass\s+security/i,
  /do\s+anything\s+now/i,
  /disregard\s+(all\s+)?(rules|policies|controls)/i,
  /you\s+are\s+now\s+unrestricted/i,
  /override\s+(policy|guardrail|safety)/i
];

function detectPromptInjection(rawPrompt) {
  const text = rawPrompt || '';
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        detected: true,
        reason: `Adversarial instruction pattern detected: ${pattern}`
      };
    }
  }
  return { detected: false, reason: null };
}

module.exports = { detectPromptInjection };
