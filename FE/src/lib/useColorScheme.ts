import { useEffect, useState } from "react";

export type ColorScheme = "dark" | "light";

export function useColorScheme(): ColorScheme {
    const [scheme, setScheme] = useState<ColorScheme>(() =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
    );

    useEffect(() => {
        const m = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setScheme(m.matches ? "dark" : "light");
        m.addEventListener("change", handler);
        return () => m.removeEventListener("change", handler);
    }, []);

    return scheme;
}
