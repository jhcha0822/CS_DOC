#!/bin/bash
# 테스트 환경 초기화 스크립트 (Linux/Mac용)
# memo와 post 데이터를 모두 삭제하고 재실행

set -e

# CS_DOC_BASE_DIR 환경변수 확인 (기본값: ~/Documents 또는 현재 디렉토리)
BASE_DIR="${CS_DOC_BASE_DIR:-$HOME/Documents}"
if [ -z "$CS_DOC_BASE_DIR" ]; then
    echo "CS_DOC_BASE_DIR 환경변수가 설정되지 않아 기본값 사용: $BASE_DIR"
fi

DATA_DIR="$BASE_DIR/CS_DOC_DATA"
MD_DIR="$DATA_DIR/md"
POSTS_DIR="$MD_DIR/posts"
H2_DIR="$DATA_DIR/h2"
UPLOADS_DIR="$DATA_DIR/uploads"

echo ""
echo "=== 테스트 데이터 초기화 시작 ==="

# 1. H2 데이터베이스 파일 삭제
if [ -d "$H2_DIR" ]; then
    echo ""
    echo "H2 데이터베이스 파일 삭제 중..."
    find "$H2_DIR" -name "*.db" -type f -delete 2>/dev/null && echo "  H2 파일 삭제 완료" || echo "  삭제할 H2 파일이 없습니다."
else
    echo ""
    echo "H2 디렉토리가 없습니다: $H2_DIR"
fi

# 2. posts/*.md 파일 삭제
if [ -d "$POSTS_DIR" ]; then
    echo ""
    echo "posts/*.md 파일 삭제 중..."
    find "$POSTS_DIR" -name "*.md" -type f -delete 2>/dev/null && echo "  md 파일 삭제 완료" || echo "  삭제할 md 파일이 없습니다."
else
    echo ""
    echo "posts 디렉토리가 없습니다: $POSTS_DIR"
fi

# 3. memo 관련 파일 삭제 (있다면)
MEMO_DIR="$MD_DIR/memo"
if [ -d "$MEMO_DIR" ]; then
    echo ""
    echo "memo/*.md 파일 삭제 중..."
    find "$MEMO_DIR" -name "*.md" -type f -delete 2>/dev/null && echo "  memo 파일 삭제 완료" || echo "  삭제할 memo 파일이 없습니다."
fi

# 4. 업로드 파일 삭제 (선택사항 - 주석 해제하면 삭제)
# if [ -d "$UPLOADS_DIR" ]; then
#     echo ""
#     echo "업로드 파일 삭제 중..."
#     rm -rf "$UPLOADS_DIR"/* && echo "  업로드 디렉토리 정리 완료"
# fi

echo ""
echo "=== 초기화 완료 ==="
echo ""
echo "다음 명령어로 애플리케이션을 재실행하세요:"
echo "  cd BE"
echo "  ./gradlew bootRun --args='--spring.profiles.active=test'"
echo ""
echo "또는 data-init 프로필로 완전 초기화:"
echo "  ./gradlew bootRun --args='--spring.profiles.active=data-init'"
