// frontend/js/auth.js

// --- 공통 인증 관련 함수 ---

/**
 * localStorage에서 authToken을 확인하여 로그인 상태를 반환합니다.
 * @returns {boolean} 로그인 상태 (true: 로그인됨, false: 로그인 안됨)
 */
function isLoggedIn() {
    return !!localStorage.getItem('authToken'); // 토큰이 있으면 true, 없으면 false
}

/**
 * localStorage에서 사용자 정보를 가져옵니다.
 * @returns {object|null} 사용자 정보 객체 또는 null
 */
function getUserInfo() {
    const userInfoString = localStorage.getItem('userInfo');
    return userInfoString ? JSON.parse(userInfoString) : null;
}

/**
 * 로그아웃 처리: localStorage에서 토큰과 사용자 정보를 제거하고 로그인 페이지로 이동합니다.
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userInterests'); // 관심사 정보도 함께 제거
    alert('로그아웃 되었습니다.');
    window.location.href = 'login.html'; // 로그아웃 후 로그인 페이지로 이동
}

/**
 * 현재 페이지가 로그인이 필요한 페이지인지 확인하고,
 * 비로그인 상태이면 로그인 페이지로 리디렉션합니다.
 * @param {string} currentPageName - 현재 페이지 설명 (예: "관심 키워드 설정")
 */
function enforceLogin(currentPageName = "이 페이지") {
    if (!isLoggedIn()) {
        alert(`로그인이 필요한 ${currentPageName} 페이지입니다. 로그인 페이지로 이동합니다.`);
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        // 로그인 후 원래 페이지로 돌아오기 위한 redirect 파라미터 추가 (선택 사항)
        return false; // 리디렉션 발생했음을 알림
    }
    return true; // 로그인 상태임
}


/**
 * 로그인 상태에 따라 헤더의 UI를 업데이트합니다.
 * 이 함수는 헤더에 특정 ID를 가진 요소들이 있다고 가정합니다.
 */
function updateHeaderUI() {
    const loggedOutLinks = document.getElementById('auth-links-logged-out');
    const loggedInLinks = document.getElementById('auth-links-logged-in');
    const userGreetingMain = document.getElementById('user-greeting-main'); // index.html 용
    const userGreetingKeywords = document.getElementById('user-greeting'); // my_keywords.html 용
    const logoutBtnMain = document.getElementById('logout-btn-main');       // index.html 용
    const logoutBtnKeywords = document.getElementById('logout-btn');      // my_keywords.html 용

    if (isLoggedIn()) {
        if (loggedOutLinks) loggedOutLinks.style.display = 'none';
        if (loggedInLinks) loggedInLinks.style.display = 'flex'; // 또는 'block'

        const userInfo = getUserInfo();
        if (userInfo && userInfo.username) {
            if (userGreetingMain) userGreetingMain.textContent = `${userInfo.username}님, 안녕하세요!`;
            if (userGreetingKeywords) userGreetingKeywords.textContent = `${userInfo.username}님, 안녕하세요!`;
        }

        if (logoutBtnMain) logoutBtnMain.addEventListener('click', logout);
        if (logoutBtnKeywords) logoutBtnKeywords.addEventListener('click', logout);

    } else {
        if (loggedOutLinks) loggedOutLinks.style.display = 'flex'; // 또는 'block'
        if (loggedInLinks) loggedInLinks.style.display = 'none';
    }
}

// --- 페이지 로드 시 공통으로 실행할 로직 ---
// 모든 페이지에서 헤더 UI를 업데이트하도록 DOMContentLoaded 이벤트에 연결
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderUI(); // 헤더 UI 즉시 업데이트
});