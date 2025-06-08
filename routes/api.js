const express = require('express');
const router = express.Router(); // ★ 이 부분이 빠져있었습니다!

const trendingController = require('../controllers/trendingController');
const authMiddleware = require('../middleware/authMiddleware').protect; // 만약 module.exports = { protect } 라면 이렇게 사용

//  인기 토픽 조회 API 라우트
router.get('/trends/popular', trendingController.getTrendingTopics);


module.exports = router;