# AngleX

A marketplace for fishing trips and boat charters in Malaysia: find a trip, pick a date the boat is actually free, book and pay in one flow. The product brief is in [docs/product-brief.md](docs/product-brief.md).

## Run the web app

```bash
pnpm install
```

```bash
pnpm dev
```

Then open http://localhost:3000.

The app currently runs on a sample catalogue with no backend. Sign-in needs no password, nothing is charged, and everything you change (bookings, closed dates, listing edits) is kept in the browser's localStorage.

The operator side is at http://localhost:3000/operator. Pick one of the sample operators to see their dashboard, or register a new one at http://localhost:3000/host.

## Hosting the demo

`amplify.yml` builds the web app on AWS Amplify Hosting (app root `apps/customer-web`). The site shows a demo banner on every page and tells search engines not to index it. The shared password is set in the Amplify console under Access control, not in the code.

## What is in the repo

| Path | What it is | State |
| --- | --- | --- |
| `apps/customer-web` | Next.js app with both sides of the marketplace: customer booking flow and operator dashboard | Working prototype on sample data |
| `apps/api` | NestJS + Fastify API (listings, availability, bookings, payments, finance) | Built, not yet connected to the web app |
| `packages/domain` | Booking state machine, pricing, refunds, slot holds, commission | Unit and property tested |
| `packages/database` | Prisma schema for PostgreSQL | Schema only |
| `packages/shared-types`, `packages/validation`, `packages/api-client` | Shared contracts, Zod schemas, typed API client | Built |
| `infrastructure/docker` | API Dockerfile and docker-compose | Untested |

An admin app does not exist yet.

## Customer journey

1. **Home** `/` : search by place, date and anglers; popular trips; trips free this weekend.
2. **Search** `/search` : results for the chosen date only, with filters and sorting held in the URL.
3. **Trip** `/trips/[id]` : photos, operator, inclusions, boat, meeting point, policy, reviews, and a booking card with live availability.
4. **Checkout** `/book/[id]` : slot hold timer, sign-in, trip leader details, pay in full or deposit, policy acceptance.
5. **Bookings** `/bookings` and `/bookings/[ref]` : confirmation, status, payment summary, cancellation with the refund shown first.

Also: `/wishlist`, `/account`, `/login`, `/host` (operator sign-up).

## Operator journey

Everything lives under `/operator`, and both sides share one set of rules, so what an operator does shows up for customers straight away.

1. **Overview** `/operator` : requests waiting for a reply, trips in the next 7 days, earnings.
2. **Bookings** `/operator/bookings` and `/operator/bookings/[ref]` : accept or decline a request, cancel a trip with a full refund, see the payout.
3. **Calendar** `/operator/calendar` : one month per listing; close or reopen a date.
4. **Listings** `/operator/listings` : edit price, departures, photos, booking mode and policy; pause a listing; publish a new one.
5. **Earnings** `/operator/earnings` : payout per month and per trip after the 10% commission (a placeholder rate).

New operators register at `/host`, which creates their account and takes them to their first listing. Photos are shrunk in the browser and kept in localStorage.

After a completed trip the customer can rate it on the booking page; the review appears on the trip page and on the operator's booking. A confirmed booking has a prototype-only link to mark it completed.

To try the full loop: request a trip marked "Request to book" as a customer, then use the link on the booking page to open that request as its operator.

## Web app layout

```
apps/customer-web
  app/          routes (one folder per page; operator pages under app/operator)
  components/   shared UI: header, search bar, calendar, trip card
  lib/
    repo.ts     the sample catalogue's entry point; swap this for the API client
    market.ts   the live marketplace rules: bookings, closed dates, listing edits, payouts
    live.ts     React hooks over market.ts for customer and operator pages
    trips.ts    sample catalogue
    store.tsx   session, wishlist, bookings and operator changes (localStorage)
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
