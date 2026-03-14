import { normalizeEquationText } from "@/lib/algebra/common/textNormalize";
import {
  canonicalizeLinearEquation,
  tryParseLinear,
  solveLinearFor,
  checkNextStepFor,
} from "@/lib/algebra/linear";

export function buildDeterministicContext(problem, studentMessage) {
  try {
    const normalized = normalizeEquationText(problem || "");
    const canonical = canonicalizeLinearEquation(normalized);
    const { version, parsed } = tryParseLinear(canonical);
    const solved = solveLinearFor(version, parsed);
    const stepVerdict = checkNextStepFor(version, studentMessage || "", solved);

    return {
      supported: true,
      version,
      parsed,
      solved,
      stepVerdict,
      canonical,
      normalized,
    };
  } catch (e) {
    return {
      supported: false,
      error: e?.message || "Unsupported problem format for Phase 1A.",
    };
  }
}
