/**
 * Domain & Reputation Protection: Trusted Domains Whitelist
 *
 * For domains that are well-established and trusted, Pendekin allows direct (302)
 * redirection. For new or untrusted domains, visitors are sent to an interstitial
 * warning splash screen (2-second preview) with destination URL details to prevent
 * phishing, credential theft, and domain reputation blacklisting.
 */

export const DEFAULT_TRUSTED_DOMAINS = new Set([
  // Global Tech & Cloud Platforms
  'google.com',
  'youtube.com',
  'gmail.com',
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'stackoverflow.com',
  'microsoft.com',
  'live.com',
  'office.com',
  'azure.com',
  'linkedin.com',
  'apple.com',
  'icloud.com',
  'wikipedia.org',
  'wikimedia.org',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'threads.net',
  'whatsapp.com',
  'wa.me',
  't.me',
  'telegram.org',
  'reddit.com',
  'medium.com',
  'substack.com',
  'notion.so',
  'figma.com',
  'slack.com',
  'zoom.us',
  'dropbox.com',
  'canva.com',
  'amazon.com',
  'aws.amazon.com',
  'cloudflare.com',
  'npm.js',
  'npmjs.com',
  'bun.sh',
  'deno.land',

  // Regional & High-Reputation Portals
  'kompas.com',
  'detik.com',
  'liputan6.com',
  'tempo.co',
  'antaranews.com',
  'go.id',
]);

/**
 * Checks whether a given hostname belongs to the trusted domains whitelist.
 * Supports exact domain match as well as subdomains (e.g. docs.github.com -> github.com).
 * Custom domains can be supplied via the TRUSTED_DOMAINS env var (comma-separated).
 */
export function isTrustedDomain(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const cleanHost = hostname.toLowerCase().trim().split(':')[0];

  // Environment-configured whitelist
  const customTrusted = process.env.TRUSTED_DOMAINS;
  if (customTrusted) {
    const customList = customTrusted.split(',').map((d) => d.trim().toLowerCase());
    for (const d of customList) {
      if (cleanHost === d || cleanHost.endsWith('.' + d)) {
        return true;
      }
    }
  }

  // Site's own configured domain (if set)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (siteUrl) {
    try {
      const siteHost = new URL(siteUrl).hostname.toLowerCase();
      if (siteHost && (cleanHost === siteHost || cleanHost.endsWith('.' + siteHost))) {
        return true;
      }
    } catch {}
  }

  for (const d of DEFAULT_TRUSTED_DOMAINS) {
    if (cleanHost === d || cleanHost.endsWith('.' + d)) {
      return true;
    }
  }

  return false;
}
