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

    // --- 상태 변수 ---
    let selectedKeywords = []; // 현재 사용자가 선택한 키워드 배열
    const MAX_KEYWORDS = 5;    // 최대 선택 가능 키워드 수
    const predefinedKeywords = ["AI", "기술", "건강", "경제", "우주", "환경", "문화", "교육", "스포츠", "여행", "패션", "음식"]; // 추천 키워드 목록 확장

    // --- 초기화 함수 ---
    function initializePage() {
        // 로그인 상태 확인 및 사용자 정보 표시는 auth.js의 updateHeaderUI 및 enforceLogin에서 이미 처리됨.
        // 여기서는 이 페이지에 특화된 초기화만 수행합니다.
        console.log("my_keywords.js: initializePage 호출됨");

        // 1. 추천 키워드 버튼 생성
        renderPredefinedKeywords();

        // 2. 기존에 저장된 사용자 관심사 불러오기
        loadUserInterests();
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

    async function loadUserInterests() {
        const token = localStorage.getItem('authToken');
        // 토큰 유무는 enforceLogin에서 이미 확인했으므로 여기서는 로드 로직에 집중.
        // 하지만, 만약을 위해 여기서도 한번 더 체크하거나, 토큰이 필요한 API 호출 전에는 항상 확인.

        // 임시 로직: localStorage에서 관심사 불러오기
        const storedInterests = JSON.parse(localStorage.getItem('userInterests'));
        if (storedInterests && Array.isArray(storedInterests)) {
            selectedKeywords = [...storedInterests];
        } else {
            selectedKeywords = [];
        }
        renderSelectedKeywords();
        updatePredefinedKeywordButtonsStatus();
        console.log("my_keywords.js: 사용자 관심사 로드됨 (localStorage)", selectedKeywords);


        // 실제 API 호출 예시 (주석 처리) - 나중에 백엔드 연동 시 활성화
        /*
        if (!token) {
            console.log("관심사 로드: 토큰 없음 (API 호출 불가)");
            return;
        }
        try {
            const response = await fetch('/api/users/me/interests', { // 또는 /api/users/me
                method: 'GET', // API 명세에 따라
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user && data.user.interests) { // API 응답 구조에 따라
                    selectedKeywords = [...data.user.interests];
                } else if (data.success && data.interests) { // 또는 data.interests 바로 오는 경우
                    selectedKeywords = [...data.interests];
                }
                 else {
                    selectedKeywords = [];
                    console.log("API 응답에서 관심사 정보를 찾을 수 없습니다.");
                }
            } else {
                console.error('사용자 관심사 로드 실패 (API):', response.statusText);
                selectedKeywords = []; // 실패 시 빈 배열로
            }
        } catch (error) {
            console.error('사용자 관심사 로드 중 오류 (API):', error);
            selectedKeywords = [];
        } finally {
            renderSelectedKeywords();
            updatePredefinedKeywordButtonsStatus();
        }
        */
    }

    async function saveUserInterests() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showMessage('로그인이 필요합니다. 로그인 후 다시 시도해주세요.', 'error');
            return;
        }

        if (selectedKeywords.length === 0) {
            // 사용자가 모든 키워드를 제거하고 저장하는 경우도 있을 수 있으므로,
            // 이 부분은 정책에 따라 메시지를 보여주거나, 빈 배열을 저장하도록 허용할 수 있음.
            // showMessage('선택된 키워드가 없습니다. 최소 하나 이상의 키워드를 선택해주세요.', 'error');
            // return;
            console.log("저장할 키워드가 없습니다. 빈 배열로 저장 시도합니다.");
        }

        // 임시 로직: localStorage에 관심사 저장
        localStorage.setItem('userInterests', JSON.stringify(selectedKeywords));
        console.log('관심 키워드 저장 (localStorage):', selectedKeywords);
        showMessage('관심 키워드가 (임시로) 저장되었습니다!', 'success');
        
        // 실제 API 호출 예시 (주석 처리) - 나중에 백엔드 연동 시 활성화
        /*
        try {
            const response = await fetch('/api/users/me/interests', {
                method: 'PUT', // 또는 POST
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ interests: selectedKeywords })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                showMessage(data.message || '관심 키워드가 성공적으로 저장되었습니다.', 'success');
            } else {
                showMessage(data.message || '관심 키워드 저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('관심 키워드 저장 중 오류 (API):', error);
            showMessage('관심 키워드 저장 중 오류가 발생했습니다.', 'error');
        }
        */
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