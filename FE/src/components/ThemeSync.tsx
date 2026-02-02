import { useEffect, type ReactNode } from "react";

/** 어떤 모드에서 진입해도 light 설정으로 고정 */
export default function ThemeSync({ children }: { children: ReactNode }) {
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", "light");
    }, []);

    return <>{children}</>;
}
