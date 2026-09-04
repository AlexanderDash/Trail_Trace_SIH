import type { Request, Response } from "express";
import { Router } from "express";

export function notImplementedRouter(module: string, summary: string) {
  const router = Router();

  router.use((_req: Request, res: Response) => {
    res.json({
      module,
      implemented: false,
      items: [],
      message: summary,
    });
  });

  return router;
}
