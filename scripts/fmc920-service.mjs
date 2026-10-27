import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Configure TypeScript transpilation on the fly
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Custom loader/transpiler for TypeScript files
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

require.extensions[".ts"] = function (module, filename) {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );
};

const { Fmc920TcpService } = require("../src/server/tcp/fmc920-tcp-service.ts");

const host = process.env.GPS_TCP_HOST || process.env.TELTONIKA_TCP_HOST || "0.0.0.0";
const port = parseInt(process.env.GPS_TCP_PORT || process.env.TELTONIKA_TCP_PORT || "5027", 10);

const service = new Fmc920TcpService({ host, port });

console.log(`Starting Teltonika FMC920 TCP Ingestion Service on ${host}:${port}...`);
await service.start();

const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down Teltonika TCP service...`);
  await service.stop();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
