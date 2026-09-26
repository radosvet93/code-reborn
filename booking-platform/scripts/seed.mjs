// Fills the dev database with data you can poke by hand. Wipes it first.
// Dates are relative to today so the availability endpoint, which hides slots
// in the past, always has something to return.
import pg from 'pg';

process.loadEnvFile('.env');

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

await db.query(
  'truncate bookings, availability_rules, blocked_periods, services, providers restart identity cascade',
);

/** The next occurrence of an ISO weekday (1 = Monday) in the given zone. */
const nextWeekday = (isoDayOfWeek, zone) => {
  const today = Temporal.Now.plainDateISO(zone);
  const ahead = ((isoDayOfWeek - today.dayOfWeek + 7) % 7) || 7;
  return today.add({ days: ahead });
};

const instant = (date, time, zone) =>
  new Date(date.toZonedDateTime({ timeZone: zone, plainTime: time }).epochMilliseconds);

const addProvider = async (name, zone) => {
  const { rows } = await db.query(
    'insert into providers (name, timezone) values ($1, $2) returning id',
    [name, zone],
  );
  return rows[0].id;
};

const addService = async (providerId, name, minutes, active = true) => {
  const { rows } = await db.query(
    `insert into services (provider_id, name, description, duration_minutes, active)
     values ($1, $2, $3, $4, $5) returning id`,
    [providerId, name, `${name}, ${minutes} minutes`, minutes, active],
  );
  return rows[0].id;
};

const addHours = (providerId, dayOfWeek, start, end) =>
  db.query(
    `insert into availability_rules (provider_id, day_of_week, start_time, end_time)
     values ($1, $2, $3, $4)`,
    [providerId, dayOfWeek, start, end],
  );

// ---------------------------------------------------------------- provider one

const SOFIA = 'Europe/Sofia';
const photographer = await addProvider('Rado Photography', SOFIA);

const consultation = await addService(photographer, 'Consultation', 10);
const familySession = await addService(photographer, 'Family photo session', 120);
const retired = await addService(photographer, 'Old package', 60, false);

// Spec section 5's example: Monday to Thursday 09:00-17:00, Friday 09:00-15:00,
// weekend unavailable, which is simply the absence of a rule.
for (const day of [1, 2, 3, 4]) await addHours(photographer, day, '09:00', '17:00');
await addHours(photographer, 5, '09:00', '15:00');

const monday = nextWeekday(1, SOFIA);
const tuesday = nextWeekday(2, SOFIA);

// An existing booking, so some slots are already gone.
await db.query(
  `insert into bookings
     (provider_id, service_id, customer_name, customer_email, customer_phone, start_at, end_at)
   values ($1, $2, 'Ada Lovelace', 'ada@example.com', '0700000001', $3, $4)`,
  [photographer, familySession, instant(monday, '10:00', SOFIA), instant(monday, '12:00', SOFIA)],
);

// Spec section 5's other example: a blocked afternoon.
await db.query(
  'insert into blocked_periods (provider_id, name, start_at, end_at) values ($1, $2, $3, $4)',
  [photographer, 'Dentist', instant(tuesday, '13:00', SOFIA), instant(tuesday, '15:00', SOFIA)],
);

// ---------------------------------------------------------------- provider two

const LONDON = 'Europe/London';
const studio = await addProvider('London Studio', LONDON);
const headshots = await addService(studio, 'Headshots', 30);
for (const day of [1, 2, 3, 4, 5]) await addHours(studio, day, '10:00', '18:00');

await db.end();

console.log(`
Seeded.

  Rado Photography  id=${photographer}  ${SOFIA}
    consultation    id=${consultation}     10 min
    family session  id=${familySession}    120 min
    old package     id=${retired}     60 min, inactive
    booked          ${monday.toString()} 10:00-12:00 local
    blocked         ${tuesday.toString()} 13:00-15:00 local

  London Studio     id=${studio}  ${LONDON}
    headshots       id=${headshots}     30 min

Try:
  /providers/${photographer}/availability?date=${monday.toString()}&serviceId=${familySession}
  /providers/${photographer}/availability?date=${tuesday.toString()}&serviceId=${consultation}
  /providers/${studio}/availability?date=${monday.toString()}&serviceId=${headshots}
`);
