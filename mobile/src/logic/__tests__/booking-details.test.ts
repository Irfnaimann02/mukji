import { describe, expect, it } from '@jest/globals';

import type { Dish } from '@/data/types';
import { decodeNote, encodeNote, expandDishIds, preorderSummary, won } from '@/logic/booking-details';

// #50 quantities and contact details fit the existing reservations table
describe('booking-details', () => {
  const dish = (id: string, priceWon: number): Dish => ({
    id,
    nameKo: id,
    nameEn: id,
    priceWon,
    contains: [],
    mayContain: [],
    verifiedCount: 0,
    lastChecked: null,
  });

  it('saves name, phone and request in the note and reads them back', () => {
    const note = encodeNote({ name: ' Nik  Ammar ', phone: '010-1234-5678', request: 'Window\nseat' });
    expect(note).toBe('Name: Nik Ammar\nPhone: 010-1234-5678\nRequest: Window seat');
    expect(decodeNote(note)).toEqual({ name: 'Nik Ammar', phone: '010-1234-5678', request: 'Window seat' });
  });

  it('treats an older free-text note as the request', () => {
    expect(decodeNote('no onions please')).toEqual({ name: '', phone: '', request: 'no onions please' });
    expect(encodeNote({ name: '', phone: '', request: '' })).toBe('');
  });

  it('repeats a dish id once per portion and adds up the pre-order', () => {
    const ids = expandDishIds({ a: 2, b: 1, c: 0 });
    expect(ids).toEqual(['a', 'a', 'b']);

    const summary = preorderSummary([...ids, 'gone'], [dish('a', 4500), dish('b', 500)]);
    expect(summary.items).toBe(3);
    expect(summary.totalWon).toBe(9500);
    expect(summary.lines.map((line) => `${line.qty}x${line.id}`)).toEqual(['2xa', '1xb']);
  });

  it('formats won with thousands separators', () => {
    expect(won(500)).toBe('₩500');
    expect(won(21000)).toBe('₩21,000');
  });
});
