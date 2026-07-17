export type IconCategory =
  | 'action'
  | 'alert'
  | 'av'
  | 'communication'
  | 'content'
  | 'device'
  | 'editor'
  | 'file'
  | 'hardware'
  | 'image'
  | 'maps'
  | 'navigation'
  | 'notification'
  | 'places'
  | 'social'
  | 'toggle';

export interface CollectionIconEntry {
  id: string;
  label: string;
  category: IconCategory;
}

export const ICON_CATEGORIES: { id: IconCategory; label: string }[] = [
  { id: 'action', label: 'Action' },
  { id: 'alert', label: 'Alert' },
  { id: 'av', label: 'AV' },
  { id: 'communication', label: 'Communication' },
  { id: 'content', label: 'Content' },
  { id: 'device', label: 'Device' },
  { id: 'editor', label: 'Editor' },
  { id: 'file', label: 'File' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'image', label: 'Image' },
  { id: 'maps', label: 'Maps' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'notification', label: 'Notification' },
  { id: 'places', label: 'Places' },
  { id: 'social', label: 'Social' },
  { id: 'toggle', label: 'Toggle' },
];

export const COLLECTION_ICONS: CollectionIconEntry[] = [
  // action
  { id: 'search', label: 'Search', category: 'action' },
  { id: 'home', label: 'Home', category: 'action' },
  { id: 'settings', label: 'Settings', category: 'action' },
  { id: 'account_circle', label: 'Account', category: 'action' },
  { id: 'favorite', label: 'Favorite', category: 'action' },
  { id: 'star', label: 'Star', category: 'action' },
  { id: 'visibility', label: 'Visibility', category: 'action' },
  { id: 'lock', label: 'Lock', category: 'action' },
  { id: 'lock_open', label: 'Lock Open', category: 'action' },
  { id: 'delete', label: 'Delete', category: 'action' },
  { id: 'edit', label: 'Edit', category: 'action' },
  { id: 'add', label: 'Add', category: 'action' },
  { id: 'remove', label: 'Remove', category: 'action' },
  { id: 'done', label: 'Done', category: 'action' },
  { id: 'close', label: 'Close', category: 'action' },
  { id: 'check', label: 'Check', category: 'action' },
  { id: 'refresh', label: 'Refresh', category: 'action' },
  { id: 'download', label: 'Download', category: 'action' },
  { id: 'upload', label: 'Upload', category: 'action' },
  { id: 'share', label: 'Share', category: 'action' },
  { id: 'print', label: 'Print', category: 'action' },
  { id: 'save', label: 'Save', category: 'action' },
  { id: 'bookmark', label: 'Bookmark', category: 'action' },
  { id: 'help', label: 'Help', category: 'action' },
  { id: 'info', label: 'Info', category: 'action' },
  { id: 'launch', label: 'Launch', category: 'action' },
  { id: 'open_in_new', label: 'Open in New', category: 'action' },
  { id: 'filter_list', label: 'Filter', category: 'action' },
  { id: 'sort', label: 'Sort', category: 'action' },
  { id: 'more_vert', label: 'More', category: 'action' },
  // alert
  { id: 'warning', label: 'Warning', category: 'alert' },
  { id: 'error', label: 'Error', category: 'alert' },
  { id: 'report', label: 'Report', category: 'alert' },
  { id: 'notification_important', label: 'Important', category: 'alert' },
  { id: 'priority_high', label: 'Priority High', category: 'alert' },
  { id: 'new_releases', label: 'New Releases', category: 'alert' },
  { id: 'campaign', label: 'Campaign', category: 'alert' },
  { id: 'announcement', label: 'Announcement', category: 'alert' },
  // av
  { id: 'play_arrow', label: 'Play', category: 'av' },
  { id: 'pause', label: 'Pause', category: 'av' },
  { id: 'stop', label: 'Stop', category: 'av' },
  { id: 'volume_up', label: 'Volume Up', category: 'av' },
  { id: 'mic', label: 'Microphone', category: 'av' },
  { id: 'videocam', label: 'Video Camera', category: 'av' },
  { id: 'movie', label: 'Movie', category: 'av' },
  { id: 'music_note', label: 'Music', category: 'av' },
  { id: 'slideshow', label: 'Slideshow', category: 'av' },
  { id: 'queue_music', label: 'Queue Music', category: 'av' },
  // communication
  { id: 'mail', label: 'Mail', category: 'communication' },
  { id: 'chat', label: 'Chat', category: 'communication' },
  { id: 'forum', label: 'Forum', category: 'communication' },
  { id: 'call', label: 'Call', category: 'communication' },
  { id: 'contacts', label: 'Contacts', category: 'communication' },
  { id: 'alternate_email', label: 'Email', category: 'communication' },
  { id: 'send', label: 'Send', category: 'communication' },
  { id: 'comment', label: 'Comment', category: 'communication' },
  { id: 'sms', label: 'SMS', category: 'communication' },
  // content
  { id: 'article', label: 'Article', category: 'content' },
  { id: 'description', label: 'Description', category: 'content' },
  { id: 'text_snippet', label: 'Text Snippet', category: 'content' },
  { id: 'notes', label: 'Notes', category: 'content' },
  { id: 'library_books', label: 'Library Books', category: 'content' },
  { id: 'menu_book', label: 'Menu Book', category: 'content' },
  { id: 'newspaper', label: 'Newspaper', category: 'content' },
  { id: 'feed', label: 'Feed', category: 'content' },
  { id: 'format_quote', label: 'Quote', category: 'content' },
  { id: 'subject', label: 'Subject', category: 'content' },
  { id: 'widgets', label: 'Widgets', category: 'content' },
  { id: 'dashboard', label: 'Dashboard', category: 'content' },
  { id: 'view_list', label: 'View List', category: 'content' },
  { id: 'view_module', label: 'View Module', category: 'content' },
  { id: 'table_rows', label: 'Table Rows', category: 'content' },
  // device
  { id: 'smartphone', label: 'Smartphone', category: 'device' },
  { id: 'tablet', label: 'Tablet', category: 'device' },
  { id: 'laptop', label: 'Laptop', category: 'device' },
  { id: 'desktop_windows', label: 'Desktop', category: 'device' },
  { id: 'watch', label: 'Watch', category: 'device' },
  { id: 'tv', label: 'TV', category: 'device' },
  { id: 'headphones', label: 'Headphones', category: 'device' },
  { id: 'memory', label: 'Memory', category: 'device' },
  // editor
  { id: 'format_bold', label: 'Bold', category: 'editor' },
  { id: 'format_italic', label: 'Italic', category: 'editor' },
  { id: 'format_underlined', label: 'Underline', category: 'editor' },
  { id: 'format_align_left', label: 'Align Left', category: 'editor' },
  { id: 'format_list_bulleted', label: 'Bullet List', category: 'editor' },
  { id: 'format_list_numbered', label: 'Numbered List', category: 'editor' },
  { id: 'link', label: 'Link', category: 'editor' },
  { id: 'code', label: 'Code', category: 'editor' },
  { id: 'title', label: 'Title', category: 'editor' },
  { id: 'functions', label: 'Functions', category: 'editor' },
  // file
  { id: 'folder', label: 'Folder', category: 'file' },
  { id: 'folder_open', label: 'Folder Open', category: 'file' },
  { id: 'insert_drive_file', label: 'File', category: 'file' },
  { id: 'attach_file', label: 'Attach File', category: 'file' },
  { id: 'cloud', label: 'Cloud', category: 'file' },
  { id: 'cloud_upload', label: 'Cloud Upload', category: 'file' },
  { id: 'cloud_download', label: 'Cloud Download', category: 'file' },
  { id: 'inventory', label: 'Inventory', category: 'file' },
  { id: 'archive', label: 'Archive', category: 'file' },
  { id: 'draft', label: 'Draft', category: 'file' },
  // hardware
  { id: 'computer', label: 'Computer', category: 'hardware' },
  { id: 'keyboard', label: 'Keyboard', category: 'hardware' },
  { id: 'mouse', label: 'Mouse', category: 'hardware' },
  { id: 'router', label: 'Router', category: 'hardware' },
  { id: 'storage', label: 'Storage', category: 'hardware' },
  { id: 'developer_board', label: 'Developer Board', category: 'hardware' },
  { id: 'dns', label: 'DNS', category: 'hardware' },
  { id: 'database', label: 'Database', category: 'hardware' },
  // image
  { id: 'image', label: 'Image', category: 'image' },
  { id: 'photo', label: 'Photo', category: 'image' },
  { id: 'photo_library', label: 'Photo Library', category: 'image' },
  { id: 'collections', label: 'Collections', category: 'image' },
  { id: 'palette', label: 'Palette', category: 'image' },
  { id: 'brush', label: 'Brush', category: 'image' },
  { id: 'crop', label: 'Crop', category: 'image' },
  { id: 'camera_alt', label: 'Camera', category: 'image' },
  // maps
  { id: 'map', label: 'Map', category: 'maps' },
  { id: 'place', label: 'Place', category: 'maps' },
  { id: 'location_on', label: 'Location', category: 'maps' },
  { id: 'directions', label: 'Directions', category: 'maps' },
  { id: 'explore', label: 'Explore', category: 'maps' },
  { id: 'my_location', label: 'My Location', category: 'maps' },
  { id: 'navigation', label: 'Navigation', category: 'maps' },
  // navigation
  { id: 'menu', label: 'Menu', category: 'navigation' },
  { id: 'arrow_back', label: 'Arrow Back', category: 'navigation' },
  { id: 'arrow_forward', label: 'Arrow Forward', category: 'navigation' },
  { id: 'chevron_right', label: 'Chevron Right', category: 'navigation' },
  { id: 'expand_more', label: 'Expand More', category: 'navigation' },
  { id: 'apps', label: 'Apps', category: 'navigation' },
  { id: 'grid_view', label: 'Grid View', category: 'navigation' },
  { id: 'web', label: 'Web', category: 'navigation' },
  { id: 'language', label: 'Language', category: 'navigation' },
  { id: 'public', label: 'Public', category: 'navigation' },
  // notification
  { id: 'notifications', label: 'Notifications', category: 'notification' },
  { id: 'notifications_active', label: 'Notifications Active', category: 'notification' },
  { id: 'notifications_off', label: 'Notifications Off', category: 'notification' },
  { id: 'event', label: 'Event', category: 'notification' },
  { id: 'schedule', label: 'Schedule', category: 'notification' },
  { id: 'alarm', label: 'Alarm', category: 'notification' },
  // places
  { id: 'business', label: 'Business', category: 'places' },
  { id: 'store', label: 'Store', category: 'places' },
  { id: 'storefront', label: 'Storefront', category: 'places' },
  { id: 'apartment', label: 'Apartment', category: 'places' },
  { id: 'home_work', label: 'Home Work', category: 'places' },
  { id: 'local_shipping', label: 'Shipping', category: 'places' },
  { id: 'restaurant', label: 'Restaurant', category: 'places' },
  { id: 'hotel', label: 'Hotel', category: 'places' },
  // social
  { id: 'person', label: 'Person', category: 'social' },
  { id: 'group', label: 'Group', category: 'social' },
  { id: 'people', label: 'People', category: 'social' },
  { id: 'supervisor_account', label: 'Supervisor', category: 'social' },
  { id: 'badge', label: 'Badge', category: 'social' },
  { id: 'thumb_up', label: 'Thumb Up', category: 'social' },
  { id: 'celebration', label: 'Celebration', category: 'social' },
  { id: 'emoji_events', label: 'Events', category: 'social' },
  // toggle
  { id: 'check_box', label: 'Checkbox', category: 'toggle' },
  { id: 'radio_button_checked', label: 'Radio', category: 'toggle' },
  { id: 'toggle_on', label: 'Toggle On', category: 'toggle' },
  { id: 'toggle_off', label: 'Toggle Off', category: 'toggle' },
  { id: 'star_border', label: 'Star Border', category: 'toggle' },
  { id: 'favorite_border', label: 'Favorite Border', category: 'toggle' },
  { id: 'category', label: 'Category', category: 'toggle' },
  { id: 'label', label: 'Label', category: 'toggle' },
  { id: 'book', label: 'Book', category: 'content' },
  { id: 'tag', label: 'Tag', category: 'toggle' },
];

/** Legacy icon strings from seeds / old IconPicker → Material Symbol names */
export const ICON_ALIASES: Record<string, string> = {
  article: 'article',
  book: 'book',
  folder: 'folder',
  image: 'image',
  person: 'person',
  settings: 'settings',
  store: 'store',
  tag: 'tag',
  widgets: 'widgets',
  description: 'description',
  inventory: 'inventory',
  category: 'category',
  link: 'link',
  language: 'language',
  public: 'public',
  database: 'database',
  web: 'web',
  content: 'article',
  component: 'widgets',
  pages: 'description',
  users: 'group',
  external: 'public',
  group: 'folder',
  slideshow: 'slideshow',
  close: 'close',
};

const KNOWN_ICON_IDS = new Set(COLLECTION_ICONS.map((icon) => icon.id));

export function resolveCollectionIcon(icon: string | null, isGroup: boolean): string {
  if (!icon) return isGroup ? 'folder' : 'article';
  const aliased = ICON_ALIASES[icon] ?? icon;
  if (KNOWN_ICON_IDS.has(aliased)) return aliased;
  return isGroup ? 'folder' : 'article';
}

export function getIconLabel(iconId: string): string {
  return COLLECTION_ICONS.find((icon) => icon.id === iconId)?.label ?? iconId;
}

export function filterIcons(query: string, category?: IconCategory): CollectionIconEntry[] {
  const q = query.trim().toLowerCase();
  return COLLECTION_ICONS.filter((icon) => {
    if (category && icon.category !== category) return false;
    if (!q) return true;
    return icon.id.includes(q) || icon.label.toLowerCase().includes(q);
  });
}
