// backend/controllers/newsController.js

// 필요한 모든 모델과 Sequelize 관련 모듈을 불러옵니다.
const { NewsArticle, Summary, Keyword, UserBookmark, sequelize, Sequelize } = require('../models');
const { Op } = Sequelize;
const { cosineSimilarity } = require('../utils/vectorUtils');

/**
 * 뉴스 목록을 조회하는 메인 API 컨트롤러
 * - 페이징, 필터링(키워드, 카테고리, 출처), 정렬(관심사, 날짜) 지원
 * - 로그인 사용자의 북마크 여부 포함
 */
const getAllNews = async (req, res) => {
    const userId = req.user ? req.user.id : null;
    console.log(`[Backend] getAllNews 호출됨. 사용자 ID: ${userId}, Query:`, req.query);

    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName, category, user_interests } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 9;
        const offset = (page - 1) * limit;

        // --- WHERE 절 생성 ---
        const whereClause = {};
        if (sourceName) whereClause.sourceName = sourceName;
        if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
            whereClause.category = category;
        }

        if (keyword) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } },
                { category: { [Op.eq]: keyword } },
                Sequelize.literal(`EXISTS (SELECT 1 FROM Keywords WHERE Keywords.articleId = NewsArticle.id AND Keywords.keywordText = ${sequelize.escape(keyword)})`)
            ];
        }
        
        // --- ORDER 절 생성 ---
        let orderClause = [[sortBy || 'publishedDate', sortOrder === 'ASC' ? 'ASC' : 'DESC']];
        if (user_interests && !keyword && !category) {
            const interestsArray = user_interests.split(',').map(interest => interest.trim()).filter(i => i);
            if (interestsArray.length > 0) {
                const relevanceScoreSQL = interestsArray.map(interest => 
                    `(EXISTS (
                        SELECT 1 FROM \`Keywords\` AS \`matchedKeywords\`
                        WHERE \`matchedKeywords\`.\`articleId\` = \`NewsArticle\`.\`id\`
                        AND \`matchedKeywords\`.\`keywordText\` = ${sequelize.escape(interest)}
                    ))`
                ).join(' + ');

                if (relevanceScoreSQL) {
                    orderClause = [
                        [sequelize.literal(`(${relevanceScoreSQL})`), 'DESC'],
                        [sortBy || 'publishedDate', sortOrder === 'ASC' ? 'ASC' : 'DESC']
                    ];
                }
            }
        }

        // --- 데이터베이스 조회 ---
        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: orderClause,
            attributes: {
                include: [
                    [ sequelize.literal(`(EXISTS (SELECT 1 FROM UserBookmarks WHERE UserBookmarks.articleId = NewsArticle.id AND UserBookmarks.userId = ${userId ? sequelize.escape(userId) : 'NULL'}))`), 'isBookmarked' ]
                ]
            },
            include: [
                { model: Summary, as: 'aiSummary', attributes: ['summaryText'], required: false },
                { model: Keyword, as: 'aiKeywords', attributes: ['keywordText'], required: false }
            ],
            distinct: true
        });

        // --- 데이터 가공 및 응답 ---
        const newsWithProcessedData = rows.map(articleInstance => {
            const article = articleInstance.get({ plain: true });
            return {
                id: article.id,
                title: article.title,
                summaryForDisplay: article.aiSummary?.summaryText || '',
                publishedDate: article.publishedDate,
                sourceName: article.sourceName,
                originalUrl: article.originalUrl,
                imageUrl: article.imageUrl,
                keywordsForDisplay: article.aiKeywords?.map(kw => kw.keywordText) || [],
                category: article.category,
                isBookmarked: !!article.isBookmarked,
            };
        });
        
        res.status(200).json({
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalNews: count,
            news: newsWithProcessedData
        });

    } catch (error) {
        console.error('[Backend] 뉴스 목록 조회 API 오류:', error);
        res.status(500).json({ message: '서버 오류', error: error.message });
    }
};

/**
 * 특정 뉴스와 관련된 다른 뉴스들을 추천하는 컨트롤러
 * - 벡터 임베딩과 코사인 유사도 기반
 */
const getRelatedNews = async (req, res) => {
    const { articleId } = req.params;

    try {
        const targetArticle = await NewsArticle.findByPk(articleId, {
            attributes: ['id', 'embeddingVector']
        });

        if (!targetArticle || !targetArticle.embeddingVector) {
            return res.status(200).json({ success: true, relatedNews: [] });
        }
        const targetVector = JSON.parse(targetArticle.embeddingVector);

        const candidateArticles = await NewsArticle.findAll({
            where: {
                id: { [Op.ne]: articleId },
                embeddingVector: { [Op.ne]: null }
            },
            attributes: ['id', 'title', 'imageUrl', 'sourceName', 'originalUrl', 'embeddingVector'],
            order: [['publishedDate', 'DESC']],
            limit: 500
        });

        const similarities = candidateArticles.map(article => {
            const candidateVector = JSON.parse(article.embeddingVector);
            const similarity = cosineSimilarity(targetVector, candidateVector);
            return {
                id: article.id,
                title: article.title,
                imageUrl: article.imageUrl,
                sourceName: article.sourceName,
                originalUrl: article.originalUrl,
                similarity: similarity
            };
        });

        const relatedNews = similarities
            .filter(item => item.similarity > 0.7)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);

        res.status(200).json({ success: true, relatedNews });

    } catch (error) {
        console.error('관련 뉴스 추천 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};

module.exports = {
    getAllNews,
    getRelatedNews
};