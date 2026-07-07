import Icon from '../Icon';
import { FieldLabel, inputClassName } from './fieldShared';
import FileUploadField from '../FileUploadField';
import type { FieldMeta } from '../../lib/api';

interface BlockEditorFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

interface ContentBlock {
  type: string;
  data: Record<string, unknown>;
}

const DEFAULT_BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'heading', label: 'Heading' },
  { type: 'image', label: 'Image' },
  { type: 'quote', label: 'Quote' },
];

function getBlockTypes(field: FieldMeta) {
  const raw = field.options?.blocks ?? field.options?.block_types;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((b) => {
      if (typeof b === 'object' && b !== null) {
        const record = b as Record<string, unknown>;
        return { type: String(record.type ?? record.id ?? 'block'), label: String(record.label ?? record.type ?? 'Block') };
      }
      return { type: String(b), label: String(b) };
    });
  }
  return DEFAULT_BLOCK_TYPES;
}

export default function BlockEditorField({ field, value, onChange, disabled }: BlockEditorFieldProps) {
  const blockTypes = getBlockTypes(field);
  const blocks: ContentBlock[] = Array.isArray(value)
    ? (value as ContentBlock[])
    : [];

  function updateBlock(index: number, patch: Partial<ContentBlock>) {
    onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBlock(type: string) {
    onChange([...blocks, { type, data: { text: '' } }]);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={index} className="field-repeater-row">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 capitalize">{block.type}</span>
              {!disabled && (
                <button type="button" onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700 p-1">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>
            {block.type === 'image' ? (
              <FileUploadField
                label=""
                value={block.data.file ?? null}
                onChange={(fileId) =>
                  updateBlock(index, { data: { ...block.data, file: fileId } })
                }
                disabled={disabled}
                accept="image/*"
              />
            ) : (
              <textarea
                value={String(block.data.text ?? block.data.content ?? '')}
                disabled={disabled}
                rows={3}
                onChange={(e) =>
                  updateBlock(index, { data: { ...block.data, text: e.target.value } })
                }
                className={`${inputClassName} text-sm`}
                placeholder={`${block.type} content...`}
              />
            )}
          </div>
        ))}
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            {blockTypes.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={() => addBlock(bt.type)}
                className="btn-secondary text-xs"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                {bt.label}
              </button>
            ))}
          </div>
        )}
        {blocks.length === 0 && (
          <p className="text-xs text-slate-400">Add content blocks using the buttons above.</p>
        )}
      </div>
    </div>
  );
}
