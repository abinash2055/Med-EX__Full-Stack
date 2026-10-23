
import {
  describe,
  it,
  expect
} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  Engine,
  Doctor
} from '../src/engine';

const dataPath = path.join(__dirname, '../data/clinic.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const doctorData =
  data.doctors ??
  data.clinic?.doctors ??
  [
    {
      id: 'D1'
    },
    {
      id: 'D2'
    }
  ];

const doctors: Doctor[] = doctorData.map((doctor: any) => ({
  id: doctor.id,
  name: doctor.name ?? doctor.id,
}));

const timestamp = (value: string): number => {
  const result = Date.parse(value);

  if (Number.isNaN(result)) {
    throw new Error(`Invalid test timestamp: ${value}`);
  }

  return result;
};

const normalizeEventType = (value: string): string =>
  value.replace(/-/g, '_').toLowerCase();

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function replay(events: any[]) {
  const engine = new Engine(doctors);

  const tokens: Record<string, string> = {};
  const tokenList: string[] = [];
  const calls: any[] = [];
  const queues: any[] = [];

  for (const event of events) {
    const now = timestamp(event.at);

    switch (normalizeEventType(event.type)) {
      case 'check_in': {
        const patient = engine.checkIn(event.patient, now);

        tokens[patient.name] = patient.token;
        tokenList.push(patient.token);
        break;
      }

      case 'call_next': {
        const patient = engine.callNext(event.doctorId, now);

        calls.push({
          at: formatTime(event.at),
          doctorId: event.doctorId,
          token: patient?.token ?? null,
          name: patient?.name ?? null,
        });
        break;
      }

      case 'done': {
        engine.done(event.doctorId);
        break;
      }

      case 'no_show': {
        engine.noShow(event.doctorId, now);
        break;
      }

      case 'queue': {
        queues.push(engine.queue(now).waiting);
        break;
      }

      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  return {
    tokens,
    tokenList,
    calls,
    queues
  };
}

describe('Examples from clinic.json', () => {
  const examples: any[] = data.examples ?? [];

  it('contains at least one example', () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  examples.forEach((example, index) => {
    it(`replays example: ${example.name ?? example.id ?? index}`, () => {
      const actual = replay(example.events);
      const expected = example.expected;

      const expectedTokens = expected.tokens;
      const expectedCalls = expected.calls;

      const expectedQueues =
        expected.queues ??
        expected.waiting ??
        expected.queueSnapshots;

      if (expectedTokens !== undefined) {
        if (Array.isArray(expectedTokens)) {
          expect(actual.tokenList).toEqual(
            expectedTokens.map((item: any) =>
              typeof item === 'string' ? item : item.token
            )
          );
        } else {
          expect(actual.tokens).toMatchObject(expectedTokens);
        }
      }

      if (expectedCalls !== undefined) {
        expect(actual.calls).toMatchObject(expectedCalls);
      }

      if (expectedQueues !== undefined) {
        const normalizedQueues = expectedQueues.map((item: any) => {
          if (Array.isArray(item)) {
            return item;
          }

          return item.waiting ?? item.queue;
        });

        expect(actual.queues).toMatchObject(normalizedQueues);
      }
    });
  });
});

describe('Engine edge cases', () => {
  const createEngine = () =>
    new Engine([
      {
        id: 'D1',
        name: 'Doctor A'
      },
      {
        id: 'D2',
        name: 'Doctor B'
      },
    ]);

  const base = timestamp('2026-11-02T09:00:00+05:45');

  it('accepts an appointment exactly 15 minutes late', () => {
    const engine = createEngine();

    const patient = engine.checkIn(
      {
        name: 'On-time patient',
        age: 30,
        kind: 'appointment',
        appointmentTime: '2026-11-02T09:00:00+05:45',
      },
      base + 15 * 60_000
    );

    expect(patient.token).toBe('A-001');
    expect(patient.kind).toBe('appointment');
  });

  it('converts an appointment 16 minutes late into a walk-in', () => {
    const engine = createEngine();

    const patient = engine.checkIn(
      {
        name: 'Late patient',
        age: 30,
        kind: 'appointment',
        appointmentTime: '2026-11-02T09:00:00+05:45',
      },
      base + 16 * 60_000
    );

    expect(patient.token).toBe('W-001');
    expect(patient.kind).toBe('walk_in');
  });

  it('resets daily token counters at Kathmandu midnight', () => {
    const engine = createEngine();

    const first = engine.checkIn(
      {
        name: 'First',
        age: 25,
        kind: 'walk_in'
      },
      timestamp('2026-11-02T23:59:00+05:45')
    );

    const second = engine.checkIn(
      {
        name: 'Second',
        age: 25,
        kind: 'walk_in'
      },
      timestamp('2026-11-03T00:01:00+05:45')
    );

    expect(first.token).toBe('W-001');
    expect(second.token).toBe('W-001');
  });

  it('serves a walk-in after three consecutive due-appointment calls', () => {
    const engine = createEngine();

    for (let index = 0; index < 5; index++) {
      engine.checkIn(
        {
          name: `Appointment ${index}`,
          age: 30,
          kind: 'appointment',
          appointmentTime: '2026-11-02T09:05:00+05:45',
        },
        base
      );
    }

    engine.checkIn(
      {
        name: 'Walk-in patient',
        age: 30,
        kind: 'walk_in'
      },
      base
    );

    const calledNames: string[] = [];

    for (let index = 0; index < 4; index++) {
      const doctorId = index % 2 === 0 ? 'D1' : 'D2';
      const patient = engine.callNext(doctorId, base);

      expect(patient).not.toBeNull();
      calledNames.push(patient!.name);

      engine.done(doctorId);
    }

    expect(calledNames).toEqual([
      'Appointment 0',
      'Appointment 1',
      'Appointment 2',
      'Walk-in patient',
    ]);
  });

  it('returns a first no-show to the queue with the same token', () => {
    const engine = createEngine();

    const original = engine.checkIn(
      {
        name: 'No-show patient',
        age: 30,
        kind: 'appointment',
        appointmentTime: '2026-11-02T09:00:00+05:45',
      },
      base
    );

    engine.callNext('D1', base);
    engine.noShow('D1', base + 60_000);

    const waiting = engine.queue(base + 60_000).waiting;

    expect(waiting).toHaveLength(1);
    expect(waiting[0].token).toBe(original.token);
    expect(waiting[0].kind).toBe('walk_in');
  });

  it('removes a patient after the second no-show', () => {
    const engine = createEngine();

    engine.checkIn(
      {
        name: 'Repeated no-show',
        age: 30,
        kind: 'appointment',
        appointmentTime: '2026-11-02T09:00:00+05:45',
      },
      base
    );

    engine.callNext('D1', base);
    engine.noShow('D1', base + 60_000);

    engine.callNext('D1', base + 120_000);
    engine.noShow('D1', base + 180_000);

    expect(engine.queue(base + 180_000).waiting).toHaveLength(0);
  });

  it('rejects a second call-next for a busy doctor', () => {
    const engine = createEngine();

    engine.checkIn(
      {
        name: 'Patient One',
        age: 30,
        kind: 'walk_in'
      },
      base
    );

    engine.checkIn(
      {
        name: 'Patient Two',
        age: 30,
        kind: 'walk_in'
      },
      base + 1
    );

    const first = engine.callNext('D1', base + 2);
    const second = engine.callNext('D2', base + 2);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.token).not.toBe(second!.token);

    expect(() => engine.callNext('D1', base + 3)).toThrow(/already/i);
  });

  it('prioritizes emergencies, then walk-ins aged 65 or older', () => {
    const engine = createEngine();

    engine.checkIn(
      {
        name: 'Young patient',
        age: 20,
        kind: 'walk_in'
      },
      base
    );

    engine.checkIn(
      {
        name: 'Older patient',
        age: 70,
        kind: 'walk_in'
      },
      base + 1_000
    );

    engine.checkIn(
      {
        name: 'Emergency patient',
        age: 40,
        kind: 'walk_in',
        emergency: true,
      },
      base + 2_000
    );

    expect(
      engine.queue(base + 3_000).waiting.map((patient) => patient.name)
    ).toEqual([
      'Emergency patient',
      'Older patient',
      'Young patient',
    ]);
  });
});
