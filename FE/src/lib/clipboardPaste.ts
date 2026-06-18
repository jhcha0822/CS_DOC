/**
 * 파워포인트 등에서 복사 시 클립보드에 텍스트와 래스터 이미지가 함께 실리는 경우가 있다.
 * 이때는 메모장처럼 텍스트 붙여넣기를 우선하고, 스크린샷 등 이미지 단독 붙여넣기는 그대로 처리한다.
 */
export function preferPlainTextOverClipboardImage(
    dataTransfer: DataTransfer | null | undefined
): boolean {
    if (!dataTransfer?.items?.length) return false;
    const plain = (dataTransfer.getData("text/plain") ?? "").trim();
    if (!plain) return false;
    for (let i = 0; i < dataTransfer.items.length; i++) {
        if (dataTransfer.items[i].type.startsWith("image/")) return true;
    }
    return false;
}

/** 비동기 붙여넣기 처리 후 에디터 포커스/커서가 날아가는 현상 완화 */
export function refocusTextarea(
    ta: HTMLTextAreaElement | null | undefined,
    selection?: { start: number; end: number }
): void {
    if (!ta) return;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            ta.focus({ preventScroll: true });
            if (selection) {
                const len = ta.value.length;
                const s = Math.max(0, Math.min(selection.start, len));
                const e = Math.max(0, Math.min(selection.end, len));
                ta.setSelectionRange(s, e);
            }
        });
    });
}
