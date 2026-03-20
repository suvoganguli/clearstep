import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export function loadConversationalIntentConfig() {
  const configFilePath = path.join(
    process.cwd(),
    "policies",
    "conversationalIntents.yaml"
  );
  const configRaw = fs.readFileSync(configFilePath, "utf8");
  const configData = yaml.load(configRaw);

  if (!configData || !configData.intents || !configData.intents.ask_for_answer) {
    throw new Error(
      "Invalid conversationalIntents.yaml: missing intents.ask_for_answer"
    );
  }

  return configData;
}
