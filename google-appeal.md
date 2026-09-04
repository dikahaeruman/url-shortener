# Google Safe Browsing Appeal — pendekin.andhikadev.my.id

Submit at:
- https://safebrowsing.google.com/safebrowsing/report_error/?url=https://pendekin.andhikadev.my.id
  (Report incorrect phishing warning — no Search Console verification needed)
- Or Search Console: https://search.google.com/search-console/security-issues (after verifying the domain)

Expected turnaround for phishing flags: ~1 day; warning lifts within 72h if approved.

---

## Message (English, paste as-is)

Site: https://pendekin.andhikadev.my.id

### Summary of the issue

Pendekin is a personal URL shortener service operated by the site owner. In early
September 2026, an unauthorized user abused the public link-creation endpoint to
create a short URL (https://pendekin.andhikadev.my.id/HNigMK) that redirected to an
external phishing page. Google Safe Browsing subsequently flagged the domain as
unsafe.

### Actions taken to remediate

1. Malicious link removed. The offending short URL HNigMK was identified and
   permanently deleted from the service database. Every request to that link now
   returns a 404 "not found" page (verified). No redirect to the phishing content
   exists anymore.
2. Full content audit. All remaining links stored on the service were reviewed.
   They are legitimate personal/work links (Microsoft Teams meeting invitations,
   internal tool pages, news articles). No other phishing or harmful content was
   found on the domain.
3. Abuse prevention added:
   - Every new shortened URL is now screened against the Google Safe Browsing
     v4 threatMatches API (phishing, malware, unwanted software) at creation
     time; flagged URLs are rejected automatically before going live.
   - Link-creation rate limiting now uses the real client IP (X-Real-IP set by
     the reverse proxy) instead of a client-controllable header, preventing
     automated mass creation of abusive links from one origin.
   - Existing protections confirmed in place: SSRF-safe URL validation (blocks
     private/loopback targets), per-IP rate limits, request size caps, and
     admin access protected by a secret key with constant-time comparison.
4. Monitoring. The site owner continues to monitor the service for abuse and
   removes abusive links promptly.

### Request

The flagged content has been fully removed and additional protections are in
place to prevent recurrence. Please re-review https://pendekin.andhikadev.my.id
and remove it from the Safe Browsing unsafe list.

Thank you.