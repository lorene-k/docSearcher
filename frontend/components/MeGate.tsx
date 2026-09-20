"use client";

import Banner from "@/components/Banner";
import { useMe } from "@/components/MeProvider";
import type { Me } from "@/lib/model";

// Renders a page once the current user is known. A failed lookup says so and offers a
// retry, rather than leaving the page blank with nothing to act on.
export default function MeGate({ children }: { children: (me: Me) => React.ReactNode }) {
    const { me, error, refresh } = useMe();

    if (me) return <>{children(me)}</>;
    if (!error) return null;
    return (
        <div className="page">
            <Banner
                variant="error"
                message="Could not load your account. Check your connection and try again."
                action={{ label: "Retry", onClick: () => void refresh() }}
            />
        </div>
    );
}
