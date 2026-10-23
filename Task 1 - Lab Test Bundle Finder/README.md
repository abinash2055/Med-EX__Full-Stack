
# MedEx Lab Test Bundle Finder

A full-stack web application that helps users find the most cost-effective combination of individual laboratory tests and lab packages to cover their selected tests. The application calculates the cheapest available plan, displays package coverage, identifies extra tests, and summarizes potential savings.

## Features

- View available laboratory tests.
- Search tests by name or code.
- Select multiple tests and remove selected tests.
- View available laboratory packages.
- Calculate the cheapest combination of individual tests and packages.
- Display total cost, individual test cost, savings, and extra tests included in packages.
- Handle invalid selections and unavailable tests.
- Automatically recalculate the plan when the selection changes.
- Responsive user interface for desktop and mobile devices.
- Run the frontend and backend together using a single development command.

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
- `tsx` for TypeScript development

### Testing
- Vitest
- Supertest

### Development Tools
- npm
- Git
- `concurrently` for running both development servers

## Project Folder Structure

```text
medex-lab-bundle-finder/
│
├── backend/
│   ├── src/
│   │   ├── data/
│   │   │   └── lab-catalog.json
│   │   │
│   │   ├── routes/
│   │   │   └── plan.routes.ts
│   │   │
│   │   ├── services/
│   │   │   └── plan.service.ts
│   │   │
│   │   ├── types/
│   │   │   └── catalog.types.ts
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TestSearch.tsx
│   │   │   ├── SelectedTests.tsx
│   │   │   └── PlanResult.tsx
│   │   │
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   │
│   ├── public/
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

### Folder and File Descriptions

| Path | Purpose |
|---|---|
| `backend/src/data/` | Stores the official laboratory catalog. |
| `backend/src/routes/` | Defines API endpoints for tests, packages, and plan calculation. |
| `backend/src/services/` | Contains the logic for calculating the cheapest test and package combination. |
| `backend/src/types/` | Defines TypeScript interfaces for catalog data and planning results. |
| `backend/src/app.ts` | Configures Express middleware and API routes. |
| `backend/src/server.ts` | Starts the backend HTTP server. |
| `backend/tests/` | Contains automated backend tests. |
| `frontend/src/components/` | Contains reusable React components for searching tests, managing selections, and displaying results. |
| `frontend/src/api.ts` | Handles communication between the frontend and backend. |
| `frontend/src/types.ts` | Defines TypeScript interfaces used by the frontend. |
| `frontend/src/App.tsx` | Contains the main application layout and state management. |
| `frontend/src/App.css` | Contains application styling and responsive design. |
| `frontend/src/main.tsx` | Mounts the React application. |
| `frontend/.env` | Configures the backend API URL for local development. |
| `frontend/vite.config.ts` | Configures the Vite development server and build process. |
| `frontend/package.json` | Defines frontend dependencies and scripts, including the command to run both servers. |
| `backend/package.json` | Defines backend dependencies and development scripts. |
| `.gitignore` | Specifies files and directories Git should ignore. |
| `README.md` | Documents project setup, execution, APIs, and development instructions. |

## Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) and npm
- Git
- Visual Studio Code or another code editor

Verify that Node.js and npm are installed:

```bash
node --version
npm --version
```

## Getting Started

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd medex-lab-bundle-finder
```

If you have already created the project locally, open its root directory in your terminal instead.

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

Install `tsx` if it is not already installed:

```bash
npm install -D tsx
```

Ensure `backend/package.json` contains the following development script:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts"
  }
}
```

Keep any existing scripts that your backend requires.

### Step 3: Install Frontend Dependencies

Return to the project root and enter the frontend directory:

```bash
cd ..
cd frontend
npm install
```

Install `concurrently` to run the backend and frontend together:

```bash
npm install -D concurrently
```

### Step 4: Configure the Frontend Environment

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

This variable tells the frontend where to send API requests.

### Step 5: Configure the Frontend Development Script

Open `frontend/package.json` and ensure the `scripts` section includes:

```json
{
  "scripts": {
    "dev": "concurrently -k -n BACKEND,FRONTEND -c blue,green \"npm run dev --prefix ../backend\" \"vite\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

Keep any other required scripts already present in the file.

The `concurrently` command starts both development servers. The `-k` option stops the other process if one process exits.

## Process to Run the Application

After the initial installation and configuration, you only need one command to run the entire application.

### Step 1: Open the Frontend Directory

Open a terminal at the project root and run:

```bash
cd frontend
```

### Step 2: Start Both Servers

```bash
npm run dev
```

This command automatically starts:

- The backend TypeScript development server.
- The frontend Vite development server.

You do not need a separate terminal to start the backend.

### Step 3: Open the Application

Open the frontend URL displayed in the terminal.

Default frontend URL:

http://localhost:5173

Default backend URL:

http://localhost:3000

### Step 4: Verify the API

Open these URLs in your browser:

- [Laboratory Tests](http://localhost:3000/api/tests)
- [Laboratory Packages](http://localhost:3000/api/packages)

The endpoints should return JSON data when the backend is running and the catalog is configured correctly.

### Step 5: Stop the Application

Press the following keyboard shortcut in the terminal:

```text
Ctrl + C
```

Both development servers should stop.

## API Endpoints

### GET `/api/tests`

Returns the active and selectable laboratory tests.

Example response structure:

```json
[
  {
    "id": "T01",
    "code": "TEST001",
    "name": "Example Laboratory Test",
    "price": 500,
    "status": true
  }
]
```

The values above are illustrative. The actual response depends on the supplied catalog.

### GET `/api/packages`

Returns the available active laboratory packages.

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

This example illustrates the response structure only. Actual values depend on the selected tests and catalog.

## Error Handling

The API should handle invalid requests and unavailable tests consistently.

| HTTP Status | Error Code | Meaning |
|---|---|---|
| 400 | `EMPTY_SELECTION` | No test IDs were provided. |
| 400 | `INVALID_TESTS` | One or more test IDs are invalid. |
| 422 | `NOT_AVAILABLE` | Selected tests cannot be obtained. |
| 500 | `INTERNAL_ERROR` | An unexpected server error occurred. |

## Planning Logic

The planning service finds a combination of individual tests and packages that covers every selected test while minimizing the total price.

The planner should:

1. Consider only active packages.
2. Prevent selection of inactive or invalid tests.
3. Treat duplicate selected test IDs as one selection.
4. Allow tests with no individual price to be obtained through packages.
5. Find the minimum total cost that covers all selected tests.
6. Apply the required tie-breaking rules:
   - Fewer items.
   - Fewer extra tests.
   - Alphabetically sorted item IDs.
7. Return the chosen items, total cost, extra tests, individual total, and savings.

## Testing

Run backend tests from the `backend` directory:

```bash
cd backend
npm test
```

Automated tests should cover:

- Every supplied catalog example and expected response.
- Empty and invalid selections.
- Unavailable tests.
- Duplicate test selections.
- Package coverage and overlapping packages.
- Tests without individual prices.
- Total price and savings calculations.
- Tie-breaking scenarios.
- API response status codes and error handling.

Use the test framework and scripts configured in `backend/package.json`.

## Building the Frontend

To check that the frontend compiles for production, open a terminal in the `frontend` directory and run:

```bash
npm run build
```

If the build succeeds, the production-ready files are generated in the frontend build output directory, usually `dist/`.

## Catalog

Use the official `lab-catalog.json` supplied with the assessment. Do not replace it with an illustrative or invented catalog.

Verify that:

- The catalog file is located at `backend/src/data/lab-catalog.json`.
- The JSON structure matches the backend TypeScript interfaces.
- Test IDs and package coverage match the supplied assessment data.
- All supplied examples and expected responses are preserved.

## Development Notes

- Start the entire application from the `frontend` directory using `npm run dev`.
- The frontend communicates with the backend through `VITE_API_URL`.
- Install dependencies separately in the `backend` and `frontend` directories.
- Do not commit `.env` files containing secrets.
- Keep automated tests and technical documentation updated when modifying the planning logic.
- Ensure that the catalog supplied with the assessment is used for final evaluation.

## License

This project was developed as part of the MedEx full-stack assessment.
