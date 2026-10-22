# Bodhi Family Clinic: Queue & Token System

A queue and token system for a clinic with two doctors, built for the MedEx internship exercise.
Reception checks patients in, each patient gets a token, doctors press **Call next**, and a waiting-room screen shows who is being called.

- **Backend:** Node.js, TypeScript, Express, Vitest
- **Frontend:** React, Vite, TypeScript
- **Storage:** a JSON file (`backend/data/state.json`)

## Repository layout

```
backend/
  src/engine.ts      all queue logic (pure, no HTTP)
  src/app.ts         Express routes, validation, error handling, clock injection
  src/server.ts      loads clinic.json and saved state, starts the server
  tests/             example replay and edge-case tests
  data/clinic.json   clinic, doctors, examples
frontend/
  src/               Reception, Doctor and Display screens
```

## How to run

Requires Node.js 18 or newer.

**Backend** (terminal 1):

```bash
cd backend
npm install
npm test          # run the tests
npm run dev       # API on http://localhost:3000
```

**Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev       # UI on http://localhost:5173
```

Vite proxies `/api` to `localhost:3000`, so start the backend first.

**Screens:**

| Screen | URL |
|---|---|
| Reception | http://localhost:5173/#/reception |
| Doctor | http://localhost:5173/#/doctor |
| Waiting-room display (TV) | http://localhost:5173/#/display |

To reset all data, stop the server and delete `backend/data/state.json`.

## API

| Method | Path | Result |
|---|---|---|
| POST | `/api/check-ins` | 201 with the patient and token |
| POST | `/api/doctors/:id/call-next` | 200 `{ patient }`, or `{ patient: null }` if nobody is waiting |
| POST | `/api/doctors/:id/done` | 200 |
| POST | `/api/doctors/:id/no-show` | 200 |
| GET | `/api/queue` | 200 `{ nowServing, waiting }` |
| GET | `/api/doctors` | 200 list of doctors (used by the doctor screen) |

**Errors:**

- `400` for invalid input: missing name, age outside 0–120, an appointment without `appointmentTime`, a bad `kind`, invalid JSON, or an invalid `X-Now`.
- `404` for an unknown doctor.
- `409` when a doctor action makes no sense: Call next while already seeing a patient, or Done / No-show with no patient.

## How the queue logic works

All the logic is in `backend/src/engine.ts`. The HTTP layer only parses requests and calls it.

**Check-in.** Emergencies get an `E` token. An appointment gets `A`, unless the patient checks in more than 15 minutes after the appointment time, in which case they are treated as a walk-in and get a `W` token. Exactly 15 minutes late is still on time. Counters are kept per clinic-local day, with the day computed as UTC + 5:45, so they restart at midnight in Kathmandu.

**Choosing the next patient.** One pure function, `choose(waiting, history, now)`, applies rules 3 and 4:

1. Emergencies, ordered by check-in time.
2. Due appointments (appointment time ≤ now + 10 min), ordered by appointment time, then check-in time.
3. Walk-ins: age 65 or over first, then everyone else, each group ordered by check-in time.
4. If nobody above is waiting, the appointment with the earliest appointment time, even if it isn't due yet.

**Fairness (rule 4).** Before returning a due appointment, `choose` looks at the last 3 non-emergency calls across both doctors. If all 3 were made under rule 3.2 and a walk-in is waiting, the walk-in is called instead. Each call records which rule produced it, so the history is easy to check. A call made under 3.4 (early appointment) does not count towards the 3, because it is not a "due appointment" call.

**No-shows.** The first no-show puts the patient back in the queue as a walk-in. They keep their token, their check-in time becomes the time of the no-show, and the old appointment time is dropped. The second no-show removes them from the queue.

**Queue view and waiting time.** `GET /api/queue` does not use a separate sorting function. It copies the waiting list and calls `choose()` repeatedly, adding each pick to a copy of the call history, until nobody is left. The queue is therefore always in the order the doctors would actually call people, including the fairness rule, so the screen and the real calls cannot disagree. Estimated wait is `floor(position / number of doctors) * 12` minutes, with positions counted from 0. With 2 doctors, positions 0 and 1 show "Next".

**Doctors and concurrency.** Each doctor holds at most one patient. Call next while busy returns 409. `callNext` is fully synchronous, with no `await` between choosing a patient and marking them as serving. Node runs JavaScript on one thread, so two simultaneous Call next requests are handled one after the other and can never get the same patient.

## Testing with time

The engine never reads the system clock. Every method takes `now` as a parameter, so tests pass any time they want. In the API, `getNow(req)` uses the `X-Now` header (for example `X-Now: 2026-11-02T09:30:00+05:45`) when `NODE_ENV` is not `production`, and falls back to `Date.now()` otherwise. The header is ignored in production.

```bash
curl -X POST localhost:3000/api/check-ins \
  -H "Content-Type: application/json" -H "X-Now: 2026-11-02T09:30:00+05:45" \
  -d '{"name":"Ram","age":45,"kind":"walk_in"}'
```

## Tests

`npm test` in `backend/` runs:

- **Example replay.** Every entry in `examples` in `data/clinic.json` is replayed through the engine with the clock set from each event's `at` field. Tokens, calls and each `queue` snapshot are compared with `expected`.
- **Edge cases:**
  - 15 vs 16 minutes late
  - the counter reset at Kathmandu midnight
  - the fairness rule
  - first and second no-show
  - the 409 on a busy doctor, and two doctors never getting the same patient
  - emergency and 65+ priority

**Note on the replay test:** the test reads the `expected` keys (`tokens`, `calls`, `queues`) with a few fallbacks. If the real names in `clinic.json` differ, it is a three-line change, marked `ADAPT THESE 3 LINES` in `tests/engine.test.ts`.

## Frontend

- **Reception:** check-in form with client-side validation (the server validates again), plus the live queue with tokens and waiting times. Appointment times are entered as Kathmandu local time.
- **Doctor:** pick which doctor you are, see your current patient, and use Call next, Done and No-show. Buttons are disabled when they don't apply, and server errors such as 409 are shown as messages.
- **Display:** a large "Now serving" view sized in `vw` units so it can be read from across a room. A newly called token turns green and pulses for about 6 seconds.
- **Refresh:** screens poll every 2–3 seconds. State is updated in place by React, so there is no flicker.
- **Loading and errors:** every screen shows loading and error states. If the server is unreachable, the display shows "Server unreachable" and drops its data instead of showing an old queue as current.

## Decisions and assumptions

- A check-in with `emergency: true` is an emergency regardless of `kind`.
- "Now" for the 10-minute due window is the time of the Call next request.
- A patient who no-shows once and returns as a walk-in is treated like any other walk-in, so the 65+ priority applies to them too.
- Doctors come from `clinic.json`. If that file can't be read, the server falls back to `D1` and `D2`.
- Clinic-local time is fixed at UTC+05:45 (Nepal has no daylight saving).
- State is saved to disk synchronously after every change. This is simple and fine for one clinic, but it does not scale.

## AI usage

TODO: say honestly where you used AI. For example: "I used Claude to draft the project structure, the first version of the engine and the React screens. I then read through, ran and adjusted the code, and I can explain every function."

## What I would improve with more time

- Use SQLite (or Postgres) with transactions instead of a JSON file, with row locking so several server instances stay correct.
- Add API integration tests with supertest, and frontend tests.
- Replace polling with Server-Sent Events or WebSockets for instant updates on the TV display.
- Add authentication so only the right doctor can act on their own queue.
- Make the 12-minute average, the 10-minute window and the 15-minute grace period configurable per clinic.
- Add an audit log of check-ins, calls and no-shows, and a daily reset or archive of old state.
- Add a "Skip" or "Recall" action, and show waiting patients their own estimated wait on a phone.
- Improve accessibility (focus states, screen-reader labels) and add a 404 route to the frontend.

## What is missing

TODO: list anything you did not finish or could not verify, for example "the example replay test was not run against the real `clinic.json` key names". An honest list counts in your favour.