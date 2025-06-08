document.addEventListener('DOMContentLoaded', () => {
    if (typeof enforceLogin === 'function' && !enforceLogin("설정")) return;

    const API_BASE_URL = 'http://localhost:5001/api';
    const token = localStorage.getItem('authToken');

    // 프로필 폼 요소
    const profileForm = document.getElementById('profile-form');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const profileMessageArea = document.getElementById('profile-message-area');

    // 비밀번호 폼 요소
    const passwordForm = document.getElementById('password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordMessageArea = document.getElementById('password-message-area');

    // 메시지 표시 함수
    const showMessage = (area, message, type) => {
    // ★ 1. 메시지를 표시하기 전에 display 속성을 'block'으로 설정
    area.style.display = 'block';
    
    // 2. 내용과 클래스 이름 설정 (기존과 동일)
    area.textContent = message;
    area.className = `message-area ${type}`;

    // 3. 3초 후에 메시지 영역을 다시 숨김 (기존과 동일)
    setTimeout(() => {
        // 혹시 그 사이에 다른 메시지가 표시되었을 수 있으므로,
        // 현재 메시지와 동일할 때만 숨기도록 안전장치 추가 (선택 사항이지만 좋은 습관)
        if (area.textContent === message) {
            area.style.display = 'none';
        }
    }, 3000);
};
    
    // 페이지 로드 시 사용자 정보 불러오기
    const loadUserProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                emailInput.value = data.user.email;
                usernameInput.value = data.user.username;
            } else {
                showMessage(profileMessageArea, '사용자 정보를 불러오지 못했습니다.', 'error');
            }
        } catch (error) {
            console.error('프로필 로드 오류:', error);
            showMessage(profileMessageArea, '네트워크 오류가 발생했습니다.', 'error');
        }
    };

    // 프로필 업데이트 폼 제출 이벤트
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        try {
            const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            if (data.success) {
                showMessage(profileMessageArea, data.message, 'success');
                // 로컬 스토리지의 사용자 정보도 업데이트
                localStorage.setItem('userInfo', JSON.stringify(data.user));
                updateHeaderUI(); // 헤더의 환영 메시지 업데이트
            } else {
                showMessage(profileMessageArea, data.message, 'error');
            }
        } catch (error) {
            showMessage(profileMessageArea, '프로필 업데이트 중 오류가 발생했습니다.', 'error');
        }
    });

    // 비밀번호 변경 폼 제출 이벤트
    passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        return showMessage(passwordMessageArea, '새 비밀번호가 일치하지 않습니다.', 'error');
    }
    if (newPassword.length < 8) {
        return showMessage(passwordMessageArea, '새 비밀번호는 8자 이상이어야 합니다.', 'error');
    }

    // ★★★ 이 부분을 아래 코드로 교체합니다. ★★★
    try {
        const response = await fetch(`${API_BASE_URL}/users/me/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        // 응답 본문을 먼저 JSON으로 파싱합니다.
        const data = await response.json();

        // response.ok (HTTP 200-299) 인지 확인합니다.
        if (response.ok) {
            // 성공 시
            showMessage(passwordMessageArea, data.message || '비밀번호가 성공적으로 변경되었습니다.', 'success');
            passwordForm.reset(); // 성공 시 폼 초기화
        } else {
            // 실패 시 (400, 401, 500 등)
            // 백엔드가 보낸 구체적인 오류 메시지를 표시합니다.
            showMessage(passwordMessageArea, data.message || '알 수 없는 오류가 발생했습니다.', 'error');
        }
    } catch (error) {
        // 네트워크 오류 등 fetch 자체가 실패한 경우
        console.error('비밀번호 변경 중 네트워크 오류:', error);
        showMessage(passwordMessageArea, '비밀번호 변경 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
    }
});

    // 초기화
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    loadUserProfile();
});