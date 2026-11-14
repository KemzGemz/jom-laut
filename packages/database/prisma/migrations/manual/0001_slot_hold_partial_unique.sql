-- Double-booking prevention (FR-AVAIL-8, US-9).
-- Prisma's schema cannot express a PARTIAL unique index, so it is applied here.
-- Guarantees at most ONE active hold per exclusive slot under concurrency.
--
-- Apply after `prisma migrate` (or include in a migration's steps):
--   psql "$DATABASE_URL" -f 0001_slot_hold_partial_unique.sql

CREATE UNIQUE INDEX IF NOT EXISTS "slot_hold_active_unique"
  ON "SlotHold" ("slotId")
  WHERE ("active" = true);

-- Non-negative money guards (Section 12.7). Prisma stores these as Int; enforce >= 0 at the DB.
ALTER TABLE "Package"        ADD CONSTRAINT "package_price_nonneg"    CHECK ("priceSen" >= 0);
ALTER TABLE "Booking"        ADD CONSTRAINT "booking_total_nonneg"    CHECK ("totalSen" >= 0 AND "amountDueNowSen" >= 0);
ALTER TABLE "Payment"        ADD CONSTRAINT "payment_amount_nonneg"   CHECK ("amountSen" >= 0);
ALTER TABLE "Refund"         ADD CONSTRAINT "refund_amount_nonneg"    CHECK ("amountSen" >= 0);
ALTER TABLE "Commission"     ADD CONSTRAINT "commission_nonneg"       CHECK ("grossSen" >= 0 AND "commissionSen" >= 0 AND "netToOperatorSen" >= 0);
