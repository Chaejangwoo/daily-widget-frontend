// backend/controllers/newsController.js
const { NewsArticle, Summary, Keyword, sequelize } = require('../models');
const { Op } = require('sequelize');

const getAllNews = async (req, res) => {
    console.log('[Backend] getAllNews 호출됨. Query:', req.query);

    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName, category, user_interests } = req.query;

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 9;
        const offset = (page - 1) * limit;

        let effectiveSortBy = sortBy || 'publishedDate';
        let effectiveSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const whereClause = {};
        if (keyword) {
            console.log('[Backend] 검색어 처리:', keyword);
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } }
            ];
        }
        if (sourceName) {
            console.log('[Backend] 출처 필터링:', sourceName);
            whereClause.sourceName = sourceName;
        }
        if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
            console.log('[Backend] 카테고리 필터링:', category);
            whereClause.category = category;
        } else {
            console.log('[Backend] 카테고리 필터링 없음 (전체 또는 "all")');
        }

        let orderClause = [[effectiveSortBy, effectiveSortOrder]]; // 기본 정렬

        if (user_interests && !keyword && (!category || category.trim() === '' || category.toLowerCase() === 'all')) {
            const interestsArray = user_interests.split(',').map(interest => interest.trim()).filter(i => i);

            if (interestsArray.length > 0) {
                console.log('[Backend] 사용자 관심사 기반 정렬 시도:', interestsArray);

                // 각 관심 키워드에 대해 NewsArticle에 연결된 Keyword 레코드가 존재하는지 확인하여 점수 부여
                // 이 방식은 각 관심사에 대해 서브쿼리 또는 복잡한 JOIN을 유발할 수 있어 성능 테스트 필요
                // 좀 더 효율적인 방법은 Full-Text Search나, 미리 관련도 점수를 계산해두는 것일 수 있음

                // relevanceScore를 위한 SQL 조각 생성
                // 각 관심사가 NewsArticle의 aiKeywords에 포함되어 있는지 여부를 체크
                // (주의: 이 SQL 조각은 MySQL 기준이며, 다른 DB에서는 약간의 수정이 필요할 수 있습니다.)
                // Keyword 테이블의 별칭을 'matchedKeywords'로 지정
                const relevanceScoreSQL = interestsArray.map(interest => {
                    // SQL Injection 방지를 위해 사용자 입력을 직접 SQL 문자열에 삽입하지 않도록 주의
                    // 여기서는 interest가 서버에서 split/trim 처리된 값이라고 가정
                    // 실제로는 Sequelize의 `sequelize.escape()`나 Replacements를 사용하는 것이 더 안전
                    const escapedInterest = sequelize.escape(interest);
                    return `(
                        EXISTS (
                            SELECT 1
                            FROM \`Keywords\` AS \`matchedKeywords\`
                            WHERE \`matchedKeywords\`.\`articleId\` = \`NewsArticle\`.\`id\`
                            AND \`matchedKeywords\`.\`keywordText\` = ${escapedInterest}
                        )
                    )`;
                }).join(' + '); // 각 조건이 참이면 1, 거짓이면 0이므로, 합산하면 매칭된 관심사 개수가 됨

                if (relevanceScoreSQL) {
                    orderClause = [
                        [sequelize.literal(`(${relevanceScoreSQL})`), 'DESC'], // 매칭된 관심사 개수가 많은 순
                        [effectiveSortBy, effectiveSortOrder]                 // 그 다음 기본 정렬
                    ];
                    console.log('[Backend] 관심사 기반 정렬 로직 적용됨.');
                }
            }
        }

        console.log('[Backend] 최종 whereClause:', JSON.stringify(whereClause, null, 2));
        console.log('[Backend] 최종 orderClause:', orderClause.map(o => o.map(oi => typeof oi === 'string' ? oi : '[SequelizeLiteral]').join(' ')).join(', '));


        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: orderClause,
            include: [
                {
                    model: Summary,
                    as: 'aiSummary',
                    attributes: ['summaryText'],
                    required: false
                },
                {
                    model: Keyword,
                    as: 'aiKeywords', // 이 include는 프론트엔드 표시용이며, 위 relevanceScoreSQL과는 별개
                    attributes: ['keywordText'],
                    required: false
                }
            ],
            distinct: true,
            // subQuery: false, // 경우에 따라 limit/offset과 복잡한 join/order 사용 시 필요할 수 있음
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
                category: article.category,
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

module.exports = {
    getAllNews,
};