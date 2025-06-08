document.addEventListener('DOMContentLoaded', () => {
    if (typeof enforceLogin === 'function' && !enforceLogin("관심 키워드 설정")) {
        return;
    }
    console.log('my_keywords.js 스크립트 시작!');

    // --- DOM 요소 및 변수 ---
    const keywordOptionsArea = document.getElementById('keyword-options-area');
    const customKeywordInput = document.getElementById('custom-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const selectedKeywordsDisplay = document.getElementById('selected-keywords-display');
    const saveKeywordsBtn = document.getElementById('save-keywords-btn');
    const messageArea = document.getElementById('message-area');
    const API_BASE_URL = 'http://localhost:5001/api';
    const token = localStorage.getItem('authToken');

    let selectedKeywords = [];
    const MAX_KEYWORDS = 5;
    const predefinedKeywords = ["AI", "기술", "건강", "경제", "우주", "환경", "문화", "교육", "스포츠", "여행", "패션", "음식"];

    // --- 기능 함수 ---

    function renderAll() {
        renderPredefinedKeywords();
        renderSelectedKeywords();
    }

    function renderPredefinedKeywords() {
        if (!keywordOptionsArea) return;
        keywordOptionsArea.innerHTML = '';
        predefinedKeywords.forEach(keyword => {
            const button = document.createElement('button');
            button.className = 'keyword-btn';
            button.textContent = `#${keyword}`;
            button.dataset.keyword = keyword;
            button.classList.toggle('selected', selectedKeywords.includes(keyword));
            button.addEventListener('click', () => toggleKeywordSelection(keyword));
            keywordOptionsArea.appendChild(button);
        });
    }

    function renderSelectedKeywords() {
        if (!selectedKeywordsDisplay) return;
        selectedKeywordsDisplay.innerHTML = '';
        selectedKeywords.forEach(keyword => {
            const tag = document.createElement('span');
            tag.className = 'selected-keyword-tag';
            tag.textContent = `#${keyword}`;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-keyword-btn';
            removeBtn.innerHTML = '×';
            removeBtn.addEventListener('click', () => removeKeyword(keyword));
            tag.appendChild(removeBtn);
            selectedKeywordsDisplay.appendChild(tag);
        });
    }

    function toggleKeywordSelection(keyword) {
        const index = selectedKeywords.indexOf(keyword);
        if (index > -1) {
            selectedKeywords.splice(index, 1);
        } else {
            if (selectedKeywords.length >= MAX_KEYWORDS) {
                return showMessage(`최대 ${MAX_KEYWORDS}개만 선택 가능합니다.`, 'error');
            }
            selectedKeywords.push(keyword);
        }
        renderAll();
    }

    function addCustomKeyword() {
        const keyword = customKeywordInput.value.trim();
        if (!keyword) return;
        if (selectedKeywords.includes(keyword)) {
            return showMessage('이미 선택된 키워드입니다.', 'error');
        }
        if (selectedKeywords.length >= MAX_KEYWORDS) {
            return showMessage(`최대 ${MAX_KEYWORDS}개만 선택 가능합니다.`, 'error');
        }
        selectedKeywords.push(keyword);
        customKeywordInput.value = '';
        renderAll();
    }

    function removeKeyword(keywordToRemove) {
        selectedKeywords = selectedKeywords.filter(k => k !== keywordToRemove);
        renderAll();
    }

    async function loadUserInterests() {
        if (!token) return;
        try {
            console.log('서버에 관심사 조회를 요청합니다...');
            const response = await fetch(`${API_BASE_URL}/users/me/interests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`서버 응답 오류: ${response.status}`);
            
            const data = await response.json();
            console.log('서버로부터 받은 데이터:', data);

            if (data.success && Array.isArray(data.interests)) {
                // ★ 서버에서 받은 데이터로 selectedKeywords 배열을 교체
                selectedKeywords = data.interests;
                console.log('selectedKeywords 배열이 업데이트되었습니다:', selectedKeywords);
            } else {
                console.warn('관심사 데이터가 올바른 형식이 아닙니다.');
                selectedKeywords = [];
            }
        } catch (error) {
            console.error('관심사 로드 중 오류 발생:', error);
            showMessage('관심사를 불러오는 중 오류가 발생했습니다.', 'error');
            selectedKeywords = [];
        }
    }

    async function saveUserInterests() {
        if (!token) return showMessage('로그인이 필요합니다.', 'error');
        try {
            const response = await fetch(`${API_BASE_URL}/users/me/interests`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ interests: selectedKeywords })
            });
            const data = await response.json();
            if (data.success) {
                showMessage(data.message || '관심 키워드가 저장되었습니다.', 'success');
                localStorage.setItem('userInterests', JSON.stringify(data.interests || selectedKeywords));
                localStorage.setItem('interestsUpdated', 'true');
            } else {
                showMessage(data.message || '저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            showMessage('저장 중 오류가 발생했습니다.', 'error');
        }
    }

    function showMessage(message, type) {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            if (area.textContent === message) area.style.display = 'none';
        }, 3000);
    }
    
    async function initializePage() {
        console.log("페이지 초기화 시작");
        await loadUserInterests(); // 데이터 로드를 완전히 기다림
        renderAll(); //  로드된 데이터로 모든 UI를 한번에 그림
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        console.log("페이지 초기화 완료");
    }

    // --- 이벤트 리스너 ---
    addKeywordBtn.addEventListener('click', addCustomKeyword);
    customKeywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomKeyword(); } });
    saveKeywordsBtn.addEventListener('click', saveUserInterests);
    
    // --- 초기화 실행 ---
    initializePage();
});