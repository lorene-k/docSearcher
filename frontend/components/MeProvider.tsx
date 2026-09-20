"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSessionEmail } from "@/hooks/useAuth";
import { getMe } from "@/lib/api";
import type { Me } from "@/lib/model";

type MeContextValue = {
    me: Me | null;
    // True until the first lookup for the current session settles
    loading: boolean;
    // The lookup ran and failed, so pages can say so instead of rendering nothing
    error: boolean;
    refresh: () => Promise<void>;
    setMe: (me: Me) => void;
};

const MeContext = createContext<MeContextValue>({
    me: null,
    loading: true,
    error: false,
    refresh: async () => {},
    setMe: () => {},
});

// Knows who is logged in, with their role and organization, for every page and the navbar
export default function MeProvider({ children }: { children: React.ReactNode }) {
    const email = useSessionEmail();
    // The last lookup, tagged with the session it was made for
    const [lookup, setLookup] = useState<{ email: string; me: Me | null; failed: boolean } | null>(null);

    useEffect(() => {
        if (!email) return;
        let ignore = false;
        getMe()
            .then((found) => {
                if (!ignore) setLookup({ email, me: found, failed: false });
            })
            .catch(() => {
                if (!ignore) setLookup({ email, me: null, failed: true });
            });
        return () => {
            ignore = true;
        };
    }, [email]);

    const refresh = useCallback(async () => {
        if (!email) return;
        try {
            setLookup({ email, me: await getMe(), failed: false });
        } catch {
            setLookup({ email, me: null, failed: true });
        }
    }, [email]);

    const setMe = useCallback(
        (next: Me) => {
            if (email) setLookup({ email, me: next, failed: false });
        },
        [email],
    );

    const me = email && lookup?.email === email ? lookup.me : null;
    const loading = email === undefined || (!!email && lookup?.email !== email);
    const error = !loading && lookup?.email === email && lookup.failed;

    return <MeContext.Provider value={{ me, loading, error, refresh, setMe }}>{children}</MeContext.Provider>;
}

export const useMe = (): MeContextValue => useContext(MeContext);
