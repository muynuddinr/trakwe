import { vehicles } from "@/data/vehicles";
import { FleetService } from "@/types";
export const demoFleetService: FleetService = {
  async listVehicles() {
    return [...vehicles];
  },
  async saveVehicle(vehicle) {
    return vehicle;
  },
};
// Replace this adapter with a real API in Phase 2. UI state remains independent.
