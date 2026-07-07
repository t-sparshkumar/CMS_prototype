import { FormEvent, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { useSettingsStore } from '../stores/settingsStore';

const TIMEZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    settings.updateSettings({
      projectName: String(form.get('projectName') ?? ''),
      logoUrl: String(form.get('logoUrl') ?? ''),
      defaultLanguage: String(form.get('defaultLanguage') ?? 'en'),
      timezone: String(form.get('timezone') ?? 'UTC'),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppLayout title="Project Settings" subtitle="Branding, locale, and regional defaults">
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-section space-y-4">
            <h2 className="form-section-title">
              <Icon name="settings" className="h-4 w-4 text-slate-400" />
              General
            </h2>
            <div>
              <label htmlFor="projectName" className="label">Project name</label>
              <input id="projectName" name="projectName" defaultValue={settings.projectName} className="input" required />
            </div>
            <div>
              <label htmlFor="logoUrl" className="label">Logo URL</label>
              <input id="logoUrl" name="logoUrl" type="text" defaultValue={settings.logoUrl} placeholder="/paytm-logo.png" className="input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="defaultLanguage" className="label">Default language</label>
                <select id="defaultLanguage" name="defaultLanguage" defaultValue={settings.defaultLanguage} className="select">
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="timezone" className="label">Timezone</label>
                <select id="timezone" name="timezone" defaultValue={settings.timezone} className="select">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
            <button type="submit" className="btn-primary">Save settings</button>
            {saved && <span className="alert-success py-1.5 px-3 text-xs">Settings saved</span>}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
