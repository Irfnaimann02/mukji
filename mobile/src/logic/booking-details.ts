import type { Dish } from '@/data/types';

// #50 How a booking's extra details fit the existing reservations table,
// so no database change is needed:
//   - quantity per dish: the dish id is repeated in dish_ids (2 portions = listed twice)
//   - name, phone and request: saved together in `note` as labelled lines

export const MAX_DISH_QTY = 9;
export const NAME_MAX = 60;
export const PHONE_MAX = 30;
export const REQUEST_MAX = 380; // the whole note must stay within the database's 500 characters

export interface BookingContact {
  name: string;
  phone: string;
  request: string;
}

const LABELS = { name: 'Name: ', phone: 'Phone: ', request: 'Request: ' } as const;

// { name: 'Ali', phone: '010-1234-5678', request: 'Window seat' }
// -> 'Name: Ali\nPhone: 010-1234-5678\nRequest: Window seat'
export function encodeNote(contact: BookingContact): string {
  const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
  const lines: string[] = [];
  const name = oneLine(contact.name).slice(0, NAME_MAX);
  const phone = oneLine(contact.phone).slice(0, PHONE_MAX);
  const request = oneLine(contact.request).slice(0, REQUEST_MAX);
  if (name) lines.push(LABELS.name + name);
  if (phone) lines.push(LABELS.phone + phone);
  if (request) lines.push(LABELS.request + request);
  return lines.join('\n');
}

// The reverse. A note without labels (an older booking) is treated as the request.
export function decodeNote(note: string): BookingContact {
  const contact: BookingContact = { name: '', phone: '', request: '' };
  const rest: string[] = [];
  for (const line of note.split('\n')) {
    if (line.startsWith(LABELS.name)) contact.name = line.slice(LABELS.name.length).trim();
    else if (line.startsWith(LABELS.phone)) contact.phone = line.slice(LABELS.phone.length).trim();
    else if (line.startsWith(LABELS.request)) contact.request = line.slice(LABELS.request.length).trim();
    else if (line.trim()) rest.push(line.trim());
  }
  if (rest.length > 0) contact.request = [contact.request, ...rest].filter(Boolean).join(' ');
  return contact;
}

// { a: 2, b: 1 } -> ['a', 'a', 'b']
export function expandDishIds(quantities: Record<string, number>): string[] {
  return Object.entries(quantities).flatMap(([id, qty]) => Array.from({ length: Math.max(0, qty) }, () => id));
}

export interface PreorderLine {
  id: string;
  nameKo: string;
  nameEn: string;
  qty: number;
  lineTotalWon: number;
}

// ['a', 'a', 'b'] + the restaurant's dishes -> lines with quantity and price, plus the total.
// A dish that is no longer on the menu is left out.
export function preorderSummary(
  dishIds: string[],
  dishes: Dish[],
): { lines: PreorderLine[]; items: number; totalWon: number; unpricedItems: number } {
  const counts = new Map<string, number>();
  for (const id of dishIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const lines: PreorderLine[] = [];
  for (const [id, qty] of counts) {
    const dish = dishes.find((d) => d.id === id);
    if (dish) lines.push({ id, nameKo: dish.nameKo, nameEn: dish.nameEn, qty, lineTotalWon: qty * dish.priceWon });
  }
  return {
    lines,
    items: lines.reduce((sum, line) => sum + line.qty, 0),
    totalWon: lines.reduce((sum, line) => sum + line.lineTotalWon, 0),
    // dishes with no price on the source (price 0) are not in totalWon
    unpricedItems: lines.reduce(
      (sum, line) => sum + (dishes.find((d) => d.id === line.id)?.priceWon ? 0 : line.qty),
      0,
    ),
  };
}

// The pre-order total as shown to people. Chain and typical dishes often have no price (0):
//   all priced -> '₩9,000'; some without a price -> '₩4,500 + ?'; none priced -> '?'.
export function preorderTotalLabel(summary: { totalWon: number; unpricedItems: number }): string {
  if (summary.unpricedItems === 0) return won(summary.totalWon);
  if (summary.totalWon === 0) return '?';
  return `${won(summary.totalWon)} + ?`;
}

// 4500 -> '₩4,500'
export function won(amount: number): string {
  return `₩${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
