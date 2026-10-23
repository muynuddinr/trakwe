'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { FleetProvider, useFleet } from '@/context/fleet-context';
import { HardwareTrackingProvider } from '@/context/hardware-tracking-context';
import { ThemeProvider } from '@/context/theme-context';
import { NavItemKey } from '@/data/mock-credentials';
import { LoginPage } from '@/components/auth/login-page';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { Toast } from '@/components/common/toast';
import { DeviceHealthModal } from '@/components/hardware/device-health-modal';

// Modular Views
import { DashboardView } from '@/components/views/dashboard/dashboard-view';
import { LiveTrackingView } from '@/components/views/tracking/live-tracking-view';
import { VehiclesView } from '@/components/views/vehicles/vehicles-view';
import { VehicleDetailView } from '@/components/views/vehicles/vehicle-detail-view';
import { DriversView } from '@/components/views/drivers/drivers-view';
import { TripsView } from '@/components/views/trips/trips-view';
import { GeofencesView } from '@/components/views/geofences/geofences-view';
import { FuelView } from '@/components/views/intelligence/fuel-view';
import { TemperatureView } from '@/components/views/intelligence/temperature-view';
import { DiagnosticsView } from '@/components/views/intelligence/diagnostics-view';
import { BehaviorView } from '@/components/views/intelligence/behavior-view';
import { CamerasView } from '@/components/views/intelligence/cameras-view';
import { ImmobilizerView } from '@/components/views/intelligence/immobilizer-view';
import { TasksView } from '@/components/views/operations/tasks-view';
import { ExpensesView } from '@/components/views/operations/expenses-view';
import { AlertsView } from '@/components/views/operations/alerts-view';
import { ReportsView } from '@/components/views/operations/reports-view';
import { UsersView } from '@/components/views/admin/users-view';
import { IntegrationsView } from '@/components/views/admin/integrations-view';
import { SettingsView } from '@/components/views/admin/settings-view';

import { RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';

const PAGE_TITLES: Record<NavItemKey, string> = {
  dashboard: 'Dashboard',
  tracking: 'Live Tracking',
  vehicles: 'Vehicles',
  'vehicle-detail': 'Vehicle Profile & Telemetry',
  drivers: 'Drivers',
  trips: 'Trips & Route History',
  geofences: 'Geofences',
  fuel: 'Fuel Monitoring',
  temperature: 'Temperature Monitoring',
  diagnostics: 'CAN Bus & Diagnostics',
  behavior: 'Driver Behavior',
  cameras: 'Dash Cameras',
  immobilizer: 'Remote Immobilizer',
  tasks: 'Tasks & Dispatch',
  expenses: 'Expenses & Approvals',
  alerts: 'Alerts & Notifications',
  reports: 'Reports & Analytics',
  users: 'Users & Roles',
  integrations: 'Device Integrations',
  settings: 'Workspace Settings'
};

function FleetDashboardLayout() {
  const { user, role, hasPermission, isLoading } = useAuth();
  const { setSelectedVehicleId, vehicles } = useFleet();

  const [page, setPage] = useState<NavItemKey>('dashboard');
  const [detailVehicleId, setDetailVehicleId] = useState<string>('v-dxb-01');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshTime, setRefreshTime] = useState('11:45 GST');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync route with URL hash on mount / hash change
  useEffect(() => {
    const readHash = () => {
      const raw = window.location.hash.replace('#', '');
      if (!raw) return;
      const [key, param] = raw.split(':');
      if (key && (PAGE_TITLES as any)[key]) {
        setPage(key as NavItemKey);
        if (key === 'vehicle-detail' && param) {
          setDetailVehicleId(param);
        }
      }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  const navigateTo = (key: NavItemKey, param?: string) => {
    setPage(key);
    if (param) {
      if (key === 'vehicle-detail') setDetailVehicleId(param);
      window.location.hash = `${key}:${param}`;
    } else {
      window.location.hash = key;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-AE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Dubai'
    });
    setRefreshTime(`${timeStr} GST`);
    setToastMessage('UAE fleet telemetry refreshed');
  };

  // If user is not authenticated, show the Login page
  if (!user) {
    return <LoginPage />;
  }

  // Permission Guard: verify user can view current page
  const isAllowed = hasPermission(page);

  const title = PAGE_TITLES[page] || 'Dashboard';

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={page}
        onNavigate={navigateTo}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="main">
        {/* Topbar */}
        <Topbar
          title={title}
          onNavigate={(targetPage) => navigateTo(targetPage)}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            setDetailVehicleId(id);
          }}
        />

        <main>
          {/* Page Heading */}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                UAE FLEET OPERATIONS <span>{role?.toUpperCase()} DEMO</span>
              </div>
              <h1>{title}</h1>
              <p>
                {page === 'dashboard'
                  ? 'Real-time UAE fleet overview and operational intelligence.'
                  : page === 'tracking'
                  ? 'Live interactive OpenStreetMap tracking across UAE corridors.'
                  : page === 'vehicle-detail'
                  ? 'Detailed telemetry profile, multi-angle photos, vehicle specs & driver assignment.'
                  : `${title} for UAE fleet operations. Data is local demo records.`}
              </p>
            </div>

            <div className="page-actions">
              <button
                type="button"
                className="button refresh"
                title="Refresh UAE telematics snapshot"
                onClick={handleRefresh}
              >
                <RefreshCw size={14} />
                <span>Refresh ({refreshTime})</span>
              </button>
            </div>
          </div>

          {/* Access Restricted View if role has no permission */}
          {!isAllowed ? (
            <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
              <ShieldAlert
                size={44}
                style={{ color: '#d97706', margin: '0 auto 16px' }}
              />
              <h2 style={{ fontSize: 18, marginBottom: 8 }}>Access Restricted</h2>
              <p style={{ color: '#688296', fontSize: 13, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your current role (<strong>{role}</strong>) does not have authorization to access <strong>{title}</strong>.
                This route is restricted according to organizational permissions.
              </p>
              <button
                type="button"
                className="button primary"
                onClick={() => navigateTo('dashboard')}
              >
                <ArrowLeft size={14} /> Return to Dashboard
              </button>
            </div>
          ) : (
            /* Active Page View */
            <div className="view-container">
              {page === 'dashboard' && (
                <DashboardView
                  onNavigate={navigateTo}
                  onSelectVehicle={(id) => setSelectedVehicleId(id)}
                  onOpenTaskModal={() => navigateTo('tasks')}
                  onOpenExpenseModal={() => navigateTo('expenses')}
                />
              )}

              {page === 'tracking' && (
                <LiveTrackingView
                  onNavigate={navigateTo}
                  onOpenTaskModal={() => navigateTo('tasks')}
                />
              )}

              {page === 'vehicles' && (
                <VehiclesView
                  onNavigate={navigateTo}
                  onSelectVehicle={(id) => {
                    setSelectedVehicleId(id);
                    navigateTo('tracking');
                  }}
                  onOpenDetail={(id) => {
                    setDetailVehicleId(id);
                    setSelectedVehicleId(id);
                    navigateTo('vehicle-detail', id);
                  }}
                  showToast={(msg) => setToastMessage(msg)}
                />
              )}

              {page === 'vehicle-detail' && (
                <VehicleDetailView
                  vehicleId={detailVehicleId}
                  onNavigate={navigateTo}
                  onTrackOnMap={(id: string) => {
                    setSelectedVehicleId(id);
                    navigateTo('tracking');
                  }}
                  onSelectVehicle={(id: string) => {
                    setDetailVehicleId(id);
                    setSelectedVehicleId(id);
                  }}
                  showToast={(msg: string) => setToastMessage(msg)}
                />
              )}

              {page === 'drivers' && (
                <DriversView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'trips' && <TripsView />}

              {page === 'geofences' && (
                <GeofencesView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'fuel' && <FuelView />}

              {page === 'temperature' && <TemperatureView />}

              {page === 'diagnostics' && <DiagnosticsView />}

              {page === 'behavior' && <BehaviorView />}

              {page === 'cameras' && <CamerasView />}

              {page === 'immobilizer' && (
                <ImmobilizerView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'tasks' && (
                <TasksView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'expenses' && (
                <ExpensesView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'alerts' && (
                <AlertsView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'reports' && <ReportsView />}

              {page === 'users' && (
                <UsersView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'integrations' && (
                <IntegrationsView showToast={(msg) => setToastMessage(msg)} />
              )}

              {page === 'settings' && (
                <SettingsView showToast={(msg) => setToastMessage(msg)} />
              )}
            </div>
          )}

          {/* Footer */}
          <footer>
            <span>
              <i className="pulse" />
              Live Telemetry Snapshot · Updated {refreshTime}
            </span>
            <span>Trackwe UAE · Fleet Intelligence, In Focus.</span>
          </footer>
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function FleetApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FleetProvider>
          <HardwareTrackingProvider>
            <FleetDashboardLayout />
            <DeviceHealthModal />
          </HardwareTrackingProvider>
        </FleetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
