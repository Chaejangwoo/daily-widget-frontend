// frontend/js/script.js
document.addEventListener('DOMContentLoaded', () => {
    // auth.js가 먼저 로드되어 isLoggedIn, getUserInfo 함수를 사용할 수 있다고 가정합니다.
    // 만약 auth.js가 이 스크립트보다 늦게 로드된다면, 이 함수들을 직접 참조할 수 있도록 수정 필요.
    // (HTML에서 auth.js를 script.js보다 먼저 포함했으므로 괜찮을 것입니다.)

    console.log('Daily Widget 프론트엔드 스크립트(script.js) 시작!');

    const newsListContainer = document.getElementById('news-list-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const searchInput = document.getElementById('search-keyword');
    const newsSectionTitle = document.querySelector('.news-area > h2'); // "오늘의 뉴스" 제목 요소

    // Modal 관련 요소 (이전과 동일)
    const modal = document.getElementById('news-modal');
    const modalIframe = document.getElementById('modal-iframe');
    const closeModalBtn = document.querySelector('.close-modal-btn');


    const mockNewsData = [
        // ... (이전 목업 데이터 그대로 사용) ...
        { id: 1, title: 'AI, 세상을 바꾸는 핵심 기술', summary: '인공지능(AI)은 이미 우리 생활 깊숙이 들어와 있으며, 앞으로 더 큰 변화를 가져올 것으로 예상됩니다. 이 기사에서는 AI 기술의 최신 동향과 미래 전망을 다룹니다.', source: '테크뉴스', date: '2024-07-26', keywords: ['AI', '미래기술', '혁신'], originalLink: './article1.html' }, // 경로 확인!
        { id: 2, title: '여름철 건강 관리, 이렇게 하세요!', summary: '무더위가 계속되는 여름철, 건강 관리에 각별한 주의가 필요합니다. 전문가들이 조언하는 여름철 건강 수칙을 알아봅니다.', source: '헬스투데이', date: '2024-07-26', keywords: ['건강', '여름', '생활정보'], originalLink: './article2.html' }, // 경로 확인!
        { id: 3, title: '새로운 우주 탐사선 발사 성공', summary: 'OO국에서 개발한 차세대 우주 탐사선이 성공적으로 발사되어 인류의 우주 탐사 역사에 새로운 장을 열었습니다.', source: '사이언스데일리', date: '2024-07-25', keywords: ['우주', '과학', '탐사'], originalLink: './article_placeholder.html' }, // 실제 파일 없으면 임시
        { id: 4, title: '글로벌 경제, 불확실성 속 성장 전망', summary: '세계 경제는 여러 도전 과제에 직면해 있지만, 일부 지역에서는 회복세를 보이며 점진적인 성장이 예상됩니다.', source: '경제일보', date: '2024-07-25', keywords: ['경제', '글로벌', '전망'], originalLink: './article_placeholder.html' },
        { id: 5, title: '친환경 에너지로의 전환, 가속화되나', summary: '기후 변화 대응을 위한 전 세계적인 노력으로 친환경 에너지로의 전환이 더욱 중요해지고 있습니다.', source: '환경뉴스', date: '2024-07-24', keywords: ['환경', '에너지', '기후변화', 'AI'], originalLink: './article_placeholder.html' },
        { id: 6, title: 'K-컬처, 세계를 매료시키다', summary: '한국의 드라마, 영화, 음악 등이 전 세계적으로 큰 인기를 얻으며 문화적 영향력을 확대하고 있습니다.', source: '문화일보', date: '2024-07-23', keywords: ['한류', '문화', 'K컬처'], originalLink: './article_placeholder.html' },
        { id: 7, title: '자율주행 자동차, 상용화 눈앞', summary: '자율주행 기술이 빠르게 발전하면서, 머지않아 도로에서 스스로 운전하는 자동차를 흔히 볼 수 있을 전망입니다.', source: '모빌리티 투데이', date: '2024-07-22', keywords: ['자율주행', '자동차', '기술', 'AI'], originalLink: './article_placeholder.html' },
        { id: 8, title: '메타버스, 현실과 가상의 경계를 허물다', summary: '메타버스는 가상현실(VR), 증강현실(AR), 인공지능(AI) 등 첨단 기술이 융합된 새로운 디지털 플랫폼입니다.', source: 'IT월드', date: '2024-07-21', keywords: ['메타버스', '가상현실', '증강현실', 'AI'], originalLink: './article_placeholder.html' },
        { id: 9, title: '블록체인 기술의 미래와 활용 방안', summary: '블록체인 기술은 금융, 물류, 의료 등 다양한 산업에서 혁신적인 변화를 가져올 잠재력을 가지고 있습니다.', source: '핀테크 포커스', date: '2024-07-20', keywords: ['블록체인', '핀테크', '암호화폐'], originalLink: './article_placeholder.html' },
        { id: 10, title: '딥러닝, 이미지 인식 정확도 향상', summary: '딥러닝 기술의 발전으로 컴퓨터 비전 분야, 특히 이미지 인식의 정확도가 크게 향상되었습니다.', source: 'AI 연구소', date: '2024-07-19', keywords: ['딥러닝', '이미지인식', '컴퓨터비전', 'AI'], originalLink: './article_placeholder.html' },
        { id: 11, title: '스마트팜, 농업의 디지털 혁신', summary: '스마트팜은 정보통신기술(ICT)을 활용하여 농작물의 생육 환경을 최적으로 관리하는 지능형 농장입니다.', source: '농업과 미래', date: '2024-07-18', keywords: ['스마트팜', '농업', 'ICT', 'AI'], originalLink: './article_placeholder.html' },
        { id: 12, title: '개인정보보호, 디지털 시대의 과제', summary: '디지털 전환이 가속화되면서 개인정보보호의 중요성이 더욱 커지고 있으며, 관련 법규 및 기술적 대응이 요구됩니다.', source: '보안뉴스', date: '2024-07-17', keywords: ['개인정보', '보안', '프라이버시'], originalLink: './article_placeholder.html' },
        { id: 13, title: '웨어러블 기기, 건강 모니터링의 진화', summary: '스마트워치, 밴드 등 웨어러블 기기는 사용자의 건강 상태를 실시간으로 모니터링하고 분석하는 기능을 제공합니다.', source: '헬스케어 매거진', date: '2024-07-16', keywords: ['웨어러블', '건강', '스마트워치'], originalLink: './article_placeholder.html' },
        { id: 14, title: '클라우드 컴퓨팅 시장 동향 분석', summary: '클라우드 컴퓨팅은 기업의 IT 인프라 구축 및 운영 방식을 근본적으로 변화시키며 빠르게 성장하고 있습니다.', source: '클라우드 인사이트', date: '2024-07-15', keywords: ['클라우드', '컴퓨팅', 'SaaS', 'IaaS'], originalLink: './article_placeholder.html' },
        { id: 15, title: '양자컴퓨터, 미래 기술의 게임 체인저', summary: '양자컴퓨터는 기존 컴퓨터의 한계를 뛰어넘는 혁신적인 연산 능력을 바탕으로 다양한 분야에 활용될 것으로 기대됩니다.', source: '미래과학연구', date: '2024-07-14', keywords: ['양자컴퓨터', '미래기술', '양자역학'], originalLink: './article_placeholder.html' },
        { id: 16, title: 'NFT 아트 시장의 현주소와 전망', summary: '대체 불가능 토큰(NFT) 기술은 디지털 아트 시장에 새로운 패러다임을 제시하며 큰 주목을 받고 있습니다.', source: '아트앤테크', date: '2024-07-13', keywords: ['NFT', '아트', '블록체인', '디지털자산'], originalLink: './article_placeholder.html' },
        { id: 17, title: '사이버 보안 위협과 대응 전략', summary: '지능화, 고도화되는 사이버 공격에 효과적으로 대응하기 위한 다각적인 보안 전략 수립이 중요합니다.', source: '정보보호학회', date: '2024-07-12', keywords: ['사이버보안', '해킹', '정보보호', '랜섬웨어'], originalLink: './article_placeholder.html' },
        { id: 18, title: '지속 가능한 패션 트렌드', summary: '환경 문제에 대한 인식이 높아지면서 패션 산업에서도 친환경 소재 사용, 업사이클링 등 지속 가능한 트렌드가 확산되고 있습니다.', source: '패션매거진', date: '2024-07-11', keywords: ['패션', '지속가능성', '환경', '업사이클링'], originalLink: './article_placeholder.html' }
    ];
    // originalLink 경로를 ./articleN.html 또는 실제 파일 경로로 다시 한번 확인해주세요.
    // 없는 파일은 ./article_placeholder.html 등으로 임시 처리했습니다.

    let currentNews = [];
    let itemsToShow = 9;
    const itemsPerLoad = 9;

    let activeDataSource = [...mockNewsData]; // 현재 뉴스 목록의 원본 데이터 (필터링 또는 개인화에 따라 변경될 수 있음)

    // --- 개인화 관련 로직 추가 ---
    function getPersonalizedNewsData() {
        let personalizedData = [...mockNewsData]; // 원본 데이터 복사

        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const userInfo = typeof getUserInfo === 'function' ? getUserInfo() : null;
            const userInterestsString = localStorage.getItem('userInterests');
            const userInterests = userInterestsString ? JSON.parse(userInterestsString) : [];

            if (newsSectionTitle && userInfo && userInfo.username) {
                newsSectionTitle.textContent = `${userInfo.username}님을 위한 맞춤 뉴스`;
            } else if (newsSectionTitle) {
                newsSectionTitle.textContent = "추천 뉴스"; // 관심사 없거나 비로그인이면
            }


            if (userInterests.length > 0) {
                console.log("사용자 관심사:", userInterests);
                personalizedData.sort((a, b) => {
                    // 각 뉴스 아이템의 키워드가 사용자 관심사와 얼마나 일치하는지 점수 계산
                    let scoreA = 0;
                    let scoreB = 0;

                    userInterests.forEach(interest => {
                        if (a.keywords.map(k => k.toLowerCase()).includes(interest.toLowerCase())) {
                            scoreA++;
                        }
                        if (b.keywords.map(k => k.toLowerCase()).includes(interest.toLowerCase())) {
                            scoreB++;
                        }
                        // 제목이나 요약에도 관심사가 포함되는지 체크하여 가중치 부여 가능
                        if (a.title.toLowerCase().includes(interest.toLowerCase())) scoreA += 0.5;
                        if (b.title.toLowerCase().includes(interest.toLowerCase())) scoreB += 0.5;
                    });

                    // 점수가 높은 뉴스가 앞으로 오도록 정렬 (내림차순)
                    return scoreB - scoreA;
                });
                console.log("개인화 정렬된 데이터:", personalizedData.slice(0, 5)); // 상위 5개만 로그
            }
        } else {
            if (newsSectionTitle) newsSectionTitle.textContent = "오늘의 뉴스";
        }
        return personalizedData;
    }


    // --- 기존 함수들 (renderNewsItem, displayNews 등) ---
    function renderNewsItem(item) {
        // ... (이전 코드와 동일) ...
        const article = document.createElement('article');
        article.classList.add('news-item');
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
        const titleElement = document.createElement('h2');
        titleElement.textContent = item.title;
        const summaryElement = document.createElement('p');
        summaryElement.classList.add('summary');
        summaryElement.textContent = item.summary;
        const metaElement = document.createElement('div');
        metaElement.classList.add('meta');
        metaElement.innerHTML = `<span class="source">${item.source}</span> | <span class="date">${item.date}</span>`;
        const linkElement = document.createElement('a');
        linkElement.href = "#";
        linkElement.classList.add('original-link');
        linkElement.textContent = '원문 보기';
        linkElement.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openModalWithArticle(item.originalLink);
        });
        article.appendChild(titleElement);
        article.appendChild(summaryElement);
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
        if (itemsToShow < activeDataSource.length) { // activeDataSource 기준으로 변경
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    function loadInitialNews() {
        activeDataSource = getPersonalizedNewsData(); // 개인화된 데이터로 activeDataSource 업데이트
        itemsToShow = 9;
        currentNews = activeDataSource.slice(0, itemsToShow);
        displayNews(currentNews);
        updateLoadMoreButtonVisibility();
    }

    function loadMoreNews() {
        // activeDataSource는 필터링이나 개인화에 의해 변경된 상태일 수 있음
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
            loadInitialNews(); // 검색어 없으면 개인화된 초기 상태로
            return;
        }

        const baseDataToFilter = getPersonalizedNewsData(); // 개인화된 데이터 또는 전체 데이터를 기준으로 필터링 시작

        const filteredData = baseDataToFilter.filter(item =>
            item.title.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.summary.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.keywords.some(k => k.toLowerCase().includes(lowerCaseSearchTerm))
        );
        
        activeDataSource = filteredData; // 필터링된 결과를 activeDataSource로 설정
        itemsToShow = 9; // 필터링 시 다시 9개부터
        currentNews = activeDataSource.slice(0, itemsToShow);
        displayNews(currentNews);
        updateLoadMoreButtonVisibility(); // 필터링된 activeDataSource 기준으로 버튼 상태 업데이트
    }


    // --- 모달 관련 함수 (이전과 동일) ---
    function openModalWithArticle(url) { /* ... */ }
    function closeModal() { /* ... */ }
    // (이전 코드와 동일하므로 생략, 필요시 전체 코드에 포함된 것 사용)
    function openModalWithArticle(url) {
        if (!modal || !modalIframe) return;
        if (!url || url === "#" || url.endsWith('placeholder.html')) { // placeholder도 제외
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


    // --- 초기 실행 ---
    loadInitialNews(); // 페이지 로드 시 개인화된 뉴스 로드


    // --- 이벤트 리스너 (이전과 동일) ---
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
    if (closeModalBtn) { /* ... */ }
    window.addEventListener('click', (event) => { /* ... */ });
    window.addEventListener('keydown', (event) => { /* ... */ });
    // (이전 코드와 동일하므로 생략)
    if (closeModalBtn) { closeModalBtn.addEventListener('click', closeModal); }
    window.addEventListener('click', (event) => { if (event.target == modal) { closeModal(); } });
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && modal.style.display === 'block') { closeModal(); } });

});