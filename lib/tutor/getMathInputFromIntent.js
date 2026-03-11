export function getMathInputFromIntent(intent, studentMessage) {
  if (!intent || typeof intent !== "object") return "";

  if (intent.kind === "direct_step" || intent.kind === "tentative_step") {
    return intent.extractedStep || studentMessage || "";
  }

  return "";
}
