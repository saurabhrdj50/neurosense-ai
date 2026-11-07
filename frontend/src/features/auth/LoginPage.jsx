import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Mail, Lock, User, Shield, Stethoscope, ArrowLeft,
  AlertCircle, LockKeyhole, Eye, EyeOff, CalendarDays, CheckCircle2,
  AtSign, Hospital
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import BrainCanvas from './components/BrainCanvas';
import Button from '../../shared/components/ui/Button';
import API_URL from '../../config/api';

/** Floating-label style tokenized input with icon, error state, and password reveal. */
function AuthInput({ label, icon: Icon, type = 'text', value, onChange, placeholder, error, required, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className={`relative flex items-center h-12 rounded-xl border bg-surface-secondary/60 transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:bg-card focus-within:shadow-sm ${
        error ? 'border-danger/80 ring-2 ring-danger/10' : 'border-border hover:border-border-strong'
      }`}>
        {Icon && (
          <div className="pl-3.5 pr-2.5 text-subtle flex items-center justify-center pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full h-full bg-transparent px-2.5 text-sm font-medium text-foreground placeholder:text-subtle placeholder:opacity-70 focus:outline-none"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="pr-3.5 pl-2 text-subtle hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] font-medium text-danger mt-1">{error}</p>}
    </div>
  );
}

/** Accessible custom checkbox (replaces the removed antd Checkbox). */
function TermsCheckbox({ checked, onChange, error }) {
  return (
    <div className="pt-1">
      <label className="flex items-start gap-2.5 cursor-pointer select-none group">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={() => onChange({ target: { type: 'checkbox', checked: !checked } })}
          className={`mt-0.5 w-[18px] h-[18px] rounded-md flex items-center justify-center border transition-all duration-150 shrink-0 ${
            checked
              ? 'bg-primary border-primary text-primary-foreground shadow-xs'
              : `bg-surface-secondary border-border-strong group-hover:border-primary ${error ? 'border-danger' : ''}`
          }`}
        >
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
              >
                <CheckCircle2 size={13} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <span className="text-xs text-muted group-hover:text-foreground transition-colors leading-relaxed">
          I agree to the Terms of Service &amp; Privacy Policy
        </span>
      </label>
      {error && <p className="text-[11px] font-medium text-danger mt-1">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const { login, register, verifyIdentity, resetPassword } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('doctor'); // 'doctor' | 'admin'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  React.useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    const checkBackendHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`, { method: 'GET' });
        if (res.ok && isMounted) {
          setServerStatus('online');
          return;
        }
      } catch {
        // Render server cold start warmup in progress
      }

      if (isMounted) {
        attempts++;
        if (attempts < 12) {
          setTimeout(checkBackendHealth, 3000);
        } else {
          setServerStatus('offline');
        }
      }
    };

    checkBackendHealth();
    return () => { isMounted = false; };
  }, []);

  // Form states — registration captures the clinician identity: full name,
  // username (login ID), email, hospital, date of birth (the forgot-password
  // identity factor), and password. The backend hardcodes role='doctor'.
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    date_of_birth: '',
    hospital: '',
    acceptTerms: false
  });

  // Forgot password form states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDob, setForgotDob] = useState('');
  const [forgotNewPw, setForgotNewPw] = useState('');
  const [forgotConfirmPw, setForgotConfirmPw] = useState('');

  const setField = (k) => (e) => {
    const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm(f => ({ ...f, [k]: val }));
    if (errors[k]) setErrors(er => ({ ...er, [k]: null }));
  };

  const validate = () => {
    const newErrors = {};

    if (mode === 'login') {
      if (!form.username.trim()) newErrors.username = 'Please enter your email or username';
      if (!form.password) newErrors.password = 'Please enter your password';
    } else if (mode === 'register' && selectedRole === 'doctor') {
      if (!form.full_name.trim()) newErrors.full_name = 'Full Name is required';

      const username = form.username.trim();
      if (!username) {
        newErrors.username = 'Username is required';
      } else if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
        newErrors.username = 'Username must be 3–30 characters — letters, numbers, underscores, dots, or hyphens only';
      }

      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!form.hospital.trim()) {
        newErrors.hospital = 'Hospital / institution is required';
      }

      if (!form.date_of_birth) {
        newErrors.date_of_birth = 'Date of birth is required';
      } else {
        const dob = new Date(form.date_of_birth);
        if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
          newErrors.date_of_birth = 'Date of birth must be a valid past date (YYYY-MM-DD)';
        }
      }

      // Mirror the backend strength rule exactly so users never hit a vague
      // server-side rejection after passing client validation.
      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^a-zA-Z0-9]/.test(form.password)) {
        newErrors.password = 'Password needs 8+ characters with an uppercase letter, a number, and a symbol';
      }

      if (!form.acceptTerms) newErrors.acceptTerms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (mode === 'login') {
        const result = await login(form.username, form.password);
        if (result.success) {
          // Navigate strictly by the role the backend returned — never by the
          // selected tab, so a doctor choosing the Admin tab is not sent to an
          // admin route they would just be bounced from.
          if (result.role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setErrors({ general: 'Incorrect username or password. Please try again.' });
        }
      } else {
        // The backend username rules forbid '@' and enforce 3–30 chars — the
        // same regex as the client validation above, so a validated form
        // always passes. The hospital field is stored on the clinician
        // profile and shown in the user dictionary.
        const payload = {
          username: form.username.trim(),
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          date_of_birth: form.date_of_birth,
          hospital: form.hospital.trim()
        };
        const res = await register(payload);
        const isSuccess = typeof res === 'boolean' ? res : res?.success;
        if (isSuccess) {
          setMode('login');
          setForm(f => ({ ...f, username: form.username.trim() }));
          setErrors({});
        } else {
          const msg = typeof res?.message === 'string' ? res.message : 'Could not create account. Please check your details.';
          setErrors({ general: msg });
        }
      }
    } catch (err) {
      setErrors({ general: err.message || 'An error occurred during sign in.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (forgotStep === 1) {
        const res = await verifyIdentity(forgotEmail, forgotDob);
        if (res.success) setForgotStep(2);
        else setErrors({ forgot: res.message || 'Could not verify identity' });
      } else {
        if (forgotNewPw !== forgotConfirmPw) {
          setErrors({ forgot: 'Passwords do not match' });
          setLoading(false);
          return;
        }
        const res = await resetPassword(forgotEmail, forgotNewPw, forgotDob);
        if (res.success) {
          setForgotMode(false);
          setForgotStep(1);
        }
      }
    } catch (err) {
      setErrors({ forgot: err.message || 'Password reset failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden font-sans bg-background text-foreground">

      {/* Top Header Navigation */}
      <div className="absolute top-5 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => navigate('/')}
          className="pointer-events-auto px-4 py-2 rounded-xl backdrop-blur-md border border-border bg-card/80 text-muted hover:text-foreground shadow-xs hover:border-primary/50 flex items-center gap-2 text-xs font-semibold transition-all group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          <span>Home</span>
        </button>
      </div>

      {/* ── LEFT HERO PANEL ────────────────── */}
      <div className="hidden lg:flex lg:w-[50%] relative p-12 lg:p-16 flex-col justify-between overflow-hidden border-r border-border bg-gradient-to-br from-surface-secondary via-primary-soft to-surface-secondary">
        <BrainCanvas isDark={isDark} />

        {/* Clean Brand Header */}
        <div className="relative z-10 flex items-center gap-3 mt-12 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              NeuroSense AI
            </h1>
            <p className="text-xs font-medium text-muted">
              Medical Imaging Intelligence
            </p>
          </div>
        </div>

        {/* Clean Hero Text — scrim keeps the headline legible over the brain art */}
        <div className="relative z-10 max-w-md my-auto space-y-4">
          <div className="absolute -inset-x-10 -inset-y-8 -z-10 bg-gradient-to-r from-background/85 via-background/60 to-transparent blur-md rounded-3xl" aria-hidden="true" />
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight font-heading">
            Smart AI for Brain Imaging &amp; Diagnostics
          </h2>
          <p className="text-base text-muted leading-relaxed">
            Fast, accurate, and easy-to-use AI assistance for doctors and healthcare teams.
          </p>
        </div>

        {/* Simple Security Badge */}
        <div className="relative z-10 flex items-center gap-2 border-t border-border pt-4 text-xs font-medium text-muted">
          <LockKeyhole size={15} className="text-emerald-500 dark:text-emerald-400" />
          <span>Secure &amp; Private Medical System</span>
        </div>
      </div>

      {/* ── RIGHT AUTH CARD ───────────── */}
      <div className="w-full lg:w-[50%] flex items-center justify-center p-6 sm:p-12 relative z-10 overflow-y-auto pt-20 lg:pt-12">

        <div className="w-full max-w-md space-y-6">

          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-4 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-2 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
              <Brain className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading">NeuroSense AI</h1>
            <p className="text-xs text-muted">Medical Imaging Intelligence</p>
          </div>

          {/* Auth Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-border bg-card/95 backdrop-blur-xl shadow-lg overflow-hidden"
          >
            {/* Top Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

            <div className="p-8 space-y-6">

              {/* CARD TITLE & MODE TABS */}
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1 font-heading">
                  {forgotMode
                    ? 'Reset Password'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </h2>
                <p className="text-xs text-muted mb-5">
                  {forgotMode
                    ? 'Enter your clinical email and date of birth to verify your identity.'
                    : mode === 'login'
                    ? 'Enter your credentials to access your workstation.'
                    : 'Register a new clinical doctor account.'}
                </p>

                {/* Mode Tab Switches (Sign In / Create Account) */}
                {!forgotMode && selectedRole === 'doctor' && (
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-surface-secondary border border-border mb-4">
                    {['login', 'register'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMode(m); setErrors({}); }}
                        className={`relative py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                          mode === m
                            ? 'text-white'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {mode === m && (
                          <motion.span
                            layoutId="auth-mode-pill"
                            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            className="absolute inset-0 rounded-xl bg-indigo-600 shadow-sm"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-1">{m === 'login' ? 'Sign In' : 'Create Account'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ROLE PILL BANNER */}
                {!forgotMode && (
                  <div className="p-3 px-4 rounded-2xl border border-border bg-surface-secondary/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                      {selectedRole === 'doctor' ? (
                        <Stethoscope className="text-primary" size={17} />
                      ) : (
                        <Shield className="text-purple-500 dark:text-purple-400" size={17} />
                      )}
                      <span>
                        Role: <strong className="font-bold text-foreground">{selectedRole === 'doctor' ? 'Doctor' : 'Admin'}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRole = selectedRole === 'doctor' ? 'admin' : 'doctor';
                        setSelectedRole(newRole);
                        if (newRole === 'admin') setMode('login');
                        setErrors({});
                      }}
                      className="text-xs font-semibold text-primary hover:underline transition-colors"
                    >
                      Switch to {selectedRole === 'doctor' ? 'Admin' : 'Doctor'}
                    </button>
                  </div>
                )}

                {/* SERVER CONNECTION STATUS PILL */}
                {!forgotMode && (
                  <div className="mt-2.5 p-2.5 px-3.5 rounded-xl border border-border bg-surface-secondary/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      {serverStatus === 'online' ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Backend Connected</span>
                        </>
                      ) : serverStatus === 'checking' ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">Connecting to backend...</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-danger" />
                          <span className="text-danger font-semibold text-[11px]">Backend Unreachable</span>
                        </>
                      )}
                    </div>
                    {serverStatus === 'offline' && (
                      <button
                        type="button"
                        onClick={() => setServerStatus('checking')}
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Error Banner */}
              <AnimatePresence>
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{errors.general}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FORGOT PASSWORD FORM */}
              {forgotMode ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {errors.forgot && (
                    <p className="text-xs text-danger p-2.5 bg-danger/10 rounded-xl border border-danger/20">{errors.forgot}</p>
                  )}

                  <AnimatePresence mode="wait">
                    {forgotStep === 1 ? (
                      <motion.div
                        key="forgot-step-1"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <AuthInput
                          label="Email Address"
                          icon={Mail}
                          type="email"
                          placeholder="doctor@hospital.org"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          required
                        />
                        <AuthInput
                          label="Date of Birth"
                          icon={CalendarDays}
                          type="date"
                          placeholder="YYYY-MM-DD"
                          value={forgotDob}
                          onChange={e => setForgotDob(e.target.value)}
                          required
                        />
                        <Button type="submit" loading={loading} className="w-full">
                          Continue
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="forgot-step-2"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <AuthInput
                          label="New Password"
                          icon={Lock}
                          type="password"
                          placeholder="Enter new password"
                          value={forgotNewPw}
                          onChange={e => setForgotNewPw(e.target.value)}
                          required
                        />
                        <AuthInput
                          label="Confirm New Password"
                          icon={Lock}
                          type="password"
                          placeholder="Confirm new password"
                          value={forgotConfirmPw}
                          onChange={e => setForgotConfirmPw(e.target.value)}
                          required
                        />
                        <Button type="submit" loading={loading} className="w-full">
                          Reset Password
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-center text-xs font-semibold text-primary hover:underline pt-1"
                  >
                    Back to Sign In
                  </button>
                </form>
              ) : (
                /* MAIN AUTHENTICATION FORM */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* DOCTOR REGISTRATION FIELDS — name, username, email,
                      hospital, DOB, password. DOB stays because the
                      forgot-password flow verifies identity with email +
                      date of birth. */}
                  {mode === 'register' && selectedRole === 'doctor' && (
                    <>
                      <AuthInput
                        label="Full Name"
                        icon={User}
                        placeholder="Dr. Sarah Jenkins"
                        value={form.full_name}
                        onChange={setField('full_name')}
                        error={errors.full_name}
                      />

                      <AuthInput
                        label="Username"
                        icon={AtSign}
                        placeholder="dr_sarah"
                        value={form.username}
                        onChange={setField('username')}
                        error={errors.username}
                      />

                      <AuthInput
                        label="Clinical Email"
                        icon={Mail}
                        type="email"
                        placeholder="sarah@hospital.org"
                        value={form.email}
                        onChange={setField('email')}
                        error={errors.email}
                      />

                      <AuthInput
                        label="Hospital / Institution"
                        icon={Hospital}
                        placeholder="City General Hospital"
                        value={form.hospital}
                        onChange={setField('hospital')}
                        error={errors.hospital}
                      />

                      <AuthInput
                        label="Date of Birth"
                        icon={CalendarDays}
                        type="date"
                        placeholder="YYYY-MM-DD"
                        value={form.date_of_birth}
                        onChange={setField('date_of_birth')}
                        error={errors.date_of_birth}
                      />
                      <p className="text-[11px] text-muted font-medium -mt-2">
                        Only used to verify your identity if you forget your password.
                      </p>
                    </>
                  )}

                  {/* USERNAME FIELD (LOGIN MODE) */}
                  {mode === 'login' && (
                    <AuthInput
                      label={selectedRole === 'admin' ? 'Admin Username' : 'Email or Username'}
                      icon={User}
                      placeholder={selectedRole === 'admin' ? 'admin' : 'dr_sarah'}
                      value={form.username}
                      onChange={setField('username')}
                      error={errors.username}
                    />
                  )}

                  {/* PASSWORD FIELD */}
                  <AuthInput
                    label="Password"
                    icon={Lock}
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={setField('password')}
                    error={errors.password}
                  />

                  {/* FORGOT PASSWORD — doctor accounts only. The fixed admin
                      credential (admin/admin) is a deployment constant with
                      no self-service reset; the backend refuses tokens for
                      it regardless. */}
                  {mode === 'login' && selectedRole === 'doctor' && (
                    <div className="flex items-center justify-end text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setForgotStep(1); setErrors({}); }}
                        className="font-semibold text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {/* ACCEPT TERMS CHECKBOX */}
                  {mode === 'register' && selectedRole === 'doctor' && (
                    <TermsCheckbox
                      checked={form.acceptTerms}
                      onChange={setField('acceptTerms')}
                      error={errors.acceptTerms}
                    />
                  )}

                  {/* PRIMARY ACTION BUTTON */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      loading={loading}
                      className="w-full btn-sheen"
                    >
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              )}

            </div>
          </motion.div>

        </div>
      </div>

    </div>
  );
}
