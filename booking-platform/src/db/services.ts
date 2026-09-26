import { db } from '../config/db.ts';

export type Service = { id: number; name: string; duration_minutes: number };

/**
 * Filters on provider_id and active in the same query, so another provider's
 * service and an inactive one both come back as absent.
 */
export const findBookable = (
  providerId: number,
  serviceId: number,
): Promise<Service | null> =>
  db.oneOrNone<Service>(
    `select id, name, duration_minutes
       from services
      where id = $1 and provider_id = $2 and active = true`,
    [serviceId, providerId],
  );
