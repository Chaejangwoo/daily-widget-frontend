const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// --- 기존 사용자 라우트 (회원가입, 로그인 등) ---
// router.post('/register', userController.registerUser);
// router.post('/login', userController.loginUser);

// --- ★ 설정 페이지를 위한 신규 라우트 ---

// 1. 현재 로그인한 사용자 정보 가져오기
router.get('/me', protect, userController.getUserProfile);

// 2. 사용자 프로필(이름) 업데이트
router.put('/me/profile', protect, userController.updateUserProfile);

// 3. 사용자 비밀번호 변경
router.put('/me/password', protect, userController.updateUserPassword);


module.exports = router;