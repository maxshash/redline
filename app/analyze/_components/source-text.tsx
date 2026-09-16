/**
 * The extracted text, shown exactly as it will be analysed and saved. It is
 * the source document's own voice, so it is set in Tinos (DESIGN.md, the
 * Three-Voice Rule).
 */
export function SourceText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <article className={`border-[3px] border-ink bg-panel-field text-ink ${className}`} aria-labelledby="source-text-heading">
      <header className="hairline px-5 py-3.5">
        <h2 id="source-text-heading" className="text-[0.9375rem] font-bold uppercase tracking-[0.06em]">
          Extracted text
        </h2>
        <p className="pt-0.5 font-[family-name:var(--font-panel-narrow)] text-[0.8125rem] uppercase tracking-[0.08em] text-ink-soft">
          What Redline read, word for word
        </p>
      </header>
      <div className="max-h-[30rem] overflow-y-auto px-5 py-5 lg:max-h-[40rem]" tabIndex={0} aria-label="Extracted text">
        {paragraphs.map((paragraph, i) => (
          <p
            key={i}
            className="whitespace-pre-line break-words pb-4 font-[family-name:var(--font-source)] text-[0.9375rem] leading-[1.7] last:pb-0"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
