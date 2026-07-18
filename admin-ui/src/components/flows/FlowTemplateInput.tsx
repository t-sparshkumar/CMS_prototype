import { useRef, type ChangeEvent } from 'react';
import FlowVariablePicker from './FlowVariablePicker';

interface FlowTemplateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

export default function FlowTemplateInput({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: FlowTemplateInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  function insertVariable(variable: string) {
    const el = inputRef.current;
    if (!el) {
      onChange(`${value}{{ ${variable} }}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}{{ ${variable} }}${value.slice(end)}`;
    onChange(next);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    onChange(e.target.value);
  }

  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            className="input min-h-[96px] font-mono text-xs"
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={handleChange}
            className="input font-mono text-xs"
            placeholder={placeholder}
          />
        )}
        <FlowVariablePicker onInsert={insertVariable} />
      </div>
    </label>
  );
}
