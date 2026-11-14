/**
 * Sample catalogue. Stands in for the listings API until the backend is wired up;
 * nothing outside `lib/repo.ts` should import from here.
 */
import type { CancellationPolicy, Review, Trip, TripType } from './types';

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=70`;

const BOATS = [
  '1768777272646-522e94b11af3', '1767584471497-6f6ad5bddb66', '1776142519533-bc77f09be745',
  '1778365241196-40f1eaaf64e1', '1622713486130-aa0177e64542', '1598597285544-73cde918c78d',
  '1768718108156-cb475206753d', '1768718108155-075e4fb4b0d6', '1768718108176-dafd3124aed9',
  '1622567817558-3eac5d13fa86', '1615870795127-1c13f1d92997', '1780553562886-528452a6b697',
];
const SUNSET = ['1765120402678-502c67083c98', '1592132886027-b7bbc39a22e5', '1761197379839-b5759e0146a0'];
const FRESHWATER = ['1769764775423-5eb337817eed', '1604336102823-1a4df72dfa26', '1632862316541-0b75b0126544'];
const ACTION = [
  '1551131618-3f0a5cf594b4', '1541742425281-c1d3fc8aff96', '1529230117010-b6c436154f25',
  '1582658085438-790f8837944b', '1550558743-bf871b080c45', '1636612287192-f228cf4b8adc',
  '1537872384762-e785271d14f8', '1545450660-3378a7f3a364',
];
const CATCH = [
  '1506873589908-63bc22175dd7', '1676309448583-fc376f4316b8', '1763047019742-60edc4233593',
  '1601248981876-29b78bd607df', '1551942269-c622c33850ec', '1565930230296-4d04b3c2917a',
];

const pick = <T,>(pool: T[], n: number): T => pool[((n % pool.length) + pool.length) % pool.length]!;

const REVIEWS: [string, string][] = [
  ['Faizal', 'Tekong knew exactly where the fish were. Landed my biggest GT so far.'],
  ['Mei Ling', 'Clean boat, friendly crew and we felt safe the whole way out and back.'],
  ['Arun', 'Booked on Monday, fishing on Saturday. No WhatsApp back-and-forth at all.'],
  ['Nurul', 'Captain was very patient with the kids. They are still talking about it.'],
  ['Danny', 'Good spots and steady bites. Bring your own lunch and plenty of water.'],
  ['Wei Jie', 'Non-stop action from the second drop. The sunset ride home was a bonus.'],
  ['Sofia', 'Rental gear was in good condition and the deckhand rigged everything for us.'],
  ['Ganesh', 'Boat was exactly as pictured. Departed on time from the jetty.'],
  ['Aisyah', 'Sea was a bit choppy but the captain picked sheltered spots. Still a full icebox.'],
  ['Zul', 'First time jigging and the crew coached me through it. Will be back.'],
  ['Hafiz', 'Price was clear upfront, no surprise charges at the jetty.'],
  ['Kavitha', 'Great for a group of friends. Plenty of shade and space to move around.'],
];
const WHEN = ['2 weeks ago', 'last month', '2 months ago', '3 months ago', 'earlier this year'];

type Kind = 'sea' | 'fresh';
/** [title, type, hours, price in RM, max anglers, boat length in ft, target species] */
type Template = [string, TripType, number, number, number, number, string[]];

interface Area {
  prefix: string;
  state: string;
  district: string;
  jetty: string;
  kind: Kind;
  operators: string[];
  trips: Template[];
}

const AREAS: Area[] = [
  {
    prefix: 'marang', state: 'Terengganu', district: 'Marang', jetty: 'Jeti Marang', kind: 'sea',
    operators: ['Kapas Anglers', 'Marang Charter Co.', 'Blue Kapas Fishing'],
    trips: [
      ['Pulau Kapas reef bottom-fishing day', 'bottom', 8, 950, 6, 28, ['Red snapper', 'Grouper', 'Coral trout']],
      ['Candat sotong night trip off Marang', 'squid', 6, 600, 8, 30, ['Squid']],
      ['Kapas–Gemia light jigging session', 'jigging', 6, 850, 4, 24, ['Trevally', 'Queenfish', 'Cobia']],
      ['GT popping run in Marang waters', 'jigging', 10, 1500, 4, 32, ['Giant trevally', 'Spanish mackerel']],
      ['Half-day family fishing near Kapas', 'bottom', 4, 450, 6, 22, ['Snapper', 'Emperor']],
      ['Sunrise tenggiri troll from Marang', 'trolling', 5, 700, 4, 26, ['Spanish mackerel', 'Barracuda']],
      ['Overnight unjam trip, 40 nm offshore', 'overnight', 20, 2400, 8, 40, ['Red snapper', 'Cobia', 'Amberjack']],
      ['Beginner-friendly Marang morning trip', 'bottom', 5, 520, 5, 22, ['Snapper', 'Sweetlips']],
    ],
  },
  {
    prefix: 'kt', state: 'Terengganu', district: 'Kuala Terengganu', jetty: 'Jeti Shahbandar', kind: 'sea',
    operators: ['Shahbandar Charters', 'KT Bluewater'],
    trips: [
      ['Pulau Bidong wreck fishing day', 'bottom', 10, 1400, 6, 34, ['Grouper', 'Red snapper', 'Cobia']],
      ['Kuala Terengganu candat sotong night', 'squid', 6, 650, 10, 34, ['Squid']],
      ['Redang drop-off jigging trip', 'jigging', 10, 1650, 5, 32, ['Dogtooth tuna', 'Amberjack']],
      ['Sungai Terengganu estuary casting', 'river', 4, 380, 3, 18, ['Barramundi', 'Mangrove jack']],
    ],
  },
  {
    prefix: 'kenyir', state: 'Terengganu', district: 'Hulu Terengganu', jetty: 'Pengkalan Gawi, Tasik Kenyir', kind: 'fresh',
    operators: ['Kenyir Toman Guides'],
    trips: [
      ['Tasik Kenyir toman casting day', 'lake', 8, 550, 3, 18, ['Giant snakehead', 'Sebarau']],
      ['Kenyir houseboat fishing overnight', 'overnight', 24, 1800, 8, 45, ['Giant snakehead', 'Kelah', 'Sebarau']],
    ],
  },
  {
    prefix: 'kemaman', state: 'Terengganu', district: 'Kemaman', jetty: 'Jeti Kuala Kemaman', kind: 'sea',
    operators: ['Kemaman Charter Co.'],
    trips: [
      ['Kemaman oil-rig jigging mission', 'jigging', 12, 1900, 6, 36, ['Amberjack', 'Cobia', 'Trevally']],
      ['Kemaman inshore bottom-fishing', 'bottom', 6, 600, 5, 24, ['Snapper', 'Grouper']],
    ],
  },
  {
    prefix: 'rompin', state: 'Pahang', district: 'Rompin', jetty: 'Jeti Kuala Rompin', kind: 'sea',
    operators: ['Rompin Sailfish Charters', 'Billfish Rompin'],
    trips: [
      ['Kuala Rompin sailfish day (catch & release)', 'trolling', 9, 1600, 4, 30, ['Sailfish']],
      ['Rompin light-tackle sailfish & mackerel', 'trolling', 8, 1350, 4, 28, ['Sailfish', 'Spanish mackerel']],
      ['Pulau Berhala bottom & jig combo', 'jigging', 9, 1200, 5, 28, ['Cobia', 'Grouper', 'Trevally']],
    ],
  },
  {
    prefix: 'kuantan', state: 'Pahang', district: 'Kuantan', jetty: 'Jeti Tanjung Lumpur', kind: 'sea',
    operators: ['Kuantan Offshore Co.', 'Tanjung Lumpur Boats'],
    trips: [
      ['Kuantan offshore reef day trip', 'bottom', 9, 1100, 6, 30, ['Red snapper', 'Grouper']],
      ['Kuantan evening squid jigging', 'squid', 5, 500, 8, 28, ['Squid', 'Cuttlefish']],
      ['Sungai Kuantan mangrove casting', 'river', 4, 350, 2, 16, ['Barramundi', 'Mangrove jack']],
    ],
  },
  {
    prefix: 'klang', state: 'Selangor', district: 'Klang', jetty: 'Jeti Pulau Ketam, Pelabuhan Klang', kind: 'sea',
    operators: ['Port Klang Charters', 'Ketam Anglers'],
    trips: [
      ['Pulau Ketam bottom-fishing half day', 'bottom', 5, 480, 6, 24, ['Grouper', 'Snapper', 'Catfish']],
      ['One Fathom Bank jigging day', 'jigging', 10, 1300, 5, 30, ['Queenfish', 'Trevally', 'Cobia']],
      ['Port Klang lighthouse night fishing', 'bottom', 6, 580, 6, 26, ['Threadfin', 'Snapper']],
    ],
  },
  {
    prefix: 'kselangor', state: 'Selangor', district: 'Kuala Selangor', jetty: 'Jeti Pasir Penambang', kind: 'fresh',
    operators: ['Kuala Selangor River Guides'],
    trips: [
      ['Sungai Selangor siakap casting trip', 'river', 5, 400, 3, 17, ['Barramundi', 'Threadfin']],
      ['Kuala Selangor estuary prawn & fish trip', 'river', 4, 320, 4, 18, ['Freshwater prawn', 'Catfish']],
    ],
  },
  {
    prefix: 'tokbali', state: 'Kelantan', district: 'Pasir Puteh', jetty: 'Jeti Tok Bali', kind: 'sea',
    operators: ['Tok Bali Anglers'],
    trips: [
      ['Tok Bali offshore unjam day', 'bottom', 10, 1150, 8, 34, ['Red snapper', 'Cobia']],
      ['Tok Bali candat sotong season trip', 'squid', 6, 550, 10, 34, ['Squid']],
      ['Perhentian-side jigging from Tok Bali', 'jigging', 10, 1450, 5, 30, ['Trevally', 'Amberjack']],
    ],
  },
  {
    prefix: 'mersing', state: 'Johor', district: 'Mersing', jetty: 'Jeti Mersing', kind: 'sea',
    operators: ['Mersing Sport Fishing'],
    trips: [
      ['Pulau Aur overnight offshore trip', 'overnight', 30, 2500, 8, 42, ['Dogtooth tuna', 'Wahoo', 'Grouper']],
      ['Mersing islands bottom-fishing day', 'bottom', 9, 1050, 6, 30, ['Coral trout', 'Snapper']],
      ['Mersing tenggiri trolling morning', 'trolling', 6, 800, 4, 26, ['Spanish mackerel']],
    ],
  },
  {
    prefix: 'langkawi', state: 'Kedah', district: 'Langkawi', jetty: 'Jeti Kuah', kind: 'sea',
    operators: ['Langkawi Reel Time', 'Kuah Charters'],
    trips: [
      ['Langkawi island-hopping fishing half day', 'bottom', 4, 500, 6, 24, ['Snapper', 'Grouper']],
      ['Langkawi sunset trolling cruise', 'trolling', 4, 650, 6, 28, ['Barracuda', 'Queenfish']],
      ['Pulau Payar edge jigging trip', 'jigging', 8, 1250, 4, 28, ['Trevally', 'Cobia']],
    ],
  },
  {
    prefix: 'lumut', state: 'Perak', district: 'Manjung', jetty: 'Jeti Lumut', kind: 'sea',
    operators: ['Lumut Deep Sea Boats'],
    trips: [
      ['Pulau Sembilan bottom-fishing day', 'bottom', 9, 1000, 6, 30, ['Grouper', 'Snapper', 'Trevally']],
      ['Pangkor night squid & fish combo', 'squid', 6, 600, 8, 30, ['Squid', 'Snapper']],
    ],
  },
  {
    prefix: 'temenggor', state: 'Perak', district: 'Gerik', jetty: 'Jeti Pulau Banding, Tasik Temenggor', kind: 'fresh',
    operators: ['Royal Belum Fishing Guides'],
    trips: [
      ['Tasik Temenggor toman & sebarau day', 'lake', 8, 600, 3, 18, ['Giant snakehead', 'Sebarau']],
      ['Royal Belum two-day fishing camp', 'overnight', 30, 2100, 6, 30, ['Kelah', 'Giant snakehead', 'Sebarau']],
    ],
  },
  {
    prefix: 'kk', state: 'Sabah', district: 'Kota Kinabalu', jetty: 'Jeti Jesselton Point', kind: 'sea',
    operators: ['KK Bluewater Fishing'],
    trips: [
      ['Mengalum deep-jigging day trip', 'jigging', 10, 1800, 5, 34, ['Dogtooth tuna', 'Amberjack', 'Ruby snapper']],
      ['Tunku Abdul Rahman islands family trip', 'bottom', 4, 520, 6, 24, ['Snapper', 'Emperor']],
    ],
  },
];

const POLICY_ROTATION: CancellationPolicy[] = ['flexible', 'moderate', 'flexible', 'strict'];
const BOAT_NAMES = ['Sri Kapas', 'Lang Laut', 'Bayu Timur', 'Mutiara', 'Cahaya Laut', 'Seri Ombak', 'Helang Biru', 'Nakhoda', 'Camar', 'Permata'];

function departures(type: TripType, hours: number): string[] {
  if (type === 'squid') return ['18:30'];
  if (type === 'overnight') return ['08:00'];
  if (hours <= 5) return ['07:00', '14:00'];
  return ['07:00'];
}

function build(area: Area, t: Template, index: number, seed: number): Trip {
  const [title, tripType, durationHours, priceRm, maxAnglers, boatSizeFt, targetSpecies] = t;
  const operatorName = pick(area.operators, index);
  const hasBathroom = boatSizeFt >= 28;
  const cover = area.kind === 'fresh' ? pick(FRESHWATER, seed) : tripType === 'squid' ? pick(SUNSET, seed) : pick(BOATS, seed);
  const second = area.kind === 'fresh' ? pick(FRESHWATER, seed + 1) : pick(BOATS, seed + 5);
  const images = [cover, pick(ACTION, seed), pick(CATCH, seed), second, pick(ACTION, seed + 3)].map(img);
  const rating = Math.round((4.55 + ((seed * 7) % 44) / 100) * 100) / 100;

  const reviews: Review[] = [0, 1, 2, 3].map((k) => {
    const [author, comment] = pick(REVIEWS, seed * 3 + k);
    return { author, comment, rating: k === 2 ? 4 : 5, when: pick(WHEN, seed + k) };
  });

  const gear = tripType === 'jigging' ? 'Jigging and popping tackle can be rented on board' : 'Rods, reels and terminal tackle';
  return {
    id: `${area.prefix}-${index + 1}`,
    seed,
    title,
    operator: {
      name: operatorName,
      verified: seed % 5 !== 0,
      since: 2012 + (seed % 10),
      responseTime: seed % 2 === 0 ? 'within an hour' : 'within a few hours',
    },
    state: area.state,
    district: area.district,
    jetty: area.jetty,
    tripType,
    targetSpecies,
    durationHours,
    departureTimes: departures(tripType, durationHours),
    priceSen: priceRm * 100,
    depositPct: priceRm >= 1000 ? 30 : 0,
    maxAnglers,
    boatName: pick(BOAT_NAMES, seed),
    boatSizeFt,
    hasBathroom,
    instantBooking: seed % 3 !== 0,
    cancellation: pick(POLICY_ROTATION, seed),
    rating,
    reviewsCount: 8 + ((seed * 13) % 140),
    images,
    description:
      `Leave from ${area.jetty} with ${operatorName} for ${durationHours >= 20 ? 'an overnight' : `a ${durationHours}-hour`} ` +
      `${area.kind === 'fresh' ? 'freshwater' : 'saltwater'} trip targeting ${targetSpecies.join(', ').toLowerCase()}. ` +
      `The price is for the whole ${boatSizeFt} ft boat, shared by up to ${maxAnglers} anglers, with an experienced captain who fishes these waters every week.`,
    inclusions: [
      'Captain and deckhand',
      'Fuel',
      tripType === 'jigging' ? 'Ice box and ice' : gear,
      'Bait',
      'Life jackets for every angler',
      ...(durationHours >= 8 ? ['Drinking water'] : []),
    ],
    exclusions: [
      ...(tripType === 'jigging' ? ['Jigs and poppers (rental available)'] : []),
      durationHours >= 20 ? 'Meals beyond the first dinner' : 'Meals and snacks',
      'Transport to the jetty',
      'Fish cleaning',
    ],
    bring: ['IC or passport', 'Sun protection and a hat', 'Motion-sickness tablets if you need them', 'A cooler bag for your catch'],
    reviews,
  };
}

export const TRIPS: Trip[] = AREAS.flatMap((area, a) => area.trips.map((t, i) => build(area, t, i, a * 11 + i + 1)));

export const POPULAR_TRIP_IDS = ['rompin-1', 'marang-1', 'kt-2', 'klang-2', 'langkawi-1', 'kenyir-1', 'mersing-1', 'kk-1'];
