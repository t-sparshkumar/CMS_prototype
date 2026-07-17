interface UtilityBarProps {
  fields: Record<string, unknown>;
}

export default function UtilityBar({ fields }: UtilityBarProps) {
  const consumer = String(fields.consumer_label ?? 'Consumer');
  const business = String(fields.business_label ?? 'Business');
  const accountLabel = String(fields.account_label ?? 'Mi Liberty');
  const accountUrl = String(fields.account_url ?? '#');
  const phone = String(fields.phone ?? '');
  const language = String(fields.language ?? 'ES');

  return (
    <div className="bg-liberty-gray border-b border-slate-200 text-sm">
      <div className="mx-auto flex max-w-[var(--liberty-max-width)] items-center justify-between px-4 h-[var(--liberty-utility-height)]">
        <div className="flex items-center gap-1 rounded-full bg-white p-0.5 shadow-sm">
          <span className="rounded-full bg-liberty-red px-3 py-1 text-xs font-semibold text-white">
            {consumer}
          </span>
          <span className="px-3 py-1 text-xs font-medium text-liberty-gray-mid">{business}</span>
        </div>
        <div className="flex items-center gap-4 text-liberty-dark">
          <a href={accountUrl} className="font-medium hover:text-liberty-red">
            {accountLabel}
          </a>
          {phone && (
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="font-medium hover:text-liberty-red">
              {phone}
            </a>
          )}
          <button type="button" className="font-semibold uppercase tracking-wide">
            {language}
          </button>
        </div>
      </div>
    </div>
  );
}
