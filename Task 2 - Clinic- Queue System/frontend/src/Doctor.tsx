import { useState } from 'react'
import { api } from './api'
import { usePoll } from './usePoll'

export default function Doctor() {
    const docs = usePoll(api.doctors, 30000)
    const q = usePoll(api.queue, 2000)

    const [doctorId, setDoctorId] = useState('')
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

    const id = doctorId || docs.data?.[0]?.id || ''
    const mine = q.data?.nowServing.find(s => s.doctorId === id)

    const act = async (fn: (id: string) => Promise<{
        patient: {
            token: string;
            name: string
        } | null
    }>) => {
        try {
            const r = await fn(id)
            setMsg(r.patient ? {
                ok: true,
                text: `${r.patient.token} ${r.patient.name}`
            } : {
                ok: true,
                text: 'Nobody is waiting'
            })
        } catch (e) {
            setMsg({
                ok: false,
                text: (e as Error).message
            })
        }
        q.refresh()
    }

    if (docs.loading) return <p>Loading…</p>
    if (docs.error) return <p className="err">Cannot reach server: {docs.error}</p>

    return (
        <div className="card">
            <h2>Doctor</h2>
            <label>I am
                <select value={id} onChange={e => { 
                    setDoctorId(e.target.value); 
                    setMsg(null) }}>
                    {docs.data?.map(d => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                </select>
            </label>

            {q.error && <p className="err">Cannot reach server: {q.error}</p>}
            <div className="current">
                {mine ? <>With patient<br /><b>{mine.token}</b> {mine.name}</> : <span className="muted">No patient right now</span>}
            </div>

            <div className="row">
                <button disabled={!!mine || !!q.error} onClick={() => act(api.callNext)}>Call next</button>
                <button disabled={!mine} onClick={() => act(api.done)}>Done</button>
                <button disabled={!mine} className="danger" onClick={() => act(api.noShow)}>No-show</button>
            </div>
            {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
            <p className="muted">Waiting: {q.data ? q.data.waiting.length : '…'}</p>
        </div>
    )
}