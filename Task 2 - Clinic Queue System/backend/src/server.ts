import fs from 'fs';
import path from 'path';
import {
    Engine,
    Doctor,
    State
} from './engine';
import { createApp } from './app';

const dataDir = path.join(__dirname, '..', 'data');
const stateFile = path.join(dataDir, 'state.json');

// Doctors come from clinic.json if possible, otherwise fall back to D1 and D2.
let doctors: Doctor[] = [{
    id: 'D1',
    name: 'Doctor 1'
}, {
    id: 'D2',
    name: 'Doctor 2'
}
];

try {
    const clinic = JSON.parse(fs.readFileSync(path.join(dataDir, 'clinic.json'), 'utf8'));
    const list = clinic.doctors ?? clinic.clinic?.doctors;
    if (Array.isArray(list) && list.length)
        doctors = list.map((d: any) => ({ 
    id: d.id, 
    name: d.name ?? d.id 
}));
} catch {
    console.warn('clinic.json not found, using default doctors');
}

let saved: State | undefined;
if (fs.existsSync(stateFile)) saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

const engine = new Engine(doctors, saved);
const persist = () => fs.writeFileSync(stateFile, JSON.stringify(engine.state, null, 2));

const port = Number(process.env.PORT ?? 3000);
createApp(engine, persist).listen(port, () => console.log(`API on http://localhost:${port}`));