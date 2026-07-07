import type { ReactNode } from 'react';
import type { InterfaceIconId } from '../../lib/interfaceCatalog';

interface InterfacePickerIconProps {
  icon: InterfaceIconId;
  className?: string;
}

function Box({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-2 ${className}`}>
      {children}
    </div>
  );
}

function Line({ w = 'w-full', h = 'h-1.5' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} rounded-full bg-brand-200`} />;
}

function Dot({ className = '' }: { className?: string }) {
  return <div className={`h-1.5 w-1.5 rounded-full bg-brand-500 ${className}`} />;
}

export default function InterfacePickerIcon({ icon, className = 'h-14 w-full' }: InterfacePickerIconProps) {
  const content = (() => {
    switch (icon) {
      case 'input':
        return <Box><Line /></Box>;
      case 'autocomplete':
        return (
          <Box>
            <Line />
            <div className="mt-1.5 space-y-1">
              <Line w="w-4/5" h="h-1" />
              <Line w="w-3/5" h="h-1" />
            </div>
          </Box>
        );
      case 'block-editor':
        return (
          <Box className="space-y-1">
            <Line w="w-2/3" />
            <div className="rounded border border-dashed border-brand-200 p-1"><Line w="w-full" h="h-1" /></div>
            <Line w="w-1/2" />
          </Box>
        );
      case 'code':
        return (
          <Box className="bg-slate-900 border-slate-700">
            <div className="space-y-1">
              <div className="h-1 w-3/4 rounded bg-emerald-400/70" />
              <div className="h-1 w-1/2 rounded bg-slate-500" />
              <div className="h-1 w-2/3 rounded bg-slate-500" />
            </div>
          </Box>
        );
      case 'textarea':
        return <Box className="space-y-1"><Line /><Line /><Line w="w-2/3" /></Box>;
      case 'wysiwyg':
        return (
          <Box>
            <div className="mb-1 flex gap-0.5">
              {[1, 2, 3].map((i) => <div key={i} className="h-1.5 w-2 rounded bg-slate-200" />)}
            </div>
            <Line /><Line w="w-4/5" />
          </Box>
        );
      case 'markdown':
        return (
          <Box className="font-mono text-[8px] leading-tight text-brand-600">
            <div># Title</div>
            <div className="text-slate-400">**bold**</div>
          </Box>
        );
      case 'tags':
        return (
          <Box className="flex flex-wrap gap-1">
            {['Tag', 'SEO'].map((tag) => (
              <span key={tag} className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[8px] text-brand-700">{tag}</span>
            ))}
          </Box>
        );
      case 'seo':
        return (
          <Box className="space-y-1">
            <Line w="w-3/4" />
            <Line w="w-full" h="h-1" />
            <Line w="w-2/3" h="h-1" />
          </Box>
        );
      case 'number':
        return <Box className="flex items-center justify-end"><span className="text-[10px] font-semibold text-brand-600">42</span></Box>;
      case 'slug':
        return <Box><div className="text-[8px] font-mono text-brand-600">my-page-slug</div></Box>;
      case 'toggle':
        return (
          <Box className="flex items-center justify-center">
            <div className="relative h-3 w-6 rounded-full bg-brand-500">
              <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white" />
            </div>
          </Box>
        );
      case 'datetime':
        return (
          <Box>
            <div className="grid grid-cols-3 gap-0.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded ${i === 2 ? 'bg-brand-500' : 'bg-brand-100'}`} />
              ))}
            </div>
          </Box>
        );
      case 'repeater':
        return (
          <Box className="space-y-1">
            {[1, 2].map((i) => (
              <div key={i} className="rounded border border-brand-100 p-1"><Line w="w-3/4" h="h-1" /></div>
            ))}
          </Box>
        );
      case 'map':
        return (
          <Box className="relative overflow-hidden bg-brand-50">
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500" />
            <div className="absolute inset-1 rounded border border-brand-200" />
          </Box>
        );
      case 'color':
        return (
          <Box className="flex items-center gap-1">
            <div className="h-4 w-4 rounded border border-slate-200 bg-gradient-to-br from-brand-400 to-violet-500" />
            <div className="flex-1 space-y-0.5">
              <Line h="h-1" />
              <div className="flex gap-0.5">{['bg-red-400', 'bg-emerald-400', 'bg-brand-400'].map((c) => (
                <div key={c} className={`h-1.5 w-1.5 rounded-full ${c}`} />
              ))}</div>
            </div>
          </Box>
        );
      case 'dropdown':
        return (
          <Box className="flex items-center gap-1">
            <Line w="flex-1" />
            <div className="h-0 w-0 border-x-[3px] border-x-transparent border-t-[4px] border-t-brand-500" />
          </Box>
        );
      case 'icon':
        return (
          <Box>
            <Line w="w-2/3" h="h-1" />
            <div className="mt-1 grid grid-cols-4 gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-2 rounded bg-brand-100" />
              ))}
            </div>
          </Box>
        );
      case 'checkboxes':
        return (
          <Box className="space-y-1">
            {[true, false, true].map((checked, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded border ${checked ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
                <Line w="w-2/3" h="h-1" />
              </div>
            ))}
          </Box>
        );
      case 'checkboxes-tree':
        return (
          <Box className="space-y-0.5 text-[8px] text-brand-600">
            <div className="flex items-center gap-1"><Dot /><span>Parent</span></div>
            <div className="ml-2 flex items-center gap-1"><Dot /><span>Child</span></div>
          </Box>
        );
      case 'dropdown-multiple':
        return (
          <Box className="space-y-1">
            <Line />
            <Line />
            <Line w="w-3/4" />
          </Box>
        );
      case 'radio':
        return (
          <Box className="space-y-1">
            {[true, false].map((selected, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full border ${selected ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
                <Line w="w-2/3" h="h-1" />
              </div>
            ))}
          </Box>
        );
      case 'file':
        return <Box className="flex items-center justify-center"><div className="h-5 w-4 rounded border-2 border-brand-400" /></Box>;
      case 'image':
        return (
          <Box className="flex items-center justify-center bg-brand-50">
            <div className="h-4 w-5 rounded border border-brand-200">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-300 mt-0.5 ml-0.5" />
              <div className="mx-0.5 mt-0.5 h-1 rounded bg-brand-200" />
            </div>
          </Box>
        );
      case 'files':
        return (
          <Box className="grid grid-cols-2 gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded bg-brand-100" />
            ))}
          </Box>
        );
      case 'm2a':
      case 'm2m':
      case 'o2m':
        return (
          <Box className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex items-center gap-1 rounded px-1 py-0.5 ${i === 2 ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}>
                <Line w="w-2/3" h="h-1" />
                {icon === 'm2a' && i === 2 && <div className="h-1.5 w-1.5 rounded bg-brand-400" />}
              </div>
            ))}
          </Box>
        );
      case 'tree':
        return (
          <Box className="space-y-0.5 text-[8px]">
            <div className="flex items-center gap-1"><Dot /><Line w="w-1/2" h="h-1" /></div>
            <div className="ml-2 flex items-center gap-1"><Dot /><Line w="w-1/3" h="h-1" /></div>
            <div className="ml-4 flex items-center gap-1"><Dot /><Line w="w-1/4" h="h-1" /></div>
          </Box>
        );
      case 'm2o':
        return (
          <Box>
            <div className="rounded bg-brand-50 px-1 py-1"><Line w="w-3/4" h="h-1" /></div>
            <div className="mt-1 space-y-0.5 opacity-40"><Line h="h-1" /><Line h="h-1" /></div>
          </Box>
        );
      case 'translations':
        return (
          <Box className="space-y-1">
            <div className="flex gap-0.5">{['EN', 'DE'].map((lang, i) => (
              <span key={lang} className={`rounded px-1 text-[7px] ${i === 0 ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-700'}`}>{lang}</span>
            ))}</div>
            <Line />
          </Box>
        );
      case 'header':
        return <Box><Line w="w-2/3" h="h-2" /></Box>;
      case 'divider':
        return <Box className="flex items-center px-1"><div className="h-px flex-1 bg-brand-300" /></Box>;
      case 'buttons':
        return (
          <Box className="flex gap-1">
            <div className="h-3 flex-1 rounded bg-brand-500" />
            <div className="h-3 flex-1 rounded border border-brand-200" />
          </Box>
        );
      case 'notice':
        return (
          <Box className="border-brand-200 bg-brand-50">
            <div className="flex items-start gap-1">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-brand-500 text-[6px] text-white flex items-center justify-center">i</div>
              <Line w="w-3/4" h="h-1" />
            </div>
          </Box>
        );
      case 'm2a-button':
        return (
          <Box className="flex items-center justify-center">
            <div className="grid grid-cols-2 gap-0.5">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-2 w-2 rounded bg-brand-100" />)}
            </div>
          </Box>
        );
      case 'super-header':
        return <Box className="flex items-center justify-center"><Line w="w-3/4" h="h-2.5" /></Box>;
      case 'accordion':
        return (
          <Box className="space-y-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="text-[8px] text-brand-500">{i === 1 ? '▾' : '▸'}</div>
                <Line w="w-2/3" h="h-1" />
              </div>
            ))}
          </Box>
        );
      case 'detail-group':
        return (
          <Box>
            <div className="flex items-center gap-1"><Dot /><Line w="w-1/2" h="h-1" /><span className="text-[8px] text-brand-500">›</span></div>
          </Box>
        );
      case 'raw-group':
        return (
          <Box className="border-dashed">
            <Line /><Line w="w-4/5" />
          </Box>
        );
      case 'tabs':
        return (
          <Box>
            <div className="mb-1 flex gap-0.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-t ${i === 1 ? 'bg-brand-500' : 'bg-brand-100'}`} />
              ))}
            </div>
            <Line /><Line w="w-3/4" />
          </Box>
        );
      case 'tab-group':
        return (
          <Box className="flex items-center justify-center">
            <div className="relative">
              <div className="h-5 w-5 rounded border border-brand-200 bg-white" />
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded border border-brand-200 bg-brand-50" />
            </div>
          </Box>
        );
      case 'collection-dropdown':
        return (
          <Box>
            <Line />
            <div className="mt-1 space-y-0.5 opacity-50"><Line h="h-1" /><Line w="w-4/5" h="h-1" /></div>
          </Box>
        );
      case 'collection-dropdown-multiple':
        return (
          <Box className="space-y-1">
            <Line /><Line /><Line w="w-2/3" />
          </Box>
        );
      case 'hash':
        return (
          <Box className="flex items-center gap-1">
            <div className="flex-1 text-[8px] tracking-widest text-slate-400">••••••</div>
            <div className="h-2 w-2 rounded bg-brand-100" />
          </Box>
        );
      case 'slider':
        return (
          <Box className="flex items-center px-1">
            <div className="relative h-1 flex-1 rounded-full bg-brand-100">
              <div className="absolute left-2/3 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500 shadow-sm" />
            </div>
          </Box>
        );
      case 'json':
        return (
          <Box className="font-mono text-[7px] text-brand-600 leading-tight">
            <div>{'{'}</div>
            <div className="pl-1">&quot;k&quot;: &quot;v&quot;</div>
            <div>{'}'}</div>
          </Box>
        );
      default:
        return <Box><Line /></Box>;
    }
  })();

  return <div className={className} aria-hidden="true">{content}</div>;
}
