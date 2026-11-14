# AI-DLC Project Brief — Fishing Trip & Boat Charter Marketplace

## 1. Document Purpose

This document provides the baseline product, business, design, and technical context for an AI-DLC workflow.

The application is a digital marketplace for discovering, comparing, booking, and managing fishing trips, fishing charters, and related operator services in Malaysia.

The working product name is not final. The broader company or holding brand may be **Forgelion**, while the marketplace may use a separate customer-facing name.

This document should be treated as the current MVP baseline unless a later approved requirement explicitly replaces it.

---

# 2. Product Vision

## 2.1 Vision Statement

Build a trusted and structured marketplace where customers can discover fishing trips, compare operators, check availability, book a trip, make payment, and receive confirmation without relying on fragmented conversations through Facebook, TikTok, WhatsApp, or direct messages.

The platform should also help fishing operators digitise their listings, availability, bookings, customer management, and earnings.

## 2.2 Product Objective

The primary objective is to reduce friction and uncertainty in the fishing-trip booking process.

The platform should:

- centralise fishing-trip and boat-charter listings;
- show clear pricing, trip details, operator information, and availability;
- allow customers to complete a booking through one structured flow;
- help operators manage listings and booking requests;
- reduce double booking and manual scheduling errors;
- create trust through reviews, operator verification, and transparent policies;
- support future marketplace revenue through commissions, service fees, subscriptions, or promoted listings.

## 2.3 Problem Statement

The current fishing-trip and charter market is often fragmented.

Customers may need to:

- search through Facebook groups, TikTok videos, or personal contacts;
- message several operators individually;
- wait for manual replies regarding price and availability;
- rely on incomplete information;
- transfer money without a formal booking record;
- compare operators without a standard format;
- manage cancellations and refunds informally.

Operators may need to:

- answer the same questions repeatedly;
- manually track dates and availability;
- manage bookings through chat messages;
- reconcile payments manually;
- deal with unclear cancellation expectations;
- market themselves across multiple social platforms.

The application should replace this fragmented process with a trusted booking workflow.

---

# 3. Target Market

## 3.1 Initial Market

The initial market is Malaysia.

The MVP should focus on domestic fishing activities such as:

- sea-fishing boat charters;
- river-fishing trips;
- lake-fishing trips;
- guided fishing packages;
- fishing-pond bookings, if validated;
- related fishing packages offered by registered operators.

## 3.2 Initial Geographic Strategy

The MVP should not begin with complex map-based discovery.

The initial search model should use:

- state;
- district or area;
- jetty or departure location;
- fishing destination or zone;
- available date;
- trip type.

Map-based search and live geospatial discovery may be added later.

## 3.3 Primary User Groups

### Customer

A person or group organiser who wants to discover and book a fishing trip.

### Operator

A captain, boat owner, charter operator, fishing guide, pond operator, or company offering fishing-related trips or bookable services.

### Administrator

The marketplace team responsible for approvals, moderation, disputes, refunds, commissions, and platform configuration.

---

# 4. Business Model

The final revenue model should be validated, but the platform should support the following possibilities:

1. Commission charged per completed booking.
2. Customer service or platform fee.
3. Operator subscription plans.
4. Promoted or featured listings.
5. Advertising or brand partnerships.
6. Add-on sales such as equipment rental, bait, food packages, or transport.
7. Financing or insurance partnerships in later phases.

For the MVP, the recommended business model is:

- free operator registration;
- commission or service fee on successfully completed bookings;
- optional manual onboarding for initial operators.

The system must store all monetary values as integers in **sen**, not floating-point ringgit values.

Example:

- RM250.00 should be stored as `25000`.
- RM1,200.50 should be stored as `120050`.

---

# 5. Product Principles

1. **Trust before complexity**  
   Clear operator information, booking records, pricing, and policies are more important than advanced social features.

2. **Complete one transaction well**  
   The MVP must support one complete customer-to-operator booking journey.

3. **Responsive web before native mobile**  
   Native applications should not be required for the first validation phase.

4. **Modular monolith before microservices**  
   The system should remain simple to develop and operate while preserving clear domain boundaries.

5. **Prevent double booking**  
   Availability and slot locking are critical platform responsibilities.

6. **Payment confirmation must be reliable**  
   Payment status should be confirmed through server-side callbacks or webhooks, not only client-side redirects.

7. **Business rules must be explicit**  
   Cancellation, refund, payout, approval, and booking status transitions must be documented and enforced.

---

# 6. MVP Scope

## 6.1 MVP Goal

The MVP should prove that:

1. operators are willing to list fishing trips;
2. customers are willing to search and book through the platform;
3. the platform can reliably manage availability and booking status;
4. a marketplace transaction can be completed with a clear record;
5. the business team can acquire operators and customers at a reasonable cost.

## 6.2 Core MVP Transaction

The minimum complete transaction is:

1. An operator creates a listing.
2. The operator creates available dates or slots.
3. A customer searches for a trip.
4. The customer opens the listing.
5. The customer selects a date or slot.
6. The system temporarily locks the slot.
7. The customer submits booking details.
8. The customer completes payment or follows the configured payment process.
9. The system verifies payment.
10. The booking becomes confirmed or awaits operator approval, depending on listing rules.
11. The operator receives the booking.
12. The customer receives confirmation.
13. The trip is completed or cancelled.
14. The platform records the final booking outcome.

---

# 7. Functional Requirements

## 7.1 Customer Application

The customer application should support:

### Authentication and Profile

- customer registration;
- login and logout;
- password reset;
- customer profile;
- contact details;
- emergency contact, if required later;
- booking history.

### Discovery

- browse listings;
- search by location;
- search by date;
- filter by trip type;
- filter by price range;
- filter by capacity;
- filter by operator rating when review data exists;
- sort by relevance, price, or rating.

### Listing Details

A listing should show:

- title;
- operator name;
- operator verification status;
- trip description;
- departure point or jetty;
- target fishing area;
- trip duration;
- departure and return time;
- boat or venue details;
- maximum passenger capacity;
- package inclusions;
- exclusions;
- equipment availability;
- pricing;
- deposit requirement;
- cancellation policy;
- safety requirements;
- photos;
- availability;
- reviews when available.

### Booking

- select date or slot;
- select package;
- specify number of participants;
- provide participant or organiser information;
- add optional notes;
- view price breakdown;
- accept terms and cancellation policy;
- create booking;
- proceed to payment;
- receive confirmation;
- view booking status.

### Booking Management

- view pending bookings;
- view confirmed bookings;
- view cancelled bookings;
- view completed trips;
- request cancellation;
- view refund status;
- contact support;
- access receipt or booking confirmation.

### Reviews

Reviews may be included late in the MVP or immediately after launch.

A review should only be allowed for completed bookings.

---

## 7.2 Operator Application

The operator application should support:

### Operator Account

- operator registration;
- company or individual profile;
- identity or company verification;
- bank or payout details;
- contact information;
- approval status;
- account suspension status.

### Listing Management

- create listing;
- edit listing;
- upload photos;
- set location and jetty;
- define trip type;
- define package details;
- set price;
- set deposit requirements;
- define inclusions and exclusions;
- define capacity;
- define cancellation policy;
- publish or unpublish listing.

### Availability Management

- create available dates;
- create time slots;
- block unavailable dates;
- mark dates as sold out;
- configure capacity;
- view calendar;
- prevent overlapping availability;
- view temporary slot holds.

### Booking Management

- view new booking requests;
- accept or reject bookings if manual approval is enabled;
- view confirmed bookings;
- view customer information;
- update booking status;
- mark customer as arrived or no-show if required;
- mark trip as completed;
- initiate or respond to cancellation workflow;
- record operational notes.

### Earnings

- view booking totals;
- view commission deductions;
- view payout status;
- view completed payouts;
- export a simple earnings report later.

---

## 7.3 Administrator Application

The administrator application should support:

### User and Operator Administration

- view customers;
- view operators;
- approve or reject operator applications;
- suspend accounts;
- review verification documents;
- manage roles.

### Listing Moderation

- review listings;
- approve or reject listings if moderation is enabled;
- unpublish unsafe or misleading listings;
- manage categories and locations.

### Booking Administration

- view all bookings;
- inspect booking timeline;
- intervene in disputes;
- override status only with audit logging;
- manage cancellations and refunds.

### Financial Administration

- configure platform fees;
- view payments;
- view failed payments;
- view refunds;
- view operator payouts;
- view commission records;
- reconcile transactions.

### Platform Management

- manage cancellation policy templates;
- manage system configuration;
- manage promotional content later;
- view audit logs;
- view basic operational reports.

The admin application may begin as a lightweight internal web interface.

---

# 8. Booking Model

## 8.1 Booking Types

The platform may eventually support:

- instant booking;
- request-to-book;
- full boat booking;
- per-person booking;
- package booking;
- deposit-based booking;
- full-payment booking.

For the first MVP, the recommended model is:

- full boat or package booking;
- request-to-book or instant booking configurable per listing;
- fixed capacity;
- deposit or full payment configurable per listing.

## 8.2 Booking Statuses

Recommended booking states:

- `DRAFT`
- `SLOT_HELD`
- `PENDING_PAYMENT`
- `PAYMENT_PROCESSING`
- `PENDING_OPERATOR_APPROVAL`
- `CONFIRMED`
- `REJECTED`
- `CANCELLATION_REQUESTED`
- `CANCELLED`
- `REFUND_PENDING`
- `REFUNDED`
- `COMPLETED`
- `NO_SHOW`
- `EXPIRED`

Status transitions must be validated by the backend.

Clients must not be allowed to arbitrarily set booking status.

## 8.3 Slot Locking

A temporary slot hold must be created before or during checkout.

The hold should:

- have an expiry timestamp;
- prevent another customer from purchasing the same exclusive slot;
- be released after payment failure or timeout;
- convert into a confirmed reservation only after the required conditions are met;
- be processed safely under concurrent requests.

A database transaction, uniqueness constraint, or other atomic mechanism must protect against double booking.

## 8.4 Idempotency

Booking creation and payment-related operations should support idempotency.

The platform should not create duplicate bookings or payments when:

- a customer clicks twice;
- a request is retried;
- a network timeout occurs;
- a payment provider resends a webhook;
- a background job retries.

---

# 9. Payment, Refund, and Payout Design

## 9.1 Payment Principles

- Never trust only the browser or mobile redirect as proof of payment.
- Confirm payments through a server-to-server webhook or provider API.
- Verify webhook signatures.
- Store provider transaction identifiers.
- Keep an immutable payment event history.
- Make payment processing idempotent.

## 9.2 Initial Payment Options

The exact Malaysian payment provider should be selected during implementation.

Potential methods may include:

- FPX or online banking;
- cards;
- e-wallets;
- manual bank transfer for pilot operators.

Manual transfer may be used during a controlled pilot, but it should not be the long-term primary flow.

## 9.3 Payment Records

A payment record should contain:

- internal payment ID;
- booking ID;
- customer ID;
- amount in sen;
- currency;
- provider;
- provider transaction ID;
- payment status;
- payment method;
- initiated timestamp;
- confirmed timestamp;
- failure reason;
- refund information.

## 9.4 Refunds

Refund logic should depend on:

- operator cancellation;
- customer cancellation;
- cancellation timing;
- weather or safety cancellation;
- force majeure;
- operator-defined policy;
- platform override.

Refund calculations should be implemented as explicit business rules and recorded in an audit trail.

## 9.5 Operator Payouts

For the MVP, operator payouts may be processed manually through an admin-controlled workflow.

The system should still record:

- gross booking amount;
- customer platform fee;
- operator commission;
- refund amount;
- net amount payable;
- payout status;
- payout reference;
- payout date.

---

# 10. Non-Functional Requirements

## 10.1 Security

The system must:

- use secure password handling or a managed identity provider;
- enforce role-based access control;
- validate all user input;
- protect operator and customer personal information;
- use HTTPS;
- store secrets outside source control;
- verify payment webhooks;
- rate-limit sensitive endpoints;
- record administrative actions;
- prevent insecure direct object reference;
- prevent customers from accessing other customers' bookings;
- prevent operators from accessing bookings belonging to other operators;
- scan and validate uploaded files.

## 10.2 Reliability

- Booking and payment operations must be transactional or compensating.
- Background jobs must be retryable.
- Webhook processing must be idempotent.
- Temporary holds must expire automatically.
- Important events must be logged.
- Database backups must be configured.
- Deployment should support rollback.

## 10.3 Performance

Initial targets:

- common API reads should normally respond within 500 ms, excluding third-party calls;
- search results should load within a reasonable consumer-web experience;
- image delivery should use compression and object storage;
- slow external operations should use background processing where practical.

## 10.4 Availability

The MVP does not need enterprise-level multi-region architecture.

A sensible initial target is:

- managed database;
- automated deployment;
- monitoring;
- daily backups;
- production error reporting;
- basic uptime alerting.

## 10.5 Accessibility and Usability

The application should:

- work on mobile browsers;
- use readable text and adequate contrast;
- provide clear error messages;
- avoid requiring technical knowledge;
- support simple Malay and English content later;
- keep booking forms short.

## 10.6 Localisation

The initial technical implementation should be localisation-ready.

Likely languages:

- English;
- Bahasa Melayu.

Initial currency:

- Malaysian Ringgit, `MYR`.

Initial timezone:

- `Asia/Kuala_Lumpur`.

Store timestamps in UTC and convert them for display.

---

# 11. Recommended Technical Architecture

## 11.1 Architecture Style

Use a **modular monolith** for the MVP.

Do not begin with microservices.

The backend should be one deployable API with clear domain modules.

Recommended modules:

- authentication;
- users;
- operators;
- operator verification;
- listings;
- packages;
- availability;
- slot holds;
- bookings;
- payments;
- refunds;
- payouts;
- reviews;
- notifications;
- administration;
- audit logs.

## 11.2 Repository Strategy

Use one monorepo.

Recommended structure:

```text
fishing-marketplace/
├── apps/
│   ├── api/
│   ├── customer-web/
│   ├── operator-web/
│   └── admin-web/
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── api-client/
│   ├── ui/
│   ├── config/
│   └── database/
│
├── docs/
│   ├── product/
│   ├── requirements/
│   ├── architecture/
│   ├── api/
│   └── decisions/
│
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   └── monitoring/
│
├── scripts/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Each application must remain independently deployable.

## 11.3 Frontend Applications

### Customer Web Application

A responsive consumer application.

### Operator Web Application

A responsive operations portal for listing, availability, and booking management.

### Admin Web Application

An internal management portal.

These should remain separate applications even when some UI components are shared.

Do not create one giant frontend filled with role-based conditional rendering.

## 11.4 Native Mobile Applications

Native or cross-platform mobile apps are outside the first MVP.

Potential later additions:

```text
apps/customer-mobile
apps/operator-mobile
```

Possible technologies:

- Flutter;
- React Native.

The API must be designed so future mobile applications can consume it without major backend redesign.

## 11.5 API Style

Use REST for the MVP unless a strong implementation reason justifies GraphQL.

Recommended characteristics:

- JSON over HTTPS;
- versioned API path, for example `/api/v1`;
- OpenAPI documentation;
- typed request and response contracts;
- consistent error format;
- pagination;
- filtering;
- idempotency keys for sensitive writes;
- request correlation IDs.

Example resources:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login

GET    /api/v1/listings
GET    /api/v1/listings/:id

POST   /api/v1/operator/listings
PATCH  /api/v1/operator/listings/:id

POST   /api/v1/operator/listings/:id/availability
GET    /api/v1/operator/bookings

POST   /api/v1/bookings/holds
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
POST   /api/v1/bookings/:id/cancellation-requests

POST   /api/v1/payments
POST   /api/v1/webhooks/payments/:provider

GET    /api/v1/admin/operators
POST   /api/v1/admin/operators/:id/approve
```

## 11.6 Suggested Technology Stack

The implementation team may revise this through an architecture decision record, but the recommended baseline is:

### Monorepo

- pnpm workspaces;
- Turborepo or Nx.

### Frontend

- Next.js;
- TypeScript;
- a reusable component library;
- a query and caching library;
- schema-based form validation.

### Backend

Recommended options:

1. NestJS with Fastify adapter; or
2. Fastify with a disciplined modular structure.

NestJS is preferred when the project benefits from stronger conventions and dependency injection.

### Database

- PostgreSQL.

### ORM

- Prisma or Drizzle.

### Validation

- Zod or framework-compatible schema validation.

### Caching and Temporary Holds

Initial options:

- PostgreSQL-based holds with expiry and constraints; or
- Redis for short-lived holds if operationally justified.

The simplest safe solution should be selected.

### File Storage

- S3-compatible object storage.

### Authentication

Either:

- managed authentication service; or
- secure backend-managed sessions.

The decision should consider cost, team capability, vendor lock-in, and future mobile support.

### Background Jobs

Potential uses:

- booking expiry;
- slot-hold expiry;
- notifications;
- payment reconciliation;
- payout preparation.

Implementation options may include a managed queue or Redis-backed job queue.

### Deployment

Each application should have an independent deployment:

```text
customer.<domain>
operator.<domain>
admin.<domain>
api.<domain>
```

A simpler route-based deployment is also acceptable during development.

---

# 12. Database Domain Model

The exact schema should be designed during the AI-DLC design phase.

Likely core entities include:

## 12.1 Identity and Access

- User
- Role
- Session
- CustomerProfile
- OperatorProfile
- OperatorMember
- VerificationDocument

## 12.2 Marketplace

- Listing
- ListingImage
- Package
- Location
- Jetty
- Boat
- Amenity
- ListingAmenity

## 12.3 Availability

- AvailabilitySchedule
- AvailabilitySlot
- SlotHold
- BlockedDate

## 12.4 Booking

- Booking
- BookingParticipant
- BookingStatusHistory
- CancellationRequest
- CancellationPolicy
- RefundRule

## 12.5 Finance

- Payment
- PaymentEvent
- Refund
- PlatformFee
- Commission
- OperatorPayout
- PayoutItem

## 12.6 Trust and Operations

- Review
- SupportCase
- Notification
- AuditLog

## 12.7 Important Constraints

The database should enforce relevant constraints such as:

- unique operator membership;
- unique provider transaction IDs;
- valid capacity values;
- non-negative monetary values;
- no duplicate completed review per booking;
- valid booking ownership;
- no conflicting exclusive slot reservation;
- valid status transitions through application logic;
- expiry timestamp for temporary holds.

---

# 13. High-Level System Design

```text
Customer Browser
        |
        v
Customer Web Application
        |
        |
Operator Browser ---> Operator Web Application
        |                       |
        |                       |
Admin Browser ------> Admin Web Application
                                |
                                v
                         REST API / Backend
                                |
      ------------------------------------------------------
      |              |              |          |           |
      v              v              v          v           v
 PostgreSQL      Object Storage   Job Queue   Email/SMS   Payment
 Database                                         Provider   Provider
```

The backend should be the only trusted component for:

- booking status changes;
- price calculation;
- payment confirmation;
- refund calculation;
- permission checks;
- availability locking;
- commission calculation.

---

# 14. Main User Journeys

## 14.1 Customer Booking Journey

1. Customer opens the marketplace.
2. Customer searches by location and date.
3. Customer views matching trips.
4. Customer opens a listing.
5. Customer reviews price, capacity, package, operator, and policy.
6. Customer selects an available slot.
7. System creates a temporary hold.
8. Customer enters booking information.
9. Backend calculates the final amount.
10. Customer accepts the terms.
11. Booking is created.
12. Customer proceeds to payment.
13. Payment provider processes the transaction.
14. Backend receives verified payment confirmation.
15. Booking becomes confirmed or pending operator approval.
16. Customer and operator receive notifications.
17. Customer can view the booking in the application.

## 14.2 Operator Onboarding Journey

1. Operator registers.
2. Operator submits profile and verification details.
3. Admin reviews the application.
4. Admin approves or rejects the operator.
5. Approved operator creates a listing.
6. Operator adds packages, prices, availability, and photos.
7. Listing is published directly or after moderation.
8. Operator begins receiving booking requests.

## 14.3 Cancellation Journey

1. Customer or operator initiates cancellation.
2. System identifies the cancellation reason and policy.
3. Backend calculates refund eligibility.
4. Admin review is requested when required.
5. Payment refund is initiated.
6. Booking and refund statuses are updated.
7. Availability is reopened when appropriate.
8. Customer and operator are notified.
9. All actions are recorded.

---

# 15. Notifications

Initial notification channels may include:

- email;
- in-app notification;
- WhatsApp or SMS later.

Important notification events:

- registration confirmation;
- operator approval or rejection;
- new booking;
- booking accepted;
- booking rejected;
- payment confirmed;
- payment failed;
- booking cancelled;
- refund initiated;
- refund completed;
- trip reminder;
- payout completed.

Notification failure should not corrupt the booking transaction.

---

# 16. Audit and Observability

## 16.1 Audit Logging

Audit logs should capture sensitive actions such as:

- operator approval;
- listing moderation;
- booking status override;
- refund approval;
- payout completion;
- fee changes;
- role changes;
- account suspension.

Audit records should include:

- actor;
- action;
- target entity;
- old value when appropriate;
- new value when appropriate;
- timestamp;
- correlation ID;
- reason.

## 16.2 Application Monitoring

The production environment should include:

- centralised logs;
- error monitoring;
- API latency monitoring;
- failed-job monitoring;
- payment webhook failure alerts;
- database backup monitoring;
- uptime monitoring.

---

# 17. Testing Strategy

## 17.1 Unit Testing

Focus on:

- booking status transitions;
- price calculation;
- platform fee calculation;
- refund calculation;
- availability rules;
- slot expiry;
- permissions;
- payout calculations.

## 17.2 Integration Testing

Focus on:

- database transactions;
- booking creation;
- slot locking;
- concurrent booking attempts;
- payment webhook handling;
- idempotency;
- refund flow;
- operator approval;
- file upload validation.

## 17.3 End-to-End Testing

Critical journeys:

1. Customer registers and books an available trip.
2. Two customers attempt to book the same exclusive slot.
3. Payment succeeds.
4. Payment fails.
5. Payment webhook is delivered twice.
6. Slot hold expires.
7. Operator accepts a request-to-book.
8. Operator rejects a booking.
9. Customer cancellation qualifies for partial refund.
10. Operator cancellation qualifies for full refund.
11. Admin suspends an operator.
12. An operator attempts to access another operator's booking.

## 17.4 User Acceptance Testing

UAT should involve:

- actual fishing operators;
- actual or representative customers;
- internal administrators;
- business co-founder;
- technical founder.

---

# 18. MVP Exclusions

The following should generally remain outside the first MVP unless validation proves they are essential:

- live vessel tracking;
- live map discovery;
- AI fishing recommendations;
- social feed;
- community forum;
- loyalty points;
- complex coupon engine;
- dynamic pricing;
- multi-country support;
- multi-currency support;
- insurance marketplace;
- equipment marketplace;
- financing marketplace;
- advanced analytics;
- native customer and operator mobile apps;
- microservices;
- blockchain;
- automated operator payouts without operational validation;
- complex chat platform.

Simple external contact methods may be used initially instead of building a full internal chat system.

---

# 19. Delivery Phases

## Phase 0 — Discovery and Validation

- interview customers;
- interview operators;
- validate booking model;
- validate payment expectations;
- validate cancellation practices;
- validate operator onboarding;
- estimate seed funding;
- confirm initial launch region.

## Phase 1 — Internal Prototype

- authentication;
- operator onboarding;
- listing creation;
- availability;
- customer search;
- booking creation;
- basic admin;
- manual payment or sandbox payment.

## Phase 2 — Pilot MVP

- verified payment integration;
- slot locking;
- cancellation workflow;
- refund records;
- notifications;
- operator earnings view;
- production monitoring;
- onboarding of a small operator group.

## Phase 3 — Commercial MVP

- customer acquisition;
- commission collection;
- improved search;
- reviews;
- payout workflow;
- analytics;
- operational reporting.

## Phase 4 — Expansion

- additional regions;
- native mobile applications;
- add-ons;
- promoted listings;
- richer operator tools;
- automation and partnerships.

---

# 20. Team and Ownership Context

The intended founding structure currently discussed is:

- Technical and product founder: leads product, architecture, software development, technical delivery, security, and platform roadmap.
- Business co-founder: leads financing, partnerships, operator acquisition, sales, commercial strategy, and business operations.

A preliminary ownership concept discussed is:

- Technical and product founder: 70%.
- Business co-founder: 30%.

This is not a legal agreement.

Any final equity structure should be documented through proper founder, vesting, intellectual-property, and shareholders' agreements.

The application source code, infrastructure accounts, domains, payment accounts, and intellectual property should be owned by the company or governed through written agreements, not left solely under one founder's personal control.

---

# 21. Key Open Questions

The AI-DLC workflow should identify and resolve the following questions before implementation is considered complete:

## Product

1. What exact fishing categories are included in the first launch?
2. Is the first booking model instant booking or request-to-book?
3. Is pricing per boat, per package, or per person?
4. Is a deposit sufficient, or is full payment required?
5. Who defines cancellation policies?
6. How is bad-weather cancellation handled?
7. Does the operator need to approve every booking?
8. Are customer reviews needed for the MVP?

## Market

1. Which state, district, or jetty will be the first launch area?
2. How many operators are committed to the pilot?
3. How many listings are needed before customer launch?
4. What operator verification is realistic?
5. What commission rate is commercially acceptable?

## Technical

1. Which payment provider will be used?
2. Which identity approach will be used?
3. Which hosting platform will be used?
4. Should Redis be used initially?
5. Which queue system is appropriate?
6. How will images be moderated?
7. What data retention period is required?
8. What personal data is genuinely necessary?

## Legal and Operations

1. What Malaysian business entity will operate the marketplace?
2. What licences, insurance, or operator documents should be checked?
3. What terms and privacy documents are required?
4. Is the platform acting as agent, marketplace, or direct service provider?
5. Who is responsible for trip safety?
6. How will disputes be handled?
7. How long should operator payouts be held?
8. What refund authority can administrators exercise?

---

# 22. AI-DLC Instructions

The AI-DLC workflow should use this document as product context and proceed through structured stages.

Expected outputs should include:

1. clarified business intent;
2. stakeholder analysis;
3. functional and non-functional requirements;
4. prioritised MVP scope;
5. use cases and user stories;
6. domain model;
7. architecture decision records;
8. database design;
9. API specification;
10. frontend application structure;
11. security and threat considerations;
12. payment and booking sequence diagrams;
13. test strategy;
14. deployment architecture;
15. operational readiness checklist;
16. implementation task breakdown.

The workflow should:

- challenge unclear assumptions;
- identify missing business rules;
- avoid adding non-MVP features without justification;
- preserve the modular-monolith and monorepo baseline unless a documented decision replaces it;
- treat booking consistency, payment verification, authorisation, and auditability as critical;
- produce traceability between requirements, design, implementation tasks, and tests;
- record major design changes as architecture decision records.

---

# 23. Definition of MVP Success

The MVP is considered successful when:

1. approved operators can create and publish valid listings;
2. customers can discover relevant trips;
3. customers can select real availability;
4. the platform can prevent double booking;
5. the customer can complete a valid booking flow;
6. payment status can be verified reliably;
7. operators can manage booking outcomes;
8. administrators can intervene safely;
9. financial records are traceable;
10. pilot users complete real or controlled production bookings;
11. the founding team can measure demand, conversion, operator participation, and operational effort.

---

# 24. Initial Product Metrics

The pilot should track:

- number of approved operators;
- number of active listings;
- searchable available slots;
- customer registrations;
- search-to-listing conversion;
- listing-to-booking conversion;
- booking completion rate;
- payment success rate;
- cancellation rate;
- refund rate;
- average booking value;
- gross booking value;
- platform revenue;
- repeat customer rate;
- operator response time;
- customer support cases;
- disputed bookings;
- cost to acquire an operator;
- cost to acquire a customer.

---

# 25. Final Baseline Decision Summary

Unless changed through a documented decision:

- Market: Malaysia.
- Currency: MYR.
- Timezone: Asia/Kuala_Lumpur.
- Product type: fishing-trip and boat-charter marketplace.
- Initial clients: responsive customer web, operator web, and internal admin web.
- Repository: monorepo.
- Backend: one modular API.
- Architecture: modular monolith.
- API style: REST.
- Database: PostgreSQL.
- Money storage: integer sen.
- File storage: S3-compatible object storage.
- Native mobile apps: later phase.
- Microservices: not for MVP.
- Payment confirmation: server-side webhook verification.
- Double-booking prevention: mandatory.
- Idempotency: mandatory for booking and payment flows.
- Audit logs: mandatory for sensitive administrative and financial actions.
