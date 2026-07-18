import { useEffect, useState } from 'react';
import {
  EVENT_HOOK_TYPES,
  EVENT_SCOPES,
  describeCron,
  generateWebhookSecret,
} from '../../lib/flows/triggerCatalog';
import type { FlowSummary, FlowTriggerType } from '../../lib/api';
import { fetchCollections, type CollectionMeta } from '../../lib/api';
import { apiUrl } from '../../lib/apiBase';

const ITEM_EVENTS = ['create', 'update', 'delete'] as const;

interface FlowTriggerInspectorProps {
  flow: FlowSummary;
  onChange: (updates: Partial<FlowSummary>) => void;
}

export default function FlowTriggerInspector({ flow, onChange }: FlowTriggerInspectorProps) {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const options = flow.trigger_options ?? {};

  useEffect(() => {
    void fetchCollections().then(setCollections);
  }, []);

  const scopes = Array.isArray(options.scope)
    ? options.scope.map(String)
    : typeof options.scope === 'string'
      ? [options.scope]
      : [];

  const selectedCollections = Array.isArray(options.collections)
    ? options.collections.map(String)
    : [];

  function setOptions(next: Record<string, unknown>) {
    onChange({
      trigger_options: { ...options, ...next },
    });
  }

  function toggleScope(scope: string) {
    const next = scopes.includes(scope) ? scopes.filter((entry) => entry !== scope) : [...scopes, scope];
    setOptions({ scope: next });
  }

  function toggleEventCollection(collection: string) {
    const scopeKeys = ITEM_EVENTS.map((event) => `${collection}.${event}`);
    const isSelected = scopeKeys.every((key) => scopes.includes(key));
    const nextScopes = isSelected
      ? scopes.filter((entry) => !scopeKeys.includes(entry))
      : [...scopes, ...scopeKeys.filter((key) => !scopes.includes(key))];
    const nextCollections = isSelected
      ? selectedCollections.filter((entry) => entry !== collection)
      : selectedCollections.includes(collection)
        ? selectedCollections
        : [...selectedCollections, collection];
    setOptions({ scope: nextScopes, collections: nextCollections });
  }

  function toggleManualCollection(collection: string) {
    const next = selectedCollections.includes(collection)
      ? selectedCollections.filter((entry) => entry !== collection)
      : [...selectedCollections, collection];
    setOptions({ collections: next });
  }

  function isEventCollectionSelected(collection: string): boolean {
    return (
      selectedCollections.includes(collection) ||
      ITEM_EVENTS.every((event) => scopes.includes(`${collection}.${event}`))
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">Flow name</span>
        <input
          type="text"
          className="input"
          value={flow.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="label">Trigger type</span>
        <select
          className="input"
          value={flow.trigger_type}
          onChange={(e) =>
            onChange({
              trigger_type: e.target.value as FlowTriggerType,
              trigger_options: {},
            })
          }
        >
          <option value="event">Event Hook</option>
          <option value="webhook">Webhook</option>
          <option value="schedule">Schedule</option>
          <option value="manual">Manual</option>
          <option value="operation">Another Flow</option>
        </select>
      </label>

      <label className="block">
        <span className="label">Accountability</span>
        <select
          className="input"
          value={flow.accountability}
          onChange={(e) => onChange({ accountability: e.target.value })}
        >
          <option value="all">All (system access)</option>
          <option value="accountability">Use triggering user permissions</option>
          <option value="activity">Activity only</option>
        </select>
      </label>

      {flow.trigger_type === 'event' ? (
        <>
          <label className="block">
            <span className="label">Hook type</span>
            <select
              className="input"
              value={String(options.type ?? 'action')}
              onChange={(e) => setOptions({ type: e.target.value })}
            >
              {EVENT_HOOK_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="label">Scopes</span>
            <div className="mt-2 space-y-2">
              {EVENT_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Collections</span>
            <p className="mt-1 text-xs text-slate-500">
              Toggles create, update, and delete scopes for each collection.
            </p>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-surface-border p-2">
              {collections.map((collection) => (
                <label key={collection.collection} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isEventCollectionSelected(collection.collection)}
                    onChange={() => toggleEventCollection(collection.collection)}
                  />
                  <span>{collection.collection}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {flow.trigger_type === 'webhook' ? (
        <>
          <div className="block">
            <span className="label">Webhook URL</span>
            <p className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
              {apiUrl(`/flows/trigger/${flow.id}`)}
            </p>
          </div>
          <label className="block">
            <span className="label">Allowed methods</span>
            <input
              type="text"
              className="input font-mono text-xs"
              value={String(options.methods ?? 'GET,POST,PUT,PATCH,DELETE')}
              onChange={(e) => setOptions({ methods: e.target.value })}
              placeholder="GET,POST"
            />
          </label>
          <label className="block">
            <span className="label">Webhook secret</span>
            <div className="flex gap-2">
              <input
                type="text"
                className="input font-mono text-xs"
                value={String(options.secret ?? '')}
                onChange={(e) => setOptions({ secret: e.target.value })}
                placeholder="Bearer token or ?token= value"
              />
              <button
                type="button"
                className="btn-secondary whitespace-nowrap text-xs"
                onClick={() => setOptions({ secret: generateWebhookSecret() })}
              >
                Generate
              </button>
            </div>
          </label>
        </>
      ) : null}

      {flow.trigger_type === 'schedule' ? (
        <label className="block">
          <span className="label">Cron expression</span>
          <input
            type="text"
            className="input font-mono text-xs"
            value={String(options.cron ?? '0 * * * *')}
            onChange={(e) => setOptions({ cron: e.target.value })}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            {describeCron(String(options.cron ?? '0 * * * *'))}
          </p>
        </label>
      ) : null}

      {flow.trigger_type === 'manual' ? (
        <>
          <label className="block">
            <span className="label">Payload hint (JSON)</span>
            <textarea
              className="input min-h-[96px] font-mono text-xs"
              value={String(options.payloadHint ?? '{\n  "source": "admin-ui"\n}')}
              onChange={(e) => setOptions({ payloadHint: e.target.value })}
            />
          </label>
          <div>
            <span className="label">Collections (optional filter)</span>
            <p className="mt-1 text-xs text-slate-500">
              When set, the flow only runs for payloads that include one of these collections.
            </p>
            <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-surface-border p-2">
              {collections.map((collection) => (
                <label key={collection.collection} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.collection)}
                    onChange={() => toggleManualCollection(collection.collection)}
                  />
                  <span>{collection.collection}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {flow.trigger_type === 'operation' ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          This flow is invoked by another flow&apos;s Trigger Flow operation.
        </p>
      ) : null}
    </div>
  );
}
