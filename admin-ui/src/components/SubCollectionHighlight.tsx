import { Link } from 'react-router-dom';
import Icon from './Icon';
import { nestedCollectionBadgeLabel } from '../lib/collectionLabels';
import type { CollectionMeta } from '../lib/api';

export function isSubCollection(collection: CollectionMeta): boolean {
  return Boolean(collection.parent);
}

interface SubCollectionBadgeProps {
  className?: string;
}

export function SubCollectionBadge({ className = '' }: SubCollectionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 ${className}`}
    >
      <Icon name="component" className="h-3 w-3" />
      {nestedCollectionBadgeLabel()}
    </span>
  );
}

interface SubCollectionParentLinkProps {
  parent: string;
  basePath: '/content' | '/settings/data-model';
  className?: string;
}

export function SubCollectionParentLink({
  parent,
  basePath,
  className = '',
}: SubCollectionParentLinkProps) {
  return (
    <p className={`text-xs text-violet-600/90 ${className}`}>
      <span className="text-slate-400">Under </span>
      <Link to={`${basePath}/${parent}`} className="font-medium hover:text-violet-800 hover:underline">
        {parent}
      </Link>
    </p>
  );
}

export function subCollectionCardClass(isSub: boolean): string {
  return isSub
    ? 'ring-1 ring-violet-200/90 bg-gradient-to-br from-violet-50/70 via-white to-white shadow-sm'
    : '';
}

export function subCollectionRowClass(isSub: boolean): string {
  return isSub
    ? 'bg-violet-50/40 border-l-[3px] border-l-violet-400 hover:bg-violet-50/60'
    : '';
}

export function subCollectionSectionClass(): string {
  return 'rounded-xl border border-violet-100 bg-violet-50/25 p-4 sm:p-5';
}
