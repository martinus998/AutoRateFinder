# Security and data-handling policy

AutoRateFinder is currently a public static comparison preview.

## Never commit

- private insurer or affiliate API credentials
- Stripe or payment secrets
- `.env` files
- private keys or certificates
- customer names, phone numbers, email addresses or government identifiers
- quote payloads containing personal information

## Production data boundary

If AutoRateFinder begins collecting personal information or handing a lead to a licensed partner, that flow must move through a secured server-side backend. The production design should include authenticated or narrowly scoped requests, encrypted transport and storage where applicable, explicit partner-sharing consent, least-privilege access, retention limits, deletion controls, rate limiting and abuse protection.

## Insurance boundary

AutoRateFinder must not invent insurer prices or represent educational estimates as live quotes. Live quote or policy actions must be supplied by appropriately licensed insurance partners.

## Recovery

Keep periodic backup branches and an independent/off-account repository backup before major releases. GitHub account MFA/passkeys should remain enabled.
