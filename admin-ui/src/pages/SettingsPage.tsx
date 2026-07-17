import { FormEvent, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import LogoUploadField from '../components/LogoUploadField';
import ThemePicker from '../components/ThemePicker';
import { useSettingsStore } from '../stores/settingsStore';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    settings.updateSettings({
      projectName: String(form.get('projectName') ?? ''),
      adminLogoLink: String(form.get('adminLogoLink') ?? '').trim(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppLayout title="Project Settings" subtitle="Admin appearance and branding">
      <div className="max-w-3xl space-y-6">
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
            <LogoUploadField />
            <div>
              <label htmlFor="adminLogoLink" className="label">Logo link</label>
              <input
                id="adminLogoLink"
                name="adminLogoLink"
                type="text"
                defaultValue={settings.adminLogoLink}
                placeholder="https://example.com"
                className="input"
              />
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                Clicking the CMS sidebar logo opens this URL. Use a full link (https://…) or an in-app path (/).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
            <button type="submit" className="btn-primary">Save settings</button>
            {saved && <span className="alert-success py-1.5 px-3 text-xs">Settings saved</span>}
          </div>
        </form>

        <section className="form-card">
          <div className="form-section space-y-4">
            <h2 className="form-section-title">
              <Icon name="palette" className="h-4 w-4 text-slate-400" />
              Appearance
            </h2>
            <p className="text-sm text-[var(--app-text-muted)]">
              Choose a theme for the admin panel. Website preview always uses the Liberty brand styling and is not affected by this setting.
            </p>
            <ThemePicker />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
