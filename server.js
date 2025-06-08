const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron'); //  cron 라이브러리 불러오기
const db = require('./models');

// --- 서비스 및 컨트롤러 로직을 이 파일에 직접 포함 ---
// (원래는 별도 파일로 분리하는 것이 좋지만, 요청에 따라 여기에 통합)

// trendingService.js의 내용
const { Keyword, TrendingTopic, sequelize } = require('./models');
const { Op } = require('sequelize');

async function calculateAndStoreTrendingTopics() {
    console.log('[TrendingService] 인기 토픽 계산 시작...');
    try {
        const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);
        const recentKeywords = await Keyword.findAll({
            where: { createdAt: { [Op.gte]: twentyFourHoursAgo } },
            attributes: ['keywordText', 'createdAt']
        });
        if (recentKeywords.length === 0) return;

        const topicScores = {};
        const now = new Date();
        recentKeywords.forEach(keyword => {
            const topic = keyword.keywordText;
            const hoursAgo = (now - new Date(keyword.createdAt)) / (1000 * 60 * 60);
            const timeWeight = Math.exp(-0.1 * hoursAgo);
            topicScores[topic] = (topicScores[topic] || 0) + (1 * timeWeight);
        });

        const sortedTopics = Object.entries(topicScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .slice(0, 10);

        await sequelize.transaction(async (t) => {
            await TrendingTopic.destroy({ where: {}, truncate: true, transaction: t });
            const topicsToInsert = sortedTopics.map(([topic, score], index) => ({
                topic, score, rank: index + 1
            }));
            if (topicsToInsert.length > 0) {
                await TrendingTopic.bulkCreate(topicsToInsert, { transaction: t });
            }
        });
        console.log(`[TrendingService] 인기 토픽 ${sortedTopics.length}개 저장 완료.`);
    } catch (error) {
        console.error('[TrendingService] 인기 토픽 계산 중 오류 발생:', error);
    }
}

// --- Express 앱 생성 및 미들웨어 설정 ---
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// --- 라우터 불러오기 ---
const newsRoutes = require('./routes/newsRoutes');
const userRoutes = require('./routes/userRoutes');
// api.js는 trending API만 남겨두거나, 아래에서 직접 정의합니다.

// --- API 라우트 정의 ---

// 기본 경로
app.get('/', (req, res) => {
    res.send('Daily Widget 백엔드 서버에 오신 것을 환영합니다!');
});

//  라우터 설정 순서 주의 
// 구체적인 경로를 항상 먼저 선언합니다.
app.use('/api/news', newsRoutes);
app.use('/api/users', userRoutes);

// trendingController.js의 로직을 여기에 직접 구현
app.get('/api/trends/popular', async (req, res) => {
    try {
        const topics = await TrendingTopic.findAll({
            order: [['rank', 'ASC']],
            limit: 5
        });
        const topicNames = topics.map(item => item.topic);
        res.status(200).json({ success: true, topics: topicNames });
    } catch (error) {
        console.error('인기 토픽 조회 API 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
});





// --- 데이터베이스 연결 ---
db.sequelize.sync({ force: false })
  .then(() => {
    console.log('데이터베이스 연결 및 동기화 성공.');
    // 서버 리스닝을 DB 연결 성공 후에 시작하는 것이 더 안정적입니다.
    app.listen(PORT, () => {
        console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);

        // --- 스케줄러 시작 ---
        // 서버가 완전히 준비된 후에 스케줄러를 등록하고 실행합니다.
        console.log('[Init] 서버 시작 시 인기 토픽 계산을 1회 실행합니다.');
        calculateAndStoreTrendingTopics(); // 서버 시작 시 즉시 1회 실행

        cron.schedule('*/30 * * * *', () => { // 30분마다 실행
            console.log('[CronJob] 주기적인 인기 토픽 계산 작업을 시작합니다...');
            calculateAndStoreTrendingTopics();
        });
    });
  })
  .catch((err) => {
    console.error('데이터베이스 연결 또는 동기화 실패:', err);
  });