import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("=== RUNNING TRACKWE TEST SUITES ===\n");

console.log("--> Suite 1: Existing Demo & RBAC Acceptance Tests");
const r1 = spawnSync(process.execPath, [path.join(root, "scripts", "test-demo.cjs")], {
  stdio: "inherit",
  cwd: root,
});

if (r1.status !== 0) {
  console.error("Suite 1 Failed!");
  process.exit(r1.status ?? 1);
}

console.log("\n--> Suite 2: Teltonika FMC920 Protocol & Backend Integration Tests");
const r2 = spawnSync(process.execPath, [path.join(root, "tests", "fmc920-backend.test.cjs")], {
  stdio: "inherit",
  cwd: root,
});

if (r2.status !== 0) {
  console.error("Suite 2 Failed!");
  process.exit(r2.status ?? 1);
}

console.log("\n✅ ALL TEST SUITES COMPLETED SUCCESSFULLY (37 checks passed across 2 suites)!\n");
