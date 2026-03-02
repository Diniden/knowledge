import { useState, useCallback } from 'react';
import { AppLayout } from '../../components/layout/AppLayout.js';
import { ProfileSettings } from './ProfileSettings.js';
import { AppearanceSettings } from './AppearanceSettings.js';
import { EditorSettings } from './EditorSettings.js';
import { KeyboardShortcuts } from './KeyboardShortcuts.js';
import { AboutSettings } from './AboutSettings.js';
import './SettingsPage.scss';

interface SettingsTab {
  id: string;
  label: string;
  icon?: string;
}

const TABS: SettingsTab[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'editor', label: 'Editor', icon: '✏️' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const MOCK_USER = {
  displayName: 'Alice Johnson',
  email: 'alice@example.com',
};

const STORAGE_KEY = 'kg_settings';

function loadSettings(): { theme: 'light' | 'dark'; fontSize: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { theme?: string; fontSize?: number };
      return {
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 16,
      };
    }
  } catch {
    // fall through
  }
  return { theme: 'light', fontSize: 16 };
}

function saveSettings(settings: { theme: string; fontSize: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(loadSettings);

  const handleThemeChange = useCallback((theme: 'light' | 'dark') => {
    setSettings((prev) => {
      const next = { ...prev, theme };
      saveSettings(next);
      document.documentElement.classList.toggle('dark-theme', theme === 'dark');
      return next;
    });
  }, []);

  const handleFontSizeChange = useCallback((fontSize: number) => {
    setSettings((prev) => {
      const next = { ...prev, fontSize };
      saveSettings(next);
      return next;
    });
  }, []);

  const handleProfileUpdate = useCallback(
    (_updates: Partial<{ displayName: string }>) => {
      // Placeholder: would persist to API
    },
    [],
  );

  const tabTitles: Record<string, string> = {
    profile: 'Profile',
    appearance: 'Appearance',
    editor: 'Editor',
    shortcuts: 'Keyboard Shortcuts',
    about: 'About',
  };

  return (
    <AppLayout>
      <div className="SettingsPage">
        <div className="SettingsPage__sidebar">
          <h1 className="SettingsPage__title">Settings</h1>
          <nav className="SettingsPage__tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`SettingsPage__tab${activeTab === tab.id ? ' SettingsPage__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon && (
                  <span className="SettingsPage__tabIcon">{tab.icon}</span>
                )}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="SettingsPage__content">
          <h2 className="SettingsPage__contentTitle">
            {tabTitles[activeTab] ?? activeTab}
          </h2>

          {activeTab === 'profile' && (
            <ProfileSettings user={MOCK_USER} onUpdate={handleProfileUpdate} />
          )}
          {activeTab === 'appearance' && (
            <AppearanceSettings
              theme={settings.theme}
              fontSize={settings.fontSize}
              onThemeChange={handleThemeChange}
              onFontSizeChange={handleFontSizeChange}
            />
          )}
          {activeTab === 'editor' && <EditorSettings />}
          {activeTab === 'shortcuts' && <KeyboardShortcuts />}
          {activeTab === 'about' && <AboutSettings />}
        </div>
      </div>
    </AppLayout>
  );
}
