import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateBody = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(issue => {
        const fieldName = issue.path.join('.');
        return `${fieldName ? `${fieldName}: ` : ''}${issue.message}`;
      }).join(', ');
      
      res.status(400).json({ error: `Datos incorrectos: ${details}` });
      return;
    }
    next(error);
  }
};
