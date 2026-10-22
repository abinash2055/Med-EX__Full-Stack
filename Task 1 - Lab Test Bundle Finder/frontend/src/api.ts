import type {
  ApiError,
  LabTest,
  PlanResult,
} from "./types";

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export class ApiRequestError extends Error {
  code: string;
  testIds: string[];
  status: number;

  constructor(
    message: string,
    code: string,
    testIds: string[],
    status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.testIds = testIds;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({
      error: "INTERNAL_ERROR",
      testIds: [],
    }))) as ApiError;

    throw new ApiRequestError(
      body.error ?? "INTERNAL_ERROR",
      body.error ?? "INTERNAL_ERROR",
      body.testIds ?? [],
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

export function fetchTests(signal?: AbortSignal) {
  return request<LabTest[]>("/tests", { signal });
}

export function fetchPlan(
  testIds: string[],
  signal?: AbortSignal,
) {
  return request<PlanResult>("/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ testIds }),
    signal,
  });
}
