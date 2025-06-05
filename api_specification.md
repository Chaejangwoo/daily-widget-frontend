# Daily Widget API 명세서

## 1. 기본 정보

-   **Base URL**: `http://localhost:5001` (개발 환경 기준)
-   **Content-Type**: `application/json` (대부분의 요청/응답)
-   **인증**: JWT (JSON Web Token) 사용. 토큰이 필요한 API는 HTTP Header에 `Authorization: Bearer <YOUR_JWT_TOKEN>` 형태로 전송.

## 2. 사용자 인증 (User Authentication)

### 2.1. 회원가입

-   **Endpoint**: `POST /api/users/register`
-   **설명**: 새로운 사용자를 등록합니다.
-   **Request Body**:
    ```json
    {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123"
    }
    ```
    -   `username` (string, required): 사용자 이름
    -   `email` (string, required, unique, email format): 사용자 이메일
    -   `password` (string, required, minLength: 8): 사용자 비밀번호
-   **Responses**:
    -   **201 Created (성공)**:
        ```json
        {
            "success": true,
            "message": "회원가입이 성공적으로 완료되었습니다.",
            "userId": 1
        }
        ```
    -   **400 Bad Request (필수 필드 누락 등)**:
        ```json
        {
            "success": false,
            "message": "모든 필드를 입력해주세요."
        }
        ```
    -   **409 Conflict (이메일 중복)**:
        ```json
        {
            "success": false,
            "message": "이미 사용 중인 이메일입니다."
        }
        ```
    -   **500 Internal Server Error (서버 오류)**:
        ```json
        {
            "success": false,
            "message": "서버 오류로 회원가입에 실패했습니다."
        }
        ```

### 2.2. 로그인

-   **Endpoint**: `POST /api/users/login`
-   **설명**: 사용자를 인증하고 JWT 토큰을 발급합니다.
-   **Request Body**:
    ```json
    {
        "email": "test@example.com",
        "password": "password123"
    }
    ```
    -   `email` (string, required): 사용자 이메일
    -   `password` (string, required): 사용자 비밀번호
-   **Responses**:
    -   **200 OK (성공)**:
        ```json
        {
            "success": true,
            "message": "로그인 성공",
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "user": {
                "id": 1,
                "username": "testuser",
                "email": "test@example.com"
            }
        }
        ```
    -   **400 Bad Request (필수 필드 누락)**:
        ```json
        {
            "success": false,
            "message": "이메일과 비밀번호를 모두 입력해주세요."
        }
        ```
    -   **401 Unauthorized (인증 실패)**:
        ```json
        {
            "success": false,
            "message": "이메일 또는 비밀번호가 일치하지 않습니다."
        }
        ```
    -   **500 Internal Server Error (서버 오류)**:
        ```json
        {
            "success": false,
            "message": "서버 오류로 로그인에 실패했습니다."
        }
        ```

### 2.3. 내 정보 조회

-   **Endpoint**: `GET /api/users/me`
-   **설명**: 현재 로그인된 사용자의 정보를 조회합니다. (인증 필요)
-   **Request Headers**:
    -   `Authorization: Bearer <YOUR_JWT_TOKEN>`
-   **Responses**:
    -   **200 OK (성공)**:
        ```json
        {
            "success": true,
            "user": {
                "id": 1,
                "username": "testuser",
                "email": "test@example.com",
                "interests": ["AI", "기술"]
            }
        }
        ```
    -   **401 Unauthorized (토큰 누락 또는 유효하지 않음)**:
        ```json
        {
            "success": false,
            "message": "인증 실패: 토큰이 제공되지 않았거나 유효하지 않습니다."
        }
        ```
    -   **404 Not Found (사용자 정보 없음 - 이론상으론 protect 미들웨어에서 걸러짐)**:
        ```json
        {
            "success": false,
            "message": "사용자 정보를 찾을 수 없습니다."
        }
        ```

### 2.4. 내 관심사 조회

-   **Endpoint**: `GET /api/users/me/interests`
-   **설명**: 현재 로그인된 사용자의 관심사 목록을 조회합니다. (인증 필요)
-   **Request Headers**:
    -   `Authorization: Bearer <YOUR_JWT_TOKEN>`
-   **Responses**:
    -   **200 OK (성공)**:
        ```json
        {
            "success": true,
            "interests": ["AI", "기술", "경제"]
        }
        ```
        *   `interests` (array of strings): 사용자가 설정한 관심사 키워드 배열. 없을 경우 빈 배열 `[]`.
    -   **401 Unauthorized (토큰 누락 또는 유효하지 않음)**: (2.3과 유사)
    -   **500 Internal Server Error (서버 오류)**:
        ```json
        {
            "success": false,
            "message": "서버 오류로 관심사를 불러오지 못했습니다."
        }
        ```

### 2.5. 내 관심사 업데이트

-   **Endpoint**: `PUT /api/users/me/interests`
-   **설명**: 현재 로그인된 사용자의 관심사 목록을 업데이트합니다. (인증 필요)
-   **Request Headers**:
    -   `Authorization: Bearer <YOUR_JWT_TOKEN>`
-   **Request Body**:
    ```json
    {
        "interests": ["AI", "우주", "환경"]
    }
    ```
    -   `interests` (array of strings, required): 업데이트할 관심사 키워드 배열. 빈 배열도 가능.
-   **Responses**:
    -   **200 OK (성공)**:
        ```json
        {
            "success": true,
            "message": "관심사가 성공적으로 업데이트되었습니다.",
            "interests": ["AI", "우주", "환경"]
        }
        ```
    -   **400 Bad Request (잘못된 요청 형식)**:
        ```json
        {
            "success": false,
            "message": "관심사 목록은 배열이어야 합니다."
        }
        ```
    -   **401 Unauthorized (토큰 누락 또는 유효하지 않음)**: (2.3과 유사)
    -   **500 Internal Server Error (서버 오류)**:
        ```json
        {
            "success": false,
            "message": "서버 오류로 관심사 업데이트에 실패했습니다."
        }
        ```

## 3. 뉴스 (News)

### 3.1. 뉴스 목록 조회

-   **Endpoint**: `GET /api/news`
-   **설명**: 필터링 및 페이징 옵션에 따라 뉴스 목록을 조회합니다.
-   **Query Parameters**:
    -   `page` (integer, optional, default: 1): 요청할 페이지 번호.
    -   `limit` (integer, optional, default: 9 또는 10 - 코드 확인 필요): 페이지당 표시할 뉴스 개수.
    -   `sortBy` (string, optional, default: `publishedDate`): 정렬 기준 필드명 (예: `publishedDate`, `title`).
    -   `sortOrder` (string, optional, default: `DESC`): 정렬 순서 (`ASC` 또는 `DESC`).
    -   `keyword` (string, optional): 검색할 키워드 (제목, 내용 등에서 검색).
    -   `sourceName` (string, optional): 필터링할 뉴스 출처명.
    -   `category` (string, optional): 필터링할 뉴스 카테고리 (예: "정치", "경제"). 빈 문자열(`""`)은 전체 카테고리를 의미.
-   **Responses**:
    -   **200 OK (성공)**:
        ```json
        {
            "totalPages": 5,
            "currentPage": 1,
            "totalNews": 45,
            "news": [
                {
                    "id": 101,
                    "title": "AI가 바꾸는 미래 산업 동향",
                    "summaryForDisplay": "인공지능 기술이 다양한 산업 분야에 혁신을 가져오고 있으며, 특히 제조업과 서비스업에서의 변화가 두드러집니다...",
                    "publishedDate": "2024-07-30T10:00:00.000Z",
                    "sourceName": "AI 뉴스 전문",
                    "originalUrl": "http://example.com/news/101",
                    "imageUrl": "http://example.com/images/news101.jpg",
                    "keywordsForDisplay": ["AI", "미래 산업", "제조업"],
                    "category": "IT/과학",
                    "createdAt": "2024-07-30T11:00:00.000Z",
                    "updatedAt": "2024-07-30T11:05:00.000Z"
                },
                // ... (다른 뉴스 아이템들) ...
            ]
        }
        ```
        -   `news` 배열 내 각 객체 필드:
            -   `id` (integer): 뉴스 기사 고유 ID
            -   `title` (string): 뉴스 제목
            -   `summaryForDisplay` (string): 프론트엔드 표시용 요약 (AI 요약 또는 본문 일부)
            -   `publishedDate` (string, ISO 8601 Date): 발행일
            -   `sourceName` (string): 뉴스 출처명
            -   `originalUrl` (string, URL): 원문 기사 URL
            -   `imageUrl` (string, URL, optional): 대표 이미지 URL (없을 수 있음)
            -   `keywordsForDisplay` (array of strings): 프론트엔드 표시용 AI 추출 키워드 배열
            -   `category` (string, optional): 뉴스 카테고리 (없거나 '기타'일 수 있음)
            -   `createdAt` (string, ISO 8601 Date): 레코드 생성일
            -   `updatedAt` (string, ISO 8601 Date): 레코드 마지막 수정일
    -   **500 Internal Server Error (서버 오류)**:
        ```json
        {
            "message": "서버 오류로 뉴스 목록을 가져오는데 실패했습니다.",
            "error": " 상세 오류 메시지 (개발 모드에서만 노출될 수 있음)"
        }
        ```

### 3.2. 특정 뉴스 조회 (예시 - 현재 비활성화 상태)

-   **Endpoint**: `GET /api/news/:id`
-   **설명**: 특정 ID를 가진 뉴스 기사의 상세 정보를 조회합니다. (현재 `newsRoutes.js`에서 주석 처리되어 있음. 필요시 활성화 및 상세 명세 작성 필요)
-   **Path Parameters**:
    -   `id` (integer, required): 조회할 뉴스 기사의 ID.
-   **Responses**:
    -   **(구현 시 명세 추가)**

---