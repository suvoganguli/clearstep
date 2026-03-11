export function shouldBypassLLM(det, intent, deterministicResponse) {
  if (!deterministicResponse) return false;

  const verdict = det?.stepVerdict?.kind;

  if (verdict === "UNKNOWN") return false;

  if (intent?.kind === "help_request") return false;

  if (intent?.kind === "explanation_request") return false;

  return true;
}
