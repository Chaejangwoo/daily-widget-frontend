// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    const API_BASE_URL = 'http://localhost:5001/api';
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitleEl = document.getElementById('news-section-title');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    let currentPage = 1;
    const itemsPerPage = 9;
    let isLoading = false;
    let totalPages = 1;
    let currentSearchTerm = '';
    let currentCategory = '';

    /**
     * 스켈레톤 UI를 생성하여 화면에 표시합니다.
     */
    function renderSkeletons() {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = '';
        for (let i = 0; i < itemsPerPage; i++) {
            const skeleton = `
                <div class="skeleton-card">
                    <div class="skeleton-item skeleton-image"></div>
                    <div class="skeleton-item skeleton-title"></div>
                    <div class="skeleton-item skeleton-text"></div>
                    <div class="skeleton-item skeleton-text"></div>
                    <div class="skeleton-item skeleton-text"></div>
                </div>
            `;
            newsListContainer.insertAdjacentHTML('beforeend', skeleton);
        }
    }
    
    // 기존 renderNewsItem 함수는 그대로 사용합니다. (CSS가 스타일을 처리하므로)
    function renderNewsItem(item) {
        // ... 기존 renderNewsItem 함수 내용 전체를 여기에 복사 ...
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
                placeholder.textContent = '📰'; // 아이콘 변경
                imageContainer.innerHTML = '';
                imageContainer.appendChild(placeholder);
                imageContainer.style.backgroundColor = 'var(--bg-tertiary-color)';
            };
            imageContainer.appendChild(img);
        } else {
            const placeholder = document.createElement('span');
            placeholder.classList.add('placeholder-icon');
            placeholder.textContent = '📰';
            imageContainer.appendChild(placeholder);
            imageContainer.style.backgroundColor = 'var(--bg-tertiary-color)';
        }
        article.appendChild(imageContainer);

        if (item.category && typeof item.category === 'string' && item.category.trim() !== '' && item.category.toLowerCase() !== '기타') {
            const categoryTag = document.createElement('span');
            categoryTag.classList.add('news-category-tag');
            categoryTag.textContent = item.category;
            categoryTag.addEventListener('click', (event) => {
                event.stopPropagation();
                categoryButtons.forEach(btn => {
                    if (btn.dataset.category === item.category) {
                        btn.click();
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
            // 펼쳐지거나 접힐 때, 토글 버튼 표시 여부를 다시 확인하여 자연스럽게 만듦
            if (!isCardExpanded) {
                const titleEl = article.querySelector('h2');
                if (summaryElement && titleEl) {
                    const titleLines = getElementLineCount(titleEl);
                    let allowedSummaryLines = titleLines > 2 ? 3 : 4;
                    checkAndShowToggleBtn(summaryElement, toggleSummaryBtn, allowedSummaryLines);
                }
            } else {
                 toggleSummaryBtn.style.display = 'inline';
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
        linkElement.textContent = '원문 보기 →'; // 아이콘 추가
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

    function getElementLineCount(element) {
        const style = window.getComputedStyle(element);
        let lineHeight = parseFloat(style.lineHeight);
        if (isNaN(lineHeight) || style.lineHeight === 'normal') {
            lineHeight = parseFloat(style.fontSize) * 1.4; // fallback
        }
        const height = element.offsetHeight;
        return lineHeight > 0 ? Math.round(height / lineHeight) : 0;
    }

    function checkAndShowToggleBtn(summaryElement, toggleButton, numLinesAllowedByCss) {
        // 기존 checkAndShowToggleBtn 함수 내용 전체를 여기에 복사
        if (!summaryElement || !toggleButton) {
            if (toggleButton) toggleButton.style.display = 'none';
            return;
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
                lineHeight = parseFloat(computedStyle.fontSize) * 1.5; // CSS와 일치
            }
            const expectedVisibleHeight = lineHeight * numLinesAllowedByCss;
            const tolerance = 2; // 약간의 오차 허용

            if (actualFullHeight > expectedVisibleHeight + tolerance) {
                toggleButton.style.display = 'inline';
            } else {
                toggleButton.style.display = 'none';
            }
        });
    }

    function displayNews(newsArray, isInitialLoad = false) {
        if (!newsListContainer) return;

        if (isInitialLoad) {
            newsListContainer.innerHTML = '';
        }

        if (!newsArray || newsArray.length === 0) {
            if (isInitialLoad) {
                newsListContainer.innerHTML = `<p class="empty-message">${currentSearchTerm ? `"${currentSearchTerm}"에 대한 검색 결과가 없습니다.` : (currentCategory ? `[${currentCategory}] 카테고리에 뉴스가 없습니다.` : '표시할 뉴스가 없습니다.')}</p>`;
            }
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const baseDelay = isInitialLoad ? 0 : newsListContainer.children.length;

        newsArray.forEach((item, index) => {
            const newsElement = renderNewsItem(item);
            
            // 애니메이션 딜레이 추가
            newsElement.style.animationDelay = `${(baseDelay + index) * 70}ms`;

            newsListContainer.appendChild(newsElement);

            // ... 기존 요약 더보기/접기 로직
            requestAnimationFrame(() => {
                const summaryElementFromDOM = newsElement.querySelector('.summary');
                const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                const titleElementFromDOM = newsElement.querySelector('h2');
                
                if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                    const titleLines = getElementLineCount(titleElementFromDOM);
                    let allowedSummaryLines = 4;
                    if (titleLines > 2) {
                        summaryElementFromDOM.classList.add('summary-shorten');
                        allowedSummaryLines = 3;
                    } else {
                        summaryElementFromDOM.classList.remove('summary-shorten');
                    }
                    checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                }
            });
        });
    }

    async function loadInitialNews(searchTerm = '', category = '') {
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm.trim();
        currentCategory = category.trim();
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage = 1;
        
        renderSkeletons(); // <<<<<<<<<<< 스켈레톤 UI 표시

        try {
            // ... 기존 API 호출 로직은 그대로 ...
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;

            if (currentSearchTerm) apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            if (currentCategory) apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            
            const isLoggedInUser = typeof isLoggedIn === 'function' && isLoggedIn();
            if (isLoggedInUser && !currentSearchTerm && !currentCategory) {
                const userInterestsString = localStorage.getItem('userInterests');
                if (userInterestsString) {
                    const userInterestsArray = JSON.parse(userInterestsString);
                    if (Array.isArray(userInterestsArray) && userInterestsArray.length > 0) {
                        apiUrl += `&user_interests=${encodeURIComponent(userInterestsArray.join(','))}`;
                    }
                }
            }
            // ... 제목 업데이트 로직은 그대로 ...
            if (newsSectionTitleEl) {
                let titleText = '';
                const activeCategoryBtn = document.querySelector('.category-btn.active');
                const categoryDisplayText = activeCategoryBtn ? (activeCategoryBtn.dataset.category === '' ? '최신' : activeCategoryBtn.dataset.category) : '최신';
                
                const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
                if (currentSearchTerm) {
                    titleText = `"${currentSearchTerm}" 검색 결과`;
                } else if (isLoggedInUser && userInfo && userInfo.username && !currentCategory && !currentSearchTerm && apiUrl.includes('user_interests')) {
                    titleText = `${userInfo.username}님을 위한 맞춤 뉴스`;
                } else {
                    titleText = `${categoryDisplayText} 뉴스`;
                }
                newsSectionTitleEl.textContent = titleText;
            }

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // 스켈레톤을 실제 데이터로 교체
            displayNews(data.news || [], true);
            totalPages = data.totalPages || 1;

        } catch (error) {
            console.error('뉴스 로드 중 오류:', error);
            if(newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">뉴스 로드 중 오류가 발생했습니다. (${error.message})</p>`;
            totalPages = 0;
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
            updateLoadMoreButtonVisibility();
        }
    }

    async function loadMoreNews() {
        if (isLoading || currentPage >= totalPages) return;
        isLoading = true;
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage++;
        try {
            // ... 기존 loadMoreNews의 API 호출 로직은 그대로 ...
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            if (currentCategory) apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            
            const isLoggedInUser = typeof isLoggedIn === 'function' && isLoggedIn();
            if (isLoggedInUser && !currentSearchTerm && !currentCategory) {
                const userInterestsString = localStorage.getItem('userInterests');
                if (userInterestsString) {
                     const userInterestsArray = JSON.parse(userInterestsString);
                    if (Array.isArray(userInterestsArray) && userInterestsArray.length > 0) {
                        apiUrl += `&user_interests=${encodeURIComponent(userInterestsArray.join(','))}`;
                    }
                }
            }
            
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.news && data.news.length > 0) {
                displayNews(data.news, false); // isInitialLoad = false
                totalPages = data.totalPages;
            } else {
                 console.log("더 이상 로드할 뉴스가 없습니다.");
            }

        } catch (error) {
            console.error('추가 뉴스 로드 중 오류:', error);
            currentPage--;
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
            updateLoadMoreButtonVisibility();
        }
    }
    
    // 이 아래의 나머지 함수들(updateLoadMoreButtonVisibility, handleKeywordClick, open/close Modal 등)은
    // 기존 코드 그대로 사용하면 됩니다. 
    
    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        if (currentPage < totalPages && newsListContainer && newsListContainer.children.length > 0 && !newsListContainer.querySelector('.empty-message')) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
    
    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        searchInput.value = keyword;
        const activeCategoryButton = document.querySelector('.category-btn.active');
        const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
        loadInitialNews(keyword, categoryToSearch);
    }

    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        modalIframe.src = 'about:blank'; // 깜빡임 방지
        setTimeout(() => {
            modalIframe.src = url;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }, 50);
    }

    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = 'none';
        modalIframe.src = 'about:blank';
        document.body.style.overflow = '';
    }

    // 이벤트 리스너들은 기존 코드를 그대로 유지합니다.
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (isLoading) return;
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const selectedCategory = button.dataset.category;
                loadInitialNews(searchInput ? searchInput.value.trim() : '', selectedCategory);
            });
        });
    }
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (event) => {
             clearTimeout(debounceTimer);
             debounceTimer = setTimeout(() => {
                const searchTerm = event.target.value.trim();
                 if (searchTerm === '' && currentSearchTerm !== '') {
                     const activeCategoryButton = document.querySelector('.category-btn.active');
                     const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                     loadInitialNews('', categoryToSearch);
                 }
             }, 300);
        });
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const activeCategoryButton = document.querySelector('.category-btn.active');
                const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                loadInitialNews(event.target.value.trim(), categoryToSearch);
            }
        });
    }
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
        window.addEventListener('keydown', (event) => {
            if (modal && event.key === 'Escape' && modal.style.display === 'block') closeModal();
        });
    }

    // 초기화 로직
    if (typeof updateHeaderUI === 'function') {
        updateHeaderUI();
    }
    const initialActiveCategoryButton = document.querySelector('.category-btn.active');
    currentCategory = initialActiveCategoryButton ? initialActiveCategoryButton.dataset.category : '';
    loadInitialNews('', currentCategory);
});