# AutoRateFinder

AutoRateFinder reviews an existing U.S. auto insurance quote for a one-time $2.99. The report uses the visitor's own premium, deductible and coverage entries. It does not retrieve insurer prices, sell a policy or promise savings.

## Release status

The paid review is **prepared for a preview only**. The Stripe API credential is not configured on the Supabase project, so Checkout cannot be created. The separate experimental Stripe Payment Link is inactive. Do not merge this branch into production or buy advertising until the payment and report flow has passed a live end-to-end check.

## Payment flow

1. `autorate-payments` validates the submitted quote, checks the rate limit and stores a pending order with a hashed browser access token.
2. With `AUTORATE_STRIPE_RESTRICTED_KEY` configured in the Supabase Edge Function secrets, the server creates a one-time Checkout Session using the fixed $2.99 price `price_1UJY8bBVUFmkZjNk8j5djwTJ` and stores its ID with the order.
3. On return, the server retrieves the canonical Stripe Session and verifies the order ID, product metadata, currency, total and paid status before marking the order paid and returning the report. The existing signed `safeorscam-webhook` endpoint also fulfills paid Checkout Sessions. Its verification must remain active when deploying the change.
4. Further report requests require the order ID plus a random access token from the same browser; neither the browser return URL nor the webhook payload alone can unlock an unpaid order.

The Supabase migration is at `supabase/migrations/20260925122000_autorate_orders.sql`. The endpoint source and shared webhook integration are under `supabase/functions/`.

## Activation checklist

- In Stripe, create a **live restricted key** for the connected `Martin Lesko` account with the ability to create and retrieve Checkout Sessions. Save it as `AUTORATE_STRIPE_RESTRICTED_KEY` in the Supabase project `bkyuyqicybqqifenhhux` through its secret settings. Never commit or paste the key into this repository.
- Confirm the existing signed webhook endpoint `safeorscam-webhook` is healthy and receives `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Deploy its updated source along with `autorate-payments` and its dependencies.
- Test a real $2.99 payment using a controlled purchase, verify that the order transitions to paid and the report appears in the same browser, then test an invalid/unpaid Session ID and a repeat webhook delivery. Refund the controlled purchase as appropriate.
- Review the checkout merchant label (currently the connected BillSavings AI account), privacy notice, support address and payout bank ending **3984** before launch.
- Merge and publish the public page only when these checks pass. The inactive Payment Link is not needed for the Checkout Session flow.

The old comparison prototype remains in the repository for history; `index.html` is the proposed paid review homepage.
