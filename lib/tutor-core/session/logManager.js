import fs from "fs";
import path from "path";

function getLogsDir() {
  return path.join(process.cwd(), "logs");
}

function ensureLogsDir() {
  const logsDir = getLogsDir();
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

export function createProblemLog(problemState) {
  const logsDir = ensureLogsDir();
  const filePath = path.join(logsDir, `${problemState.problemId}.json`);

  fs.writeFileSync(filePath, JSON.stringify(problemState, null, 2), "utf8");

  return filePath;
}

export function updateProblemLog(problemState) {
  const logsDir = ensureLogsDir();
  const filePath = path.join(logsDir, `${problemState.problemId}.json`);

  fs.writeFileSync(filePath, JSON.stringify(problemState, null, 2), "utf8");

  return filePath;
}

export function trimProblemLogs(maxLogs = 3) {
  const logsDir = ensureLogsDir();

  const files = fs
    .readdirSync(logsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const fullPath = path.join(logsDir, name);
      const stat = fs.statSync(fullPath);
      return {
        name,
        fullPath,
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const filesToDelete = files.slice(maxLogs);

  for (const file of filesToDelete) {
    fs.unlinkSync(file.fullPath);
  }

  return {
    kept: files.slice(0, maxLogs).map((f) => f.name),
    deleted: filesToDelete.map((f) => f.name),
  };
}
