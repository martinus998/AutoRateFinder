# AutoRateFinder partner integration plan

AutoRateFinder is prepared to connect to a licensed U.S. car-insurance quote partner without placing private partner credentials in the public browser code.

## Current status

The live site remains in preview mode. `partner-integration.js` is deployed in `pending` mode, so the public button continues to say that live partner quotes are opening soon. No quote profile is sent to any insurer or partner yet.

## Supported partner modes

### 1. Redirect / white-label

Use this when the partner gives AutoRateFinder an approved hosted quote URL or white-label destination and does not require AutoRateFinder to transmit the comparison profile.

Set in `partner-integration.js`:

- `status: 'live'`
- `providerName`
- `mode: 'redirect'`
- `redirectUrl`
- `allowedRedirectHosts`
- `requiresProfileSharingConsent: false` if no profile data is transmitted

### 2. API through a secure server-side proxy

Use this when the partner gives AutoRateFinder an API or lead/quote endpoint.

The browser must never call the partner with private credentials. Instead:

1. AutoRateFinder browser sends the quote profile to an AutoRateFinder server-side HTTPS endpoint after explicit quote-sharing consent.
2. The server validates the request and applies rate limiting / origin checks.
3. The server attaches the partner credential from a secret environment variable.
4. The server sends the request to the licensed partner.
5. The server returns only the minimum response needed by the browser, ideally an approved hosted `redirectUrl` or a normalized quote response.

Set in `partner-integration.js` only after the proxy is live:

- `status: 'live'`
- `providerName`
- `mode: 'api'`
- `endpoint` = AutoRateFinder server-side proxy URL, never the private partner endpoint when a browser credential would be required
- `allowedRedirectHosts` = exact partner destination domains

## Current browser quote-profile contract

The browser adapter is ready to send this shape to the AutoRateFinder server-side proxy:

```json
{
  "profile": {
    "version": 1,
    "zip": "33101",
    "ageBand": "25–34",
    "vehicle": {
      "year": "2022",
      "make": "Toyota",
      "model": "Camry"
    },
    "drivingRecord": "clean",
    "coverageGoal": "full",
    "discounts": ["low-mileage"]
  },
  "consent": {
    "quoteSharing": true,
    "consentedAt": "ISO-8601 timestamp",
    "consentVersion": "2026-09-13-v1"
  },
  "source": "autoratefinder-web"
}
```

No analytics identifier, advertising identifier, name, phone number, email, SSN, driver's-license number, payment information or VIN is included by the current adapter.

## Expected proxy response

The safest first integration is a licensed-partner hosted handoff. The browser currently expects:

```json
{
  "redirectUrl": "https://approved-partner.example/quote/..."
}
```

The redirect is accepted only when it is HTTPS and its hostname is explicitly listed in `allowedRedirectHosts`.

## Compliance requirements before LIVE

Before enabling live quote sharing:

- Partner identity or partner category must be clear to the visitor.
- Privacy Notice must reflect the exact data and recipient(s) involved.
- Quote-sharing consent must be separate from any telemarketing/SMS consent.
- Partner terms, privacy notice and required disclosures must be linked where required.
- Demo prices must remain labeled as illustrative until replaced with verified partner output.
- AutoRateFinder must not claim to search the entire market unless the partner can substantiate that claim.
- Private API credentials must remain server-side only.
- Retention and deletion rules for any persisted lead data must be documented.
- A test-mode end-to-end quote flow must pass before LIVE is enabled.

## Activation checklist after partner approval

1. Receive partner technical documentation and compliance requirements.
2. Decide redirect/white-label vs API mode.
3. Map AutoRateFinder fields to the partner-required schema.
4. Add any missing required fields to the quote flow only when necessary.
5. Build and secure the server-side proxy if API mode is used.
6. Add partner secrets as server-side environment variables only.
7. Update Privacy / Terms / Affiliate Disclosure to match the final integration.
8. Add exact allowed redirect hostnames.
9. Run test/sandbox quotes.
10. Verify analytics events contain no quote-profile PII.
11. Change `status` to `live` only after all checks pass.

## Security rule

Never commit partner API keys, bearer tokens, client secrets, private certificates, customer lead exports or production credentials to this public repository.
