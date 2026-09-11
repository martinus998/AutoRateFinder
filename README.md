# AutoRateFinder

U.S.-focused car insurance comparison experience.

## Current status

- Public comparison preview UI
- ZIP / driver / vehicle / coverage intake flow
- No customer phone number required to start
- No real insurer quote is generated until a licensed partner connection is added
- No private API keys or customer PII belong in this repository
- Search engine basics included (`robots.txt`, `sitemap.xml`)
- GitHub Actions security audit included

## Compliance boundary

AutoRateFinder is not an insurance carrier, agency or producer and does not underwrite, bind, sell, solicit or negotiate insurance. Any live quote or policy purchase must be provided through appropriately licensed insurance partners.

## Partner integration

`app.js` contains a blank `PARTNER_URL`. Only a public partner/referral URL may be inserted client-side. Private carrier credentials, API keys, lead-routing secrets or sensitive customer data must be handled server-side.

## Production roadmap

1. Enable GitHub Pages.
2. Add analytics and owner-test exclusion.
3. Connect a licensed insurance comparison / affiliate partner.
4. Add secure consented lead handoff through a backend if personal data is required.
5. Add state-specific SEO landing pages and Search Console verification.
6. Add privacy policy, terms and affiliate disclosure pages before live lead collection.
