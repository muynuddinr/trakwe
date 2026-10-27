import type { Vehicle } from "@/types";
// Stock demo portraits, not photographs of the named people. Stable across pages.
const portraits: Record<string, string> = {
  "Omar Hassan": "men-11",
  "Ahmed Ali": "men-12",
  "Sara Khalid": "women-44",
  "Yusuf Ibrahim": "men-32",
  "Layla Saeed": "women-45",
  "Khalid Mansour": "men-33",
  "Noor Abdullah": "women-49",
  "Faisal Ahmed": "men-46",
  Moin: "men-32",
};
export function personPhoto(name: string) {
  const photo = portraits[name];
  return photo ? `/images/people/${photo}.jpg` : null;
}
export function vehiclePhoto(vehicle: Pick<Vehicle, "type">) {
  return `/images/vehicles/${vehicle.type === "Van" ? "van" : vehicle.type === "Heavy truck" || vehicle.type === "Refrigerated" ? "heavy-truck" : "truck"}.jpg`;
}
