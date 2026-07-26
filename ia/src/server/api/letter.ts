/**
 * POST /api/letter — M7 : la lettre venue du futur, à l'achèvement d'un projet.
 */
import { Router } from 'express';
import { zLetterRequest } from '../services/llm/schemas.js';
import { genererLettre } from '../services/llm/letter.service.js';
import { badRequest, fail } from './_helpers.js';

export const letterRouter = Router();

letterRouter.post('/letter', async (req, res) => {
  const parsed = zLetterRequest.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    return res.json(await genererLettre(parsed.data));
  } catch (err) {
    return fail(res, err, 'letter');
  }
});
