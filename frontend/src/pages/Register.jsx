import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = 'Must contain uppercase, lowercase, and number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      setEmail(form.email);
      setStep('otp');
      toast.success('Verification code sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
      navigate('/dashboard');
      toast.success('Welcome!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <OtpStep
        email={email}
        otp={otp}
        onChange={handleOtpChange}
        onKeyDown={handleOtpKeyDown}
        onPaste={handleOtpPaste}
      />
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-1 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        <div className="relative z-10 p-12 max-w-md">
          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-text-primary mb-4 leading-tight">
              Your files.<br />
              <span className="text-gradient">Always with you.</span>
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed">
              Store, access, and share your files securely from anywhere. 5GB of free storage to get started.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: '🔐', text: 'End-to-end encrypted storage' },
              { icon: '⚡', text: 'Lightning fast uploads & downloads' },
              { icon: '📂', text: 'Smart file organization' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-text-secondary text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up relative">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 rounded-lg bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-all"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-xl text-text-primary">FileVault</span>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary mb-8">Get 5GB free storage. No credit card required.</p>

          {/* Google */}
          <div className="mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google login failed')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="100%"
              text="signup_with"
            />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-sm">or register with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className={`input-field pl-10 ${errors.name ? 'border-danger' : ''}`}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  className={`input-field pl-10 ${errors.email ? 'border-danger' : ''}`}
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input-field pl-10 pr-12 ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Min 8 chars, A-Z, 0-9"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? 'Sending code...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── OTP Step Component ───────────────────────────────────────────────────────
const OtpStep = ({ email, otp, onChange, onKeyDown, onPaste }) => {
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  React.useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Please enter all 6 digits');
    setLoading(true);
    try {
      await verifyOTP(email, code);
      toast.success('Email verified! Welcome to FileVault 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOTP(email);
      setCountdown(60);
      toast.success('New code sent!');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-all"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md animate-fade-up text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto mb-6">
          <Mail size={28} className="text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-3">Check your email</h1>
        <p className="text-text-secondary mb-2">We sent a 6-digit code to</p>
        <p className="font-semibold text-text-primary mb-8">{email}</p>

        {/* OTP inputs */}
        <div className="flex gap-3 justify-center mb-8" onPaste={onPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className={`w-12 h-14 text-center text-xl font-bold font-mono bg-surface-2 border rounded-xl
                          transition-all duration-200 outline-none text-text-primary
                          ${digit ? 'border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.15)]' : 'border-border'}
                          focus:border-accent focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]`}
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="btn-primary w-full justify-center mb-4"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>

        <button
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors disabled:cursor-not-allowed"
        >
          {countdown > 0 ? (
            <span>Resend code in <span className="text-accent font-mono">{countdown}s</span></span>
          ) : resending ? (
            'Sending...'
          ) : (
            <span className="text-accent hover:text-accent-light">Resend code</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Register;
