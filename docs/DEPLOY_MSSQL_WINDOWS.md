# CS_DOC 실제 운용 환경 구축 가이드 (Windows Server 2016 + MSSQL)

## 1. 대상 서버 및 경로

| 항목 | 값 |
|------|-----|
| 서버 | 192.168.11.181 (Windows Server 2016 NT) |
| Windows 계정 | administrator |
| 비밀번호 | 1csxla!@ |
| 프로젝트 루트 | **D:\jhcha0822\CS_DOC** |
| DB | 동일 서버 MSSQL (테이블 미생성 초기 상태) |

서비스 실행 파일, DB 데이터, 마크다운 파일 모두 `D:\jhcha0822\CS_DOC` 아래에 둡니다.

---

## 2. MSSQL 준비

### 2.1 SQL Server 설치 확인

- **제어판 → 프로그램 및 기능** 또는 **SSMS(SQL Server Management Studio)** 로 SQL Server 설치 여부 확인.
- 미설치 시: [SQL Server 다운로드](https://www.microsoft.com/ko-kr/sql-server/sql-server-downloads)에서 Express 이상 버전 설치.
- 설치 시 **TCP/IP** 프로토콜 사용, **1433** 포트 개방.

### 2.2 TCP/IP 사용 설정

1. **SQL Server Configuration Manager** 실행.
2. **SQL Server 네트워크 구성** → **MSSQLSERVER용 프로토콜** 에서 **TCP/IP** 를 **사용** 으로 변경.
3. **TCP/IP** 더블클릭 → **IP 주소** 탭에서 **IPAll** 의 **TCP 동적 포트** 를 비우고 **TCP 포트** 에 `1433` 입력.
4. **SQL Server 서비스** 에서 **SQL Server (MSSQLSERVER)** 재시작.

### 2.3 데이터베이스 생성

SSMS 또는 `sqlcmd` 로 다음만 실행하면 됩니다. **테이블은 애플리케이션 첫 기동 시 Hibernate가 자동 생성**합니다.

```sql
-- 1) 데이터베이스 생성 (필요 시)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'cs_doc')
BEGIN
    CREATE DATABASE cs_doc
    COLLATE Korean_Wansung_CI_AS;
END
GO
```

- 데이터 파일/로그 경로를 지정하려면 `CREATE DATABASE` 에 `ON PRIMARY ( NAME = ..., FILENAME = 'D:\jhcha0822\CS_DOC\...' )` 등으로 지정 가능.

### 2.4 로그인 및 사용자 (선택)

**SQL Server 인증** 을 쓸 경우:

1. SSMS에서 **보안 → 로그인 → 새 로그인**.
2. **SQL Server 인증** 선택, 로그인 이름(예: `cs_doc_user`), 비밀번호 설정.
3. **기본 데이터베이스** 를 `cs_doc` 로 지정.
4. **사용자 매핑** 에서 `cs_doc` 에 매핑, **db_owner** 역할 부여.

또는 **sa** 계정을 사용해도 됩니다. (보안 정책에 맞게 선택)

- 애플리케이션에서는 환경 변수 `CS_DOC_DB_USERNAME`, `CS_DOC_DB_PASSWORD` 로 지정합니다.

---

## 3. 애플리케이션 설정 (application-prod.yml)

운용 시 기본 프로파일은 **prod** 입니다. 다음이 적용됩니다.

| 설정 | 기본값 | 설명 |
|------|--------|------|
| DB URL | `jdbc:sqlserver://localhost:1433;databaseName=cs_doc;encrypt=false;trustServerCertificate=true` | 동일 서버이므로 localhost |
| DB 사용자 | `CS_DOC_DB_USERNAME` (없으면 `sa`) | 환경 변수 권장 |
| DB 비밀번호 | `CS_DOC_DB_PASSWORD` | 환경 변수 권장 |
| 서버 포트 | `CS_DOC_SERVER_PORT` (없으면 8080) | 필요 시 변경 |
| 데이터 루트 | `CS_DOC_BASE_DIR` (없으면 `D:/jhcha0822/CS_DOC`) | 마크다운·업로드 상위 경로 |

**경로 구조 (자동 생성됨):**

```
D:\jhcha0822\CS_DOC\
├── CS_DOC_DATA\
│   ├── md\          ← 게시글/실습 마크다운
│   └── uploads\     ← 첨부 파일
├── (실행 jar 등)
└── (기타 배포 파일)
```

---

## 4. 환경 변수 (서버에서 설정)

배치 파일이나 Windows 서비스에서 다음을 설정하는 것을 권장합니다.

| 변수명 | 예시 | 비고 |
|--------|------|------|
| `CS_DOC_BASE_DIR` | `D:\jhcha0822\CS_DOC` | prod 기본값과 동일 시 생략 가능 |
| `CS_DOC_DB_USERNAME` | `sa` 또는 `cs_doc_user` | DB 로그인 이름 |
| `CS_DOC_DB_PASSWORD` | 실제 비밀번호 | DB 비밀번호 |
| `CS_DOC_SERVER_PORT` | `8080` | 포트 변경 시만 |

**PowerShell (현재 세션만):**

```powershell
$env:CS_DOC_BASE_DIR = "D:\jhcha0822\CS_DOC"
$env:CS_DOC_DB_USERNAME = "sa"
$env:CS_DOC_DB_PASSWORD = "실제비밀번호"
```

**시스템 환경 변수 (영구):**

- **시스템 속성 → 고급 → 환경 변수** 에서 위 변수 추가.

---

## 5. 배포 및 실행

### 5.1 디렉터리 생성

```powershell
mkdir D:\jhcha0822\CS_DOC
mkdir D:\jhcha0822\CS_DOC\CS_DOC_DATA
mkdir D:\jhcha0822\CS_DOC\CS_DOC_DATA\md
mkdir D:\jhcha0822\CS_DOC\CS_DOC_DATA\uploads
```

### 5.2 JAR 복사

- 빌드한 `BE/build/libs/*.jar` (또는 배포용 jar)를 `D:\jhcha0822\CS_DOC` 에 복사.
- 예: `cs_doc-0.0.1-SNAPSHOT.jar`

### 5.3 수동 실행 (테스트용)

```powershell
cd D:\jhcha0822\CS_DOC
$env:CS_DOC_DB_USERNAME = "sa"
$env:CS_DOC_DB_PASSWORD = "실제비밀번호"
java -jar cs_doc-0.0.1-SNAPSHOT.jar
```

- 기본 프로파일이 **prod** 이므로 별도 `--spring.profiles.active` 없이 실행하면 MSSQL + 위 경로가 적용됩니다.
- **첫 기동 시** Hibernate `ddl-auto=update` 로 `cs_doc` DB에 테이블이 자동 생성됩니다.

### 5.4 Windows 서비스로 등록 (선택)

**NSSM** 또는 **sc** 사용 예시 (NSSM 권장):

1. [NSSM](https://nssm.cc/download) 다운로드 후 `nssm.exe` 를 서버에 복사.
2. 관리자 권한 CMD/PowerShell:

```powershell
nssm install CS_DOC "C:\Program Files\Java\jdk-17\bin\java.exe" "-DCS_DOC_BASE_DIR=D:\jhcha0822\CS_DOC" "-DCS_DOC_DB_USERNAME=sa" "-DCS_DOC_DB_PASSWORD=실제비밀번호" "-jar" "D:\jhcha0822\CS_DOC\cs_doc-0.0.1-SNAPSHOT.jar"
nssm set CS_DOC AppDirectory "D:\jhcha0822\CS_DOC"
nssm start CS_DOC
```

- Java 경로(`jdk-17`)는 실제 설치 경로로 바꿉니다.
- 비밀번호는 환경 변수로 두고 `-DCS_DOC_DB_PASSWORD=%CS_DOC_DB_PASSWORD%` 로 줄 수도 있습니다.

---

## 6. 프론트엔드(운용) 연동

- 백엔드가 `http://192.168.11.181:8080` 에 떠 있다고 가정.
- 프론트 빌드 시 API 베이스 URL을 `http://192.168.11.181:8080` 으로 설정하거나, 리버스 프록시(Nginx/IIS) 뒤에 두고 동일 호스트로 서빙하면 됩니다.

---

## 7. test 프로파일 (보류)

- 현재 **기본 프로파일은 prod** 입니다.
- 로컬에서 H2 + test 프로파일로 실행하려면:

```bash
java -jar cs_doc-0.0.1-SNAPSHOT.jar --spring.profiles.active=test
```

- test 프로파일에서는 H2 파일 DB와 H2 전용 스키마 마이그레이션이 동작합니다.

---

## 8. 요약 체크리스트

- [ ] Windows Server 192.168.11.181 에서 `D:\jhcha0822\CS_DOC` 생성
- [ ] MSSQL 설치 및 TCP/IP 1433 포트 확인
- [ ] `cs_doc` 데이터베이스 생성
- [ ] DB 로그인/비밀번호 준비 후 `CS_DOC_DB_USERNAME`, `CS_DOC_DB_PASSWORD` 설정
- [ ] `CS_DOC_DATA\md`, `CS_DOC_DATA\uploads` 디렉터리 생성
- [ ] JAR 배치 후 prod 프로파일로 기동 → 테이블 자동 생성 확인
- [ ] (선택) Windows 서비스 등록

이 가이드대로 진행하면 해당 서버에서 MSSQL 기반 실제 운용 환경이 구성됩니다.
