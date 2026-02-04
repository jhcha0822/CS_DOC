import { useEffect, type ReactNode } from "react";

/** 브라우저 설정과 관계없이 항상 light 테마로 고정 (어둡게 접근해도 밝은 화면) */
export default function ThemeSync({ children }: { children: ReactNode }) {
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", "light");
    }, []);

    return <>{children}</>;
}
