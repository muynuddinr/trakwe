'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Vehicle, Driver, Task, Expense, Alert, Trip, Geofence,
  CommandLog, DeviceIntegration
} from '@/types';
import { uaeVehicles, generateInitialUaeVehicles, UAE_DRIVERS } from '@/data/uae-vehicles';
import {
  generateInitialUaeDrivers,
  generateInitialUaeTasks,
  generateInitialUaeExpenses,
  generateInitialUaeAlerts,
  generateInitialUaeTrips,
  uaeGeofences,
  uaeIntegrations
} from '@/data/uae-records';

const FLEET_STORAGE_KEY = 'trackwe_demo_fleet_uae_state_v1';

interface FleetContextType {
  vehicles: Vehicle[];
  drivers: Driver[];
  tasks: Task[];
  expenses: Expense[];
  alerts: Alert[];
  trips: Trip[];
  geofences: Geofence[];
  commands: CommandLog[];
  integrations: DeviceIntegration[];
  selectedVehicleId: string | null;
  selectedVehicle: Vehicle | null;
  setSelectedVehicleId: (id: string | null) => void;
  addVehicle: (vehicle: Partial<Vehicle>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  addDriver: (driver: Partial<Driver>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  addTask: (task: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: 'To do' | 'In progress' | 'Completed') => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addExpense: (expense: Partial<Expense>) => void;
  approveExpense: (id: string, reviewerName: string) => void;
  rejectExpense: (id: string, reviewerName: string) => void;
  acknowledgeAlert: (id: string) => void;
  addGeofence: (geo: Omit<Geofence, 'id'>) => void;
  toggleGeofence: (id: string) => void;
  updateGeofence: (id: string, updates: Partial<Geofence>) => void;
  simulateImmobilizerCommand: (vehicleReg: string, action: string, reason: string, initiator: string) => void;
  resetDemoData: () => void;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(uaeVehicles);
  const [drivers, setDrivers] = useState<Driver[]>(generateInitialUaeDrivers);
  const [tasks, setTasks] = useState<Task[]>(generateInitialUaeTasks);
  const [expenses, setExpenses] = useState<Expense[]>(generateInitialUaeExpenses);
  const [alerts, setAlerts] = useState<Alert[]>(generateInitialUaeAlerts);
  const [trips, setTrips] = useState<Trip[]>(generateInitialUaeTrips);
  const [geofences, setGeofences] = useState<Geofence[]>(uaeGeofences);
  const [commands, setCommands] = useState<CommandLog[]>([]);
  const [integrations, setIntegrations] = useState<DeviceIntegration[]>(uaeIntegrations);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('v-dxb-01');
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FLEET_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.vehicles) {
          setVehicles(parsed.vehicles.map((v: Vehicle, i: number) => {
            const preset = uaeVehicles[i % uaeVehicles.length];
            return {
              ...v,
              image: v.image || preset.image,
              gallery: (v.gallery && v.gallery.length) ? v.gallery : preset.gallery,
              specs: v.specs || preset.specs
            };
          }));
        }
        if (parsed.drivers) {
          setDrivers(parsed.drivers.map((d: Driver, i: number) => {
            const preset = UAE_DRIVERS[i % UAE_DRIVERS.length];
            return {
              ...d,
              avatar: preset ? preset.avatar : d.avatar,
              experience: d.experience || preset?.experience || '7 years',
              bloodGroup: d.bloodGroup || preset?.bloodGroup || 'O+'
            };
          }));
        }
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.alerts) setAlerts(parsed.alerts);
        if (parsed.trips) setTrips(parsed.trips);
        if (parsed.geofences) setGeofences(parsed.geofences);
        if (parsed.commands) setCommands(parsed.commands);
        if (parsed.integrations) setIntegrations(parsed.integrations);
      }
    } catch (e) {
      console.warn('Could not read fleet state from localStorage', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const payload = {
        vehicles,
        drivers,
        tasks,
        expenses,
        alerts,
        trips,
        geofences,
        commands,
        integrations
      };
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not save fleet state to localStorage', e);
    }
  }, [isHydrated, vehicles, drivers, tasks, expenses, alerts, trips, geofences, commands, integrations]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const addVehicle = (partial: Partial<Vehicle>) => {
    const newVehicle: Vehicle = {
      id: `v-uae-${Date.now()}`,
      registration: partial.registration || `Dubai ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(10000 + Math.random() * 90000)}`,
      name: partial.name || 'Commercial Transport Unit',
      type: partial.type || 'Light truck',
      driver: partial.driver || 'Unassigned',
      status: 'Idle',
      speed: 0,
      lat: 25.2048 + (Math.random() - 0.5) * 0.08,
      lng: 55.2708 + (Math.random() - 0.5) * 0.08,
      fuel: partial.fuel ?? 85,
      temperature: partial.type === 'Refrigerated' ? 4.0 : null,
      battery: 12.6,
      distance: 0,
      device: partial.device || 'Teltonika FMC130 (UAE Edition)',
      updated: 'Just registered (Demo)',
      can: true,
      immobilizer: true,
      camera: false,
      emirate: partial.emirate || 'Dubai',
      locationName: partial.locationName || 'Dubai Operations Base',
      image: partial.image || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
      gallery: partial.gallery || [
        'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586191582150-f823f6686118?auto=format&fit=crop&w=1200&q=80'
      ],
      specs: partial.specs || {
        engine: '12.8L OM471 Turbo Diesel',
        transmission: '12-Speed PowerShift 3',
        payload: '18,500 kg',
        tankCapacity: '650 Liters',
        dimensions: '8.4m × 2.5m × 3.6m',
        vin: `WDB9634031L${Math.floor(100000 + Math.random() * 900000)}`,
        year: 2024,
        odometer: 14200,
        oilLife: 92,
        brakeLife: 95,
        tireHealth: '98% (Good)',
        nextService: '25,000 km / Nov 2026'
      }
    };
    setVehicles((prev) => [newVehicle, ...prev]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === id);
      if (exists) {
        return prev.map((v) => (v.id === id ? { ...v, ...updates } : v));
      }
      const newV: Vehicle = {
        id,
        registration: updates.registration || id,
        name: updates.name || `Vehicle ${id}`,
        type: updates.type || 'Commercial Carrier',
        driver: updates.driver || 'Assigned Driver',
        status: updates.status || 'Offline',
        speed: updates.speed ?? 0,
        lat: updates.lat ?? 25.2048,
        lng: updates.lng ?? 55.2708,
        fuel: updates.fuel ?? 80,
        temperature: updates.temperature ?? null,
        battery: updates.battery ?? 12.6,
        distance: updates.distance ?? 0,
        device: updates.device || 'Teltonika FMC920 4G LTE Cat 1 (Live Hardware)',
        updated: updates.updated || 'Just reported (Live)',
        can: true,
        immobilizer: true,
        camera: false,
        emirate: updates.emirate || 'Dubai',
        locationName: updates.locationName || 'Live GPS Fix',
        ...updates
      };
      return [newV, ...prev];
    });
  };

  const addDriver = (partial: Partial<Driver>) => {
    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: partial.name || 'New UAE Driver',
      contact: partial.contact || '+971 50 000 0000',
      vehicle: partial.vehicle || 'Unassigned',
      score: 100,
      status: 'On duty',
      events: 0,
      licenseNo: partial.licenseNo || `DXB-HC-${Math.floor(1000 + Math.random() * 9000)}`,
      emirate: partial.emirate || 'Dubai',
      avatar: partial.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      experience: '4 Years UAE Heavy Fleet',
      bloodGroup: 'O+'
    };
    setDrivers((prev) => [newDriver, ...prev]);
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const addTask = (partial: Partial<Task>) => {
    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: partial.title || 'Fleet Operational Check',
      description: partial.description || 'Routine checklist inspection',
      employee: partial.employee || 'Zayed Al Mansoori',
      vehicle: partial.vehicle || vehicles[0]?.registration || 'Dubai A-10842',
      priority: partial.priority || 'Medium',
      due: partial.due || '2026-10-25',
      status: 'To do',
      createdBy: partial.createdBy || 'Authorized User'
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const updateTaskStatus = (id: string, status: 'To do' | 'In progress' | 'Completed') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const addExpense = (partial: Partial<Expense>) => {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: partial.title || 'Fuel / Operational Expense',
      category: partial.category || 'Fuel',
      vehicle: partial.vehicle || vehicles[0]?.registration || 'Dubai A-10842',
      amount: Number(partial.amount) || 150,
      date: partial.date || '2026-10-23',
      submitted: partial.submitted || 'Zayed Al Mansoori',
      receipt: partial.receipt || 'Tax Invoice Attached (Demo)',
      status: 'Pending'
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const approveExpense = (id: string, reviewerName: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Approved', reviewedBy: reviewerName } : e))
    );
  };

  const rejectExpense = (id: string, reviewerName: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Rejected', reviewedBy: reviewerName } : e))
    );
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Acknowledged' } : a))
    );
  };

  const addGeofence = (geo: Omit<Geofence, 'id'>) => {
    const newGeo: Geofence = {
      ...geo,
      id: `geo-${Date.now()}`
    };
    setGeofences((prev) => [...prev, newGeo]);
  };

  const toggleGeofence = (id: string) => {
    setGeofences((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  };

  const updateGeofence = (id: string, updates: Partial<Geofence>) => {
    setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const simulateImmobilizerCommand = (
    vehicleReg: string,
    action: string,
    reason: string,
    initiator: string
  ) => {
    const newCommand: CommandLog = {
      id: `cmd-${Date.now()}`,
      vehicle: vehicleReg,
      action: action || 'Immobilize Engine · Simulation',
      reason: reason || 'Scheduled safety test',
      time: '23 Oct 11:35 GST',
      status: 'Simulated Only (Demo Mode)',
      initiatedBy: initiator
    };
    setCommands((prev) => [newCommand, ...prev]);
  };

  const resetDemoData = () => {
    try {
      localStorage.removeItem(FLEET_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not clear fleet localStorage', e);
    }
    setVehicles(generateInitialUaeVehicles());
    setDrivers(generateInitialUaeDrivers());
    setTasks(generateInitialUaeTasks());
    setExpenses(generateInitialUaeExpenses());
    setAlerts(generateInitialUaeAlerts());
    setTrips(generateInitialUaeTrips());
    setGeofences(uaeGeofences);
    setCommands([]);
    setIntegrations(uaeIntegrations);
    setSelectedVehicleId('v-dxb-01');
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        drivers,
        tasks,
        expenses,
        alerts,
        trips,
        geofences,
        commands,
        integrations,
        selectedVehicleId,
        selectedVehicle,
        setSelectedVehicleId,
        addVehicle,
        updateVehicle,
        addDriver,
        updateDriver,
        addTask,
        updateTaskStatus,
        updateTask,
        addExpense,
        approveExpense,
        rejectExpense,
        acknowledgeAlert,
        addGeofence,
        toggleGeofence,
        updateGeofence,
        simulateImmobilizerCommand,
        resetDemoData
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
