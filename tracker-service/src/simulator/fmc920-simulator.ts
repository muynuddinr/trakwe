import net from 'net';
import { Codec8Decoder } from '../codec/codec8';
import { Codec8ExtDecoder } from '../codec/codec8ext';

// Waypoints along Sheikh Zayed Road (E11) in Dubai
const UAE_CORRIDOR_WAYPOINTS = [
  { lat: 24.9857, lng: 55.0844, speed: 45, desc: 'JAFZA South Hub' },
  { lat: 25.0152, lng: 55.1124, speed: 68, desc: 'Ibn Battuta Corridor' },
  { lat: 25.0684, lng: 55.1482, speed: 82, desc: 'Dubai Marina E11' },
  { lat: 25.1054, lng: 55.1843, speed: 79, desc: 'Al Barsha Interchange' },
  { lat: 25.1412, lng: 55.2195, speed: 75, desc: 'Umm Suqeim Bridge' },
  { lat: 25.1782, lng: 55.2512, speed: 65, desc: 'Business Bay Crossing' },
  { lat: 25.1984, lng: 55.2698, speed: 52, desc: 'Dubai Mall Approach' },
  { lat: 25.2048, lng: 55.2736, speed: 38, desc: 'Downtown Dubai Terminal' }
];

interface SimulatorOptions {
  host?: string;
  port?: number;
  imei?: string;
  useExtendedCodec?: boolean;
  intervalMs?: number;
  continuous?: boolean;
}

export class Fmc920Simulator {
  private host: string;
  private port: number;
  private imei: string;
  private useExtendedCodec: boolean;
  private intervalMs: number;
  private continuous: boolean;
  private client: net.Socket | null = null;
  private waypointIndex = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: SimulatorOptions = {}) {
    this.host = options.host || process.env.TELTONIKA_TCP_HOST || '127.0.0.1';
    this.port = options.port || parseInt(process.env.TELTONIKA_TCP_PORT || '5027', 10);
    this.imei = options.imei || '356289104928172';
    this.useExtendedCodec = options.useExtendedCodec ?? false;
    this.intervalMs = options.intervalMs || 3000;
    this.continuous = options.continuous ?? true;
  }

  public run(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('='.repeat(65));
      console.log('   TELTONIKA FMC920 GPS HARDWARE SIMULATOR   ');
      console.log('='.repeat(65));
      console.log(`Connecting to:       ${this.host}:${this.port}`);
      console.log(`Simulated IMEI:      ${this.imei}`);
      console.log(`Protocol Codec:      ${this.useExtendedCodec ? 'Codec 8 Extended (0x8E)' : 'Codec 8 (0x08)'}`);
      console.log(`Transmission Rate:   Every ${this.intervalMs / 1000}s`);
      console.log('='.repeat(65));

      this.client = new net.Socket();

      let handshakeDone = false;

      this.client.connect(this.port, this.host, () => {
        console.log(`[SIM] TCP socket connected to ${this.host}:${this.port}`);
        console.log(`[SIM] Phase 1: Sending IMEI Handshake: ${this.imei}`);

        // Build IMEI Handshake packet: [2-byte length] + [ASCII IMEI]
        const imeiBuffer = Buffer.from(this.imei, 'ascii');
        const handshakePacket = Buffer.alloc(2 + imeiBuffer.length);
        handshakePacket.writeUInt16BE(imeiBuffer.length, 0);
        imeiBuffer.copy(handshakePacket, 2);

        this.client!.write(handshakePacket);
      });

      this.client.on('data', (data: Buffer) => {
        if (!handshakeDone) {
          // Expect 1-byte handshake response: 0x01 = Accept, 0x00 = Reject
          const responseByte = data.readUInt8(0);
          if (responseByte === 0x01) {
            handshakeDone = true;
            console.log('[SIM] Handshake ACCEPTED by server (0x01). Authenticated successfully!');
            console.log('[SIM] Phase 2: Beginning AVL telemetry transmission...\n');

            // Send first AVL record immediately
            this.sendNextRecord();

            if (this.continuous) {
              this.timer = setInterval(() => this.sendNextRecord(), this.intervalMs);
            } else {
              resolve();
            }
          } else {
            console.error(`[SIM] Handshake REJECTED by server (0x${responseByte.toString(16)}). Closing socket.`);
            this.client?.destroy();
            reject(new Error(`Server rejected IMEI ${this.imei}`));
          }
          return;
        }

        // Phase 2: Expect 4-byte Big-Endian ACK response (number of processed records)
        if (data.length >= 4) {
          const ackCount = data.readUInt32BE(0);
          console.log(`[SIM] << ACK Received: 0x${data.subarray(0, 4).toString('hex')} (${ackCount} records acknowledged)`);
        }
      });

      this.client.on('error', (err) => {
        console.error('[SIM Error]', err.message);
        if (this.timer) clearInterval(this.timer);
        reject(err);
      });

      this.client.on('close', () => {
        console.log('[SIM] TCP socket closed');
        if (this.timer) clearInterval(this.timer);
      });
    });
  }

  private sendNextRecord(): void {
    if (!this.client || this.client.destroyed) return;

    const wp = UAE_CORRIDOR_WAYPOINTS[this.waypointIndex];
    this.waypointIndex = (this.waypointIndex + 1) % UAE_CORRIDOR_WAYPOINTS.length;

    // Small jitter to simulate live driving dynamics
    const jitterLat = (Math.random() - 0.5) * 0.0005;
    const jitterLng = (Math.random() - 0.5) * 0.0005;
    const jitterSpeed = Math.max(0, Math.round(wp.speed + (Math.random() - 0.5) * 6));

    const recordPayload = {
      timestampMs: Date.now(),
      priority: 1,
      latitude: wp.lat + jitterLat,
      longitude: wp.lng + jitterLng,
      altitude: 14 + Math.round(Math.random() * 5),
      angle: 45 + Math.round(Math.random() * 10),
      satellites: 14,
      speed: jitterSpeed,
      ioElements: {
        239: 1, // Ignition ON (ACC)
        240: jitterSpeed > 0 ? 1 : 0, // Movement
        66: 12550 + Math.round((Math.random() - 0.5) * 300), // External Voltage mV (12.55V)
        67: 3820 + Math.round((Math.random() - 0.5) * 50),   // Internal Battery mV (3.82V)
        21: 4 // GSM signal (4/5)
      }
    };

    let packet: Buffer;
    if (this.useExtendedCodec) {
      packet = Codec8ExtDecoder.buildPacket([recordPayload]);
    } else {
      packet = Codec8Decoder.buildPacket([recordPayload]);
    }

    console.log(
      `[SIM] >> Sent AVL Record: [${wp.desc}] Lat=${(wp.lat + jitterLat).toFixed(5)}, Lng=${(wp.lng + jitterLng).toFixed(5)}, Speed=${jitterSpeed} km/h (Packet: ${packet.length} bytes)`
    );

    this.client.write(packet);
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.client) this.client.destroy();
  }
}

// Allow direct CLI execution
if (require.main === module || process.argv[1]?.includes('fmc920-simulator')) {
  const isExtended = process.argv.includes('--extended');
  const isOnce = process.argv.includes('--once');
  const sim = new Fmc920Simulator({
    useExtendedCodec: isExtended,
    continuous: !isOnce
  });
  sim.run().catch((err) => {
    console.error('[SIM Error]', err.message);
    process.exit(1);
  });
}
