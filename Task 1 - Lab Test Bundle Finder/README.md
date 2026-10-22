# MedEx Lab Test Bundle Finder

A full-stack web application that helps users find the most cost-effective combination of individual lab tests and lab packages to cover their selected tests.

## Features

- View available laboratory tests.
- Search tests by name or code.
- Select multiple tests and remove selections.
- View available lab packages.
- Calculate the cheapest combination of tests and packages.
- Display total cost, individual test cost, savings, and extra tests included in packages.
- Handle invalid selections and unavailable tests.
- Responsive interface for desktop and mobile devices.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express.js
- TypeScript

### Testing
- Vitest
- Supertest

## Project Structure

```text
medex-lab-bundle-finder/
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── lab-catalog.json
│   │   ├── routes/
│   │   │   └── plan.routes.ts
│   │   ├── services/
│   │   │   └── plan.service.ts
│   │   ├── types/
│   │   │   └── catalog.types.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TestSearch.tsx
│   │   │   ├── SelectedTests.tsx
│   │   │   └── PlanResult.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── .env
│   └── package.json
├── README.md
└── .gitignore
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Git
- Visual Studio Code

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd medex-lab-bundle-finder
```

If you have already created the project locally, open its root folder in VS Code instead.

### 2. Configure the backend

Open a terminal:

```bash
cd backend
npm install
```

Create a `.env` file if your backend configuration requires one.

Start the backend development server:

```bash
npm run dev
```

The backend should run on `http://localhost:3000`, unless you configure another port.

### 3. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder containing:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## API Endpoints

### GET `/api/tests`

Returns the active and selectable laboratory tests.

### GET `/api/packages`

Returns the available active lab packages.

### POST `/api/plan`

Calculates the most cost-effective plan for the selected test IDs.

Request example:

```json
{
  "testIds": ["T01", "T02"]
}
```

Successful response structure:

```json
{
  "items": [],
  "total": 0,
  "extraTests": [],
  "individualTotal": 0,
  "savings": 0
}
```

The actual response values depend on the provided lab catalog.

## Error Handling

The API should handle these cases consistently:

| Status | Error code | Meaning |
|---|---|---|
| 400 | `EMPTY_SELECTION` | No test IDs were provided |
| 400 | `INVALID_TESTS` | One or more test IDs are invalid |
| 422 | `NOT_AVAILABLE` | Selected tests cannot be obtained |

## Planning Logic

The planning service finds a combination of individual tests and packages that covers every selected test.

The planner should:

1. Consider only active packages.
2. Prevent selection of inactive or invalid tests.
3. Treat duplicate selected test IDs as one selection.
4. Allow tests with no individual price to be obtained through packages.
5. Minimize the total price.
6. Apply the required tie-breaking rules:
   - Fewer items.
   - Fewer extra tests.
   - Alphabetically sorted item IDs.
7. Return the chosen items, total cost, extra tests, individual total, and savings.

## Testing

Run backend tests from the `backend` folder:

```bash
npm test
```

Add automated tests for every example and expected response in the supplied lab catalog, along with validation, unavailable tests, duplicate selections, package coverage, pricing, and tie-breaking scenarios.

## Catalog

Use the official `data/lab-catalog.json` supplied with the assessment. Do not submit an illustrative or invented catalog in place of the official data.

Verify that the catalog path and JSON structure match the implementation.
