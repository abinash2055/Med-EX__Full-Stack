# MedEx Clinic Queue & Token System

A full-stack clinic queue management application built with **TypeScript, Node.js, Express, React, and Vite**. The system manages patient check-ins, token generation, doctor assignments, waiting queues, and patient no-shows.

The application provides three interfaces: Reception, Doctor, and Waiting Room. Both the backend and frontend can be started together using a single `npm run dev` command from the frontend directory.

## Features

### Reception

- Register patients for clinic visits.
- Enter patient name, age, and visit type.
- Support emergency, appointment, and walk-in patients.
- Schedule appointments with appointment times.
- Automatically generate patient tokens.
- Display the current queue and estimated waiting times.
- View patients waiting to be called.

### Doctor

- Select a doctor.
- View the patient currently being served.
- Call the next eligible patient.
- Mark consultations as completed.
- Mark patients as no-shows.
- Enforce doctor availability so a busy doctor cannot call another patient.

### Waiting Room

- Display the currently serving patient.
- Show the patient's token and assigned doctor.
- Display patients waiting in the queue.
- Refresh queue information automatically.
- Provide a dedicated display suitable for a clinic waiting area.

### Backend

- REST API built with Node.js, Express, and TypeScript.
- Centralized queue-management engine.
- Automatic token generation using patient categories.
- Appointment and emergency prioritization.
- Estimated waiting-time calculation.
- No-show handling and queue re-entry.
- Doctor availability management.
- Validation and meaningful HTTP error responses.
- Configurable clinic data and doctor information.

### Development

- Run the backend and frontend together.
- Automatically restart the backend when source files change.
- Run backend tests using Vitest.
- Use TypeScript for frontend and backend code.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Development server | Vite |
| Styling | CSS |
| Backend | Node.js, Express, TypeScript |
| Development tools | `tsx`, `concurrently` |
| Testing | Vitest |
| Data storage | JSON-based clinic configuration and runtime state |

## Project Folder Structure

The following structure represents the application files discussed during development. Keep any additional files already present in your project.

```text
medex-clinic-queue/
│
├── backend/
│   ├── data/
│   │   ├── clinic.json
│   │   └── state.json             # Generated runtime state, if present
│   │
│   ├── src/
│   │   ├── engine.ts              # Queue rules and business logic
│   │   ├── app.ts                 # Express application and API routes
│   │   └── server.ts              # Server startup and data loading
│   │
│   ├── tests/
│   │   └── engine.test.ts         # Queue engine tests
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts           # If configured separately
│
├── frontend/
│   ├── public/                    # Static assets, if present
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Reception.tsx      # Patient registration and queue
│   │   │   ├── Doctor.tsx         # Doctor dashboard
│   │   │   └── WaitingRoom.tsx    # Waiting room display
│   │   │
│   │   ├── api.ts                 # Backend API functions and types
│   │   ├── App.tsx                # Main application and navigation
│   │   ├── App.css                # Application styles
│   │   ├── index.css              # Global styles
│   │   └── main.tsx               # React application entry point
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── vite.config.ts             # If present
│
└── README.md
```

**Important:** `state.json` is runtime data rather than source code. Its creation and persistence depend on the backend implementation. The backend also requires `data/clinic.json` to be available at the expected path.

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js with npm.
- Git, if you want to clone or version-control the project.

Verify the installation:

```bash
node --version
npm --version
```

### 1. Install Backend Dependencies

Open a terminal in the project root:

```bash
cd backend
npm install
```

Make sure the backend package includes the required scripts, including:

```json
{
  "scripts": {
    "dev:server": "tsx watch src/server.ts",
    "test": "vitest run"
  }
}
```

Preserve any additional scripts and dependencies already present in your `package.json`.

### 2. Install Frontend Dependencies

From the project root, run:

```bash
cd frontend
npm install
npm install --save-dev concurrently
```

Ensure the frontend `package.json` contains a development script that starts both servers:

```json
{
  "scripts": {
    "dev": "concurrently -k -n BACKEND,FRONTEND \"npm --prefix ../backend run dev:server\" \"vite --host 0.0.0.0\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

Keep the existing dependencies and any other scripts.

### 3. Configure Clinic Data

The backend reads clinic configuration from:

```text
backend/data/clinic.json
```

The configuration includes the clinic name, timezone, average consultation duration, doctor details, and any example event-replay data used by the project.

For example, the clinic configuration includes:

- Clinic: Bodhi Family Clinic
- Timezone: `Asia/Kathmandu`
- Average consultation duration: 12 minutes
- Doctors: D1 (Dr. S. Karki) and D2 (Dr. R. Joshi)

Use the complete configuration supplied with the project. These example details should be changed only if your clinic configuration requires it.

### 4. Run the Entire Application

Open a terminal in the `frontend` directory and execute:

```bash
npm run dev
```

This starts the backend and frontend concurrently.

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Doctors API | http://localhost:3000/api/doctors |
| Queue API | http://localhost:3000/api/queue |

You do not need to start the backend separately when using this combined development command.

To stop both processes, press `Ctrl + C` in the terminal.

## Application Screens

### 1. Reception

Open:

http://localhost:5173/

Reception staff can register patients and view queue information.

### 2. Doctor Dashboard

Open:

http://localhost:5173/?screen=doctor

Doctors can select their identity, call the next patient, complete consultations, and record no-shows.

### 3. Waiting Room

Open:

http://localhost:5173/?screen=waiting

This screen is designed to display the currently serving token and waiting patients.

## Queue Management Logic

The backend queue engine is responsible for deciding which patient should be called next.

### Patient Categories

| Category | Token prefix | Description |
|---|---|---|
| Emergency | `E` | Patients requiring emergency attention |
| Appointment | `A` | Patients with scheduled appointments |
| Walk-in | `W` | Patients without scheduled appointments |

Tokens are generated using the relevant category and clinic-day logic. The same token is retained when a patient returns to the queue after their first no-show.

### Patient Prioritization

The queue engine follows these rules:

1. **Emergency patients:** Prioritized first, ordered by check-in time.
2. **Due appointments:** Appointments due within the next 10 minutes are considered eligible and prioritized by appointment time.
3. **Walk-in patients:** Patients aged 65 or older receive priority among walk-ins; remaining patients follow check-in order.
4. **Fairness:** When the last three non-emergency calls were appointment calls and walk-ins are waiting, the engine gives a waiting walk-in an opportunity.
5. **Future appointments:** When no other patient is eligible, the engine can select the earliest future appointment.

The queue engine also validates patient details and handles late appointments.

### Appointment Handling

- An appointment more than 15 minutes late is converted to a walk-in.
- An appointment exactly 15 minutes late remains an appointment.
- Appointments must have a valid appointment time.
- Patient age must be between 0 and 120.

### No-Show Handling

- On the first no-show, the patient returns to the queue as a walk-in.
- The patient's original token is retained.
- On a second no-show, the patient is marked as gone.

### Doctor Availability

- A doctor can call a patient only when not already occupied.
- Calling a patient assigns the patient to the doctor.
- Completing a consultation marks the patient as done and releases the doctor.
- Attempting to call another patient while the doctor is busy returns a conflict response.

## Backend API Endpoints

The backend exposes the following routes.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/doctors` | Retrieve available doctors |
| `GET` | `/api/queue` | Retrieve current queue information |
| `POST` | `/api/check-ins` | Register a patient |
| `POST` | `/api/doctors/:id/call-next` | Call the next eligible patient |
| `POST` | `/api/doctors/:id/done` | Complete a consultation |
| `POST` | `/api/doctors/:id/no-show` | Record a patient no-show |

The `:id` parameter represents the doctor identifier, such as `D1` or `D2`.

### Example: Retrieve Doctors

```http
GET http://localhost:3000/api/doctors
```

### Example: Retrieve Queue

```http
GET http://localhost:3000/api/queue
```

### Example: Register a Patient

```http
POST http://localhost:3000/api/check-ins
Content-Type: application/json
```

Example request body:

```json
{
  "name": "Ram Sharma",
  "age": 35,
  "kind": "walk_in"
}
```

For an appointment, provide an `appointmentTime` in the format expected by the backend. Emergency check-ins should use the emergency flag supported by the backend's request schema.

### Development Time Override

The backend supports the `X-Now` request header outside production for deterministic time-based testing, if enabled in the current implementation.

## Testing

Run backend tests from the backend directory:

```bash
cd backend
npm test
```

Or run Vitest directly:

```bash
npx vitest run
```

To run tests in watch mode:

```bash
npx vitest
```

The tests cover queue prioritization and edge cases, including appointment eligibility, walk-in handling, and no-show behavior.

## Build the Frontend

From the frontend directory:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

The backend remains a separate service in production; the combined `npm run dev` command is intended for local development.

## Troubleshooting

### Frontend cannot connect to backend

1. Check that both servers started successfully.
2. Verify that the backend is listening on port `3000`.
3. Open `http://localhost:3000/api/doctors` in your browser.
4. Confirm that `frontend/src/api.ts` uses the correct backend URL.
5. Check the browser console for request or CORS errors.

### Backend fails to start

1. Confirm that `backend/data/clinic.json` exists.
2. Verify the backend dependencies are installed.
3. Check that the port `3000` is available.
4. Review the terminal output for TypeScript errors or invalid JSON.

### Frontend fails to start

1. Run `npm install` inside `frontend`.
2. Confirm that Vite and the required dependencies are installed.
3. Check whether port `5173` is already in use.

### Queue data does not persist

Check the backend's runtime-state handling. The clinic configuration and runtime state are separate concerns; configuration in `clinic.json` does not automatically imply that all patient changes are saved there.

## Development Notes

- The backend contains the queue-management business logic.
- The frontend communicates with the backend through HTTP API requests.
- `clinic.json` supplies clinic configuration and example data.
- `state.json`, when generated, is used for runtime state according to the server implementation.
- The frontend's doctor and waiting-room screens should use the same backend queue state as Reception.
- The application is configured for local development; production deployment requires appropriate persistence, security, and environment configuration.

## License

Add the appropriate license information if this project is distributed publicly.
