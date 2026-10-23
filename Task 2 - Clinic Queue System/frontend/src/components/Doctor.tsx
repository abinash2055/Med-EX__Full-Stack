
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Doctor as DoctorType, QueueResponse } from '../types';

export default function Doctor() {
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [doctorId, setDoctorId] = useState('D1');
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [doctorList, queueData] = await Promise.all([
        api.getDoctors(),
        api.getQueue(),
      ]);

      setDoctors(doctorList);
      setQueue(queueData);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load doctor information.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const currentPatient = queue?.nowServing.find(
    (patient) => patient.doctorId === doctorId,
  );

  async function performAction(
    action: 'call' | 'done' | 'no-show',
  ) {
    setActionLoading(true);
    setError('');
    setNotice('');

    try {
      if (action === 'call') {
        const result = await api.callNext(doctorId);
        setNotice(
          result.patient
            ? `Now calling ${result.patient.token} — ${result.patient.name}.`
            : 'No patients are waiting.',
        );
      } else if (action === 'done') {
        const result = await api.done(doctorId);
        setNotice(
          result.patient
            ? `Visit completed for ${result.patient.token}.`
            : 'Visit completed.',
        );
      } else {
        const result = await api.noShow(doctorId);
        setNotice(
          result.patient
            ? `No-show recorded for ${result.patient.token}.`
            : 'No-show recorded.',
        );
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Doctor action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !queue) {
    return <section className="page"><p className="state-message">Loading doctor dashboard…</p></section>;
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLINICAL WORKSPACE</p>
          <h1>Doctor dashboard</h1>
          <p className="muted">Call patients and manage consultations.</p>
        </div>
        <span className="live-indicator">● Live queue</span>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}

      <div className="panel doctor-controls">
        <label htmlFor="doctor-select">Choose doctor</label>
        <select
          id="doctor-select"
          value={doctorId}
          onChange={(event) => {
            setDoctorId(event.target.value);
            setNotice('');
            setError('');
          }}
        >
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.id})
            </option>
          ))}
        </select>
      </div>

      <div className="panel current-patient">
        <p className="eyebrow">CURRENT PATIENT</p>

        {currentPatient ? (
          <>
            <div className="large-token">{currentPatient.token}</div>
            <h2>{currentPatient.name}</h2>
            <p className="muted">
              {doctors.find((doctor) => doctor.id === doctorId)?.name ?? doctorId}
            </p>
            <span className="status-pill status-serving">In consultation</span>
          </>
        ) : (
          <>
            <div className="empty-avatar">—</div>
            <h2>No patient currently assigned</h2>
            <p className="muted">Call the next patient when you are ready.</p>
          </>
        )}

        <div className="doctor-actions">
          <button
            className="button button-primary"
            onClick={() => void performAction('call')}
            disabled={actionLoading || !!currentPatient}
          >
            {actionLoading && !currentPatient ? 'Processing…' : 'Call next'}
          </button>

          <button
            className="button button-success"
            onClick={() => void performAction('done')}
            disabled={actionLoading || !currentPatient}
          >
            Done
          </button>

          <button
            className="button button-danger"
            onClick={() => void performAction('no-show')}
            disabled={actionLoading || !currentPatient}
          >
            No-show
          </button>
        </div>

        {currentPatient && (
          <p className="field-hint">
            Mark this visit Done or No-show before calling another patient.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="section-heading">
          <h2>Upcoming queue</h2>
          <span className="count-badge">{queue?.waiting.length ?? 0} waiting</span>
        </div>

        {!queue || queue.waiting.length === 0 ? (
          <p className="state-message">No patients are waiting.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Token</th>
                  <th>Name</th>
                  <th>Estimated wait</th>
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
      </div>
    </section>
  );
}
