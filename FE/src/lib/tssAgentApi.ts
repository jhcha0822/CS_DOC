import { addAuthHeader, getApiBase } from "./api";

/**
 * TSS 에이전트: 기본은 백엔드 `/api/tss-agent/respond` (서버→에이전트 전달, dist·CORS 무관).
 * `VITE_TSS_AI_API_BASE`가 있으면 브라우저가 해당 호스트로 직접 호출(에이전트 CORS 필요).
 */
export function getTssAgentRespondUrl(): string {
    const meta = import.meta as { env?: { VITE_TSS_AI_API_BASE?: string } };
    const raw = meta.env?.VITE_TSS_AI_API_BASE?.toString?.()?.trim();
    if (raw) {
        return `${raw.replace(/\/$/, "")}/api/v1/agent/respond`;
    }
    const base = getApiBase().replace(/\/$/, "");
    return `${base}/api/tss-agent/respond`;
}

export type TssAgentGround = {
    issue_id?: string;
    row_id?: string;
    seq?: number;
    status?: string;
};

export type TssAgentSourceRow = {
    issue_id?: string;
    row_id?: string;
    seq?: number;
    status?: string;
    title?: string;
    detail?: string;
};

export type TssAgentRecommendedStep = {
    action?: string;
    risk?: string;
    why?: string;
    grounds?: TssAgentGround[];
    source_rows?: TssAgentSourceRow[];
    confidence?: string;
    order?: number;
};

export type TssAgentSimilarIncident = {
    issue_id?: string;
    cs_type?: string;
    score?: number;
    reason?: string;
    episode_summary?: string;
};

export type TssAgentData = {
    query_id?: string;
    current_incident_summary?: string;
    search_confidence?: string;
    similar_incidents?: TssAgentSimilarIncident[];
    recommended_steps?: TssAgentRecommendedStep[];
    needs_human_approval?: boolean;
    approval_reason?: string;
    recommended_owner?: string;
    extra_checks?: string[];
    follow_up_questions?: string[];
};

export type TssAgentRespondBody = {
    status?: string;
    data?: TssAgentData;
    [key: string]: unknown;
};

export type TssAgentRespondPayload = {
    symptom_text: string;
    filters: Record<string, unknown>;
    top_k: number;
};

export async function postTssAgentRespond(payload: TssAgentRespondPayload): Promise<TssAgentRespondBody> {
    const url = getTssAgentRespondUrl();
    const res = await fetch(
        url,
        addAuthHeader({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                symptom_text: payload.symptom_text,
                filters: payload.filters,
                top_k: payload.top_k,
            }),
        })
    );
    const text = await res.text().catch(() => "");
    let parsed: unknown;
    try {
        parsed = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`응답이 JSON이 아닙니다. HTTP ${res.status}: ${text.slice(0, 400)}`);
    }
    if (!res.ok) {
        const msg =
            typeof parsed === "object" && parsed !== null && "message" in parsed
                ? String((parsed as { message?: unknown }).message)
                : `HTTP ${res.status}`;
        throw new Error(msg || `HTTP ${res.status}`);
    }
    return parsed as TssAgentRespondBody;
}
