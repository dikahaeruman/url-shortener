interface SectionProps {
  number?: number;
  title: string;
  children: React.ReactNode;
}

export function Section({ number, title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg sm:text-xl font-bold text-white flex items-baseline gap-2">
        {number !== undefined && (
          <span className="text-xs font-mono font-semibold text-indigo-400">
            {String(number).padStart(2, '0')}
          </span>
        )}
        <span>{title}</span>
      </h2>
      <div className="text-sm text-neutral-300 leading-relaxed space-y-3 [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:text-neutral-100">
        {children}
      </div>
    </section>
  );
}

export function LastUpdated({ date }: { date: string }) {
  return (
    <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
      Last updated: {date}
    </p>
  );
}
