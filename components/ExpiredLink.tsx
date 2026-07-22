import Link from 'next/link';
import Logo from './Logo';

interface ExpiredLinkProps {
  shortCode: string;
}

export default function ExpiredLink({ shortCode }: ExpiredLinkProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Expired Message */}
      <main className="w-full max-w-md my-auto text-center space-y-6">
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-900/60 flex items-center justify-center mx-auto text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-1">
            <h1 className="text-lg font-bold text-white">Link Has Expired</h1>
            <p className="text-xs text-neutral-300">
              The short link <span className="font-mono text-indigo-400">/{shortCode}</span> reached its expiration time and is no longer active.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Create a New Short Link
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — Expired Link
      </footer>
    </div>
  );
}
