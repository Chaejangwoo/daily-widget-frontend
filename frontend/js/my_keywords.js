// frontend/js/my_keywords.js
document.addEventListener('DOMContentLoaded', () => {
    // --- 공통 인증 체크 ---
    // 이 페이지는 로그인이 필요하므로, auth.js의 enforceLogin 함수를 호출합니다.
    // auth.js는 이 스크립트보다 먼저 로드되어야 합니다.
    if (typeof enforceLogin === 'function') {
        if (!enforceLogin("관심 키워드 설정")) { // enforceLogin이 false를 반환하면 (리디렉션 발생)
            return; // 이 페이지의 나머지 스크립트 실행 중단
        }
    } else {
        console.warn("auth.js가 로드되지 않았거나 enforceLogin 함수를 찾을 수 없습니다. 수동으로 로그인 상태를 확인합니다.");
        // auth.js 로드 실패 시 비상 처리 (선택 사항)
        if (!localStorage.getItem('authToken')) {
            alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
            window.location.href = 'login.html';
            return;
        }
    }

    console.log('my_keywords.js 스크립트 시작!'); // 스크립트 실행 확인용 로그

    // --- DOM 요소 가져오기 ---
    const keywordOptionsArea = document.getElementById('keyword-options-area');
    const customKeywordInput = document.getElementById('custom-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const selectedKeywordsDisplay = document.getElementById('selected-keywords-display');
    const saveKeywordsBtn = document.getElementById('save-keywords-btn');
    const messageArea = document.getElementById('message-area');
    // 헤더의 user-greeting 및 logout-btn은 auth.js의 updateHeaderUI에서 이미 처리됨
    const API_BASE_URL = 'http://localhost:5001'; // 백엔드 서버 주소
    // --- 상태 변수 ---
    let selectedKeywords = []; // 현재 사용자가 선택한 키워드 배열
    const MAX_KEYWORDS = 5;    // 최대 선택 가능 키워드 수
    const predefinedKeywords = ["AI", "기술", "건강", "경제", "우주", "환경", "문화", "교육", "스포츠", "여행", "패션", "음식"]; // 추천 키워드 목록 확장

    // --- 초기화 함수 ---
    async function initializePage() { // 비동기 함수로 변경
        console.log("my_keywords.js: initializePage 호출됨");
        renderPredefinedKeywords();
        await loadUserInterests(); // 사용자 관심사 로드를 기다림
    }

    // 추천 키워드 버튼 렌더링 함수
    function renderPredefinedKeywords() {
        if (!keywordOptionsArea) return;
        keywordOptionsArea.innerHTML = '';
        predefinedKeywords.forEach(keyword => {
            const button = document.createElement('button');
            button.classList.add('keyword-btn');
            button.textContent = `#${keyword}`;
            button.dataset.keyword = keyword;
            if (selectedKeywords.includes(keyword)) {
                button.classList.add('selected');
            }
            button.addEventListener('click', () => toggleKeywordSelection(keyword, button));
            keywordOptionsArea.appendChild(button);
        });
    }

    // 선택된 키워드 목록 화면에 표시하는 함수
    function renderSelectedKeywords() {
        if (!selectedKeywordsDisplay) return;
        selectedKeywordsDisplay.innerHTML = '';
        selectedKeywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.classList.add('selected-keyword-tag');
            tag.textContent = `#${keyword}`;

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-keyword-btn');
            removeBtn.innerHTML = '×';
            removeBtn.title = `${keyword} 삭제`;
            removeBtn.addEventListener('click', () => removeKeyword(keyword));
            
            tag.appendChild(removeBtn);
            selectedKeywordsDisplay.appendChild(tag);
        });
    }

    // --- 이벤트 핸들러 및 로직 함수 ---

    function toggleKeywordSelection(keyword, buttonElement) {
        if (selectedKeywords.includes(keyword)) {
            selectedKeywords = selectedKeywords.filter(k => k !== keyword);
            if (buttonElement) buttonElement.classList.remove('selected');
        } else {
            if (selectedKeywords.length >= MAX_KEYWORDS) {
                showMessage(`최대 ${MAX_KEYWORDS}개의 키워드만 선택할 수 있습니다.`, 'error');
                return;
            }
            selectedKeywords.push(keyword);
            if (buttonElement) buttonElement.classList.add('selected');
        }
        renderSelectedKeywords();
        updatePredefinedKeywordButtonsStatus();
    }
    
    function updatePredefinedKeywordButtonsStatus() { // 함수명 명확하게 변경
        if (!keywordOptionsArea) return;
        const buttons = keywordOptionsArea.querySelectorAll('.keyword-btn');
        buttons.forEach(btn => {
            if (selectedKeywords.includes(btn.dataset.keyword)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    function addCustomKeyword() {
        if (!customKeywordInput) return;
        const keyword = customKeywordInput.value.trim();
        if (keyword) {
            if (selectedKeywords.includes(keyword)) {
                showMessage('이미 선택된 키워드입니다.', 'error');
            } else if (selectedKeywords.length >= MAX_KEYWORDS) {
                showMessage(`최대 ${MAX_KEYWORDS}개의 키워드만 선택할 수 있습니다.`, 'error');
            } else {
                selectedKeywords.push(keyword);
                renderSelectedKeywords();
                updatePredefinedKeywordButtonsStatus();
                showMessage(`'${keyword}' 키워드가 추가되었습니다.`, 'success');
            }
            customKeywordInput.value = '';
        } else {
            showMessage('추가할 키워드를 입력해주세요.', 'error');
        }
    }

    function removeKeyword(keywordToRemove) {
        selectedKeywords = selectedKeywords.filter(k => k !== keywordToRemove);
        renderSelectedKeywords();
        updatePredefinedKeywordButtonsStatus();
        showMessage(`'${keywordToRemove}' 키워드가 삭제되었습니다.`, 'success');
    }

    // 사용자 관심사 불러오기 함수 (API 호출로 변경)
    async function loadUserInterests() {
        const token = localStorage.getItem('authToken');
        console.log("loadUserInterests: authToken 값:", token); // 토큰 값 확인 로그
        if (!token) {
            console.log("관심사 로드: 토큰 없음 (API 호출 불가)");
            // 로그인 페이지로 리디렉션은 enforceLogin에서 이미 처리했을 것임
            selectedKeywords = []; // 기본값
            renderSelectedKeywords();
            updatePredefinedKeywordButtonsStatus();
            return;
        }
        console.log("loadUserInterests: fetch API 호출 시도 중..."); // fetch 호출 직전 로그
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/interests`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success && Array.isArray(data.interests)) {
                selectedKeywords = [...data.interests];
                console.log("사용자 관심사 로드 성공 (API):", selectedKeywords);
            } else {
                console.error('사용자 관심사 로드 실패 (API 응답 오류):', data.message || response.statusText);
                selectedKeywords = []; // 실패 시 빈 배열로 또는 이전 상태 유지 결정
                // 사용자에게 오류 메시지를 보여줄 수도 있음
                // showMessage(data.message || '관심사를 불러오는데 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('사용자 관심사 로드 중 네트워크 오류:', error);
            selectedKeywords = []; // 오류 발생 시 빈 배열
            showMessage('관심사를 불러오는 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
        } finally {
            renderSelectedKeywords();
            updatePredefinedKeywordButtonsStatus();
        }
    }
    // 관심 키워드 저장 함수 (API 호출로 변경)
    async function saveUserInterests() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showMessage('로그인이 필요합니다. 로그인 후 다시 시도해주세요.', 'error');
            return;
        }

        // 사용자가 모든 키워드를 제거하고 저장하는 것도 유효한 동작으로 간주 (빈 배열 저장)
        // if (selectedKeywords.length === 0) {
        //     showMessage('선택된 키워드가 없습니다. 최소 하나 이상의 키워드를 선택해주세요.', 'error');
        //     return;
        // }

        console.log('관심 키워드 저장 시도 (API):', selectedKeywords);
        showMessage('저장 중...', 'info'); // 로딩 중 메시지 (선택 사항)

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/interests`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ interests: selectedKeywords })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showMessage(data.message || '관심 키워드가 성공적으로 저장되었습니다.', 'success');
                // 성공 시 localStorage의 임시 userInterests는 제거해도 됨 (선택)
                // localStorage.removeItem('userInterests');
            } else {
                showMessage(data.message || `관심 키워드 저장에 실패했습니다. (상태: ${response.status})`, 'error');
            }
        } catch (error) {
            console.error('관심 키워드 저장 중 네트워크 오류:', error);
            showMessage('관심 키워드 저장 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
        }
    }

    function showMessage(message, type) {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        setTimeout(() => {
            if (messageArea.textContent === message) { // 다른 메시지로 덮어쓰이지 않았을 경우에만 초기화
                messageArea.textContent = '';
                messageArea.className = 'message-area';
            }
        }, 3000);
    }

    // --- 이벤트 리스너 등록 ---
    if (addKeywordBtn && customKeywordInput) {
        addKeywordBtn.addEventListener('click', addCustomKeyword);
        customKeywordInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addCustomKeyword();
            }
        });
    }

    if (saveKeywordsBtn) {
        saveKeywordsBtn.addEventListener('click', saveUserInterests);
    }

    // --- 페이지 초기화 실행 ---
    // DOMContentLoaded 내에서 initializePage를 호출하여 모든 요소가 준비된 후 실행되도록 함.
    initializePage();
});