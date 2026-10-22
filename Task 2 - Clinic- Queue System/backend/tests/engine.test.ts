
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Engine, Doctor } from '../src/engine';

const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/clinic.json'), 'utf8')
);

const doctors: Doctor[] = (
    data.doctors ??
    data.clinic?.doctors ??
    [{ id: 'D1' }, { id: 'D2' }]
).map((d: any) => ({
    id: d.id,
    name: d.name ?? d.id
}));

const T = (s: string) => Date.parse(s);
const norm = (s: string) => s.replace(/-/g, '_').toLowerCase();

function formatTime(timestamp: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kathmandu',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date(timestamp));
}

function replay(events: any[]) {
    const engine = new Engine(doctors);
    const tokens: Record<string, string> = {};
    const tokenList: string[] = [];
    const calls: any[] = [];
    const queues: any[] = [];

    for (const ev of events) {
        const now = T(ev.at);

        switch (norm(ev.type)) {
            case 'check_in': {
                const p = engine.checkIn(ev.patient, now);
                tokens[p.name] = p.token;
                tokenList.push(p.token);
                break;
            }

            case 'call_next': {
                const p = engine.callNext(ev.doctorId, now);

                calls.push({
                    at: formatTime(ev.at),
                    doctorId: ev.doctorId,
                    token: p ? p.token : null,
                    name: p ? p.name : null
                });
                break;
            }

            case 'done':
                engine.done(ev.doctorId);
                break;

            case 'no_show':
                engine.noShow(ev.doctorId, now);
                break;

            case 'queue':
                queues.push(engine.queue(now).waiting);
                break;

            default:
                throw new Error(`Unknown event type ${ev.type}`);
        }
    }

    return { tokens, tokenList, calls, queues };
}

describe('examples from clinic.json', () => {
    const examples: any[] = data.examples ?? [];

    it('has examples', () => {
        expect(examples.length).toBeGreaterThan(0);
    });

    examples.forEach((ex, i) => {
        it(`replays example ${ex.name ?? ex.id ?? i}`, () => {
            const actual = replay(ex.events);
            const exp = ex.expected;

            const expTokens = exp.tokens;
            const expCalls = exp.calls;
            const expQueues =
                exp.queues ?? exp.waiting ?? exp.queueSnapshots;

            if (expTokens !== undefined) {
                if (Array.isArray(expTokens)) {
                    expect(actual.tokenList).toEqual(
                        expTokens.map((x: any) =>
                            typeof x === 'string' ? x : x.token
                        )
                    );
                } else {
                    expect(actual.tokens).toMatchObject(expTokens);
                }
            }

            if (expCalls !== undefined) {
                expect(actual.calls).toMatchObject(expCalls);
            }

            if (expQueues !== undefined) {
                const q = expQueues.map((x: any) =>
                    Array.isArray(x) ? x : x.waiting ?? x.queue
                );

                expect(actual.queues).toMatchObject(q);
            }
        });
    });
});

describe('edge cases', () => {
    const mk = () =>
        new Engine([
            { id: 'D1', name: 'A' },
            { id: 'D2', name: 'B' }
        ]);

    const base = T('2026-11-02T09:00:00+05:45');

    it('exactly 15 min late is on time, 16 is a walk-in', () => {
        const e = mk();
        const appt = '2026-11-02T09:00:00+05:45';

        expect(
            e.checkIn(
                {
                    name: 'a',
                    age: 30,
                    kind: 'appointment',
                    appointmentTime: appt
                },
                base + 15 * 60000
            ).token
        ).toBe('A-001');

        expect(
            e.checkIn(
                {
                    name: 'b',
                    age: 30,
                    kind: 'appointment',
                    appointmentTime: appt
                },
                base + 16 * 60000
            ).token
        ).toBe('W-001');
    });

    it('counters reset at Kathmandu midnight', () => {
        const e = mk();

        expect(
            e.checkIn(
                { name: 'a', age: 1, kind: 'walk_in' },
                T('2026-11-02T23:59:00+05:45')
            ).token
        ).toBe('W-001');

        expect(
            e.checkIn(
                { name: 'b', age: 1, kind: 'walk_in' },
                T('2026-11-03T00:01:00+05:45')
            ).token
        ).toBe('W-001');
    });

    it('fairness: walk-in is called after 3 due appointments', () => {
        const e = mk();
        const appt = '2026-11-02T09:05:00+05:45';

        for (let i = 0; i < 5; i++) {
            e.checkIn(
                {
                    name: `a${i}`,
                    age: 30,
                    kind: 'appointment',
                    appointmentTime: appt
                },
                base
            );
        }

        e.checkIn(
            { name: 'walker', age: 30, kind: 'walk_in' },
            base
        );

        const names: string[] = [];

        for (let i = 0; i < 4; i++) {
            const doc = i % 2 ? 'D2' : 'D1';
            names.push(e.callNext(doc, base)!.name);
            e.done(doc);
        }

        expect(names).toEqual(['a0', 'a1', 'a2', 'walker']);
    });

    it('no-show: first goes back as walk-in with same token, second leaves', () => {
        const e = mk();

        const p = e.checkIn(
            {
                name: 'x',
                age: 30,
                kind: 'appointment',
                appointmentTime: '2026-11-02T09:00:00+05:45'
            },
            base
        );

        e.callNext('D1', base);
        e.noShow('D1', base + 60000);

        expect(e.queue(base + 60000).waiting[0].token).toBe(p.token);

        e.callNext('D1', base + 120000);
        e.noShow('D1', base + 180000);

        expect(e.queue(base + 180000).waiting).toHaveLength(0);
    });

    it('409 when calling next while busy; never same patient twice', () => {
        const e = mk();

        e.checkIn(
            { name: 'x', age: 30, kind: 'walk_in' },
            base
        );

        e.checkIn(
            { name: 'y', age: 30, kind: 'walk_in' },
            base + 1
        );

        const a = e.callNext('D1', base + 2)!;
        const b = e.callNext('D2', base + 2)!;

        expect(a.token).not.toBe(b.token);
        expect(() => e.callNext('D1', base + 3)).toThrow(/already/);
    });

    it('65+ walk-ins and emergencies go first', () => {
        const e = mk();

        e.checkIn(
            { name: 'young', age: 20, kind: 'walk_in' },
            base
        );

        e.checkIn(
            { name: 'old', age: 70, kind: 'walk_in' },
            base + 1000
        );

        e.checkIn(
            {
                name: 'emerg',
                age: 40,
                kind: 'walk_in',
                emergency: true
            },
            base + 2000
        );

        expect(
            e.queue(base + 3000).waiting.map(w => w.name)
        ).toEqual(['emerg', 'old', 'young']);
    });
});
