# 실습 과제 페이지 설계 (한 페이지 과제·제출·평가)

실습 카테고리(CAT_TRAINING)의 콘텐츠를 **기존 마크다운 글(Post)과 다르게** 과제·제출·관리자 평가 구조로 가져가기 위한 설계 문서.

---

## 1. 실습과 기존 마크다운 글의 분리

| 구분 | 기존 (다른 카테고리) | 실습 (과제) |
|------|----------------------|-------------|
| 데이터 | Post + PostVersion + md 파일 | Assignment + AssignmentTask + Submission + TaskSubmission + TaskReview |
| 표시 | 글 목록 → 글 상세(마크다운 뷰) | 과제 목록 → **과제 한 페이지**(문제 설명 + 세부과제 + 제출 + 평가 + 총점) |
| 작성 | 마크다운 에디터로 본문 작성 | 과제 작성: 문제 설명(md) + 세부 과제 N개(각각 설명 md + 첨부) |
| 사용자 행동 | 읽기 위주 | 세부 과제별 **답안(텍스트+이미지) 제출** |
| 관리자 | — | 세부 과제별 **점수(0~10) + 피드백** → 총점 자동 합산 |

- **실습 카테고리 진입 시**: 기존처럼 “글 목록” 대신 **과제(Assignment) 목록**을 노출한다.
- **기존 실습 Post가 있다면**: 마이그레이션 시 선택 (숨기기 / 읽기 전용 리다이렉트 / 과제로 변환 등). 신규 실습 콘텐츠는 과제로만 생성.

---

## 2. 한 페이지 레이아웃 (UX)

한 화면에서 **문제(상황 설명) → 세부 과제 → 사용자 제출 → 관리자 평가 → 총점** 흐름이 끊기지 않게 구성한다.

### A. 상단 헤더 (Sticky 권장)

- **과제 제목 / 카테고리(실습) / 마감일**(있을 경우)
- **상태 배지**: 미제출 | 제출완료 | 평가완료
- 우측 버튼
  - **제출 내역**: 내 제출 요약/이력
  - **제출하기** (드롭다운: 임시저장 | 최종 제출)
  - **평가 모드** (관리자만): 관리자일 때만 노출

Sticky로 두면 스크롤해도 총점/상태를 계속 볼 수 있다.

### B. 문제 설명 영역 (Problem Statement)

- **제목**: [문제 설명]
- **본문**: Markdown 렌더 (텍스트 + 인라인 이미지)
- **우측(선택)**: “첨부 자료” – 첨부 이미지/파일 갤러리(썸네일)
- 기존 “마크다운을 웹으로 띄우는 기능” 재사용 (문제 설명은 Markdown 기반)

### C. 과제 영역 (세부 과제) — 핵심

- **세부 과제**는 1개 이상 **동적**으로 설정.
- **UI**: 세부 과제별 **아코디언 카드**.
  - 접힌 상태: 과제 제목 + 제출 상태(미제출/제출/평가완료) + (평가 완료 시) 점수
  - 펼친 상태:
    - **왼쪽**: 세부 과제 설명 (Markdown + 이미지)
    - **오른쪽**  
      - **사용자**: “내 답안” 입력(텍스트 + 이미지 업로드), 임시저장/제출  
      - **관리자**: 점수(0~10, 1점 단위) + 피드백 입력 + “평가 저장”
- 카드 펼치면 2열 레이아웃(설명 | 제출/평가)으로 한 페이지 안에서 처리.

### D. 총점 영역 (Summary)

- **위치**: 페이지 하단 또는 **우측 Sticky 사이드바**(와이어프레임과 동일).
- **내용**:
  - 세부 과제별 점수 목록 (예: 세부 과제 1 : 8점, 세부 과제 2 : -, 세부 과제 3 : -)
  - **총점: Σ(세부 과제 점수)** (예: 8/30점)
- 점수 입력은 Stepper(+/−) 또는 0~10 select 권장 (슬라이더는 1점 단위 실수 가능성).

---

## 3. 역할별 화면 동작

- **사용자**
  - 문제/과제 설명: 읽기 전용.
  - 세부 과제별로 텍스트 + 이미지 제출.
  - **임시저장** / **최종 제출** 분리 (임시저장: 작업 보호, 최종 제출: 평가 대상 확정).
- **관리자**
  - 모든 사용자 제출 조회 가능.
  - 세부 과제별 **점수(0~10, 1점 단위) + 피드백 텍스트** 입력.
  - 평가 저장 시 **총점 자동 반영** (서버에서 합산 후 저장 또는 조회 시 합산).
  - (선택) 평가 완료 후 “제출 수정 잠금” 옵션.

---

## 4. 데이터 모델 (DB 설계)

기존 `category`(실습 = CAT_TRAINING)는 유지하고, 과제 전용 테이블을 추가한다.

| 엔티티 | 설명 | 주요 필드 |
|--------|------|------------|
| **Assignment** | 과제 페이지 1건 | id, title, categoryId(실습 등), problemMarkdown, dueAt(옵션), status(OPEN/CLOSED), createdBy, createdAt |
| **AssignmentTask** | 세부 과제 | id, assignmentId, title, taskMarkdown, sortOrder, attachments(JSON 등) |
| **Submission** | 사용자별 제출(과제 단위) | id, assignmentId, userId, status(DRAFT/SUBMITTED/GRADED), totalScore(캐시), submittedAt, gradedAt |
| **TaskSubmission** | 세부 과제별 답 | id, submissionId, taskId, answerMarkdown, attachments(JSON), updatedAt |
| **TaskReview** | 세부 과제별 관리자 평가 | id, taskSubmissionId, score(0~10), feedbackText, reviewerId, reviewedAt |

- **점수**: 소수점 불필요 → `score` int 0~10.
- **총점**: `Submission.totalScore`에 캐시하거나, 조회 시 Σ(TaskReview.score) 계산.
- (확장) 세부 과제별 가중치 `weight` 컬럼 추가 시: `total = Σ(score * weight)`.

---

## 5. API 설계 (REST)

- **과제 조회**  
  `GET /api/assignments/{assignmentId}`  
  - problemMarkdown, tasks[] (id, title, taskMarkdown, sortOrder, attachments), 마감일 등.

- **내 제출 조회**  
  `GET /api/assignments/{assignmentId}/my-submission`  
  - 없으면 204 또는 null → FE에서 “제출 시작” 유도.

- **제출 생성(초기화)**  
  `POST /api/assignments/{assignmentId}/my-submission`  
  - DRAFT 상태 Submission 생성.

- **세부 과제 답안 저장(임시저장)**  
  `PUT /api/submissions/{submissionId}/tasks/{taskId}`  
  - body: `{ answerMarkdown, attachmentIds[] }`

- **최종 제출**  
  `POST /api/submissions/{submissionId}/submit`  
  - status → SUBMITTED.

- **관리자: 특정 사용자 제출 조회**  
  `GET /api/admin/assignments/{assignmentId}/submissions?userId=...`  
  - submission + taskSubmissions + reviews.

- **관리자: 평가 저장**  
  `PUT /api/admin/task-submissions/{taskSubmissionId}/review`  
  - body: `{ score: 0..10, feedbackText }`  
  - 저장 시 서버에서 해당 Submission의 totalScore 재계산 후 반영 권장.

- **실습 과제 목록**  
  `GET /api/assignments?categoryId={실습카테고리ID}`  
  - 실습 카테고리에서 “글 목록” 대신 사용.

(이미지 업로드는 기존 Post 첨부 API 재사용 또는 `/api/upload` 등 공통 업로드 → URL/ID 반환 후 answerMarkdown/attachments에 연결.)

---

## 6. 한 페이지 구현 (React)

- **라우팅**: 실습 과제 상세 1페이지  
  - 예: `/categories/:categoryId/assignments/:assignmentId` 또는 `/assignments/:assignmentId`

- **컴포넌트 구조 예시**
  - `AssignmentPage`
    - `AssignmentHeaderSticky` (제목, 카테고리, 마감일, 상태, 제출하기/평가 모드)
    - `ProblemSection` (Markdown 뷰어 + 첨부 갤러리)
    - `TaskList`
      - `TaskAccordionItem` (task별)
        - 왼쪽: `TaskStatement` (Markdown + 첨부)
        - 오른쪽: `MyAnswerPanel` (에디터, 이미지 업로드, 임시저장/제출)  
          + (관리자) `ReviewPanel` (Score 0~10, Feedback, 저장)
    - `ScoreSummarySticky` (세부 과제별 점수 + 총점)

- **상태**
  - 페이지 로드 시: `GET assignment` + `GET my-submission` 병렬.
  - 세부 과제별 답안은 로컬 state로 편집 후 “저장” 시 API 호출.
  - 파일: 업로드 → attachmentId 수신 → taskSubmission에 연결.

---

## 7. 마크다운/이미지

- 문제 설명·세부 과제 설명·사용자 답안: **Markdown 통일**.
- 이미지: 업로드 → URL 발급 → Markdown에 `![](url)` 삽입 방식 권장 (기존 기능 활용).

---

## 8. 관리자 평가 UX (참고)

- “미평가만 보기” 필터.
- 평가 저장 후 다음 과제로 자동 포커스(키보드 친화).
- 저장 시 토스트 + 총점 영역 자동 갱신.
- (선택) 평가 완료 후 제출 수정 잠금 옵션.

---

## 9. 정리

- **실습**은 기존 마크다운 “글”과 **별도 스키마·API·한 페이지 UI**로 가져간다.
- **한 페이지**에서 문제 설명 → 세부 과제(아코디언) → 제출(텍스트+이미지) → 관리자 평가(점수+피드백) → 총점이 이어지도록 설계했다.
- API·모델은 위를 기준으로 구현 시 세부 필드명·경로만 조정하면 되고, 참고용 시나리오와 완전 동일할 필요는 없다.

---

## 10. 통합 설계 (Post가 Assignment를 가질 수 있는 형태) — 확정안

기존 Post 위에 과제 기능을 얹어 **최소 침습**으로 통합한다. 별도 Assignment 엔티티 없이 **Post 한 건 = 과제 한 페이지**로 본다.

### 10.1 Post 확장

- **post_kind** (enum): `DOC` | `ASSIGNMENT`
  - 기존 글: 기본값 `DOC` (또는 null 호환)
  - 실습 과제: 생성 시 `ASSIGNMENT`
- **문제 설명** = 기존 `contentMdPath` (Post 본문 md) 그대로 사용.
- (선택) **due_at**: 마감일. 과제만 사용하면 Post 컬럼 추가, 없으면 별도 테이블 필드.

### 10.2 세부 과제 (assignment_task)

| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| post_id (FK → post.id) | 과제인 Post |
| title | 세부 과제 제목 |
| sort_order | 표시 순서 |
| description_md_path | 세부 과제 설명 md 파일 경로 (상대경로, mdRoot 기준) |

- 세부 과제 설명 = **assignment_task.description_md_path** (기존 "본문은 경로만 저장" 철학 유지).

### 10.3 제출/평가 모델

**assignment_submission** (사용자별 과제 제출 1개)

| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| post_id (FK → post.id) | |
| submitter_id (FK → members.id) | 현재 코드베이스 테이블명은 `members` |
| status | DRAFT / SUBMITTED / GRADED |
| submitted_at | |
| graded_at | |
| total_score | optional 캐시 |

- **유니크 제약**: (post_id, submitter_id) → 한 사람당 해당 과제 제출 1개.

**assignment_task_submission** (세부 과제별 답변)

| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| submission_id (FK → assignment_submission.id) | |
| task_id (FK → assignment_task.id) | |
| answer_md_path | 사용자 답변 md 파일 경로 (상대경로) |
| updated_at | |

- 사용자 답변도 **마크다운 파일로만 저장**, DB에는 경로만 저장 (기존 철학 유지).
- **답변 md 경로 권장**:  
  `assignments/{postId}/submissions/{submitterId}/tasks/{taskId}.md`  
  (mdRoot 하위 상대경로)

**assignment_task_review** (세부 과제 평가)

| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| task_submission_id (FK → assignment_task_submission.id) | **unique 권장** (1 task submission당 리뷰 1개) |
| reviewer_id | |
| score | 0~10 (int) |
| feedback_text | 짧은 텍스트 |
| reviewed_at | |

### 10.4 API (기존 Post API 위에 얹기)

**과제 페이지 조회 (한 번에)**

- `GET /api/posts/{postId}/assignment-page`
  - Post 메타(제목, 카테고리, postKind, 마감일 등)
  - 문제 설명 markdown (기존 content API 또는 본문 경로로 읽기)
  - tasks[] (task 메타 + task 설명 markdown)
  - **내 제출** 상태 + 내 task 답변 markdown + (평가 있으면) 점수/피드백
  - 총점
  - FE는 이 API 하나로 한 페이지 구성 가능.

**과제 작성자(관리자) — 세부 과제 관리**

- `POST /api/posts/{postId}/tasks`
- `PUT /api/posts/{postId}/tasks/{taskId}`
- `DELETE /api/posts/{postId}/tasks/{taskId}`
- `GET /api/posts/{postId}/tasks/{taskId}/content` — task 설명 md 읽기
- `PUT /api/posts/{postId}/tasks/{taskId}/content` — task 설명 md 수정

**사용자 제출**

- `POST /api/posts/{postId}/submissions/me` — 없으면 생성 (DRAFT)
- `PUT /api/submissions/{submissionId}/tasks/{taskId}/content` — 답변 md 저장 (임시저장)
- `POST /api/submissions/{submissionId}/submit` — 최종 제출 (status → SUBMITTED)

**관리자 평가**

- `PUT /api/admin/task-submissions/{taskSubmissionId}/review` — score, feedbackText
- (선택) `POST /api/admin/submissions/{submissionId}/finalize` — 상태 GRADED

### 10.5 최소 침습 구현

- **Post**: postKind, (선택) dueAt 추가. PostService/Controller 변경 최소화.
- **Post CRUD + content(md) CRUD**: 그대로 유지.
- **과제 전용**: AssignmentTaskService, SubmissionService, ReviewService 등 **새 서비스/컨트롤러**로 분리.
- **md 저장/읽기**: 기존 mdRoot 기반 헬퍼 재사용, 경로만 `posts/` 외에 `assignments/{postId}/...` 확장 (PostContentStorage 확장 또는 AssignmentContentStorage에서 동일 mdRoot 사용).

### 10.6 매핑 정리

| UI | 데이터 |
|----|--------|
| 문제 설명 | post.contentMdPath (기존) |
| 세부 과제 설명 | assignment_task.description_md_path |
| 사용자 답변 | assignment_task_submission.answer_md_path |

### 10.7 마이그레이션/운영

- 기존 DOC: **post_kind = DOC** (또는 null).
- 새 과제: Post 생성 시 **post_kind = ASSIGNMENT** → 본문 md = 문제 설명 → task 추가 + task별 description md 작성.
- 제출/평가 테이블은 과제(ASSIGNMENT) Post에만 사용 → 일반 문서 Post에는 영향 없음.

---

## 11. 검토 요약

- **통합 방향**: "Post가 Assignment를 가질 수 있는" 형태로 가져가는 설계가 적절함. Post 하나로 문서/과제를 구분하고, 실습 목록에서는 postKind=ASSIGNMENT만 필터해 "과제 목록"으로 노출하면 됨.
- **제출/평가 모델**: assignment_submission, assignment_task_submission, assignment_task_review 정의가 명확함. (post_id, submitter_id) unique, task_submission_id당 review 1건 권장은 그대로 반영함.
- **보완 사항**:
  - **assignment_task** 테이블을 명시적으로 두는 것이 필요함 (세부 과제 메타 + description_md_path). 10.2에 반영함.
  - **FK**: submitter_id, reviewer_id는 현재 코드베이스의 **members** 테이블(id) 참조로 두면 됨.
- **경로/저장**: answer_md_path를 mdRoot 하위 `assignments/{postId}/submissions/{submitterId}/tasks/{taskId}.md` 형태로 두고, 기존 PostContentStorage의 resolveSafe/normalize/쓰기 로직을 재사용하거나 같은 mdRoot를 쓰는 전용 헬퍼로 확장하면 일관성 유지 가능.
- **API**: "한 페이지에 필요한 모든 것"을 `GET /api/posts/{postId}/assignment-page` 한 번에 주는 방식이 FE 부담과 요청 수를 줄이기에 적합함.
- **최소 침습**: Post CRUD/본문 CRUD는 유지하고, 과제용 서비스·컨트롤러·엔티티만 추가하는 전제가 현재 구조와 잘 맞음.
- **결론**: 위 10장 통합 설계대로 구현해도 무방함. 세부 과제(assignment_task) 정의, members FK, md 경로 규칙만 코드/스키마에 반영하면 됨.
