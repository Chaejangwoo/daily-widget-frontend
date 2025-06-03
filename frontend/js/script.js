// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    // --- 전역 변수 및 상수 ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitle = document.querySelector('.news-area > h2');

    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    let currentPage = 1;
    const itemsPerPage = 9;
    let isLoading = false;
    let totalPages = 1;
    let currentSearchTerm = '';

    // --- 함수 정의 ---

    function renderNewsItem(item) {
        const article = document.createElement('article');
        article.classList.add('news-item');

        // --- 이미지 컨테이너 및 이미지 생성 ---
    const imageContainer = document.createElement('div');
    imageContainer.classList.add('news-image-container');

    if (item.imageUrl) {
        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = (item.title || '뉴스 이미지').substring(0, 50); // alt 텍스트
        img.onerror = function() { // 이미지 로드 실패 시 처리
            this.remove(); // 깨진 이미지 아이콘 제거
            const placeholder = document.createElement('span');
            placeholder.classList.add('placeholder-icon');
            placeholder.textContent = '🖼️'; // 간단한 아이콘 또는 텍스트
            imageContainer.innerHTML = ''; // 혹시 모를 다른 내용 제거
            imageContainer.appendChild(placeholder);
            imageContainer.style.backgroundColor = '#e9ecef'; // 플레이스홀더 배경색
        };
        imageContainer.appendChild(img);
    } else {
        // 기본 플레이스홀더
        const placeholder = document.createElement('span');
        placeholder.classList.add('placeholder-icon');
        placeholder.textContent = '🖼️';
        imageContainer.appendChild(placeholder);
    }
        article.appendChild(imageContainer);

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
        article.appendChild(toggleSummaryBtn); // article에 버튼 추가

        toggleSummaryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCardExpanded = article.classList.toggle('expanded-card');
            toggleSummaryBtn.textContent = isCardExpanded ? '접기' : '더보기';
            toggleSummaryBtn.setAttribute('aria-expanded', isCardExpanded.toString());

            if (isCardExpanded) {
                toggleSummaryBtn.style.display = 'inline';
            } else {

            }
        });

        const metaElement = document.createElement('div');
        metaElement.classList.add('meta');
        const publishedDate = item.publishedDate ? new Date(item.publishedDate).toLocaleDateString() : '날짜 미상';
        metaElement.innerHTML = `<span class="source">${item.sourceName || '출처 미상'}</span> | <span class="date">${publishedDate}</span>`;
        article.appendChild(metaElement);

        const keywordsContainer = document.createElement('div');
        keywordsContainer.classList.add('keywords');
        // 키워드 렌더링 로직 (주석 처리)
        article.appendChild(keywordsContainer);

        const linkElement = document.createElement('a');
        linkElement.href = item.originalUrl || "#";
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
     * 요약문이 잘렸는지 확인하고 "더보기" 버튼 표시 여부를 결정합니다. (setTimeout 적용 버전)
     * @param {HTMLElement} summaryElement - 요약문 p 요소
     * @param {HTMLElement} toggleButton - 더보기 버튼 요소
     * @param {number} numLinesAllowedByCss - CSS 또는 JS에 의해 이 요약문에 허용된 줄 수
     */
    function checkAndShowToggleBtn(summaryElement, toggleButton, numLinesAllowedByCss) {
        if (!summaryElement || !toggleButton) {
            console.warn('checkAndShowToggleBtn: summaryElement 또는 toggleButton이 없습니다.');
            return;
        }

        const originalStyles = {
            webkitLineClamp: summaryElement.style.webkitLineClamp,
            display: summaryElement.style.display,
            overflow: summaryElement.style.overflow,
        };

        summaryElement.style.webkitLineClamp = 'unset';
        summaryElement.style.display = 'block';
        summaryElement.style.overflow = 'visible';

        requestAnimationFrame(() => {
            setTimeout(() => { // <<--- setTimeout 추가
                const scrollHeight = summaryElement.scrollHeight;

                summaryElement.style.webkitLineClamp = originalStyles.webkitLineClamp || numLinesAllowedByCss.toString();
                summaryElement.style.display = originalStyles.display || '-webkit-box';
                summaryElement.style.overflow = originalStyles.overflow || 'hidden';

                const computedStyle = window.getComputedStyle(summaryElement);
                let lineHeight = parseFloat(computedStyle.lineHeight);
                if (isNaN(lineHeight) || computedStyle.lineHeight === 'normal') {
                    lineHeight = parseFloat(computedStyle.fontSize) * 1.4;
                }
                const expectedVisibleHeight = lineHeight * numLinesAllowedByCss;
                const tolerance = 2;

                console.groupCollapsed(`Check toggle for: ${summaryElement.textContent.substring(0, 20)}...`);
                console.log('numLinesAllowedByCss:', numLinesAllowedByCss);
                console.log('scrollHeight (unclamped, after setTimeout):', scrollHeight);
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
            }, 0); // 0ms 지연으로 다음 이벤트 루프 틱에서 실행
        });
    }

    function displayNews(newsArray) {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = '';

        if (!newsArray || newsArray.length === 0) {
            newsListContainer.innerHTML = `<p class="empty-message">${currentSearchTerm ? `"${currentSearchTerm}"에 대한 검색 결과가 없습니다.` : '표시할 뉴스가 없습니다.'}</p>`;
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
                        summaryElementFromDOM.classList.add('summary-shorten'); // CSS에서 -webkit-line-clamp: 3; 적용
                        allowedSummaryLines = 3;
                    } else {
                        summaryElementFromDOM.classList.remove('summary-shorten'); // CSS에서 -webkit-line-clamp: 4; 적용
                    }

                    // CSS 클래스에 의해 line-clamp가 결정되므로, JS에서 직접 스타일 설정은 제거하거나,
                    // CSS 클래스 대신 JS로 직접 line-clamp를 설정하고 싶다면 아래 주석 해제.
                    // 현재는 CSS 클래스(.summary, .summary-shorten)에 line-clamp가 정의되어 있다고 가정.
                    // summaryElementFromDOM.style.webkitLineClamp = allowedSummaryLines.toString();
                    // summaryElementFromDOM.style.display = '-webkit-box';
                    // summaryElementFromDOM.style.webkitBoxOrient = 'vertical';
                    // summaryElementFromDOM.style.overflow = 'hidden';

                    console.log(`Calling checkAndShowToggleBtn for: ${item.title.substring(0,20)}... (Allowed lines: ${allowedSummaryLines})`);
                    checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                } else {
                    console.error('하나 이상의 필수 요소를 찾지 못해 checkAndShowToggleBtn을 호출할 수 없습니다. (displayNews)');
                    console.log({ summaryElementFromDOM, toggleSummaryBtnFromDOM, titleElementFromDOM });
                }
            });
        });
    }

    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        if (currentPage < totalPages) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    async function loadInitialNews(searchTerm = '') {
        // ... (이전과 동일한 내용) ...
        if (isLoading) return;
        isLoading = true;
        currentSearchTerm = searchTerm;
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage = 1;
        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (searchTerm) apiUrl += `&keyword=${encodeURIComponent(searchTerm)}`;
            if (typeof updateHeaderUI === 'function') updateHeaderUI();
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
            if (newsSectionTitle) {
                if (searchTerm) newsSectionTitle.textContent = `"${searchTerm}" 검색 결과`;
                else if (typeof isLoggedIn === 'function' && isLoggedIn() && userInfo && userInfo.username) newsSectionTitle.textContent = `${userInfo.username}님을 위한 맞춤 뉴스`;
                else newsSectionTitle.textContent = "최신 뉴스";
            }
            console.log('Requesting API URL (Initial):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`뉴스 로드 실패: ${errorData.message || response.status}`);
            }
            const data = await response.json();
            displayNews(data.news || []);
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

    async function loadMoreNews() {
        // ... (이전과 동일한 내용, 단 displayNews 호출 시 로직은 위 displayNews 함수 따름) ...
        if (isLoading || currentPage >= totalPages) return;
        isLoading = true;
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage++;
        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            console.log('Requesting API URL (More):', apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('추가 뉴스 로드 실패');
            const data = await response.json();
            if (data.news && data.news.length > 0) {
                data.news.forEach(item => { // 기존 목록에 추가하는 방식이므로 displayNews 직접 호출 대신
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
                            
                            // CSS 클래스에 의해 line-clamp가 결정되므로, JS에서 직접 스타일 설정은 제거하거나,
                            // CSS 클래스 대신 JS로 직접 line-clamp를 설정하고 싶다면 아래 주석 해제.
                            // summaryElementFromDOM.style.webkitLineClamp = allowedSummaryLines.toString();
                            // summaryElementFromDOM.style.display = '-webkit-box';
                            // summaryElementFromDOM.style.webkitBoxOrient = 'vertical';
                            // summaryElementFromDOM.style.overflow = 'hidden';

                            console.log(`Calling checkAndShowToggleBtn for (more): ${item.title.substring(0,20)}... (Allowed lines: ${allowedSummaryLines})`);
                            checkAndShowToggleBtn(summaryElementFromDOM, toggleSummaryBtnFromDOM, allowedSummaryLines);
                        } else {
                             console.error('하나 이상의 필수 요소를 찾지 못해 checkAndShowToggleBtn을 호출할 수 없습니다. (loadMoreNews)');
                             console.log({ summaryElementFromDOM, toggleSummaryBtnFromDOM, titleElementFromDOM });
                        }
                    });
                });
                totalPages = data.totalPages;
            } else {
                currentPage--;
            }
            updateLoadMoreButtonVisibility();
        } catch (error) {
            console.error('추가 뉴스 로드 중 오류:', error);
            currentPage--;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
        }
    }

    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        console.log(`키워드 "${keyword}" 클릭됨!`);
        searchInput.value = keyword;
        loadInitialNews(keyword);
    }

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

    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = "none";
        modalIframe.src = "";
        document.body.style.overflow = 'auto';
    }

    // --- 이벤트 리스너 등록 및 초기 실행 ---
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                loadInitialNews(event.target.value.trim());
            }
        });
        searchInput.addEventListener('input', (event) => {
            if (event.target.value.trim() === '' && currentSearchTerm !== '') {
                loadInitialNews();
            }
        });
    }
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreNews);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (event.target == modal) closeModal(); });
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && modal.style.display === 'block') closeModal(); });

    if (typeof updateHeaderUI === 'function') updateHeaderUI();
    loadInitialNews();
});