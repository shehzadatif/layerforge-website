# Layer Forge

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

## License

Private.
