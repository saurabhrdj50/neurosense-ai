import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ConfigProvider, Checkbox, Button as AntButton, Card } from 'antd';
import {
  Brain, Mail, Lock, User, Shield, Stethoscope, ArrowLeft, Building2,
  AlertCircle, LockKeyhole, Sun, Moon, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useTheme } from '../../context/ThemeProvider';
import { getAuthThemeConfig } from './config/AuthThemeConfig';
import BrainCanvas from './components/BrainCanvas';
import API_URL from '../../config/api';

// Custom Sleek Tailwind Input Component (Linear / Vercel Style)
function CustomInput({ label, icon: Icon, type = 'text', value, onChange, placeholder, error, required, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}
      <div className={`relative flex items-center h-12 rounded-xl border bg-slate-50/90 dark:bg-slate-900/70 transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white dark:focus-within:bg-slate-900 ${
        error ? 'border-rose-500/80 ring-2 ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}>
        {Icon && (
          <div className="pl-3.5 pr-2.5 text-slate-400 dark:text-slate-500 flex items-center justify-center pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full h-full bg-transparent px-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="pr-3.5 pl-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] font-medium text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const { login, register, verifyIdentity, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('doctor'); // 'doctor' | 'admin'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [rememberMe, setRememberMe] = useState(true);
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

  // Form states
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    institution: '',
    acceptTerms: false
  });

  // Forgot password form states
  const [forgotEmail, setForgotEmail] = useState('');
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

      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }

      if (!form.institution.trim()) newErrors.institution = 'Hospital or Institution name is required';

      if (!form.password) {
        newErrors.password = 'Password is required';
      } else if (form.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
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
          if (result.role === 'admin' || selectedRole === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setErrors({ general: 'Incorrect username or password. Please try again.' });
        }
      } else {
        const payload = {
          username: form.email,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          institution: form.institution,
          department: 'General Medicine',
          date_of_birth: '1990-01-01',
          license_number: 'N/A'
        };
        const res = await register(payload);
        const isSuccess = typeof res === 'boolean' ? res : res?.success;
        if (isSuccess) {
          setMode('login');
          setForm(f => ({ ...f, username: form.email }));
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
        const res = await verifyIdentity(forgotEmail);
        if (res.success) setForgotStep(2);
        else setErrors({ forgot: res.message || 'Could not verify email' });
      } else {
        if (forgotNewPw !== forgotConfirmPw) {
          setErrors({ forgot: 'Passwords do not match' });
          return;
        }
        const res = await resetPassword(forgotEmail, forgotNewPw);
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

  const antTheme = getAuthThemeConfig(isDark);

  return (
    <ConfigProvider theme={antTheme}>
      <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        
        {/* Top Header Navigation */}
        <div className="absolute top-5 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
          <button
            onClick={() => navigate('/')}
            className="pointer-events-auto px-4 py-2 rounded-xl backdrop-blur-md border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 shadow-sm hover:border-indigo-500/50 flex items-center gap-2 text-xs font-semibold transition-all group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            <span>Home</span>
          </button>
        </div>

        {/* ── LEFT HERO PANEL ────────────────── */}
        <div className="hidden lg:flex lg:w-[50%] relative p-12 lg:p-16 flex-col justify-between overflow-hidden border-r border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-indigo-50/60 to-slate-50 dark:from-slate-950 dark:via-indigo-950/80 dark:to-slate-900 transition-colors duration-300">
          <BrainCanvas isDark={isDark} />

          {/* Clean Brand Header */}
          <div className="relative z-10 flex items-center gap-3 mt-12 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                NeuroSense AI
              </h1>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Medical Imaging Intelligence
              </p>
            </div>
          </div>

          {/* Clean Hero Text */}
          <div className="relative z-10 max-w-md my-auto space-y-4">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Smart AI for Brain Imaging & Diagnostics
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Fast, accurate, and easy-to-use AI assistance for doctors and healthcare teams.
            </p>
          </div>

          {/* Simple Security Badge */}
          <div className="relative z-10 flex items-center gap-2 border-t border-slate-200/80 dark:border-slate-800/80 pt-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            <LockKeyhole size={15} className="text-emerald-500 dark:text-emerald-400" />
            <span>Secure & Private Medical System</span>
          </div>
        </div>

        {/* ── RIGHT AUTH CARD ───────────── */}
        <div className="w-full lg:w-[50%] flex items-center justify-center p-6 sm:p-12 relative z-10 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300 pt-20 lg:pt-12">
          
          <div className="w-full max-w-md space-y-6">

            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-2 bg-indigo-600 text-white">
                <Brain className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">NeuroSense AI</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Medical Imaging Intelligence</p>
            </div>

            {/* Auth Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className="w-full shadow-2xl border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 overflow-hidden rounded-3xl"
                bodyStyle={{ padding: '0px' }}
              >
                {/* Top Accent Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

                <div className="p-8 space-y-6">

                  {/* CARD TITLE & MODE TABS */}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                      {forgotMode
                        ? 'Reset Password'
                        : mode === 'login'
                        ? 'Sign In'
                        : 'Create Account'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                      {forgotMode
                        ? 'Enter your clinical email address to reset password.'
                        : mode === 'login'
                        ? 'Enter your credentials to access your workstation.'
                        : 'Register a new clinical doctor account.'}
                    </p>

                    {/* Mode Tab Switches (Sign In / Create Account) */}
                    {!forgotMode && selectedRole === 'doctor' && (
                      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 mb-4">
                        <button
                          type="button"
                          onClick={() => { setMode('login'); setErrors({}); }}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            mode === 'login'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMode('register'); setErrors({}); }}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                            mode === 'register'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          Create Account
                        </button>
                      </div>
                    )}

                    {/* ROLE PILL BANNER (User Highlighted Design: Role: Doctor ... Switch to Admin) */}
                    {!forgotMode && (
                      <div className="p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {selectedRole === 'doctor' ? (
                            <Stethoscope className="text-indigo-600 dark:text-indigo-400" size={17} />
                          ) : (
                            <Shield className="text-purple-600 dark:text-purple-400" size={17} />
                          )}
                          <span>
                            Role: <strong className="font-bold text-slate-900 dark:text-white">{selectedRole === 'doctor' ? 'Doctor' : 'Admin'}</strong>
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
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                        >
                          Switch to {selectedRole === 'doctor' ? 'Admin' : 'Doctor'}
                        </button>
                      </div>
                    )}

                    {/* SERVER CONNECTION STATUS PILL */}
                    {!forgotMode && (
                      <div className="mt-2.5 p-2.5 px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-medium">
                          {serverStatus === 'online' ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">Backend Connected</span>
                            </>
                          ) : serverStatus === 'checking' ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                              </span>
                              <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">Connecting to backend...</span>
                            </>
                          ) : (
                            <>
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">Backend Unreachable</span>
                            </>
                          )}
                        </div>
                        {serverStatus === 'offline' && (
                          <button
                            type="button"
                            onClick={() => setServerStatus('checking')}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error Banner */}
                  {errors.general && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{errors.general}</span>
                    </div>
                  )}

                  {/* FORGOT PASSWORD FORM */}
                  {forgotMode ? (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      {errors.forgot && (
                        <p className="text-xs text-rose-500 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">{errors.forgot}</p>
                      )}

                      {forgotStep === 1 ? (
                        <>
                          <CustomInput
                            label="Email Address"
                            icon={Mail}
                            type="email"
                            placeholder="doctor@hospital.org"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            required
                          />
                          <AntButton
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className="mt-2 font-semibold bg-indigo-600 hover:bg-indigo-500 h-12 rounded-xl text-sm"
                          >
                            Continue
                          </AntButton>
                        </>
                      ) : (
                        <>
                          <CustomInput
                            label="New Password"
                            icon={Lock}
                            type="password"
                            placeholder="Enter new password"
                            value={forgotNewPw}
                            onChange={e => setForgotNewPw(e.target.value)}
                            required
                          />
                          <CustomInput
                            label="Confirm New Password"
                            icon={Lock}
                            type="password"
                            placeholder="Confirm new password"
                            value={forgotConfirmPw}
                            onChange={e => setForgotConfirmPw(e.target.value)}
                            required
                          />
                          <AntButton
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className="mt-2 font-semibold bg-indigo-600 hover:bg-indigo-500 h-12 rounded-xl text-sm"
                          >
                            Reset Password
                          </AntButton>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        className="w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                      >
                        Back to Sign In
                      </button>
                    </form>
                  ) : (
                    /* MAIN AUTHENTICATION FORM */
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* DOCTOR REGISTRATION FIELDS */}
                      {mode === 'register' && selectedRole === 'doctor' && (
                        <>
                          <CustomInput
                            label="Full Name"
                            icon={User}
                            placeholder="Dr. Sarah Jenkins"
                            value={form.full_name}
                            onChange={setField('full_name')}
                            error={errors.full_name}
                          />

                          <CustomInput
                            label="Clinical Email"
                            icon={Mail}
                            type="email"
                            placeholder="sarah@hospital.org"
                            value={form.email}
                            onChange={setField('email')}
                            error={errors.email}
                          />

                          <CustomInput
                            label="Hospital / Institution"
                            icon={Building2}
                            placeholder="St. Jude Hospital"
                            value={form.institution}
                            onChange={setField('institution')}
                            error={errors.institution}
                          />
                        </>
                      )}

                      {/* USERNAME FIELD (LOGIN MODE) */}
                      {mode === 'login' && (
                        <CustomInput
                          label={selectedRole === 'admin' ? 'Admin Username' : 'Email or Username'}
                          icon={User}
                          placeholder={selectedRole === 'admin' ? 'admin' : 'dr_sarah'}
                          value={form.username}
                          onChange={setField('username')}
                          error={errors.username}
                        />
                      )}

                      {/* PASSWORD FIELD */}
                      <CustomInput
                        label="Password"
                        icon={Lock}
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={setField('password')}
                        error={errors.password}
                      />

                      {/* REMEMBER ME & FORGOT PASSWORD */}
                      {mode === 'login' && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <Checkbox
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                          >
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              Remember Me
                            </span>
                          </Checkbox>
                          <button
                            type="button"
                            onClick={() => { setForgotMode(true); setForgotStep(1); setErrors({}); }}
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}

                      {/* ACCEPT TERMS CHECKBOX */}
                      {mode === 'register' && selectedRole === 'doctor' && (
                        <div className="pt-1">
                          <Checkbox
                            checked={form.acceptTerms}
                            onChange={setField('acceptTerms')}
                          >
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              I agree to the Terms of Service & Privacy Policy
                            </span>
                          </Checkbox>
                          {errors.acceptTerms && <p className="text-[11px] font-medium text-rose-500 mt-1">{errors.acceptTerms}</p>}
                        </div>
                      )}

                      {/* PRIMARY ACTION BUTTON */}
                      <div className="pt-2">
                        <AntButton
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          size="large"
                          className="font-semibold shadow-md bg-indigo-600 hover:bg-indigo-500 h-12 text-sm rounded-xl"
                        >
                          {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </AntButton>
                      </div>
                    </form>
                  )}

                </div>
              </Card>
            </motion.div>

          </div>
        </div>

      </div>
    </ConfigProvider>
  );
}
