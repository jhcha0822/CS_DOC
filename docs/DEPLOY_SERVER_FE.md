# 운용 서버에 FE 올리는 과정

BE와 FE를 **run.bat** 한 번으로 띄우려면, 서버에 올려 둘 FE용 파일을 미리 준비해야 합니다.

- **run.bat** 은 프로젝트 **BE/run.bat** 을 서버 **D:\jhcha0822\CS_DOC\run.bat** 으로 복사해 두고 실행합니다.
- **JDK 17**: BE는 Java 17로 빌드됩니다. 서버에 JDK 17이 없으면, 로컬의 **JDK 17 설치 폴더 전체**를 서버 **D:\jhcha0822\CS_DOC\jdk17** 에 복사해 두면 run.bat이 그 경로의 `java.exe`로 실행합니다. (로컬 경로 확인: 명령 프롬프트에서 `where java` 또는 `dir "C:\Program Files\Java"` 등)

---

## 1. 로컬(개발 PC)에서 할 일

### 1.1 백엔드 API 주소 설정

운용 서버 주소가 **192.168.11.181** 이라고 가정합니다.

**FE** 폴더에 **.env.production** 파일을 만들고 다음 한 줄을 넣습니다.

```
VITE_API_BASE=http://192.168.11.181:8080
```

- **필수입니다.** 이 값을 넣지 않고 빌드하면, 접속 시 API 요청이 FE 서버(5173번)로 가서 HTML이 돌아오고 `Unexpected token '<', "<!doctype "... is not valid JSON` 오류가 납니다.
- 백엔드를 다른 주소/포트로 쓰면 그에 맞게 수정하세요.

### 1.2 FE 빌드 (최신 소스 기준으로)

**지금 쓰는 프로젝트(아이디/비밀번호 로그인 UI) 기준으로** 빌드해야 합니다. 예전에 빌드해 둔 dist를 그대로 올리면 "사용자 선택" 같은 구 UI가 나올 수 있습니다.

```bash
cd FE
npm install
npm run build
```

정상이면 **FE/dist** 폴더가 생깁니다.  
이 **dist 안의 내용 전체**가 서버에 올라갈 대상입니다.

### 1.3 dist 내용 확인

빌드 후 예시는 다음과 비슷합니다.

```
FE/dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
└── (기타 리소스)
```

---

## 2. 서버에 올릴 FE 파일

- **올리는 대상**: 위 **FE/dist** 폴더 **안의 모든 파일·폴더**
- **서버에서 둘 위치**: **D:\jhcha0822\CS_DOC\FE_DIST** (폴더 하나로 통일)

즉, 서버에는 다음처럼 되어 있으면 됩니다.

```
D:\jhcha0822\CS_DOC\
├── run.bat
├── CS_DOC-0.0.1-SNAPSHOT.jar   (BE 빌드 결과)
├── FE_DIST\                      ← 여기에 dist 내용 전체
│   ├── index.html
│   ├── assets\
│   │   ├── index-xxxxx.js
│   │   └── index-xxxxx.css
│   └── ...
└── CS_DOC_DATA\
    ├── md\
    └── uploads\
```

---

## 3. 서버에 올리는 방법

### 방법 A: 폴더 통째로 복사 (가장 단순)

1. 로컬에서 **FE/dist** 폴더 전체를 복사합니다.
2. 서버 **D:\jhcha0822\CS_DOC** 에 붙여넣기합니다.
3. 붙여넣은 폴더 이름을 **FE_DIST** 로 바꿉니다.  
   (이미 FE_DIST 라는 이름으로 복사했다면 그대로 두면 됩니다.)

### 방법 B: 압축 후 서버에서 풀기

1. 로컬에서 **FE/dist** 안의 내용만 선택 후 zip으로 압축 (예: **fe-dist.zip**).
2. zip 파일을 서버 **D:\jhcha0822\CS_DOC** 에 복사합니다.
3. 서버에서 **D:\jhcha0822\CS_DOC\FE_DIST** 폴더를 만들고, 그 안에 zip을 풉니다.  
   (압축 해제 후 **FE_DIST\index.html** 이 보이도록.)

### 방법 C: 원격 접속 후 끌어가져 오기

- 원격 데스크톱으로 192.168.11.181 에 접속한 뒤,  
  로컬 PC의 **FE\dist** 를 네트워크 드라이브/공유 폴더로 끌어와  
  **D:\jhcha0822\CS_DOC\FE_DIST** 에 붙여넣기해도 됩니다.

---

## 4. 서버에서 실행

1. **Node.js** 가 서버에 설치되어 있어야 FE를 **npx serve** 로 띄울 수 있습니다.  
   - 미설치 시: https://nodejs.org/ 에서 LTS 버전 설치 후,  
     새 명령 프롬프트에서 `npx serve --version` 이 동작하는지 확인하세요.
2. **D:\jhcha0822\CS_DOC\run.bat** 을 더블클릭해 실행합니다.
3. **CS_DOC BE** / **CS_DOC FE** 창이 각각 뜨면:
   - BE: http://localhost:8080  
   - FE: http://localhost:5173
4. **브라우저에서 http://192.168.11.181:5173** (또는 서버 IP:5173) 으로 접속해 서비스 이용이 가능합니다.

---

## 5. 요약 체크리스트

| 순서 | 할 일 |
|------|--------|
| 1 | FE 폴더에 `.env.production` 만들고 `VITE_API_BASE=http://192.168.11.181:8080` 설정 |
| 2 | `cd FE` → `npm run build` 로 **dist** 생성 |
| 3 | **dist 안의 내용 전체**를 서버 **D:\jhcha0822\CS_DOC\FE_DIST** 에 넣기 |
| 4 | 서버에 Node.js 설치 후 **run.bat** 실행 |
| 5 | 브라우저에서 **http://서버IP:5173** 으로 접속 |

이 과정대로 하면 FE 실행에 필요한 파일을 서버에 올리고, **run.bat** 으로 BE와 FE를 함께 띄워 서비스 이용이 가능합니다.

---

## 6. 문제 해결: "사용자 선택" 구 UI + JSON 오류

**증상:** 로그인 화면에 "사용자 선택" / "등록된 사용자가 없습니다" 가 나오고, `Unexpected token '<', "<!doctype "... is not valid JSON` 오류가 뜬다.

**원인**
1. **VITE_API_BASE 없이 빌드** → API 요청이 5173번(FE 서버)으로 가서 HTML이 반환됨.
2. **예전에 빌드한 FE** 를 올림 → 아이디/비밀번호 로그인이 아니라 사용자 선택 UI가 포함된 구 버전.

**조치**
1. **.env.production** 에 `VITE_API_BASE=http://192.168.11.181:8080` 넣은 뒤, **다시 빌드** (`npm run build`).
2. **지금 프로젝트 소스**로 빌드한 **dist 전체**를 서버 **FE_DIST** 에 덮어쓰기.
3. 브라우저 캐시 비우기 후 **http://192.168.11.181:5173/login** 다시 접속.
