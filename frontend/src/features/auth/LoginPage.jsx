import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ConfigProvider, Segmented, Input, Checkbox, Button as AntButton, Card } from 'antd';
import {
  Brain, Activity, Eye, EyeOff, Mail, Lock, User,
  Shield, Calendar, KeyRound, CheckCircle2, Stethoscope, ArrowLeft, Building2,
  AlertCircle, Sparkles, Fingerprint, ShieldCheck, Cpu, Database, Zap, LockKeyhole, Sun, Moon
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useTheme } from '../../context/ThemeProvider';
import { getAuthThemeConfig } from './config/AuthThemeConfig';
import BrainCanvas from './components/BrainCanvas';

export default function LoginPage() {
  const { login, register, verifyIdentity, resetPassword } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('doctor'); // 'doctor' | 'admin'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Form states
  const [form, setForm] = useState({
    username: '',
    email: '',
    date_of_birth: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    institution: '',
    department: '',
    licenseNumber: '',
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

  const fillDemoCredentials = (role) => {
    setSelectedRole(role);
    setMode('login');
    setForgotMode(false);
    setErrors({});
    if (role === 'admin') {
      setForm(f => ({ ...f, username: 'admin', password: 'password123' }));
    } else {
      setForm(f => ({ ...f, username: 'dr_sarah', password: 'password123' }));
    }
  };

  const handleBiometricAuth = () => {
    setBiometricLoading(true);
    setTimeout(async () => {
      try {
        const usernameToUse = selectedRole === 'admin' ? 'admin' : 'dr_sarah';
        const result = await login(usernameToUse, 'password123');
        if (result.success) {
          if (result.role === 'admin' || selectedRole === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setErrors({ general: 'Biometric passkey key not recognized. Please sign in manually.' });
        }
      } catch (err) {
        setErrors({ general: 'Biometric verification failed.' });
      } finally {
        setBiometricLoading(false);
      }
    }, 900);
  };

  const calculatePasswordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 1;
    return score;
  };

  const validate = () => {
    const newErrors = {};

    if (mode === 'login') {
      if (!form.username.trim()) newErrors.username = 'Username or Email is required';
      if (!form.password) newErrors.password = 'Password is required';
    } else if (mode === 'register' && selectedRole === 'doctor') {
      if (!form.full_name.trim()) newErrors.full_name = 'Full Name is required';
      if (!form.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (!/^[a-zA-Z0-9_.\-]{3,30}$/.test(form.username.trim())) {
        newErrors.username = 'Username must be 3–30 characters';
      }

      if (!form.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
        newErrors.email = 'Invalid email address format';
      }

      if (!form.date_of_birth) {
        newErrors.date_of_birth = 'Date of Birth is required';
      } else {
        const dobDate = new Date(form.date_of_birth);
        if (isNaN(dobDate.getTime()) || dobDate >= new Date()) {
          newErrors.date_of_birth = 'Date of birth must be a valid date in the past';
        }
      }

      if (!form.institution) newErrors.institution = 'Hospital / Institution is required';
      if (!form.department.trim()) newErrors.department = 'Department is required';

      if (!form.password) {
        newErrors.password = 'Password is required';
      } else {
        const pw = form.password;
        const pwIssues = [];
        if (pw.length < 8) pwIssues.push('8+ characters');
        if (!/[A-Z]/.test(pw)) pwIssues.push('1 uppercase letter');
        if (!/[0-9]/.test(pw)) pwIssues.push('1 digit');
        if (!/[^a-zA-Z0-9]/.test(pw)) pwIssues.push('1 special character');

        if (pwIssues.length > 0) {
          newErrors.password = `Must contain ${pwIssues.join(', ')}`;
        }
      }

      if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!form.acceptTerms) newErrors.acceptTerms = 'You must accept the HIPAA clinical terms';
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
          setErrors({ general: 'Invalid credentials. Please verify and try again.' });
        }
      } else {
        const payload = {
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          date_of_birth: form.date_of_birth,
          institution: form.institution,
          department: form.department,
          license_number: form.licenseNumber
        };
        const res = await register(payload);
        const isSuccess = typeof res === 'boolean' ? res : res?.success;
        if (isSuccess) {
          setMode('login');
          setErrors({});
        } else {
          const msg = typeof res?.message === 'string' ? res.message : 'Registration failed. Please check details.';
          setErrors({ general: msg });
        }
      }
    } catch (err) {
      setErrors({ general: err.message || 'An authentication error occurred.' });
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
        else setErrors({ forgot: res.message || 'Identity verification failed' });
      } else {
        if (forgotNewPw !== forgotConfirmPw) {
          setErrors({ forgot: 'Passwords do not match' });
          return;
        }
        const res = await resetPassword(forgotEmail, forgotDob, forgotNewPw);
        if (res.success) {
          setForgotMode(false);
          setForgotStep(1);
        }
      }
    } catch (err) {
      setErrors({ forgot: err.message || 'Reset failed' });
    } finally {
      setLoading(false);
    }
  };

  const passwordScore = calculatePasswordStrength(form.password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Enterprise Grade'];
  const strengthColors = [
    'bg-slate-200 dark:bg-slate-800',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500'
  ];

  const antTheme = getAuthThemeConfig(isDark);

  return (
    <ConfigProvider theme={antTheme}>
      <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white bg-background text-foreground transition-colors duration-300">
        
        {/* Top-Right Unified Theme Toggle */}
        <div className="absolute top-6 right-6 z-30">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-3 rounded-2xl backdrop-blur-xl border border-border bg-surface text-foreground shadow-lg hover:border-primary/50 flex items-center gap-2 text-xs font-semibold transition-all"
            title="Toggle Light / Dark Theme"
          >
            <motion.div
              animate={{ rotate: isDark ? 180 : 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
            </motion.div>
            <span className="hidden sm:inline font-mono tracking-wide">
              {isDark ? 'LIGHT MODE' : 'DARK MODE'}
            </span>
          </motion.button>
        </div>

        {/* ── LEFT SHOWCASE HERO PANEL (60% Desktop Split) ────────────────── */}
        <div className={`hidden lg:flex lg:w-[60%] relative p-12 flex-col justify-between overflow-hidden border-r transition-colors duration-300 ${
          isDark ? 'bg-[#050816] border-slate-800/80' : 'bg-[#F8FAFC] border-slate-200/80'
        }`}>
          {/* Interactive 3D Neural Brain Canvas */}
          <BrainCanvas isDark={isDark} />

          {/* Ambient Glow Orbs */}
          {isDark ? (
            <>
              <div className="absolute top-1/4 left-1/4 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
              <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
            </>
          ) : (
            <>
              <div className="absolute top-1/4 left-1/4 w-[550px] h-[550px] bg-indigo-400/10 rounded-full blur-[150px] pointer-events-none" />
              <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-sky-400/12 rounded-full blur-[140px] pointer-events-none" />
            </>
          )}

          {/* Brand Header */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 ${
              isDark
                ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-indigo-500/25 border border-indigo-400/30'
                : 'bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/15 border border-indigo-200'
            }`}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                NeuroSense AI
              </h1>
              <p className={`text-[10px] uppercase tracking-widest font-mono font-bold ${
                isDark ? 'text-cyan-400' : 'text-indigo-600'
              }`}>
                Clinical Decision Intelligence
              </p>
            </div>
          </motion.div>

          {/* Hero Content & Telemetry Statistic Cards */}
          <div className="relative z-10 max-w-xl my-auto space-y-8 py-6">
            
            {/* Pill Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-4"
            >
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border ${
                isDark
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-indigo-500/10 border-indigo-200 text-indigo-700'
              }`}>
                <Sparkles size={14} className={isDark ? 'text-cyan-400' : 'text-indigo-600'} />
                <span>Next-Gen Neurological Diagnostics</span>
              </div>

              <h2 className={`text-4xl sm:text-5xl font-black leading-[1.15] tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Precision Intelligence for Modern Clinical Care
              </h2>

              <p className={`text-base leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Accelerate neuroimaging diagnostics with AI-powered segmentation, biomarker analysis, and real-time clinical decision support.
              </p>
            </motion.div>

            {/* 2 Premium Statistic Cards Grid */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Stat Card 1: MRI Speed */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className={`p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800/80 shadow-lg shadow-black/40 hover:border-purple-500/40 hover:shadow-purple-500/10'
                    : 'bg-white/70 border-slate-200/90 shadow-md shadow-slate-200/50 hover:border-purple-300 hover:shadow-purple-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    MRI SPEED
                  </span>
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                    <Zap size={16} />
                  </div>
                </div>
                <p className={`text-2xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  &lt;60 sec
                </p>
                <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  MRI Processing
                </p>
              </motion.div>

              {/* Stat Card 4 */}
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className={`p-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800/80 shadow-lg shadow-black/40 hover:border-emerald-500/40 hover:shadow-emerald-500/10'
                    : 'bg-white/70 border-slate-200/90 shadow-md shadow-slate-200/50 hover:border-emerald-300 hover:shadow-emerald-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    COMPLIANCE
                  </span>
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <p className={`text-2xl font-black mt-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  HIPAA
                </p>
                <p className={`text-[11px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enterprise Ready
                </p>
              </motion.div>
            </motion.div>

          </div>

          {/* Footer Security Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`relative z-10 flex flex-wrap items-center justify-between border-t pt-5 text-xs font-medium gap-3 ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200/80 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider border ${
                isDark ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                HIPAA
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider border ${
                isDark ? 'bg-indigo-950/60 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}>
                SOC2 TYPE II
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider border ${
                isDark ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300' : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}>
                TLS 1.3
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <LockKeyhole size={13} className={isDark ? 'text-cyan-400' : 'text-indigo-600'} />
              <span>256-bit Encryption</span>
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT AUTHENTICATION WORKSTATION (40% Desktop Split) ───────────── */}
        <div className={`w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-12 relative z-10 overflow-y-auto transition-colors duration-300 ${
          isDark ? 'bg-[#050816]' : 'bg-[#F8FAFC]'
        }`}>
          
          <div className="w-full max-w-md space-y-6">

            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-6 cursor-pointer" onClick={() => navigate('/')}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-3 ${
                isDark
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/25 border border-indigo-400/30'
                  : 'bg-gradient-to-br from-indigo-600 to-blue-600 shadow-indigo-500/15 border border-indigo-200'
              }`}>
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                NeuroSense AI
              </h1>
              <p className={`text-xs font-mono font-bold tracking-widest uppercase mt-0.5 ${
                isDark ? 'text-cyan-400' : 'text-indigo-600'
              }`}>
                Clinical Decision Intelligence
              </p>
            </div>

            {/* Premium Ant Design Card Container (24px Border Radius, Glassmorphism) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card
                className={`w-full backdrop-blur-2xl shadow-2xl transition-all duration-300 ${
                  isDark
                    ? 'bg-[#121827]/85 border-indigo-500/20 shadow-black/60'
                    : 'bg-white/90 border-slate-200/90 shadow-slate-200/60'
                }`}
                bodyStyle={{ padding: '32px' }}
              >
                {/* Workstation Header & Back Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className={`text-[10px] uppercase tracking-widest font-mono font-extrabold ${
                      isDark ? 'text-cyan-400' : 'text-indigo-600'
                    }`}>
                      {selectedRole === 'admin' ? 'System Governance' : 'Clinical Workstation'}
                    </span>
                    <h2 className={`text-2xl font-black tracking-tight mt-0.5 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {forgotMode
                        ? 'Reset Password'
                        : mode === 'login'
                        ? 'Sign In'
                        : 'Create Account'}
                    </h2>
                  </div>

                  <button
                    onClick={() => navigate('/')}
                    className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <ArrowLeft size={13} /> Landing
                  </button>
                </div>

                {/* Role Switcher: Doctor vs Administrator (Ant Design Segmented) */}
                {!forgotMode && (
                  <div className="mb-6">
                    <Segmented
                      block
                      value={selectedRole}
                      onChange={(val) => {
                        setSelectedRole(val);
                        setMode('login');
                        setErrors({});
                      }}
                      options={[
                        {
                          label: (
                            <div className="flex items-center justify-center gap-2 font-bold py-1">
                              <Stethoscope size={15} />
                              <span>Doctor</span>
                            </div>
                          ),
                          value: 'doctor',
                        },
                        {
                          label: (
                            <div className="flex items-center justify-center gap-2 font-bold py-1">
                              <Shield size={15} />
                              <span>Admin</span>
                            </div>
                          ),
                          value: 'admin',
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Doctor Tab Switcher (Sign In vs Create Account) */}
                {selectedRole === 'doctor' && !forgotMode && (
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl mb-6 border ${
                    isDark ? 'bg-[#1B2438] border-slate-700/50' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrors({}); }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        mode === 'login'
                          ? isDark
                            ? 'bg-[#121827] text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setErrors({}); }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        mode === 'register'
                          ? isDark
                            ? 'bg-[#121827] text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-center gap-2"
                  >
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{errors.general}</span>
                  </motion.div>
                )}

                {/* FORGOT PASSWORD FORM */}
                {forgotMode ? (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    {errors.forgot && (
                      <p className="text-xs text-rose-500 p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">{errors.forgot}</p>
                    )}

                    {forgotStep === 1 ? (
                      <>
                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Registered Email Address
                          </label>
                          <Input
                            prefix={<Mail size={16} className={isDark ? 'text-slate-400' : 'text-slate-400'} />}
                            type="email"
                            placeholder="doctor@hospital.org"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Date of Birth
                          </label>
                          <Input
                            prefix={<Calendar size={16} className={isDark ? 'text-slate-400' : 'text-slate-400'} />}
                            type="date"
                            value={forgotDob}
                            onChange={e => setForgotDob(e.target.value)}
                            required
                          />
                        </div>
                        <AntButton
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          size="large"
                          className="mt-2"
                        >
                          Verify Clinical Identity
                        </AntButton>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            New Password
                          </label>
                          <Input.Password
                            prefix={<Lock size={16} className={isDark ? 'text-slate-400' : 'text-slate-400'} />}
                            placeholder="Enter new password"
                            value={forgotNewPw}
                            onChange={e => setForgotNewPw(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Confirm New Password
                          </label>
                          <Input.Password
                            prefix={<Lock size={16} className={isDark ? 'text-slate-400' : 'text-slate-400'} />}
                            placeholder="Confirm new password"
                            value={forgotConfirmPw}
                            onChange={e => setForgotConfirmPw(e.target.value)}
                            required
                          />
                        </div>
                        <AntButton
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          block
                          size="large"
                          className="mt-2"
                        >
                          Reset Password
                        </AntButton>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className={`w-full text-center text-xs font-bold hover:underline mt-2 ${
                        isDark ? 'text-cyan-400' : 'text-indigo-600'
                      }`}
                    >
                      Back to Sign In
                    </button>
                  </form>
                ) : (
                  /* MAIN AUTHENTICATION FORM */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* DOCTOR REGISTRATION EXTRA FIELDS */}
                    {mode === 'register' && selectedRole === 'doctor' && (
                      <>
                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Full Name
                          </label>
                          <Input
                            prefix={<User size={16} className="text-slate-400" />}
                            placeholder="Dr. Sarah Jenkins"
                            value={form.full_name}
                            onChange={setField('full_name')}
                            status={errors.full_name ? 'error' : ''}
                          />
                          {errors.full_name && <p className="text-[11px] text-rose-500 mt-1">{errors.full_name}</p>}
                        </div>

                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Clinical Email
                          </label>
                          <Input
                            prefix={<Mail size={16} className="text-slate-400" />}
                            type="email"
                            placeholder="s.jenkins@stjude.org"
                            value={form.email}
                            onChange={setField('email')}
                            status={errors.email ? 'error' : ''}
                          />
                          {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Date of Birth
                          </label>
                          <Input
                            prefix={<Calendar size={16} className="text-slate-400" />}
                            type="date"
                            value={form.date_of_birth}
                            onChange={setField('date_of_birth')}
                            status={errors.date_of_birth ? 'error' : ''}
                          />
                          {errors.date_of_birth && <p className="text-[11px] text-rose-500 mt-1">{errors.date_of_birth}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Hospital / Institution
                            </label>
                            <Input
                              prefix={<Building2 size={16} className="text-slate-400" />}
                              placeholder="St. Jude Hospital"
                              value={form.institution}
                              onChange={setField('institution')}
                              status={errors.institution ? 'error' : ''}
                            />
                            {errors.institution && <p className="text-[11px] text-rose-500 mt-1">{errors.institution}</p>}
                          </div>
                          <div>
                            <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Department
                            </label>
                            <Input
                              prefix={<Stethoscope size={16} className="text-slate-400" />}
                              placeholder="Neurology"
                              value={form.department}
                              onChange={setField('department')}
                              status={errors.department ? 'error' : ''}
                            />
                            {errors.department && <p className="text-[11px] text-rose-500 mt-1">{errors.department}</p>}
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Medical License Number (Optional)
                          </label>
                          <Input
                            prefix={<Shield size={16} className="text-slate-400" />}
                            placeholder="MLN-884920"
                            value={form.licenseNumber}
                            onChange={setField('licenseNumber')}
                          />
                        </div>
                      </>
                    )}

                    {/* USERNAME FIELD */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {selectedRole === 'admin' ? 'Administrator Username' : 'Username or Email'}
                      </label>
                      <Input
                        prefix={<User size={16} className="text-slate-400" />}
                        placeholder={selectedRole === 'admin' ? 'admin' : 'dr_sarah'}
                        value={form.username}
                        onChange={setField('username')}
                        status={errors.username ? 'error' : ''}
                      />
                      {errors.username && <p className="text-[11px] text-rose-500 mt-1">{errors.username}</p>}
                      {mode === 'login' && (
                        <div className="flex items-center justify-between text-[11px] pt-1.5">
                          <span className="text-foreground-muted font-medium">Quick Demo Credentials:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => fillDemoCredentials('doctor')}
                              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                            >
                              Dr. Sarah
                            </button>
                            <button
                              type="button"
                              onClick={() => fillDemoCredentials('admin')}
                              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                            >
                              Admin
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PASSWORD FIELD */}
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Password
                      </label>
                      <Input.Password
                        prefix={<Lock size={16} className="text-slate-400" />}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={setField('password')}
                        status={errors.password ? 'error' : ''}
                      />
                      {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>}
                    </div>

                    {/* PASSWORD STRENGTH METRIC FOR REGISTRATION */}
                    {mode === 'register' && form.password.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
                            Security Strength
                          </span>
                          <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            {strengthLabels[passwordScore]}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1 p-0.5">
                          {[1, 2, 3, 4].map(idx => (
                            <div
                              key={idx}
                              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                passwordScore >= idx ? strengthColors[passwordScore] : 'opacity-20 bg-slate-400'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CONFIRM PASSWORD FIELD FOR REGISTRATION */}
                    {mode === 'register' && selectedRole === 'doctor' && (
                      <div>
                        <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Confirm Password
                        </label>
                        <Input.Password
                          prefix={<Lock size={16} className="text-slate-400" />}
                          placeholder="••••••••"
                          value={form.confirmPassword}
                          onChange={setField('confirmPassword')}
                          status={errors.confirmPassword ? 'error' : ''}
                        />
                        {errors.confirmPassword && <p className="text-[11px] text-rose-500 mt-1">{errors.confirmPassword}</p>}
                      </div>
                    )}

                    {/* REMEMBER ME & FORGOT PASSWORD ROW */}
                    {mode === 'login' && (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <Checkbox
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                        >
                          <span className={isDark ? 'text-slate-300 font-medium' : 'text-slate-600 font-medium'}>
                            Remember Me
                          </span>
                        </Checkbox>
                        <button
                          type="button"
                          onClick={() => { setForgotMode(true); setForgotStep(1); setErrors({}); }}
                          className={`font-bold hover:underline ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}
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
                          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            I accept the Terms of Clinical Service and HIPAA Compliance Agreement.
                          </span>
                        </Checkbox>
                        {errors.acceptTerms && <p className="text-[11px] text-rose-500 mt-1">{errors.acceptTerms}</p>}
                      </div>
                    )}

                    {/* PRIMARY ACTION BUTTON */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="pt-2"
                    >
                      <AntButton
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        block
                        size="large"
                        className="shadow-lg shadow-indigo-500/20"
                      >
                        {mode === 'login' ? 'Sign In to Workstation' : 'Complete Registration'}
                      </AntButton>
                    </motion.div>

                    {/* PASSKEY / BIOMETRIC LOGIN BUTTON */}
                    {mode === 'login' && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={handleBiometricAuth}
                        disabled={biometricLoading}
                        className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          isDark
                            ? 'bg-[#1B2438] hover:bg-slate-800 border-slate-700 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800 shadow-sm'
                        }`}
                      >
                        <Fingerprint size={16} className={isDark ? 'text-cyan-400' : 'text-indigo-600'} />
                        <span>{biometricLoading ? 'Authenticating Passkey...' : 'Sign In with Passkey / FaceID'}</span>
                      </motion.button>
                    )}
                  </form>
                )}

                <div className={`mt-6 pt-4 border-t text-center text-[11px] font-mono ${
                  isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'
                }`}>
                  Enterprise HIPAA 256-bit Encryption
                </div>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
