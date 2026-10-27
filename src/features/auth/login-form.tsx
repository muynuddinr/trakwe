"use client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoAuth } from "@/lib/auth";
import { DemoAccount } from "@/types";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  MapPin,
  Navigation,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useState } from "react";
export function LoginForm({ onLogin }: { onLogin: (a: DemoAccount) => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      onLogin(demoAuth.login(email, password));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to start demo session. Enable browser storage and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <aside className="login-story">
        <div className="login-brand">
          <Navigation size={30} fill="currentColor" />
          <span>
            trackwe<span>.</span>
          </span>
        </div>
        <div className="login-story-content">
          <span className="login-eyebrow">FLEET INTELLIGENCE · UAE</span>
          <h1>
            Your fleet.
            <br />
            One clear view.
          </h1>
          <p>
            Keep vehicles, people, and operations moving together across the
            Emirates.
          </p>
          <div className="login-route">
            <div>
              <MapPin size={18} />
              <span>Dubai</span>
              <i />
            </div>
            <div>
              <Truck size={18} />
              <span>Sharjah</span>
              <i />
            </div>
            <div>
              <MapPin size={18} />
              <span>Abu Dhabi</span>
            </div>
          </div>
          <div className="login-story-stats">
            <span>
              <b>57</b>Demo vehicles
            </span>
            <span>
              <b>7</b>UAE cities
            </span>
            <span>
              <b>4</b>Role experiences
            </span>
          </div>
        </div>
        <small>DEMO WORKSPACE · NO LIVE HARDWARE CONNECTED</small>
      </aside>
      <main className="login-main">
        <div className="login-form-wrap">
          <span className="login-welcome">WELCOME TO TRACKWE</span>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">
            Explore fleet operations with a demo account.
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                placeholder="you@trackwe.demo"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter demo password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="demo-accounts">
            <div>
              <h3>Try a demo role</h3>
              <span>
                Password: <code>{DEMO_PASSWORD}</code>
              </span>
            </div>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.id}
                disabled={busy}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                  setError("");
                }}
                className={email === a.email ? "selected" : ""}
              >
                <ShieldCheck size={17} />
                <span>
                  <b>{a.role}</b>
                  <small>{a.email}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <p className="login-disclaimer">
            Frontend demo only. Sessions and editable sample records are stored
            in this browser. This is not production authentication.
          </p>
        </div>
      </main>
    </div>
  );
}
