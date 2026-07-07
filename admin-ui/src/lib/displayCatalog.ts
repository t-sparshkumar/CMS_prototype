export interface DisplayOption {
  id: string;
  label: string;
  description: string;
  /** Empty = all interfaces */
  interfaces?: string[];
}

export const DISPLAY_CATALOG: DisplayOption[] = [
  { id: 'raw', label: 'Raw', description: 'Show the stored value as-is' },
  { id: 'formatted-value', label: 'Formatted Value', description: 'Format numbers, dates, and text' },
  { id: 'labels', label: 'Labels', description: 'Map stored values to choice labels', interfaces: ['select-dropdown', 'radio-buttons', 'checkboxes', 'select-multiple-dropdown', 'icon'] },
  { id: 'related-values', label: 'Related Values', description: 'Show labels from a related item', interfaces: ['many-to-one', 'collection-item-dropdown'] },
  { id: 'boolean', label: 'Boolean', description: 'Yes / No display', interfaces: ['toggle', 'boolean'] },
  { id: 'datetime', label: 'Datetime', description: 'Formatted date and time', interfaces: ['datetime', 'date', 'time'] },
  { id: 'image', label: 'Image', description: 'Thumbnail preview', interfaces: ['file-image', 'file'] },
  { id: 'file', label: 'File', description: 'File name and link', interfaces: ['file'] },
  { id: 'user', label: 'User', description: 'User name from relation', interfaces: ['many-to-one'] },
  { id: 'color', label: 'Color', description: 'Color swatch', interfaces: ['color'] },
  { id: 'rating', label: 'Rating', description: 'Star or numeric rating', interfaces: ['slider', 'number', 'integer'] },
];

export function getDisplaysForInterface(interfaceId: string, fieldType?: string): DisplayOption[] {
  return DISPLAY_CATALOG.filter((display) => {
    if (!display.interfaces || display.interfaces.length === 0) return true;
    if (display.interfaces.includes(interfaceId)) return true;
    if (fieldType && display.interfaces.includes(fieldType)) return true;
    return false;
  });
}

export function getDisplayOption(id: string): DisplayOption | undefined {
  return DISPLAY_CATALOG.find((d) => d.id === id);
}
