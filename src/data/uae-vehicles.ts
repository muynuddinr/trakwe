import { Vehicle, VehicleStatus, VehicleSpecs } from '@/types';

interface UaeFleetPreset {
  name: string;
  type: string;
  lat: number;
  lng: number;
  emirate: string;
  locationName: string;
  image: string;
  gallery: string[];
  specs: VehicleSpecs;
}

export const UAE_DRIVERS = [
  {
    name: 'Zayed Al Mansoori',
    email: 'zayed.m@trackwe.ae',
    phone: '+971 50 241 8921',
    license: 'DXB-HC-9821',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '8 years',
    bloodGroup: 'O+'
  },
  {
    name: 'Rashid Al Nuaimi',
    email: 'rashid.n@trackwe.ae',
    phone: '+971 52 381 0492',
    license: 'AUH-HC-4819',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '11 years',
    bloodGroup: 'A+'
  },
  {
    name: 'Tariq Al Falasi',
    email: 'tariq.f@trackwe.ae',
    phone: '+971 55 918 2741',
    license: 'DXB-LC-1029',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '6 years',
    bloodGroup: 'B+'
  },
  {
    name: 'Omar Al Suwaidi',
    email: 'omar.s@trackwe.ae',
    phone: '+971 50 829 1042',
    license: 'SHJ-HC-8491',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '9 years',
    bloodGroup: 'AB+'
  },
  {
    name: 'Ahmed Al Qasimi',
    email: 'ahmed.q@trackwe.ae',
    phone: '+971 54 102 9381',
    license: 'RAK-HC-3920',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '12 years',
    bloodGroup: 'O+'
  },
  {
    name: 'Hamad Al Marzouqi',
    email: 'hamad.m@trackwe.ae',
    phone: '+971 50 638 1920',
    license: 'AUH-LC-5821',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '5 years',
    bloodGroup: 'A-'
  },
  {
    name: 'Sultan Al Kaabi',
    email: 'sultan.k@trackwe.ae',
    phone: '+971 56 492 1083',
    license: 'AJM-HC-1940',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '7 years',
    bloodGroup: 'B-'
  },
  {
    name: 'Saeed Al Ketbi',
    email: 'saeed.k@trackwe.ae',
    phone: '+971 52 710 4928',
    license: 'DXB-HC-5029',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '10 years',
    bloodGroup: 'O+'
  },
  {
    name: 'Fahad Al Dhaheri',
    email: 'fahad.d@trackwe.ae',
    phone: '+971 50 948 2019',
    license: 'ALN-HC-8391',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '8 years',
    bloodGroup: 'A+'
  },
  {
    name: 'Mansoor Al Shamsi',
    email: 'mansoor.s@trackwe.ae',
    phone: '+971 55 301 9482',
    license: 'FUJ-HC-2091',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '14 years',
    bloodGroup: 'O-'
  },
  {
    name: 'Khalid Al Zaabi',
    email: 'khalid.z@trackwe.ae',
    phone: '+971 54 820 1938',
    license: 'DXB-LC-7491',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '4 years',
    bloodGroup: 'B+'
  },
  {
    name: 'Abdulla Al Ameri',
    email: 'abdulla.a@trackwe.ae',
    phone: '+971 50 519 2830',
    license: 'AUH-HC-6192',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=256&h=256&q=80',
    experience: '13 years',
    bloodGroup: 'A+'
  }
];

const UAE_PRESETS: UaeFleetPreset[] = [
  // Dubai Hubs & Corridors
  {
    name: 'Volvo FH16 Cold Carrier',
    type: 'Refrigerated',
    lat: 25.2014,
    lng: 55.2736,
    emirate: 'Dubai',
    locationName: 'Sheikh Zayed Rd / Downtown',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1586191582152-332eb7a13bfd?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'D16K 650hp Turbo Diesel (Euro 6)',
      transmission: 'I-Shift 12-Speed Automated',
      payload: '24,500 kg',
      tankCapacity: '650 L',
      dimensions: '16.5m × 2.6m × 4.0m',
      vin: 'YV2RT40A9MA104829',
      year: 2025,
      odometer: 48210,
      oilLife: 82,
      brakeLife: 91,
      tireHealth: '94% (Good)',
      nextService: '2026-12-15'
    }
  },
  {
    name: 'Mercedes Actros 3340',
    type: 'Heavy truck',
    lat: 24.9857,
    lng: 55.0844,
    emirate: 'Dubai',
    locationName: 'Jebel Ali Free Zone (JAFZA)',
    image: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'OM 471 12.8L Inline-6 400hp',
      transmission: 'PowerShift 3 16-Speed',
      payload: '32,000 kg',
      tankCapacity: '800 L',
      dimensions: '18.2m × 2.55m × 3.9m',
      vin: 'WDB9634031L492019',
      year: 2024,
      odometer: 64180,
      oilLife: 74,
      brakeLife: 85,
      tireHealth: '88% (Good)',
      nextService: '2026-11-28'
    }
  },
  {
    name: 'Isuzu NPR 400 Van',
    type: 'Van',
    lat: 25.1322,
    lng: 55.2341,
    emirate: 'Dubai',
    locationName: 'Al Quoz Industrial 3',
    image: 'https://images.unsplash.com/photo-1586191582152-332eb7a13bfd?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1586191582152-332eb7a13bfd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: '4HK1-TCN 5.2L Diesel Turbo',
      transmission: '6-Speed Manual Overdrive',
      payload: '4,500 kg',
      tankCapacity: '140 L',
      dimensions: '6.8m × 2.2m × 2.9m',
      vin: 'JALNPR75H47102948',
      year: 2024,
      odometer: 32490,
      oilLife: 89,
      brakeLife: 94,
      tireHealth: '96% (Excellent)',
      nextService: '2027-01-10'
    }
  },
  {
    name: 'Scania R500 Long Haul',
    type: 'Heavy truck',
    lat: 24.8965,
    lng: 55.1582,
    emirate: 'Dubai',
    locationName: 'Dubai Logistics City (DLC)',
    image: 'https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'DC13 500hp 13L XPI Super',
      transmission: 'Opticruise 12+2 Speed',
      payload: '28,000 kg',
      tankCapacity: '950 L Dual Tank',
      dimensions: '16.8m × 2.6m × 4.0m',
      vin: 'YS2R4X20005910294',
      year: 2025,
      odometer: 28940,
      oilLife: 92,
      brakeLife: 97,
      tireHealth: '98% (Excellent)',
      nextService: '2027-02-20'
    }
  },
  {
    name: 'Toyota Hilux Support 4x4',
    type: 'Light truck',
    lat: 25.1856,
    lng: 55.2744,
    emirate: 'Dubai',
    locationName: 'Business Bay Crossing',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: '2.8L D-4D Turbo Diesel 201hp',
      transmission: '6-Speed Super ECT 4WD',
      payload: '1,100 kg',
      tankCapacity: '80 L',
      dimensions: '5.3m × 1.85m × 1.82m',
      vin: 'MROBA3CD400192841',
      year: 2024,
      odometer: 21400,
      oilLife: 86,
      brakeLife: 89,
      tireHealth: '91% (Good)',
      nextService: '2026-12-05'
    }
  },
  {
    name: 'Mitsubishi Fuso Canter',
    type: 'Light truck',
    lat: 25.2435,
    lng: 55.3347,
    emirate: 'Dubai',
    locationName: 'Garhoud Bridge / Deira',
    image: 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: '4P10-T4 3.0L Common Rail 150hp',
      transmission: 'DUONIC 6-Speed Dual Clutch',
      payload: '3,800 kg',
      tankCapacity: '100 L',
      dimensions: '5.9m × 2.1m × 2.4m',
      vin: 'FEB71ER400291048',
      year: 2023,
      odometer: 54100,
      oilLife: 70,
      brakeLife: 78,
      tireHealth: '82% (Good)',
      nextService: '2026-11-14'
    }
  },
  {
    name: 'ThermoKing Chill Van',
    type: 'Refrigerated',
    lat: 24.9912,
    lng: 55.1843,
    emirate: 'Dubai',
    locationName: 'Dubai Investment Park (DIP)',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'OM 651 2.1L CDI 163hp + V-300 Reefer Unit',
      transmission: '7G-Tronic Plus Automatic',
      payload: '1,800 kg Insulated Bay',
      tankCapacity: '75 L',
      dimensions: '5.9m × 2.0m × 2.6m',
      vin: 'WDB9066351S849102',
      year: 2024,
      odometer: 39800,
      oilLife: 79,
      brakeLife: 88,
      tireHealth: '90% (Good)',
      nextService: '2026-12-20'
    }
  },
  {
    name: 'MAN TGX 26.480 Hauler',
    type: 'Heavy truck',
    lat: 25.1764,
    lng: 55.4312,
    emirate: 'Dubai',
    locationName: 'Al Awir Logistics Corridor',
    image: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'D2676 12.4L 480hp Euro 6d',
      transmission: 'MAN TipMatic 12+2',
      payload: '26,000 kg',
      tankCapacity: '700 L',
      dimensions: '16.5m × 2.55m × 3.85m',
      vin: 'WMA06XZZ6KP482019',
      year: 2024,
      odometer: 44200,
      oilLife: 84,
      brakeLife: 90,
      tireHealth: '92% (Good)',
      nextService: '2026-12-30'
    }
  },
  {
    name: 'Mercedes Sprinter Cargo',
    type: 'Van',
    lat: 25.1221,
    lng: 55.3789,
    emirate: 'Dubai',
    locationName: 'Dubai Silicon Oasis / E66',
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'OM 654 2.0L 4-Cylinder 170hp',
      transmission: '9G-Tronic Automatic',
      payload: '2,200 kg High Roof',
      tankCapacity: '93 L',
      dimensions: '6.9m × 2.0m × 2.7m',
      vin: 'W1V9076531P720193',
      year: 2025,
      odometer: 16500,
      oilLife: 95,
      brakeLife: 98,
      tireHealth: '99% (New)',
      nextService: '2027-03-15'
    }
  },
  {
    name: 'Volvo FMX 440 Tipper',
    type: 'Heavy truck',
    lat: 24.3412,
    lng: 54.5123,
    emirate: 'Abu Dhabi',
    locationName: 'Musaffah Industrial Sector 9',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'
    ],
    specs: {
      engine: 'D13A 12.8L 440hp Heavy Duty',
      transmission: 'I-Shift with Crawler Gears',
      payload: '34,000 kg 6x4',
      tankCapacity: '410 L Steel',
      dimensions: '8.8m × 2.5m × 3.5m',
      vin: 'YV2JS00B2HA491028',
      year: 2023,
      odometer: 78500,
      oilLife: 68,
      brakeLife: 74,
      tireHealth: '80% (Moderate)',
      nextService: '2026-11-05'
    }
  }
];

export const UAE_PLATES = [
  'Dubai A-10842',
  'Dubai C-49102',
  'Dubai E-28491',
  'Dubai J-72019',
  'Dubai K-39401',
  'Dubai L-84910',
  'Dubai N-19284',
  'Dubai R-50291',
  'Dubai S-61920',
  'Dubai X-93821',
  'Abu Dhabi 4-19283',
  'Abu Dhabi 5-29104',
  'Abu Dhabi 6-84910',
  'Abu Dhabi 7-50291',
  'Abu Dhabi 8-39102',
  'Abu Dhabi 11-82019',
  'Sharjah 1-48291',
  'Sharjah 2-93810',
  'Sharjah 3-10293',
  'Sharjah 4-75819',
  'Ajman B-19402',
  'Ajman C-12948',
  'Ras Al Khaimah A-38192',
  'Ras Al Khaimah C-91823',
  'Fujairah D-59102',
  'Fujairah M-29104',
  'Al Ain 5-49201',
  'Al Ain 8-10294'
];

export function generateInitialUaeVehicles(): Vehicle[] {
  return UAE_PRESETS.map((preset, index) => {
    const isEmployeeVehicle = index === 0;
    const driver = isEmployeeVehicle ? UAE_DRIVERS[0] : UAE_DRIVERS[index % UAE_DRIVERS.length];
    const plate = UAE_PLATES[index % UAE_PLATES.length];

    let status: VehicleStatus = 'Moving';
    let speed = 0;
    let updated = 'Just now (live)';

    if (index % 10 === 7) {
      status = 'Offline';
      speed = 0;
      updated = '21 Oct, 18:40 GST';
    } else if (index % 4 === 3) {
      status = 'Idle';
      speed = 0;
      updated = '23 Oct, 11:15 GST (Ignition On)';
    } else {
      status = 'Moving';
      speed = 48 + ((index * 7) % 45); // 48 - 92 km/h
      updated = '23 Oct, 11:32 GST';
    }

    const isReefer = preset.type === 'Refrigerated';
    const tempValue = isReefer
      ? (index === 0 ? 4.2 : index === 6 ? 9.8 : 3.6 + ((index % 5) * 0.4))
      : null;

    return {
      id: isEmployeeVehicle ? 'v-dxb-01' : `v-uae-${index + 1}`,
      registration: plate,
      name: preset.name,
      type: preset.type,
      driver: driver.name,
      driverId: `drv-${(index % UAE_DRIVERS.length) + 1}`,
      status,
      speed,
      lat: preset.lat,
      lng: preset.lng,
      fuel: Math.max(18, 92 - (index * 3) % 70),
      temperature: tempValue,
      battery: 12.4 + ((index % 4) * 0.2),
      distance: 85 + (index * 24),
      device: index % 2 === 0 ? 'Teltonika FMC130 (UAE Edition)' : 'Queclink GV300 CAN',
      updated,
      can: index % 2 === 0 || isReefer,
      immobilizer: index % 3 === 0,
      camera: index % 4 === 0,
      emirate: preset.emirate,
      locationName: preset.locationName,
      image: preset.image,
      gallery: preset.gallery,
      specs: preset.specs
    };
  });
}

export const uaeVehicles: Vehicle[] = generateInitialUaeVehicles();
