// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    // auth.js가 먼저 로드되어 isLoggedIn, getUserInfo 함수를 사용할 수 있다고 가정합니다.
    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitle = document.querySelector('.news-area > h2');

    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');

    const mockNewsData = [
        { id: 1, title: 'AI, 세상을 바꾸는 핵심 기술', summary: '인공지능(AI)은 이미 우리 생활 깊숙이 들어와 있으며, 앞으로 더 큰 변화를 가져올 것으로 예상됩니다. 이 기사에서는 AI 기술의 최신 동향과 미래 전망을 다룹니다. 특히 딥러닝, 자연어 처리, 컴퓨터 비전 등의 발전은 눈부시며, 다양한 산업에 혁신을 가져오고 있습니다. 하지만 윤리적 문제와 일자리 변화에 대한 고민도 함께 필요합니다. AI의 발전은 멈추지 않을 것이며, 우리는 이를 슬기롭게 활용해야 합니다.', source: '테크뉴스', date: '2024-07-26', keywords: ['AI', '미래기술', '혁신'], originalLink: './article1.html' },
        { id: 2, title: '여름철 건강 관리, 이렇게 하세요! 길고 더운 여름을 건강하게 보내는 비법 대공개', summary: '무더위가 계속되는 여름철, 건강 관리에 각별한 주의가 필요합니다. 전문가들이 조언하는 여름철 건강 수칙을 알아봅니다. 충분한 수분 섭취, 적절한 냉방, 자외선 차단, 위생적인 식생활, 그리고 규칙적인 생활과 충분한 휴식이 중요합니다. 특히 노약자는 더욱 신경 써야 하며, 야외 활동 시에는 모자와 선크림을 잊지 마세요. 건강한 여름나기를 위한 팁들을 자세히 소개합니다.', source: '헬스투데이', date: '2024-07-26', keywords: ['건강', '여름', '생활정보', '폭염'], originalLink: './article2.html' },
        { id: 3, title: '새로운 우주 탐사선 "오디세우스" 발사 성공, 화성 너머 미지의 세계로', summary: 'OO국에서 개발한 차세대 우주 탐사선 "오디세우스"가 성공적으로 발사되어 인류의 우주 탐사 역사에 새로운 장을 열었습니다. 이 탐사선은 화성 및 그 너머의 천체를 탐사할 예정이며, 생명체 존재 가능성 등 중요한 과학적 데이터를 수집할 것으로 기대됩니다. 수년간의 준비 끝에 발사된 오디세우스는 최첨단 장비를 탑재하고 있습니다.', source: '사이언스데일리', date: '2024-07-25', keywords: ['우주', '과학', '탐사', '오디세우스'], originalLink: './article_placeholder.html' },
        // ... (나머지 목업 데이터는 이전과 동일하게 유지하거나 필요에 따라 수정) ...
        { id: 4, title: '글로벌 경제, 불확실성 속 성장 전망', summary: '세계 경제는 여러 도전 과제에 직면해 있지만, 일부 지역에서는 회복세를 보이며 점진적인 성장이 예상됩니다. 인플레이션 압력, 공급망 문제, 지정학적 긴장 등이 주요 변수로 작용하고 있으며, 각국 중앙은행의 정책 대응이 주목됩니다.', source: '경제일보', date: '2024-07-25', keywords: ['경제', '글로벌', '전망'], originalLink: './article_placeholder.html' },
        { id: 5, title: '친환경 에너지로의 전환, 가속화되나', summary: '기후 변화 대응을 위한 전 세계적인 노력으로 친환경 에너지로의 전환이 더욱 중요해지고 있습니다. 태양광, 풍력 등 재생에너지 기술 발전과 함께 정부 정책 지원이 확대되면서 에너지 시장의 패러다임이 바뀌고 있습니다.', source: '환경뉴스', date: '2024-07-24', keywords: ['환경', '에너지', '기후변화', 'AI'], originalLink: './article_placeholder.html' },
        { id: 6, title: 'K-컬처, 세계를 매료시키다', summary: '한국의 드라마, 영화, 음악 등이 전 세계적으로 큰 인기를 얻으며 문화적 영향력을 확대하고 있습니다. OTT 플랫폼을 통한 콘텐츠 확산과 팬덤 문화의 성장이 이러한 현상을 더욱 가속화하고 있습니다.', source: '문화일보', date: '2024-07-23', keywords: ['한류', '문화', 'K컬처'], originalLink: './article_placeholder.html' }
        // ... 더 많은 목업 데이터
    ];

    let currentNews = [];
    let itemsToShow = 9;
    const itemsPerLoad = 9;
    let activeDataSource = [...mockNewsData];

    function getPersonalizedNewsData() {
        let personalizedData = [...mockNewsData];
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
            const userInterestsString = localStorage.getItem('userInterests');
            const userInterests = userInterestsString ? JSON.parse(userInterestsString) : [];

            if (newsSectionTitle && userInfo && userInfo.username) {
                newsSectionTitle.textContent = `${userInfo.username}님을 위한 맞춤 뉴스`;
            } else if (newsSectionTitle) {
                newsSectionTitle.textContent = "추천 뉴스";
            }

            if (userInterests.length > 0) {
                personalizedData.sort((a, b) => {
                    let scoreA = 0;
                    let scoreB = 0;
                    userInterests.forEach(interest => {
                        if (a.keywords.map(k => k.toLowerCase()).includes(interest.toLowerCase())) scoreA++;
                        if (b.keywords.map(k => k.toLowerCase()).includes(interest.toLowerCase())) scoreB++;
                        if (a.title.toLowerCase().includes(interest.toLowerCase())) scoreA += 0.5;
                        if (b.title.toLowerCase().includes(interest.toLowerCase())) scoreB += 0.5;
                    });
                    return scoreB - scoreA;
                });
            }
        } else {
            if (newsSectionTitle) newsSectionTitle.textContent = "오늘의 뉴스";
        }
        return personalizedData;
    }

function renderNewsItem(item) {
    const article = document.createElement('article');
    article.classList.add('news-item');

    const titleElement = document.createElement('h2');
    titleElement.textContent = item.title;
    article.appendChild(titleElement); // 먼저 DOM에 추가해야 높이 계산 가능

    // --- 제목 줄 수에 따른 요약문 줄 수 조절 로직 ---
    // titleElement가 DOM에 추가된 후, 잠시 기다렸다가 높이를 계산해야 정확할 수 있음
    // requestAnimationFrame을 사용하거나, 간단히는 바로 계산 시도
    const titleStyle = window.getComputedStyle(titleElement);
    const titleLineHeight = parseFloat(titleStyle.lineHeight);
    const titleHeight = titleElement.offsetHeight; // 또는 scrollHeight
    const titleLines = Math.round(titleHeight / titleLineHeight);

    const summaryWrapper = document.createElement('div');
    summaryWrapper.classList.add('summary-wrapper');

    const summaryElement = document.createElement('p');
    summaryElement.classList.add('summary');
    summaryElement.textContent = item.summary;

    if (titleLines > 2) { // 제목이 2줄을 초과하면 (즉, 3줄 이상이면)
        summaryElement.classList.add('summary-shorten'); // 요약문 줄이는 클래스 추가
    }
    // --- 로직 끝 ---

    summaryWrapper.appendChild(summaryElement);

    const toggleSummaryBtn = document.createElement('button');
    toggleSummaryBtn.classList.add('toggle-summary-btn');
    toggleSummaryBtn.textContent = '더보기';
    toggleSummaryBtn.setAttribute('aria-expanded', 'false');

    // 더보기 버튼 표시 여부 (이전과 동일하게 임시 로직 또는 항상 표시)
    if (item.summary.length < 150 && item.summary.split('\n').length < (titleLines > 2 ? 4 : 5) ) { // 기준 줄 수 동적 변경
        // toggleSummaryBtn.style.display = 'none';
    }

    toggleSummaryBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isCardExpanded = article.classList.toggle('expanded-card');
        toggleSummaryBtn.textContent = isCardExpanded ? '접기' : '더보기';
        toggleSummaryBtn.setAttribute('aria-expanded', isCardExpanded.toString());
    });

    // 나머지 요소들 생성 및 추가 (meta, keywords, originalLink)
    const metaElement = document.createElement('div');
    metaElement.classList.add('meta');
    metaElement.innerHTML = `<span class="source">${item.source}</span> | <span class="date">${item.date}</span>`;

    const keywordsContainer = document.createElement('div');
    keywordsContainer.classList.add('keywords');
    item.keywords.forEach(keyword => {
        const keywordSpan = document.createElement('span');
        keywordSpan.textContent = `#${keyword}`;
        keywordSpan.dataset.keyword = keyword;
        keywordSpan.addEventListener('click', (event) => {
            event.stopPropagation();
            handleKeywordClick(keyword);
        });
        keywordsContainer.appendChild(keywordSpan);
    });

    const linkElement = document.createElement('a');
    linkElement.href = "#";
    linkElement.classList.add('original-link');
    linkElement.textContent = '원문 보기';
    linkElement.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openModalWithArticle(item.originalLink);
    });

    // DOM 요소 추가 순서 유의
    // article.appendChild(titleElement); // 위에서 이미 추가됨
    article.appendChild(summaryWrapper);
    article.appendChild(toggleSummaryBtn);
    article.appendChild(metaElement);
    article.appendChild(keywordsContainer);
    article.appendChild(linkElement);

    return article;
}

    function displayNews(newsArray) {
        if (!newsListContainer) return;
        newsListContainer.innerHTML = '';
        newsArray.forEach(item => {
            const newsElement = renderNewsItem(item);
            newsListContainer.appendChild(newsElement);
        });
    }

    function updateLoadMoreButtonVisibility() {
        if (!loadMoreBtn) return;
        if (itemsToShow < activeDataSource.length) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    function loadInitialNews() {
        activeDataSource = getPersonalizedNewsData();
        itemsToShow = 9;
        currentNews = activeDataSource.slice(0, itemsToShow);
        displayNews(currentNews);
        updateLoadMoreButtonVisibility();
        displayPopularTopics(); // 인기 토픽 표시 함수 호출
    }

    function loadMoreNews() {
        itemsToShow += itemsPerLoad;
        currentNews = activeDataSource.slice(0, Math.min(itemsToShow, activeDataSource.length));
        displayNews(currentNews);
        updateLoadMoreButtonVisibility();
    }

    function handleKeywordClick(keyword) {
        if (!searchInput) return;
        console.log(`키워드 "${keyword}" 클릭됨!`);
        searchInput.value = keyword;
        filterNewsByKeyword(keyword);
    }

    function filterNewsByKeyword(searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        if (!lowerCaseSearchTerm) {
            loadInitialNews();
            return;
        }
        const baseDataToFilter = getPersonalizedNewsData(); // 개인화된 데이터 또는 전체 데이터를 기준으로 필터링 시작
        const filteredData = baseDataToFilter.filter(item =>
            item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.summary.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.keywords.some(k => k.toLowerCase().includes(lowerCaseSearchTerm))
        );
        activeDataSource = filteredData;
        itemsToShow = 9;
        currentNews = activeDataSource.slice(0, itemsToShow);
        displayNews(currentNews);
        updateLoadMoreButtonVisibility();
    }

    function displayPopularTopics() {
        const popularTopicsList = document.getElementById('topic-list');
        const popularTopicsSection = document.querySelector('.popular-topics');

        if (!popularTopicsList || !popularTopicsSection) {
            console.warn("Popular topics list or section not found.");
            return;
        }

        const keywordCounts = {};
        mockNewsData.forEach(news => {
            news.keywords.forEach(keyword => {
                const lowerKeyword = keyword.toLowerCase();
                keywordCounts[lowerKeyword] = (keywordCounts[lowerKeyword] || 0) + 1;
            });
        });

        const sortedKeywords = Object.entries(keywordCounts)
            .sort(([, countA], [, countB]) => countB - countA)
            .slice(0, 7)
            .map(([keyword]) => keyword);

        if (sortedKeywords.length === 0) {
            popularTopicsSection.style.display = 'none';
            return;
        }

        popularTopicsList.innerHTML = '';

        sortedKeywords.forEach(keyword => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = "#";
            link.textContent = `#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
            link.dataset.keyword = keyword;

            link.addEventListener('click', (event) => {
                event.preventDefault();
                const clickedKeyword = event.target.dataset.keyword;
                if (clickedKeyword) {
                    handleKeywordClick(clickedKeyword);
                }
            });

            listItem.appendChild(link);
            popularTopicsList.appendChild(listItem);
        });
        popularTopicsSection.style.display = 'block';
    }

    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        if (!url || url === "#" || url.endsWith('placeholder.html')) {
            console.error("유효한 기사 URL이 없습니다.");
            alert("기사 원문 주소를 찾을 수 없습니다. (테스트용 링크일 수 있습니다)");
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

    loadInitialNews();

    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                filterNewsByKeyword(event.target.value);
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
});