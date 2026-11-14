import type { ISODate } from './dates';

export type TripType = 'bottom' | 'jigging' | 'trolling' | 'squid' | 'river' | 'lake' | 'overnight';

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  bottom: 'Bottom fishing',
  jigging: 'Jigging & popping',
  trolling: 'Trolling',
  squid: 'Squid jigging',
  river: 'River & estuary',
  lake: 'Lake fishing',
  overnight: 'Overnight',
};

export type CancellationPolicy = 'flexible' | 'moderate' | 'strict';

export interface Operator {
  name: string;
  verified: boolean;
  since: number;
  responseTime: string;
}

export interface Review {
  author: string;
  rating: number;
  when: string;
  comment: string;
}

/** A bookable listing. One booking = the whole boat for one departure. All money is integer sen. */
export interface Trip {
  id: string;
  seed: number;
  title: string;
  operator: Operator;
  state: string;
  district: string;
  jetty: string;
  tripType: TripType;
  targetSpecies: string[];
  durationHours: number;
  departureTimes: string[];
  priceSen: number;
  /** 0 = pay in full at booking; otherwise the share of the total taken as a deposit. */
  depositPct: number;
  maxAnglers: number;
  boatName: string;
  boatSizeFt: number;
  hasBathroom: boolean;
  instantBooking: boolean;
  cancellation: CancellationPolicy;
  rating: number;
  reviewsCount: number;
  images: string[];
  description: string;
  inclusions: string[];
  exclusions: string[];
  bring: string[];
  reviews: Review[];
}

export type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'boat_size';

export interface SearchQuery {
  state?: string;
  district?: string;
  date?: ISODate;
  anglers?: number;
  types?: TripType[];
  instantOnly?: boolean;
  bathroomOnly?: boolean;
  maxPriceSen?: number;
  minBoatFt?: number;
  sort?: SortKey;
}

export interface User {
  name: string;
  email: string;
  phone?: string;
}

export type BookingStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMethod = 'fpx' | 'card' | 'ewallet';
export type PayOption = 'full' | 'deposit';

export interface Booking {
  ref: string;
  tripId: string;
  userEmail: string;
  date: ISODate;
  time: string;
  anglers: number;
  organiserName: string;
  organiserPhone: string;
  notes: string;
  priceSen: number;
  serviceFeeSen: number;
  totalSen: number;
  /** Amount charged (or authorised, for a request) at checkout. */
  paidSen: number;
  payOption: PayOption;
  method: PaymentMethod;
  status: BookingStatus;
  createdAt: string;
  cancelledAt?: string;
  refundSen?: number;
}
