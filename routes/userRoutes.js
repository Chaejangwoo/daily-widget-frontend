const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const bookmarkController = require('../controllers/bookmarkController');

// --- Public Routes (인증이 필요 없는 경로) ---
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// --- Protected Routes (로그인 인증이 필요한 경로) ---
// 현재 로그인한 사용자 정보 가져오기
router.get('/me', protect, userController.getUserProfile);
// 사용자 프로필(이름) 업데이트
router.put('/me/profile', protect, userController.updateUserProfile);
// 사용자 비밀번호 변경
router.put('/me/password', protect, userController.updateUserPassword);
// 사용자 관심사 조회
router.get('/me/interests', protect, userController.getUserInterests);
// 사용자 관심사 업데이트
router.put('/me/interests', protect, userController.updateUserInterests);
//  추천 키워드 조회 API 라우트 추가
router.get('/me/recommendations/keywords', protect, userController.getRecommendedKeywords);
// 사용자의 북마크 목록 가져오기
router.get('/me/bookmarks', protect, bookmarkController.getBookmarks);
module.exports = router;