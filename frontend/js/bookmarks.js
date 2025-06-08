// frontend/js/bookmarks.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof enforceLogin === 'function' && !enforceLogin("저장한 뉴스")) {
        return;
    }
    
    console.log('Daily Widget 북마크 페이지 스크립트 시작!');

    // --- 1. DOM 요소 및 상태 변수 ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    
    let currentPage = 1;
    const itemsPerPage = 9;
    let isLoading = false;
    let totalPages = 1;

    // --- 2. UI 렌더링 함수 ---

    function renderSkeletons() {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = '';
        for (let i = 0; i < itemsPerPage; i++) {
            const skeleton = `<div class="skeleton-card"><div class="skeleton-item skeleton-image"></div><div class="skeleton-item skeleton-title"></div><div class="skeleton-item skeleton-text"></div><div class="skeleton-item skeleton-text"></div><div class="skeleton-item skeleton-text"></div></div>`;
            newsListContainer.insertAdjacentHTML('beforeend', skeleton);
        }
    }

    function renderNewsItem(item) {
        const article = document.createElement('article');
        article.classList.add('news-item');

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('news-image-container');

        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'bookmark-btn bookmarked';
        bookmarkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
        bookmarkBtn.title = '북마크 취소';
        
        bookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBookmarkAndRemoveCard(item.id, article);
        });
        imageContainer.appendChild(bookmarkBtn);

        if (item.imageUrl) {
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = (item.title || '뉴스 이미지').substring(0, 50);
            img.loading = 'lazy';
            img.onerror = function() { this.parentElement.insertAdjacentHTML('beforeend', `<span class="placeholder-icon">📰</span>`); this.remove(); };
            imageContainer.appendChild(img);
        } else {
            imageContainer.insertAdjacentHTML('beforeend', `<span class="placeholder-icon">📰</span>`);
        }
        article.appendChild(imageContainer);

        if (item.category) {
            const categoryTag = document.createElement('span');
            categoryTag.className = 'news-category-tag';
            categoryTag.textContent = item.category;
            article.appendChild(categoryTag);
        }

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title || '제목 없음';
        article.appendChild(titleElement);

        const summaryWrapper = document.createElement('div');
        summaryWrapper.className = 'summary-wrapper';
        const summaryElement = document.createElement('p');
        summaryElement.className = 'summary';
        summaryElement.textContent = item.summaryForDisplay || '요약 정보가 없습니다.';
        summaryWrapper.appendChild(summaryElement);
        article.appendChild(summaryWrapper);

        const metaElement = document.createElement('div');
        metaElement.className = 'meta';
        const publishedDate = item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : '날짜 미상';
        metaElement.innerHTML = `<span class="source">${item.sourceName || '출처 미상'}</span> | <span class="date">${publishedDate}</span>`;
        article.appendChild(metaElement);

        const keywordsContainer = document.createElement('div');
        keywordsContainer.className = 'keywords';
        if (item.keywordsForDisplay && item.keywordsForDisplay.length > 0) {
            item.keywordsForDisplay.forEach(keywordText => {
                const keywordSpan = document.createElement('span');
                keywordSpan.textContent = `#${keywordText}`;
                keywordsContainer.appendChild(keywordSpan);
            });
        }
        article.appendChild(keywordsContainer);

        const linkElement = document.createElement('a');
        linkElement.href = item.originalUrl || "#";
        linkElement.className = 'original-link';
        linkElement.textContent = '원문 보기 →';
        linkElement.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (item.originalUrl && item.originalUrl !== "#") openModalWithArticle(item.originalUrl);
        });
        article.appendChild(linkElement);

        return article;
    }

    function displayNews(newsArray, isInitialLoad = false) {
        if (!newsListContainer) return;
        if (isInitialLoad) newsListContainer.innerHTML = '';
        if (!newsArray || newsArray.length === 0) {
            if (isInitialLoad) newsListContainer.innerHTML = `<p class="empty-message">저장된 뉴스가 없습니다.</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        const baseDelay = isInitialLoad ? 0 : newsListContainer.children.length;
        newsArray.forEach((item, index) => {
            const newsElement = renderNewsItem(item);
            newsElement.style.animationDelay = `${(baseDelay + index) * 70}ms`;
            newsListContainer.appendChild(newsElement);
        });
    }

    // --- 3. API 통신 및 로직 함수 ---

    async function toggleBookmarkAndRemoveCard(newsId, cardElement) {
        cardElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            cardElement.remove();
            if (newsListContainer.children.length === 0) {
                newsListContainer.innerHTML = `<p class="empty-message">저장된 뉴스가 없습니다.</p>`;
            }
        }, 300);

        const token = localStorage.getItem('authToken');
        try {
            await fetch(`${API_BASE_URL}/news/${newsId}/bookmark`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('북마크 취소 실패 (서버 통신):', error);
        }
    }

    async function loadBookmarkedNews(isInitialLoad = true) {
        if (isLoading) return;
        isLoading = true;
        if (isInitialLoad) {
            currentPage = 1;
            renderSkeletons();
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/me/bookmarks?page=${currentPage}&limit=${itemsPerPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.success) {
                displayNews(data.news, isInitialLoad);
                totalPages = data.totalPages;
            } else {
                throw new Error(data.message || '북마크 로드 실패');
            }
        } catch (error) {
            console.error("북마크 로드 실패:", error);
            if (isInitialLoad) newsListContainer.innerHTML = `<p class="empty-message">오류가 발생했습니다.</p>`;
        } finally {
            isLoading = false;
            updateLoadMoreButtonVisibility();
        }
    }

    // --- 4. 유틸리티 및 이벤트 리스너 ---
    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        const hasContent = newsListContainer && newsListContainer.children.length > 0 && !newsListContainer.querySelector('.empty-message');
        loadMoreBtn.style.display = (currentPage < totalPages && hasContent) ? 'block' : 'none';
    }
    
    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        modalIframe.src = 'about:blank';
        setTimeout(() => { modalIframe.src = url; modal.style.display = 'block'; document.body.style.overflow = 'hidden'; }, 50);
    }
    
    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = 'none';
        modalIframe.src = 'about:blank';
        document.body.style.overflow = '';
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            loadBookmarkedNews(false);
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'block') closeModal(); });

    // --- 5. 초기화 ---
    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    loadBookmarkedNews();
});