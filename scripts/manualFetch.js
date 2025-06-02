// scripts/manualFetch.js
require('dotenv').config();
const { fetchAndSaveFromRss } = require('../services/newsFetcherService'); // RSS용 함수만 가져옴
const db = require('../models');

// --- 수집할 RSS 피드 URL 목록 ---
// !!! 중요: 아래 URL은 예시입니다. 실제 연합뉴스의 유효한 RSS 피드 URL로 반드시 변경해주세요. !!!
// 연합뉴스 웹사이트에서 'RSS' 메뉴를 찾거나, '연합뉴스 RSS 주소' 등으로 검색하여 확인하세요.
const YONHAP_NEWS_RSS_URL = 'https://www.yna.co.kr/rss/news.xml'; // 예시: 주요 뉴스
// const YONHAP_NEWS_RSS_URL_TECHNOLOGY = 'https://www.yna.co.kr/RSS/IT.xml'; // 예시: IT 뉴스

async function run() {
    console.log('수동 RSS 뉴스 수집 스크립트 시작...');

    try {
        if (!YONHAP_NEWS_RSS_URL) {
            console.error('연합뉴스 RSS 피드 URL이 설정되지 않았습니다. 스크립트 내 YONHAP_NEWS_RSS_URL 변수를 확인해주세요.');
            return;
        }

        const result = await fetchAndSaveFromRss(YONHAP_NEWS_RSS_URL, '연합뉴스'); // 출처명 지정
        console.log("연합뉴스 수집 결과:", result);

        // 만약 다른 RSS 피드도 추가하고 싶다면:
        // if (YONHAP_NEWS_RSS_URL_TECHNOLOGY) {
        //     const techResult = await fetchAndSaveFromRss(YONHAP_NEWS_RSS_URL_TECHNOLOGY, '연합뉴스 IT');
        //     console.log("연합뉴스 IT 수집 결과:", techResult);
        // }

    } catch (error) {
        console.error('수동 뉴스 수집 중 심각한 오류 발생:', error);
    } finally {
        try {
            await db.sequelize.close();
            console.log('DB 연결이 성공적으로 종료되었습니다.');
        } catch (closeError) {
            console.error('DB 연결 종료 중 오류 발생:', closeError);
        }
    }
}

run();