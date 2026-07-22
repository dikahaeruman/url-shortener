import Logo from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <a href="/">
          <Logo size="md" />
        </a>
      </header>

      {/* Main 404 Card */}
      <main className="w-full max-w-md my-auto text-center space-y-6">
        <div className="p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-6">
          {/* Glowing 404 Badge & Broken Link Icon */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl animate-pulse"></div>
            <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-900/60 inline-block">
              404 Error
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Page or Short Link Not Found</h1>
            <p className="text-xs text-neutral-300 max-w-xs mx-auto">
              The short link you are trying to visit does not exist, has been removed, or was typed incorrectly.
            </p>
          </div>

          {/* Action Button */}
          <a
            href="/"
            className="inline-flex items-center justify-center w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors min-h-[48px] shadow-lg shadow-indigo-600/20"
          >
            ← Return to Pendekin Home
          </a>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — Fast & Minimal URL Shortener
      </footer>
    </div>
  );
}
