import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

require.extensions[".ts"] = function (module, filename) {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename
  );
};

const {
  buildImeiHandshakeFrame,
  buildCodec8Packet,
  buildCodec8ExtendedPacket,
  buildCodec16Packet,
} = require("../src/server/protocol/teltonika-builder.ts");
const { decodeTeltonikaAck } = require("../src/server/protocol/teltonika-ack.ts");

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const host = getArg("--host", process.env.GPS_TCP_HOST || "127.0.0.1");
const port = parseInt(getArg("--port", process.env.GPS_TCP_PORT || "5027"), 10);

const model = getArg("--model", "FMC130"); // FMC130 or FMC920
const imei = getArg("--imei", model.includes("130") ? "867123049100001" : "864275048912345");
const packetsCount = parseInt(getArg("--count", "3"), 10);
const codec = getArg("--codec", model.includes("130") ? "8e" : "8").toLowerCase();
const ignitionVal = parseInt(getArg("--ignition", "1"), 10);
const extVoltage = parseFloat(getArg("--voltage", "13.6")) * 1000;
const rpmVal = parseInt(getArg("--rpm", "1250"), 10);
const fuelVal = parseInt(getArg("--fuel", "78"), 10);
const odoKm = parseFloat(getArg("--odometer", "1420.5"));

console.log(`=======================================================`);
console.log(` TRACKWE TELTONIKA HARDWARE CLIENT SIMULATOR`);
console.log(`=======================================================`);
console.log(`Target TCP Host: ${host}:${port}`);
console.log(`Target Model:    Teltonika ${model}`);
console.log(`Target IMEI:     ${imei}`);
console.log(`Protocol Codec:  Codec ${codec.toUpperCase()}`);
console.log(`Ignition State:  ${ignitionVal === 1 ? "ON" : "OFF"}`);
console.log(`Packet Count:    ${packetsCount}`);
console.log(`=======================================================\n`);

const socket = net.createConnection({ host, port }, () => {
  console.log("[Simulator] Connected to TCP socket server.");
  console.log(`[Simulator] Sending Phase 1 IMEI handshake: ${imei}...`);
  const handshake = buildImeiHandshakeFrame(imei);
  socket.write(handshake);
});

let phase = "HANDSHAKE";
let sentPackets = 0;

socket.on("data", (chunk) => {
  if (phase === "HANDSHAKE") {
    if (chunk.length >= 1) {
      const responseByte = chunk.readUInt8(0);
      if (responseByte === 0x01) {
        console.log("[Simulator] Handshake SUCCESS: 0x01 (Device Authorized).");
        phase = "SENDING_DATA";
        sendNextPacket();
      } else {
        console.error(`[Simulator] Handshake REJECTED: 0x${responseByte.toString(16)} (Device Unknown or Disabled).`);
        socket.end();
      }
    }
  } else if (phase === "SENDING_DATA") {
    if (chunk.length >= 4) {
      const ackRecords = decodeTeltonikaAck(chunk);
      console.log(`[Simulator] Server ACK received: ${ackRecords} record(s) persisted.`);
      sentPackets++;
      if (sentPackets < packetsCount) {
        setTimeout(sendNextPacket, 600);
      } else {
        console.log(`\n[Simulator] Successfully completed transmission of ${packetsCount} synthetic packets.`);
        socket.end();
      }
    }
  }
});

function sendNextPacket() {
  const lat = 25.2048 + (Math.random() - 0.5) * 0.05;
  const lng = 55.2708 + (Math.random() - 0.5) * 0.05;
  const speed = Math.floor(Math.random() * 60) + 20;

  const recordInput = {
    timestamp: Date.now(),
    latitude: lat,
    longitude: lng,
    altitude: 15,
    angle: 90,
    satellites: 14,
    speed,
    ignition: ignitionVal,
    movement: speed > 5 ? 1 : 0,
    externalVoltageMv: Math.round(extVoltage + (Math.random() - 0.5) * 200),
    internalBatteryVoltageMv: 3950,
    gsmSignal: 5,
    din1: ignitionVal,
    din2: 0,
    din3: 0,
    ain1Mv: 2400,
    ain2Mv: 1100,
    odometerKm: odoKm + sentPackets * 0.2,
    fuelPercent: fuelVal,
    engineRpm: ignitionVal ? rpmVal : 0,
    engineTemp: 88,
  };

  let packet;
  if (codec === "16" || codec === "0x10") {
    packet = buildCodec16Packet([recordInput]);
  } else if (codec === "8e" || codec === "extended" || codec === "0x8e") {
    packet = buildCodec8ExtendedPacket([recordInput]);
  } else {
    packet = buildCodec8Packet([recordInput]);
  }

  console.log(`[Simulator] Sending Packet #${sentPackets + 1} (${packet.length} bytes, Speed: ${speed} km/h, Ignition: ${ignitionVal ? "ON" : "OFF"})...`);
  socket.write(packet);
}

socket.on("error", (err) => {
  console.error("[Simulator] Socket error:", err.message);
});

socket.on("close", () => {
  console.log("[Simulator] TCP connection closed.");
});
