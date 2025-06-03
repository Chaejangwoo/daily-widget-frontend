// services/newsFetcherService.js
const axios = require('axios');
const xml2js = require('xml2js'); // npm install xml2js (아직 안 했다면)
const { NewsArticle } = require('../models'); // Sequelize 모델
require('dotenv').config(); // .env 파일 사용 (만약 API 키 등 다른 환경변수 사용 시)

// XML 파서 인스턴스 생성 (옵션: explicitArray: false 로 하면 단일 항목도 배열이 아닌 객체로 바로 접근)
const parser = new xml2js.Parser({ explicitArray: false, trim: true });

/**
 * 특정 URL의 RSS 피드에서 뉴스 아이템들을 가져옵니다.
 * @param {string} rssFeedUrl - 가져올 RSS 피드의 URL
 * @returns {Promise<Array>} RSS 아이템 객체 배열 또는 빈 배열
 */
async function fetchNewsFromRss(rssFeedUrl) {
    if (!rssFeedUrl) {
        console.error('RSS 피드 URL이 제공되지 않았습니다.');
        return [];
    }
    console.log(`[RSSFetcher] RSS 피드 요청: ${rssFeedUrl}`);
    try {
        const response = await axios.get(rssFeedUrl, {
            headers: { // 일부 RSS 서버는 특정 User-Agent를 요구할 수 있습니다.
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // 일부 RSS 서버는 XML 인코딩 문제로 인해 responseType을 arraybuffer로 설정 후 인코딩 변환 필요할 수 있음
            // responseType: 'arraybuffer',
        });
        let xmlData = response.data;

        // 만약 responseType: 'arraybuffer' 사용 시 인코딩 변환 (예: EUC-KR -> UTF-8)
        // const iconv = require('iconv-lite'); // npm install iconv-lite
        // xmlData = iconv.decode(Buffer.from(xmlData), 'euc-kr'); // 예시: EUC-KR 인 경우

        const result = await parser.parseStringPromise(xmlData);
        // console.log('[RSSFetcher] RSS 파싱 결과 (일부):', JSON.stringify(result, null, 2).substring(0, 800) + '...');


        // RSS 피드 구조 확인 (가장 일반적인 RSS 2.0 구조)
        if (result.rss && result.rss.channel && result.rss.channel.item) {
            // item이 단일 객체일 수도, 배열일 수도 있으므로 항상 배열로 처리
            const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
            console.log(`[RSSFetcher] ${items.length}개의 RSS 아이템 수신됨.`);
            return items;
        }
        // Atom 피드 구조도 고려 (필요하다면)
        else if (result.feed && result.feed.entry) {
             const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
             console.log(`[RSSFetcher] ${entries.length}개의 Atom 피드 엔트리 수신됨.`);
             // Atom 피드 형식을 RSS item과 유사하게 변환
             return entries.map(entry => ({
                 title: entry.title && entry.title._ ? entry.title._ : entry.title,
                 link: entry.link && entry.link.href ? entry.link.href : (Array.isArray(entry.link) ? entry.link[0].href : null),
                 pubDate: entry.updated || entry.published,
                 description: entry.summary && entry.summary._ ? entry.summary._ : (entry.content && entry.content._ ? entry.content._ : ''),
                 creator: entry.author && entry.author.name ? entry.author.name : null
             }));
        }
        else {
            console.error('[RSSFetcher] RSS/Atom 피드에서 유효한 뉴스 아이템/엔트리를 찾을 수 없습니다. 피드 구조를 확인하세요.', result);
            return [];
        }
    } catch (error) {
        console.error(`[RSSFetcher] RSS 피드 (${rssFeedUrl}) 처리 중 오류 발생:`, error.message);
        if (error.response) {
            console.error('[RSSFetcher] 오류 응답 상태:', error.response.status);
            // console.error('[RSSFetcher] 오류 응답 데이터:', error.response.data); // 데이터가 클 수 있으므로 주의
        }
        return [];
    }
}

/**
 * RSS 아이템(또는 Atom 엔트리)을 NewsArticle 모델 형식으로 변환합니다.
 * @param {Array} rssItems - RSS 아이템 또는 변환된 Atom 엔트리 배열
 * @param {string} defaultSourceName - RSS 피드 출처명 (예: "연합뉴스")
 * @returns {Array} NewsArticle 모델에 저장할 수 있는 형식의 객체 배열
 */
// services/newsFetcherService.js - parseRssItems 함수 수정

function parseRssItems(rssItems, defaultSourceName = 'Unknown RSS Source') {
    return rssItems.map((item, index) => {
        const title = item.title ? String(item.title).replace(/<[^>]*>?/gm, '').trim() : '제목 없음';
        const description = item.description ? String(item.description).replace(/<[^>]*>?/gm, '').trim() : '';
        let originalUrl = item.link;
        if (item.guid && item.guid._ && typeof item.guid._ === 'string' && item.guid._.startsWith('http')) {
            originalUrl = item.guid._;
        } else if (typeof item.link === 'object' && item.link !== null && item.link.href) {
            originalUrl = item.link.href;
        } else if (Array.isArray(item.link) && item.link.length > 0 && item.link[0].href) {
            originalUrl = item.link[0].href;
        } else if (typeof item.link === 'object' && item.link !== null && item.link['#']) {
             originalUrl = item.link['#'];
        }

        let publishedDate = null;
        const dateSource = item.pubDate || item.published || item.updated || (item['dc:date'] && item['dc:date']._) || item['dc:date'];
        if (dateSource) {
            try {
                publishedDate = new Date(dateSource);
                if (isNaN(publishedDate.getTime())) {
                    console.warn(`날짜 파싱 실패 (Invalid Date) for "${title.substring(0,30)}...":`, dateSource);
                    publishedDate = new Date();
                }
            } catch (e) {
                console.warn(`날짜 파싱 중 예외 발생 for "${title.substring(0,30)}...":`, dateSource, e.message);
                publishedDate = new Date();
            }
        } else {
            publishedDate = new Date();
        }

        const sourceName = (item['dc:creator'] && item['dc:creator']._) || item['dc:creator'] ||
                           (item.author && item.author.name) || item.author ||
                           defaultSourceName;

        // --- 이미지 URL 추출 로직 수정 ---
        let imageUrl = null;
        console.log(`\n--- Parsing item for image: ${title.substring(0,30)}... ---`);
        // 로그를 위해 item 전체를 보려면 이전처럼 if (index < N) 조건 사용
        // if (index < 1) {
        //     console.log(`Raw item object (index: ${index}):`, JSON.stringify(item, null, 2));
        // }

        // 1. media:content 처리 (단일 객체 또는 배열)
        if (item['media:content']) {
            const mediaContent = item['media:content'];
            if (Array.isArray(mediaContent)) { // 배열인 경우
                const imageMedia = mediaContent.find(mc => mc.$ && mc.$.url && mc.$.type && mc.$.type.startsWith('image/'));
                if (imageMedia) {
                    imageUrl = imageMedia.$.url;
                    console.log('Found image in <media:content (array)>: ', imageUrl);
                }
            } else if (typeof mediaContent === 'object' && mediaContent.$ && mediaContent.$.url && mediaContent.$.type && mediaContent.$.type.startsWith('image/')) { // 단일 객체인 경우
                imageUrl = mediaContent.$.url;
                console.log('Found image in <media:content (object)>: ', imageUrl);
            }
        }
        // 2. <enclosure> 태그 (media:content가 없을 경우 시도)
        else if (item.enclosure && item.enclosure.$ && item.enclosure.$.url && item.enclosure.$.type && item.enclosure.$.type.startsWith('image/')) {
            imageUrl = item.enclosure.$.url; // xml2js 파서 옵션에 따라 $가 없을 수도 있음, 그럴 경우 item.enclosure.url
            console.log('Found image in <enclosure>: ', imageUrl);
        }
        // 3. <media:thumbnail> (위에서 못 찾았을 경우)
        else if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
            imageUrl = item['media:thumbnail'].$.url; // 여기도 $ 유무 확인
            console.log('Found image in <media:thumbnail>: ', imageUrl);
        }
        // 4. 기타 다른 가능한 태그들 (필요시 추가)

        if (!imageUrl && description) { // 정말 이미지를 못 찾았고, description에 img 태그가 있다면 시도 (최후의 수단)
            const imgTagMatch = description.match(/<img[^>]+src="([^">]+)"/i);
            if (imgTagMatch && imgTagMatch[1]) {
                imageUrl = imgTagMatch[1];
                console.log('Found image in description <img> tag (fallback): ', imageUrl);
            }
        }

        if (!imageUrl) {
            console.log('Image URL not found for this item.');
        }
        // --- 이미지 URL 추출 로직 끝 ---

        return {
            title: title,
            content: description,
            publishedDate: publishedDate,
            sourceName: String(sourceName).trim(),
            sourceUrl: null,
            originalUrl: String(originalUrl).trim(),
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
        };
    }).filter(article => article.originalUrl && article.title && article.title !== '제목 없음');
}

/**
 * 변환된 뉴스 기사들을 데이터베이스에 저장합니다. (중복 방지)
 * @param {Array} parsedArticles - 저장할 기사 객체 배열
 */
async function saveArticlesToDB(parsedArticles) {
    let savedCount = 0;
    let skippedCount = 0;

    for (const articleData of parsedArticles) {
        if (!articleData.originalUrl || typeof articleData.originalUrl !== 'string' || !articleData.originalUrl.startsWith('http')) {
            console.warn('유효하지 않거나 누락된 originalUrl로 인해 기사를 건너뜁니다:', articleData.title, articleData.originalUrl);
            skippedCount++;
            continue;
        }
        try {
            const [article, created] = await NewsArticle.findOrCreate({
                where: { originalUrl: articleData.originalUrl },
                defaults: articleData,
            });

            if (created) {
                savedCount++;
                console.log(`저장됨: ${article.title}`);
            } else {
                skippedCount++;
                // console.log(`이미 존재함 (건너뜀): ${article.title}`);
            }
        } catch (error) {
            console.error(`DB 저장 중 오류 발생 (${articleData.title || '제목 없음'}):`, error.name, error.message);
        }
    }
    console.log(`뉴스 저장 완료: ${savedCount}개 저장됨, ${skippedCount}개 건너뜀.`);
    return { savedCount, skippedCount };
}


/**
 * 지정된 RSS 피드 URL에서 뉴스를 가져와 DB에 저장하는 함수
 * @param {string} rssFeedUrl - 가져올 RSS 피드의 URL
 * @param {string} sourceName - 해당 RSS 피드의 출처명
 */
async function fetchAndSaveFromRss(rssFeedUrl, sourceName = 'Unknown RSS Source') {
    if (!rssFeedUrl) {
        console.error('RSS 피드 URL이 필요합니다.');
        return { savedCount: 0, skippedCount: 0 };
    }
    console.log(`\n--- ${sourceName} RSS 뉴스 수집 시작 (${rssFeedUrl}) ---`);
    const rawRssItems = await fetchNewsFromRss(rssFeedUrl);

    if (rawRssItems && rawRssItems.length > 0) {
        const parsedArticles = parseRssItems(rawRssItems, sourceName);
        if (parsedArticles.length > 0) {
            const result = await saveArticlesToDB(parsedArticles);
            return result;
        } else {
            console.log('파싱 후 유효한 RSS 아이템이 없습니다.');
            return { savedCount: 0, skippedCount: 0 };
        }
    } else {
        console.log('수집된 RSS 아이템이 없습니다.');
        return { savedCount: 0, skippedCount: 0 };
    }
}

module.exports = {
    fetchNewsFromRss,
    parseRssItems,
    saveArticlesToDB,
    fetchAndSaveFromRss, // RSS용 주 실행 함수
    // 만약 NewsAPI.org 관련 함수도 남겨두고 싶다면 여기에 추가
    // fetchTopHeadlines,
    // fetchEverything,
    // fetchAndSaveNews, // NewsAPI용 주 실행 함수 (이름 변경 또는 구분 필요)
};