import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Loader2, Save, User, Mail, AlertTriangle, Edit2, Check, X, Camera, Upload, Trash2, MoreVertical, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings = () => {
  const { user, refetchUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef(null);

  // Sync name state when user data changes
  useEffect(() => {
    setName(user?.name || '');
  }, [user]);

  // Close avatar menu when clicking outside
  const avatarMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
    };
    if (showAvatarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAvatarMenu]);

  const validate = () => {
    const e = {};
    if (!form.currentPassword) e.currentPassword = 'Current password is required';
    if (form.newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword))
      e.newPassword = 'Must contain uppercase, lowercase, and number';
    if (form.newPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.currentPassword === form.newPassword) e.newPassword = 'New password must be different';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDeleteAvatar = async () => {
    if (!user?.avatar || user.avatar.includes('googleusercontent.com')) return;
    
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    
    setDeletingAvatar(true);
    try {
      await api.delete('/auth/avatar');
      await refetchUser();
      toast.success('Avatar removed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove avatar');
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, and WebP images are allowed');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetchUser();
      toast.success('Avatar updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    setNameLoading(true);
    try {
      const { data } = await api.put('/auth/profile', { name: name.trim() });
      await refetchUser();
      toast.success('Name updated successfully!');
      setEditingName(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update name');
    } finally {
      setNameLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed! Please log in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const isGoogleUser = user?.authProvider === 'google';

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors mb-4"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back to Dashboard</span>
      </button>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      {/* Profile Section */}
      <div className="bg-surface-1 border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <User size={18} className="text-accent" />
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative" ref={avatarMenuRef}>
            <div 
              className={`relative ${!isGoogleUser ? 'group cursor-pointer' : ''}`}
              onClick={() => !isGoogleUser && setShowAvatarMenu(!showAvatarMenu)}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-2xl font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              )}
              {!isGoogleUser && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              )}
            </div>

            {/* Avatar Menu Dropdown */}
            {!isGoogleUser && showAvatarMenu && (
              <div className="absolute left-0 mt-2 w-40 bg-surface-2 border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    handleAvatarChange(e);
                    setShowAvatarMenu(false);
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-3 transition-colors disabled:opacity-50"
                >
                  {avatarLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Upload New
                </button>
                {user?.avatar && !user.avatar.includes('googleusercontent.com') && (
                  <button
                    onClick={() => {
                      handleDeleteAvatar();
                      setShowAvatarMenu(false);
                    }}
                    disabled={deletingAvatar}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-surface-3 transition-colors disabled:opacity-50"
                  >
                    {deletingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field flex-1 max-w-xs"
                  placeholder="Your name"
                  maxLength={50}
                />
                <button
                  onClick={handleUpdateName}
                  disabled={nameLoading || name.trim() === user?.name}
                  className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                >
                  {nameLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  onClick={() => { setName(user?.name || ''); setEditingName(false); }}
                  className="p-2 bg-surface-2 text-text-muted rounded-lg hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-text-primary font-semibold text-lg">{user?.name}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 text-text-muted hover:text-accent transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <p className="text-text-muted text-sm flex items-center gap-1 mt-1">
              <Mail size={12} /> {user?.email}
            </p>
            <p className="text-text-muted text-xs mt-1 capitalize">
              Signed in with {user?.authProvider === 'google' ? 'Google' : 'Email'}
            </p>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-surface-1 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lock size={18} className="text-accent" />
          Change Password
        </h2>

        {isGoogleUser ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-500 font-medium text-sm">Google Account</p>
              <p className="text-text-muted text-sm mt-1">
                You're signed in with Google. Password management is handled by Google.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass.current ? 'text' : 'password'}
                  className={`input-field pl-10 pr-12 ${errors.currentPassword ? 'border-danger' : ''}`}
                  placeholder="Enter current password"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.currentPassword && <p className="text-danger text-xs mt-1">{errors.currentPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass.new ? 'text' : 'password'}
                  className={`input-field pl-10 pr-12 ${errors.newPassword ? 'border-danger' : ''}`}
                  placeholder="Min 8 chars, A-Z, 0-9"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-danger text-xs mt-1">{errors.newPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass.confirm ? 'text' : 'password'}
                  className={`input-field pl-10 pr-12 ${errors.confirmPassword ? 'border-danger' : ''}`}
                  placeholder="Confirm new password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <div className="bg-surface-2 border border-border rounded-xl p-3 mt-4">
              <p className="text-text-muted text-xs">
                <strong className="text-text-secondary">Note:</strong> After changing your password, you'll be logged out and need to log in again.
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-4">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
