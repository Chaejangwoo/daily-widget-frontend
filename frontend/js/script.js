document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 메인 페이지 스크립트 시작!');

    // 1. DOM 요소 캐싱
    const API_BASE_URL = 'http://localhost:5001/api';
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const popularTopicsList = document.getElementById('popular-topics-list');
    const recommendedKeywordsContainer = document.getElementById('recommended-keywords');

    // 2. 상태 변수
    let currentPage = 1, itemsPerPage = 9, isLoading = false, totalPages = 1;
    let currentSearchTerm = '', currentCategory = '';

    // 3. UI 렌더링 함수
    function renderSkeletons() {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = Array(itemsPerPage).fill('<div class="skeleton-card"><div class="skeleton-item skeleton-image"></div><div class="skeleton-item skeleton-title"></div><div class="skeleton-item skeleton-text"></div><div class="skeleton-item skeleton-text"></div><div class="skeleton-item skeleton-text"></div></div>').join('');
    }

    function renderNewsItem(item) {
        const article = document.createElement('article');
        article.className = 'news-item';
        let imageHTML = `<span class="placeholder-icon">📰</span>`;
        if (item.imageUrl) {
            imageHTML = `<img src="${item.imageUrl}" alt="${(item.title || '').substring(0, 50)}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'placeholder-icon\\'>📰</span>'; this.remove();">`;
        }
        let bookmarkHTML = '';
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const bookmarkedClass = item.isBookmarked ? 'bookmarked' : '';
            const title = item.isBookmarked ? '북마크 취소' : '북마크하기';
            bookmarkHTML = `<button class="bookmark-btn ${bookmarkedClass}" title="${title}" data-id="${item.id}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>`;
        }
        const categoryHTML = item.category ? `<span class="news-category-tag">${item.category}</span>` : '';
        const keywordsHTML = (item.keywordsForDisplay || []).map(kw => `<span data-keyword="${kw}">#${kw}</span>`).join('');
        const publishedDate = item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : '날짜 미상';
        
        article.innerHTML = `
            <div class="news-image-container">${bookmarkHTML}${imageHTML}</div>
            ${categoryHTML}
            <h2>${item.title || '제목 없음'}</h2>
            <div class="summary-wrapper"><p class="summary">${item.summaryForDisplay || '요약 정보가 없습니다.'}</p></div>
            <div class="meta"><span class="source">${item.sourceName || '출처 미상'}</span> | <span class="date">${publishedDate}</span></div>
            <div class="keywords">${keywordsHTML}</div>
            <a href="${item.originalUrl || '#'}" class="original-link" data-id="${item.id}">원문 보기 →</a>
        `;
        
        const bookmarkButton = article.querySelector('.bookmark-btn');
        if (bookmarkButton) {
            bookmarkButton.addEventListener('click', (e) => { e.stopPropagation(); toggleBookmark(e.currentTarget.dataset.id, e.currentTarget); });
        }
        article.querySelector('.original-link').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (item.originalUrl) openModalWithArticle(e.currentTarget.dataset.id, item.originalUrl); });
        article.querySelectorAll('.keywords span').forEach(span => { span.addEventListener('click', (e) => { e.stopPropagation(); handleKeywordClick(e.currentTarget.dataset.keyword); })});

        return article;
    }

    function displayNews(newsArray, isInitialLoad = false) {
        if (!newsListContainer) return;
        if (isInitialLoad) newsListContainer.innerHTML = '';
        if (!newsArray || newsArray.length === 0) {
            if (isInitialLoad) newsListContainer.innerHTML = `<p class="empty-message">표시할 뉴스가 없습니다.</p>`;
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

    // 4. API 통신 및 로직
    async function fetchAPI(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        if (token) {
            options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    }

    async function toggleBookmark(newsId, buttonElement) {
        const isCurrentlyBookmarked = buttonElement.classList.contains('bookmarked');
        buttonElement.classList.toggle('bookmarked', !isCurrentlyBookmarked);
        try {
            await fetchAPI(`/news/${newsId}/bookmark`, { method: 'POST' });
        } catch (error) {
            console.error('북마크 토글 실패:', error);
            buttonElement.classList.toggle('bookmarked', isCurrentlyBookmarked); // 오류 시 원복
        }
    }

    async function loadInitialNews(searchTerm = '', category = '') {
        if (isLoading) return;
        isLoading = true;
        [currentSearchTerm, currentCategory, currentPage] = [searchTerm.trim(), category, 1];
        renderSkeletons();
        try {
            const interests = JSON.parse(localStorage.getItem('userInterests') || '[]').join(',');
            const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage, keyword: currentSearchTerm, category: currentCategory, user_interests: interests });
            const data = await fetchAPI(`/news?${params.toString()}`);
            displayNews(data.news || [], true);
            totalPages = data.totalPages || 1;
        } catch (error) {
            if (newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">오류 발생</p>`;
        } finally {
            isLoading = false;
            updateLoadMoreButtonVisibility();
        }
    }
    
    async function loadMoreNews() {
        if (isLoading || currentPage >= totalPages) return;
        isLoading = true;
        currentPage++;
        try {
            const interests = JSON.parse(localStorage.getItem('userInterests') || '[]').join(',');
            const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage, keyword: currentSearchTerm, category: currentCategory, user_interests: interests });
            const data = await fetchAPI(`/news?${params.toString()}`);
            displayNews(data.news || [], false);
            totalPages = data.totalPages;
        } catch (error) {
            currentPage--;
        } finally {
            isLoading = false;
            updateLoadMoreButtonVisibility();
        }
    }

    async function loadInsightData() {
        if (popularTopicsList) {
            try {
                const data = await fetchAPI('/trends/popular');
                if (data.success) {
                    popularTopicsList.innerHTML = data.topics.map(topic => `<li><a href="#" data-keyword="${topic}">#${topic}</a></li>`).join('');
                    popularTopicsList.querySelectorAll('a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); handleKeywordClick(e.target.dataset.keyword); }));
                }
            } catch (error) { console.error("인기 토픽 로드 실패:", error); }
        }
        if (recommendedKeywordsContainer) {
            if (localStorage.getItem('authToken')) {
                try {
                    const data = await fetchAPI('/users/me/recommendations/keywords');
                    recommendedKeywordsContainer.innerHTML = '';
                    if (data.success && data.keywords.length > 0) {
                        data.keywords.forEach(kw => {
                            const span = document.createElement('span');
                            span.textContent = `#${kw}`;
                            span.addEventListener('click', () => handleKeywordClick(kw));
                            recommendedKeywordsContainer.appendChild(span);
                        });
                    } else { recommendedKeywordsContainer.innerHTML = `<span class="no-recommendation">관심사를 설정하면<br>키워드를 추천해 드려요!</span>`; }
                } catch (error) { recommendedKeywordsContainer.innerHTML = `<span class="no-recommendation">추천 로딩 실패</span>`; }
            } else { recommendedKeywordsContainer.innerHTML = `<span class="no-recommendation">로그인하면<br>키워드를 추천해 드려요!</span>`; }
        }
    }

    // 5. 유틸리티 및 핸들러
    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        const hasContent = newsListContainer && !newsListContainer.querySelector('.empty-message');
        loadMoreBtn.style.display = (currentPage < totalPages && hasContent) ? 'block' : 'none';
    }
    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        searchInput.value = keyword;
        const activeCategoryButton = document.querySelector('.category-btn.active');
        loadInitialNews(keyword, activeCategoryButton ? activeCategoryButton.dataset.category : '');
    }
    async function openModalWithArticle(articleId, url) {
        if (!modal || !modalIframe) return;
        const existingContainer = modal.querySelector('.related-news-container');
        if (existingContainer) existingContainer.remove();
        modalIframe.src = 'about:blank';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        modalIframe.src = url;
        try {
            const data = await fetchAPI(`/news/${articleId}/related`);
            if (data.success && data.relatedNews.length > 0) {
                const container = document.createElement('div');
                container.className = 'related-news-container';
                container.innerHTML = `<h4>함께 볼만한 관련 뉴스</h4><ul>${data.relatedNews.map(news => `<li><a href="${news.originalUrl}" data-id="${news.id}"><div class="related-news-img"><img src="${news.imageUrl || ''}" onerror="this.style.display='none'"></div><div class="related-news-info"><h5>${news.title}</h5><span>${news.sourceName}</span></div></a></li>`).join('')}</ul>`;
                modal.querySelector('.modal-content').appendChild(container);
                container.querySelectorAll('a').forEach(link => link.addEventListener('click', e => { e.preventDefault(); openModalWithArticle(e.currentTarget.dataset.id, e.currentTarget.href); }));
            }
        } catch (error) { console.error('관련 뉴스 로드 실패:', error); }
    }
    function closeModal() {
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // 6. 초기화 및 이벤트 리스너
    function initialize() {
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        const initialActiveCategory = document.querySelector('.category-btn.active');
        loadInitialNews('', initialActiveCategory ? initialActiveCategory.dataset.category : '');
        loadInsightData();
    }
    categoryButtons.forEach(button => button.addEventListener('click', () => { if (!isLoading) { categoryButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); loadInitialNews(searchInput.value.trim(), button.dataset.category); }}));
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') { const activeBtn = document.querySelector('.category-btn.active'); loadInitialNews(e.target.value.trim(), activeBtn ? activeBtn.dataset.category : ''); }});
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreNews);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'block') closeModal(); });
    window.addEventListener('pageshow', e => { if (e.persisted || localStorage.getItem('interestsUpdated') === 'true') { if (typeof updateHeaderUI === 'function') updateHeaderUI(); loadInsightData(); localStorage.removeItem('interestsUpdated'); }});
    initialize();
});