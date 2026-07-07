import type { ItemRecord } from './api';

export function formatDisplayTemplate(template: string | null | undefined, item: ItemRecord): string {
  if (!template) {
    const title = item.title ?? item.name;
    if (title !== undefined && title !== null && title !== '') {
      return String(title);
    }
    return String(item.id ?? '—');
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_match, fieldName: string) => {
    const value = item[fieldName];
    return value === null || value === undefined ? '' : String(value);
  });
}
