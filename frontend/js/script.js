// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    // --- 전역 변수 및 상수 ---
    const API_BASE_URL = 'http://localhost:5001/api'; // 백엔드 API 기본 URL
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitle = document.querySelector('.news-area > h2');

    // Modal 관련 요소
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    let currentPage = 1;
    const itemsPerPage = 9;
    let isLoading = false;
    let totalPages = 1;
    let currentSearchTerm = '';

    // --- 함수 정의 ---

    /**
     * 뉴스 아이템 HTML 요소를 생성합니다.
     * @param {object} item - 뉴스 데이터 객체
     * @returns {HTMLElement} 생성된 article 요소
     */
    function renderNewsItem(item) {
        const article = document.createElement('article');
        article.classList.add('news-item');

        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title || '제목 없음';
        article.appendChild(titleElement);

        const summaryWrapper = document.createElement('div');
        summaryWrapper.classList.add('summary-wrapper');

        const summaryElement = document.createElement('p');
        summaryElement.classList.add('summary');
        summaryElement.textContent = item.content || '';
        summaryWrapper.appendChild(summaryElement);
        article.appendChild(summaryWrapper);

        const toggleSummaryBtn = document.createElement('button');
        toggleSummaryBtn.classList.add('toggle-summary-btn');
        toggleSummaryBtn.textContent = '더보기';
        toggleSummaryBtn.setAttribute('aria-expanded', 'false');
        toggleSummaryBtn.style.display = 'none'; // 초기에는 숨김
        article.appendChild(toggleSummaryBtn);

        toggleSummaryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCardExpanded = article.classList.toggle('expanded-card');
            toggleSummaryBtn.textContent = isCardExpanded ? '접기' : '더보기';
            toggleSummaryBtn.setAttribute('aria-expanded', isCardExpanded.toString());
            if (isCardExpanded) {
                toggleSummaryBtn.style.display = 'inline';
            } else {
                // 접었을 때 다시 잘림 여부 체크 (선택적)
                // checkAndShowToggleBtn(summaryElement, toggleSummaryBtn, numLinesAllowed);
            }
        });

        const metaElement = document.createElement('div');
        metaElement.classList.add('meta');
        const publishedDate = item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : '날짜 미상';
        metaElement.innerHTML = `<span class="source">${item.sourceName || '출처 미상'}</span> | <span class="date">${publishedDate}</span>`;
        article.appendChild(metaElement);

        const keywordsContainer = document.createElement('div');
        keywordsContainer.classList.add('keywords');
        // 백엔드 API 응답에 keywords가 포함되어 있다면 아래 로직 사용
        // 현재 API에서 keywords를 제공하지 않으므로, 이 부분은 주석 처리하거나 다른 방식 사용
        //if (item.keywords && Array.isArray(item.keywords)) {
        //    item.keywords.forEach(keyword => {
        //        const keywordSpan = document.createElement('span');
        //        keywordSpan.textContent = `#${keyword}`;
        //        keywordSpan.dataset.keyword = keyword;
        //        keywordSpan.addEventListener('click', (event) => {
        //            event.stopPropagation();
        //            handleKeywordClick(keyword);
        //        });
        //        keywordsContainer.appendChild(keywordSpan);
        //    });
        //}
        article.appendChild(keywordsContainer);

        const linkElement = document.createElement('a');
        linkElement.href = item.originalUrl || "#"; // originalUrl이 없다면 #으로 처리
        linkElement.classList.add('original-link');
        linkElement.textContent = '원문 보기';
        linkElement.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (item.originalUrl) {
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
     * @param {HTMLElement} summaryElement - 요약문 p 요소
     * @param {HTMLElement} toggleButton - 더보기 버튼 요소
     * @param {number} numLinesAllowedByCss - CSS에서 설정된 요약문의 최대 줄 수
     */
    function checkAndShowToggleBtn(summaryElement, toggleButton, numLinesAllowedByCss) {
        if (!summaryElement || !toggleButton) return;

        // --- 기존 스타일 저장 ---
        const originalStyles = {
            webkitLineClamp: summaryElement.style.webkitLineClamp,
            display: summaryElement.style.display,
            overflow: summaryElement.style.overflow,
        };

        // --- 임시로 line-clamp 해제하여 실제 scrollHeight 측정 ---
        summaryElement.style.webkitLineClamp = 'unset';
        summaryElement.style.display = 'block';
        summaryElement.style.overflow = 'visible';

        requestAnimationFrame(() => {
            const scrollHeight = summaryElement.scrollHeight;

            // --- 원래 스타일로 복원 ---
            summaryElement.style.webkitLineClamp = originalStyles.webkitLineClamp || numLinesAllowedByCss.toString();
            summaryElement.style.display = originalStyles.display || '-webkit-box';
            summaryElement.style.overflow = originalStyles.overflow || 'hidden';

            // --- 높이 비교 로직 ---
            const computedStyle = window.getComputedStyle(summaryElement);
            let lineHeight = parseFloat(computedStyle.lineHeight);
            if (isNaN(lineHeight)) { // lineHeight가 'normal'인 경우 처리
                lineHeight = parseFloat(computedStyle.fontSize) * 1.4;
            }
            const expectedVisibleHeight = lineHeight * numLinesAllowedByCss;
            const tolerance = 2;

            // --- 디버깅 로그 ---
            console.groupCollapsed(`Check toggle for: ${summaryElement.textContent.substring(0, 20)}...`);
            console.log('numLinesAllowedByCss:', numLinesAllowedByCss);
            console.log('scrollHeight (unclamped):', scrollHeight);
            console.log('lineHeight (calculated):', lineHeight);
            console.log('expectedVisibleHeight (for clamped lines):', expectedVisibleHeight);
            const condition = scrollHeight > expectedVisibleHeight + tolerance;
            console.log('Condition (scrollHeight > expectedVisibleHeight + tolerance):', condition);
            console.groupEnd();

            if (condition) {
                toggleButton.style.display = 'inline';
            } else {
                toggleButton.style.display = 'none';
            }
        });
    }


    /**
     * 뉴스 목록을 화면에 표시합니다. (기존 목록을 대체)
     * @param {Array} newsArray - 표시할 뉴스 데이터 배열
     */
    function displayNews(newsArray) {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = ''; // 기존 목록 비우기

        if (!newsArray || newsArray.length === 0) {
            newsListContainer.innerHTML = `<p class="empty-message">${currentSearchTerm ? `"${currentSearchTerm}"에 대한 검색 결과가 없습니다.` : '표시할 뉴스가 없습니다.'}</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        newsArray.forEach(item => {
            const newsElement = renderNewsItem(item);
            newsListContainer.appendChild(newsElement);

            // DOM에 추가된 후 "더보기" 버튼 표시 여부 결정
            requestAnimationFrame(() => {
                const summaryElementFromDOM = newsElement.querySelector('.summary');
                const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                const titleElementFromDOM = newsElement.querySelector('h2');

                if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                    // 제목 줄 수에 따라 요약문 줄 수 동적 결정
                    const titleStyle = window.getComputedStyle(titleElementFromDOM);
                    const titleLineHeight = parseFloat(titleStyle.lineHeight) || (parseFloat(titleStyle.fontSize) * 1.3);
                    const titleHeight = titleElementFromDOM.offsetHeight;
                    const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;

                    let allowedSummaryLines = 4; // 기본 4줄
                    if (titleLines > 2) {
                        summaryElementFromDOM.classList.add('summary-shorten');
                        allowedSummaryLines = 3; // 제목 길면 3줄
                    } else {
                        summaryElementFromDOM.classList.remove('summary-shorten');
                    }

                    // checkAndShowToggleBtn 함수 호출 전에 summaryElement에 line-clamp 스타일 적용
                    summaryElementFromDOM.style.webkitLineClamp = allowedSummaryLines.toString();
                    summaryElementFromDOM.style.display = '-webkit-box';
                    summaryElementFromDOM.style.webkitBoxOrient = 'vertical';
                    summaryElementFromDOM.style.overflow = 'hidden';
                    console.log('Calling checkAndShowToggleBtn for:', summaryElementFromDOM.textContent.substring(0,20)); // <<-- 이 로그가 뜨는지 확인!

                    checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                } else {
            // --- 만약 이 else 블록이 실행된다면, 필요한 DOM 요소를 찾지 못한 것 ---
            console.error('하나 이상의 필수 요소를 찾지 못해 checkAndShowToggleBtn을 호출할 수 없습니다.');
            console.log('summaryElementFromDOM:', summaryElementFromDOM);
            console.log('toggleSummaryBtnFromDOM:', toggleSummaryBtnFromDOM);
            console.log('titleElementFromDOM:', titleElementFromDOM);
        }
            });
        });
    }

    /**
     * "더 보기" 버튼 표시 여부를 업데이트합니다.
     */
    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        if (currentPage < totalPages) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    /**
     * 초기 뉴스 목록을 로드하거나 검색을 수행합니다.
     * @param {string} searchTerm - 검색어 (선택 사항)
     */
    async function loadInitialNews(searchTerm = '') {
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm;
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';

        currentPage = 1;

        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (searchTerm) {
                apiUrl += `&keyword=${encodeURIComponent(searchTerm)}`;
            }
            // TODO: 개인화 API 연동 (미구현)

            // 헤더 및 뉴스 섹션 제목 업데이트
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
            if (newsSectionTitle) {
                if (searchTerm) {
                    newsSectionTitle.textContent = `"${searchTerm}" 검색 결과`;
                } else if (typeof isLoggedIn === 'function' && isLoggedIn() && userInfo && userInfo.username) {
                    newsSectionTitle.textContent = `${userInfo.username}님을 위한 맞춤 뉴스`; // 임시 제목
                } else {
                    newsSectionTitle.textContent = "최신 뉴스"; // 비로그인 시
                }
            }

            console.log('Requesting API URL (Initial):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`뉴스 로드 실패: ${errorData.message || response.status}`);
            }
            const data = await response.json();

            displayNews(data.news || []); // undefined일 경우 빈 배열 전달
            totalPages = data.totalPages || 1;
            updateLoadMoreButtonVisibility();

        } catch (error) {
            console.error('초기 뉴스 로드 중 오류:', error);
            if (newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">뉴스를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
        }
    }

    /**
     * 추가 뉴스 목록을 로드합니다 ("더 보기" 기능).
     */
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
            // TODO: 개인화 관련 파라미터 추가 (필요시)

            console.log('Requesting API URL (More):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error('추가 뉴스 로드 실패');
            }
            const data = await response.json();

            if (data.news && data.news.length > 0) {
                data.news.forEach(item => {
                    const newsElement = renderNewsItem(item);
                    if (newsListContainer) newsListContainer.appendChild(newsElement);

                    // 추가된 뉴스 아이템에 대해서도 "더보기" 버튼 로직 실행
                    requestAnimationFrame(() => {
                        const summaryElementFromDOM = newsElement.querySelector('.summary');
                        const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                        const titleElementFromDOM = newsElement.querySelector('h2');
                        if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                             // 제목 줄 수에 따라 요약문 클래스 적용
                            const titleStyle = window.getComputedStyle(titleElementFromDOM);
                            const titleLineHeight = parseFloat(titleStyle.lineHeight) || (parseFloat(titleStyle.fontSize) * 1.3);
                            const titleHeight = titleElementFromDOM.offsetHeight;
                            const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;
                            if (titleLines > 2) summaryElementFromDOM.classList.add('summary-shorten');
                            else summaryElementFromDOM.classList.remove('summary-shorten');

                            // checkAndShowToggleBtn 호출 전에 summaryElement에 line-clamp 스타일 적용
                            summaryElementFromDOM.style.webkitLineClamp = allowedSummaryLines.toString();
                            summaryElementFromDOM.style.display = '-webkit-box';
                            summaryElementFromDOM.style.webkitBoxOrient = 'vertical';
                            summaryElementFromDOM.style.overflow = 'hidden';
                            checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                        }
                    });
                });
                totalPages = data.totalPages;
            } else {
                currentPage--; // 가져온 뉴스가 없으면 페이지 번호 원복
            }
            updateLoadMoreButtonVisibility();

        } catch (error) {
            console.error('추가 뉴스 로드 중 오류:', error);
            currentPage--;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none'; // 오류 시 더보기 버튼 숨김
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
        }
    }

    /**
     * 키워드 클릭 시 해당 키워드로 뉴스를 필터링합니다.
     * @param {string} keyword - 클릭된 키워드
     */
    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        console.log(`키워드 "${keyword}" 클릭됨!`);
        searchInput.value = keyword;
        loadInitialNews(keyword); // 해당 키워드로 검색
    }

    /**
     * 모달 창을 열어 뉴스 원문을 표시합니다.
     * @param {string} url - 뉴스 원문 URL
     */
    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        if (!url || url === "#") {
            console.error("유효한 기사 URL이 없습니다.");
            alert("기사 원문 주소를 찾을 수 없습니다.");
            return;
        }
        modalIframe.src = url;
        modal.style.display = "block";
        document.body.style.overflow = 'hidden';
    }

    /**
     * 모달 창을 닫습니다.
     */
    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = "none";
        modalIframe.src = "";
        document.body.style.overflow = 'auto';
    }

    // --- 초기 실행 ---
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                loadInitialNews(event.target.value.trim());
            }
        });
        searchInput.addEventListener('input', (event) => {
            if (event.target.value.trim() === '' && currentSearchTerm !== '') {
                loadInitialNews(); // 검색어 없으면 전체 목록
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && modal.style.display === 'block') {
            closeModal();
        }
    });

    if (typeof updateHeaderUI === 'function') {
        updateHeaderUI();
    }
    loadInitialNews(); // 페이지 로드 시 초기 뉴스 목록 가져오기
});