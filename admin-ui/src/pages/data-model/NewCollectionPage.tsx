import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import IconPicker from '../../components/data-model/IconPicker';
import Icon from '../../components/Icon';
import { createCollection } from '../../lib/api';

export default function NewCollectionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parent = searchParams.get('parent');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [singleton, setSingleton] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [icon, setIcon] = useState('article');
  const [color, setColor] = useState('#6366f1');
  const [primaryKey, setPrimaryKey] = useState<'uuid' | 'integer'>('uuid');
  const [optStatus, setOptStatus] = useState(true);
  const [optSort, setOptSort] = useState(false);
  const [optAccountability, setOptAccountability] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 1 && !isGroup) {
      setStep(2);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await createCollection(
        isGroup
          ? {
              collection: name.trim(),
              parent,
              is_group: true,
              icon,
              color,
            }
          : {
              collection: name.trim(),
              parent,
              singleton,
              icon,
              color,
              primary_key_type: primaryKey,
              optional_system_fields: {
                status: optStatus,
                sort: optSort,
                accountability: optAccountability,
              },
            },
      );
      navigate(`/settings/data-model/${created.collection}`);
    } catch {
      setError('Failed to create collection');
      setIsSaving(false);
    }
  }

  return (
    <AppLayout title="New Collection" subtitle="Define structure and system fields">
      <div className="max-w-2xl space-y-5">
        <Link to={parent ? `/settings/data-model/${parent}` : '/settings/data-model'} className="back-link">
          <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
          Back to collections
        </Link>

        <div className="flex gap-2">
          <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${step === 1 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
            1. Setup
          </span>
          {!isGroup && (
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${step === 2 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
              2. System fields
            </span>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="form-card">
          {step === 1 ? (
            <div className="form-section space-y-4">
              {parent && (
                <p className="alert-info">
                  Creating a sub-collection under <span className="font-mono font-semibold">{parent}</span>
                </p>
              )}
              <div>
                <label className="label">Collection name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  pattern="[a-z][a-z0-9_]*"
                  required
                  className="input font-mono"
                  placeholder="my_collection"
                />
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-surface-border p-4 cursor-pointer hover:border-brand-200 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/30">
                <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Group collection</p>
                  <p className="text-xs text-slate-500">Contains sub-collections only, no items</p>
                </div>
              </label>
              {!isGroup && (
                <>
                  <div>
                    <label className="label">Primary key</label>
                    <select value={primaryKey} onChange={(e) => setPrimaryKey(e.target.value as 'uuid' | 'integer')} className="select">
                      <option value="uuid">UUID</option>
                      <option value="integer">Auto-increment integer</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-surface-border p-4 cursor-pointer hover:border-brand-200 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/30">
                    <input type="checkbox" checked={singleton} onChange={(e) => setSingleton(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Singleton</p>
                      <p className="text-xs text-slate-500">Only one item allowed in this collection</p>
                    </div>
                  </label>
                </>
              )}
              <div>
                <label className="label">Icon</label>
                <IconPicker value={icon} onChange={setIcon} />
              </div>
              <div>
                <label className="label">Brand color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 rounded-xl border border-surface-border cursor-pointer" />
                  <span className="text-sm font-mono text-slate-500">{color}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-section space-y-3">
              <p className="section-subtitle mb-2">Optional system fields (Directus-style)</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={optStatus} onChange={(e) => setOptStatus(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Status (draft / published / archived)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={optSort} onChange={(e) => setOptSort(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Manual sort field
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={optAccountability} onChange={(e) => setOptAccountability(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Accountability (created / updated by & at)
              </label>
            </div>
          )}

          {error && <div className="alert-error">{error}</div>}

          <div className="flex gap-2 pt-2 border-t border-surface-border">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
            )}
            <button type="submit" disabled={isSaving} className="btn-primary">
              {step === 1 && !isGroup ? 'Continue' : isSaving ? 'Creating...' : 'Create collection'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
