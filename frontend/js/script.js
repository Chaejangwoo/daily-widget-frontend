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
            imageContainer.style.backgroundColor = '#e9ecef';
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
            if (isCardExpanded) {
                toggleSummaryBtn.style.display = 'inline';
            } else {
                const titleEl = article.querySelector('h2');
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

    function checkAndShowToggleBtn(summaryElement, toggleButton, numLinesAllowedByCss) {
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
                lineHeight = parseFloat(computedStyle.fontSize) * 1.4;
            }
            const expectedVisibleHeight = lineHeight * numLinesAllowedByCss;
            const tolerance = 2;

            if (actualFullHeight > expectedVisibleHeight + tolerance) {
                toggleButton.style.display = 'inline';
            } else {
                toggleButton.style.display = 'none';
            }
        });
    }

    function displayNews(newsArray) {
        if (!newsListContainer) return;

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
                    checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                }
            });
        });
    }

    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        if (currentPage < totalPages && newsListContainer && newsListContainer.children.length > 0 && newsListContainer.children[0].tagName !== 'P') {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    async function loadInitialNews(searchTerm = '', category = '') {
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm.trim();
        currentCategory = category.trim();
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage = 1;
        if (newsListContainer) newsListContainer.innerHTML = '';

        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;

            if (currentSearchTerm) {
                apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            }
            if (currentCategory) {
                apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            }

            // --- 관심 키워드 파라미터 추가 로직 ---
            const isLoggedInUser = typeof isLoggedIn === 'function' && isLoggedIn();
             console.log('[TitleCheck] isLoggedInUser:', isLoggedInUser); // 로그 추가
            // 로그인 상태이고, 특정 검색어나 카테고리 필터가 없을 때만 관심사 파라미터 추가
            if (isLoggedInUser && !currentSearchTerm && !currentCategory) {
                const userInterestsString = localStorage.getItem('userInterests');
                console.log('[TitleCheck] userInterestsString from localStorage:', userInterestsString); // 로그 추가
                if (userInterestsString) {
                    try {
                        const userInterestsArray = JSON.parse(userInterestsString);
                        if (Array.isArray(userInterestsArray) && userInterestsArray.length > 0) {
                            apiUrl += `&user_interests=${encodeURIComponent(userInterestsArray.join(','))}`;
                            console.log("API 요청 시 사용자 관심사 전달:", userInterestsArray.join(','));
                        }
                    } catch (e) {
                        console.error("localStorage의 userInterests 파싱 오류:", e);
                    }
                }
            }
            console.log('[TitleCheck] Constructed apiUrl:', apiUrl); // apiUrl 최종본 로그 추가
            // --- 관심 키워드 파라미터 추가 로직 끝 ---


            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
            console.log('[TitleCheck] userInfo:', userInfo); // 로그 추가

            if (newsSectionTitleEl) {
                let titleText = '';
                const activeCategoryBtn = document.querySelector('.category-btn.active');
                const categoryDisplayText = activeCategoryBtn ? (activeCategoryBtn.dataset.category === '' ? '최신' : activeCategoryBtn.dataset.category) : '최신';
                // --- 조건 확인을 위한 로그 추가 ---
            console.log('[TitleCheck] Condition for 맞춤 뉴스:');
            console.log(`  isLoggedInUser: ${isLoggedInUser}`);
            console.log(`  userInfo && userInfo.username: ${!!(userInfo && userInfo.username)} (username: ${userInfo ? userInfo.username : 'N/A'})`);
            console.log(`  !currentCategory: ${!currentCategory} (currentCategory: "${currentCategory}")`);
            console.log(`  !currentSearchTerm: ${!currentSearchTerm} (currentSearchTerm: "${currentSearchTerm}")`);
            console.log(`  apiUrl.includes('user_interests'): ${apiUrl.includes('user_interests')}`);
            // --- 조건 확인 로그 끝 ---

                if (currentSearchTerm) {
                    titleText = `[${categoryDisplayText}] "${currentSearchTerm}" 검색 결과`;
                } else if (isLoggedInUser && userInfo && userInfo.username && !currentCategory && !currentSearchTerm && apiUrl.includes('user_interests')) {
                    // user_interests 파라미터가 실제로 추가되었을 때만 "맞춤 뉴스" 문구 표시
                    titleText = `${userInfo.username}님을 위한 맞춤 뉴스`;
                } else {
                    titleText = `[${categoryDisplayText}] 뉴스`;
                }
                newsSectionTitleEl.textContent = titleText;
                console.log("뉴스 섹션 제목 업데이트:", titleText); 

            }

            console.log('Requesting API URL (Initial):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('뉴스 로드 실패:', response.status, errorText);
                if(newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">뉴스를 불러오는 데 실패했습니다. (오류: ${response.status})</p>`;
                totalPages = 0;
                return;
            }
            const data = await response.json();

            displayNews(data.news || []);
            totalPages = data.totalPages || 1;

        } catch (error) {
            console.error('뉴스 로드 중 네트워크 또는 기타 오류:', error);
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
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) {
                apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            }
            if (currentCategory) {
                apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            }
            // "더 보기" 시에는 관심사 파라미터를 항상 포함할지, 아니면 초기 로드 조건과 동일하게 할지 결정 필요
            // 여기서는 초기 로드와 동일하게, 검색어나 카테고리 필터가 없을 때만 관심사 파라미터 포함 (선택적)
            const isLoggedInUser = typeof isLoggedIn === 'function' && isLoggedIn();
            if (isLoggedInUser && !currentSearchTerm && !currentCategory) {
                const userInterestsString = localStorage.getItem('userInterests');
                if (userInterestsString) {
                    try {
                        const userInterestsArray = JSON.parse(userInterestsString);
                        if (Array.isArray(userInterestsArray) && userInterestsArray.length > 0) {
                            apiUrl += `&user_interests=${encodeURIComponent(userInterestsArray.join(','))}`;
                        }
                    } catch (e) { console.error("localStorage의 userInterests 파싱 오류 (더보기):", e); }
                }
            }


            console.log('Requesting API URL (More):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('추가 뉴스 로드 실패:', response.status, errorText);
                currentPage--;
                return;
            }
            const data = await response.json();

            if (data.news && data.news.length > 0) {
                data.news.forEach(item => {
                    const newsElement = renderNewsItem(item);
                    if (newsListContainer) newsListContainer.appendChild(newsElement);
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
                            let allowedSummaryLines = titleLines > 2 ? 3 : 4;
                            if (titleLines > 2) summaryElementFromDOM.classList.add('summary-shorten');
                            else summaryElementFromDOM.classList.remove('summary-shorten');
                            
                            checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                        }
                    });
                });
                totalPages = data.totalPages;
            } else {
                console.log("더 이상 로드할 뉴스가 없습니다.");
            }

        } catch (error) {
            console.error('추가 뉴스 로드 중 네트워크 또는 기타 오류:', error);
            currentPage--;
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
            updateLoadMoreButtonVisibility();
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
        console.log("모달 열기 시도 URL:", url);
        modalIframe.src = '';
        setTimeout(() => {
            modalIframe.src = url;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }, 50);
    }

    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = 'none';
        modalIframe.src = '';
        document.body.style.overflow = '';
    }

    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (isLoading) return;
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const selectedCategory = button.dataset.category;
                console.log('카테고리 버튼 클릭됨. 선택된 카테고리:', selectedCategory);
                loadInitialNews(searchInput ? searchInput.value.trim() : '', selectedCategory);
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                const activeCategoryButton = document.querySelector('.category-btn.active');
                const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                console.log('검색창 Enter. 검색어:', event.target.value.trim(), '현재 카테고리:', categoryToSearch);
                loadInitialNews(event.target.value.trim(), categoryToSearch);
            }
        });
        searchInput.addEventListener('input', (event) => {
            if (event.target.value.trim() === '' && currentSearchTerm !== '') {
                const activeCategoryButton = document.querySelector('.category-btn.active');
                const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                console.log('검색창 비워짐. 현재 카테고리:', categoryToSearch, '로 재검색');
                loadInitialNews('', categoryToSearch);
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }

    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        window.addEventListener('keydown', (event) => {
            if (modal && event.key === 'Escape' && modal.style.display === 'block') {
                closeModal();
            }
        });
    }

    if (typeof updateHeaderUI === 'function') {
        updateHeaderUI();
    }

    const initialActiveCategoryButton = document.querySelector('.category-btn.active');
    currentCategory = initialActiveCategoryButton ? initialActiveCategoryButton.dataset.category : '';
    console.log('초기 실행. 카테고리:', currentCategory);
    loadInitialNews('', currentCategory);

});