import fs from "fs";
import path from "path";

export function loadPolicyText() {
  const policyPath = path.join(process.cwd(), "policies", "clearstep_policy_v1.txt");
  return fs.readFileSync(policyPath, "utf8");
}
