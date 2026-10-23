
import type {
  Doctor,
  Patient,
  PatientKind,
  PatientResponse,
  QueueResponse,
} from './types';

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Check that your backend is running.',
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ?? `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export const api = {
  getDoctors: () => request<Doctor[]>('/api/doctors'),

  getQueue: () => request<QueueResponse>('/api/queue'),

  checkIn: (input: {
    name: string;
    age: number;
    kind: 'appointment' | 'walk_in';
    appointmentTime?: string;
    emergency?: boolean;
  }) =>
    request<Patient>('/api/check-ins', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  callNext: (doctorId: string) =>
    request<PatientResponse>(
      `/api/doctors/${encodeURIComponent(doctorId)}/call-next`,
      { method: 'POST' },
    ),

  done: (doctorId: string) =>
    request<PatientResponse>(
      `/api/doctors/${encodeURIComponent(doctorId)}/done`,
      { method: 'POST' },
    ),

  noShow: (doctorId: string) =>
    request<PatientResponse>(
      `/api/doctors/${encodeURIComponent(doctorId)}/no-show`,
      { method: 'POST' },
    ),
};

export type { Doctor, Patient, PatientKind, QueueResponse };
