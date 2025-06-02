// routes/newsRoutes.js
const express = require('express');
const router = express.Router();
// newsController.js에서 컨트롤러 함수들을 가져옵니다.
const newsController = require('../controllers/newsController');

/**
 * @route   GET /api/news
 * @desc    뉴스 목록 조회 (페이징 및 정렬 지원)
 * @access  Public
 */
router.get('/', newsController.getAllNews); // 컨트롤러의 getAllNews 함수를 직접 연결

/**
 * @route   GET /api/news/:id
 * @desc    특정 ID의 뉴스 조회 (예시)
 * @access  Public
 */
// router.get('/:id', newsController.getNewsById); // 예시로 추가한 라우트

module.exports = router;