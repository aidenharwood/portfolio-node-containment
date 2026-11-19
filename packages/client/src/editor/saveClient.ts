import type { DistrictId, DistrictLayout, LandPlan } from '@containment/shared';

export type SaveOutcome = { readonly ok: true } | { readonly ok: false; readonly error: string };

async function post(path: string, body: unknown): Promise<SaveOutcome> {
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const answer = (await response.json().catch(() => ({ ok: false, error: `The server answered ${response.status}.` }))) as SaveOutcome;
    return response.ok && answer.ok ? { ok: true } : { ok: false, error: answer.ok ? `The server answered ${response.status}.` : answer.error };
  } catch (error) {
    return { ok: false, error: `Saving needs npm run dev: ${(error as Error).message}` };
  }
}

export function saveDistrict(id: DistrictId, layout: DistrictLayout): Promise<SaveOutcome> {
  return post(`/__editor/layouts/${encodeURIComponent(id)}`, layout);
}

export function saveLand(id: string, plan: LandPlan): Promise<SaveOutcome> {
  return post(`/__editor/land/${encodeURIComponent(id)}`, plan);
}
