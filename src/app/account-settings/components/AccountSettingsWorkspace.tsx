'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Palette,
  Shield,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Globe,
  Clock,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  icon: 'desktop' | 'mobile' | 'globe';
}

const mockSessions: Session[] = [
  { id: '1', device: 'Chrome on macOS', location: 'San Francisco, US', lastActive: 'Now', current: true, icon: 'desktop' },
  { id: '2', device: 'Safari on iPhone', location: 'San Francisco, US', lastActive: '2 hours ago', current: false, icon: 'mobile' },
  { id: '3', device: 'Firefox on Windows', location: 'New York, US', lastActive: '3 days ago', current: false, icon: 'globe' },
];

type AlertType = { type: 'success' | 'error'; message: string } | null;

export default function AccountSettingsWorkspace() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const supabase = createClient();

  // Profile state
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileAlert, setProfileAlert] = useState<AlertType>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState('');
  const [emailAlert, setEmailAlert] = useState<AlertType>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState<AlertType>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [sessionAlert, setSessionAlert] = useState<AlertType>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setDisplayName(user.user_metadata?.display_name || '');
      setBio(user.user_metadata?.bio || '');
    }
  }, [user]);

  const showAlert = (setter: (v: AlertType) => void, type: 'success' | 'error', message: string) => {
    setter({ type, message });
    setTimeout(() => setter(null), 4000);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName, display_name: displayName, bio },
      });
      if (error) throw error;
      showAlert(setProfileAlert, 'success', 'Profile updated successfully.');
    } catch (err: any) {
      showAlert(setProfileAlert, 'error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return showAlert(setEmailAlert, 'error', 'Please enter a new email address.');
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      showAlert(setEmailAlert, 'success', 'Confirmation sent to your new email address.');
      setNewEmail('');
    } catch (err: any) {
      showAlert(setEmailAlert, 'error', err.message || 'Failed to update email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return showAlert(setPasswordAlert, 'error', 'Please enter a new password.');
    if (newPassword.length < 8) return showAlert(setPasswordAlert, 'error', 'Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return showAlert(setPasswordAlert, 'error', 'Passwords do not match.');
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showAlert(setPasswordAlert, 'success', 'Password updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      showAlert(setPasswordAlert, 'error', err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    showAlert(setSessionAlert, 'success', 'Session revoked successfully.');
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      showAlert(setSessionAlert, 'success', 'Signed out from all devices.');
    } catch {
      showAlert(setSessionAlert, 'error', 'Failed to sign out all sessions.');
    }
  };

  const userInitial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase();
  const userEmail = user?.email || '';

  const SessionIcon = ({ icon }: { icon: Session['icon'] }) => {
    if (icon === 'mobile') return <Smartphone size={15} className="text-zinc-400" />;
    if (icon === 'globe') return <Globe size={15} className="text-zinc-400" />;
    return <Monitor size={15} className="text-zinc-400" />;
  };

  return (
    <div className="flex flex-col h-full stone-editor-bg overflow-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/60 travertine-panel">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <User size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-700 text-zinc-100">Account Settings</h1>
            <p className="text-xs text-zinc-500">Manage your profile, security, and preferences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Profile Info */}
          <Section icon={<User size={15} className="text-violet-400" />} title="Profile Information" subtitle="Update your public profile details">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl font-700 text-white flex-shrink-0">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-600 text-zinc-200">{userEmail}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Avatar generated from your initials</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="settings-input"
                />
              </Field>
              <Field label="Display Name">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you appear to others"
                  className="settings-input"
                />
              </Field>
            </div>
            <Field label="Bio" className="mt-4">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio about yourself..."
                rows={3}
                className="settings-input resize-none"
              />
            </Field>
            <AlertBanner alert={profileAlert} />
            <div className="flex justify-end mt-4">
              <SaveButton loading={savingProfile} onClick={handleSaveProfile} label="Save Profile" />
            </div>
          </Section>

          {/* Email Update */}
          <Section icon={<Mail size={15} className="text-fuchsia-400" />} title="Email Address" subtitle="Change the email associated with your account">
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-xs text-zinc-500">Current email</p>
              <p className="text-sm font-500 text-zinc-200 mt-0.5">{userEmail || '—'}</p>
            </div>
            <Field label="New Email Address">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="settings-input"
              />
            </Field>
            <p className="text-xs text-zinc-600 mt-2">A confirmation link will be sent to your new address.</p>
            <AlertBanner alert={emailAlert} />
            <div className="flex justify-end mt-4">
              <SaveButton loading={savingEmail} onClick={handleUpdateEmail} label="Update Email" />
            </div>
          </Section>

          {/* Password Update */}
          <Section icon={<Lock size={15} className="text-amber-400" />} title="Password" subtitle="Keep your account secure with a strong password">
            <div className="space-y-4">
              <Field label="Current Password">
                <PasswordInput value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} placeholder="Enter current password" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="New Password">
                  <PasswordInput value={newPassword} onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="Min. 8 characters" />
                </Field>
                <Field label="Confirm New Password">
                  <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Repeat new password" />
                </Field>
              </div>
              {newPassword && (
                <PasswordStrength password={newPassword} />
              )}
            </div>
            <AlertBanner alert={passwordAlert} />
            <div className="flex justify-end mt-4">
              <SaveButton loading={savingPassword} onClick={handleUpdatePassword} label="Update Password" />
            </div>
          </Section>

          {/* Theme Preference */}
          <Section icon={<Palette size={15} className="text-pink-400" />} title="Theme Preference" subtitle="Choose your visual experience">
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'dark', label: 'Roman Marble', sublabel: 'Dark mode', icon: Moon },
                { value: 'light', label: 'Warm Cream', sublabel: 'Light mode', icon: Sun },
                { value: 'system', label: 'System', sublabel: 'Auto-detect', icon: Monitor },
              ].map(({ value, label, sublabel, icon: Icon }) => {
                const active = value === 'system' ? false : theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => {
                      if (value !== 'system' && theme !== value) toggleTheme();
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 roman-btn
                      ${active
                        ? 'bg-violet-600/15 border-violet-500/40 text-violet-300'
                        : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                  >
                    <Icon size={20} />
                    <div className="text-center">
                      <p className="text-xs font-600">{label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{sublabel}</p>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Session Management */}
          <Section icon={<Shield size={15} className="text-emerald-400" />} title="Active Sessions" subtitle="Manage devices currently signed in to your account">
            <div className="space-y-2 mb-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all
                    ${session.current
                      ? 'bg-emerald-500/5 border-emerald-500/20' :'bg-zinc-800/30 border-zinc-700/40'
                    }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0">
                    <SessionIcon icon={session.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-500 text-zinc-200 truncate">{session.device}</p>
                      {session.current && (
                        <span className="px-1.5 py-0.5 text-[10px] font-600 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-zinc-500">{session.location}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock size={10} />
                        {session.lastActive}
                      </span>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                      title="Revoke session"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <AlertBanner alert={sessionAlert} />
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <p className="text-xs text-zinc-600">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
              <button
                onClick={handleSignOutAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-500 text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all duration-150"
              >
                <LogOut size={12} />
                Sign out all devices
              </button>
            </div>
          </Section>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-400" />
              <h3 className="text-sm font-600 text-red-400">Danger Zone</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-600 text-red-400 border border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50 transition-all duration-150">
              <Trash2 size={13} />
              Delete Account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="stone-card rounded-xl border border-zinc-800/60 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-600 text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-500 text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string;
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="settings-input pr-9"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ chars', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Symbol', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-zinc-700'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span key={c.label} className={`text-[10px] font-500 ${c.pass ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && <span className={`text-[10px] font-600 ${colors[score - 1].replace('bg-', 'text-')}`}>{labels[score - 1]}</span>}
      </div>
    </div>
  );
}

function AlertBanner({ alert }: { alert: AlertType }) {
  if (!alert) return null;
  return (
    <div className={`flex items-center gap-2 mt-3 px-3 py-2.5 rounded-lg text-xs font-500 border
      ${alert.type === 'success' ?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
      {alert.type === 'success' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
      {alert.message}
    </div>
  );
}

function SaveButton({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-600 bg-violet-600 hover:bg-violet-500 text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed roman-btn"
    >
      <Save size={13} />
      {loading ? 'Saving…' : label}
    </button>
  );
}
