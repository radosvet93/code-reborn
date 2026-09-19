import { type Request, type Response, type NextFunction } from 'express';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);

  res.status(500).json({
    message: "Internal Server Error",
  });
}

export default errorHandler