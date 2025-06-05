// controllers/newsController.js
const { NewsArticle, Summary, Keyword, sequelize } = require('../models'); // Summary, Keyword, sequelize 추가
const { Op } = require('sequelize');

// 뉴스 목록 조회 컨트롤러 함수
const getAllNews = async (req, res) => {
    try {
        let { page, limit, sortBy, sortOrder, keyword, sourceName, category } = req.query; // category 파라미터 추가 (나중을 위해)

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 10;
        const offset = (page - 1) * limit;

        sortBy = sortBy || 'publishedDate'; // 기본 정렬: 발행일
        sortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC'; // 기본: 내림차순 (최신순)

        const whereClause = {};
        if (keyword) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { content: { [Op.like]: `%${keyword}%` } } // AI 요약이 있다면 요약에서도 검색 가능
            ];
        }
        if (sourceName) {
            whereClause.sourceName = sourceName;
        }
        // TODO: 나중에 NewsArticle 모델에 category 필드 추가 후 아래 주석 해제
        // if (category && category.toLowerCase() !== 'all') { // 'all'은 전체를 의미
        //     whereClause.category = category;
        // }

        const { count, rows } = await NewsArticle.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: [[sortBy, sortOrder]],
            include: [ // --- 관계 모델 포함 시작 ---
                {
                    model: Summary,
                    as: 'aiSummary', // NewsArticle 모델에서 정의한 별칭
                    attributes: ['summaryText'], // 필요한 필드만 선택
                    required: false // LEFT JOIN (요약이 없어도 뉴스는 나옴)
                },
                {
                    model: Keyword,
                    as: 'aiKeywords', // NewsArticle 모델에서 정의한 별칭
                    attributes: ['keywordText'], // 필요한 필드만 선택
                    required: false // LEFT JOIN (키워드가 없어도 뉴스는 나옴)
                }
            ], // --- 관계 모델 포함 끝 ---
            distinct: true, // include 사용 시 count가 부정확해지는 것을 방지 (상황에 따라 필요)
                           // 특히 hasMany 관계에서 중복 count 방지
        });

        // 프론트엔드로 보낼 데이터 형식 가공
        const newsWithProcessedData = rows.map(articleInstance => {
            const article = articleInstance.get({ plain: true }); // Sequelize 인스턴스를 일반 객체로 변환

            // AI 요약 처리: aiSummary 객체가 있고 summaryText가 있으면 사용, 없으면 content 앞부분 사용
            let displaySummary = '요약 정보가 준비 중입니다.'; // 기본 메시지
            if (article.aiSummary && article.aiSummary.summaryText) {
                displaySummary = article.aiSummary.summaryText;
            } else if (article.content) {
                // AI 요약이 없고, 원본 content가 있다면 앞 200자 + ...
                // (주의: content가 매우 길 수 있으므로, 여기서 자르는 것은 임시방편.
                //  AI 요약이 없는 경우를 프론트에서 어떻게 처리할지 정책 필요)
                const snippetLength = article.title && article.title.length > 50 ? 150 : 200; // 제목 길면 요약 짧게
                displaySummary = article.content.substring(0, snippetLength) + (article.content.length > snippetLength ? '...' : '');
            }

            // 키워드 처리: aiKeywords 배열에서 keywordText만 추출
            const displayKeywords = article.aiKeywords ? article.aiKeywords.map(kw => kw.keywordText) : [];

            return {
                id: article.id,
                title: article.title,
                // content: article.content, // 전체 본문은 목록 API에서 제외하는 것이 일반적 (필요하다면 포함)
                summaryForDisplay: displaySummary, // 프론트에서 사용할 최종 요약
                publishedDate: article.publishedDate,
                sourceName: article.sourceName,
                originalUrl: article.originalUrl,
                imageUrl: article.imageUrl,
                keywordsForDisplay: displayKeywords, // 프론트에서 사용할 키워드 배열
                // isSummarized: article.isSummarized, // 디버깅용으로 필요하면 전달
                // isKeywordsExtracted: article.isKeywordsExtracted, // 디버깅용
                createdAt: article.createdAt, // 정렬 등에 활용 가능
                updatedAt: article.updatedAt,
                category: article.category
            };
        });

        res.json({
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalNews: count,
            news: newsWithProcessedData // 가공된 데이터 전달
        });

    } catch (error) {
        console.error('뉴스 목록 조회 API 오류:', error);
        res.status(500).json({ message: '서버 오류로 뉴스 목록을 가져오는데 실패했습니다.', error: error.message });
    }
};

module.exports = {
    getAllNews,
    // getNewsById, // 필요하다면 다른 컨트롤러 함수도 export
};