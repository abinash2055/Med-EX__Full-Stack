import express, {
  NextFunction,
  Request,
  Response
} from 'express';
import cors from 'cors';
import {
  Engine,
  HttpError
} from './engine';

/** Clock injection: outside production, an X-Now header overrides the time. */
function getNow(req: Request): number {
  const h = req.header('x-now');
  if (h && process.env.NODE_ENV !== 'production') {
    const t = Date.parse(h);
    if (Number.isNaN(t)) throw new HttpError(400, 'Invalid X-Now header');
    return t;
  }
  return Date.now();
}

export function createApp(engine: Engine, persist: () => void = () => { }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const view = (p: any) => ({
    token: p.token,
    name: p.name,
    age: p.age,
    kind: p.kind,
    checkedInAt: new Date(p.checkInTime).toISOString(),
  });

  app.get('/api/doctors', (_req, res) => res.json(engine.doctors));

  app.post('/api/check-ins', (req, res) => {
    const p = engine.checkIn(req.body ?? {}, getNow(req));
    persist();
    res.status(201).json(view(p));
  });

  app.post('/api/doctors/:id/call-next', (req, res) => {
    const p = engine.callNext(req.params.id, getNow(req));
    persist();
    res.json({ patient: p ? view(p) : null });
  });

  app.post('/api/doctors/:id/done', (req, res) => {
    const p = engine.done(req.params.id);
    persist();
    res.json({ patient: view(p) });
  });

  app.post('/api/doctors/:id/no-show', (req, res) => {
    const p = engine.noShow(req.params.id, getNow(req));
    persist();
    res.json({ patient: view(p) });
  });

  app.get('/api/queue', (req, res) => {
    res.json(engine.queue(getNow(req)));
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({
      error: err.message
    });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({
      error: 'Invalid JSON'
    });
    console.error(err);
    res.status(500).json({
      error: 'Internal server error'
    });
  });

  return app;
}