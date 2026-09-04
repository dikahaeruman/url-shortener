import LegalPage from '@/components/LegalPage';
import { Section, LastUpdated } from '@/components/LegalSection';

export const metadata = {
  title: 'Privacy Policy — Pendekin',
  description:
    'What data Pendekin collects, why, how long we keep it, and how to get in touch about your data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage>
      <header className="space-y-3 border-b border-neutral-800 pb-6">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 inline-block">
          Legal
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="text-sm text-neutral-300">
          This page explains what data Pendekin (&ldquo;the
          Service&rdquo;) collects when you shorten or visit a link,
          and what we do with it. The Service is operated by{' '}
          <strong>[FILL IN: full legal name or company name]</strong>{' '}
          (the &ldquo;Operator&rdquo;).
        </p>
        <LastUpdated date="[FILL IN: effective date, e.g. 23 July 2026]" />
      </header>

      <Section number={1} title="Summary (the short version)">
        <ul>
          <li>We store the URL you shorten, a click counter, and an optional title fetched from the destination.</li>
          <li>We use a random client ID in your browser&rsquo;s local storage to remember which links are yours.</li>
          <li>We do not run third-party advertising, analytics, or tracking scripts on the public pages.</li>
          <li>We do not sell your data. There is nothing to sell.</li>
          <li>You can ask us to delete a link at any time by emailing [FILL IN: contact email].</li>
        </ul>
      </Section>

      <Section number={2} title="What data we collect">
        <p><strong>When you create a short link:</strong></p>
        <ul>
          <li>
            The original URL you submitted, and any custom short code
            or expiry you set.
          </li>
          <li>
            A random, opaque client identifier (a UUID) stored in
            your browser&rsquo;s local storage. It is not a tracking
            ID; it exists so the Service can show you the links
            you created from the same browser. Removing your
            localStorage clears the link.
          </li>
          <li>
            The page title of the destination, fetched when the link
            is created. This is stored with the link so it can be
            shown in your dashboard.
          </li>
        </ul>
        <p><strong>When you (or anyone) visits a short link:</strong></p>
        <ul>
          <li>
            The short code itself. We look it up in the database to
            find the destination.
          </li>
          <li>
            A click counter. The counter increments by one on each
            successful redirect. We do not store the visitor&rsquo;s
            IP, user agent, referer, or any other per-visit
            information.
          </li>
        </ul>
        <p><strong>When you use the admin page:</strong></p>
        <ul>
          <li>
            The admin key you enter is stored in your
            sessionStorage so you do not have to re-enter it on
            reload. Clear your sessionStorage to log out.
          </li>
          <li>
            Your IP address is held briefly in the rate-limit
            counters. Counters are stored in process memory and
            are not persisted anywhere.
          </li>
        </ul>
      </Section>

      <Section number={3} title="What we do not collect">
        <ul>
          <li>Cookies (the public site sets none; the admin uses sessionStorage).</li>
          <li>Per-visit IP addresses, user agents, or referrers for the short-link redirect.</li>
          <li>Any third-party analytics, advertising, or fingerprinting.</li>
          <li>Account data, because there are no accounts.</li>
        </ul>
      </Section>

      <Section number={4} title="Why we collect it (legal basis)">
        <p>
          We process the data above on the basis of operating the
          Service you have requested (Art. 6(1)(b) GDPR, or the
          equivalent under other regimes). We do not rely on
          &ldquo;consent&rdquo; for the storage of your short links
          because the storage is functionally required to deliver
          the redirect.
        </p>
      </Section>

      <Section number={5} title="Where the data is stored and who processes it">
        <p>
          Data is stored in a managed PostgreSQL database provided by{' '}
          <strong>[FILL IN: data processor, e.g. Supabase Inc.]</strong>,
          hosted in <strong>[FILL IN: region, e.g. Singapore (AWS ap-southeast-1)]</strong>.
          The Operator acts as data controller; the database
          provider acts as data processor. We do not transfer data
          outside that region.
        </p>
        <p>
          Server access logs (anonymous request metadata) are
          retained on the Operator&rsquo;s own infrastructure for{' '}
          <strong>[FILL IN: retention period, e.g. 7 days]</strong>{' '}
          for debugging and abuse detection.
        </p>
      </Section>

      <Section number={6} title="How long we keep data">
        <ul>
          <li>
            Short links: until you delete them, or until their
            expiry date (if you set one) plus a 30-day grace period
            for housekeeping. After that, the row is permanently
            removed.
          </li>
          <li>
            Click counts: kept as long as the short link exists;
            deleted with it.
          </li>
          <li>
            Server access logs: rotated and discarded per the
            retention period in Section 5.
          </li>
        </ul>
      </Section>

      <Section number={7} title="Who we share data with">
        <p>
          We do not sell, rent, or trade your data. We share data
          only with:
        </p>
        <ul>
          <li>The database hosting provider listed in Section 5.</li>
          <li>
            Law enforcement, if we receive a valid legal order. If
            permitted, we will notify you before disclosing.
          </li>
        </ul>
        <p>
          We do not use any third-party analytics, ad networks, or
          social-media trackers on the public pages.
        </p>
      </Section>

      <Section number={8} title="Your rights">
        <p>
          Depending on where you live, you may have the right to:
        </p>
        <ul>
          <li>Ask what data we hold about you.</li>
          <li>Ask us to correct or delete it.</li>
          <li>Object to processing or ask us to restrict it.</li>
          <li>Lodge a complaint with a data protection authority.</li>
        </ul>
        <p>
          To exercise any of these, email{' '}
          <strong>[FILL IN: contact email]</strong>. We will respond
          within <strong>[FILL IN: response window, e.g. 30 days]</strong>.
        </p>
      </Section>

      <Section number={9} title="Children">
        <p>
          The Service is not directed at children under 13, and we
          do not knowingly collect data from them. If you believe
          a child has used the Service, contact us and we will
          delete the data.
        </p>
      </Section>

      <Section number={10} title="Security">
        <p>
          We take reasonable steps to protect data: TLS in transit,
          row-level security on the database, an admin key for
          administrative access, and rate limits on write paths. No
          system is perfectly secure; if you discover a
          vulnerability, please email{' '}
          <strong>[FILL IN: contact email]</strong>.
        </p>
      </Section>

      <Section number={11} title="Changes to this policy">
        <p>
          We may update this page. The &ldquo;Last updated&rdquo;
          date at the top will change. If the change is material we
          will make a reasonable effort to notify active users.
        </p>
      </Section>

      <Section number={12} title="Contact">
        <p>
          Privacy questions or requests:{' '}
          <strong>[FILL IN: contact email]</strong>.
        </p>
      </Section>

      <div className="border-t border-neutral-800 pt-6 text-xs text-neutral-500 leading-relaxed space-y-2">
        <p>
          <strong>Important note.</strong> This policy is a
          starting point, not legal advice. Indonesia&rsquo;s
          Personal Data Protection Law (UU PDP No. 27/2022), the
          EU GDPR, and similar regimes have specific disclosure,
          consent, and breach-notification requirements that a
          template cannot reliably cover. Please have a qualified
          lawyer review this page before opening the Service to
          users in regulated jurisdictions.
        </p>
      </div>
    </LegalPage>
  );
}
