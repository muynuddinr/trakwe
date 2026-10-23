'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { DEMO_CREDENTIALS } from '@/data/mock-credentials';
import { UserRole } from '@/types';
import {
  Navigation,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Check,
  AlertCircle,
  Building2,
  ArrowRight
} from 'lucide-react';

export function LoginPage() {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleCard, setSelectedRoleCard] = useState<UserRole | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected login error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (roleName: UserRole) => {
    const cred = DEMO_CREDENTIALS[roleName];
    setEmail(cred.email);
    setPassword(cred.password);
    setSelectedRoleCard(roleName);
    setError(null);
  };

  const handleInstantLogin = async (roleName: UserRole) => {
    handleSelectRole(roleName);
    setLoading(true);
    try {
      await quickLogin(roleName);
    } finally {
      setLoading(false);
    }
  };

  const roles: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Employee'];

  return (
    <div className="login-screen">
      <div className="login-container">
        {/* Left Column: Login Form */}
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">
              <span className="brand-mark">
                <Navigation size={28} fill="currentColor" />
              </span>
              <span className="brand-text">
                trackwe<span className="brand-dot">.</span>
              </span>
            </div>
            <div className="login-workspace-pill">
              <Building2 size={13} />
              <span>UAE Operations Hub · Demo</span>
            </div>
            <h1>Welcome back</h1>
            <p>Sign in to access your fleet intelligence and operational dashboard.</p>
          </div>

          {error && (
            <div className="login-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@trackwe.demo"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="login-password">Password</label>
                <span className="demo-pass-hint">Demo: Trackwe@123</span>
              </div>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="button primary full login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-dots" /> Signing in…
                </>
              ) : (
                <>
                  Sign in to Trackwe <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer-notes">
            <div className="security-notice">
              <ShieldCheck size={14} />
              <span>Safe local demo authentication. No production credentials required.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Demo Role Selector */}
        <div className="demo-roles-sidebar">
          <div className="demo-roles-header">
            <span className="demo-pill">TEST ALL 4 ROLES</span>
            <h2>Select a Demo Account</h2>
            <p>
              Click any role card below to pre-fill credentials, or click <strong>Direct Sign-in</strong> for instant testing.
            </p>
          </div>

          <div className="role-cards-grid">
            {roles.map((roleName) => {
              const cred = DEMO_CREDENTIALS[roleName];
              const isSelected = selectedRoleCard === roleName || email === cred.email;

              return (
                <div
                  key={roleName}
                  className={`demo-role-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectRole(roleName)}
                >
                  <div className="demo-role-top">
                    <div className="role-badge-row">
                      <span className={`badge role-${roleName.toLowerCase().replace(/\s+/g, '-')}`}>
                        {roleName}
                      </span>
                      {isSelected && (
                        <span className="selected-check">
                          <Check size={13} />
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 6 }}>
                      {cred.user.avatarUrl ? (
                        <img
                          src={cred.user.avatarUrl}
                          alt={cred.user.name}
                          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #c6ab6d', flexShrink: 0 }}
                        />
                      ) : (
                        <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>
                          {cred.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span className="demo-role-name" style={{ display: 'block', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cred.user.name}
                        </span>
                        <span className="demo-role-email" style={{ display: 'block', fontSize: 11, color: '#8898aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cred.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="demo-role-desc">{cred.description}</p>

                  <div className="demo-role-actions">
                    <button
                      type="button"
                      className="button primary small quick-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstantLogin(roleName);
                      }}
                      disabled={loading}
                    >
                      Instant Sign-in as {roleName}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="demo-credentials-table-box">
            <h4>Quick Reference Credentials</h4>
            <table className="demo-table-compact">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Demo Email</th>
                  <th>Demo Password</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r}>
                    <td><strong>{r}</strong></td>
                    <td><code>{DEMO_CREDENTIALS[r].email}</code></td>
                    <td><code>Trackwe@123</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
