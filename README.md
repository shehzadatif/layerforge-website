# Layer Forge Canada

Production manufacturing and e-commerce platform deployed on Cloudflare
Workers with Supabase, Stripe, and Resend.

## Features

- Marketing website and product catalog
- Configurable product variants with independent pricing and images
- Customer quotes, approval, and Stripe Checkout
- Automatic quote-to-order conversion
- Invoice PDF generation and payment confirmation emails
- Retry-safe customer and admin paid-order notifications
- Production estimates, shipping, and public order tracking
- Products, materials, quotes, orders, customers, finance, and settings admin
- Supabase admin authentication with required TOTP MFA

## Tech stack

- Astro 7 and React 19
- Cloudflare Workers
- Supabase
- Stripe
- Resend
- Tailwind CSS 4
- TypeScript

## Requirements

- Node.js 22.12 or newer

## Local setup

1. Install dependencies with `npm install`.
2. Copy `env.example` to `.env` and configure Supabase, Stripe, Resend, and
   application values.
3. Start development with `npm run dev`.

## Validation

- `npm run format:check` checks launch-critical files.
- `npm test` runs the automated test suite once.
- `npm run test:watch` runs tests during development.
- `npm run build` creates the production Cloudflare Worker build.

Pull requests and pushes to `main` run formatting, tests, and the production
build in GitHub Actions.

## Admin setup

1. Create a Supabase Auth user.
2. Insert the user into `profiles` with `role = 'admin'`.
3. Log in and complete TOTP MFA enrollment.

## Admin website analytics

The Admin Dashboard can display aggregated Cloudflare traffic for the production
hostname. Create a Cloudflare API token with read-only Zone Analytics access,
then configure these server-only values:

- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_ANALYTICS_API_TOKEN`
- `CLOUDFLARE_ANALYTICS_HOSTNAME` (optional when `PUBLIC_SITE_URL` is set)

The dashboard uses Cloudflare visits and successful HTML page views. It does
not retrieve, display, or store raw visitor IP addresses.

## Bambu Studio quote refinement

The 3D quote page can refine its immediate browser estimate with an asynchronous
Bambu Studio slice through Cloud Slicer. Create a Cloud Slicer API token, a
Bambu Lab P1S printer profile with the 0.4 mm nozzle, and one filament profile
for each material you want to enable. Configure the matching
`CLOUD_SLICER_*` server-only values shown in `env.example`.

The integration sends the STL directly to a one-time anonymous upload URL,
keeps the API token and Layer Forge Canada pricing on the server, and requests
immediate deletion of the uploaded model, generated G-code, and provider quote
after the result is retrieved or cancelled. The immediate browser estimate
remains available when the integration is unconfigured, unavailable, or cannot
slice a model.

## License

Private.
