// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    // --- 전역 변수 및 상수 ---
    const API_BASE_URL = 'http://localhost:5001/api'; // 백엔드 API 기본 URL
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitleEl = document.getElementById('news-section-title'); // ID로 가져오도록 수정
    const categoryButtons = document.querySelectorAll('.category-btn'); // 카테고리 버튼들

    // Modal 관련 요소
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    let currentPage = 1;
    const itemsPerPage = 9; // 한 페이지에 보여줄 뉴스 개수
    let isLoading = false;  // API 요청 중복 방지 플래그
    let totalPages = 1;     // 전체 페이지 수 (API 응답으로 받음)
    let currentSearchTerm = ''; // 현재 검색어 저장
    let currentCategory = '';   // 현재 선택된 카테고리 저장

    // --- 함수 정의 ---

    /**
     * 뉴스 아이템 HTML 요소를 생성합니다.
     */
    function renderNewsItem(item) {
        const article = document.createElement('article');
        article.classList.add('news-item');

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('news-image-container');
        if (item.imageUrl) {
            const img = document.createElement('img');
            img.src = item.imageUrl;
            img.alt = (item.title || '뉴스 이미지').substring(0, 50);
            img.onerror = function() {
                this.remove();
                const placeholder = document.createElement('span');
                placeholder.classList.add('placeholder-icon');
                placeholder.textContent = '🖼️';
                imageContainer.innerHTML = '';
                imageContainer.appendChild(placeholder);
                imageContainer.style.backgroundColor = '#e9ecef';
            };
            imageContainer.appendChild(img);
        } else {
            const placeholder = document.createElement('span');
            placeholder.classList.add('placeholder-icon');
            placeholder.textContent = '🖼️';
            imageContainer.appendChild(placeholder);
            imageContainer.style.backgroundColor = '#e9ecef'; // 플레이스홀더 배경색 추가
        }
        article.appendChild(imageContainer);

        if (item.category && typeof item.category === 'string' && item.category.trim() !== '' && item.category.toLowerCase() !== '기타') {
            const categoryTag = document.createElement('span');
            categoryTag.classList.add('news-category-tag');
            categoryTag.textContent = item.category;
            // 카테고리 태그 클릭 시 해당 카테고리로 필터링 (선택적 기능)
            categoryTag.addEventListener('click', (event) => {
                event.stopPropagation();
                // categoryButtons 중 해당 카테고리 값과 일치하는 버튼을 찾아 active 시키고 로드
                categoryButtons.forEach(btn => {
                    if (btn.dataset.category === item.category) {
                        btn.click(); // 해당 버튼 클릭 이벤트 트리거
                    }
                });
            });
            article.appendChild(categoryTag);
        }

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title || '제목 없음';
        article.appendChild(titleElement);

        const summaryWrapper = document.createElement('div');
        summaryWrapper.classList.add('summary-wrapper');
        const summaryElement = document.createElement('p');
        summaryElement.classList.add('summary');
        summaryElement.textContent = item.summaryForDisplay || '요약 정보가 없습니다.';
        summaryWrapper.appendChild(summaryElement);
        article.appendChild(summaryWrapper);

        const toggleSummaryBtn = document.createElement('button');
        toggleSummaryBtn.classList.add('toggle-summary-btn');
        toggleSummaryBtn.textContent = '더보기';
        toggleSummaryBtn.setAttribute('aria-expanded', 'false');
        toggleSummaryBtn.style.display = 'none';
        article.appendChild(toggleSummaryBtn);

        toggleSummaryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCardExpanded = article.classList.toggle('expanded-card');
            toggleSummaryBtn.textContent = isCardExpanded ? '접기' : '더보기';
            toggleSummaryBtn.setAttribute('aria-expanded', isCardExpanded.toString());
            if (isCardExpanded) {
                toggleSummaryBtn.style.display = 'inline';
            } else {
                // 접었을 때 버튼 표시 여부는 checkAndShowToggleBtn에서 다시 결정
                const titleEl = article.querySelector('h2'); // 올바른 titleElement 참조
                if (summaryElement && titleEl) {
                    const titleStyle = window.getComputedStyle(titleEl);
                    const titleLineHeight = parseFloat(titleStyle.lineHeight) || (parseFloat(titleStyle.fontSize) * 1.3);
                    const titleHeight = titleEl.offsetHeight;
                    const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;
                    let allowedSummaryLines = titleLines > 2 ? 3 : 4;
                    checkAndShowToggleBtn(summaryElement, toggleSummaryBtn, allowedSummaryLines);
                }
            }
        });

        const metaElement = document.createElement('div');
        metaElement.classList.add('meta');
        const publishedDate = item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : '날짜 미상';
        metaElement.innerHTML = `<span class="source">${item.sourceName || '출처 미상'}</span> | <span class="date">${publishedDate}</span>`;
        article.appendChild(metaElement);

        const keywordsContainer = document.createElement('div');
        keywordsContainer.classList.add('keywords');
        if (item.keywordsForDisplay && Array.isArray(item.keywordsForDisplay) && item.keywordsForDisplay.length > 0) {
            item.keywordsForDisplay.forEach(keywordText => {
                if (keywordText) {
                    const keywordSpan = document.createElement('span');
                    keywordSpan.textContent = `#${keywordText}`;
                    keywordSpan.dataset.keyword = keywordText;
                    keywordSpan.addEventListener('click', (event) => {
                        event.stopPropagation();
                        handleKeywordClick(keywordText);
                    });
                    keywordsContainer.appendChild(keywordSpan);
                }
            });
        }
        article.appendChild(keywordsContainer);

        const linkElement = document.createElement('a');
        linkElement.href = item.originalUrl || "#";
        linkElement.classList.add('original-link');
        linkElement.textContent = '원문 보기';
        linkElement.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (item.originalUrl && item.originalUrl !== "#") {
                openModalWithArticle(item.originalUrl);
            } else {
                alert('기사 원문 주소를 찾을 수 없습니다.');
            }
        });
        article.appendChild(linkElement);

        return article;
    }

    /**
     * 요약문이 잘렸는지 확인하고 "더보기" 버튼 표시 여부를 결정합니다.
     */
    function checkAndShowToggleBtn(summaryElement, toggleButton, numLinesAllowedByCss) {
        if (!summaryElement || !toggleButton) {
            if (toggleButton) toggleButton.style.display = 'none'; return;
        }
        requestAnimationFrame(() => {
            const clonedSummary = summaryElement.cloneNode(true);
            clonedSummary.style.position = 'absolute';
            clonedSummary.style.visibility = 'hidden';
            clonedSummary.style.webkitLineClamp = 'unset';
            clonedSummary.style.display = 'block';
            clonedSummary.style.overflow = 'visible';
            clonedSummary.style.height = 'auto';
            clonedSummary.style.width = summaryElement.offsetWidth + 'px';
            document.body.appendChild(clonedSummary);
            const actualFullHeight = clonedSummary.scrollHeight;
            document.body.removeChild(clonedSummary);

            const computedStyle = window.getComputedStyle(summaryElement);
            let lineHeight = parseFloat(computedStyle.lineHeight);
            if (isNaN(lineHeight) || computedStyle.lineHeight === 'normal') {
                lineHeight = parseFloat(computedStyle.fontSize) * 1.4;
            }
            const expectedVisibleHeight = lineHeight * numLinesAllowedByCss;
            const tolerance = 2;

            console.groupCollapsed(`Check toggle for: ${summaryElement.textContent.substring(0, 20)}...`);
            // ... (로그) ...
            console.groupEnd();

            if (actualFullHeight > expectedVisibleHeight + tolerance) {
                toggleButton.style.display = 'inline';
            } else {
                toggleButton.style.display = 'none';
            }
        });
    }


    /**
     * 뉴스 목록을 화면에 표시합니다. (기존 목록을 대체)
     */
    function displayNews(newsArray) {
        //      내부에서 renderNewsItem 호출하고, 각 newsElement에 대해
        //      requestAnimationFrame 내에서 제목 줄 수 계산 후
        //      summaryElement에 summary-shorten 클래스 토글 및
        //      checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines); 호출) ...
        if (!newsListContainer) return;
        // newsListContainer.innerHTML = ''; // loadInitialNews에서 이미 처리

        if (!newsArray || newsArray.length === 0) {
            newsListContainer.innerHTML = `<p class="empty-message">${currentSearchTerm ? `"${currentSearchTerm}"에 대한 검색 결과가 없습니다.` : (currentCategory ? `[${currentCategory}] 카테고리에 뉴스가 없습니다.` : '표시할 뉴스가 없습니다.')}</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        newsArray.forEach(item => {
            const newsElement = renderNewsItem(item);
            newsListContainer.appendChild(newsElement);

            requestAnimationFrame(() => {
                const summaryElementFromDOM = newsElement.querySelector('.summary');
                const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                const titleElementFromDOM = newsElement.querySelector('h2');

                if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                    const titleStyle = window.getComputedStyle(titleElementFromDOM);
                    let titleLineHeight = parseFloat(titleStyle.lineHeight);
                    if (isNaN(titleLineHeight) || titleStyle.lineHeight === 'normal') {
                         titleLineHeight = parseFloat(titleStyle.fontSize) * 1.3;
                    }
                    const titleHeight = titleElementFromDOM.offsetHeight;
                    const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;

                    let allowedSummaryLines = 4;
                    if (titleLines > 2) {
                        summaryElementFromDOM.classList.add('summary-shorten');
                        allowedSummaryLines = 3;
                    } else {
                        summaryElementFromDOM.classList.remove('summary-shorten');
                    }
                    // CSS 클래스로 line-clamp가 제어되므로 JS에서 직접 설정은 불필요
                    console.log(`Calling checkAndShowToggleBtn for: ${item.title ? item.title.substring(0,20) : 'N/A'}... (Allowed lines: ${allowedSummaryLines})`);
                    checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                }
            });
        });
    }

    /**
     * "더 보기" 버튼 표시 여부를 업데이트합니다.
     */
    function updateLoadMoreButtonVisibility() {
        // ... (이전과 동일) ...
        if (!loadMoreBtn) return;
        if (currentPage < totalPages && newsListContainer.children.length > 0 && newsListContainer.children[0].tagName !== 'P') { // 뉴스가 있고, 마지막 페이지가 아닐때
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }


    /**
     * 초기 뉴스 목록을 로드하거나 검색/필터링을 수행합니다.
     */
    async function loadInitialNews(searchTerm = '', category = '') {
        //      newsListContainer.innerHTML = ''; 추가,
        //      뉴스 섹션 제목 업데이트 로직 개선) ...
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm.trim();
        currentCategory = category.trim();
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage = 1;
        if (newsListContainer) newsListContainer.innerHTML = ''; // 항상 비우고 시작

        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            if (currentCategory) apiUrl += `&category=${encodeURIComponent(currentCategory)}`;

            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;

            if (newsSectionTitleEl) {
                let titleParts = [];
                const activeCategoryBtn = document.querySelector('.category-btn.active');
                const categoryText = activeCategoryBtn ? (activeCategoryBtn.dataset.category === '' ? '최신' : activeCategoryBtn.dataset.category) : '최신';

                if (currentSearchTerm) {
                    titleParts.push(`[${categoryText}] "${currentSearchTerm}" 검색 결과`);
                } else if (userInfo && userInfo.username && !currentCategory && !currentSearchTerm) {
                    titleParts.push(`${userInfo.username}님을 위한 맞춤 뉴스`);
                } else {
                    titleParts.push(`[${categoryText}] 뉴스`);
                }
                newsSectionTitleEl.textContent = titleParts.join(' ');
            }

            console.log('Requesting API URL (Initial):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) { /* ... (에러 처리) ... */ throw new Error('뉴스 로드 실패');}
            const data = await response.json();

            displayNews(data.news || []);
            totalPages = data.totalPages || 1;
            updateLoadMoreButtonVisibility();

        } catch (error) { /* ... */ }
        finally { /* ... */ }
    }

    /**
     * 추가 뉴스 목록을 로드합니다 ("더 보기" 기능).
     */
    async function loadMoreNews() {
        //      API URL에 currentCategory 포함,
        //      뉴스 아이템 추가 후 각 아이템에 대해 requestAnimationFrame으로 checkAndShowToggleBtn 호출) ...
        if (isLoading || currentPage >= totalPages) return;
        isLoading = true;
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage++;
        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            if (currentCategory) apiUrl += `&category=${encodeURIComponent(currentCategory)}`;

            console.log('Requesting API URL (More):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('추가 뉴스 로드 실패');
            const data = await response.json();

            if (data.news && data.news.length > 0) {
                data.news.forEach(item => {
                    const newsElement = renderNewsItem(item);
                    if (newsListContainer) newsListContainer.appendChild(newsElement);
                    requestAnimationFrame(() => { // 추가된 각 아이템에 대해서도 버튼 로직 실행
                        const summaryElementFromDOM = newsElement.querySelector('.summary');
                        const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                        const titleElementFromDOM = newsElement.querySelector('h2');
                        if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                            const titleStyle = window.getComputedStyle(titleElementFromDOM);
                            let titleLineHeight = parseFloat(titleStyle.lineHeight);
                            if (isNaN(titleLineHeight) || titleStyle.lineHeight === 'normal') {
                                titleLineHeight = parseFloat(titleStyle.fontSize) * 1.3;
                            }
                            const titleHeight = titleElementFromDOM.offsetHeight;
                            const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;
                            let allowedSummaryLines = titleLines > 2 ? 3 : 4;
                            if (titleLines > 2) summaryElementFromDOM.classList.add('summary-shorten');
                            else summaryElementFromDOM.classList.remove('summary-shorten');
                            
                            console.log(`Calling checkAndShowToggleBtn for (more): ${item.title ? item.title.substring(0,20) : 'N/A'}... (Allowed lines: ${allowedSummaryLines})`);
                            checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                        }
                    });
                });
                totalPages = data.totalPages;
            } else {
                currentPage--;
            }
            updateLoadMoreButtonVisibility();
        } catch (error) { /* ... */ }
        finally { /* ... */ }
    }


    /**
     * 키워드 클릭 시 해당 키워드로 뉴스를 필터링합니다.
     */
    function handleKeywordClick(keyword) {
        // ... (이전과 동일) ...
        if (!searchInput) return;
        searchInput.value = keyword;
        loadInitialNews(keyword, currentCategory); // 현재 카테고리 유지하며 키워드 검색
    }

    // --- 모달 관련 함수 (이전과 동일) ---
    function openModalWithArticle(url) { /* ... */ }
    function closeModal() { /* ... */ }

    // --- 이벤트 리스너 등록 ---
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (isLoading) return;
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const selectedCategory = button.dataset.category;
                loadInitialNews(searchInput ? searchInput.value.trim() : '', selectedCategory); // 현재 검색어와 새 카테고리로 로드
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                loadInitialNews(event.target.value.trim(), currentCategory); // 현재 카테고리 유지하며 검색
            }
        });
        searchInput.addEventListener('input', (event) => { // 검색창 비우면
            if (event.target.value.trim() === '' && currentSearchTerm !== '') {
                loadInitialNews('', currentCategory); // 현재 카테고리는 유지
            }
        });
    }

    // ... (loadMoreBtn, closeModalBtn, window click/keydown 이벤트 리스너는 이전과 동일) ...
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreNews);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && modal.style.display === 'block') closeModal(); });


    // --- 초기 실행 ---
    if (typeof updateHeaderUI === 'function') {
        updateHeaderUI();
    }
    // HTML에서 기본 active된 카테고리 버튼 값으로 초기 로드
    const initialActiveCategoryButton = document.querySelector('.category-btn.active');
    currentCategory = initialActiveCategoryButton ? initialActiveCategoryButton.dataset.category : '';
    loadInitialNews('', currentCategory); // 페이지 로드 시 검색어 없이, 기본 선택된 카테고리로 로드

});