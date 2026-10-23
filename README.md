# MedEx — Full-Stack Development Projects

A collection of three full-stack applications developed as part of the **MedEx Full-Stack Intern Take-Home Exercise**. Each task addresses a different healthcare application requirement, including laboratory test optimization, clinic queue management, and coupon-based checkout calculation.

Each task has its own frontend, backend, dependencies, and individual README documentation. This root README provides a centralized overview and instructions for running all three applications.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Task 1: Lab Test Bundle Finder](#task-1-medex-lab-test-bundle-finder)
- [Task 2: Clinic Queue and Token System](#task-2-medex-clinic-queue--token-system)
- [Task 3: Coupon and Checkout Calculator](#task-3-medex-coupon--checkout-calculator)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Running the Applications](#running-the-applications)
- [Testing](#testing)
- [Production Builds](#production-builds)
- [Troubleshooting](#troubleshooting)

## Project Overview

### Task 1: MedEx Lab Test Bundle Finder

A full-stack application that identifies the most cost-effective combination of individual laboratory tests and laboratory packages to cover a patient's selected tests.

**Key features:**
- Browse and search laboratory tests by name or code.
- Select and remove multiple tests.
- Retrieve available laboratory packages.
- Calculate the cheapest combination of individual tests and packages.
- Display total cost, individual test cost, savings, and extra tests included in packages.
- Handle invalid selections and unavailable tests.
- Automatically recalculate the optimal plan when selections change.

**Technologies:** React, TypeScript, Vite, Node.js, Express, and Vitest.

**Documentation:** [Task 1 README](./Task1-Lab-Test-Bundle-Finder/README.md)

### Task 2: MedEx Clinic Queue & Token System

A full-stack clinic queue management application for patient registration, token generation, doctor assignments, waiting queues, and consultation tracking.

**Key features:**
- Register patients for emergency, appointment, and walk-in visits.
- Generate patient tokens automatically.
- Prioritize patients according to queue rules.
- Manage doctor availability and patient consultations.
- Mark consultations as completed or record no-shows.
- Calculate estimated waiting times.
- Display current and waiting patients on a dedicated waiting-room screen.
- Maintain shared queue state across Reception, Doctor, and Waiting Room interfaces.

**Technologies:** React, TypeScript, Vite, Node.js, Express, `tsx`, and Vitest.

**Documentation:** [Task 2 README](./Task2-Clinic-Queue-Token-System/README.md)

### Task 3: MedEx Coupon & Checkout Calculator

A full-stack checkout application that calculates the final payable amount for selected healthcare services by validating and applying eligible coupons and discounts.

**Key features:**
- Browse and select healthcare services.
- Manage service quantities.
- Apply multiple eligible coupons where permitted.
- Validate coupon dates, customer eligibility, minimum purchase requirements, and usage limits.
- Calculate fixed-amount and percentage-based discounts.
- Allocate discounts across eligible service line items.
- Calculate VAT on the discounted subtotal.
- Generate checkout quotes and create orders.
- Persist orders and application state using SQLite.
- Test checkout calculations and monetary rounding.

**Technologies:** React, TypeScript, Vite, Node.js, Express, SQLite, `better-sqlite3`, Vitest, and Supertest.

**Documentation:** [Task 3 README](./Task3-Coupon-Checkout-Calculator/README.md)

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Frontend tooling | Vite |
| Styling | CSS |
| Backend | Node.js, Express.js, TypeScript |
| TypeScript development | `tsx` |
| Testing | Vitest, Supertest where configured |
| Database | SQLite for Task 3; JSON-based data for Tasks 1 and 2 |
| Development utilities | npm, Git, `concurrently` |
| API communication | REST APIs over HTTP |

Each task maintains its own dependencies and configuration.

## Project Structure

The following is the recommended root-level organization. The folder names shown should match the actual names in your repository.

```text
MedEx/
│
├── README.md
│
├── Task1-Lab-Test-Bundle-Finder/
│   ├── README.md
│   ├── backend/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
│
├── Task2-Clinic-Queue-Token-System/
│   ├── README.md
│   ├── backend/
│   │   ├── data/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
│
└── Task3-Coupon-Checkout-Calculator/
    ├── README.md
    ├── backend/
    │   ├── data/
    │   ├── src/
    │   ├── tests/
    │   └── package.json
    └── frontend/
        ├── src/
        ├── package.json
        └── vite.config.ts
```

**Note:** This is a simplified overview, not a replacement for the actual project tree. Keep all existing source files, configuration files, datasets, tests, and lockfiles.

## Clone the Repository

Clone the repository to your local machine using Git:

```bash
git clone <your-repository-url>
```

Navigate to the cloned project directory:

```bash
cd MedEx
```

Install the dependencies and run the task you want to use. For example, to run Task 1:

```bash
cd Task1-Lab-Test-Bundle-Finder/frontend
npm install
npm run dev
```

For Task 2 or Task 3, navigate to the corresponding task's `frontend` directory and execute `npm install` followed by `npm run dev`.

**Note:** Replace `MedEx` and the task folder names with the actual directory names in your repository if they differ.


## Prerequisites

Install the following software before running the applications:

- [Node.js](https://nodejs.org/) with npm.
- [Git](https://git-scm.com/) for version control.
- A code editor such as Visual Studio Code.

Verify your installation:

```bash
node --version
npm --version
git --version
```

## Installation and Setup

Install the dependencies for each task separately.

### Task 1 — Install Dependencies

From the project root:

```bash
cd Task1-Lab-Test-Bundle-Finder/backend
npm install
cd ../frontend
npm install
```

Ensure the supplied laboratory catalog is present at the path expected by the backend:

```text
backend/src/data/lab-catalog.json
```

### Task 2 — Install Dependencies

From the project root:

```bash
cd Task2-Clinic-Queue-Token-System/backend
npm install
cd ../frontend
npm install
```

Verify that the clinic configuration exists:

```text
backend/data/clinic.json
```

Use the complete clinic configuration supplied with the project.

### Task 3 — Install Dependencies

From the project root:

```bash
cd Task3-Coupon-Checkout-Calculator/backend
npm install
cd ../frontend
npm install
```

Verify that the checkout dataset exists:

```text
backend/data/checkout.json
```

If `concurrently` is not already installed in a frontend project, install it from that frontend directory:

```bash
npm install -D concurrently
```

**Important:** Each task must retain its own `package.json`, `package-lock.json`, environment configuration, and development scripts. Do not merge the three applications' dependencies into one package unless you intentionally restructure the repository.

## Running the Applications

Each application can run its frontend and backend together using one development command from its frontend directory, provided its `package.json` is configured for concurrent startup.

### Task 1 — Lab Test Bundle Finder

```bash
cd Task1-Lab-Test-Bundle-Finder/frontend
npm run dev
```

Default URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Task 2 — Clinic Queue & Token System

```bash
cd Task2-Clinic-Queue-Token-System/frontend
npm run dev
```

Default URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

Application screens:

- Reception: http://localhost:5173/
- Doctor dashboard: http://localhost:5173/?screen=doctor
- Waiting room: http://localhost:5173/?screen=waiting

### Task 3 — Coupon & Checkout Calculator

```bash
cd Task3-Coupon-Checkout-Calculator/frontend
npm run dev
```

Default URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Stopping an Application

Press `Ctrl + C` in the terminal running the development command. If the application uses `concurrently -k`, both development processes should stop together.

**Running multiple tasks simultaneously:** The applications use the same default frontend and backend ports. If you want to run more than one task at the same time, configure different ports for each application and update the corresponding frontend API URLs.

## Testing

Run tests from the relevant backend directory.

### Task 1

```bash
cd Task1-Lab-Test-Bundle-Finder/backend
npm test
```

Tests should cover the laboratory planning algorithm, package coverage, invalid selections, savings calculations, and tie-breaking rules.

### Task 2

```bash
cd Task2-Clinic-Queue-Token-System/backend
npm test
```

Tests should cover queue prioritization, appointment eligibility, patient check-ins, doctor availability, and no-show handling.

### Task 3

```bash
cd Task3-Coupon-Checkout-Calculator/backend
npm test
```

Tests should cover checkout calculations, coupon validation, discount allocation, and monetary rounding.

These commands assume that each backend defines an `npm test` script. Refer to the relevant task's README if a script differs.

## Production Builds

Build each frontend separately.

### Task 1

```bash
cd Task1-Lab-Test-Bundle-Finder/frontend
npm run build
```

### Task 2

```bash
cd Task2-Clinic-Queue-Token-System/frontend
npm run build
```

### Task 3

```bash
cd Task3-Coupon-Checkout-Calculator/frontend
npm run build
```

If configured, the backend can also be compiled using its own build script:

```bash
npm run build
```

Run that command from the relevant backend directory. Production deployment requires the backend services, environment variables, data files, and persistence configuration to be set up appropriately.

## Troubleshooting

### Dependencies are missing

Run `npm install` in the affected task's backend or frontend directory.

### Frontend cannot connect to the backend

- Verify that the backend started successfully.
- Check the backend port.
- Confirm that the frontend API URL points to the correct backend.
- Check the browser console for HTTP, network, or CORS errors.

### The application reports a missing JSON file

Verify that the required dataset exists at the exact path expected by the backend. Use the official assessment data rather than replacing it with illustrative data.

### A port is already in use

Stop the conflicting process or configure a different port for the affected application. Ensure the frontend API URL matches the backend port.

### Tests fail

Run the tests from the correct backend directory and inspect the error output. Confirm that the supplied datasets, environment configuration, and dependencies are available.

## Development Notes

- Each task is an independent application with its own frontend and backend.
- The backend is responsible for the application's core business logic.
- The frontend communicates with the backend through REST API requests.
- Use the individual README files for detailed API documentation and task-specific setup.
- Keep the supplied assessment datasets intact.
- Do not commit `node_modules`, generated build output, database files that are intended to remain local, or environment files containing secrets.
- Commit any required assessment datasets that are intended to be part of the submission.

## Individual Task Documentation

For complete implementation details, setup instructions, API examples, and task-specific troubleshooting, refer to:

1. [Task 1 — Lab Test Bundle Finder](./Task1-Lab-Test-Bundle-Finder/README.md)
2. [Task 2 — Clinic Queue & Token System](./Task2-Clinic-Queue-Token-System/README.md)
3. [Task 3 — Coupon & Checkout Calculator](./Task3-Coupon-Checkout-Calculator/README.md)

## Author

Developed as part of the **MedEx Full-Stack Intern Take-Home Exercise**.

---

**Quick start:** Navigate to the `frontend` directory of the task you want to run and execute `npm run dev`.
