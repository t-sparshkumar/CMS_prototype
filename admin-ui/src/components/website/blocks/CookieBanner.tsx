interface CookieBannerProps {
  fields: Record<string, unknown>;
}

export default function CookieBanner({ fields }: CookieBannerProps) {
  const message = String(fields.message ?? '');
  const acceptLabel = String(fields.accept_label ?? 'Accept all');
  const customizeLabel = String(fields.customize_label ?? 'Customize cookies');
  const privacyUrl = String(fields.privacy_url ?? '#');

  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-elevated">
      <div className="mx-auto flex max-w-[var(--liberty-max-width)] flex-col items-start justify-between gap-4 px-4 py-4 md:flex-row md:items-center">
        <p className="text-sm text-liberty-gray-mid">
          {message.split('Privacy Policy')[0]}
          <a href={privacyUrl} className="font-medium text-liberty-red hover:underline">
            Privacy Policy
          </a>
          {message.includes('.') ? '.' : ''}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" className="text-sm font-medium text-liberty-dark hover:text-liberty-red">
            {customizeLabel}
          </button>
          <button
            type="button"
            className="rounded-full bg-liberty-red px-5 py-2 text-sm font-semibold text-white hover:bg-liberty-red-dark"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
