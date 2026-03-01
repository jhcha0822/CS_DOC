# 메모 500 오류 해결 (MSSQL)

## 원인

`memo` 테이블의 `body` 컬럼이 **CLOB** 등 MSSQL에서 지원하지 않는 타입으로 생성되었을 수 있습니다.  
이 경우 메모 목록 조회 시 500 오류가 발생합니다.

## 코드 수정 사항

- `Memo` 엔티티의 `body`를 `columnDefinition = "CLOB"` 대신 **`length = 10000`** 으로 변경했습니다.
- Hibernate가 DB 종류에 맞게 컬럼 타입을 만들도록 했습니다 (MSSQL: NVARCHAR(MAX) 등).

## 서버 DB에 이미 memo 테이블이 있는 경우

1. **BE를 수정한 JAR으로 재배포** 후 재시작합니다.
2. **ddl-auto=update** 이므로, Hibernate가 `body` 컬럼을 새 정의에 맞게 **ALTER** 시도할 수 있습니다.
3. 그래도 500이 나면, SSMS에서 아래 중 하나를 실행한 뒤 애플리케이션을 다시 띄워 보세요.

**옵션 A: body 컬럼만 수정**

```sql
-- memo 테이블이 있고 body 타입이 잘못된 경우
ALTER TABLE memo ALTER COLUMN body NVARCHAR(MAX) NULL;
```

**옵션 B: 테이블 삭제 후 재생성 (데이터 삭제됨)**

```sql
DROP TABLE IF EXISTS memo;
-- 애플리케이션 재시작 시 Hibernate가 테이블을 다시 생성합니다.
```

4. **서버 로그**에서 `UNEXPECTED_ERROR` 다음에 나오는 **스택 트레이스**를 확인하면, 정확한 예외 원인을 볼 수 있습니다.
