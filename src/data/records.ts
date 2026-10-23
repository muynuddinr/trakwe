export {
  demoDate,
  uaeSeries as series,
  uaeGeofences as geofences,
  uaeRoutePoints as routePoints,
  generateInitialUaeDrivers,
  generateInitialUaeTasks,
  generateInitialUaeExpenses,
  generateInitialUaeAlerts,
  generateInitialUaeTrips,
  uaeIntegrations as integrations
} from './uae-records';

import {
  generateInitialUaeDrivers,
  generateInitialUaeTasks,
  generateInitialUaeExpenses,
  generateInitialUaeAlerts,
  generateInitialUaeTrips,
  uaeIntegrations
} from './uae-records';

export const seed = {
  drivers: generateInitialUaeDrivers(),
  tasks: generateInitialUaeTasks(),
  expenses: generateInitialUaeExpenses(),
  alerts: generateInitialUaeAlerts(),
  trips: generateInitialUaeTrips(),
  fuel: [],
  temperature: [],
  diagnostics: [],
  behavior: [],
  users: [],
  integrations: uaeIntegrations,
  commands: []
};
