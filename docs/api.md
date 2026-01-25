# Category

POST /api/categories

    body: { "name": "Java", "slug": "java" }

GET /api/categories

GET /api/categories/{id}

PATCH /api/categories/{id}

DELETE /api/categories/{id}

# Post

POST /api/posts

    body: { "title": "...", "content": "...(markdown)", "categoryId": 1 }

GET /api/posts/{id}

PATCH /api/posts/{id}

    body: { "title": "...", "content": "...", "categoryId": 1 } (부분 수정 허용)

DELETE /api/posts/{id}

# Post 목록(페이징 + 검색 + 카테고리 필터)

GET /api/posts?page=0&size=10&sort=createdAt,desc&categoryId=1&q=spring&searchType=TITLE_CONTENT

# Query Params

page : 0부터

size : 기본 10

sort : createdAt,desc 기본

categoryId : 선택

q : 선택(검색어)

searchType : TITLE | CONTENT | TITLE_CONTENT (기본 TITLE_CONTENT)

# Response

Spring Page 구조 쓰면 보통:

    content: 글 목록

    totalElements, totalPages, size, number 등 메타 포함