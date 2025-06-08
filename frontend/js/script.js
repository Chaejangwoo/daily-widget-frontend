// frontend/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 메인 페이지 스크립트 시작!');

    // --- 1. DOM 요소 캐싱 ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitleEl = document.getElementById('news-section-title');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const popularTopicsList = document.getElementById('popular-topics-list');
    const recommendedKeywords = document.getElementById('recommended-keywords');

    // --- 2. 상태 변수 ---
    let currentPage = 1;
    const itemsPerPage = 9;
    let isLoading = false;
    let totalPages = 1;
    let currentSearchTerm = '';
    let currentCategory = '';

    // --- 3. UI 렌더링 함수 ---

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

        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const bookmarkBtn = document.createElement('button');
            bookmarkBtn.className = 'bookmark-btn';
            bookmarkBtn.classList.toggle('bookmarked', item.isBookmarked);
            bookmarkBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
            bookmarkBtn.title = item.isBookmarked ? '북마크 취소' : '북마크하기';
            
            bookmarkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBookmark(item.id, bookmarkBtn);
            });
            imageContainer.appendChild(bookmarkBtn);
        }

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
                keywordSpan.addEventListener('click', (e) => { e.stopPropagation(); handleKeywordClick(keywordText); });
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
            if (isInitialLoad) {
                const message = currentSearchTerm ? `"${currentSearchTerm}"에 대한 검색 결과가 없습니다.` : (currentCategory ? `[${currentCategory}] 카테고리에 뉴스가 없습니다.` : '표시할 뉴스가 없습니다.');
                newsListContainer.innerHTML = `<p class="empty-message">${message}</p>`;
            }
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

    // --- 4. API 통신 및 로직 함수 ---

    async function fetchNewsAPI(params) {
        const url = new URL(`${API_BASE_URL}/news`);
        Object.entries(params).forEach(([key, value]) => { if (value) url.searchParams.append(key, value) });

        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            const interests = JSON.parse(localStorage.getItem('userInterests') || '[]').join(',');
            if (interests && !params.keyword && !params.category) {
                 url.searchParams.append('user_interests', interests);
            }
        }
        
        console.log('Requesting API:', url.toString());
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    }
    
    async function toggleBookmark(newsId, buttonElement) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('로그인이 필요합니다.');
            return;
        }

        const isCurrentlyBookmarked = buttonElement.classList.contains('bookmarked');
        buttonElement.classList.toggle('bookmarked', !isCurrentlyBookmarked);
        
        try {
            const response = await fetch(`${API_BASE_URL}/news/${newsId}/bookmark`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!data.success) {
                alert('오류가 발생했습니다.');
                buttonElement.classList.toggle('bookmarked', isCurrentlyBookmarked);
            }
        } catch (error) {
            console.error('북마크 토글 실패:', error);
            buttonElement.classList.toggle('bookmarked', isCurrentlyBookmarked);
        }
    }

    async function loadInitialNews(searchTerm = '', category = '') {
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm.trim();
        currentCategory = category;
        currentPage = 1;
        renderSkeletons();
        try {
            const data = await fetchNewsAPI({ page: currentPage, limit: itemsPerPage, keyword: currentSearchTerm, category: currentCategory });
            displayNews(data.news || [], true);
            totalPages = data.totalPages || 1;
        } catch (error) {
            console.error('뉴스 로드 오류:', error);
            if(newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">오류가 발생했습니다.</p>`;
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
            const data = await fetchNewsAPI({ page: currentPage, limit: itemsPerPage, keyword: currentSearchTerm, category: currentCategory });
            displayNews(data.news || [], false);
            totalPages = data.totalPages;
        } catch (error) {
            console.error('추가 뉴스 로드 오류:', error);
            currentPage--;
        } finally {
            isLoading = false;
            updateLoadMoreButtonVisibility();
        }
    }
    
    async function loadInsightData() {
        try {
            const popularTopics = ["#AI 반도체 전쟁", "#우주항공청", "#기후 변화", "#부동산 정책", "#저출산 대책"];
            const recommendedKws = ["#메타버스", "#전기차", "#웹3.0", "#ESG", "#양자컴퓨팅"];
            if (popularTopicsList) {
                popularTopicsList.innerHTML = popularTopics.map(topic => `<li><a href="#" data-keyword="${topic.replace('#', '')}">${topic}</a></li>`).join('');
                popularTopicsList.querySelectorAll('a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); handleKeywordClick(e.target.dataset.keyword); }));
            }
            if (recommendedKeywords) {
                recommendedKeywords.innerHTML = recommendedKws.map(kw => `<span data-keyword="${kw.replace('#', '')}">${kw}</span>`).join('');
                recommendedKeywords.querySelectorAll('span').forEach(span => span.addEventListener('click', e => handleKeywordClick(e.target.dataset.keyword)));
            }
        } catch (error) { console.error("인사이트 데이터 로드 실패:", error); }
    }

    // --- 5. 유틸리티 및 핸들러 ---
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
    
    // --- 6. 이벤트 리스너 ---
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (isLoading) return;
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadInitialNews(searchInput.value.trim(), button.dataset.category);
        });
    });

    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') {
            const activeBtn = document.querySelector('.category-btn.active');
            loadInitialNews(e.target.value.trim(), activeBtn ? activeBtn.dataset.category : '');
        }
    });

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreNews);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'block') closeModal(); });

    // --- 7. 초기화 ---
    function initialize() {
        if (typeof updateHeaderUI === 'function') updateHeaderUI();
        const initialActiveCategory = document.querySelector('.category-btn.active');
        loadInitialNews('', initialActiveCategory ? initialActiveCategory.dataset.category : '');
        loadInsightData();
    }

    initialize();
});