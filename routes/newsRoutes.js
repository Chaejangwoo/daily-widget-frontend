const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const bookmarkController = require('../controllers/bookmarkController');

// ★ 두 종류의 미들웨어를 모두 불러옵니다.
const { protect } = require('../middleware/authMiddleware');
const { optionalProtect } = require('../middleware/optionalAuthMiddleware'); // 새로 만든 미들웨어

// --- 뉴스 라우트 ---
// GET /api/news : 선택적 인증 적용
router.get('/', optionalProtect, newsController.getAllNews);

// --- 북마크 라우트 ---
// POST /api/news/:articleId/bookmark : 필수 인증 적용
router.post('/:articleId/bookmark', protect, bookmarkController.toggleBookmark);

module.exports = router;