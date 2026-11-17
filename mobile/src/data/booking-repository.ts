import { ensureSignedIn } from './auth';
import { supabase } from './supabase';

// #50 The only file that talks to Supabase about booking requests
// (table public.reservations, made in supabase/sql/011 and 012).
// The rules live in the database: a customer creates and cancels their own,
// the restaurant's owner confirms, declines, completes or cancels (026).

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

// Who cancelled a booking. Set by the database (026), never by the app.
export type CancelledBy = 'customer' | 'restaurant';

export interface Booking {
  id: string;
  restaurantId: string;
  reservedFor: string; // ISO date and time
  people: number;
  dishIds: string[]; // pre-ordered dishes
  note: string;
  status: BookingStatus;
  cancelledBy: CancelledBy | null; // null when not cancelled (or before 026 was run)
  createdAt: string;
}

export interface NewBooking {
  restaurantId: string;
  reservedFor: Date;
  people: number;
  dishIds: string[];
  note: string;
}

type Row = {
  id: string;
  restaurant_id: string;
  reserved_for: string;
  people: number;
  dish_ids: string[] | null;
  note: string | null;
  status: BookingStatus;
  cancelled_by?: CancelledBy | null;
  created_at: string;
};

const BASE_COLUMNS = 'id, restaurant_id, reserved_for, people, dish_ids, note, status, created_at';

// cancelled_by only exists once supabase/sql/026 has been run. Until then, every
// request falls back to the old columns, so bookings keep loading either way.
let hasCancelledBy = true;
const UNDEFINED_COLUMN = '42703';

type Result = { data: unknown; error: { code?: string; message: string } | null };

async function withColumns(run: (columns: string) => PromiseLike<Result>): Promise<Result> {
  if (hasCancelledBy) {
    const result = await run(`${BASE_COLUMNS}, cancelled_by`);
    if (result.error?.code !== UNDEFINED_COLUMN) return result;
    hasCancelledBy = false;
  }
  return run(BASE_COLUMNS);
}

function client() {
  if (!supabase) throw new Error('Supabase is not set up (mobile/.env is missing).');
  return supabase;
}

function toBooking(row: Row): Booking {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    reservedFor: row.reserved_for,
    people: row.people,
    dishIds: row.dish_ids ?? [],
    note: row.note ?? '',
    status: row.status,
    cancelledBy: row.status === 'cancelled' ? (row.cancelled_by ?? null) : null,
    createdAt: row.created_at,
  };
}

// Customer: send a booking request. It starts as 'requested'.
export async function createBooking(input: NewBooking): Promise<Booking> {
  await ensureSignedIn();
  const { data, error } = await withColumns((columns) =>
    client()
      .from('reservations')
      .insert({
        restaurant_id: input.restaurantId,
        reserved_for: input.reservedFor.toISOString(),
        people: input.people,
        dish_ids: input.dishIds,
        note: input.note.trim(),
      })
      .select(columns)
      .single(),
  );
  if (error || !data) throw error ?? new Error('The booking was not saved.');
  return toBooking(data as unknown as Row);
}

// Customer: my own requests, soonest first.
export async function listMyBookings(): Promise<Booking[]> {
  const user = await ensureSignedIn();
  const { data, error } = await withColumns((columns) =>
    client().from('reservations').select(columns).eq('user_id', user.id).order('reserved_for', { ascending: true }),
  );
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toBooking);
}

// Owner: every request for the restaurants they own. The database only returns
// rows for restaurants linked to the signed-in owner.
export async function listBookingsForRestaurants(restaurantIds: string[]): Promise<Booking[]> {
  if (restaurantIds.length === 0) return [];
  const { data, error } = await withColumns((columns) =>
    client()
      .from('reservations')
      .select(columns)
      .in('restaurant_id', restaurantIds)
      .order('reserved_for', { ascending: true }),
  );
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toBooking);
}

async function setStatus(id: string, status: BookingStatus): Promise<Booking> {
  const { data, error } = await withColumns((columns) =>
    client().from('reservations').update({ status }).eq('id', id).select(columns).single(),
  );
  if (error || !data) throw error ?? new Error('The booking was not updated.');
  return toBooking(data as unknown as Row);
}

// Customer: cancel my own request. The owner sees it as cancelled in the owner portal.
export function cancelBooking(id: string): Promise<Booking> {
  return setStatus(id, 'cancelled');
}

// Owner: answer a request, or mark a confirmed one as completed after the visit.
// 'cancelled' (026): the restaurant cancels a waiting or confirmed booking, e.g. the
// customer phoned to cancel. The database records it as cancelled by the restaurant.
export type OwnerAction = 'confirmed' | 'declined' | 'completed' | 'cancelled';

export function respondToBooking(id: string, status: OwnerAction): Promise<Booking> {
  return setStatus(id, status);
}
