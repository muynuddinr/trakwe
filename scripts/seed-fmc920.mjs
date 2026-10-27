import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

require.extensions[".ts"] = function (module, filename) {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText,
    filename
  );
};

const { DeviceRepository } = require("../src/server/db/repositories/device-repository.ts");
const { getDatabase } = require("../src/server/db/db.ts");

const db = getDatabase();
const repo = new DeviceRepository(db);

const targetImei = "864022089340664";

console.log(`Checking registration for Teltonika FMC920 IMEI: ${targetImei}...`);

const existing = await repo.findByImei(targetImei);

if (existing) {
  console.log(`Device already registered in database:`);
  console.log(`- ID: ${existing.id}`);
  console.log(`- IMEI: ${existing.imei}`);
  console.log(`- Model: ${existing.model}`);
  console.log(`- Status: ${existing.status}`);
  console.log(`- Vehicle: ${existing.vehicle_registration || existing.vehicle_id || "Unassigned"}`);
  console.log(`- Org: ${existing.org_name || existing.org_id}`);
  if (existing.status !== "active") {
    await repo.update(existing.id, { status: "active" });
    console.log(`Updated status to active.`);
  }
} else {
  const created = await repo.create({
    id: "dev-fmc920-01",
    imei: targetImei,
    manufacturer: "Teltonika",
    model: "FMC920",
    protocol: "Teltonika TCP AVL",
    codec: "Codec 8 / Codec 8 Extended",
    orgId: "org-dubai",
    vehicleId: "v1",
    status: "active",
    firmwareVersion: "03.28.02.Rev.00",
    simCarrier: "e& (Etisalat) UAE",
    reportingIntervalSec: 60,
  });
  console.log(`Successfully registered Teltonika FMC920:`);
  console.log(`- ID: ${created.id}`);
  console.log(`- IMEI: ${created.imei}`);
  console.log(`- Status: ${created.status} (Awaiting real physical connection)`);
}

process.exit(0);
