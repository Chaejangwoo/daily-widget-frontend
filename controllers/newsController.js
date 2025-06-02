// controllers/newsController.js
const { NewsArticle } = require('../models'); // NewsArticle 모델
const { Op } = require('sequelize');       // Sequelize 연산자

// 뉴스 목록 조회 컨트롤러 함수
const getAllNews = async (req, res) => {
    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName } = req.query;

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 10;
        const offset = (page - 1) * limit;

        sortBy = sortBy || 'publishedDate';
        sortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const whereClause = {};
        if (keyword) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } }
            ];
        }
        if (sourceName) {
            whereClause.sourceName = sourceName;
        }

        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [[sortBy, sortOrder]],
        });

        res.json({
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalNews: count,
            news: rows
        });

    } catch (error) {
        console.error('뉴스 목록 조회 컨트롤러 오류:', error);
        res.status(500).json({ message: '서버 오류로 뉴스 목록을 가져오는데 실패했습니다.', error: error.message });
    }
};

// (선택 사항) 특정 뉴스 ID로 조회하는 컨트롤러 함수 예시
const getNewsById = async (req, res) => {
    try {
        const newsId = req.params.id;
        const article = await NewsArticle.findByPk(newsId);

        if (!article) {
            return res.status(404).json({ message: '해당 ID의 뉴스를 찾을 수 없습니다.' });
        }
        res.json(article);
    } catch (error) {
        console.error('특정 뉴스 조회 컨트롤러 오류:', error);
        res.status(500).json({ message: '서버 오류로 뉴스를 가져오는데 실패했습니다.', error: error.message });
    }
};


// 필요한 다른 컨트롤러 함수들도 여기에 추가할 수 있습니다.
// 예: createNews, updateNews, deleteNews 등 (지금 프로젝트에서는 필요 없을 수 있음)

module.exports = {
    getAllNews,
    getNewsById, // 예시로 추가
    // 다른 함수들도 export
};