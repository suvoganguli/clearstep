import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export function loadPolicyConfig() {
  const filePath = path.join(process.cwd(), "policies", "policy.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(raw);

  if (!data || !data.llm_thresholds || !data.behavior) {
    throw new Error("Invalid policy.yaml: missing required sections");
  }

  return data;
}
