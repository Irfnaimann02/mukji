import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mukji_reservation_records_v1';

export type ReservationStatus =
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type ReservationMethod = 'online' | 'phone';

export interface ReservationRecord {
  restaurantId: string;
  status: ReservationStatus;
  method: ReservationMethod;
  startedAt: string;
  updatedAt: string;
}

export async function getReservationRecords(): Promise<ReservationRecord[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is ReservationRecord =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.restaurantId === 'string' &&
        ['ongoing', 'completed', 'cancelled'].includes(item.status) &&
        ['online', 'phone'].includes(item.method) &&
        typeof item.startedAt === 'string' &&
        typeof item.updatedAt === 'string'
    );
  } catch {
    return [];
  }
}

async function saveRecords(
  records: ReservationRecord[]
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records)
  );
}

export async function startReservation(
  restaurantId: string,
  method: ReservationMethod
): Promise<ReservationRecord[]> {
  const records = await getReservationRecords();
  const now = new Date().toISOString();

  // Do not create a duplicate ongoing record for the same restaurant.
  const existing = records.find(
    (record) =>
      record.restaurantId === restaurantId &&
      record.status === 'ongoing'
  );

  if (existing) return records;

  const next: ReservationRecord[] = [
    {
      restaurantId,
      status: 'ongoing',
      method,
      startedAt: now,
      updatedAt: now,
    },
    ...records,
  ];

  await saveRecords(next);
  return next;
}

export async function updateReservationStatus(
  restaurantId: string,
  status: 'completed' | 'cancelled'
): Promise<ReservationRecord[]> {
  const records = await getReservationRecords();
  const now = new Date().toISOString();

  const updated = records.map((record) =>
    record.restaurantId === restaurantId &&
    record.status === 'ongoing'
      ? {
          ...record,
          status,
          updatedAt: now,
        }
      : record
  );

  await saveRecords(updated);
  return updated;
}

export async function getOngoingReservation(
  restaurantId: string
): Promise<ReservationRecord | undefined> {
  const records = await getReservationRecords();

  return records.find(
    (record) =>
      record.restaurantId === restaurantId &&
      record.status === 'ongoing'
  );
}