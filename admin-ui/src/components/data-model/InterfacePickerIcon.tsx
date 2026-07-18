import type { ReactNode } from 'react';
import type { InterfaceIconId } from '../../lib/interfaceCatalog';

interface InterfacePickerIconProps {
  icon: InterfaceIconId;
  className?: string;
}

function Box({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`interface-preview-frame ${className}`} style={style}>
      {children}
    </div>
  );
}

function Line({
  w = 'w-full',
  h = 'h-1.5',
  muted = false,
  accent = false,
}: {
  w?: string;
  h?: string;
  muted?: boolean;
  accent?: boolean;
}) {
  const tone = accent
    ? 'interface-preview-line-accent'
    : muted
      ? 'interface-preview-line-muted'
      : 'interface-preview-line';
  return <div className={`${w} ${h} rounded-full ${tone}`} />;
}

function Dot({ className = '' }: { className?: string }) {
  return <div className={`interface-preview-dot ${className}`} />;
}

export default function InterfacePickerIcon({ icon, className = 'h-16 w-full max-w-[7.5rem]' }: InterfacePickerIconProps) {
  const content = (() => {
    switch (icon) {
      case 'input':
        return (
          <Box>
            <div className="interface-preview-input-row">
              <Line w="flex-1" h="h-1" muted />
              <div className="interface-preview-input-caret" aria-hidden="true" />
            </div>
          </Box>
        );
      case 'autocomplete':
        return (
          <Box>
            <div className="interface-preview-input-row">
              <Line w="flex-1" h="h-1" />
              <div className="interface-preview-input-caret" aria-hidden="true" />
            </div>
            <div className="mt-1.5 space-y-1 rounded border border-[color-mix(in_srgb,var(--app-accent)_20%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-accent)_6%,var(--app-surface))] p-1">
              <Line w="w-4/5" h="h-1" muted />
              <Line w="w-3/5" h="h-1" muted />
            </div>
          </Box>
        );
      case 'block-editor':
        return (
          <Box className="space-y-1">
            <Line w="w-2/3" />
            <div className="rounded border border-dashed border-[color-mix(in_srgb,var(--app-accent)_35%,var(--app-border))] p-1">
              <Line w="w-full" h="h-1" accent />
            </div>
            <Line w="w-1/2" muted />
          </Box>
        );
      case 'code':
        return (
          <Box className="border-[color-mix(in_srgb,var(--app-text)_25%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-text)_92%,transparent)]">
            <div className="space-y-1">
              <div className="h-1 w-3/4 rounded bg-[color-mix(in_srgb,var(--app-accent)_80%,white)]" />
              <div className="h-1 w-1/2 rounded bg-[color-mix(in_srgb,var(--app-text-faint)_60%,transparent)]" />
              <div className="h-1 w-2/3 rounded bg-[color-mix(in_srgb,var(--app-text-faint)_60%,transparent)]" />
            </div>
          </Box>
        );
      case 'textarea':
        return (
          <Box className="space-y-1">
            <Line />
            <Line />
            <Line w="w-2/3" muted />
          </Box>
        );
      case 'wysiwyg':
        return (
          <Box>
            <div className="mb-1 flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-2 rounded ${i === 1 ? 'bg-[color-mix(in_srgb,var(--app-accent)_70%,var(--app-border))]' : 'bg-[color-mix(in_srgb,var(--app-border-strong)_80%,var(--app-border))]'}`}
                />
              ))}
            </div>
            <Line />
            <Line w="w-4/5" muted />
          </Box>
        );
      case 'markdown':
        return (
          <Box className="font-mono text-[8px] leading-tight">
            <div className="font-semibold text-[var(--app-text-secondary)]"># Title</div>
            <div className="text-[var(--app-accent-text)]">**bold**</div>
          </Box>
        );
      case 'tags':
        return (
          <Box className="flex flex-wrap gap-1">
            {['Tag', 'SEO'].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-1.5 py-0.5 text-[8px] font-medium text-[var(--app-accent-text)]"
                style={{ backgroundColor: 'var(--app-accent-light)' }}
              >
                {tag}
              </span>
            ))}
          </Box>
        );
      case 'seo':
        return (
          <Box className="space-y-1">
            <Line w="w-3/4" accent />
            <Line w="w-full" h="h-1" />
            <Line w="w-2/3" h="h-1" muted />
          </Box>
        );
      case 'number':
        return (
          <Box className="flex items-center justify-end">
            <span className="text-[10px] font-bold tabular-nums text-[var(--app-accent-text)]">42</span>
          </Box>
        );
      case 'slug':
        return (
          <Box>
            <div className="flex min-w-0 items-baseline gap-0.5">
              <span className="interface-preview-slug-prefix">example.com/</span>
              <span className="interface-preview-slug-value">my-page</span>
            </div>
          </Box>
        );
      case 'toggle':
        return (
          <Box className="flex items-center justify-center">
            <div
              className="relative h-3 w-6 rounded-full"
              style={{ backgroundColor: 'var(--app-accent)' }}
            >
              <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white shadow-sm" />
            </div>
          </Box>
        );
      case 'datetime':
        return (
          <Box>
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded ${i === 2 ? 'interface-preview-line-accent' : 'interface-preview-line-muted'}`}
                />
              ))}
            </div>
          </Box>
        );
      case 'repeater':
        return (
          <Box className="space-y-1">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded border p-1"
                style={{ borderColor: 'color-mix(in srgb, var(--app-accent) 25%, var(--app-border))' }}
              >
                <Line w="w-3/4" h="h-1" />
              </div>
            ))}
          </Box>
        );
      case 'map':
        return (
          <Box className="relative overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 8%, var(--app-surface-muted))' }}>
            <div
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: 'var(--app-accent)' }}
            />
            <div
              className="absolute inset-1 rounded border"
              style={{ borderColor: 'color-mix(in srgb, var(--app-accent) 30%, var(--app-border))' }}
            />
          </Box>
        );
      case 'color':
        return (
          <Box className="flex items-center gap-1">
            <div
              className="h-4 w-4 rounded border"
              style={{
                borderColor: 'var(--app-border-strong)',
                background: 'linear-gradient(135deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 50%, #8b5cf6))',
              }}
            />
            <div className="flex-1 space-y-0.5">
              <Line h="h-1" muted />
              <div className="flex gap-0.5">
                {['#ef4444', 'var(--app-accent)', '#8b5cf6'].map((c) => (
                  <div key={c} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </Box>
        );
      case 'dropdown':
        return (
          <Box className="flex items-center gap-1">
            <Line w="flex-1" />
            <div
              className="h-0 w-0 border-x-[3px] border-x-transparent border-t-[4px]"
              style={{ borderTopColor: 'var(--app-accent)' }}
            />
          </Box>
        );
      case 'icon':
        return (
          <Box>
            <Line w="w-2/3" h="h-1" muted />
            <div className="mt-1 grid grid-cols-4 gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded ${i === 0 ? 'interface-preview-line-accent' : 'interface-preview-line-muted'}`}
                />
              ))}
            </div>
          </Box>
        );
      case 'checkboxes':
        return (
          <Box className="space-y-1">
            {[true, false, true].map((checked, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded border ${checked ? '' : 'border-[var(--app-border-strong)]'}`}
                  style={checked ? { borderColor: 'var(--app-accent)', backgroundColor: 'var(--app-accent)' } : undefined}
                />
                <Line w="w-2/3" h="h-1" muted={!checked} />
              </div>
            ))}
          </Box>
        );
      case 'checkboxes-tree':
        return (
          <Box className="space-y-0.5 text-[8px] text-[var(--app-accent-text)]">
            <div className="flex items-center gap-1"><Dot /><span>Parent</span></div>
            <div className="ml-2 flex items-center gap-1"><Dot /><span>Child</span></div>
          </Box>
        );
      case 'dropdown-multiple':
        return (
          <Box className="space-y-1">
            <Line />
            <Line muted />
            <Line w="w-3/4" muted />
          </Box>
        );
      case 'radio':
        return (
          <Box className="space-y-1">
            {[true, false].map((selected, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className={`h-2 w-2 rounded-full border ${selected ? '' : 'border-[var(--app-border-strong)]'}`}
                  style={selected ? { borderColor: 'var(--app-accent)', backgroundColor: 'var(--app-accent)' } : undefined}
                />
                <Line w="w-2/3" h="h-1" muted={!selected} accent={selected} />
              </div>
            ))}
          </Box>
        );
      case 'file':
        return (
          <Box className="flex items-center justify-center">
            <div
              className="h-5 w-4 rounded border-2"
              style={{ borderColor: 'color-mix(in srgb, var(--app-accent) 65%, var(--app-border-strong))' }}
            />
          </Box>
        );
      case 'image':
        return (
          <Box
            className="flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 8%, var(--app-surface-muted))' }}
          >
            <div
              className="h-4 w-5 rounded border"
              style={{ borderColor: 'color-mix(in srgb, var(--app-accent) 35%, var(--app-border))' }}
            >
              <div
                className="ml-0.5 mt-0.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 55%, white)' }}
              />
              <div
                className="mx-0.5 mt-0.5 h-1 rounded"
                style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 35%, var(--app-border))' }}
              />
            </div>
          </Box>
        );
      case 'files':
        return (
          <Box className="grid grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`aspect-square rounded ${i === 0 ? 'interface-preview-line-accent' : 'interface-preview-line-muted'}`}
              />
            ))}
          </Box>
        );
      case 'm2a':
      case 'm2m':
      case 'o2m':
        return (
          <Box className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex items-center gap-1 rounded px-1 py-0.5 ${i === 2 ? 'ring-1' : ''}`}
                style={
                  i === 2
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--app-accent) 10%, var(--app-surface))',
                        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 30%, var(--app-border))',
                      }
                    : undefined
                }
              >
                <Line w="w-2/3" h="h-1" accent={i === 2} muted={i !== 2} />
                {icon === 'm2a' && i === 2 && (
                  <div
                    className="h-1.5 w-1.5 rounded"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 75%, white)' }}
                  />
                )}
              </div>
            ))}
          </Box>
        );
      case 'tree':
        return (
          <Box className="space-y-0.5 text-[8px]">
            <div className="flex items-center gap-1"><Dot /><Line w="w-1/2" h="h-1" accent /></div>
            <div className="ml-2 flex items-center gap-1"><Dot /><Line w="w-1/3" h="h-1" /></div>
            <div className="ml-4 flex items-center gap-1"><Dot /><Line w="w-1/4" h="h-1" muted /></div>
          </Box>
        );
      case 'm2o':
        return (
          <Box>
            <div
              className="rounded px-1 py-1"
              style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 12%, var(--app-surface))' }}
            >
              <Line w="w-3/4" h="h-1" accent />
            </div>
            <div className="mt-1 space-y-0.5 opacity-50">
              <Line h="h-1" muted />
              <Line h="h-1" muted />
            </div>
          </Box>
        );
      case 'translations':
        return (
          <Box className="space-y-1">
            <div className="flex gap-0.5">
              {['EN', 'DE'].map((lang, i) => (
                <span
                  key={lang}
                  className="rounded px-1 text-[7px] font-semibold"
                  style={
                    i === 0
                      ? { backgroundColor: 'var(--app-accent)', color: '#fff' }
                      : { backgroundColor: 'var(--app-accent-light)', color: 'var(--app-accent-text)' }
                  }
                >
                  {lang}
                </span>
              ))}
            </div>
            <Line />
          </Box>
        );
      case 'header':
        return <Box><Line w="w-2/3" h="h-2" accent /></Box>;
      case 'divider':
        return (
          <Box className="flex items-center px-1">
            <div className="h-px flex-1" style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 45%, var(--app-border))' }} />
          </Box>
        );
      case 'buttons':
        return (
          <Box className="flex gap-1">
            <div className="h-3 flex-1 rounded" style={{ backgroundColor: 'var(--app-accent)' }} />
            <div
              className="h-3 flex-1 rounded border"
              style={{ borderColor: 'color-mix(in srgb, var(--app-accent) 35%, var(--app-border))' }}
            />
          </Box>
        );
      case 'notice':
        return (
          <Box
            style={{
              borderColor: 'color-mix(in srgb, var(--app-accent) 30%, var(--app-border))',
              backgroundColor: 'color-mix(in srgb, var(--app-accent) 8%, var(--app-surface))',
            }}
          >
            <div className="flex items-start gap-1">
              <div
                className="mt-0.5 flex h-2 w-2 items-center justify-center rounded-full text-[6px] text-white"
                style={{ backgroundColor: 'var(--app-accent)' }}
              >
                i
              </div>
              <Line w="w-3/4" h="h-1" />
            </div>
          </Box>
        );
      case 'm2a-button':
        return (
          <Box className="flex items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded ${i === 0 ? 'interface-preview-line-accent' : 'interface-preview-line-muted'}`}
                />
              ))}
            </div>
          </Box>
        );
      case 'super-header':
        return <Box className="flex items-center justify-center"><Line w="w-3/4" h="h-2.5" accent /></Box>;
      case 'accordion':
        return (
          <Box className="space-y-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="text-[8px] font-bold text-[var(--app-accent-text)]">{i === 1 ? '▾' : '▸'}</div>
                <Line w="w-2/3" h="h-1" accent={i === 1} muted={i !== 1} />
              </div>
            ))}
          </Box>
        );
      case 'detail-group':
        return (
          <Box>
            <div className="flex items-center gap-1">
              <Dot />
              <Line w="w-1/2" h="h-1" />
              <span className="text-[8px] font-bold text-[var(--app-accent-text)]">›</span>
            </div>
          </Box>
        );
      case 'raw-group':
        return (
          <Box className="border-dashed">
            <Line />
            <Line w="w-4/5" muted />
          </Box>
        );
      case 'tabs':
        return (
          <Box>
            <div className="mb-1 flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-t ${i === 1 ? 'interface-preview-line-accent' : 'interface-preview-line-muted'}`}
                />
              ))}
            </div>
            <Line />
            <Line w="w-3/4" muted />
          </Box>
        );
      case 'tab-group':
        return (
          <Box className="flex items-center justify-center">
            <div className="relative">
              <div className="h-5 w-5 rounded border border-[var(--app-border)] bg-[var(--app-surface)]" />
              <div
                className="absolute -right-1 -top-1 h-3 w-3 rounded border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--app-accent) 30%, var(--app-border))',
                  backgroundColor: 'color-mix(in srgb, var(--app-accent) 10%, var(--app-surface))',
                }}
              />
            </div>
          </Box>
        );
      case 'collection-dropdown':
        return (
          <Box>
            <Line />
            <div className="mt-1 space-y-0.5 opacity-50">
              <Line h="h-1" muted />
              <Line w="w-4/5" h="h-1" muted />
            </div>
          </Box>
        );
      case 'collection-dropdown-multiple':
        return (
          <Box className="space-y-1">
            <Line />
            <Line muted />
            <Line w="w-2/3" muted />
          </Box>
        );
      case 'hash':
        return (
          <Box className="flex items-center gap-1">
            <div className="flex-1 text-[8px] tracking-widest text-[var(--app-text-faint)]">••••••</div>
            <div
              className="h-2 w-2 rounded"
              style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 25%, var(--app-border))' }}
            />
          </Box>
        );
      case 'slider':
        return (
          <Box className="flex items-center px-1">
            <div
              className="relative h-1 flex-1 rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent) 20%, var(--app-border))' }}
            >
              <div
                className="absolute left-2/3 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: 'var(--app-accent)' }}
              />
            </div>
          </Box>
        );
      case 'json':
        return (
          <Box className="font-mono text-[7px] leading-tight text-[var(--app-accent-text)]">
            <div>{'{'}</div>
            <div className="pl-1">&quot;k&quot;: &quot;v&quot;</div>
            <div>{'}'}</div>
          </Box>
        );
      default:
        return (
          <Box>
            <div className="interface-preview-input-row">
              <Line w="flex-1" h="h-1" />
              <div className="interface-preview-input-caret" aria-hidden="true" />
            </div>
          </Box>
        );
    }
  })();

  return <div className={className} aria-hidden="true">{content}</div>;
}
