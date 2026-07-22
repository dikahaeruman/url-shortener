export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center gap-2.5 group select-none">
      {/* Brand Icon Mark */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200`}
      >
        <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
          <svg
            className="w-4 h-4 text-indigo-400 group-hover:text-cyan-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            {/* Compressed Link / Scissors vector mark */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </div>
      </div>

      {/* Brand Wordmark */}
      <span className={`${textSizes[size]} font-extrabold tracking-tight text-white font-sans flex items-center gap-1`}>
        Pendekin
        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          .andhikadev.my.id
        </span>
      </span>
    </div>
  );
}
