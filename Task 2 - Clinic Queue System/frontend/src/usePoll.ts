import {
    useEffect,
    useState
} from 'react'


export function usePoll<T>(fn: () => Promise<T>, ms: number) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)

    useEffect(() => {
        let alive = true
        const run = async () => {
            try {
                const d = await fn()
                if (alive) {
                    setData(d);
                    setError(null)
                }
            } catch (e) {
                if (alive) {
                    setData(null);
                    setError((e as Error).message)
                }
            } finally {
                if (alive) setLoading(false)
            }
        }
        run()
        const t = setInterval(run, ms)
        return () => {
            alive = false;
            clearInterval(t)
        }
    }, [ms, tick])

    return { 
        data, 
        error, 
        loading, refresh: () => setTick(t => t + 1) 
    }
}