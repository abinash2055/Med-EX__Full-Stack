import type { Queue } from './api'

export default function QueueTable({ queue }: { queue: Queue }) {
  return (
    <div>
      <h3>Now serving</h3>
      {
        queue.nowServing.length === 0 ?
          <p className="muted">Nobody yet</p> : (
            <ul>{
              queue.nowServing.map(s => <li key={s.doctorId}><b>{s.token}</b> {s.name} with {s.doctorId}</li>)}</ul>
          )}
      <h3>Waiting ({queue.waiting.length})</h3>

      {queue.waiting.length === 0 ? <p className="muted">Queue is empty</p> : (
        <table>
          <thead><tr><th>#</th><th>Token</th><th>Name</th><th>Wait</th></tr></thead>
          <tbody>
            {queue.waiting.map(w => (
              <tr key={w.token}>
                <td>{w.position + 1}</td><td><b>{w.token}</b></td><td>{w.name}</td>
                <td>{w.estimatedWaitMinutes === 0 ? 'Next' : `~${w.estimatedWaitMinutes} min`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}