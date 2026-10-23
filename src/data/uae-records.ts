import { Geofence, Driver, Task, Expense, Alert, Trip, DeviceIntegration } from '@/types';
import { uaeVehicles, UAE_DRIVERS } from './uae-vehicles';

export const demoDate = '2026-10-23';

export function getVehicleReg(index: number): string {
  if (!uaeVehicles || uaeVehicles.length === 0) return 'Dubai A-10842';
  return uaeVehicles[index % uaeVehicles.length]?.registration || 'Dubai A-10842';
}

// 14-day aggregated trend series for UAE fleet operations
export const uaeSeries = Array.from({ length: 14 }, (_, i) => ({
  day: `${10 + i} Oct`,
  distance: [2840, 3120, 2950, 3420, 3290, 3680, 3410, 3890, 3540, 3810, 4120, 3950, 4360, 4210][i],
  fuel: [480, 520, 495, 560, 540, 610, 570, 640, 590, 630, 680, 650, 710, 695][i],
  temperature: 4.1 + Math.sin(i * 0.7) * 0.8,
  score: 88 + (i % 6),
  expenses: 3200 + (i % 5) * 850, // in AED
  tasks: 5 + (i % 5),
  downtime: 2 + (i % 3)
}));

export function generateInitialUaeDrivers(): Driver[] {
  return UAE_DRIVERS.map((d, i) => ({
    id: `drv-${i + 1}`,
    name: d.name,
    contact: d.phone,
    vehicle: getVehicleReg(i),
    score: 96 - (i * 2),
    status: i === 7 ? 'Off duty' : 'On duty',
    events: (i % 3),
    licenseNo: d.license,
    emirate: uaeVehicles[i % uaeVehicles.length]?.emirate || 'Dubai',
    avatar: d.avatar,
    experience: d.experience,
    bloodGroup: d.bloodGroup
  }));
}

export function generateInitialUaeTasks(): Task[] {
  return [
    {
      id: 'tsk-101',
      title: 'Salik Tag & Toll Inspection',
      description: 'Verify Salik transponder sync on Sheikh Zayed Rd corridor and inspect tire tread.',
      employee: 'Zayed Al Mansoori',
      vehicle: getVehicleReg(0),
      priority: 'High',
      due: '2026-10-23',
      status: 'In progress',
      createdBy: 'Mariam Al Falasi'
    },
    {
      id: 'tsk-102',
      title: 'Cold-Chain HACCP Sensor Calibration',
      description: 'Perform dual-probe temperature test in Dubai Logistics City (DLC) cold bay.',
      employee: 'Tariq Al Falasi',
      vehicle: getVehicleReg(6),
      priority: 'High',
      due: '2026-10-24',
      status: 'To do',
      createdBy: 'Rashid Al Nuaimi'
    },
    {
      id: 'tsk-103',
      title: 'KIZAD Port Manifest Customs Clearance',
      description: 'Deliver certified customs bills of lading to Khalifa Port customs gate 4.',
      employee: 'Omar Al Suwaidi',
      vehicle: getVehicleReg(1),
      priority: 'Medium',
      due: '2026-10-25',
      status: 'To do',
      createdBy: 'Mariam Al Falasi'
    },
    {
      id: 'tsk-104',
      title: 'Scheduled 40,000 km Oil & Filter Service',
      description: 'Major service scheduled at Al Futtaim commercial center in Al Quoz.',
      employee: 'Zayed Al Mansoori',
      vehicle: getVehicleReg(0),
      priority: 'Medium',
      due: '2026-10-26',
      status: 'To do',
      createdBy: 'Mariam Al Falasi'
    },
    {
      id: 'tsk-105',
      title: 'Sharjah Municipality Health Certificate Renewal',
      description: 'Vehicle inspection for food delivery compliance passed with zero notes.',
      employee: 'Ahmed Al Qasimi',
      vehicle: getVehicleReg(4),
      priority: 'Low',
      due: '2026-10-22',
      status: 'Completed',
      createdBy: 'Tariq Al Hashimi'
    }
  ];
}

export function generateInitialUaeExpenses(): Expense[] {
  return [
    {
      id: 'exp-201',
      title: 'Diesel Top-up (Eppco Sheikh Zayed Rd)',
      category: 'Fuel',
      vehicle: getVehicleReg(0),
      amount: 420, // in AED
      date: '2026-10-23',
      submitted: 'Zayed Al Mansoori',
      receipt: 'Attached (Tax Invoice #EP-9821)',
      status: 'Pending'
    },
    {
      id: 'exp-202',
      title: 'Salik Auto-Recharge (Sheikh Zayed Corridor)',
      category: 'Tolls',
      vehicle: getVehicleReg(1),
      amount: 500, // in AED
      date: '2026-10-22',
      submitted: 'Rashid Al Nuaimi',
      receipt: 'RTA Portal E-Receipt',
      status: 'Approved',
      reviewedBy: 'Mariam Al Falasi'
    },
    {
      id: 'exp-203',
      title: 'KIZAD Port Gate Toll & Weighbridge Fee',
      category: 'Tolls',
      vehicle: getVehicleReg(2),
      amount: 280, // in AED
      date: '2026-10-22',
      submitted: 'Omar Al Suwaidi',
      receipt: 'Port Receipt #AD-4910',
      status: 'Approved',
      reviewedBy: 'Mariam Al Falasi'
    },
    {
      id: 'exp-204',
      title: 'Brake Disc Replacement & Fluid Flush',
      category: 'Maintenance',
      vehicle: getVehicleReg(2),
      amount: 1850, // in AED
      date: '2026-10-21',
      submitted: 'Tariq Al Falasi',
      receipt: 'Al Quoz Garage Tax Invoice',
      status: 'Approved',
      reviewedBy: 'Tariq Al Hashimi'
    },
    {
      id: 'exp-205',
      title: 'Darb Abu Dhabi Toll Recharge (Peak Hours)',
      category: 'Tolls',
      vehicle: getVehicleReg(3),
      amount: 350, // in AED
      date: '2026-10-21',
      submitted: 'Hamad Al Marzouqi',
      receipt: 'ITC Darb E-Statement',
      status: 'Approved',
      reviewedBy: 'Rashid Al Nuaimi'
    },
    {
      id: 'exp-206',
      title: 'Commercial Fleet Insurance Rider (Q4)',
      category: 'Insurance',
      vehicle: getVehicleReg(3),
      amount: 4200, // in AED
      date: '2026-10-20',
      submitted: 'Mariam Al Falasi',
      receipt: 'Oman Insurance Policy #POL-8910',
      status: 'Approved',
      reviewedBy: 'Tariq Al Hashimi'
    },
    {
      id: 'exp-207',
      title: 'AdBlue Exhaust Additive Top-up (50L)',
      category: 'Maintenance',
      vehicle: getVehicleReg(0),
      amount: 210, // in AED
      date: '2026-10-23',
      submitted: 'Zayed Al Mansoori',
      receipt: 'ENOC Invoice #EN-1029',
      status: 'Pending'
    }
  ];
}

export function generateInitialUaeAlerts(): Alert[] {
  return [
    {
      id: 'alt-301',
      type: 'Overspeed',
      severity: 'Critical',
      vehicle: getVehicleReg(1),
      time: '23 Oct 11:28 GST',
      location: 'Sheikh Zayed Rd (E11) near JAFZA Gate 4 (104 km/h in 80 zone)',
      status: 'Unacknowledged'
    },
    {
      id: 'alt-302',
      type: 'Temperature',
      severity: 'Critical',
      vehicle: getVehicleReg(6),
      time: '23 Oct 11:14 GST',
      location: 'Dubai Investment Park (DIP) Bay 3 (+9.8 °C; Safe limit: 2–8 °C)',
      status: 'Unacknowledged'
    },
    {
      id: 'alt-303',
      type: 'Geofence breach',
      severity: 'Warning',
      vehicle: getVehicleReg(4),
      time: '23 Oct 10:48 GST',
      location: 'Exited designated Business Bay Delivery Corridor without authorization',
      status: 'Unacknowledged'
    },
    {
      id: 'alt-304',
      type: 'Fuel drop',
      severity: 'Warning',
      vehicle: getVehicleReg(5),
      time: '23 Oct 09:35 GST',
      location: 'Musaffah Industrial Sector 9 (−18 L drop while stationary)',
      status: 'Unacknowledged'
    },
    {
      id: 'alt-305',
      type: 'Harsh braking',
      severity: 'Warning',
      vehicle: getVehicleReg(2),
      time: '23 Oct 08:52 GST',
      location: 'Al Quoz E11 off-ramp (Deceleration −4.2 m/s²)',
      status: 'Acknowledged'
    },
    {
      id: 'alt-306',
      type: 'Device offline',
      severity: 'Warning',
      vehicle: getVehicleReg(7),
      time: '21 Oct 18:40 GST',
      location: 'Al Awir Logistics Depot (No GSM handshake for >36h)',
      status: 'Acknowledged'
    }
  ];
}

export function generateInitialUaeTrips(): Trip[] {
  return [
    {
      id: 'trp-401',
      vehicle: getVehicleReg(0),
      driver: 'Zayed Al Mansoori',
      route: 'Jebel Ali Free Zone (JAFZA) → Downtown Dubai / DIFC',
      date: '2026-10-23',
      distance: 38,
      duration: '42 min',
      average: 54,
      max: 88,
      stop: 6,
      status: 'In progress'
    },
    {
      id: 'trp-402',
      vehicle: getVehicleReg(1),
      driver: 'Rashid Al Nuaimi',
      route: 'Dubai Logistics City (DLC) → Al Quoz Industrial Hub',
      date: '2026-10-23',
      distance: 31,
      duration: '38 min',
      average: 49,
      max: 78,
      stop: 12,
      status: 'In progress'
    },
    {
      id: 'trp-403',
      vehicle: getVehicleReg(2),
      driver: 'Omar Al Suwaidi',
      route: 'Musaffah Industrial Sector 9 → Khalifa Port (KIZAD)',
      date: '2026-10-23',
      distance: 64,
      duration: '58 min',
      average: 66,
      max: 102,
      stop: 4,
      status: 'Completed'
    },
    {
      id: 'trp-404',
      vehicle: getVehicleReg(3),
      driver: 'Ahmed Al Qasimi',
      route: 'Sharjah Industrial 10 → Port Khalid Container Terminal',
      date: '2026-10-23',
      distance: 18,
      duration: '28 min',
      average: 38,
      max: 65,
      stop: 15,
      status: 'Completed'
    },
    {
      id: 'trp-405',
      vehicle: getVehicleReg(4),
      driver: 'Sultan Al Kaabi',
      route: 'Ajman Free Zone Gate 2 → Al Hamra Logistics RAK',
      date: '2026-10-23',
      distance: 46,
      duration: '48 min',
      average: 57,
      max: 95,
      stop: 8,
      status: 'Completed'
    }
  ];
}

export const uaeGeofences: Geofence[] = [
  {
    id: 'geo-1',
    name: 'Dubai Logistics City (DLC) Hub',
    type: 'circle',
    center: [24.8965, 55.1582],
    points: [],
    radius: 2200,
    enabled: true,
    vehicles: ['v-uae-4', 'v-uae-7', 'v-dxb-01']
  },
  {
    id: 'geo-2',
    name: 'Jebel Ali Free Zone Port (JAFZA)',
    type: 'polygon',
    center: [24.9857, 55.0844],
    points: [
      [24.9950, 55.0650],
      [25.0120, 55.0950],
      [24.9750, 55.1150],
      [24.9600, 55.0800]
    ],
    radius: 1800,
    enabled: true,
    vehicles: ['v-uae-2', 'v-dxb-01']
  },
  {
    id: 'geo-3',
    name: 'Abu Dhabi Musaffah Sector 9',
    type: 'circle',
    center: [24.3412, 54.5123],
    points: [],
    radius: 1900,
    enabled: true,
    vehicles: ['v-uae-11', 'v-uae-16']
  },
  {
    id: 'geo-4',
    name: 'Sharjah Industrial 10 Terminal',
    type: 'circle',
    center: [25.3054, 55.4128],
    points: [],
    radius: 1600,
    enabled: true,
    vehicles: ['v-uae-17', 'v-uae-19']
  }
];

// Route along Sheikh Zayed Road (E11) between JAFZA and Downtown Dubai
export const uaeRoutePoints: [number, number][] = [
  [24.9857, 55.0844], // JAFZA Gate 4
  [25.0152, 55.1124], // Ibn Battuta Corridor
  [25.0684, 55.1482], // Dubai Marina E11
  [25.1054, 55.1843], // Al Barsha / Mall of the Emirates
  [25.1412, 55.2195], // Umm Suqeim Inter-change
  [25.1782, 55.2512], // Business Bay Crossing
  [25.1984, 55.2698], // Dubai Mall approach
  [25.2048, 55.2736]  // Downtown Dubai / Burj Plaza
];

export const uaeIntegrations: DeviceIntegration[] = [
  {
    id: 'int-1',
    manufacturer: 'Teltonika Telematics',
    model: 'FMC130 4G LTE Cat 1',
    protocol: 'Codec 8 Extended / TCP TLS',
    capabilities: 'GNSS, CAN Bus J1939, Fuel Probe, Digital Immobilizer',
    connection: 'Connected (Simulated)',
    status: 'Demo Configured'
  },
  {
    id: 'int-2',
    manufacturer: 'Queclink Wireless',
    model: 'GV300 CAN Gateway',
    protocol: '@Track protocol / TCP',
    capabilities: 'High-precision GPS, Temperature sensor, RS232 Fuel',
    connection: 'Connected (Simulated)',
    status: 'Demo Configured'
  },
  {
    id: 'int-3',
    manufacturer: 'Streamax / Trackwe Vision',
    model: 'AI Dual-Facing Dash Cam ADAS',
    protocol: 'JT/T 1078 Video Stream / WebRTC',
    capabilities: 'Live HD forward & cabin stream, Driver fatigue detection',
    connection: 'Standby (Demo Mode)',
    status: 'Integration Preview'
  }
];
