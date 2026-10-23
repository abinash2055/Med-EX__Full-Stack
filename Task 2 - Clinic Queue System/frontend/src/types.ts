export type PatientKind = 'emergency' | 'appointment' | 'walk_in';

export interface Patient {
  token: string;
  name: string;
  age: number;
  kind: PatientKind;
  checkedInAt?: string;
  appointmentTime?: string | null;
}

export interface Doctor {
  id: string;
  name: string;
}

export interface ServingPatient {
  doctorId: string;
  token: string;
  name: string;
}

export interface WaitingPatient {
  position: number;
  token: string;
  name: string;
  age?: number;
  kind?: PatientKind;
  estimatedWaitMinutes: number;
}

export interface QueueResponse {
  nowServing: ServingPatient[];
  waiting: WaitingPatient[];
}

export interface PatientResponse {
  patient: Patient | null;
}
