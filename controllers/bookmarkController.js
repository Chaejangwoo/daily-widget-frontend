const { UserBookmark, NewsArticle, Summary, Keyword } = require('../models');

// toggleBookmark 함수는 그대로 둡니다.
exports.toggleBookmark = async (req, res) => {
    // ... 이전 코드와 동일 ...
    const userId = req.user.id;
    const { articleId } = req.params;
    try {
        const existingBookmark = await UserBookmark.findOne({ where: { userId, articleId } });
        if (existingBookmark) {
            await existingBookmark.destroy();
            res.status(200).json({ success: true, message: '북마크가 취소되었습니다.', bookmarked: false });
        } else {
            await UserBookmark.create({ userId, articleId });
            res.status(201).json({ success: true, message: '북마크에 추가되었습니다.', bookmarked: true });
        }
    } catch (error) {
        console.error('북마크 토글 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};

// getBookmarks 함수를 아래 내용으로 교체합니다.
exports.getBookmarks = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9; // 프론트엔드와 일치
    const offset = (page - 1) * limit;

    try {
        const { count, rows } = await UserBookmark.findAndCountAll({
            where: { userId },
            include: [
                {
                    model: NewsArticle,
                    as: 'article',
                    include: [
                        { 
                            model: Summary, 
                            as: 'aiSummary', // ★ 'summary' -> 'aiSummary'로 수정
                            attributes: ['summaryText'],
                            required: false 
                        },
                        { 
                            model: Keyword, 
                            as: 'aiKeywords', // ★ 'keywords' -> 'aiKeywords'로 수정
                            attributes: ['keywordText'],
                            required: false 
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            distinct: true // 중첩 include 사용 시 count 정확성을 위해 추가
        });

        // 프론트엔드가 사용하기 좋은 형태로 데이터를 가공
        const bookmarkedNews = rows.map(bookmark => {
            if (!bookmark.article) return null;

            const plainArticle = bookmark.article.get({ plain: true });
            
            return {
                ...plainArticle,
                // 프론트엔드에서 사용하는 필드명으로 맞춰줌
                summaryForDisplay: plainArticle.aiSummary?.summaryText || '', // aiSummary에서 데이터 추출
                keywordsForDisplay: plainArticle.aiKeywords?.map(k => k.keywordText) || [] // aiKeywords에서 데이터 추출
            };
        }).filter(Boolean);

        res.status(200).json({
            success: true,
            news: bookmarkedNews,
            currentPage: page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        console.error('북마크 목록 조회 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};