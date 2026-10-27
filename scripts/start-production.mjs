import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || "3000";

console.log(`[Trackwe Production] Launching Next.js on port ${port}...`);

// Spawn Next.js production server
const nextChild = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", port],
  { stdio: "inherit", env: { ...process.env, PORT: port } }
);

// Spawn Teltonika FMC920 TCP Ingestion Service
const tcpChild = spawn(
  process.execPath,
  [path.join(__dirname, "fmc920-service.mjs")],
  { stdio: "inherit", env: process.env }
);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    nextChild.kill(signal);
    tcpChild.kill(signal);
  });
}

nextChild.on("exit", (code) => {
  tcpChild.kill("SIGTERM");
  process.exit(code ?? 0);
});

tcpChild.on("exit", (code) => {
  console.warn(`[TCP Service Exited with code ${code}]`);
});
