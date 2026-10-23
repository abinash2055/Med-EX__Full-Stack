import {
  useEffect,
  useState
} from 'react';
import { api } from '../api';
import type { QueueResponse } from '../types';

export default function WaitingRoom() {
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [highlightedTokens, setHighlightedTokens] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let previousTokens = new Set<string>();
    let highlightTimer: number | undefined;

    const refresh = async () => {
      try {
        const result = await api.getQueue();

        if (!active) return;

        const currentTokens = new Set(
          result.nowServing.map((patient) => patient.token),
        );

        const newlyCalled = [...currentTokens].filter(
          (token) => !previousTokens.has(token),
        );

        if (newlyCalled.length > 0) {
          setHighlightedTokens(newlyCalled);

          if (highlightTimer !== undefined) {
            window.clearTimeout(highlightTimer);
          }

          highlightTimer = window.setTimeout(() => {
            if (active) setHighlightedTokens([]);
          }, 5000);
        }

        previousTokens = currentTokens;
        setQueue(result);
        setLastUpdated(new Date());
        setError('');
      } catch (err) {
        if (!active) return;

        setQueue(null);
        setHighlightedTokens([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Waiting-room display is disconnected.',
        );
      }
    };

    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);

      if (highlightTimer !== undefined) {
        window.clearTimeout(highlightTimer);
      }
    };
  }, []);

  return (
    <main className="waiting-room">
      <header className="waiting-room-header">
        <div>
          <p className="eyebrow">BODHI FAMILY CLINIC · KATHMANDU</p>
          <h1>Patient Queue</h1>
        </div>
        <div className="display-clock">
          {
            new Date().toLocaleTimeString('en-GB', {
              timeZone: 'Asia/Kathmandu',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          <span>Nepal Time</span>
        </div>
      </header>

      {
        error ? (
          <section className="display-offline" role="alert">
            <div className="offline-symbol">!</div>
            <h2>Display temporarily unavailable</h2>
            <p>{error}</p>
            <p>The screen will reconnect automatically.</p>
          </section>
        ) : !queue ? (
          <section className="display-offline">
            <h2>Loading current queue…</h2>
          </section>
        ) : (
          <>
            <section className="display-serving">
              <div className="display-section-heading">
                <span className="live-dot" />
                <h2>NOW SERVING</h2>
              </div>

              {
                queue.nowServing.length === 0 ? (
                  <div className="display-empty">
                    <p>No patient is being called right now.</p>
                    <span>Please wait for your token to be displayed.</span>
                  </div>
                ) : (
                  <div className="display-serving-grid">
                    {
                      queue.nowServing.map((patient) => (
                        <article
                          key={patient.doctorId}
                          className={`display-serving-card ${highlightedTokens.includes(patient.token)
                            ? 'newly-called'
                            : ''
                            }`}
                        >
                          <span className="display-doctor">{patient.doctorId}</span>
                          <div className="display-token">{patient.token}</div>
                          <div className="display-patient-name">{patient.name}</div>
                          <span className="display-status">Please proceed to your doctor</span>
                        </article>
                      ))}
                  </div>
                )}
            </section>

            <section className="display-waiting">
              <div className="display-section-heading">
                <h2>UP NEXT</h2>
                <span>{queue.waiting.length} waiting</span>
              </div>

              {
              queue.waiting.length === 0 ? (
                <p className="display-empty">There are no patients waiting.</p>
              ) : (
                <div className="display-upcoming-grid">
                  {
                    queue.waiting.slice(0, 6).map((patient) => (
                      <article className="display-upcoming-card" key={
                        patient.token}>
                        <span>{patient.token}</span>
                        <strong>{patient.name}</strong>
                        <small>
                          {
                            patient.estimatedWaitMinutes === 0
                              ? 'Next'
                              : `~${patient.estimatedWaitMinutes} min`}
                        </small>
                      </article>
                    ))}
                </div>
              )}
            </section>

            <footer className="display-footer">
              <span>Please listen for your token and follow staff instructions.</span>
              <span>
                {
                  lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString('en-GB', {
                      timeZone: 'Asia/Kathmandu',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                    : 'Connecting…'}
              </span>
            </footer>
          </>
        )}
    </main>
  );
}
