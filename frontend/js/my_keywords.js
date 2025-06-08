document.addEventListener('DOMContentLoaded', () => {
    if (typeof enforceLogin === 'function' && !enforceLogin("관심 키워드 설정")) {
        return;
    }
    console.log('my_keywords.js 스크립트 시작!');

    const keywordOptionsArea = document.getElementById('keyword-options-area');
    const customKeywordInput = document.getElementById('custom-keyword-input');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const selectedKeywordsDisplay = document.getElementById('selected-keywords-display');
    const saveKeywordsBtn = document.getElementById('save-keywords-btn');
    const messageArea = document.getElementById('message-area');
    const API_BASE_URL = 'http://localhost:5001/api';

    let selectedKeywords = [];
    const MAX_KEYWORDS = 5;
    const predefinedKeywords = ["정치", "경제", "사회", "IT/과학", "생활/문화", "스포츠", "문화", "국제"];

    function renderPredefinedKeywords() {
        if (!keywordOptionsArea) {
            console.error("'keyword-options-area' 요소를 찾을 수 없습니다.");
            return;
        }
        keywordOptionsArea.innerHTML = '';
        predefinedKeywords.forEach(keyword => {
            const button = document.createElement('button');
            button.className = 'keyword-btn';
            button.textContent = `#${keyword}`;
            button.dataset.keyword = keyword;
            if (selectedKeywords.includes(keyword)) {
                button.classList.add('selected');
            }
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
            removeBtn.title = `${keyword} 삭제`;
            removeBtn.addEventListener('click', () => removeKeyword(keyword));
            tag.appendChild(removeBtn);
            selectedKeywordsDisplay.appendChild(tag);
        });
    }

    function updateAllKeywordButtons() {
        const buttons = document.querySelectorAll('.keyword-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('selected', selectedKeywords.includes(btn.dataset.keyword));
        });
    }
    
    function toggleKeywordSelection(keyword) {
        const index = selectedKeywords.indexOf(keyword);
        if (index > -1) {
            selectedKeywords.splice(index, 1);
        } else {
            if (selectedKeywords.length >= MAX_KEYWORDS) {
                return showMessage(`최대 ${MAX_KEYWORDS}개의 키워드만 선택할 수 있습니다.`, 'error');
            }
            selectedKeywords.push(keyword);
        }
        renderSelectedKeywords();
        updateAllKeywordButtons();
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
                updateAllKeywordButtons();
            }
            customKeywordInput.value = '';
        }
    }

    function removeKeyword(keywordToRemove) {
        selectedKeywords = selectedKeywords.filter(k => k !== keywordToRemove);
        renderSelectedKeywords();
        updateAllKeywordButtons();
    }

    async function loadUserInterests() {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/users/me/interests`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.success && Array.isArray(data.interests)) {
                selectedKeywords = [...data.interests];
                localStorage.setItem('userInterests', JSON.stringify(selectedKeywords));
            }
        } catch (error) {
            console.error('관심사 로드 오류:', error);
            showMessage('관심사를 불러오는 중 오류가 발생했습니다.', 'error');
        }
    }

    async function saveUserInterests() {
        const token = localStorage.getItem('authToken');
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
            } else {
                showMessage(data.message || '저장에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('관심사 저장 오류:', error);
            showMessage('저장 중 오류가 발생했습니다.', 'error');
        }
    }

    function showMessage(message, type) {
        if (!messageArea) return;
        messageArea.textContent = message;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            if (messageArea.textContent === message) {
                messageArea.style.display = 'none';
            }
        }, 3000);
    }
    
    async function initializePage() {
        console.log("my_keywords.js: 페이지 초기화 시작");
        await loadUserInterests();
        renderPredefinedKeywords();
        renderSelectedKeywords();
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        console.log("my_keywords.js: 페이지 초기화 완료");
    }

    if (addKeywordBtn && customKeywordInput) {
        addKeywordBtn.addEventListener('click', addCustomKeyword);
        customKeywordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomKeyword(); } });
    }
    if (saveKeywordsBtn) {
        saveKeywordsBtn.addEventListener('click', saveUserInterests);
    }
    
    initializePage();
});