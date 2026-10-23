import fs from 'node:fs';
import path from 'node:path';

import { 
  Engine, 
  Doctor, 
  State 
} from './engine';
import { createApp } from './app';

const dataDir = path.join(__dirname, '..', 'data');
const clinicFile = path.join(dataDir, 'clinic.json');
const stateFile = path.join(dataDir, 'state.json');

// Clinic configuration must be supplied manually.
// Never generate clinic.json or silently substitute default doctors.
if (!fs.existsSync(clinicFile)) {
  throw new Error(
    `Missing ${clinicFile}. Create data/clinic.json manually before starting the server.`
  );
}

const clinicData = JSON.parse(
  fs.readFileSync(clinicFile, 'utf8')
);

const doctorList =
  clinicData.doctors ?? clinicData.clinic?.doctors;

if (
  !Array.isArray(doctorList) ||
  doctorList.length === 0 ||
  doctorList.some(
    (doctor: any) =>
      typeof doctor.id !== 'string' ||
      !doctor.id.trim()
  )
) {
  throw new Error(
    'clinic.json must contain a non-empty doctors array with valid doctor IDs.'
  );
}

const doctorIds = doctorList.map((doctor: any) => doctor.id);

if (new Set(doctorIds).size !== doctorIds.length) {
  throw new Error('Doctor IDs in clinic.json must be unique.');
}

const doctors: Doctor[] = doctorList.map((doctor: any) => ({
  id: doctor.id,
  name:
    typeof doctor.name === 'string' && doctor.name.trim()
      ? doctor.name.trim()
      : doctor.id
}));

// Restore saved queue state if available.
let savedState: State | undefined;

if (fs.existsSync(stateFile)) {
  savedState = JSON.parse(
    fs.readFileSync(stateFile, 'utf8')
  );
}

// Initialize the engine in memory; this does not write data files.
const engine = new Engine(doctors, savedState);

// Persist state only after a successful API operation.
// The first successful mutation creates state.json.
const persist = () => {
  const temporaryFile = `${stateFile}.tmp`;

  fs.writeFileSync(
    temporaryFile,
    JSON.stringify(engine.state, null, 2),
    'utf8'
  );

  fs.renameSync(temporaryFile, stateFile);
};

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid port number.');
}

const app = createApp(engine, persist);

app.listen(port, () => {
  console.log(`Clinic Queue API running at http://localhost:${port}`);
});
