interface InfoBoxBlockProps {
  fields: Record<string, unknown>;
}

export default function InfoBoxBlock({ fields }: InfoBoxBlockProps) {
  const title = String(fields.title ?? '');
  const body = String(fields.body ?? '');

  if (!title && !body) {
    return null;
  }

  return (
    <section className="bg-liberty-gray py-10">
      <div className="mx-auto max-w-[var(--liberty-max-width)] px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          {title && <h3 className="text-lg font-bold text-liberty-dark">{title}</h3>}
          {body && <p className="mt-2 text-sm text-liberty-gray-mid">{body}</p>}
        </div>
      </div>
    </section>
  );
}
