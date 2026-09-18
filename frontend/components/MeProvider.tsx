"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSessionEmail } from "@/hooks/useAuth";
import { getMe } from "@/lib/api";
import type { Me } from "@/lib/model";

type MeContextValue = {
    me: Me | null;
    // True until the first lookup for the current session settles
    loading: boolean;
    refresh: () => Promise<void>;
    setMe: (me: Me) => void;
};

const MeContext = createContext<MeContextValue>({ me: null, loading: true, refresh: async () => {}, setMe: () => {} });

// Knows who is logged in, with their role and organization, for every page and the navbar
export default function MeProvider({ children }: { children: React.ReactNode }) {
    const email = useSessionEmail();
    // The last lookup, tagged with the session it was made for
    const [lookup, setLookup] = useState<{ email: string; me: Me | null } | null>(null);

    useEffect(() => {
        if (!email) return;
        let ignore = false;
        getMe()
            .then((found) => {
                if (!ignore) setLookup({ email, me: found });
            })
            .catch(() => {
                if (!ignore) setLookup({ email, me: null });
            });
        return () => {
            ignore = true;
        };
    }, [email]);

    const refresh = useCallback(async () => {
        if (!email) return;
        try {
            setLookup({ email, me: await getMe() });
        } catch {
            setLookup({ email, me: null });
        }
    }, [email]);

    const setMe = useCallback(
        (next: Me) => {
            if (email) setLookup({ email, me: next });
        },
        [email],
    );

    const me = email && lookup?.email === email ? lookup.me : null;
    const loading = email === undefined || (!!email && lookup?.email !== email);

    return <MeContext.Provider value={{ me, loading, refresh, setMe }}>{children}</MeContext.Provider>;
}

export const useMe = (): MeContextValue => useContext(MeContext);
