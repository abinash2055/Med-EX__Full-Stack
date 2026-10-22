import {
    useEffect,
    useRef,
    useState
} from 'react'
import { api } from './api'
import { usePoll } from './usePoll'

export default function Display() {
    const { data, error, loading } = usePoll(api.queue, 2000)
    const prev = useRef<Record<string, string>>({})

    const first = useRef(true)
    const [fresh, setFresh] = useState<Record<string, boolean>>({})

    useEffect(() => {
        if (!data) return
        const now: Record<string, string> = {}

        const changed: string[] = []
        for (const s of data.nowServing) {
            now[s.doctorId] = s.token

            if (!first.current && prev.current[s.doctorId] !== s.token) changed.push(s.doctorId)
        }

        prev.current = now
        first.current = false

        if (changed.length) {
            setFresh(f => ({
                ...f,
                ...Object.fromEntries(changed.map(c => [
                    c, true
                ]))
            }))

            setTimeout(() => setFresh(f => {
                const n = { ...f };
                changed.forEach(c => delete n[c]);
                return n
            }), 6000)
        }
    }, [data])

    if (error)
        return <div className="tv down">⚠ Server unreachable<small>Queue information is not available</small></div>
    if (loading || !data) return <div className="tv"><h1>Loading…</h1></div>

    return (
        <div className="tv">
            <h1>NOW SERVING</h1>

            <div className="tiles">
                {
                    data.nowServing.length === 0 &&
                    <div className="muted big">Please wait for your token</div>
                }
                {data.nowServing.map(s => (
                    <div key={s.doctorId} className={`tile ${fresh[s.doctorId] ? 'flash' : ''}`}>
                        <div className="doc">{s.doctorId}</div>
                        <div className="tok">{s.token}</div>
                        <div className="nm">{s.name}</div>
                    </div>
                ))}
            </div>

            <div className="next">
                Up next: {data.waiting.slice(0, 5).map(w => w.token).join('   ') || '—'}
            </div>
        </div>
    )
}