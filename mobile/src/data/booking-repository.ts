import { ensureSignedIn } from './auth';
import { supabase } from './supabase';

// #50 The only file that talks to Supabase about booking requests
// (table public.reservations, made in supabase/sql/011 and 012).
// The rules live in the database: a customer creates and cancels their own,
// the restaurant's owner confirms, declines or completes.

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  restaurantId: string;
  reservedFor: string; // ISO date and time
  people: number;
  dishIds: string[]; // pre-ordered dishes
  note: string;
  status: BookingStatus;
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
  created_at: string;
};

const COLUMNS = 'id, restaurant_id, reserved_for, people, dish_ids, note, status, created_at';

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
    createdAt: row.created_at,
  };
}

// Customer: send a booking request. It starts as 'requested'.
export async function createBooking(input: NewBooking): Promise<Booking> {
  await ensureSignedIn();
  const { data, error } = await client()
    .from('reservations')
    .insert({
      restaurant_id: input.restaurantId,
      reserved_for: input.reservedFor.toISOString(),
      people: input.people,
      dish_ids: input.dishIds,
      note: input.note.trim(),
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw error ?? new Error('The booking was not saved.');
  return toBooking(data as unknown as Row);
}

// Customer: my own requests, soonest first.
export async function listMyBookings(): Promise<Booking[]> {
  const user = await ensureSignedIn();
  const { data, error } = await client()
    .from('reservations')
    .select(COLUMNS)
    .eq('user_id', user.id)
    .order('reserved_for', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toBooking);
}

// Owner: every request for the restaurants they own. The database only returns
// rows for restaurants linked to the signed-in owner.
export async function listBookingsForRestaurants(restaurantIds: string[]): Promise<Booking[]> {
  if (restaurantIds.length === 0) return [];
  const { data, error } = await client()
    .from('reservations')
    .select(COLUMNS)
    .in('restaurant_id', restaurantIds)
    .order('reserved_for', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(toBooking);
}

async function setStatus(id: string, status: BookingStatus): Promise<Booking> {
  const { data, error } = await client()
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error || !data) throw error ?? new Error('The booking was not updated.');
  return toBooking(data as unknown as Row);
}

// Customer: cancel my own request. The owner sees it as cancelled in the owner portal.
export function cancelBooking(id: string): Promise<Booking> {
  return setStatus(id, 'cancelled');
}

// Owner: answer a request, or mark a confirmed one as completed after the visit.
export function respondToBooking(id: string, status: 'confirmed' | 'declined' | 'completed'): Promise<Booking> {
  return setStatus(id, status);
}
