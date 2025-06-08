const { Keyword, TrendingTopic, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * 최근 24시간 동안의 키워드를 분석하여 인기 토픽을 계산하고 DB에 저장합니다.
 */
async function calculateAndStoreTrendingTopics() {
    console.log('[TrendingService] 인기 토픽 계산 시작...');
    try {
        const twentyFourHoursAgo = new Date(new Date() - 24 * 60 * 60 * 1000);

        // 1. 최근 24시간 동안 생성된 모든 키워드를 가져옵니다.
        const recentKeywords = await Keyword.findAll({
            where: {
                createdAt: {
                    [Op.gte]: twentyFourHoursAgo
                }
            },
            attributes: ['keywordText', 'createdAt']
        });

        if (recentKeywords.length === 0) {
            console.log('[TrendingService] 분석할 최신 키워드가 없습니다.');
            return;
        }

        console.log(`[TrendingService] 분석 대상 키워드 ${recentKeywords.length}개`);

        // 2. 키워드별로 점수를 계산합니다. (빈도수 + 시간 가중치)
        const topicScores = {};
        const now = new Date();

        recentKeywords.forEach(keyword => {
            const topic = keyword.keywordText;
            const hoursAgo = (now - new Date(keyword.createdAt)) / (1000 * 60 * 60);

            // 시간 감쇠(Decay) 공식: 오래된 키워드일수록 점수가 낮아짐
            // e^(-0.1 * 시간) -> 1시간 전: 0.9, 12시간 전: 0.3, 24시간 전: 0.09
            const timeWeight = Math.exp(-0.1 * hoursAgo); 
            const score = 1 * timeWeight; // 기본 점수 1점에 시간 가중치 적용

            topicScores[topic] = (topicScores[topic] || 0) + score;
        });

        // 3. 점수가 높은 순으로 정렬하여 상위 10개 토픽 추출
        const sortedTopics = Object.entries(topicScores)
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
            .slice(0, 10);

        console.log('[TrendingService] 계산된 상위 토픽:', sortedTopics);
        
        // 4. 기존 TrendingTopics 테이블을 비우고 새로운 순위로 업데이트 (트랜잭션 사용)
        await sequelize.transaction(async (t) => {
            // 기존 데이터 모두 삭제
            await TrendingTopic.destroy({ where: {}, truncate: true, transaction: t });

            // 새로운 인기 토픽 데이터 삽입
            const topicsToInsert = sortedTopics.map(([topic, score], index) => ({
                topic,
                score,
                rank: index + 1 // 1위부터 순위 매김
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

module.exports = { calculateAndStoreTrendingTopics };