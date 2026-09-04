import LegalPage from '@/components/LegalPage';
import { Section, LastUpdated } from '@/components/LegalSection';

export const metadata = {
  title: 'Terms of Service — Pendekin',
  description:
    'The terms under which you may use Pendekin, a free URL shortener operated as a personal project.',
};

export default function TermsPage() {
  return (
    <LegalPage>
      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 inline-block">
          Legal
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Terms of Service</h1>
        <p className="text-sm text-neutral-300">
          Pendekin is provided free of charge as a personal project. By using
          it, you agree to the terms below. Please read them.
        </p>
        <LastUpdated date="[FILL IN: effective date, e.g. 23 July 2026]" />
      </header>

      <Section number={1} title="Who operates this service">
        <p>
          Pendekin (the &ldquo;Service&rdquo;) is operated by{' '}
          <strong>[FILL IN: full legal name or company name]</strong>{' '}
          (&ldquo;the Operator&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
          You can reach us at{' '}
          <strong>[FILL IN: contact email]</strong>.
        </p>
        <p>
          The Service is provided as a personal/non-commercial tool. It is
          not intended for use by children under 13 (or the age of digital
          consent in your jurisdiction, whichever is higher).
        </p>
      </Section>

      <Section number={2} title="What the Service does">
        <p>
          Pendekin lets you create short links that redirect to long
          URLs. You may optionally set a custom short code and a time
          limit (up to 30 days) after which the link stops redirecting.
        </p>
        <p>
          We do not host the destination pages. Once a short link
          redirects, you leave our Service and are subject to the
          destination&rsquo;s terms and policies.
        </p>
      </Section>

      <Section number={3} title="Acceptable use">
        <p>You agree not to use the Service to create short links that:</p>
        <ul>
          <li>
            Point to content that is illegal where you live, where the
            server is located, or where the destination is hosted.
          </li>
          <li>
            Distribute malware, phishing pages, or other deceptive
            content. This includes links that pretend to be a known
            brand when they are not.
          </li>
          <li>
            Facilitate harassment, doxxing, threats, or non-consensual
            intimate imagery.
          </li>
          <li>
            Infringe intellectual property rights (copyrights,
            trademarks, trade secrets).
          </li>
          <li>
            Are designed to evade spam filters, ad-blockers, or
            security tools (&ldquo;cloaking&rdquo;).
          </li>
        </ul>
        <p>
          You also agree not to attempt to disrupt the Service:
          scraping at high volume, automated creation of links,
          probing, brute-forcing short codes, or attempting to bypass
          rate limits.
        </p>
      </Section>

      <Section number={4} title="Our right to remove links">
        <p>
          We may disable or delete any short link, with or without
          notice, if we reasonably believe it violates these terms,
          poses a security risk, or is required to do so by law.
          Where possible we will try to contact the creator first.
        </p>
        <p>
          We are under no obligation to pre-screen links, and the
          absence of action on a particular link is not an
          endorsement of it.
        </p>
      </Section>

      <Section number={5} title="Your content">
        <p>
          You retain all rights in the URLs and other content you
          submit. You grant us a limited, non-exclusive, royalty-free
          license to host, store, and redirect that content as needed
          to operate the Service.
        </p>
        <p>
          You confirm that you have the right to share any URL you
          shorten through the Service.
        </p>
      </Section>

      <Section number={6} title="No warranty">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;. To the maximum extent permitted by law, we
          disclaim all warranties, express or implied, including the
          implied warranties of merchantability, fitness for a
          particular purpose, and non-infringement. We do not warrant
          that the Service will be uninterrupted, secure, or
          error-free, or that any link will remain available for any
          specific period of time.
        </p>
      </Section>

      <Section number={7} title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the Operator will
          not be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of or
          related to your use of the Service. Where liability cannot
          be excluded, it is capped at the amount you have paid us in
          the twelve (12) months preceding the claim (which, given
          the Service is free, is zero).
        </p>
      </Section>

      <Section number={8} title="Indemnification">
        <p>
          You agree to defend, indemnify, and hold harmless the
          Operator from any claims, damages, or expenses (including
          reasonable legal fees) arising from your use of the
          Service, your content, or your violation of these terms.
        </p>
      </Section>

      <Section number={9} title="Changes to the Service and to these terms">
        <p>
          We may change, suspend, or discontinue the Service at any
          time, with or without notice. We may also update these
          terms; the &ldquo;Last updated&rdquo; date at the top of
          this page will reflect the change. Continued use after a
          change means you accept the new terms.
        </p>
      </Section>

      <Section number={10} title="Governing law and disputes">
        <p>
          These terms are governed by the laws of{' '}
          <strong>[FILL IN: jurisdiction, e.g. the Republic of Indonesia]</strong>.
          Any dispute will be resolved in the courts of{' '}
          <strong>[FILL IN: venue, e.g. Jakarta, Indonesia]</strong>, unless
          applicable consumer law gives you the right to bring the
          claim in your own jurisdiction.
        </p>
      </Section>

      <Section number={11} title="Contact">
        <p>
          Questions about these terms? Email{' '}
          <strong>[FILL IN: contact email]</strong>. We try to
          respond within a reasonable time, but we are not always
          available.
        </p>
      </Section>

      <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-500 leading-relaxed space-y-2">
        <p>
          <strong>Important note.</strong> These terms are a
          starting point, not legal advice. Before you launch the
          Service to the public, please have a qualified lawyer
          review this page and the Privacy Policy. Self-drafted ToS
          can create liability they are meant to prevent.
        </p>
      </div>
    </LegalPage>
  );
}
