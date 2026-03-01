import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Star, Trash2, LogOut, Settings as SettingsIcon,
  UploadCloud, FolderOpen, Clock, Sun, Moon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import StorageBar from '../ui/StorageBar';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'All Files', end: true },
  { to: '/dashboard/starred', icon: Star, label: 'Starred' },
  { to: '/dashboard/recent', icon: Clock, label: 'Recent' },
  { to: '/dashboard/trash', icon: Trash2, label: 'Trash' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const Sidebar = ({ onUploadClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col bg-surface-1 border-r border-border">
      {/* Logo */}
      <div className="p-5 border-b border-border flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <UploadCloud size={16} className="text-white" />
        </div>
        <span className="font-bold text-lg text-text-primary tracking-tight">FileVault</span>
      </div>

      {/* Upload button */}
      <div className="p-4 border-b border-border">
        <button onClick={onUploadClick} className="btn-primary w-full justify-center text-sm">
          <UploadCloud size={15} />
          Upload Files
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="p-3 border-b border-border">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-150"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Storage + User */}
      <div className="p-4 border-t border-border space-y-4">
        {user && (
          <StorageBar used={user.storageUsed || 0} limit={user.storageLimit || 5368709120} />
        )}

        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-medium truncate">{user?.name}</p>
            <p className="text-text-muted text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
