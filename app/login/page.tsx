'use client';

import React, { useState } from 'react';
import {
  Brain,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  RefreshCw,
  Terminal,
} from 'lucide-react';

export default function LoginPage() {
  const [authMethod, setAuthMethod] = useState<'credentials' | 'apikey'>('credentials');
  
  // Credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // API key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Interaction & Validation states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // Live validation for API Key pattern (e.g., ns_live_...)
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setErrorMessage(null);
    if (!val) {
      setApiKeyValid(null);
      return;
    }
    const isValidPattern = /^ns_(live|test)_[a-zA-Z0-9]{16,32}$/.test(val.trim());
    setApiKeyValid(isValidPattern);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (authMethod === 'credentials') {
      if (!email.includes('@')) {
        setErrorMessage('Please provide a valid institutional medical email address.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must contain at least 8 characters.');
        return;
      }
    } else {
      if (!apiKeyValid) {
        setErrorMessage('Invalid NeuroSense Enclave API key format. Expected prefix: ns_live_ or ns_test_.');
        return;
      }
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Route to dashboard
      window.location.href = '/dashboard';
    }, 1200);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-canvas text-foreground font-body select-none">
      {/* Top Header */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-canvas/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
            <Brain size={18} aria-hidden="true" />
          </div>
          <span className="font-heading font-extrabold text-sm tracking-tight text-foreground">
            NeuroSense<span className="text-primary font-mono text-xs ml-0.5">.ai</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-mono text-muted">
          <ShieldCheck size={13} className="text-status-stable" aria-hidden="true" />
          <span>FIPS 140-2 Validated Enclave</span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main id="main-content" className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-6">
          {/* Title & Introduction */}
          <div className="space-y-1.5 text-center">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
              Biometric Clinical Enclave
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Authenticate via Institutional EHR SSO credentials or your designated NeuroSense API Enclave key.
            </p>
          </div>

          {/* Authentication Mode Switcher */}
          <div
            role="tablist"
            aria-label="Authentication Method"
            className="grid grid-cols-2 p-1 bg-surface border border-border rounded-xl gap-1 text-xs font-semibold"
          >
            <button
              type="button"
              role="tab"
              id="tab-credentials"
              aria-selected={authMethod === 'credentials'}
              aria-controls="panel-credentials"
              onClick={() => {
                setAuthMethod('credentials');
                setErrorMessage(null);
              }}
              className={`py-1.5 px-3 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                authMethod === 'credentials'
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Institutional Login
            </button>
            <button
              type="button"
              role="tab"
              id="tab-apikey"
              aria-selected={authMethod === 'apikey'}
              aria-controls="panel-apikey"
              onClick={() => {
                setAuthMethod('apikey');
                setErrorMessage(null);
              }}
              className={`py-1.5 px-3 rounded-lg font-mono transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                authMethod === 'apikey'
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              API Key Access
            </button>
          </div>

          {/* Error Message Announcement */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs font-semibold flex items-start gap-2"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMethod === 'credentials' ? (
              <div id="panel-credentials" role="tabpanel" aria-labelledby="tab-credentials" className="space-y-3.5">
                {/* Email Address */}
                <div className="space-y-1">
                  <label htmlFor="clinician-email" className="block text-xs font-bold text-foreground">
                    Institutional Email Address <span className="text-status-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted" aria-hidden="true">
                      <Mail size={15} />
                    </span>
                    <input
                      id="clinician-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="physician@stjude.org"
                      className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent min-h-[40px]"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="clinician-password" className="block text-xs font-bold text-foreground">
                      Master Password <span className="text-status-danger">*</span>
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-[11px] text-primary hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                    >
                      Reset password
                    </a>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted" aria-hidden="true">
                      <Lock size={15} />
                    </span>
                    <input
                      id="clinician-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 bg-surface border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent min-h-[40px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div id="panel-apikey" role="tabpanel" aria-labelledby="tab-apikey" className="space-y-3.5">
                {/* Secure API Key Validation Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="api-enclave-key" className="block text-xs font-bold text-foreground">
                      NeuroSense API Key <span className="text-status-danger">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-muted">Format: ns_live_...</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted" aria-hidden="true">
                      <KeyRound size={15} />
                    </span>
                    <input
                      id="api-enclave-key"
                      type={showApiKey ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      spellCheck={false}
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="ns_live_sec_9941a87b32f"
                      aria-invalid={apiKeyValid === false}
                      aria-describedby="api-key-status"
                      className={`w-full pl-9 pr-10 py-2 bg-surface border rounded-xl text-xs font-mono text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[40px] ${
                        apiKeyValid === true
                          ? 'border-status-stable/60'
                          : apiKeyValid === false
                          ? 'border-status-danger/60'
                          : 'border-border'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((p) => !p)}
                      aria-label={showApiKey ? 'Mask API key' : 'Reveal API key in cleartext'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Dynamic Scope & Validation Pill */}
                  <div id="api-key-status" className="pt-1">
                    {apiKeyValid === true && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-status-stable/10 border border-status-stable/20 text-[11px] font-mono text-status-stable">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          <span>Valid Telemetry Enclave Key</span>
                        </span>
                        <span className="text-[10px] text-muted font-bold">Scope: Read/Write</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas shadow-sm min-h-[42px] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                  <span>Validating Enclave Credentials…</span>
                </>
              ) : (
                <>
                  <span>Authenticate to Clinical Console</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Compliance Disclaimer */}
          <div className="pt-2 border-t border-border text-center">
            <p className="text-[10px] font-mono text-subtle leading-normal">
              Protected by 256-bit AES Hardware Encryption. Authorized clinical and developer personnel only under HIPAA Title II.
            </p>
          </div>
        </div>
      </main>

      <footer className="h-10 px-6 border-t border-border flex items-center justify-between text-[11px] text-subtle font-mono">
        <span>Session Host: enclave-us-east-1a</span>
        <span>Version: 2.4.0-enterprise</span>
      </footer>
    </div>
  );
}
