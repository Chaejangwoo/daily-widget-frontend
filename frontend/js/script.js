// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    // --- 전역 변수 및 상수 ---
    const API_BASE_URL = 'http://localhost:5001/api'; // 백엔드 API 기본 URL
    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitleEl = document.getElementById('news-section-title');
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
                this.remove(); // 이미지 로드 실패 시 img 태그 제거
                const placeholder = document.createElement('span');
                placeholder.classList.add('placeholder-icon');
                placeholder.textContent = '🖼️';
                imageContainer.innerHTML = ''; // 기존 내용 제거 후 플레이스홀더 추가
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
                event.stopPropagation(); // 이벤트 버블링 방지
                categoryButtons.forEach(btn => {
                    if (btn.dataset.category === item.category) {
                        btn.click(); // 해당 카테고리 버튼 클릭 이벤트 트리거
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
        toggleSummaryBtn.style.display = 'none'; // 기본 숨김
        article.appendChild(toggleSummaryBtn);

        toggleSummaryBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCardExpanded = article.classList.toggle('expanded-card');
            toggleSummaryBtn.textContent = isCardExpanded ? '접기' : '더보기';
            toggleSummaryBtn.setAttribute('aria-expanded', isCardExpanded.toString());
            if (isCardExpanded) {
                toggleSummaryBtn.style.display = 'inline'; // 펼쳤을 때 보이도록
            } else {
                // 접었을 때 버튼 표시 여부는 checkAndShowToggleBtn에서 다시 결정
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
                if (keywordText) { // 키워드 텍스트가 유효한 경우에만
                    const keywordSpan = document.createElement('span');
                    keywordSpan.textContent = `#${keywordText}`;
                    keywordSpan.dataset.keyword = keywordText; // 검색을 위해 data 속성 추가
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
            event.preventDefault(); // 기본 동작(링크 이동) 방지
            event.stopPropagation();
            if (item.originalUrl && item.originalUrl !== "#") {
                openModalWithArticle(item.originalUrl); // iframe 모달로 열기
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
        // DOM 업데이트 후 실제 크기 측정을 위해 requestAnimationFrame 사용
        requestAnimationFrame(() => {
            // cloneNode로 실제 DOM에 영향을 주지 않고 전체 높이 계산
            const clonedSummary = summaryElement.cloneNode(true);
            clonedSummary.style.position = 'absolute'; // 화면 레이아웃에 영향 안 주도록
            clonedSummary.style.visibility = 'hidden'; // 보이지 않게
            clonedSummary.style.webkitLineClamp = 'unset'; // CSS line-clamp 해제
            clonedSummary.style.display = 'block'; // 높이 계산을 위해 block으로
            clonedSummary.style.overflow = 'visible';
            clonedSummary.style.height = 'auto';
            clonedSummary.style.width = summaryElement.offsetWidth + 'px'; // 부모 너비와 동일하게
            document.body.appendChild(clonedSummary); // DOM에 잠시 추가
            const actualFullHeight = clonedSummary.scrollHeight; // 전체 높이
            document.body.removeChild(clonedSummary); // 즉시 제거

            const computedStyle = window.getComputedStyle(summaryElement);
            let lineHeight = parseFloat(computedStyle.lineHeight);
            if (isNaN(lineHeight) || computedStyle.lineHeight === 'normal') {
                // 'normal'일 경우 대략적인 값 계산 (font-size * 1.2 ~ 1.5)
                lineHeight = parseFloat(computedStyle.fontSize) * 1.4;
            }
            const expectedVisibleHeight = lineHeight * numLinesAllowedByCss; // CSS에서 보여주는 높이
            const tolerance = 2; // 픽셀 오차 허용 범위

            if (actualFullHeight > expectedVisibleHeight + tolerance) {
                toggleButton.style.display = 'inline'; // 전체 내용이 더 길면 버튼 표시
            } else {
                toggleButton.style.display = 'none'; // 아니면 숨김
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

            // 각 뉴스 아이템이 DOM에 추가된 후 "더보기" 버튼 표시 여부 결정
            requestAnimationFrame(() => {
                const summaryElementFromDOM = newsElement.querySelector('.summary');
                const toggleSummaryBtnFromDOM = newsElement.querySelector('.toggle-summary-btn');
                const titleElementFromDOM = newsElement.querySelector('h2');

                if (summaryElementFromDOM && toggleSummaryBtnFromDOM && titleElementFromDOM) {
                    const titleStyle = window.getComputedStyle(titleElementFromDOM);
                    let titleLineHeight = parseFloat(titleStyle.lineHeight);
                    if (isNaN(titleLineHeight) || titleStyle.lineHeight === 'normal') {
                         titleLineHeight = parseFloat(titleStyle.fontSize) * 1.3; // 기본값 추정
                    }
                    const titleHeight = titleElementFromDOM.offsetHeight;
                    // 제목이 차지하는 줄 수 계산
                    const titleLines = titleLineHeight > 0 ? Math.round(titleHeight / titleLineHeight) : 0;

                    let allowedSummaryLines = 4; // 기본: 제목 1~2줄 시, 요약 4줄
                    if (titleLines > 2) { // 제목이 3줄 이상이면
                        summaryElementFromDOM.classList.add('summary-shorten'); // CSS에서 .summary-shorten은 3줄로 제한
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
        // 뉴스가 있고, 현재 페이지가 전체 페이지보다 작고, 뉴스 목록에 "뉴스가 없습니다" 메시지가 아닐 때
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
        currentCategory = category.trim(); // category도 trim() 추가
        if (loadMoreBtn) loadMoreBtn.textContent = '로딩 중...';
        currentPage = 1; // 초기 로드이므로 항상 1페이지부터
        if (newsListContainer) newsListContainer.innerHTML = ''; // 기존 뉴스 목록 비우기

        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) {
                apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            }
            if (currentCategory) { // 빈 문자열("")이 아닌 경우에만 카테고리 파라미터 추가
                apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            }

            // 헤더 UI 업데이트 (auth.js 함수 사용)
            if (typeof updateHeaderUI === 'function') {
                updateHeaderUI();
            }
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;

            // 뉴스 섹션 제목 업데이트
            if (newsSectionTitleEl) {
                let titleText = '';
                const activeCategoryBtn = document.querySelector('.category-btn.active');
                // dataset.category가 빈 문자열이면 "최신", 아니면 해당 카테고리명
                const categoryDisplayText = activeCategoryBtn ? (activeCategoryBtn.dataset.category === '' ? '최신' : activeCategoryBtn.dataset.category) : '최신';

                if (currentSearchTerm) {
                    titleText = `[${categoryDisplayText}] "${currentSearchTerm}" 검색 결과`;
                } else if (userInfo && userInfo.username && !currentCategory && !currentSearchTerm) { // 특정 카테고리나 검색어가 없을 때만
                    titleText = `${userInfo.username}님을 위한 맞춤 뉴스`; // TODO: 실제 맞춤 로직은 백엔드에 필요
                } else {
                    titleText = `[${categoryDisplayText}] 뉴스`;
                }
                newsSectionTitleEl.textContent = titleText;
            }

            console.log('Requesting API URL (Initial):', apiUrl); // API 요청 URL 로깅
            const response = await fetch(apiUrl);
            if (!response.ok) {
                // 오류 응답 처리
                const errorText = await response.text();
                console.error('뉴스 로드 실패:', response.status, errorText);
                if(newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">뉴스를 불러오는 데 실패했습니다. (오류: ${response.status})</p>`;
                totalPages = 0; // 오류 시 더보기 버튼 안 나오도록
                return; // 함수 종료
            }
            const data = await response.json();

            displayNews(data.news || []);
            totalPages = data.totalPages || 1; // 전체 페이지 수 업데이트

        } catch (error) {
            console.error('뉴스 로드 중 네트워크 또는 기타 오류:', error);
            if(newsListContainer) newsListContainer.innerHTML = `<p class="empty-message">뉴스 로드 중 오류가 발생했습니다. (${error.message})</p>`;
            totalPages = 0; // 오류 시 더보기 버튼 안 나오도록
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
        currentPage++; // 다음 페이지로
        try {
            let apiUrl = `${API_BASE_URL}/news?page=${currentPage}&limit=${itemsPerPage}&sortBy=publishedDate&sortOrder=DESC`;
            if (currentSearchTerm) {
                apiUrl += `&keyword=${encodeURIComponent(currentSearchTerm)}`;
            }
            if (currentCategory) { // 빈 문자열("")이 아닌 경우에만 카테고리 파라미터 추가
                apiUrl += `&category=${encodeURIComponent(currentCategory)}`;
            }

            console.log('Requesting API URL (More):', apiUrl); // API 요청 URL 로깅
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('추가 뉴스 로드 실패:', response.status, errorText);
                currentPage--; // 실패 시 페이지 번호 복원
                return;
            }
            const data = await response.json();

            if (data.news && data.news.length > 0) {
                // 기존 목록에 추가 (displayNews는 전체를 다시 그리므로 여기서는 직접 append)
                data.news.forEach(item => {
                    const newsElement = renderNewsItem(item);
                    if (newsListContainer) newsListContainer.appendChild(newsElement);
                    // 추가된 각 아이템에 대해서도 "더보기" 버튼 로직 실행
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
                totalPages = data.totalPages; // 전체 페이지 수 업데이트
            } else {
                // 가져온 뉴스가 없으면, 현재 페이지가 마지막 페이지임을 의미할 수 있으므로
                // currentPage를 복원하지 않고, updateLoadMoreButtonVisibility에서 버튼이 사라지도록 둠
                console.log("더 이상 로드할 뉴스가 없습니다.");
            }

        } catch (error) {
            console.error('추가 뉴스 로드 중 네트워크 또는 기타 오류:', error);
            currentPage--; // 오류 발생 시 페이지 번호 복원
        } finally {
            isLoading = false;
            if (loadMoreBtn) loadMoreBtn.textContent = '더 보기';
            updateLoadMoreButtonVisibility();
        }
    }

    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        searchInput.value = keyword; // 검색창에 키워드 설정
        // 현재 활성화된 카테고리 버튼의 data-category 값을 가져옴
        const activeCategoryButton = document.querySelector('.category-btn.active');
        const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
        loadInitialNews(keyword, categoryToSearch); // 설정된 키워드와 현재 카테고리로 검색
    }

    // --- 모달 관련 함수 ---
    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        console.log("모달 열기 시도 URL:", url);
        modalIframe.src = ''; // 이전 내용 초기화 (깜빡임 방지 및 이전 페이지 잔상 제거)
        // 약간의 딜레이 후 src 설정 (브라우저 렌더링 시간 확보)
        setTimeout(() => {
            modalIframe.src = url;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
        }, 50); // 50ms 정도의 짧은 딜레이
    }

    function closeModal() {
        if (!modal || !modalIframe) return;
        modal.style.display = 'none';
        modalIframe.src = ''; // 모달 닫을 때 iframe 내용 비우기 (리소스 해제 및 다음 로딩 시 깜빡임 방지)
        document.body.style.overflow = ''; // 배경 스크롤 복원
    }

    // --- 이벤트 리스너 등록 ---
    if (categoryButtons.length > 0) {
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (isLoading) return; // 로딩 중에는 카테고리 변경 방지
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const selectedCategory = button.dataset.category;
                console.log('카테고리 버튼 클릭됨. 선택된 카테고리:', selectedCategory); // 로그 추가
                // 검색창의 현재 값과 선택된 카테고리로 뉴스 로드
                loadInitialNews(searchInput ? searchInput.value.trim() : '', selectedCategory);
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                // 현재 활성화된 카테고리 버튼의 data-category 값을 가져옴
                const activeCategoryButton = document.querySelector('.category-btn.active');
                const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                console.log('검색창 Enter. 검색어:', event.target.value.trim(), '현재 카테고리:', categoryToSearch); // 로그 추가
                loadInitialNews(event.target.value.trim(), categoryToSearch);
            }
        });
        searchInput.addEventListener('input', (event) => {
            // 검색창이 비워졌을 때, 이전에 검색어가 있었다면 (currentSearchTerm이 비어있지 않았다면)
            // 현재 카테고리로 다시 로드 (검색어 없이)
            if (event.target.value.trim() === '' && currentSearchTerm !== '') {
                const activeCategoryButton = document.querySelector('.category-btn.active');
                const categoryToSearch = activeCategoryButton ? activeCategoryButton.dataset.category : '';
                console.log('검색창 비워짐. 현재 카테고리:', categoryToSearch, '로 재검색'); // 로그 추가
                loadInitialNews('', categoryToSearch);
            }
        });
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }

    // 모달 닫기 버튼 이벤트
    if (closeModalBtn && modal) { // modal 변수도 null 체크
        closeModalBtn.addEventListener('click', closeModal);
        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (event) => {
            if (event.target === modal) { // modal이 null이 아닐 때만 비교
                closeModal();
            }
        });
        // ESC 키로 모달 닫기
        window.addEventListener('keydown', (event) => {
            if (modal && event.key === 'Escape' && modal.style.display === 'block') { // modal이 null이 아닐 때만
                closeModal();
            }
        });
    }


    // --- 초기 실행 ---
    if (typeof updateHeaderUI === 'function') {
        updateHeaderUI(); // auth.js의 함수 호출
    }

    // HTML에서 기본 active된 카테고리 버튼 값으로 초기 로드
    const initialActiveCategoryButton = document.querySelector('.category-btn.active');
    currentCategory = initialActiveCategoryButton ? initialActiveCategoryButton.dataset.category : '';
    console.log('초기 실행. 카테고리:', currentCategory); // 로그 추가
    loadInitialNews('', currentCategory); // 페이지 로드 시 검색어 없이, 기본 선택된 카테고리로 뉴스 로드

});