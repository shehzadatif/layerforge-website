# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

# Layer Forge

Production-ready manufacturing ERP and e-commerce platform built with Astro.

## Features

- Marketing website
- Product catalog
- Materials management
- Customer management
- Quote system
- Quote approval
- Stripe Checkout
- Automatic Quote → Order conversion
- Invoice PDF generation
- Invoice email
- Shipping workflow
- Order tracking
- Manufacturing dashboard
- Admin dashboard
- Products
- Materials
- Orders
- Customers
- Settings
- Secure Admin Authentication
- TOTP MFA
- Role-based authorization

## Tech Stack

- Astro 7
- Supabase
- Stripe
- Resend
- Tailwind CSS
- React
- TypeScript

## Requirements

Node.js 22+

## Installation

npm install

## Environment Variables

Copy:

.env.example

to

.env

Then configure:

- Supabase
- Stripe
- Resend

## Development

npm run dev

## Production Build

npm run build

npm run preview

## Admin Setup

1. Create a Supabase Auth user.
2. Insert the user into `profiles`.
3. Set:

role = 'admin'

4. Log in.
5. Complete MFA enrollment.

## License

Private