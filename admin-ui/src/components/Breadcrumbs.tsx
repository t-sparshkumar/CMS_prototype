import { Link } from 'react-router-dom';
import Icon from './Icon';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`breadcrumb ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumb-item">
            {index > 0 && (
              <Icon name="chevron-right" className="breadcrumb-sep" aria-hidden="true" />
            )}
            {item.to && !isLast ? (
              <Link to={item.to} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'breadcrumb-current' : 'breadcrumb-link'}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
