import Link from 'next/link';
import Logo from '@/components/Logo';
import UrlShortenerSection from '@/components/UrlShortenerSection';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-xl flex items-center justify-between py-4">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Shortener Application */}
      <main className="w-full max-w-xl text-center space-y-6 my-auto">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Pendekin - URL Shortener
          </h1>
          <p className="text-sm text-neutral-300">
            Paste a long URL to generate a fast, clean short link.
          </p>
        </div>

        <UrlShortenerSection />
      </main>

      {/* Minimal Footer with WCAG AAA Compliant Text Contrast */}
      <footer className="py-4 text-center text-xs text-neutral-400 font-mono">
        Pendekin — Fast & Minimal URL Shortener
      </footer>
    </div>
  );
}
