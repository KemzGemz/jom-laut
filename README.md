# AngleX

A marketplace for fishing trips and boat charters in Malaysia: find a trip, pick a date the boat is actually free, book and pay in one flow. The product brief is in [docs/product-brief.md](docs/product-brief.md).

## Run the customer web app

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:3000.

The customer app currently runs on a sample catalogue with no backend. Sign-in needs no password, nothing is charged, and bookings are kept in the browser's localStorage.

## What is in the repo

| Path | What it is | State |
| --- | --- | --- |
| `apps/customer-web` | Next.js customer app: search, trip page, checkout, bookings, wishlist | Working prototype on sample data |
| `apps/api` | NestJS + Fastify API (listings, availability, bookings, payments, finance) | Built, not yet connected to the web app |
| `packages/domain` | Booking state machine, pricing, refunds, slot holds, commission | Unit and property tested |
| `packages/database` | Prisma schema for PostgreSQL | Schema only |
| `packages/shared-types`, `packages/validation`, `packages/api-client` | Shared contracts, Zod schemas, typed API client | Built |
| `infrastructure/docker` | API Dockerfile and docker-compose | Untested |

Operator and admin web apps do not exist yet.

## Customer journey

1. **Home** `/` : search by place, date and anglers; popular trips; trips free this weekend.
2. **Search** `/search` : results for the chosen date only, with filters and sorting held in the URL.
3. **Trip** `/trips/[id]` : photos, operator, inclusions, boat, meeting point, policy, reviews, and a booking card with live availability.
4. **Checkout** `/book/[id]` : slot hold timer, sign-in, trip leader details, pay in full or deposit, policy acceptance.
5. **Bookings** `/bookings` and `/bookings/[ref]` : confirmation, status, payment summary, cancellation with the refund shown first.

Also: `/wishlist`, `/account`, `/login`, `/host` (operator interest form).

## Customer web layout

```
apps/customer-web
  app/          routes (one folder per page)
  components/   shared UI: header, search bar, calendar, trip card
  lib/
    repo.ts     the only way pages read trips; swap this for the API client
    trips.ts    sample catalogue
    store.tsx   session, wishlist and bookings (localStorage)
    pricing.ts  fees, deposits, cancellation policies and refunds (integer sen)
    dates.ts    local calendar-date helpers
    lib.test.ts tests for dates, pricing, availability and search
```

## Other commands

```bash
pnpm test
```

```bash
pnpm --filter @jom-laut/customer-web typecheck
```

```bash
pnpm --filter @jom-laut/customer-web build
```
