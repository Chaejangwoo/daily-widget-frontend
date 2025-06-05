// frontend/js/my_keywords.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof enforceLogin === 'function') {
        if (!enforceLogin("관심 키워드 설정")) {
            return;
        }
    } else {
        console.warn("auth.js가 로드되지 않았거나 enforceLogin 함수를 찾을 수 없습니다.");
        if (!localStorage.getItem('authToken')) {
            alert("로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.");
            window.location.href = 'login.html';
            return;
        }
    }

    console.log('my_keywords.js 스크립트 시작!');

    const keywordOptionsArea = document.getElementById('keyword-options-area');
    const customKeywordInput = document.getElementById('custom-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const selectedKeywordsDisplay = document.getElementById('selected-keywords-display');
    const saveKeywordsBtn = document.getElementById('save-keywords-btn');
    const messageArea = document.getElementById('message-area');
    const API_BASE_URL = 'http://localhost:5001';

    let selectedKeywords = [];
    const MAX_KEYWORDS = 5;
    const predefinedKeywords = ["AI", "기술", "건강", "경제", "우주", "환경", "문화", "교육", "스포츠", "여행", "패션", "음식"];

    async function initializePage() {
        console.log("my_keywords.js: initializePage 호출됨");
        renderPredefinedKeywords();
        await loadUserInterests(); // 사용자 관심사 로드를 기다림
    }

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

    function toggleKeywordSelection(keyword, buttonElement) {
        const keywordIndex = selectedKeywords.indexOf(keyword);
        if (keywordIndex > -1) { // 이미 선택된 경우 -> 제거
            selectedKeywords.splice(keywordIndex, 1);
            if (buttonElement) buttonElement.classList.remove('selected');
        } else { // 새로 선택하는 경우
            if (selectedKeywords.length >= MAX_KEYWORDS) {
                showMessage(`최대 ${MAX_KEYWORDS}개의 키워드만 선택할 수 있습니다.`, 'error');
                return;
            }
            selectedKeywords.push(keyword);
            if (buttonElement) buttonElement.classList.add('selected');
        }
        renderSelectedKeywords();
        // updatePredefinedKeywordButtonsStatus(); // renderPredefinedKeywords가 selectedKeywords를 사용하므로 중복 호출 불필요
    }
    
    function updatePredefinedKeywordButtonsStatus() {
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
                updatePredefinedKeywordButtonsStatus(); // 직접 추가 시 추천 키워드 상태도 업데이트
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
        updatePredefinedKeywordButtonsStatus(); // 삭제 시 추천 키워드 상태도 업데이트
        showMessage(`'${keywordToRemove}' 키워드가 삭제되었습니다.`, 'success');
    }

    async function loadUserInterests() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            selectedKeywords = [];
            renderSelectedKeywords();
            updatePredefinedKeywordButtonsStatus();
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/me/interests`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.success && Array.isArray(data.interests)) {
                selectedKeywords = [...data.interests];
                localStorage.setItem('userInterests', JSON.stringify(selectedKeywords)); // 로컬 스토리지에도 저장
                console.log("사용자 관심사 로드 성공 (API) 및 localStorage 저장:", selectedKeywords);
            } else {
                console.error('사용자 관심사 로드 실패 (API 응답 오류):', data.message || response.statusText);
                selectedKeywords = [];
            }
        } catch (error) {
            console.error('사용자 관심사 로드 중 네트워크 오류:', error);
            selectedKeywords = [];
            showMessage('관심사를 불러오는 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
        } finally {
            renderSelectedKeywords();
            updatePredefinedKeywordButtonsStatus();
        }
    }

    async function saveUserInterests() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showMessage('로그인이 필요합니다. 로그인 후 다시 시도해주세요.', 'error');
            return;
        }
        console.log('관심 키워드 저장 시도 (API):', selectedKeywords);
        showMessage('저장 중...', 'info');

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
                // API 응답에 업데이트된 관심사가 포함되어 오므로, 그것으로 localStorage 업데이트
                if (data.interests && Array.isArray(data.interests)) {
                    localStorage.setItem('userInterests', JSON.stringify(data.interests));
                    console.log('관심사 저장 성공 후 localStorage 업데이트 (API 응답 기반):', data.interests);
                } else { // 만약 API 응답에 interests가 없다면, 현재 selectedKeywords 사용
                    localStorage.setItem('userInterests', JSON.stringify(selectedKeywords));
                    console.warn('관심사 저장 API 응답에 interests 필드가 없어, 현재 선택된 값으로 localStorage 업데이트');
                }
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
            if (messageArea.textContent === message) {
                messageArea.textContent = '';
                messageArea.className = 'message-area';
            }
        }, 3000);
    }

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
    initializePage();
});