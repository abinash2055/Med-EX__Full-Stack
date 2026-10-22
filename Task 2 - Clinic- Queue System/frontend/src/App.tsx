import {
    useEffect,
    useState
} from 'react'
import Reception from './Reception'
import Doctor from './Doctor'
import Display from './Display'

const page = () => window.location.hash.replace('#/', '') || 'reception'

export default function App() {
    const [p, setP] = useState(page())

    useEffect(() => {
        const h = () => setP(page())
        window.addEventListener('hashchange', h)
        return () => window.removeEventListener('hashchange', h)
    }, [])

    if (p === 'display') return <Display />

    return (
        <div className="wrap">
            <nav>
                <b>Bodhi Family Clinic</b>
                <a href="#/reception" className={p === 'reception' ? 'active' : ''}>Reception</a>

                <a href="#/doctor" className={p === 'doctor' ? 'active' : ''}>Doctor</a>
                <a href="#/display" target="_blank">Waiting-room display ↗</a>
            </nav>
            {
                p === 'doctor' ? <Doctor /> : <Reception />
            }
        </div>
    )
}