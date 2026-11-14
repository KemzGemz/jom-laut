/**
 * Typed API client for Jom Laut (shared by the customer, operator, and admin web apps).
 * Thin wrapper over fetch; the API is the sole source of truth (NFR-ARCH-4).
 */

export interface ClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
}

export interface ApiError {
  code: string;
  message: string;
  correlationId?: string;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly error: ApiError,
  ) {
    super(error.message);
    this.name = 'ApiRequestError';
  }
}

export interface AuthResult {
  user: { id: string; email: string; role: string; fullName: string };
  accessToken: string;
  refreshToken: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListingCard {
  id: string;
  title: string;
  tripType: string;
  maxCapacity: number;
  operator: { displayName: string; approvalStatus: string };
  jetty: { name: string; location: { state: string; district: string } } | null;
  packages: { priceSen: number }[];
  images: { storageKey: string }[];
}

export interface ListingSearchParams {
  state?: string;
  district?: string;
  jettyId?: string;
  date?: string;
  tripType?: string;
  minPrice?: number;
  maxPrice?: number;
  minCapacity?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  pageSize?: number;
}

export class JomLautClient {
  constructor(private readonly options: ClientOptions) {}

  // --- Auth ---
  register(input: { email: string; password: string; fullName: string; phone?: string }): Promise<AuthResult> {
    return this.request('POST', '/auth/register', input, { public: true });
  }
  login(input: { email: string; password: string }): Promise<AuthResult> {
    return this.request('POST', '/auth/login', input, { public: true });
  }
  refresh(refreshToken: string): Promise<{ accessToken: string }> {
    return this.request('POST', '/auth/refresh', { refreshToken }, { public: true });
  }
  me(): Promise<{ sub: string; role: string }> {
    return this.request('GET', '/auth/me');
  }

  // --- Discovery (public) ---
  searchListings(params: ListingSearchParams = {}): Promise<Page<ListingCard>> {
    return this.request('GET', `/discovery/listings${toQuery(params as Record<string, unknown>)}`, undefined, { public: true });
  }
  getListing(id: string): Promise<unknown> {
    return this.request('GET', `/discovery/listings/${id}`, undefined, { public: true });
  }

  // --- Booking (customer) ---
  createHold(slotId: string): Promise<{ id: string; slotId: string; expiresAt: string }> {
    return this.request('POST', '/bookings/holds', { slotId });
  }
  createBooking(
    input: {
      holdId: string;
      packageId: string;
      participantCount: number;
      participants: { name: string; phone?: string; isEmergencyContact?: boolean }[];
      organiserNotes?: string;
    },
    idempotencyKey: string,
  ): Promise<unknown> {
    return this.request('POST', '/bookings', input, { idempotencyKey });
  }
  getBooking(id: string): Promise<unknown> {
    return this.request('GET', `/bookings/${id}`);
  }
  myBookings(page = 1, pageSize = 20): Promise<Page<unknown>> {
    return this.request('GET', `/users/me/bookings${toQuery({ page, pageSize })}`);
  }

  // --- Payments (customer) ---
  initiatePayment(
    bookingId: string,
    method: 'MANUAL_TRANSFER' | 'FPX' | 'CARD' | 'EWALLET',
    idempotencyKey: string,
  ): Promise<{ paymentId: string; redirectUrl?: string }> {
    return this.request('POST', '/payments', { bookingId, method }, { idempotencyKey });
  }
  requestCancellation(bookingId: string, reason: string): Promise<unknown> {
    return this.request('POST', `/bookings/${bookingId}/cancellation-requests`, { reason });
  }

  // --- Operator ---
  registerOperator(input: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', '/operators', input);
  }
  createListing(input: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', '/listings', input);
  }
  addPackage(listingId: string, input: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', `/listings/${listingId}/packages`, input);
  }
  publishListing(listingId: string): Promise<unknown> {
    return this.request('POST', `/listings/${listingId}/publish`, {});
  }
  addSlot(scheduleId: string, input: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', `/schedules/${scheduleId}/slots`, input);
  }
  operatorBookingDecision(bookingId: string, decision: 'accept' | 'reject'): Promise<unknown> {
    return this.request('POST', `/operator/bookings/${bookingId}/${decision}`, {});
  }
  earnings(operatorId: string): Promise<unknown> {
    return this.request('GET', `/operators/${operatorId}/earnings`);
  }

  // --- Admin ---
  approveOperator(operatorId: string, reason?: string): Promise<unknown> {
    return this.request('POST', `/admin/operators/${operatorId}/approve`, { reason });
  }
  moderateListing(listingId: string, decision: 'APPROVED' | 'REJECTED'): Promise<unknown> {
    return this.request('POST', `/admin/listings/${listingId}/moderate`, { decision });
  }
  verifyManualPayment(paymentId: string): Promise<unknown> {
    return this.request('POST', `/admin/payments/${paymentId}/verify`, {});
  }
  setPlatformFee(commissionBasisPoints: number, customerFeeSen?: number): Promise<unknown> {
    return this.request('POST', '/admin/platform-fees', { commissionBasisPoints, customerFeeSen });
  }
  createPayout(operatorId: string, bookingIds: string[]): Promise<unknown> {
    return this.request('POST', `/admin/operators/${operatorId}/payouts`, { bookingIds });
  }
  auditLogs(params: { targetType?: string; targetId?: string; page?: number } = {}): Promise<Page<unknown>> {
    return this.request('GET', `/admin/audit-logs${toQuery(params)}`);
  }

  // --- core request ---
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { public?: boolean; idempotencyKey?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!opts.public) {
      const token = this.options.getToken?.();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

    const res = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      const err = (json as { error?: ApiError } | undefined)?.error ?? { code: 'UNKNOWN', message: res.statusText };
      throw new ApiRequestError(res.status, err);
    }
    return json as T;
  }
}

function toQuery(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  const q = new URLSearchParams();
  for (const [k, v] of entries) q.set(k, String(v));
  return `?${q.toString()}`;
}
