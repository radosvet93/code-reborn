import type { Request } from 'express';
import { z } from 'zod';
import { HttpError } from '../errors.ts';

/**
 * Parses body, query and params in one go and hands back the typed result.
 *
 * Deliberately not middleware: middleware would have to stash the parsed data
 * somewhere untyped, and Express 5 makes req.query read-only, so the route
 * would end up re-reading raw strings anyway.
 */
export const validate = <T>(schema: z.ZodType<T>, req: Request): T => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    throw new HttpError(
      400,
      'Invalid request',
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    );
  }

  return result.data;
};
