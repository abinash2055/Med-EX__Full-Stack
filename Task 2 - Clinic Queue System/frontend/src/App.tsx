
import { useState } from 'react';
import {
  ClipboardList,
  Stethoscope,
  Monitor,
  HeartPulse,
} from 'lucide-react';

import Reception from './components/Reception';
import Doctor from './components/Doctor';
import WaitingRoom from './components/WaitingRoom';
import './App.css';

type Screen = 'reception' | 'doctor' | 'waiting';

function getInitialScreen(): Screen {
  const screen = new URLSearchParams(window.location.search).get('screen');

  if (screen === 'waiting') return 'waiting';
  if (screen === 'doctor') return 'doctor';

  return 'reception';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(getInitialScreen);

  function navigate(next: Screen) {
    setScreen(next);

    const url = new URL(window.location.href);

    if (next === 'reception') {
      url.searchParams.delete('screen');
    } else {
      url.searchParams.set('screen', next);
    }

    window.history.replaceState({}, '', url);
  }

  if (screen === 'waiting') {
    return (
      <div className="app waiting-app">
        <WaitingRoom />
        <button
          className="exit-display-button"
          onClick={() => navigate('reception')}
          type="button"
        >
          Exit display
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigate('reception');
          }}
        >
          <span className="brand-icon"><HeartPulse size={23} /></span>
          <span>
            <strong>MedEx</strong>
            <small>Bodhi Family Clinic</small>
          </span>
        </a>

        <span className="clinic-time">
          Kathmandu · Asia/Kathmandu
        </span>
      </header>

      <nav className="main-nav" aria-label="Main navigation">
        <button
          className={screen === 'reception' ? 'nav-item active' : 'nav-item'}
          onClick={() => navigate('reception')}
        >
          <ClipboardList size={18} />
          Reception
        </button>

        <button
          className={screen === 'doctor' ? 'nav-item active' : 'nav-item'}
          onClick={() => navigate('doctor')}
        >
          <Stethoscope size={18} />
          Doctor
        </button>

        <button
          className="nav-item"
          onClick={() => navigate('waiting')}
        >
          <Monitor size={18} />
          Waiting Room
        </button>
      </nav>

      <main className="app-main">
        {screen === 'reception' && <Reception />}
        {screen === 'doctor' && <Doctor />}
      </main>

      <footer className="app-footer">
        MedEx Clinic Queue System <span>·</span> Built for Bodhi Family Clinic
      </footer>
    </div>
  );
}
