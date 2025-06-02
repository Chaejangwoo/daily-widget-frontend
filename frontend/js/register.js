// frontend/js/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const messageArea = document.getElementById('message-area');

    // 백엔드 API 기본 URL (환경에 따라 변경 가능)
    const API_BASE_URL = 'http://localhost:5001'; // 백엔드 서버 주소로 변경해주세요!

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            messageArea.textContent = '';
            messageArea.className = 'message-area';

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;

            if (!username || !email || !password || !passwordConfirm) {
                showMessage('모든 필드를 입력해주세요.', 'error');
                return;
            }
            if (password !== passwordConfirm) {
                showMessage('비밀번호가 일치하지 않습니다.', 'error');
                passwordConfirmInput.focus();
                return;
            }
            if (password.length < 8) {
                showMessage('비밀번호는 최소 8자 이상이어야 합니다.', 'error');
                passwordInput.focus();
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
                const response = await fetch(`${API_BASE_URL}/api/users/register`, { // API 엔드포인트
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json(); // 응답 본문을 JSON으로 파싱

                if (response.ok && data.success) { // HTTP 상태 코드가 2xx이고, 응답 데이터에 success: true가 있을 때
                    showMessage(data.message || '회원가입에 성공했습니다! 로그인 페이지로 이동합니다.', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    // 서버에서 전달된 오류 메시지 또는 기본 오류 메시지 표시
                    showMessage(data.message || `회원가입에 실패했습니다. (상태 코드: ${response.status})`, 'error');
                }
            } catch (error) {
                console.error('회원가입 중 네트워크 또는 기타 오류 발생:', error);
                showMessage('회원가입 중 오류가 발생했습니다. 서버가 실행 중인지 확인하거나 네트워크 연결을 확인해주세요.', 'error');
            }
        });
    }

    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        // 메시지 자동 사라짐 기능 (선택 사항)
        // setTimeout(() => {
        //     if (messageArea.textContent === message) {
        //         messageArea.textContent = '';
        //         messageArea.className = 'message-area';
        //     }
        // }, 5000); // 5초 후 사라짐
    }
});