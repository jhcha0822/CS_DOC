# CS_DOC 프론트엔드(FE) 실행 방법

FE는 **Vite + React** 프로젝트입니다.

---

## 1. 개발 시 (로컬에서 띄우기)

백엔드가 **localhost:8080** 에 떠 있다고 가정합니다.

```bash
cd FE
npm install
npm run dev
```

- 브라우저에서 **http://localhost:5173** 접속
- Vite가 `/api`, `/uploads` 요청을 **localhost:8080** 으로 프록시합니다 (vite.config.ts 설정).

백엔드가 다른 주소(예: 192.168.11.181:8080)면:

- `FE/.env.development` 파일 생성 후:
  ```
  VITE_API_BASE=http://192.168.11.181:8080
  ```
- 그 다음 `npm run dev` 실행

---

## 2. 실제 운용(서버)에서 띄우기

### 2.1 빌드 시 백엔드 주소 지정

프론트와 백엔드를 **같은 서버**에서 서빙할 때, 브라우저가 API를 호출할 주소를 빌드 시점에 넣어야 합니다.

1. **FE** 폴더에 `.env.production` 파일 생성 (또는 `.env.production.example` 복사 후 수정):

   ```
   VITE_API_BASE=http://192.168.11.181:8080
   ```

   - 프론트를 **http://192.168.11.181** 에서 서빙하면 위처럼 백엔드 주소를 적습니다.
   - 같은 기기에서 **같은 포트**로 리버스 프록시해 한 주소로 서빙할 계획이면, 예: `VITE_API_BASE=http://192.168.11.181` (포트 생략 시 80) 형태로 맞춥니다.

2. **빌드**:

   ```bash
   cd FE
   npm install
   npm run build
   ```

3. **FE/dist** 폴더가 생성됩니다. 이 폴더 전체를 서버(예: **D:\jhcha0822\CS_DOC\FE_DIST**)에 복사합니다.

### 2.2 서버에서 정적 파일 서빙

**방법 A: Node로 간단히 서빙 (테스트/소규모)**

- 서버에 Node 설치 후:

  ```bash
  npx serve -s D:\jhcha0822\CS_DOC\FE_DIST -l 5173
  ```

- 브라우저에서 **http://192.168.11.181:5173** 접속

**방법 B: IIS (Windows Server)**

1. **IIS 관리자** → 사이트 추가 → **물리적 경로**를 `D:\jhcha0822\CS_DOC\FE_DIST` 로 지정
2. 바인딩: **http, 80** (또는 원하는 포트)
3. SPA이므로 **URL 재작성** 또는 **web.config** 에서 `index.html` 로 폴백 설정 (같은 폴더에 `web.config` 추가):

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="SPA" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/index.html" />
           </rule>
         </rules>
       </rewrite>
     </system.webServer>
   </configuration>
   ```

**방법 C: 백엔드와 같은 포트로 서빙 (리버스 프록시)**

- Nginx 등에서 **/** 는 FE 정적 파일, **/api** 는 8080으로 프록시하도록 설정하면, `VITE_API_BASE` 를 빌드 시 **빈 값** 또는 **동일 오리진**으로 두고 한 주소로 서비스할 수 있습니다.

---

## 3. 요약

| 목적           | 명령 / 작업 |
|----------------|-------------|
| 로컬 개발      | `cd FE` → `npm install` → `npm run dev` → http://localhost:5173 |
| 운용 빌드      | `.env.production` 에 `VITE_API_BASE=백엔드주소` 설정 후 `npm run build` |
| 운용 서빙      | `dist` 폴더를 서버에 복사 후 **npx serve**, **IIS**, **Nginx** 등으로 서빙 |
