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

  const lightPath = path.join(
    process.cwd(),
    "policies",
    "lightHelpPhrases.yaml"
  );
  const fullPath = path.join(
    process.cwd(),
    "policies",
    "fullHelpPhrases.yaml"
  );
  const lightData = yaml.load(fs.readFileSync(lightPath, "utf8"));
  const fullData = yaml.load(fs.readFileSync(fullPath, "utf8"));

  if (!lightData || !Array.isArray(lightData.light_help_phrases)) {
    throw new Error(
      "Invalid lightHelpPhrases.yaml: missing light_help_phrases array"
    );
  }
  if (!fullData || !Array.isArray(fullData.full_help_phrases)) {
    throw new Error(
      "Invalid fullHelpPhrases.yaml: missing full_help_phrases array"
    );
  }

  const helpIntentPolicy = {
    light_help_phrases: lightData.light_help_phrases,
    full_help_phrases: fullData.full_help_phrases,
  };

  return {
    ...policyData,
    helpIntentPolicy,
  };
}