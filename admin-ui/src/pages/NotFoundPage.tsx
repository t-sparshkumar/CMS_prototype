import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon name="layout" className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you requested does not exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
