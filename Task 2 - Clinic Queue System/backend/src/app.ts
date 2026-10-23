import express, {
    NextFunction,
    Request,
    Response
} from 'express';
import cors from 'cors';
import { Engine, HttpError } from './engine';
import fs from 'node:fs';
import path from 'node:path';

function getNow(req: Request): number {
    const header = req.header('x-now');

    if (header && process.env.NODE_ENV !== 'production') {
        const timestamp = Date.parse(header);

        if (Number.isNaN(timestamp)) {
            throw new HttpError(400, 'Invalid X-Now header');
        }

        return timestamp;
    }

    return Date.now();
}

export function createApp(
    engine: Engine,
    persist: () => void = () => { }
) {
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: '100kb' }));

    const view = (patient: any) => ({
        token: patient.token,
        name: patient.name,
        age: patient.age,
        kind: patient.kind,
        checkedInAt: new Date(patient.checkInTime).toISOString()
    });

    app.get('/api/doctors', (_req, res) => {
        res.json(engine.doctors);
    });

    app.post('/api/check-ins', (req, res) => {
        const patient = engine.checkIn(req.body ?? {}, getNow(req));

        persist();

        res.status(201).json(view(patient));
    });

    app.post('/api/doctors/:id/call-next', (req, res) => {
        const patient = engine.callNext(req.params.id, getNow(req));

        persist();

        res.json({
            patient: patient ? view(patient) : null
        });
    });

    app.post('/api/doctors/:id/done', (req, res) => {
        const patient = engine.done(req.params.id);

        persist();

        res.json({
            patient: view(patient)
        });
    });

    app.post('/api/doctors/:id/no-show', (req, res) => {
        const patient = engine.noShow(req.params.id, getNow(req));

        persist();

        res.json({
            patient: view(patient)
        });
    });

    app.get('/api/queue', (req, res) => {
        res.json(engine.queue(getNow(req)));
    });

    app.get('/api/clinic-data', (_req, res) => {
        const filePath = path.join(__dirname, '../data/clinic.json');
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        res.json(data);
    });

    app.use((
        err: any,
        _req: Request,
        res: Response,
        _next: NextFunction
    ) => {
        if (err instanceof HttpError) {
            return res.status(err.status).json({
                error: err.message
            });
        }

        if (err?.type === 'entity.parse.failed') {
            return res.status(400).json({
                error: 'Invalid JSON'
            });
        }

        console.error(err);

        return res.status(500).json({
            error: 'Internal server error'
        });
    });

    return app;
}
