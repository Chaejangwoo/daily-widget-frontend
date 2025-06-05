// scripts/manualFetch.js
require('dotenv').config();
const { fetchAndSaveFromRss } = require('../services/newsFetcherService'); // RSS용 함수만 가져옴
const db = require('../models');


const YONHAP_NEWS_RSS_URL = 'https://www.yna.co.kr/rss/news.xml'; // 최신 뉴스


async function run() {
    console.log('수동 RSS 뉴스 수집 스크립트 시작...');

    try {
        if (!YONHAP_NEWS_RSS_URL) {
            console.error('연합뉴스 RSS 피드 URL이 설정되지 않았습니다. 스크립트 내 YONHAP_NEWS_RSS_URL 변수를 확인해주세요.');
            return;
        }

        const result = await fetchAndSaveFromRss(YONHAP_NEWS_RSS_URL, '연합뉴스'); // 출처명 지정
        console.log("연합뉴스 수집 결과:", result);

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