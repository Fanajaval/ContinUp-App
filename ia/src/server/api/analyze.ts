/**
 * POST /api/analyze  — M2 (le cœur)
 * POST /api/analyze/diff — analyse de commit (webhook de C)
 */
import { Router } from 'express';
import { zAnalyzeRequest } from '../services/llm/schemas.js';
import { analyzeRepo, analyzeDiff } from '../services/llm/analyze.service.js';
import { getDocs } from '../services/repos/doc.repo.js';
import { RepoUnreachableError } from '../services/utils/file.parser.js';
import { badRequest, fail } from './_helpers.js';

export const analyzeRouter = Router();

analyzeRouter.post('/analyze', async (req, res) => {
  const parsed = zAnalyzeRequest.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    const result = await analyzeRepo(parsed.data);
    return res.json(result);
  } catch (err) {
    if (err instanceof RepoUnreachableError) {
      return res.status(422).json({
        ok: false,
        code: 'REPO_UNREACHABLE',
        error: err.message,
      });
    }
    return fail(res, err, 'analyze');
  }
});

analyzeRouter.post('/analyze/diff', async (req, res) => {
  const { projectId, changedPaths, tasks, commitMessages } = req.body ?? {};
  if (!projectId || !Array.isArray(changedPaths) || !Array.isArray(tasks)) {
    return res.status(400).json({
      ok: false,
      code: 'BAD_REQUEST',
      error: 'projectId, changedPaths[] et tasks[] sont requis',
    });
  }

  try {
    const result = await analyzeDiff({ projectId, changedPaths, tasks, commitMessages });
    return res.json(result);
  } catch (err) {
    return fail(res, err, 'analyze/diff');
  }
});

/** GET /api/docs/:projectId — pages documents de D (M2.4). */
analyzeRouter.get('/docs/:projectId', async (req, res) => {
  try {
    return res.json({ projectId: req.params.projectId, docs: await getDocs(req.params.projectId) });
  } catch (err) {
    return fail(res, err, 'docs');
  }
});
