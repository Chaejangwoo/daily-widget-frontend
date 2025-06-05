// scripts/runAiProcessor.js
require('dotenv').config();
const aiProcessorService = require('../services/aiProcessorService');
const db = require('../models');

async function run() {
    console.log('AI 처리 스크립트 시작...');
    try {
        const result = await aiProcessorService.processUnprocessedArticles();
        console.log('AI 처리 스크립트 완료:', result);
    } catch (error) {
        console.error('AI 처리 중 심각한 오류 발생:', error);
    } finally {
        await db.sequelize.close();
        console.log('DB 연결이 종료되었습니다.');
    }
}
run();