import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Spawn Next.js dev server
const nextChild = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0", "--port", process.env.PORT || "3000"],
  { stdio: "inherit" }
);

// Spawn Teltonika FMC920 TCP Ingestion Service
const tcpChild = spawn(
  process.execPath,
  [path.join(__dirname, "fmc920-service.mjs")],
  { stdio: "inherit" }
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
