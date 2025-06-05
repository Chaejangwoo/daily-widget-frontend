// services/aiProcessorService.js
const { NewsArticle, Summary, Keyword, sequelize } = require('../models');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Sequelize = require('sequelize'); // Sequelize 모듈 직접 가져오기
require('dotenv').config();

const Op = Sequelize.Op;    // Sequelize 모듈에서 직접 Op 가져오기
const DEFAULT_AI_PROCESSING_BATCH_SIZE = 5; // .env에 값이 없을 경우 기본값
const AI_PROCESSING_BATCH_SIZE = parseInt(process.env.AI_PROCESSING_BATCH_SIZE) || DEFAULT_AI_PROCESSING_BATCH_SIZE;
const MAX_CATEGORY_RETRY_COUNT = 3;

// --- Gemini API 초기화 ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let genAI;
let model; // model 변수를 모듈 스코프에 선언

if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // 또는 "gemini-pro" 등
        console.log('[Gemini Initializer] Gemini 모델 초기화 성공:', model.modelName || model.model); // SDK 버전에 따라 modelName 또는 model
    } catch (initError) {
        console.error('[Gemini Initializer] Gemini SDK 또는 모델 초기화 중 오류 발생:', initError.message);
    }
} else {
    console.error('[Gemini Initializer] GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다. Gemini API 기능을 사용할 수 없습니다.');
}

// --- 상수 정의 ---
const PREDEFINED_CATEGORIES = ['정치', '경제', '사회', 'IT/과학', '생활/문화', '스포츠', '국제', '기타'];
const MIN_TEXT_LENGTH_FOR_AI = 50;
const MAX_INPUT_TEXT_LENGTH_FOR_GEMINI = 30000; 

/**
 * 입력 텍스트가 유효한지 확인하고 전처리합니다.
 * @param {any} text - 확인할 텍스트
 * @param {number} minLength - 최소 길이
 * @param {string} taskName - 작업 이름 (로그용)
 * @returns {string|null} 전처리된 텍스트 또는 null
 */
function preprocessText(text, minLength, taskName) {
    if (typeof text !== 'string') {
        console.warn(`[${taskName}] 입력된 텍스트가 문자열이 아닙니다 (타입: ${typeof text}). 작업을 건너뜁니다.`);
        return null;
    }
    const trimmedText = text.trim().replace(/\s\s+/g, ' ');
    if (!trimmedText || trimmedText.length < minLength) {
        console.log(`[${taskName}] 정제 후 텍스트가 너무 짧거나 비어있어 작업을 건너뜁니다 (길이: ${trimmedText.length}, 최소: ${minLength}).`);
        return null;
    }
    return trimmedText.substring(0, MAX_INPUT_TEXT_LENGTH_FOR_GEMINI);
}

/**
 * Gemini API를 사용하여 텍스트를 요약합니다.
 */
async function summarizeText(textToSummarize) {
    if (!model) {
        console.error('[Gemini Summarizer] 모델이 초기화되지 않아 요약을 건너뜁니다.');
        return '';
    }
    const inputText = preprocessText(textToSummarize, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Summarizer');
    if (!inputText) return '';

    console.log(`[Gemini Summarizer] 텍스트 요약 시작... (입력 길이: ${inputText.length}, 원문 앞부분: ${inputText.substring(0, 30)}...)`);
    try {
        const prompt = `다음 뉴스 기사를 한국어로 3문장 이내의 간결한 핵심 요약문으로 만들어줘:\n\n"${inputText}"\n\n요약:`;
        const result = await model.generateContent(prompt);
        const response = result.response; // await 제거
        const summary = response.text();

        if (summary) {
            console.log('[Gemini Summarizer] 요약 생성 성공.');
            return summary.trim();
        } else {
            console.error('[Gemini Summarizer] 요약 결과가 비어있습니다. 응답:', response);
            return '';
        }
    } catch (error) {
        console.error('[Gemini Summarizer] Gemini API 요약 중 오류 발생:', error.message);
        return '';
    }
}

/**
 * Gemini API를 사용하여 텍스트에서 키워드를 추출합니다.
 */
async function extractKeywords(textToExtractKeywords) {
    if (!model) {
        console.error('[Gemini Keywords] 모델이 초기화되지 않아 키워드 추출을 건너뜁니다.');
        return [];
    }
    const inputText = preprocessText(textToExtractKeywords, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Keywords');
    if (!inputText) return [];

    console.log(`[Gemini Keywords] 키워드 추출 시작... (입력 길이: ${inputText.length}, 원문 앞부분: ${inputText.substring(0, 30)}...)`);
    try {
        const prompt = `다음 뉴스 기사 내용에서 가장 중요한 핵심 키워드를 3개에서 5개 사이로 추출하고, 각 키워드는 쉼표(,)로 구분된 한국어 명사 형태로만 응답해줘. 다른 부가 설명은 절대 넣지 마.\n\n기사 내용:\n"${inputText}"\n\n키워드:`;
        const result = await model.generateContent(prompt);
        const response = result.response; // await 제거
        const keywordsText = response.text();

        if (keywordsText) {
            const keywordsArray = keywordsText.split(',').map(kw => kw.trim()).filter(kw => kw.length > 1 && kw.length < 20);
            console.log('[Gemini Keywords] 추출된 키워드:', keywordsArray);
            return keywordsArray.slice(0, 5);
        } else {
            console.error('[Gemini Keywords] 키워드 결과가 비어있습니다. 응답:', response);
            return [];
        }
    } catch (error) {
        console.error('[Gemini Keywords] Gemini API 키워드 추출 중 오류 발생:', error.message);
        return [];
    }
}

/**
 * Gemini API를 사용하여 텍스트의 카테고리를 분류합니다.
 */
async function classifyCategory(textToClassify) {
    if (!model) {
        console.error('[Gemini Classifier] 모델이 초기화되지 않아 카테고리 분류를 건너뜁니다.');
        return '기타'; // 기본값 또는 null
    }
    const inputText = preprocessText(textToClassify, MIN_TEXT_LENGTH_FOR_AI, 'Gemini Classifier');
    if (!inputText) return '기타'; // 입력 텍스트 부적절 시 '기타'

    console.log(`[Gemini Classifier] 카테고리 분류 시작... (입력 길이: ${inputText.length}, 원문 앞부분: ${inputText.substring(0, 30)}...)`);
    try {
        const prompt = `다음 뉴스 기사 내용을 읽고, 가장 적합한 주요 카테고리를 다음 목록 [${PREDEFINED_CATEGORIES.join(', ')}] 중에서 하나만 선택하여 정확히 그 카테고리 이름만 답변해줘. 다른 설명은 필요 없어. 만약 목록에 명확히 일치하는 카테고리가 없다면 "기타"라고 답변해줘.\n\n기사 내용:\n"${inputText}"\n\n카테고리:`;
        const result = await model.generateContent(prompt);
        const response = result.response; // await 제거
        const categoryName = response.text() ? response.text().trim() : null;

        if (categoryName && PREDEFINED_CATEGORIES.includes(categoryName)) {
            console.log('[Gemini Classifier] 분류된 카테고리:', categoryName);
            return categoryName;
        } else if (categoryName) {
            console.warn('[Gemini Classifier] 모델 응답 카테고리가 정의된 목록에 없음:', categoryName, "- '기타'로 처리.");
            return '기타';
        } else {
            console.error('[Gemini Classifier] 카테고리 분류 결과가 비어있습니다. 응답:', response);
            return '기타';
        }
    } catch (error) {
        console.error('[Gemini Classifier] Gemini API 카테고리 분류 중 오류 발생:', error.message);
        return '기타';
    }
}


/**
 * 아직 처리되지 않은 뉴스 기사를 찾아 AI 요약, 키워드 추출, 카테고리 분류를 수행하고 DB에 저장합니다.
 */
async function processUnprocessedArticles() {
    if (!model) {
        console.error('[AIProcessor] Gemini 모델이 초기화되지 않아 AI 처리를 진행할 수 없습니다.');
        return { processedCount: 0, summarizedCount: 0, keywordsExtractedCount: 0, categoryClassifiedCount: 0 };
    }

    console.log('[AIProcessor] 처리되지 않은 기사 검색 및 AI 처리 시작...');
    const articlesToProcess = await NewsArticle.findAll({
        where: {
            [Op.or]: [
                { isSummarized: false },
                { isKeywordsExtracted: false },
                { category: null },
                { // '기타' 카테고리이면서 재시도 횟수가 MAX_CATEGORY_RETRY_COUNT 미만인 경우
                    category: '기타',
                    categoryRetryCount: { [Op.lt]: MAX_CATEGORY_RETRY_COUNT }
                }
            ],
            content: { [Op.ne]: null, [Op.ne]: '' }
        },
        limit: AI_PROCESSING_BATCH_SIZE,
        order: [['publishedDate', 'DESC']]
    });

    if (articlesToProcess.length === 0) {
        console.log('[AIProcessor] 처리할 새 기사가 없습니다.');
        return { processedCount: 0, summarizedCount: 0, keywordsExtractedCount: 0, categoryClassifiedCount: 0 };
    }

    console.log(`[AIProcessor] ${articlesToProcess.length}개의 기사를 처리합니다.`);
    let actualProcessedCount = 0;
    let summarizedCount = 0;
    let keywordsExtractedCount = 0;
    let categoryClassifiedCount = 0;

    for (const article of articlesToProcess) {
        console.log(`\n[AIProcessor] 기사 ID ${article.id} 처리 중: "${article.title ? article.title.substring(0,30) : '제목없음'}..."`);

        const contentForAI = article.content; // DB에서 가져온 content 사용
        let articleUpdatedThisCycle = false;

        // AI 요약 생성
        if (!article.isSummarized) {
            const summaryText = await summarizeText(contentForAI);
            if (summaryText) {
                try {
                    await Summary.upsert({ articleId: article.id, summaryText: summaryText });
                    await article.update({ isSummarized: true });
                    summarizedCount++;
                    articleUpdatedThisCycle = true;
                    console.log(`[AIProcessor] 기사 ID ${article.id}: 요약 저장/업데이트 및 플래그 업데이트됨.`);
                } catch (dbError) { console.error(`[AIProcessor] 기사 ID ${article.id} 요약 DB 오류:`, dbError.message); }
            } else { console.log(`[AIProcessor] 기사 ID ${article.id}: 요약 생성 실패 또는 내용 없음.`); }
        } else { console.log(`[AIProcessor] 기사 ID ${article.id}: 이미 요약됨.`); }

        // AI 키워드 추출
        if (!article.isKeywordsExtracted) {
            const keywords = await extractKeywords(contentForAI);
            if (keywords.length > 0) {
                try {
                    await Keyword.destroy({ where: { articleId: article.id } });
                    for (const keyword of keywords) {
                        await Keyword.create({ articleId: article.id, keywordText: keyword });
                    }
                    await article.update({ isKeywordsExtracted: true });
                    keywordsExtractedCount++;
                    articleUpdatedThisCycle = true;
                    console.log(`[AIProcessor] 기사 ID ${article.id}: ${keywords.length}개 키워드 저장/업데이트 및 플래그 업데이트됨.`);
                } catch (dbError) { console.error(`[AIProcessor] 기사 ID ${article.id} 키워드 DB 오류:`, dbError.message); }
            } else { console.log(`[AIProcessor] 기사 ID ${article.id}: 키워드 추출 실패.`); }
        } else { console.log(`[AIProcessor] 기사 ID ${article.id}: 이미 키워드 추출됨.`); }

        // --- 카테고리 분류 수정 ---
        // 조건: 카테고리가 null이거나, '기타'이면서 재시도 횟수가 남아있는 경우
        if (article.category === null || (article.category === '기타' && article.categoryRetryCount < MAX_CATEGORY_RETRY_COUNT)) {
            console.log(`[AIProcessor] 기사 ID ${article.id}: 카테고리 분류 시도 (현재: ${article.category}, 재시도 카운트: ${article.categoryRetryCount}).`);

            const classifiedCategory = await classifyCategory(contentForAI); // API 호출 (callGeminiWithRetry 사용 권장)

            try {
                let updateData = { category: classifiedCategory };
                // 카테고리 분류를 시도했으므로 재시도 횟수 증가
                // (성공/실패 여부와 관계없이 일단 시도했으면 카운트 증가)
                if (article.category === '기타' || classifiedCategory === '기타') { // 기존이 '기타'였거나, 결과가 '기타'인 경우 카운트 증가
                     updateData.categoryRetryCount = article.categoryRetryCount + 1;
                } else if (article.category === null && classifiedCategory !== '기타') {
                    // 처음 분류해서 '기타'가 아닌 제대로 된 카테고리가 나온 경우, 재시도 카운트는 0으로 유지하거나 특정 값으로 설정 가능
                    // 여기서는 일단 시도했으면 증가하는 로직으로 통일. 필요시 조정.
                    updateData.categoryRetryCount = article.categoryRetryCount + 1; // 첫 시도도 카운트
                }


                await article.update(updateData);
                categoryClassifiedCount++; // 분류 시도 횟수로 카운트 (성공 여부와 별개로)
                articleUpdatedThisCycle = true;
                console.log(`[AIProcessor] 기사 ID ${article.id}: 카테고리 "${classifiedCategory}"로 업데이트됨. 재시도 카운트: ${updateData.categoryRetryCount || article.categoryRetryCount}`);
            } catch (dbError) { console.error(`[AIProcessor] 기사 ID ${article.id} 카테고리 DB 업데이트 오류:`, dbError.message); }
        } else {
            console.log(`[AIProcessor] 기사 ID ${article.id}: 카테고리 분류 건너뜀 (현재: ${article.category}, 재시도 카운트: ${article.categoryRetryCount} / ${MAX_CATEGORY_RETRY_COUNT}).`);
        }
        // --- 카테고리 분류 수정 끝 ---
          if (articleUpdatedThisCycle) {
            actualProcessedCount++;
        }
    }
    console.log(`[AIProcessor] AI 처리 시도 완료. 총 ${actualProcessedCount}개 기사 업데이트 (요약 ${summarizedCount}건, 키워드 ${keywordsExtractedCount}건, 카테고리 분류 시도 ${categoryClassifiedCount}건).`);
    return { processedCount: actualProcessedCount, summarizedCount, keywordsExtractedCount, categoryClassifiedCount };
}

module.exports = {
    summarizeText,
    extractKeywords,
    classifyCategory,
    processUnprocessedArticles,
};