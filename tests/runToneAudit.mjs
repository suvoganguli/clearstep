
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

import fs from "fs";
import path from "path";
import { processStudentTurn } from "../lib/tutor-core/processStudentTurn.js";

// Adjust this import if your initializer lives elsewhere.
import { createProblemState } from "../lib/tutor-core/session/problemState.js";

const scenariosPath = path.join(process.cwd(), "tests", "toneScenarios.json");
const outputDir = path.join(process.cwd(), "logs");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDir, `tone-audit-${timestamp}.json`);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function summarizeTurn(result) {
  return {
    route: result?.routeResult?.route ?? null,
    stepType: result?.routeResult?.match?.stepType ?? null,
    valueRaw: result?.routeResult?.match?.valueRaw ?? null,
    mathKind: result?.mathResult?.kind ?? null,
    expected: result?.mathResult?.expected ?? null,
    tutorText: result?.reply?.tutorText ?? null,
    status: result?.reply?.status ?? null,
    problemStatus: result?.problemState?.status ?? null,
    awaitingConfirmation: !!result?.problemState?.awaitingConfirmation,
    currentEquation: result?.problemState?.currentEquation ?? null
  };
}

async function runScenario(scenario) {
  let problemState = createProblemState(scenario.problem);

  const transcript = [];

  for (const studentText of scenario.turns) {
    const result = await processStudentTurn({
      problemState,
      studentText
    });

    const turnSummary = summarizeTurn(result);

    transcript.push({
      studentText,
      ...turnSummary
    });

    problemState = safeClone(result.problemState);
  }

  return {
    name: scenario.name,
    problem: scenario.problem,
    turns: transcript
  };
}

async function main() {

  console.log("OPENAI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);

  ensureDir(outputDir);

  const scenarios = JSON.parse(fs.readFileSync(scenariosPath, "utf8"));
  const results = [];

  for (const scenario of scenarios) {
    try {
      const result = await runScenario(scenario);
      results.push(result);
      console.log(`PASS  ${scenario.name}`);
    } catch (err) {
      results.push({
        name: scenario.name,
        problem: scenario.problem,
        error: String(err?.stack || err)
      });
      console.log(`FAIL  ${scenario.name}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    results
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`\nWrote tone audit log to:\n${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});