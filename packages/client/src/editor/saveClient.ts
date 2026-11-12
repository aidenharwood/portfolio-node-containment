import type { DistrictId, DistrictLayout } from '@containment/shared';

export type SaveOutcome = { readonly ok: true } | { readonly ok: false; readonly error: string };

export async function saveDistrict(id: DistrictId, layout: DistrictLayout): Promise<SaveOutcome> {
  try {
    const response = await fetch(`/__editor/layouts/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(layout) });
    const body = (await response.json().catch(() => ({ ok: false, error: `The server answered ${response.status}.` }))) as SaveOutcome;
    return response.ok && body.ok ? { ok: true } : { ok: false, error: body.ok ? `The server answered ${response.status}.` : body.error };
  } catch (error) {
    return { ok: false, error: `Saving needs npm run dev: ${(error as Error).message}` };
  }
}
