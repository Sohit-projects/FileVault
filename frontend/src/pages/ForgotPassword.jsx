import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, Sun, Moon, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (step === 'reset') {
      const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [step]);

  const validateEmail = () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email');
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    const e = {};
    if (form.newPassword.length < 8) e.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword))
      e.password = 'Must contain uppercase, lowercase, and number';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep('reset');
      toast.success('Reset code sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp: otpCode, newPassword: form.newPassword });
      toast.success('Password reset successful! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setCountdown(60);
      toast.success('New code sent!');
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-1 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
        <div className="absolute top-1/4 -left-16 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 p-12 max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(239,68,68,0.4)]">
            <KeyRound size={36} className="text-white" />
          </div>
          <h2 className="text-5xl font-bold text-text-primary mb-4">Reset Password</h2>
          <p className="text-text-secondary text-lg">No worries, we'll help you get back in.</p>
        </div>
      </div>

      {/* Right panel */}
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

          {/* Back button */}
          <button
            onClick={() => step === 'reset' ? setStep('email') : navigate('/login')}
            className="flex items-center gap-2 text-text-muted hover:text-text-secondary transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back</span>
          </button>

          {step === 'email' ? (
            <EmailStep
              email={email}
              setEmail={setEmail}
              loading={loading}
              onSubmit={handleSendOTP}
            />
          ) : (
            <ResetStep
              email={email}
              otp={otp}
              form={form}
              errors={errors}
              countdown={countdown}
              loading={loading}
              showPass={showPass}
              showConfirmPass={showConfirmPass}
              setForm={setForm}
              setShowPass={setShowPass}
              setShowConfirmPass={setShowConfirmPass}
              onOtpChange={handleOtpChange}
              onOtpKeyDown={handleOtpKeyDown}
              onOtpPaste={handleOtpPaste}
              onSubmit={handleResetPassword}
              onResend={handleResend}
            />
          )}

          <p className="text-center text-text-muted text-sm mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-accent hover:text-accent-light font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Email Step Component ───────────────────────────────────────────────────────
const EmailStep = ({ email, setEmail, loading, onSubmit }) => (
  <>
    <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
      <Mail size={28} className="text-red-500" />
    </div>
    <h1 className="text-3xl font-bold text-text-primary mb-2">Forgot Password?</h1>
    <p className="text-text-secondary mb-8">Enter your email and we'll send you a reset code.</p>

    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
        <div className="relative">
          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="email"
            className="input-field pl-10"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2 bg-red-500 hover:bg-red-600">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        {loading ? 'Sending...' : 'Send Reset Code'}
      </button>
    </form>
  </>
);

// ─── Reset Step Component ───────────────────────────────────────────────────────
const ResetStep = ({
  email,
  otp,
  form,
  errors,
  countdown,
  loading,
  showPass,
  showConfirmPass,
  setForm,
  setShowPass,
  setShowConfirmPass,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
  onSubmit,
  onResend,
}) => (
  <>
    <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mx-auto mb-6">
      <KeyRound size={28} className="text-red-500" />
    </div>
    <h1 className="text-3xl font-bold text-text-primary mb-2">Enter Reset Code</h1>
    <p className="text-text-secondary mb-2">We sent a code to</p>
    <p className="font-semibold text-text-primary mb-8">{email}</p>

    {/* OTP inputs */}
    <div className="flex gap-3 justify-center mb-6" onPaste={onOtpPaste}>
      {otp.map((digit, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => onOtpChange(i, e.target.value)}
          onKeyDown={(e) => onOtpKeyDown(i, e)}
          className={`w-12 h-14 text-center text-xl font-bold font-mono bg-surface-2 border rounded-xl
                      transition-all duration-200 outline-none text-text-primary
                      ${digit ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' : 'border-border'}
                      focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]`}
        />
      ))}
    </div>

    <button
      onClick={onResend}
      disabled={countdown > 0 || loading}
      className="text-sm text-text-muted hover:text-text-secondary transition-colors disabled:cursor-not-allowed mb-6 block mx-auto"
    >
      {countdown > 0 ? (
        <span>Resend code in <span className="text-red-500 font-mono">{countdown}s</span></span>
      ) : loading ? (
        'Sending...'
      ) : (
        <span className="text-red-500 hover:text-red-400">Resend code</span>
      )}
    </button>

    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type={showPass ? 'text' : 'password'}
            className={`input-field pl-10 pr-12 ${errors.password ? 'border-red-500' : ''}`}
            placeholder="Min 8 chars, A-Z, 0-9"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
        <div className="relative">
          <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type={showConfirmPass ? 'text' : 'password'}
            className={`input-field pl-10 pr-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPass(!showConfirmPass)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2 bg-red-500 hover:bg-red-600">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  </>
);

export default ForgotPassword;
