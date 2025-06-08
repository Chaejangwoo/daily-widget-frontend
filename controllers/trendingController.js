const { TrendingTopic } = require('../models');

exports.getTrendingTopics = async (req, res) => {
    try {
        const topics = await TrendingTopic.findAll({
            order: [['rank', 'ASC']], // 순위 순으로 정렬
            limit: 5 // 상위 5개만 가져오기
        });

        // 프론트엔드에서 사용하기 쉽게 토픽 이름만 추출한 배열로 반환
        const topicNames = topics.map(item => item.topic);

        res.status(200).json({ success: true, topics: topicNames });
    } catch (error) {
        console.error('인기 토픽 조회 API 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};