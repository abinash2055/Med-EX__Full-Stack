
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { QueueResponse } from '../types';

export default function Reception() {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [kind, setKind] = useState<'appointment' | 'walk_in'>('walk_in');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshQueue = useCallback(async () => {
    try {
      const data = await api.getQueue();
      setQueue(data);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load the queue.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueue();
    const interval = window.setInterval(() => {
      void refreshQueue();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [refreshQueue]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const numericAge = Number(age);

    if (!name.trim()) {
      setError('Please enter the patient name.');
      return;
    }

    if (age.trim() === '' || !Number.isFinite(numericAge) ||
        numericAge < 0 || numericAge > 120) {
      setError('Age must be between 0 and 120.');
      return;
    }

    if (kind === 'appointment' && !appointmentTime) {
      setError('Please select the appointment date and time.');
      return;
    }

    let appointmentISO: string | undefined;

    if (kind === 'appointment') {
      const parsed = new Date(appointmentTime);

      if (Number.isNaN(parsed.getTime())) {
        setError('Please enter a valid appointment date and time.');
        return;
      }

      appointmentISO = parsed.toISOString();
    }

    setSubmitting(true);

    try {
      const patient = await api.checkIn({
        name: name.trim(),
        age: numericAge,
        kind,
        ...(appointmentISO ? { appointmentTime: appointmentISO } : {}),
        emergency,
      });

      setSuccess(
        `${patient.name} checked in successfully. Token: ${patient.token}`,
      );
      setName('');
      setAge('');
      setKind('walk_in');
      setAppointmentTime('');
      setEmergency(false);

      await refreshQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BODHI FAMILY CLINIC</p>
          <h1>Reception</h1>
          <p className="muted">Register patients and manage today's queue.</p>
        </div>
        <span className="live-indicator">● Live queue</span>
      </div>

      <div className="reception-layout">
        <form className="panel checkin-form" onSubmit={handleSubmit}>
          <h2>Patient check-in</h2>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}

          <label htmlFor="patient-name">Patient name</label>
          <input
            id="patient-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter full name"
            maxLength={100}
            required
          />

          <label htmlFor="patient-age">Age</label>
          <input
            id="patient-age"
            type="number"
            min="0"
            max="120"
            step="1"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            placeholder="Age in years"
            required
          />

          <label htmlFor="patient-kind">Patient type</label>
          <select
            id="patient-kind"
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as 'appointment' | 'walk_in')
            }
          >
            <option value="walk_in">Walk-in</option>
            <option value="appointment">Appointment</option>
          </select>

          {kind === 'appointment' && (
            <>
              <label htmlFor="appointment-time">Appointment date and time</label>
              <input
                id="appointment-time"
                type="datetime-local"
                value={appointmentTime}
                onChange={(event) => setAppointmentTime(event.target.value)}
                required
              />
              <p className="field-hint">
                Appointments more than 15 minutes late are treated as walk-ins.
              </p>
            </>
          )}

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={emergency}
              onChange={(event) => setEmergency(event.target.checked)}
            />
            Mark as emergency
          </label>

          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Checking in…' : 'Check in patient'}
          </button>
        </form>

        <div className="panel queue-panel">
          <div className="section-heading">
            <div>
              <h2>Waiting queue</h2>
              <p className="muted">Updated automatically every 3 seconds.</p>
            </div>
            <span className="count-badge">{queue?.waiting.length ?? '—'} waiting</span>
          </div>

          {loading && !queue ? (
            <p className="state-message">Loading queue…</p>
          ) : error && !queue ? (
            <p className="state-message">Queue unavailable. Check your server connection.</p>
          ) : !queue ? (
            <p className="state-message">No queue data available.</p>
          ) : queue.waiting.length === 0 ? (
            <p className="state-message">No patients are waiting.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Wait estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.waiting.map((patient) => (
                    <tr key={patient.token}>
                      <td>{patient.position + 1}</td>
                      <td><span className="token">{patient.token}</span></td>
                      <td>{patient.name}</td>
                      <td>
                        {patient.estimatedWaitMinutes === 0
                          ? 'Next'
                          : `~${patient.estimatedWaitMinutes} min`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {queue && (
            <div className="serving-summary">
              <h3>Now serving</h3>
              {queue.nowServing.length === 0 ? (
                <p className="muted">No doctor is currently seeing a patient.</p>
              ) : (
                queue.nowServing.map((patient) => (
                  <div className="serving-row" key={patient.doctorId}>
                    <span>{patient.doctorId}</span>
                    <strong>{patient.token}</strong>
                    <span>{patient.name}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
