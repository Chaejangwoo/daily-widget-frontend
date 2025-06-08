// services/aiProcessorService.js
const { NewsArticle, Summary, Keyword, sequelize } = require('../models');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Sequelize = require('sequelize');
require('dotenv').config();

const Op = Sequelize.Op;
const DEFAULT_AI_PROCESSING_BATCH_SIZE = 5;
const AI_PROCESSING_BATCH_SIZE = parseInt(process.env.AI_PROCESSING_BATCH_SIZE) || DEFAULT_AI_PROCESSING_BATCH_SIZE;
const MAX_CATEGORY_RETRY_COUNT = 3;

// --- Gemini API 초기화 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;
let model;
let embeddingModel; // ★ 벡터 생성을 위한 임베딩 모델 변수 추가

if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 모델명 확인 (gemini-2.0-flash -> 1.5-flash 등 최신/사용가능 모델로)
        embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" }); // ★ 임베딩 모델 초기화
        console.log('[Gemini Initializer] Gemini 모델 초기화 성공:', model.model);
        console.log('[Gemini Initializer] Embedding 모델 초기화 성공:', embeddingModel.model);
    } catch (initError) {
        console.error('[Gemini Initializer] Gemini SDK 또는 모델 초기화 중 오류 발생:', initError.message);
    }
} else {
    console.error('[Gemini Initializer] GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.');
}

// --- 상수 정의 ---
const PREDEFINED_CATEGORIES = ['정치', '경제', '사회', 'IT/과학', '생활/문화', '스포츠', '국제', '기타'];
const MIN_TEXT_LENGTH_FOR_AI = 50;
const MAX_INPUT_TEXT_LENGTH_FOR_GEMINI = 30000;

// --- 헬퍼 함수 ---
function preprocessText(text, minLength, taskName) {
    if (typeof text !== 'string') return null;
    const trimmedText = text.trim().replace(/\s\s+/g, ' ');
    if (!trimmedText || trimmedText.length < minLength) return null;
    return trimmedText.substring(0, MAX_INPUT_TEXT_LENGTH_FOR_GEMINI);
}

// --- AI 기능 함수들 ---

async function summarizeText(textToSummarize) {
    if (!model) { console.error('[Gemini Summarizer] 모델 미초기화'); return ''; }
    const inputText = preprocessText(textToSummarize, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Summarizer');
    if (!inputText) return '';
    try {
        const prompt = `다음 뉴스 기사를 한국어로 3문장 이내의 간결한 핵심 요약문으로 만들어줘:\n\n"${inputText}"\n\n요약:`;
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) { console.error('[Gemini Summarizer] 오류:', error.message); return ''; }
}

async function extractKeywords(textToExtractKeywords) {
    if (!model) { console.error('[Gemini Keywords] 모델 미초기화'); return []; }
    const inputText = preprocessText(textToExtractKeywords, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Keywords');
    if (!inputText) return [];
    try {
        const prompt = `다음 뉴스 기사 내용에서 가장 중요한 핵심 키워드를 3개에서 5개 사이로 추출하고, 각 키워드는 쉼표(,)로 구분된 한국어 명사 형태로만 응답해줘. 다른 부가 설명은 절대 넣지 마.\n\n기사 내용:\n"${inputText}"\n\n키워드:`;
        const result = await model.generateContent(prompt);
        const keywordsText = result.response.text();
        return keywordsText.split(',').map(kw => kw.trim()).filter(kw => kw.length > 1 && kw.length < 20).slice(0, 5);
    } catch (error) { console.error('[Gemini Keywords] 오류:', error.message); return []; }
}

async function classifyCategory(textToClassify) {
    if (!model) { console.error('[Gemini Classifier] 모델 미초기화'); return '기타'; }
    const inputText = preprocessText(textToClassify, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Classifier');
    if (!inputText) return '기타';
    try {
        const prompt = `다음 뉴스 기사 내용을 읽고, 가장 적합한 주요 카테고리를 다음 목록 [${PREDEFINED_CATEGORIES.join(', ')}] 중에서 하나만 선택하여 정확히 그 카테고리 이름만 답변해줘. 다른 설명은 필요 없어.\n\n기사 내용:\n"${inputText}"\n\n카테고리:`;
        const result = await model.generateContent(prompt);
        const categoryName = result.response.text()?.trim();
        return categoryName && PREDEFINED_CATEGORIES.includes(categoryName) ? categoryName : '기타';
    } catch (error) { console.error('[Gemini Classifier] 오류:', error.message); return '기타'; }
}

// ★★★ 벡터 생성 함수 추가 ★★★
async function generateEmbedding(textToEmbed) {
    if (!embeddingModel) {
        console.error('[Gemini Embedding] 임베딩 모델이 초기화되지 않아 벡터 생성을 건너뜁니다.');
        return null;
    }
    // 임베딩은 짧은 텍스트(제목+요약)로도 충분히 좋은 성능을 냄
    const inputText = preprocessText(textToEmbed, 20, 'Gemini Embedding'); 
    if (!inputText) return null;

    console.log(`[Gemini Embedding] 벡터 생성 시작... (입력 길이: ${inputText.length})`);
    try {
        const result = await embeddingModel.embedContent(inputText);
        const embedding = result.embedding;
        // 벡터 값을 JSON 문자열로 반환
        return JSON.stringify(embedding.values);
    } catch (error) {
        console.error('[Gemini Embedding] Gemini API 벡터 생성 중 오류 발생:', error.message);
        return null;
    }
}

/**
 * 아직 처리되지 않은 뉴스 기사를 찾아 AI 요약, 키워드, 카테고리, 벡터 생성을 수행합니다.
 */
async function processUnprocessedArticles() {
    if (!genAI) {
        console.error('[AIProcessor] Gemini가 초기화되지 않아 AI 처리를 진행할 수 없습니다.');
        return { processedCount: 0 };
    }

    console.log('[AIProcessor] 처리되지 않은 기사 검색 및 AI 처리 시작...');
    const articlesToProcess = await NewsArticle.findAll({
        where: {
            [Op.or]: [
                { isSummarized: false },
                { isKeywordsExtracted: false },
                { category: null },
                { category: '기타', categoryRetryCount: { [Op.lt]: MAX_CATEGORY_RETRY_COUNT } },
                { embeddingVector: null } // ★ 벡터가 없는 기사도 처리 대상에 추가
            ],
            content: { [Op.ne]: null, [Op.ne]: '' }
        },
        limit: AI_PROCESSING_BATCH_SIZE,
        order: [['publishedDate', 'DESC']]
    });

    if (articlesToProcess.length === 0) {
        console.log('[AIProcessor] 처리할 새 기사가 없습니다.');
        return { processedCount: 0 };
    }

    console.log(`[AIProcessor] ${articlesToProcess.length}개의 기사를 처리합니다.`);
    let processedCount = 0;

    for (const article of articlesToProcess) {
        console.log(`\n[AIProcessor] 기사 ID ${article.id} 처리 중...`);

        const contentForAI = article.content;
        let updatePayload = {};

        // 1. 요약
        if (!article.isSummarized) {
            const summaryText = await summarizeText(contentForAI);
            if (summaryText) {
                await Summary.upsert({ articleId: article.id, summaryText });
                updatePayload.isSummarized = true;
            }
        }

        // 2. 키워드
        if (!article.isKeywordsExtracted) {
            const keywords = await extractKeywords(contentForAI);
            if (keywords.length > 0) {
                await Keyword.destroy({ where: { articleId: article.id } });
                await Keyword.bulkCreate(keywords.map(kw => ({ articleId: article.id, keywordText: kw })));
                updatePayload.isKeywordsExtracted = true;
            }
        }

        // 3. 카테고리
        if (article.category === null || (article.category === '기타' && article.categoryRetryCount < MAX_CATEGORY_RETRY_COUNT)) {
            const classifiedCategory = await classifyCategory(contentForAI);
            updatePayload.category = classifiedCategory;
            updatePayload.categoryRetryCount = (article.categoryRetryCount || 0) + 1;
        }

        // 4. ★★★ 벡터 생성 ★★★
        if (!article.embeddingVector) {
            // 벡터 생성을 위한 텍스트는 제목과 본문 앞부분을 합쳐서 사용하면 좋음
            const textForEmbedding = `${article.title}\n${contentForAI.substring(0, 1000)}`;
            const vectorString = await generateEmbedding(textForEmbedding);
            if (vectorString) {
                updatePayload.embeddingVector = vectorString;
            }
        }
        
        // 5. 변경 사항이 있으면 한번에 DB에 업데이트
        if (Object.keys(updatePayload).length > 0) {
            try {
                await article.update(updatePayload);
                console.log(`[AIProcessor] 기사 ID ${article.id}: DB 업데이트 완료. 변경사항:`, Object.keys(updatePayload).join(', '));
                processedCount++;
            } catch (dbError) {
                console.error(`[AIProcessor] 기사 ID ${article.id} DB 업데이트 오류:`, dbError.message);
            }
        } else {
            console.log(`[AIProcessor] 기사 ID ${article.id}: 업데이트할 내용 없음.`);
        }
    }

    console.log(`[AIProcessor] AI 처리 완료. 총 ${processedCount}개 기사 업데이트.`);
    return { processedCount };
}

module.exports = {
    processUnprocessedArticles,
    generateEmbedding
};