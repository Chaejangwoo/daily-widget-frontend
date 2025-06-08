const express = require('express');
const router = express.Router(); // ★ 이 부분이 빠져있었습니다!

const bookmarkController = require('../controllers/bookmarkController');
// const { protect } = require('../middleware/authMiddleware'); // authMiddleware 파일의 export 방식에 따라 수정
const authMiddleware = require('../middleware/authMiddleware').protect; // 만약 module.exports = { protect } 라면 이렇게 사용

// --- 북마크 관련 라우트 ---
// :id 대신 :articleId로 명확하게 표현
router.post('/news/:articleId/bookmark', authMiddleware, bookmarkController.toggleBookmark);

// 로그인한 사용자의 북마크 목록 가져오기
router.get('/me/bookmarks', authMiddleware, bookmarkController.getBookmarks);

// 여기에 다른 API 라우트들도 추가될 수 있습니다. (예: /users, /news 등)
// 예시: const newsRoutes = require('./newsRoutes');
// router.use('/news', newsRoutes);


module.exports = router;