/**
 * POST /api/dreams/analyze — M1.3 : portefeuille de rêves → catégories + PoidsDeRêve.
 */
import { Router } from 'express';
import { zDreamsRequest } from '../services/llm/schemas.js';
import { analyserReves } from '../services/llm/dreams.service.js';
import { badRequest, fail } from './_helpers.js';

export const dreamsRouter = Router();

dreamsRouter.post('/dreams/analyze', async (req, res) => {
  const parsed = zDreamsRequest.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    return res.json(await analyserReves(parsed.data));
  } catch (err) {
    return fail(res, err, 'dreams');
  }
});
