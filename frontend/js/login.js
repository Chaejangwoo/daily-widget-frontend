// frontend/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageArea = document.getElementById('message-area');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 폼 기본 제출 동작 방지

            messageArea.textContent = '';
            messageArea.className = 'message-area';

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // 1. 프론트엔드 유효성 검사
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

            // 2. (백엔드 준비 시) API 호출
            try {
                // API 호출 로직 (현재는 주석 처리)
                /*
                const response = await fetch('/api/users/login', { // 실제 API 엔드포인트
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success && data.token) { // API 명세서의 성공 응답 참고
                    // 로그인 성공: JWT 토큰 저장
                    localStorage.setItem('authToken', data.token); // localStorage에 토큰 저장
                    localStorage.setItem('userInfo', JSON.stringify(data.user)); // 사용자 정보도 저장 (선택 사항)

                    showMessage(data.message || '로그인에 성공했습니다! 메인 페이지로 이동합니다.', 'success');
                    
                    // 성공 시 메인 페이지(index.html)로 리디렉션
                    setTimeout(() => {
                        window.location.href = 'index.html'; 
                    }, 1500); // 1.5초 후 이동
                } else {
                    showMessage(data.message || '로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요.', 'error');
                }
                */

                // --- 임시 성공/실패 처리 (API 호출 주석 처리 시) ---
                console.log('로그인 시도:', { email, password });
                if (email === "test@example.com" && password === "password123") { // 임시 테스트 계정
                    localStorage.setItem('authToken', 'fake_jwt_token_for_testing');
                    localStorage.setItem('userInfo', JSON.stringify({ id: 'temp_user_id', username: '테스트유저', email: email }));
                    showMessage('임시 로그인 성공! 메인 페이지로 이동합니다.', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showMessage('임시 로그인 실패: 이메일 또는 비밀번호를 확인하세요.', 'error');
                }
                // --- 임시 성공/실패 처리 끝 ---

            } catch (error) {
                console.error('로그인 중 오류 발생:', error);
                showMessage('로그인 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', 'error');
            }
        });
    }

    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
    }
});