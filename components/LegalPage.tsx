import Link from 'next/link';
import Logo from './Logo';

interface LegalPageProps {
  children: React.ReactNode;
}

/**
 * Shared chrome for legal-style pages (ToS, Privacy). Same visual
 * language as the rest of the app — neutral-950 background, indigo
 * accent, monospace footer. Keeps a single header/footer in one
 * place so ToS and Privacy can't drift apart.
 */
export default function LegalPage({ children }: LegalPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      <header className="w-full max-w-3xl flex items-center justify-between py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <Link
          href="/"
          className="text-xs font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Back to Pendekin
        </Link>
      </header>

      <main className="w-full max-w-3xl my-8 space-y-8">
        <div className="p-6 sm:p-10 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-8">
          {children}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-neutral-400 font-mono space-x-3">
        <Link href="/terms" className="hover:text-neutral-200 transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-neutral-200 transition-colors">Privacy</Link>
      </footer>
    </div>
  );
}
