import { useState } from 'react'
import { api } from './api'
import { usePoll } from './usePoll'
import QueueTable from './QueueTable'

export default function Reception() {
    const { data, error, loading, refresh } = usePoll(api.queue, 3000)
    const [name, setName] = useState('')

    const [age, setAge] = useState('')
    const [time, setTime] = useState('')

    const [kind, setKind] = useState<'walk_in' | 'appointment'>('walk_in')
    const [emergency, setEmergency] = useState(false)

    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
    const [busy, setBusy] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const a = Number(age)

        if (!name.trim()) return setMsg({
            ok: false,
            text: 'Name is required'
        })
        if (age === '' || !Number.isFinite(a) || a < 0 || a > 120)
            return setMsg({
                ok: false,
                text: 'Age must be between 0 and 120'
            })

        if (kind === 'appointment' && !time && !emergency)
            return setMsg({
                ok: false,
                text: 'Appointment time is required'
            })

        setBusy(true)

        try {
            const body: Record<string, unknown> = {
                name: name.trim(),
                age: a,
                kind,
                emergency
            }

            if (kind === 'appointment' && time) body.appointmentTime = `${time}:00+05:45`
            const p = await api.checkIn(body)

            setMsg({
                ok: true,
                text: `Checked in ${p.name}: token ${p.token}`
            })

            setName('');
            setAge('');
            setTime('');
            setEmergency(false)
            refresh()
        } catch (err) {
            setMsg({
                ok: false,
                text: (err as Error).message
            })
        } finally { setBusy(false) }
    }

    return (
        <div className="grid">
            <form onSubmit={submit} className="card">
                <h2>Check-in</h2>
                <label>Name<input value={name} onChange={e => setName(e.target.value)} /></label>
                <label>Age<input type="number" value={age} onChange={e => setAge(e.target.value)} /></label>

                <label>Type
                    <select value={kind} onChange={e => setKind(e.target.value as 'walk_in' | 'appointment')}>
                        <option value="walk_in">Walk-in</option>
                        <option value="appointment">Appointment</option>
                    </select>
                </label>

                {kind === 'appointment' && (
                    <label>Appointment time (Kathmandu)
                        <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} />
                    </label>
                )}
                <label className="row"><input type="checkbox" checked={emergency} onChange={e => setEmergency(e.target.checked)} /> Emergency</label>
                <button disabled={busy}>{busy ? 'Saving…' : 'Check in'}</button>
                {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
            </form>

            <div className="card">
                <h2>Live queue</h2>
                {loading && <p className="muted">Loading…</p>}
                {error && <p className="err">Cannot reach server: {error}</p>}
                {data && <QueueTable queue={data} />}
            </div>
        </div>
    )
}