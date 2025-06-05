// backend/controllers/newsController.js
const { NewsArticle, Summary, Keyword, sequelize } = require('../models'); // Summary, Keyword, sequelize 추가
const { Op } = require('sequelize');

// 뉴스 목록 조회 컨트롤러 함수
const getAllNews = async (req, res) => {
    console.log('[Backend] getAllNews 호출됨. Query:', req.query); // 요청 쿼리 전체 로그

    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName, category } = req.query;

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 9; // 프론트엔드 itemsPerPage와 일치 (또는 기본값 설정)
        const offset = (page - 1) * limit;

        sortBy = sortBy || 'publishedDate'; // 기본 정렬: 발행일
        sortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC'; // 기본: 내림차순 (최신순)

        const whereClause = {};
        if (keyword) {
            console.log('[Backend] 검색어 처리:', keyword);
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } }
                // TODO: 필요하다면 요약(Summary) 및 추출된 키워드(Keyword)에서도 검색하도록 확장
                // { '$aiSummary.summaryText$': { [Op.like]: `%${keyword}%` } }, // 예시: 요약 검색 (include 설정 필요)
                // { '$aiKeywords.keywordText$': { [Op.like]: `%${keyword}%` } } // 예시: 키워드 검색 (include 설정 필요)
            ];
        }
        if (sourceName) {
            console.log('[Backend] 출처 필터링:', sourceName);
            whereClause.sourceName = sourceName;
        }
        // 카테고리 필터링 로직 수정: 빈 문자열("")은 전체를 의미하므로 필터링 안함
        if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
            console.log('[Backend] 카테고리 필터링:', category);
            whereClause.category = category; 
        } else {
            console.log('[Backend] 카테고리 필터링 없음 (전체 또는 "all")');
        }

        console.log('[Backend] 최종 whereClause:', JSON.stringify(whereClause, null, 2));

        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [[sortBy, sortOrder]],
            include: [
                {
                    model: Summary,
                    as: 'aiSummary',
                    attributes: ['summaryText'],
                    required: false // LEFT JOIN
                },
                {
                    model: Keyword,
                    as: 'aiKeywords',
                    attributes: ['keywordText'],
                    required: false // LEFT JOIN
                }
            ],
            distinct: true, // include 사용 시 count가 부정확해지는 것을 방지 (특히 hasMany 관계)
        });

        console.log(`[Backend] DB 조회 결과: ${rows.length}개 뉴스 반환, 총 ${count}개`);

        const newsWithProcessedData = rows.map(articleInstance => {
            const article = articleInstance.get({ plain: true });

            let displaySummary = '요약 정보가 준비 중입니다.';
            if (article.aiSummary && article.aiSummary.summaryText) {
                displaySummary = article.aiSummary.summaryText;
            } else if (article.content) {
                const snippetLength = article.title && article.title.length > 50 ? 150 : 200;
                displaySummary = article.content.substring(0, snippetLength) + (article.content.length > snippetLength ? '...' : '');
            }

            const displayKeywords = article.aiKeywords ? article.aiKeywords.map(kw => kw.keywordText) : [];

            return {
                id: article.id,
                title: article.title,
                summaryForDisplay: displaySummary,
                publishedDate: article.publishedDate,
                sourceName: article.sourceName,
                originalUrl: article.originalUrl,
                imageUrl: article.imageUrl,
                keywordsForDisplay: displayKeywords,
                category: article.category, // 카테고리 정보 포함
                createdAt: article.createdAt,
                updatedAt: article.updatedAt
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
        res.status(500).json({ message: '서버 오류로 뉴스 목록을 가져오는데 실패했습니다.', error: error.message });
    }
};

// 특정 ID 뉴스 조회 (만약 사용한다면)
// const getNewsById = async (req, res) => { ... };

module.exports = {
    getAllNews,
    // getNewsById,
};