export interface Doctor {
    id: string;
    name: string
}

export interface Queue {
    nowServing: {
        doctorId: string;
        token: string;
        name: string
    }[]

    waiting: {
        position: number;
        token: string;
        name: string;
        estimatedWaitMinutes: number
    }[]
}

export interface Patient {
    token: string;
    name: string;
    age: number;
    kind: string
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
    const r = await fetch(url, init)
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`)
    return body as T
}

const post = <T,>(url: string, body?: unknown) =>
    req<T>(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
    })

export const api = {
    queue: () => req<Queue>('/api/queue'),
    doctors: () => req<Doctor[]>('/api/doctors'),

    checkIn: (b: unknown) => post<Patient>('/api/check-ins', b),
    callNext: (id: string) => post<{ patient: Patient | null }>(`/api/doctors/${id}/call-next`),

    done: (id: string) => post<{ patient: Patient }>(`/api/doctors/${id}/done`),

    noShow: (id: string) => post<{ patient: Patient }>(`/api/doctors/${id}/no-show`),
}