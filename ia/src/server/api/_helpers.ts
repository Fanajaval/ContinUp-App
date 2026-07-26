import type { Response } from 'express';
import type { ZodError } from 'zod';

export function badRequest(res: Response, error: ZodError) {
  return res.status(400).json({
    ok: false,
    code: 'BAD_REQUEST',
    error: 'Requête invalide',
    details: error.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
  });
}

export function fail(res: Response, err: unknown, tag: string) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api:${tag}]`, err);
  return res.status(500).json({ ok: false, code: 'INTERNAL', error: message });
}
