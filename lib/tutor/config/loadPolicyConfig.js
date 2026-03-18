import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export function loadPolicyConfig() {
  const policyFilePath = path.join(process.cwd(), "policies", "policy.yaml");
  const policyRaw = fs.readFileSync(policyFilePath, "utf8");
  const policyData = yaml.load(policyRaw);

  if (!policyData || !policyData.llm_thresholds || !policyData.behavior) {
    throw new Error("Invalid policy.yaml: missing required sections");
  }

  const helpIntentFilePath = path.join(
    process.cwd(),
    "policies",
    "helpIntentPhrases.yaml"
  );
  const helpIntentRaw = fs.readFileSync(helpIntentFilePath, "utf8");
  const helpIntentData = yaml.load(helpIntentRaw);

  if (
    !helpIntentData ||
    !Array.isArray(helpIntentData.help_intent_phrases)
  ) {
    throw new Error(
      "Invalid helpIntentPhrases.yaml: missing help_intent_phrases array"
    );
  }

  return {
    ...policyData,
    helpIntentPolicy: helpIntentData,
  };
}