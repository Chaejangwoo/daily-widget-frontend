# Daily Widget API 명세서

## 1. 사용자 인증 (Auth)

### 1.1. 회원가입

*   **Description:** 새로운 사용자를 등록합니다.
*   **URL:** `/api/users/register`
*   **Method:** `POST`
*   **Request Header:**
    *   `Content-Type: application/json`
*   **Request Body (JSON):**
    ```json
    {
      "username": "testuser",        // 사용자 이름 (필수, 문자열)
      "email": "test@example.com",   // 이메일 (필수, 유효한 이메일 형식)
      "password": "password123"      // 비밀번호 (필수, 문자열, 최소 8자 이상 권장)
    }
    ```
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "message": "회원가입이 성공적으로 완료되었습니다.",
      "userId": "generated_user_id" // 생성된 사용자 ID
    }
    ```
*   **Response (Fail - 400 Bad Request - 입력값 오류):**
    ```json
    {
      "success": false,
      "message": "입력값을 확인해주세요. (예: 이메일 형식이 올바르지 않습니다.)"
    }
    ```
*   **Response (Fail - 409 Conflict - 이미 사용 중인 이메일/사용자 이름):**
    ```json
    {
      "success": false,
      "message": "이미 사용 중인 이메일 또는 사용자 이름입니다."
    }
    ```

### 1.2. 로그인

*   **Description:** 사용자를 인증하고 JWT 토큰을 발급합니다.
*   **URL:** `/api/users/login`
*   **Method:** `POST`
*   **Request Header:**
    *   `Content-Type: application/json`
*   **Request Body (JSON):**
    ```json
    {
      "email": "test@example.com",
      "password": "password123"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "message": "로그인 성공",
      "token": "your_jwt_token_here", // JWT 토큰
      "user": {
        "id": "user_id_here",
        "username": "testuser",
        "email": "test@example.com"
      }
    }
    ```
*   **Response (Fail - 401 Unauthorized - 인증 실패):**
    ```json
    {
      "success": false,
      "message": "이메일 또는 비밀번호가 일치하지 않습니다."
    }
    ```

### 1.3. (선택) 내 정보 조회 (인증 필요)

*   **Description:** 현재 로그인된 사용자의 정보를 조회합니다.
*   **URL:** `/api/users/me`
*   **Method:** `GET`
*   **Request Header:**
    *   `Authorization: Bearer <your_jwt_token>`
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "user": {
        "id": "user_id_here",
        "username": "testuser",
        "email": "test@example.com",
        "interests": ["AI", "기술"] // 저장된 관심사 (아래 API와 연동)
      }
    }
    ```
*   **Response (Fail - 401 Unauthorized - 토큰 없음 또는 유효하지 않음):**
    ```json
    {
      "success": false,
      "message": "인증되지 않은 사용자입니다."
    }
    ```

### 1.4. (선택) 사용자 관심사 업데이트 (인증 필요)

*   **Description:** 현재 로그인된 사용자의 관심 키워드를 업데이트합니다.
*   **URL:** `/api/users/me/interests`
*   **Method:** `PUT` (또는 `POST`)
*   **Request Header:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <your_jwt_token>`
*   **Request Body (JSON):**
    ```json
    {
      "interests": ["AI", "기술", "새로운관심사"] // 사용자가 선택/입력한 관심 키워드 배열
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "message": "관심사가 성공적으로 업데이트되었습니다.",
      "interests": ["AI", "기술", "새로운관심사"]
    }
    ```
*   **Response (Fail - 401 Unauthorized):** (위와 동일)
*   **Response (Fail - 400 Bad Request - 입력값 오류):**
    ```json
    {
      "success": false,
      "message": "관심사 목록 형식이 올바르지 않습니다."
    }
    ```

## 2. 뉴스 (News) - 예시 (다른 팀원이 구현 중인 부분)

*   이 부분은 다른 팀원이 구현 중이므로, 여기서는 간단한 예시만 작성합니다.
*   나중에 실제 API 명세가 나오면 업데이트해야 합니다.

### 2.1. 전체 뉴스 목록 조회

*   **URL:** `/api/news`
*   **Method:** `GET`
*   **Query Parameters (선택 사항):**
    *   `page=1` (페이지 번호)
    *   `limit=10` (한 페이지당 아이템 수)
    *   `category=technology` (카테고리 필터)
*   **Response (Success - 200 OK):** (응답 형식은 팀과 협의)
    ```json
    {
      "success": true,
      "data": {
        "articles": [
          { "id": "news1", "title": "뉴스 제목1", "summary": "요약1...", "keywords": ["ai", "tech"] },
          { "id": "news2", "title": "뉴스 제목2", "summary": "요약2...", "keywords": ["health", "life"] }
        ],
        "pagination": {
          "currentPage": 1,
          "totalPages": 10,
          "totalItems": 100
        }
      }
    }
    ```

---

위 명세서는 기본적인 틀이며, 필요에 따라 더 상세한 오류 코드나 필드 설명을 추가할 수 있습니다. 이제 이 명세서를 기준으로 다중 HTML 파일 형식으로 개발을 시작해 봅시다.

**다중 HTML 파일 형식으로 프로젝트 구성:**

`frontend` 폴더 내에 다음과 같은 HTML 파일들을 만들고, 각 파일에 필요한 JavaScript 로직을 연결합니다.

1.  **`index.html`**: 메인 뉴스 목록 페이지 (기존 작업 내용 유지 또는 수정)
2.  **`register.html`**: 회원가입 페이지
3.  **`login.html`**: 로그인 페이지
4.  **`profile.html` (또는 `my_keywords.html`)**: 사용자 관심 키워드 설정/수정 페이지 (로그인 후 접근)

**다음 단계 제안:**

1.  **회원가입 페이지 (`register.html`) 부터 만들기:**
    *   `register.html` 파일 생성.
    *   API 명세서의 "1.1. 회원가입" 부분을 참고하여 HTML 폼 (username, email, password, password_confirm 입력 필드 및 회원가입 버튼)을 만듭니다.
    *   별도의 `js/register.js` 파일을 만들고 `register.html`에 연결합니다.
    *   `register.js`에서 폼 제출(submit) 이벤트를 감지하고, 입력값 유효성 검사 후, (백엔드가 준비되면) `/api/users/register` API를 호출하는 로직을 작성합니다. (지금은 API 호출 부분은 주석 처리하고 프론트엔드 로직만 구현)

**`frontend/register.html` 예시 (기본 구조):**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - Daily Widget</title>
    <link rel="stylesheet" href="css/style.css"> <!-- 공통 CSS 사용 -->
    <link rel="stylesheet" href="css/auth.css"> <!-- 인증 페이지용 별도 CSS (선택 사항) -->
</head>
<body>
    <header>
        <h1><a href="index.html">Daily Widget</a></h1>
        <nav>
            <a href="login.html"><button>로그인</button></a>
        </nav>
    </header>

    <main class="auth-page">
        <section class="auth-form-container">
            <h2>회원가입</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="username">사용자 이름</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="email">이메일</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">비밀번호</label>
                    <input type="password" id="password" name="password" required minlength="8">
                </div>
                <div class="form-group">
                    <label for="password-confirm">비밀번호 확인</label>
                    <input type="password" id="password-confirm" name="password-confirm" required>
                </div>
                <button type="submit" class="btn-submit">가입하기</button>
            </form>
            <p class="auth-link">이미 계정이 있으신가요? <a href="login.html">로그인</a></p>
            <div id="message-area" class="message-area"></div> <!-- 성공/실패 메시지 표시 영역 -->
        </section>
    </main>

    <footer>
        <p>© 2024 Daily Widget. All rights reserved.</p>
    </footer>

    <script src="js/register.js"></script>
</body>
</html>