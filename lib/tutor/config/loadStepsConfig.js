import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export function loadStepsConfig() {
  const filePath = path.join(process.cwd(), "policies", "steps.yaml");
  const raw = fs.readFileSync(filePath, "utf8");
  const data = yaml.load(raw);

  if (!data || !Array.isArray(data.steps)) {
    throw new Error("Invalid steps.yaml: missing steps array");
  }

  return data;
}
