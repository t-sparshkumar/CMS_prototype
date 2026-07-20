import { FormEvent, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';

const DEMO_EMAIL = 'admin@example.com';
const DEMO_PASSWORD = 'admin';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const projectName = useSettingsStore((s) => s.projectName);

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && !err.response) {
        setError('Cannot reach the API. Check BACKEND_URL on Vercel and ADMIN_UI_URL on Railway.');
        return;
      }
      if (axios.isAxiosError(err)) {
        const apiMessage = (err.response?.data as { errors?: Array<{ message?: string }> })?.errors?.[0]
          ?.message;
        setError(apiMessage ?? 'Invalid email or password');
        return;
      }
      setError('Invalid email or password');
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-[#0c0e14]">
        <div className="absolute inset-0 bg-mesh-auth opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwaDEwdjEwSDMweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <BrandLogo size="lg" />
          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-tight text-white mb-4 tracking-tight">
              Manage content at scale.
            </h2>
            <p className="text-lg leading-relaxed text-slate-400">
              {projectName} — pages, components, assets, and a powerful data model in one workspace.
            </p>
          </div>
          <div className="flex gap-10">
            {[
              { value: 'Pages', label: 'Visual builder' },
              { value: 'Assets', label: 'Media gallery' },
              { value: 'Roles', label: 'Access control' },
            ].map((item) => (
              <div key={item.value}>
                <p className="text-xl font-bold text-white">{item.value}</p>
                <p className="text-sm text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface-subtle bg-mesh-light px-6 py-12">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="panel p-8 shadow-elevated">
            <div className="mb-8 lg:hidden">
              <BrandLogo size="lg" onLight className="mb-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-sm text-slate-500 mb-8">Sign in to your {projectName} account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full btn-primary py-3">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} {projectName}
          </p>
        </div>
      </div>
    </div>
  );
}
