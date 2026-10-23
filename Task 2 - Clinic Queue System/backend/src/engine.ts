
const MIN = 60_000;
const KATHMANDU_OFFSET_MINUTES = 345;

export type Kind = 'emergency' | 'appointment' | 'walk_in';
export type Rule = 'emergency' | 'due' | 'walk_in' | 'early';

export interface Patient {
  id: number;
  token: string;
  name: string;
  age: number;
  kind: Kind;
  appointmentTime: number | null;
  checkInTime: number;
  status: 'waiting' | 'serving' | 'done' | 'gone';
  noShowCount: number;
  doctorId: string | null;
}

export interface Call {
  at: number;
  doctorId: string;
  token: string;
  name: string;
  rule: Rule;
}

export interface State {
  nextId: number;
  counters: Record<string, { E: number; A: number; W: number }>;
  patients: Patient[];
  calls: Call[];
  doctors: Record<string, number | null>;
}

export interface Doctor {
  id: string;
  name: string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function dayKey(ms: number): string {
  return new Date(
    ms + KATHMANDU_OFFSET_MINUTES * MIN
  ).toISOString().slice(0, 10);
}

export interface CheckInInput {
  name?: unknown;
  age?: unknown;
  kind?: unknown;
  appointmentTime?: unknown;
  emergency?: unknown;
}

export function choose(
  waiting: Patient[],
  history: { rule: Rule }[],
  now: number
): { patient: Patient; rule: Rule } | null {
  const byCheckIn = (a: Patient, b: Patient) =>
    a.checkInTime - b.checkInTime || a.id - b.id;

  // Rule 3.1: emergencies always come first.
  const emergencies = waiting
    .filter(p => p.kind === 'emergency')
    .sort(byCheckIn);

  if (emergencies.length) {
    return { patient: emergencies[0], rule: 'emergency' };
  }

  // Rule 3.2: appointments due within the next ten minutes.
  const byAppointment = (a: Patient, b: Patient) =>
    a.appointmentTime! - b.appointmentTime! || byCheckIn(a, b);

  const due = waiting
    .filter(
      p =>
        p.kind === 'appointment' &&
        p.appointmentTime! <= now + 10 * MIN
    )
    .sort(byAppointment);

  // Rule 3.3: walk-ins aged 65+ have priority over other walk-ins.
  const walkIns = waiting
    .filter(p => p.kind === 'walk_in')
    .sort(
      (a, b) =>
        Number(b.age >= 65) - Number(a.age >= 65) ||
        byCheckIn(a, b)
    );

  // Ignore emergencies when counting the last three calls.
  const lastThree = history
    .filter(call => call.rule !== 'emergency')
    .slice(-3);

  const mustServeWalkIn =
    lastThree.length === 3 &&
    lastThree.every(call => call.rule === 'due');

  if (due.length && walkIns.length && mustServeWalkIn) {
    return { patient: walkIns[0], rule: 'walk_in' };
  }

  if (due.length) {
    return { patient: due[0], rule: 'due' };
  }

  if (walkIns.length) {
    return { patient: walkIns[0], rule: 'walk_in' };
  }

  // Rule 3.4: if no other patient is waiting, serve the
  // earliest appointment even when it is not due yet.
  const early = waiting
    .filter(p => p.kind === 'appointment')
    .sort(byAppointment);

  if (early.length) {
    return { patient: early[0], rule: 'early' };
  }

  return null;
}

export class Engine {
  state: State;

  constructor(public doctors: Doctor[], state?: State) {
    this.state = state ?? {
      nextId: 1,
      counters: {},
      patients: [],
      calls: [],
      doctors: {}
    };

    for (const doctor of doctors) {
      if (!(doctor.id in this.state.doctors)) {
        this.state.doctors[doctor.id] = null;
      }
    }
  }

  private waiting(): Patient[] {
    return this.state.patients.filter(
      patient => patient.status === 'waiting'
    );
  }

  private assertDoctor(id: string): void {
    if (!(id in this.state.doctors)) {
      throw new HttpError(404, `Unknown doctor ${id}`);
    }
  }

  checkIn(input: CheckInInput, now: number): Patient {
    if (typeof input.name !== 'string' || !input.name.trim()) {
      throw new HttpError(400, 'name is required');
    }

    if (
      typeof input.age !== 'number' ||
      !Number.isFinite(input.age) ||
      input.age < 0 ||
      input.age > 120
    ) {
      throw new HttpError(400, 'age must be a number between 0 and 120');
    }

    const emergency = input.emergency === true;

    if (
      !emergency &&
      input.kind !== 'appointment' &&
      input.kind !== 'walk_in'
    ) {
      throw new HttpError(
        400,
        'kind must be "appointment" or "walk_in"'
      );
    }

    let appointmentTime: number | null = null;

    if (input.kind === 'appointment') {
      appointmentTime =
        typeof input.appointmentTime === 'string'
          ? Date.parse(input.appointmentTime)
          : NaN;

      if (
        appointmentTime === null ||
        !Number.isFinite(appointmentTime)
      ) {
        throw new HttpError(
          400,
          'appointmentTime (ISO date-time) is required for appointments'
        );
      }
    }

    let kind: Kind;

    if (emergency) {
      kind = 'emergency';
    } else if (input.kind === 'appointment') {
      // Exactly 15 minutes late is still an appointment.
      kind =
        now - appointmentTime! > 15 * MIN
          ? 'walk_in'
          : 'appointment';
    } else {
      kind = 'walk_in';
    }

    const letter =
      kind === 'emergency'
        ? 'E'
        : kind === 'appointment'
          ? 'A'
          : 'W';

    const day = dayKey(now);

    const counters = (this.state.counters[day] ??= {
      E: 0,
      A: 0,
      W: 0
    });

    counters[letter]++;

    const patient: Patient = {
      id: this.state.nextId++,
      token: `${letter}-${String(counters[letter]).padStart(3, '0')}`,
      name: input.name.trim(),
      age: input.age,
      kind,
      appointmentTime:
        kind === 'appointment' ? appointmentTime : null,
      checkInTime: now,
      status: 'waiting',
      noShowCount: 0,
      doctorId: null
    };

    this.state.patients.push(patient);

    return patient;
  }

  callNext(doctorId: string, now: number): Patient | null {
    this.assertDoctor(doctorId);

    if (this.state.doctors[doctorId] !== null) {
      throw new HttpError(
        409,
        'Doctor is already seeing a patient. Press Done or No-show first.'
      );
    }

    const choice = choose(
      this.waiting(),
      this.state.calls,
      now
    );

    if (!choice) return null;

    const { patient, rule } = choice;

    patient.status = 'serving';
    patient.doctorId = doctorId;
    this.state.doctors[doctorId] = patient.id;

    this.state.calls.push({
      at: now,
      doctorId,
      token: patient.token,
      name: patient.name,
      rule
    });

    return patient;
  }

  private current(doctorId: string): Patient {
    this.assertDoctor(doctorId);

    const id = this.state.doctors[doctorId];

    if (id === null) {
      throw new HttpError(409, 'Doctor has no patient right now.');
    }

    const patient = this.state.patients.find(p => p.id === id);

    if (!patient) {
      throw new HttpError(500, 'Current patient was not found.');
    }

    return patient;
  }

  done(doctorId: string): Patient {
    const patient = this.current(doctorId);

    patient.status = 'done';
    patient.doctorId = null;
    this.state.doctors[doctorId] = null;

    return patient;
  }

  noShow(doctorId: string, now: number): Patient {
    const patient = this.current(doctorId);

    patient.noShowCount++;
    patient.doctorId = null;
    this.state.doctors[doctorId] = null;

    if (patient.noShowCount === 1) {
      patient.status = 'waiting';
      patient.kind = 'walk_in';
      patient.appointmentTime = null;
      patient.checkInTime = now;
    } else {
      patient.status = 'gone';
    }

    return patient;
  }

  order(now: number): Patient[] {
    const remaining = [...this.waiting()];
    const history: { rule: Rule }[] = [...this.state.calls];
    const ordered: Patient[] = [];

    while (remaining.length) {
      const choice = choose(remaining, history, now);

      if (!choice) break;

      ordered.push(choice.patient);
      history.push({ rule: choice.rule });

      const index = remaining.indexOf(choice.patient);
      remaining.splice(index, 1);
    }

    return ordered;
  }

  queue(now: number) {
    const doctorCount = this.doctors.length;

    return {
      nowServing: this.doctors
        .filter(doctor => this.state.doctors[doctor.id] !== null)
        .map(doctor => {
          const patientId = this.state.doctors[doctor.id]!;
          const patient = this.state.patients.find(
            p => p.id === patientId
          )!;

          return {
            doctorId: doctor.id,
            token: patient.token,
            name: patient.name
          };
        }),

      waiting: this.order(now).map((patient, position) => ({
        position,
        token: patient.token,
        name: patient.name,
        age: patient.age,
        kind: patient.kind,
        estimatedWaitMinutes:
          doctorCount > 0
            ? Math.floor(position / doctorCount) * 12
            : 0
      }))
    };
  }
}
