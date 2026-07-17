import { resolveCollectionIcon } from '../lib/collectionIconCatalog';

interface CollectionMaterialIconProps {
  icon: string | null;
  isGroup?: boolean;
  color?: string;
  className?: string;
  size?: number;
}

export default function CollectionMaterialIcon({
  icon,
  isGroup = false,
  color,
  className = '',
  size = 20,
}: CollectionMaterialIconProps) {
  const resolved = resolveCollectionIcon(icon, isGroup);

  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        color,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {resolved}
    </span>
  );
}
