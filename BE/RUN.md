# BE 실행 방법

## 사전 요건

- **JAVA_HOME**: Java 17 (예: IntelliJ 설치 경로 `C:\Users\사용자명\.jdks\ms-17.0.17`)

---

## 1. 일반 테스트 실행 (test 프로필)

```powershell
cd BE
.\gradlew.bat bootRun --args="--spring.profiles.active=test"
```

- H2 DB, Swagger(`/swagger`), H2 콘솔(`/h2-console`) 사용
- 데이터 경로: `CS_DOC_BASE_DIR` 미설정 시 `%USERPROFILE%\Documents\CS_DOC_DATA`

**H2 콘솔에서 앱과 같은 DB에 연결하려면** (상대 경로 `./` 는 실행 위치에 따라 앱과 다른 DB를 가리킬 수 있음):

- **JDBC URL**: `jdbc:h2:file:<절대경로>/CS_DOC_DATA/h2/csdoc;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`  
  - `CS_DOC_BASE_DIR` 미설정 시: `%USERPROFILE%\Documents` 를 절대 경로로 (예: `C:/Users/본인사용자명/Documents`)
  - 설정한 경우: `CS_DOC_BASE_DIR` 값 사용
- **User Name**: `sa`
- **Password**: (비움)

---

## 2. data-init 프로필 (데이터 완전 초기화 후 실행)

**에러 예**: `Refuse to overwrite existing md for new post: 1`  
→ DB와 디스크의 `posts/*.md`가 어긋난 상태. data-init으로 맞춤.

**data-init은 DB/스토리지 설정이 없으므로 반드시 test와 함께 사용:**

```powershell
cd BE
.\gradlew.bat bootRun --args="--spring.profiles.active=test,data-init"
```

동작:

1. 기동 시 **한 번** DB(post, post_version, category) 전부 삭제
2. ID 시퀀스 1부터 재시작
3. `posts/*.md` 파일 전부 삭제
4. 기본 카테고리만 재생성
5. 그 다음 서버가 계속 떠 있음 (일반 test 실행과 동일)

**초기화만 필요할 때**: 위 명령으로 한 번 실행해 초기화된 뒤, 서버를 종료하고 다음부터는 `test`만 사용하면 됨.

---

## 3. JAR 빌드 후 실행

```powershell
.\gradlew.bat bootJar
java -jar build/libs/CS_DOC-0.0.1-SNAPSHOT.jar --spring.profiles.active=test
# 초기화가 필요하면
java -jar build/libs/CS_DOC-0.0.1-SNAPSHOT.jar --spring.profiles.active=test,data-init
```

---

## 4. 경로(CS_DOC_BASE_DIR) 지정

다른 드라이브나 NAS를 쓰려면 실행 전에 환경 변수 설정:

```powershell
$env:CS_DOC_BASE_DIR = "D:\Project"
.\gradlew.bat bootRun --args="--spring.profiles.active=test"
```
