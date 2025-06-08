// backend/controllers/newsController.js

// UserBookmark 모델을 추가로 불러옵니다.
const { NewsArticle, Summary, Keyword, UserBookmark, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAllNews = async (req, res) => {
    // --- Phase 1: 파라미터 및 인증 정보 처리 ---
    console.log('[Backend] getAllNews 호출됨. Query:', req.query);
    
    // req.user가 존재할 수 있으므로, 로그인한 사용자의 ID를 가져옵니다. (없으면 null)
    // authMiddleware가 선택적으로 적용될 경우를 대비한 안전한 코드입니다.
    const userId = req.user ? req.user.id : null;
    console.log(`[Backend] 현재 사용자 ID: ${userId}`);

    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName, category, user_interests } = req.query;

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 9;
        const offset = (page - 1) * limit;

        let effectiveSortBy = sortBy || 'publishedDate';
        let effectiveSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        // --- Phase 2: 검색 및 필터링 조건(whereClause) 생성 ---
        const whereClause = {};
        if (keyword) {
            console.log('[Backend] 검색어 처리:', keyword);
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } }
                // 만약 키워드 테이블에서도 검색하고 싶다면 아래 주석 해제
                // { '$aiKeywords.keywordText$': { [Op.like]: `%${keyword}%` } } 
            ];
        }
        if (sourceName) {
            console.log('[Backend] 출처 필터링:', sourceName);
            whereClause.sourceName = sourceName;
        }
        if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
            console.log('[Backend] 카테고리 필터링:', category);
            whereClause.category = category;
        }

        // --- Phase 3: 정렬 조건(orderClause) 생성 ---
        let orderClause = [[effectiveSortBy, effectiveSortOrder]];

        // 사용자 관심사 기반 정렬 로직 (기존 로직 유지)
        if (user_interests && !keyword && (!category || category.trim() === '' || category.toLowerCase() === 'all')) {
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
                        [effectiveSortBy, effectiveSortOrder]
                    ];
                    console.log('[Backend] 관심사 기반 정렬 로직 적용됨.');
                }
            }
        }

        // --- Phase 4: 데이터베이스 조회 (Sequelize) ---
        console.log('[Backend] 최종 whereClause:', JSON.stringify(whereClause, null, 2));
        console.log('[Backend] 최종 orderClause:', orderClause.map(o => o.map(oi => typeof oi === 'string' ? oi : '[SequelizeLiteral]').join(' ')).join(', '));

        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: orderClause,
            // 북마크 여부를 확인하는 로직을 attributes에 추가합니다.
            attributes: {
                include: [
                    [
                        // userId가 있을 경우에만 북마크 여부를 확인하는 서브쿼리 실행
                        sequelize.literal(
                            `(EXISTS (SELECT 1 FROM UserBookmarks WHERE UserBookmarks.articleId = NewsArticle.id AND UserBookmarks.userId = ${userId ? sequelize.escape(userId) : 'NULL'}))`
                        ),
                        'isBookmarked'
                    ]
                ]
            },
            include: [
                {
                    model: Summary,
                    as: 'aiSummary', // 모델 관계 설정(as)에 따라 수정 필요
                    attributes: ['summaryText'],
                    required: false // LEFT JOIN
                },
                {
                    model: Keyword,
                    as: 'aiKeywords', // 모델 관계 설정(as)에 따라 수정 필요
                    attributes: ['keywordText'],
                    required: false // LEFT JOIN
                }
            ],
            distinct: true
        });

        console.log(`[Backend] DB 조회 결과: ${rows.length}개 뉴스 반환, 총 ${count}개`);

        // --- Phase 5: 프론트엔드에 맞게 데이터 가공 ---
        const newsWithProcessedData = rows.map(articleInstance => {
            const article = articleInstance.get({ plain: true });

            // 요약 처리 (기존 로직 유지)
            let displaySummary = '요약 정보가 준비 중입니다.';
            if (article.aiSummary && article.aiSummary.summaryText) {
                displaySummary = article.aiSummary.summaryText;
            } else if (article.content) {
                const snippetLength = article.title && article.title.length > 50 ? 150 : 200;
                displaySummary = article.content.substring(0, snippetLength) + (article.content.length > snippetLength ? '...' : '');
            }

            // 키워드 처리 (기존 로직 유지)
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
                category: article.category,
                // 북마크 여부 추가 (0 또는 1을 boolean으로 변환)
                isBookmarked: !!article.isBookmarked,
                createdAt: article.createdAt,
                updatedAt: article.updatedAt
            };
        });

        // --- Phase 6: 최종 응답 전송 ---
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

module.exports = {
    getAllNews,
};