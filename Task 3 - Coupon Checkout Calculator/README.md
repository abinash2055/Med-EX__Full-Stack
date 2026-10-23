# MedEx Coupon & Checkout Calculator

A full-stack web application that calculates the final checkout amount for selected healthcare services by applying eligible coupons and discounts. The application supports coupon validation, discount allocation, VAT calculation, customer eligibility, usage limits, and order creation.

## Features

- **Service Selection:** Browse and select healthcare services for checkout.
- **Quantity Management:** Specify the quantity of each selected service.
- **Coupon Application:** Apply multiple coupons to a single checkout where permitted.
- **Coupon Validation:** Validate coupon codes based on their validity dates, eligibility rules, minimum purchase requirements, and usage limits.
- **Customer Eligibility:** Apply customer-specific coupon restrictions and guest checkout rules.
- **Discount Calculation:** Calculate fixed-amount and percentage-based discounts according to coupon rules.
- **Discount Allocation:** Distribute discounts proportionally across eligible service line items.
- **VAT Calculation:** Calculate VAT on the discounted subtotal.
- **Checkout Summary:** Display the subtotal, applied discounts, VAT, and final payable amount.
- **Order Creation:** Save completed orders and update coupon usage.
- **Persistent Storage:** Use SQLite to store application state and order records.
- **REST API:** Provide backend endpoints for retrieving services, generating checkout quotes, and creating orders.
- **Automated Testing:** Test checkout calculations, money rounding, and coupon behavior.
- **Single Development Command:** Start both the frontend and backend from the frontend directory.

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
- `tsx` for running TypeScript during development
- SQLite using `better-sqlite3`
- CORS

### Testing
- Vitest
- Supertest

## Project Structure

```text
Task3-Coupon-Checkout-Calculator/
│
├── backend/
│   ├── data/
│   │   └── checkout.json
│   │
│   ├── src/
│   │   ├── app.ts
│   │   ├── checkout.ts
│   │   ├── money.ts
│   │   ├── server.ts
│   │   └── store.ts
│   │
│   ├── tests/
│   │   ├── checkout.test.ts
│   │   └── money.test.ts
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

*Note: This structure reflects the files used in the project. If your local project contains additional configuration or generated files, keep them as needed.*

## Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/) — preferably an active LTS version.
- npm — included with Node.js.
- Git — optional, for version control.

Verify the installations:

```bash
node --version
npm --version
git --version
```

## Installation and Setup

### 1. Clone the repository

If you are using Git:

```bash
git clone <your-repository-url>
cd Task3-Coupon-Checkout-Calculator
```

Alternatively, open your existing project directory in a terminal.

### 2. Install backend dependencies

```bash
cd backend
npm install
```

Ensure that the supplied checkout dataset exists at:

```text
backend/data/checkout.json
```

This JSON file contains the services, customers, coupons, and example checkout data required by the application.

Return to the project root:

```bash
cd ..
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

Install `concurrently` if it has not already been installed:

```bash
npm install -D concurrently
```

The frontend `package.json` should include a development script similar to:

```json
{
  "scripts": {
    "dev": "concurrently -k -n BACKEND,FRONTEND \"npm --prefix ../backend run dev\" \"vite\"",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

Keep any other scripts already present in your `package.json`.

## Running the Application

### Start the frontend and backend together

Open a terminal in the **frontend directory**:

```bash
cd frontend
npm run dev
```

This single command starts both development servers:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

Open the frontend URL in your browser:

**http://localhost:5173**

The backend runs directly from its TypeScript source using `tsx watch`. No backend build command is required for local development.

Press `Ctrl+C` in the terminal to stop both servers.

### Backend development command

The backend's `package.json` should contain:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "test": "vitest run"
  }
}
```

The backend can also be run separately from its own directory when needed:

```bash
cd backend
npm run dev
```

Normally, this separate command is unnecessary because the frontend's development script starts both applications.

## Environment Configuration

The frontend `.env` file should contain:

```env
VITE_API_URL=http://localhost:3000/api
```

The frontend API client uses this environment variable to communicate with the backend.

After changing `.env`, restart the frontend development server for the changes to take effect.

## API Endpoints

The backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/services` | Retrieve available services. |
| `POST` | `/api/quote` | Calculate a checkout quote for the selected services and coupons. |
| `POST` | `/api/orders` | Recalculate, validate, and create an order. |

### Example: Retrieve Services

**Request**

```http
GET http://localhost:3000/api/services
```

### Example: Generate a Checkout Quote

**Request**

```http
POST http://localhost:3000/api/quote
Content-Type: application/json
```

Example request body:

```json
{
  "items": [
    {
      "serviceId": "S1",
      "quantity": 1
    },
    {
      "serviceId": "S2",
      "quantity": 1
    }
  ],
  "couponCodes": [
    "WELCOME10"
  ],
  "customerId": "C1",
  "date": "2026-11-02"
}
```

The response provides the calculated checkout details, including the subtotal, coupon results, discount allocation, VAT, and final payable amount, according to the backend response schema.

*Refer to `backend/src/checkout.ts` and `backend/src/app.ts` for the exact request validation and response format.*

## Checkout Calculation

The checkout calculation follows these general steps:

1. Validate the selected services and quantities.
2. Calculate the subtotal from the selected service prices.
3. Validate coupon codes and determine coupon eligibility.
4. Apply eligible coupons according to the discount rules.
5. Allocate discounts to eligible line items.
6. Calculate the net amount after discounts.
7. Calculate VAT on the discounted amount.
8. Return the final checkout quote.
9. When an order is submitted, recalculate the quote and update persistent order and coupon-usage records.

Money calculations use integer minor units (satang) to reduce floating-point rounding errors.

## Testing

Run the backend tests from the `backend` directory:

```bash
cd backend
npm test
```

The test suite covers checkout calculations and monetary rounding.

To run the tests while developing, you can use:

```bash
npx vitest
```

## Build

To compile the backend TypeScript code:

```bash
cd backend
npm run build
```

To build the frontend for production:

```bash
cd frontend
npm run build
```

These commands are for production builds and are **not required to run the application locally**.

## Troubleshooting

### Backend reports that `checkout.json` is missing

Ensure the dataset exists at:

```text
backend/data/checkout.json
```

The filename must be exactly `checkout.json`, and the file must contain valid JSON.

### Frontend cannot connect to the backend

1. Confirm that both servers started successfully.
2. Check that the backend is available at `http://localhost:3000`.
3. Verify `frontend/.env` contains:

   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

4. Restart the development servers after changing environment variables.

### `tsx` is not recognized or cannot be found

Install the backend dependencies from the backend directory:

```bash
cd backend
npm install
npm install -D tsx
```

Then return to the frontend directory and run:

```bash
npm run dev
```

### Port is already in use

If port `3000` or `5173` is occupied, stop the conflicting process or update the corresponding server configuration.

## Version Control

A typical Git workflow is:

```bash
git status
git add .
git commit -m "Add coupon and checkout calculator"
git push
```

Ensure that `.gitignore` excludes generated and local-only files such as `node_modules`, build output, and environment files containing secrets.

Do not exclude `backend/data/checkout.json` if it is the required application dataset and is intended to be included in the submission.

## Future Improvements

- Add authentication and customer account management.
- Add a dedicated order history page.
- Improve checkout error handling and validation messages.
- Add more edge-case tests for coupon combinations and usage limits.
- Add deployment configuration and production environment settings.

## Author

Developed as part of the **MedEx Full-Stack Intern Take-Home Exercise**.

---

**Local development quick start**

From the project root, install dependencies if necessary, then run the frontend development command:

```bash
cd frontend
npm install
npm run dev
```

Both the frontend and backend will start together.
