import { Vehicle } from "@/types";
import { routes } from "./geography";
export const driverNames = [
  "Omar Hassan",
  "Ahmed Ali",
  "Sara Khalid",
  "Yusuf Ibrahim",
  "Layla Saeed",
  "Khalid Mansour",
  "Noor Abdullah",
  "Faisal Ahmed",
];
const regions = Object.keys(routes);
export const vehicles: Vehicle[] = Array.from({ length: 57 }, (_, i) => {
  const region = regions[i % 7],
    p = routes[region][Math.floor(i / 7) % 8];
  return {
    id: `v${i + 1}`,
    orgId: i < 30 ? "org-dubai" : "org-emirates",
    registration: `${region === "Dubai" ? "Dubai A" : region === "Abu Dhabi" ? "Abu Dhabi 5" : region + " B"} ${24010 + i * 17}`,
    name: `${region} ${["Express", "Carrier", "Cold Chain", "Delivery"][i % 4]} ${i + 1}`,
    region,
    type: ["Light truck", "Heavy truck", "Refrigerated", "Van"][i % 4],
    driver: driverNames[i % 8],
    status: i < 38 ? "Moving" : i < 50 ? "Idle" : "Offline",
    speed: i < 38 ? 36 + (i % 45) : 0,
    lat: p[0],
    lng: p[1],
    fuel: 32 + (i % 60),
    temperature: i % 4 === 2 ? (i === 6 ? 9.2 : 3.8 + (i % 3) * 0.4) : null,
    battery: 12.4 + (i % 3) * 0.2,
    distance: 48 + i * 3,
    device: i % 3 === 0 ? "Teltonika FMC130" : "Queclink GV300",
    updated: i < 50 ? "2026-10-22T10:42:00+04:00" : "2026-10-21T18:20:00+04:00",
    can: i % 3 === 0,
    immobilizer: i % 3 === 0,
    camera: i % 5 === 0,
  };
});
