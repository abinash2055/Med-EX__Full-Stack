const MIN = 60_000;

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
  counters: Record<string, {
    E: number;
    A: number;
    W: number
  }>;
  patients: Patient[];
  calls: Call[];
  doctors: Record<string, number | null>; // doctorId -> patient id being seen
}
export interface Doctor {
  id: string;
  name: string
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Clinic-local calendar day (Asia/Kathmandu = UTC+05:45). */
export const dayKey = (ms: number) =>
  new Date(ms + 345 * MIN).toISOString().slice(0, 10);

/** Rules 3 + 4: choose who is called next. Pure function. */
export function choose(
  waiting: Patient[],
  history: { rule: Rule }[],
  now: number
): {
  patient: Patient;
  rule: Rule
} | null {
  const byCheckIn = (a: Patient, b: Patient) =>
    a.checkInTime - b.checkInTime || a.id - b.id;

  // 3.1 Emergencies
  const emergencies = waiting.filter(p => p.kind === 'emergency').sort(byCheckIn);

  if (emergencies.length) return {
    patient: emergencies[0],
    rule: 'emergency'
  };

  // 3.2 Due appointments
  const appts = waiting.filter(p => p.kind === 'appointment');
  const byAppt = (a: Patient, b: Patient) =>
    a.appointmentTime! - b.appointmentTime! || byCheckIn(a, b);
  const due = appts.filter(p => p.appointmentTime! <= now + 10 * MIN).sort(byAppt);

  // 3.3 Walk-ins: 65+ first, then check-in time
  const walkIns = waiting
    .filter(p => p.kind === 'walk_in')
    .sort((a, b) => (a.age >= 65 ? 0 : 1) - (b.age >= 65 ? 0 : 1) || byCheckIn(a, b));

  // Rule 4 fairness: last 3 non-emergency calls were all due appointments
  const last3 = history.filter(c => c.rule !== 'emergency').slice(-3);
  const starving = last3.length === 3 && last3.every(c => c.rule === 'due');

  if (due.length && walkIns.length && starving) return {
    patient: walkIns[0],
    rule: 'walk_in'
  };
  if (due.length) return {
    patient: due[0],
    rule: 'due'
  };
  if (walkIns.length) return {
    patient: walkIns[0],
    rule: 'walk_in'
  };

  // 3.4 Earliest appointment, even if not due yet
  const early = appts.sort(byAppt);
  if (early.length) return {
    patient: early[0],
    rule: 'early'
  };
  return null;
}

export interface CheckInInput {
  name?: unknown;
  age?: unknown;
  kind?: unknown;
  appointmentTime?: unknown;
  emergency?: unknown;
}

export class Engine {
  state: State;

  constructor(public doctors: Doctor[], state?: State) {
    this.state = state ?? {
      nextId: 1,
      counters: {},
      patients: [],
      calls: [],
      doctors: {},
    };
    for (const d of doctors) {
      if (!(d.id in this.state.doctors)) this.state.doctors[d.id] = null;
    }
  }

  private waiting() {
    return this.state.patients.filter(p => p.status === 'waiting');
  }

  private assertDoctor(id: string) {
    if (!(id in this.state.doctors)) throw new HttpError(404, `Unknown doctor ${id}`);
  }

  checkIn(input: CheckInInput, now: number): Patient {
    if (typeof input.name !== 'string' || !input.name.trim())
      throw new HttpError(400, 'name is required');
    const age = input.age;
    if (typeof age !== 'number' || !Number.isFinite(age) || age < 0 || age > 120)
      throw new HttpError(400, 'age must be a number between 0 and 120');
    const emergency = input.emergency === true;
    if (!emergency && input.kind !== 'appointment' && input.kind !== 'walk_in')
      throw new HttpError(400, 'kind must be "appointment" or "walk_in"');

    let appt: number | null = null;
    if (input.kind === 'appointment') {
      appt = typeof input.appointmentTime === 'string' ? Date.parse(input.appointmentTime) : NaN;
      if (Number.isNaN(appt))
        throw new HttpError(400, 'appointmentTime (ISO date-time) is required for appointments');
    }

    let kind: Kind;
    if (emergency) kind = 'emergency';
    else if (input.kind === 'appointment') {
      // exactly 15 minutes late is still on time
      kind = now - appt! > 15 * MIN ? 'walk_in' : 'appointment';
    } else kind = 'walk_in';

    const letter = kind === 'emergency' ? 'E' : kind === 'appointment' ? 'A' : 'W';
    const day = dayKey(now);
    const counters = (this.state.counters[day] ??= { E: 0, A: 0, W: 0 });
    counters[letter] += 1;

    const patient: Patient = {
      id: this.state.nextId++,
      token: `${letter}-${String(counters[letter]).padStart(3, '0')}`,
      name: input.name.trim(),
      age,
      kind,
      appointmentTime: kind === 'appointment' ? appt : null,
      checkInTime: now,
      status: 'waiting',
      noShowCount: 0,
      doctorId: null,
    };
    this.state.patients.push(patient);
    return patient;
  }

  /** Synchronous = atomic in Node: two doctors can never get the same patient. */
  callNext(doctorId: string, now: number): Patient | null {
    this.assertDoctor(doctorId);
    if (this.state.doctors[doctorId] !== null)
      throw new HttpError(409, 'Doctor is already seeing a patient. Press Done or No-show first.');
    const choice = choose(this.waiting(), this.state.calls, now);
    
    if (!choice) return null;
    const { patient, rule } = choice;
    patient.status = 'serving';
    patient.doctorId = doctorId;
    this.state.doctors[doctorId] = patient.id;
    this.state.calls.push({ at: now, doctorId, token: patient.token, name: patient.name, rule });
    return patient;
  }

  private current(doctorId: string): Patient {
    this.assertDoctor(doctorId);
    const id = this.state.doctors[doctorId];
    if (id === null) throw new HttpError(409, 'Doctor has no patient right now.');
    return this.state.patients.find(p => p.id === id)!;
  }

  done(doctorId: string): Patient {
    const p = this.current(doctorId);
    p.status = 'done';
    p.doctorId = null;
    this.state.doctors[doctorId] = null;
    return p;
  }

  noShow(doctorId: string, now: number): Patient {
    const p = this.current(doctorId);
    p.noShowCount += 1;
    p.doctorId = null;
    this.state.doctors[doctorId] = null;
    if (p.noShowCount === 1) {
      p.status = 'waiting';
      p.kind = 'walk_in'; // keeps token
      p.appointmentTime = null;
      p.checkInTime = now;
    } else {
      p.status = 'gone';
    }
    return p;
  }

  /** Waiting patients in the order they would be called right now (rules 3 + 4). */
  order(now: number): Patient[] {
    const left = [...this.waiting()];
    const hist: { rule: Rule }[] = [...this.state.calls];
    const out: Patient[] = [];
    while (left.length) {
      const c = choose(left, hist, now)!;
      out.push(c.patient);
      hist.push({ rule: c.rule });
      left.splice(left.indexOf(c.patient), 1);
    }
    return out;
  }

  queue(now: number) {
    const n = this.doctors.length;
    return {
      nowServing: this.doctors
        .filter(d => this.state.doctors[d.id] !== null)
        .map(d => {
          const p = this.state.patients.find(x => x.id === this.state.doctors[d.id])!;
          return { doctorId: d.id, token: p.token, name: p.name };
        }),
      waiting: this.order(now).map((p, i) => ({
        position: i,
        token: p.token,
        name: p.name,
        estimatedWaitMinutes: Math.floor(i / n) * 12,
      })),
    };
  }
}