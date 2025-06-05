// services/newsFetcherService.js
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio'); // HTML 파싱을 위해
const { NewsArticle } = require('../models'); // Sequelize 모델
require('dotenv').config(); // .env 파일 사용

// XML 파서 인스턴스 생성
const parser = new xml2js.Parser({ explicitArray: false, trim: true });


/**
 * 특정 URL의 웹페이지에서 기사 본문을 스크래핑합니다. (연합뉴스 기준 예시)
 * @param {string} url - 스크래핑할 기사 원문 URL
 * @returns {Promise<string>} 추출된 기사 본문 텍스트 또는 빈 문자열
 */
async function scrapeArticleContent(url) {
    if (!url || !url.startsWith('http')) {
        console.warn(`[Scraper] Invalid URL for scraping: ${url}`);
        return '';
    }
    try {
        console.log(`[Scraper] Attempting to scrape content from: ${url}`);
        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000 // 10초 타임아웃
        });
        const $ = cheerio.load(html);

        let articleText = '';
        // !!! 연합뉴스 웹사이트의 실제 기사 본문 컨테이너 선택자로 변경해야 합니다 !!!
        const mainContentSelector = 'article#articleWrap div.story-news.article'; // 스크린샷 기반 유력 선택자

        const $mainContent = $(mainContentSelector);

        if ($mainContent.length > 0) {
            console.log(`[Scraper] Found content with selector: "${mainContentSelector}"`);

            // 불필요한 요소들 제거 (광고, 스크립트, 스타일, 기자 정보, 관련기사, 댓글 등)
            $mainContent.find('script, style, iframe, .ad-template, .social-share-btn-wrap, .promotion_area, .link_news, .copyright, figure. όπου, div.journalist-profile, div.reporter_area, .tag_area, aside, .article_bottom_ad, #articleFSSetting, .layer_reporter_area, .ico_photoviewer').remove();

            // 각 문단(p 태그)의 텍스트를 가져와서 합치기
            $mainContent.find('p').each((i, elem) => {
                const paragraphText = $(elem).text().trim();
                if (paragraphText) {
                    articleText += paragraphText + '\n\n';
                }
            });
            articleText = articleText.trim();

            if (!articleText || articleText.length < 100) {
                console.warn(`[Scraper] Paragraph extraction result is too short from "${mainContentSelector}". Trying to get all text from the selector after cleanup.`);
                // 불필요한 요소 제거 후 남은 전체 텍스트 (p태그로 못가져올때 대비)
                $mainContent.find('script, style, iframe, .ad-template, .social-share-btn-wrap, .promotion_area, .link_news, .copyright, figure. όπου, div.journalist-profile, div.reporter_area, .tag_area, aside, .article_bottom_ad, #articleFSSetting, .layer_reporter_area, .ico_photoviewer').remove();
                articleText = $mainContent.text().replace(/\s\s+/g, ' ').trim();
            }

        } else {
            console.warn(`[Scraper] Content not found with selector: "${mainContentSelector}" for URL: ${url}. Trying body text as fallback (less accurate).`);
            $('body script, body style, body iframe, body header, body footer, body nav, body aside').remove();
            articleText = $('body').text().replace(/\s\s+/g, ' ').trim();
        }

        const cleanedContent = articleText.replace(/\s\s+/g, ' ').trim();
        console.log(`[Scraper] Scraped content length: ${cleanedContent.length} for ${url.substring(0, 70)}...`);
        return cleanedContent.substring(0, 15000); // DB 저장 및 처리 시간 고려하여 길이 제한

    } catch (error) {
        console.error(`[Scraper] Error scraping ${url}:`, error.response ? error.response.status : error.message);
        return '';
    }
}


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
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const xmlData = response.data;
        const result = await parser.parseStringPromise(xmlData);

        if (result.rss && result.rss.channel && result.rss.channel.item) {
            const items = Array.isArray(result.rss.channel.item) ? result.rss.channel.item : [result.rss.channel.item];
            console.log(`[RSSFetcher] ${items.length}개의 RSS 아이템 수신됨.`);
            return items;
        } else if (result.feed && result.feed.entry) { // Atom 피드 지원
            const entries = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];
            console.log(`[RSSFetcher] ${entries.length}개의 Atom 피드 엔트리 수신됨.`);
            return entries.map(entry => ({ // Atom 형식을 RSS item과 유사하게 변환
                title: entry.title && entry.title._ ? entry.title._ : entry.title,
                link: entry.link && entry.link.href ? entry.link.href : (Array.isArray(entry.link) ? entry.link[0].href : null),
                pubDate: entry.updated || entry.published,
                description: entry.summary && entry.summary._ ? entry.summary._ : (entry.content && entry.content._ ? entry.content._ : ''),
                creator: entry.author && entry.author.name ? entry.author.name : null
            }));
        } else {
            console.error('[RSSFetcher] RSS/Atom 피드에서 유효한 뉴스 아이템/엔트리를 찾을 수 없습니다.', result);
            return [];
        }
    } catch (error) {
        console.error(`[RSSFetcher] RSS 피드 (${rssFeedUrl}) 처리 중 오류 발생:`, error.message);
        if (error.response) console.error('[RSSFetcher] 오류 응답 상태:', error.response.status);
        return [];
    }
}

/**
 * RSS 아이템을 NewsArticle 모델 형식으로 변환하고, 원문 내용을 스크래핑합니다.
 * @param {Array} rssItems - RSS 아이템 또는 변환된 Atom 엔트리 배열
 * @param {string} defaultSourceName - RSS 피드 출처명
 * @returns {Promise<Array>} NewsArticle 모델에 저장할 수 있는 형식의 객체 배열
 */
async function parseRssItems(rssItems, defaultSourceName = 'Unknown RSS Source') {
    const parsedArticles = [];
    for (const item of rssItems) {
        const title = item.title ? String(item.title).replace(/<[^>]*>?/gm, '').trim() : '제목 없음';
        let originalUrl = item.link;
        if (item.guid && item.guid._ && typeof item.guid._ === 'string' && item.guid._.startsWith('http')) {
            originalUrl = item.guid._;
        } else if (typeof item.link === 'object' && item.link !== null && item.link.href) {
            originalUrl = item.link.href;
        } else if (Array.isArray(item.link) && item.link.length > 0 && item.link[0] && item.link[0].href) { // item.link[0] 존재 여부 체크
            originalUrl = item.link[0].href;
        } else if (typeof item.link === 'string' && item.link.startsWith('http')) { // link가 문자열인 경우
             originalUrl = item.link;
        }


        if (!originalUrl || !title || title === '제목 없음') {
            console.warn('Skipping item due to missing or invalid originalUrl or title:', item.title || 'N/A', originalUrl || 'N/A');
            continue;
        }
        originalUrl = String(originalUrl).trim(); // 여기서 trim 한번 더

        let publishedDate = null;
        const dateSource = item.pubDate || item.published || item.updated || (item['dc:date'] && item['dc:date']._) || item['dc:date'];
        if (dateSource) {
            try {
                publishedDate = new Date(dateSource);
                if (isNaN(publishedDate.getTime())) {
                    publishedDate = new Date(); // 파싱 실패 시 현재 시간
                }
            } catch (e) { publishedDate = new Date(); }
        } else {
            publishedDate = new Date();
        }

        const sourceName = (item['dc:creator'] && item['dc:creator']._) || item['dc:creator'] ||
                           (item.author && item.author.name) || item.author ||
                           defaultSourceName;

        // --- 이미지 URL 추출 로직 (이전 답변 참고하여 연합뉴스 RSS 구조에 맞게 수정) ---
        let imageUrl = null;
        if (item['media:content']) {
            const mediaContent = item['media:content'];
            if (Array.isArray(mediaContent)) {
                const imageMedia = mediaContent.find(mc => mc.$ && mc.$.url && mc.$.type && mc.$.type.startsWith('image/'));
                if (imageMedia) imageUrl = imageMedia.$.url;
            } else if (typeof mediaContent === 'object' && mediaContent.$ && mediaContent.$.url && mediaContent.$.type && mediaContent.$.type.startsWith('image/')) {
                imageUrl = mediaContent.$.url;
            }
        } else if (item.enclosure && item.enclosure.$ && item.enclosure.$.url && item.enclosure.$.type && item.enclosure.$.type.startsWith('image/')) {
            imageUrl = item.enclosure.$.url;
        } // ... (기타 이미지 추출 로직) ...


        // --- 원문 내용 스크래핑 호출 ---
        const fullContent = await scrapeArticleContent(originalUrl);
        // ---
        let category = null;
if (item.category) { // <category> 태그가 있다면
    if (Array.isArray(item.category)) {
        category = item.category[0]; // 여러 개 중 첫 번째 사용 또는 모두 사용
    } else {
        category = item.category;
    }
    if (typeof category === 'object' && category._) { // xml2js 파싱 특성 고려
        category = category._;
    }
}
// 만약 카테고리 정보가 없다면, sourceName을 기반으로 추정하거나 기본값 설정 가능
if (!category && defaultSourceName === '연합뉴스') {
    // 연합뉴스 URL 패턴 등으로 카테고리 유추 (예시)
    if (originalUrl.includes('/AKR') && originalUrl.includes('0001000000')) category = '정치';
    // ... (더 많은 규칙 추가) ...
    else category = '기타'; // 기본값
}

        parsedArticles.push({
            title: title,
            content: fullContent || (item.description ? String(item.description).replace(/<[^>]*>?/gm, '').trim() : ''),
            publishedDate: publishedDate,
            sourceName: String(sourceName).trim(),
            sourceUrl: null,
            originalUrl: originalUrl, // 이미 trim 처리됨
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
            category: category ? String(category).trim() : null,
        });
    }
    return parsedArticles;
}

/**
 * 변환된 뉴스 기사들을 데이터베이스에 저장합니다. (중복 방지)
 */
async function saveArticlesToDB(parsedArticles) {
    let savedCount = 0;
    let skippedCount = 0;
    for (const articleData of parsedArticles) {
        if (!articleData.originalUrl || typeof articleData.originalUrl !== 'string' || !articleData.originalUrl.startsWith('http')) {
            console.warn('DB 저장 건너뜀 (유효하지 않은 originalUrl):', articleData.title, articleData.originalUrl);
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
                console.log(`저장됨: ${article.title ? article.title.substring(0,50) : '제목 없음'}...`);
            } else {
                skippedCount++;
            }
        } catch (error) {
            console.error(`DB 저장 중 오류 발생 (${articleData.title || '제목 없음'}):`, error.name, error.message);
        }
    }
    console.log(`뉴스 저장 완료: ${savedCount}개 저장됨, ${skippedCount}개 건너뜀.`);
    return { savedCount, skippedCount };
}

/**
 * 지정된 RSS 피드 URL에서 뉴스를 가져와 스크래핑 후 DB에 저장하는 함수
 */
async function fetchAndSaveFromRss(rssFeedUrl, sourceName = 'Unknown RSS Source') {
    if (!rssFeedUrl) {
        console.error('RSS 피드 URL이 필요합니다.');
        return { savedCount: 0, skippedCount: 0 };
    }
    console.log(`\n--- ${sourceName} RSS 뉴스 수집 시작 (${rssFeedUrl}) ---`);
    const rawRssItems = await fetchNewsFromRss(rssFeedUrl);

    if (rawRssItems && rawRssItems.length > 0) {
        const parsedArticles = await parseRssItems(rawRssItems, sourceName); // await 추가
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
    scrapeArticleContent,
    fetchNewsFromRss,
    parseRssItems,
    saveArticlesToDB,
    fetchAndSaveFromRss,
};