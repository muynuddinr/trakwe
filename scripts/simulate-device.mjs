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

const { buildImeiHandshakeFrame, buildCodec8Packet, buildCodec8ExtendedPacket } = require("../src/server/protocol/teltonika-builder.ts");
const { decodeTeltonikaAck } = require("../src/server/protocol/teltonika-ack.ts");

const host = process.env.GPS_TCP_HOST || "127.0.0.1";
const port = parseInt(process.env.GPS_TCP_PORT || "5027", 10);

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
}

const imei = getArg("--imei", "864275048912345");
const packetsCount = parseInt(getArg("--count", "3"), 10);
const useExtended = args.includes("--extended");

console.log(`Connecting to Teltonika FMC920 TCP service at ${host}:${port}...`);
console.log(`Using IMEI: ${imei} (${useExtended ? "Codec 8 Extended" : "Codec 8"})`);

const socket = net.createConnection({ host, port }, () => {
  console.log("Connected to TCP socket server.");
  console.log("Sending Phase 1 IMEI handshake...");
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
        console.log("Handshake SUCCESS: Received 0x01 (Device Authorized).");
        phase = "SENDING_DATA";
        sendNextPacket();
      } else {
        console.error(`Handshake REJECTED: Received 0x${responseByte.toString(16)} (Device Unknown or Disabled).`);
        socket.end();
      }
    }
  } else if (phase === "SENDING_DATA") {
    if (chunk.length >= 4) {
      const ackRecords = decodeTeltonikaAck(chunk);
      console.log(`Received 4-byte Server ACK: ${ackRecords} records accepted by backend.`);
      sentPackets++;
      if (sentPackets < packetsCount) {
        setTimeout(sendNextPacket, 500);
      } else {
        console.log(`Successfully completed transmission of ${packetsCount} synthetic packets.`);
        socket.end();
      }
    }
  }
});

function sendNextPacket() {
  const lat = 25.2048 + (Math.random() - 0.5) * 0.05;
  const lng = 55.2708 + (Math.random() - 0.5) * 0.05;
  const speed = Math.floor(Math.random() * 80) + 20;
  const ignition = 1;
  const extVoltage = 12400 + Math.floor(Math.random() * 600); // ~12.4V to 13.0V
  const intVoltage = 3800 + Math.floor(Math.random() * 200);  // ~3.8V to 4.0V
  const gsm = 4;

  const records = [
    {
      timestamp: Date.now(),
      latitude: lat,
      longitude: lng,
      altitude: 12,
      angle: 180,
      satellites: 14,
      speed,
      ignition,
      movement: 1,
      externalVoltageMv: extVoltage,
      internalBatteryVoltageMv: intVoltage,
      gsmSignal: gsm,
    },
  ];

  const packet = useExtended ? buildCodec8ExtendedPacket(records) : buildCodec8Packet(records);
  console.log(`Sending packet #${sentPackets + 1} (${packet.length} bytes, Speed: ${speed} km/h, ExtV: ${(extVoltage/1000).toFixed(2)}V)...`);
  socket.write(packet);
}

socket.on("error", (err) => {
  console.error("Socket error:", err.message);
});

socket.on("close", () => {
  console.log("TCP connection closed.");
});
