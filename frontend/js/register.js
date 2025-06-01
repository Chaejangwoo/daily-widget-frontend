// frontend/js/register.js
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const messageArea = document.getElementById('message-area');

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // 폼 기본 제출 동작 방지

            // 메시지 영역 초기화
            messageArea.textContent = '';
            messageArea.className = 'message-area'; // 기본 클래스로 리셋

            // 입력값 가져오기
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;

            // 1. 프론트엔드 유효성 검사
            if (!username || !email || !password || !passwordConfirm) {
                showMessage('모든 필드를 입력해주세요.', 'error');
                return;
            }

            if (password !== passwordConfirm) {
                showMessage('비밀번호가 일치하지 않습니다.', 'error');
                passwordConfirmInput.focus(); // 비밀번호 확인 필드에 포커스
                return;
            }

            if (password.length < 8) {
                showMessage('비밀번호는 최소 8자 이상이어야 합니다.', 'error');
                passwordInput.focus();
                return;
            }

            // 이메일 형식 검사 (간단한 정규식)
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
                const response = await fetch('/api/users/register', { // 실제 API 엔드포인트로 변경
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) { // API 명세서의 성공 응답 참고
                    showMessage(data.message || '회원가입에 성공했습니다! 로그인 페이지로 이동합니다.', 'success');
                    // 성공 시 로그인 페이지로 리디렉션 또는 다른 작업 수행
                    setTimeout(() => {
                        window.location.href = 'login.html'; // 로그인 페이지로 이동
                    }, 2000); // 2초 후 이동
                } else {
                    // API에서 전달된 오류 메시지 또는 기본 오류 메시지 표시
                    showMessage(data.message || '회원가입에 실패했습니다. 다시 시도해주세요.', 'error');
                }
                */

                // --- 임시 성공 처리 (API 호출 주석 처리 시) ---
                console.log('회원가입 시도:', { username, email, password });
                showMessage(`회원가입 요청이 전송되었습니다 (백엔드 연결 시 실제 처리).\n사용자 이름: ${username}, 이메일: ${email}`, 'success');
                // 성공 시 폼 초기화 (선택 사항)
                // registerForm.reset();
                setTimeout(() => {
                    // window.location.href = 'login.html'; // 테스트용: 로그인 페이지 이동
                }, 2000);
                // --- 임시 성공 처리 끝 ---


            } catch (error) {
                console.error('회원가입 중 오류 발생:', error);
                showMessage('회원가입 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.', 'error');
            }
        });
    }

    // 메시지 표시 함수
    function showMessage(message, type) {
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`; // 'success' 또는 'error' 클래스 추가
    }
});