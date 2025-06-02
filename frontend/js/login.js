// frontend/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageArea = document.getElementById('message-area');

    // 백엔드 API 기본 URL (register.js와 동일하게 설정)
    const API_BASE_URL = 'http://localhost:5001'; // 백엔드 서버 주소로 변경해주세요!

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            messageArea.textContent = '';
            messageArea.className = 'message-area';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                showMessage('이메일과 비밀번호를 모두 입력해주세요.', 'error');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('올바른 이메일 형식이 아닙니다.', 'error');
                emailInput.focus();
                return;
            }

            // API 호출 시작
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/login`, { // API 엔드포인트
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success && data.token) { // 성공 조건: HTTP 2xx, success: true, 토큰 존재
                    // 로그인 성공: JWT 토큰 및 사용자 정보 저장
                    localStorage.setItem('authToken', data.token);
                    if (data.user) { // 사용자 정보가 응답에 포함되어 있다면 저장
                        localStorage.setItem('userInfo', JSON.stringify(data.user));
                    } else {
                        // 사용자 정보가 없다면, 토큰만으로 인증하고 필요시 /api/users/me 호출 고려
                        console.warn("로그인 응답에 사용자 정보(user 객체)가 없습니다.");
                        // 임시로 이메일만 저장하거나, 또는 사용자 이름을 알 수 없음을 표시
                        localStorage.setItem('userInfo', JSON.stringify({ email: email, username: email.split('@')[0] })); // 예시
                    }

                    showMessage(data.message || '로그인에 성공했습니다! 메인 페이지로 이동합니다.', 'success');
                    
                    setTimeout(() => {
                        // 로그인 후 돌아갈 페이지가 있다면 (예: redirect 쿼리 파라미터)
                        const urlParams = new URLSearchParams(window.location.search);
                        const redirectUrl = urlParams.get('redirect');
                        if (redirectUrl) {
                            window.location.href = redirectUrl;
                        } else {
                            window.location.href = 'index.html'; // 기본적으로 메인 페이지로
                        }
                    }, 1500);
                } else {
                    showMessage(data.message || `로그인에 실패했습니다. (상태 코드: ${response.status})`, 'error');
                }
            } catch (error) {
                console.error('로그인 중 네트워크 또는 기타 오류 발생:', error);
                showMessage('로그인 중 오류가 발생했습니다. 서버가 실행 중인지 확인하거나 네트워크 연결을 확인해주세요.', 'error');
            }
        });
    }

    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
    }
});