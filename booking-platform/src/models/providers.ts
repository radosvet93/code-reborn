import { db } from '../config/db.ts';

export type Provider = { id: number; timezone: string };

export const findById = (providerId: number): Promise<Provider | null> =>
  db.oneOrNone<Provider>('select id, timezone from providers where id = $1', providerId);
