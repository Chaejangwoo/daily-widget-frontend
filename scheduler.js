// scheduler.js
const cron = require('node-cron');
const { fetchAndSaveFromRss } = require('./services/newsFetcherService'); // 경로 확인
const { processUnprocessedArticles } = require('./services/aiProcessorService'); // 경로 확인
// const { clearOldNews } = require('./scripts/clearNews'); // clearNews.js도 함수형으로 만들고 export 가정

console.log('Cron 스케줄러 시작됨.');

// --- 뉴스 수집 스케줄 ---
// 연합뉴스 RSS 피드 URL 
const yonhapRSSGeneral = 'https://www.yna.co.kr/rss/news.xml'; 


cron.schedule('0 * * * *', async () => { // 매 시간 0분에 실행 ('분 시 일 월 요일')
    console.log(`[${new Date().toLocaleString()}] 뉴스 수집 작업 시작...`);
    try {
        await fetchAndSaveFromRss(yonhapRSSGeneral, '연합뉴스TV'); // sourceName은 적절히 지정
        console.log(`[${new Date().toLocaleString()}] 뉴스 수집 작업 완료.`);
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] 뉴스 수집 작업 중 오류:`, error);
    }
});

// --- AI 처리 스케줄 ---
cron.schedule('*/1 * * * *', async () => { // 매 1분마다 실행
    console.log(`[${new Date().toLocaleString()}] AI 기사 처리 작업 시작...`);
    try {
        const result = await processUnprocessedArticles();
        console.log(`[${new Date().toLocaleString()}] AI 기사 처리 작업 완료. 처리된 기사: ${result.processedCount}건`);
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] AI 기사 처리 작업 중 오류:`, error);
    }
});

