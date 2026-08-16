import * as React from "react";

interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/** Minimal async-data hook with loading/error/refetch — consistent states everywhere. */
export function useFetch<T>(fn: () => Promise<T>, deps: React.DependencyList): UseFetchResult<T> {
    const [data, setData] = React.useState<T | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [nonce, setNonce] = React.useState(0);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fn()
            .then((d) => {
                if (!cancelled) setData(d);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);

    return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}
