# AutoRateFinder live quote integration

AutoRateFinder is prepared to connect to a licensed U.S. car-insurance quote marketplace without exposing private partner credentials in the browser.

## Current status

The public site is still in `pending` mode. The complete comparison flow is built, including vehicle details, usage, mileage, driving history, current insurance, coverage goal, deductible, discounts, quote-sharing consent, live result cards and secure insurer/partner handoff buttons.

No real quote profile is transmitted until a licensed quote partner is approved and the secure server-side endpoint is configured.

## Preferred integration target

MediaAlpha is a strong technical candidate based on its public publisher and Embedded Quote Experience materials. Its public materials describe real-time auto insurance rates, side-by-side comparisons, APIs, carrier-approved listings and direct handoff to carrier websites.

This repository does **not** claim a partnership or affiliation with MediaAlpha. The integration remains inactive until an actual commercial/technical agreement and credentials are received.

## Browser configuration

`app.js` contains a public, non-secret activation block:

- `status: 'pending' | 'live'`
- `providerName`
- `endpoint` — AutoRateFinder's own secure server-side quote proxy
- `allowedRedirectHosts` — exact approved insurer or partner hostnames
- `timeoutMs`
- `consentVersion`

Never place partner secrets, bearer tokens, client secrets, certificates or customer lead exports in the public repository.

## Current normalized request contract

The browser is ready to POST the following shape to the secure AutoRateFinder server-side proxy after explicit quote-sharing consent:

```json
{
  "profile": {
    "version": 2,
    "zip": "33101",
    "ageBand": "25-34",
    "vehicle": {
      "year": "2022",
      "make": "Toyota",
      "model": "Camry",
      "ownership": "financed",
      "use": "commute",
      "annualMileage": "12000"
    },
    "drivingRecord": "clean",
    "currentInsurance": {
      "insured": true,
      "carrier": "GEICO",
      "continuousCoverage": "6-plus-months"
    },
    "coverageGoal": "full",
    "deductible": "$500",
    "discounts": ["low-mileage"]
  },
  "consent": {
    "quoteSharing": true,
    "consentedAt": "ISO-8601 timestamp",
    "consentVersion": "2026-09-17-v1"
  },
  "source": "autoratefinder-web"
}
```

The current front end deliberately does not collect SSN, payment information, driver's-license number or raw credit data. Additional fields should only be added when the chosen licensed partner requires them and the privacy/disclosure language is updated accordingly.

## Supported live responses

### A. Side-by-side quotes

Preferred response when the partner can return carrier-approved quote data:

```json
{
  "quotes": [
    {
      "id": "quote-123",
      "insurer": "Carrier name",
      "monthly": 154,
      "coverage": "Full coverage",
      "deductible": "$500",
      "savings": "$56/mo",
      "purchaseUrl": "https://approved-carrier.example/quote/..."
    }
  ]
}
```

The browser sorts valid quotes by monthly price and renders a `Continue to <carrier>` button. The purchase URL is accepted only when it uses HTTPS and the hostname is explicitly present in `allowedRedirectHosts`.

### B. Licensed hosted quote experience

If the partner requires the customer to finish additional fields in its own approved flow, the proxy can return:

```json
{
  "providerName": "Licensed quote partner",
  "redirectUrl": "https://approved-partner.example/quote/..."
}
```

AutoRateFinder then renders a secure continuation card. The redirect is also restricted by the exact host allowlist.

## Consent and privacy behavior

When live mode is enabled, the final comparison step automatically shows a separate quote-sharing consent checkbox. It explicitly states that quote information may be shared with the licensed quote partner to return insurance options and that this is separate from consent to marketing calls or texts.

No live request is sent until that box is checked.

## Secure proxy requirements

The browser must never call a private partner endpoint with credentials. The server-side proxy must:

1. Accept requests only from the approved AutoRateFinder origin.
2. Validate all required fields.
3. Apply rate limiting and abuse protection.
4. Verify quote-sharing consent.
5. Attach partner credentials from environment secrets only.
6. Map AutoRateFinder fields to the partner's exact schema.
7. Avoid logging the quote profile or sensitive customer data.
8. Normalize partner responses into one of the two supported response shapes above.
9. Return only approved HTTPS carrier/partner destinations.
10. Use `Cache-Control: no-store` for quote responses.

## Activation checklist

1. Obtain publisher/technology approval from a licensed quote marketplace.
2. Receive the partner's API/embedded-quote documentation and compliance requirements.
3. Confirm exactly which consumer fields are required.
4. Update Privacy, Terms and Affiliate Disclosure for the actual partner/data recipients.
5. Deploy the secure server-side proxy.
6. Add partner credentials only as server-side environment secrets.
7. Add exact approved redirect hostnames to `allowedRedirectHosts`.
8. Run sandbox/test quotes end to end.
9. Confirm analytics does not contain quote-profile data.
10. Change `status` to `live` only after all tests and partner approvals pass.

## Remaining external blocker

The code side is prepared. Real carrier prices and insurer purchase links cannot be fabricated or scraped; they must come from an approved licensed partner/carrier feed. The next external step is partner onboarding and receipt of production or sandbox credentials.
