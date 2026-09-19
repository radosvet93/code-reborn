# Booking Platform MVP

## 1. Product goal

A simple booking platform for appointment-based service providers.

The first real user is a photographer, but the domain uses **Provider**, not Photographer.

A provider configures the services they offer. Customers book available times.

## 2. Stack constraints

The point of this project is learning backend, not frontend or frameworks.

- Node.js + TypeScript
- Express (v5) for HTTP
- PostgreSQL
- HTMX + server-rendered HTML for the UI
- No React, no Next.js
- No ORM (no Prisma, Drizzle, TypeORM, Sequelize). Raw SQL only
- Hand-written SQL migrations
- Domain logic lives in plain TS modules with no Express imports
- Postgres enforces booking correctness (constraints, transactions), not just app code

Everything else (DB driver, template engine, test runner, validation lib, folder structure) is your decision. Justify it.

## 3. Provider

A provider must be able to:

- Create an account
- Log in securely
- Configure basic information, including timezone
- Create sessions/services
- Define working availability
- Block specific dates or periods
- View their bookings
- View bookings in a calendar-style interface

Out of scope: organisations, teams, multiple employees, roles.

## 4. Sessions / services

Each session has:

- Name
- Description
- Duration
- Active/inactive state

Examples:

```
Consultation            10 minutes
Family photo session    2 hours
```

Different sessions can have different durations. A customer must choose a session before choosing a time.

## 5. Availability

A provider defines normal working hours, e.g.:

```
Monday     09:00-17:00
Tuesday    09:00-17:00
Wednesday  09:00-17:00
Thursday   09:00-17:00
Friday     09:00-15:00
Saturday   unavailable
Sunday     unavailable
```

A provider can block specific periods, e.g. `21 September 13:00-15:00`, or an entire day.

Available times are **derived**, not stored.

## 6. Availability shown to customers

A customer can:

- Select a provider
- Select a session
- Select a date
- See available times
- Select a time
- Enter their details
- Confirm the booking

Available times must account for:

- Provider working hours
- Session duration
- Existing bookings
- Blocked periods
- Current date/time
- Provider timezone

A session must not extend outside working hours.

```
Working hours: 09:00-17:00
Session:       2 hours
16:00 start must NOT be offered
```

## 7. Booking

Customer provides:

- Name
- Email
- Phone

A booking must record:

- Provider
- Session
- Start
- End
- Customer details
- Created at

A successful booking appears in the provider portal.

## 8. Double booking

Two bookings for the same provider must never overlap, including under concurrent requests.

```
Existing: 10:00-12:00

Rejected:
  09:00-10:30
  10:30-11:00
  11:00-13:00
  11:30-12:30

Allowed:
  08:00-10:00
  12:00-14:00
```

- The database is the final authority on booking correctness
- A customer booking a slot that was just taken gets a conflict response (409), not a generic 500

## 9. Provider booking management

The provider can:

- See upcoming bookings
- See past bookings
- See booking details
- Cancel a booking

No rescheduling unless you decide you genuinely need it.

## 10. Customer experience

No customer account.

```
Public booking page
  -> Select session
  -> Select date
  -> Select available time
  -> Enter details
  -> Confirm
  -> Booking confirmation
```

If the slot becomes unavailable between viewing and submitting, the customer is told and can pick another time.

## 11. Authentication

- Provider portal is protected
- Customers need no auth
- A provider must never access another provider's bookings, sessions, availability, or blocked periods

## 12. Notifications

After a successful booking:

- **Customer**: confirmation email with session, date, time, provider, booking details
- **Provider**: email with the new booking details

A notification failure must not undo a successful booking.

Calendar integration is a later phase.

## 13. Error handling

Handle at least:

- Invalid booking data
- Invalid session
- Session no longer active
- Requested time unavailable
- Booking conflict
- Provider not found
- Authentication failure
- Database failure
- Notification failure

Never expose internal DB errors to customers.

## 14. Time and timezones

- A provider has a timezone
- A booking represents an unambiguous point in time
- You must be able to answer "what exact moment does this booking occur?" without relying on the server's local timezone

## 15. Mobile

Provider portal and public booking flow are usable on a phone. No native app.

## 16. Non-functional

- Server-side input validation
- Never trust the client for booking correctness
- No cross-provider data access
- Correct behaviour under concurrent booking attempts
- Automated tests for the booking domain
- Automated tests for availability rules
- HTTP-level tests for routes (without a real open port)
- Useful structured server-side logging
- Correct HTTP status codes
- Business logic independent from UI and HTTP layer

## 17. Explicitly NOT in MVP

- Google Calendar sync
- Google OAuth
- Recurring calendar events
- SMS
- Payments / Stripe
- Customer accounts
- Reviews
- Multiple staff
- Multiple locations
- Teams / organisations
- Coupons
- Subscriptions
- Analytics / reporting
- Rescheduling
- Reminder emails
- Native mobile apps
- Multi-language

Architecture shouldn't make these impossible. Don't build them.

## 18. Open decisions

- A provider blocks 13:00-15:00 but a booking already exists 14:00-16:00. What happens?
- Slot start interval: same as session duration, or configurable?