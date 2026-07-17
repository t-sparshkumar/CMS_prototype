interface ParagraphBlockProps {
  fields: Record<string, unknown>;
}

export default function ParagraphBlock({ fields }: ParagraphBlockProps) {
  const body = String(fields.body ?? '');
  if (!body.trim()) {
    return null;
  }

  return (
    <section className="bg-white py-10">
      <div
        className="prose prose-slate mx-auto max-w-[var(--liberty-max-width)] px-4"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </section>
  );
}
