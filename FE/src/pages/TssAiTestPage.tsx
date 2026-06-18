import { useCallback, useEffect, useMemo, useState } from "react";
import {
    postTssAgentRespond,
    type TssAgentData,
    type TssAgentRecommendedStep,
    type TssAgentRespondBody,
} from "../lib/tssAgentApi";

const DEFAULT_SYMPTOM =
    "사용자 로그인 시 지연이 발생하고 일부 요청이 timeout 되는 이슈";

const TOP_K_MIN = 1;
const TOP_K_MAX = 50;

function clampTopK(n: number): number {
    if (!Number.isFinite(n)) return 5;
    return Math.min(TOP_K_MAX, Math.max(TOP_K_MIN, Math.round(n)));
}

function sortSteps(steps: TssAgentRecommendedStep[] | undefined): TssAgentRecommendedStep[] {
    if (!steps?.length) return [];
    return [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function TssAiTestPage() {
    const [symptomText, setSymptomText] = useState(DEFAULT_SYMPTOM);
    const [topKInput, setTopKInput] = useState("5");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [raw, setRaw] = useState<TssAgentRespondBody | null>(null);

    useEffect(() => {
        document.title = "TSS AI 테스트";
    }, []);

    const topK = useMemo(() => clampTopK(parseInt(topKInput, 10)), [topKInput]);

    const setTopK = useCallback((n: number) => {
        setTopKInput(String(clampTopK(n)));
    }, []);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setRaw(null);
        try {
            const body = await postTssAgentRespond({
                symptom_text: symptomText.trim(),
                filters: {},
                top_k: topK,
            });
            setRaw(body);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const data: TssAgentData | undefined = raw?.data;
    const jsonPretty = useMemo(() => {
        try {
            return JSON.stringify(raw ?? {}, null, 2);
        } catch {
            return "";
        }
    }, [raw]);

    const btnStyle: React.CSSProperties = {
        padding: "8px 14px",
        fontSize: 14,
        borderRadius: 6,
        border: "1px solid #d1d5db",
        background: "#fff",
        cursor: loading ? "not-allowed" : "pointer",
    };

    return (
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>TSS AI 테스트</h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
                증상 문구와 검색 건수를 설정한 뒤 에이전트에 질의합니다. 요청은 CS_DOC 백엔드를 거쳐 사내 TSS
                서버로 전달되므로, 정적 빌드(dist)만 올린 환경에서도 별도 프록시 설정 없이 동작합니다.
            </p>

            <form
                onSubmit={onSubmit}
                style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                    background: "#fafafa",
                }}
            >
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
                    symptom_text
                </label>
                <textarea
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    rows={5}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: 10,
                        fontSize: 14,
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        resize: "vertical",
                        fontFamily: "inherit",
                    }}
                />

                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>top_k</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                            type="button"
                            style={btnStyle}
                            disabled={loading}
                            onClick={() => setTopK(topK - 1)}
                            aria-label="top_k 감소"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            min={TOP_K_MIN}
                            max={TOP_K_MAX}
                            value={topKInput}
                            onChange={(e) => setTopKInput(e.target.value)}
                            onBlur={() => setTopK(topK)}
                            style={{
                                width: 72,
                                padding: "8px 10px",
                                fontSize: 14,
                                borderRadius: 6,
                                border: "1px solid #d1d5db",
                                textAlign: "center",
                            }}
                        />
                        <button
                            type="button"
                            style={btnStyle}
                            disabled={loading}
                            onClick={() => setTopK(topK + 1)}
                            aria-label="top_k 증가"
                        >
                            +
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !symptomText.trim()}
                        style={{
                            marginLeft: "auto",
                            padding: "10px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: "none",
                            background: loading ? "#9ca3af" : "#2563eb",
                            color: "#fff",
                            cursor: loading || !symptomText.trim() ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "요청 중…" : "요청 보내기"}
                    </button>
                </div>
            </form>

            {error && (
                <div
                    role="alert"
                    style={{
                        padding: 12,
                        borderRadius: 6,
                        background: "#fef2f2",
                        color: "#991b1b",
                        marginBottom: 16,
                        fontSize: 14,
                    }}
                >
                    {error}
                </div>
            )}

            {data && (
                <>
                    <section
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 16,
                            background: "#fff",
                        }}
                    >
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>요약</h2>
                        <dl style={{ margin: 0, fontSize: 14 }}>
                            {data.query_id != null && (
                                <>
                                    <dt style={{ color: "#6b7280", marginTop: 8 }}>query_id</dt>
                                    <dd style={{ margin: "4px 0 0", fontFamily: "ui-monospace, monospace" }}>
                                        {data.query_id}
                                    </dd>
                                </>
                            )}
                            {data.current_incident_summary != null && (
                                <>
                                    <dt style={{ color: "#6b7280", marginTop: 8 }}>current_incident_summary</dt>
                                    <dd style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                                        {data.current_incident_summary}
                                    </dd>
                                </>
                            )}
                            {data.search_confidence != null && (
                                <>
                                    <dt style={{ color: "#6b7280", marginTop: 8 }}>search_confidence</dt>
                                    <dd style={{ margin: "4px 0 0" }}>{data.search_confidence}</dd>
                                </>
                            )}
                        </dl>
                    </section>

                    <section
                        style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            marginBottom: 16,
                            background: "#fff",
                            overflow: "hidden",
                        }}
                    >
                        <details style={{ padding: 0 }}>
                            <summary
                                style={{
                                    padding: "12px 16px",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    background: "#f9fafb",
                                    listStyle: "none",
                                }}
                            >
                                similar_incidents (축소)
                            </summary>
                            <div style={{ padding: "12px 16px 16px", fontSize: 13, color: "#374151" }}>
                                {(data.similar_incidents?.length ?? 0) === 0 ? (
                                    <span style={{ color: "#9ca3af" }}>없음</span>
                                ) : (
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {data.similar_incidents?.map((inc, i) => (
                                            <li key={`${inc.issue_id ?? i}-${i}`} style={{ marginBottom: 8 }}>
                                                <strong>{inc.issue_id}</strong>
                                                {inc.cs_type != null && (
                                                    <span style={{ color: "#6b7280" }}> · {inc.cs_type}</span>
                                                )}
                                                {inc.score != null && (
                                                    <span style={{ color: "#6b7280" }}>
                                                        {" "}
                                                        · score {inc.score.toFixed?.(4) ?? inc.score}
                                                    </span>
                                                )}
                                                {inc.reason != null && (
                                                    <div style={{ color: "#6b7280", marginTop: 2 }}>{inc.reason}</div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </details>
                    </section>

                    <section style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>recommended_steps</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {sortSteps(data.recommended_steps).map((step, idx) => (
                                <article
                                    key={`${step.order ?? idx}-${idx}`}
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 16,
                                        background: "#fff",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: "#6b7280",
                                            marginBottom: 8,
                                        }}
                                    >
                                        순서 {step.order ?? idx + 1}
                                        {step.confidence != null && (
                                            <span style={{ marginLeft: 8 }}>· confidence: {step.confidence}</span>
                                        )}
                                    </div>
                                    {step.action != null && (
                                        <h3
                                            style={{
                                                fontSize: 16,
                                                fontWeight: 700,
                                                margin: "0 0 10px",
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {step.action}
                                        </h3>
                                    )}
                                    {step.why != null && (
                                        <p
                                            style={{
                                                fontSize: 14,
                                                margin: "0 0 14px",
                                                lineHeight: 1.55,
                                                color: "#111827",
                                            }}
                                        >
                                            {step.why}
                                        </p>
                                    )}

                                    {step.source_rows != null && step.source_rows.length > 0 && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    marginBottom: 8,
                                                    color: "#374151",
                                                }}
                                            >
                                                source_rows
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {step.source_rows.map((row, ri) => (
                                                    <div
                                                        key={`${row.row_id ?? ""}-${row.issue_id ?? ""}-${ri}`}
                                                        style={{
                                                            borderLeft: "3px solid #3b82f6",
                                                            paddingLeft: 12,
                                                            background: "#f8fafc",
                                                            borderRadius: 4,
                                                            padding: "10px 12px",
                                                        }}
                                                    >
                                                        {row.title != null && (
                                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                                                                {row.title}
                                                            </div>
                                                        )}
                                                        {row.detail != null && (
                                                            <div
                                                                style={{
                                                                    fontSize: 13,
                                                                    whiteSpace: "pre-wrap",
                                                                    lineHeight: 1.5,
                                                                    color: "#374151",
                                                                }}
                                                            >
                                                                {row.detail}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <details style={{ fontSize: 13 }}>
                                        <summary
                                            style={{
                                                cursor: "pointer",
                                                color: "#6b7280",
                                                fontWeight: 500,
                                            }}
                                        >
                                            risk · grounds (축소)
                                        </summary>
                                        <div style={{ marginTop: 10, paddingLeft: 4, color: "#4b5563" }}>
                                            {step.risk != null && (
                                                <div style={{ marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 600 }}>risk: </span>
                                                    {step.risk}
                                                </div>
                                            )}
                                            {step.grounds != null && step.grounds.length > 0 && (
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>grounds</div>
                                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                        {step.grounds.map((g, gi) => (
                                                            <li key={`${g.issue_id}-${g.row_id}-${gi}`}>
                                                                {g.issue_id}
                                                                {g.row_id != null && ` · row ${g.row_id}`}
                                                                {g.status != null && ` · ${g.status}`}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                </article>
                            ))}
                        </div>
                    </section>

                    {(data.extra_checks?.length || data.follow_up_questions?.length) ? (
                        <section
                            style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 16,
                                fontSize: 14,
                            }}
                        >
                            {data.extra_checks != null && data.extra_checks.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>extra_checks</h3>
                                    <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                                        {data.extra_checks.map((x, i) => (
                                            <li key={i}>{x}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {data.follow_up_questions != null && data.follow_up_questions.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
                                        follow_up_questions
                                    </h3>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                        {data.follow_up_questions.map((x, i) => (
                                            <li key={i}>{x}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </section>
                    ) : null}
                </>
            )}

            {raw != null && (
                <section style={{ marginTop: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>응답 JSON</h2>
                    <pre
                        style={{
                            margin: 0,
                            padding: 16,
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            background: "#0f172a",
                            color: "#e2e8f0",
                            fontSize: 12,
                            lineHeight: 1.45,
                            overflow: "auto",
                            maxHeight: "min(70vh, 640px)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        {jsonPretty}
                    </pre>
                </section>
            )}
        </div>
    );
}
