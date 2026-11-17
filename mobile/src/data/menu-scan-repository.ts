import type { ScanImage } from '@/logic/menu-scan';
import { toScannedDishes } from '@/logic/menu-scan';
import { ensureSignedIn } from './auth';
import { supabase } from './supabase';
import type { Dish } from './types';

// #10 part 2: sends a menu photo to the Edge Function scan-menu.
// The photo is not stored anywhere: it goes to the function and the AI, and back come
// dish names and likely ingredients. The app then decides safe / ask first / avoid itself.

export type ScanError = 'not_configured' | 'not_menu' | 'too_big' | 'failed';

export type ScanResult = { ok: true; dishes: Dish[] } | { ok: false; error: ScanError };

// The HTTP status of a failed Edge Function call, when there is one.
function statusOf(error: unknown): number | null {
  const context = (error as { context?: unknown } | null)?.context;
  return context instanceof Response ? context.status : null;
}

export async function scanMenuPhoto(image: ScanImage, scanId: string): Promise<ScanResult> {
  if (!supabase) return { ok: false, error: 'not_configured' }; // no mobile/.env

  try {
    await ensureSignedIn(); // Edge Functions only answer signed-in users (guests count)
    const { data, error } = await supabase.functions.invoke<{ dishes?: unknown; notMenu?: boolean }>(
      'scan-menu',
      { body: { image: image.data, mimeType: image.mimeType } },
    );
    if (error) {
      const status = statusOf(error);
      // 404 = scan-menu not deployed yet, 503 = deployed but no AI secrets.
      if (status === 404 || status === 503) return { ok: false, error: 'not_configured' };
      if (status === 413) return { ok: false, error: 'too_big' };
      console.warn('Menu scan failed:', error);
      return { ok: false, error: 'failed' };
    }
    const dishes = toScannedDishes(data?.dishes, scanId);
    if (dishes.length === 0) return { ok: false, error: 'not_menu' };
    return { ok: true, dishes };
  } catch (error) {
    console.warn('Menu scan failed:', error);
    return { ok: false, error: 'failed' };
  }
}
