# AutoRateFinder

U.S.-focused car insurance comparison experience built around trust, apples-to-apples coverage comparison, privacy-first intake and transparent quote status.

## Product principles

- No phone number required to start.
- Clearly distinguish a live quote, an estimate and sponsored placement.
- Compare matching coverage and deductibles instead of headline prices only.
- Explain why a final carrier price can change.
- Surface discount opportunities and deductible trade-offs.
- Never present a made-up price as a real insurer quote.
- No hidden telemarketing consent.
- Disclose partner compensation and sponsored results.
- Live purchase/referral goes only through appropriately licensed insurance partners.

## Current status

- Public comparison preview UI
- ZIP / driver / vehicle / coverage intake flow
- Privacy-first quote flow
- Consent-aware GA4 analytics
- Google Search Console / sitemap / SEO tracking
- GitHub Actions security audit
- Partner integration adapter prepared in fail-closed `pending` mode
- Secure server-side partner proxy template prepared for partner API mapping
- Live carrier/affiliate approval and credentials still pending

## Partner integration

See `PARTNER_INTEGRATION.md` for the activation checklist and browser/proxy contract. The public site remains in preview mode until a licensed quote partner is approved and the final integration passes test-mode validation.

## Security boundary

No private API keys, insurer credentials, payment secrets or customer PII belong in this public repository. Any future lead handoff containing personal information must go through a secure server-side backend with explicit consent and retention/deletion controls.

## Compliance boundary

AutoRateFinder is not an insurance carrier, agency or producer and does not underwrite, bind, sell, solicit or negotiate insurance. Final quotes and policies must be offered by appropriately licensed insurers, agencies or producers.
