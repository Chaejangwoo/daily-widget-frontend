// 일회성으로 실행할 스크립트
// 현재 프로젝트의 루트에서 실행한다고 가정 (예: node scripts/generate_all_vectors.js)
require('dotenv').config(); // .env 파일 로드
const { NewsArticle } = require('../models');

// ★ aiProcessorService에서 객체를 통째로 불러온 뒤, 필요한 함수를 꺼내 씁니다.
const aiProcessor = require('../services/aiProcessorService');
const generateEmbedding = aiProcessor.generateEmbedding;


async function run() {
    console.log('기존 모든 뉴스의 벡터 생성을 시작합니다...');
    
    // 벡터가 없는 뉴스만 조회
    const articlesWithoutVector = await NewsArticle.findAll({
        where: { embeddingVector: null }
    });

    if (articlesWithoutVector.length === 0) {
        console.log('벡터를 생성할 뉴스가 없습니다.');
        return;
    }

    console.log(`총 ${articlesWithoutVector.length}개의 뉴스에 대한 벡터를 생성합니다.`);

    for (const [index, article] of articlesWithoutVector.entries()) {
        if (!article.content) {
            console.log(`Article ID ${article.id}: 내용이 없어 건너뜁니다.`);
            continue;
        }

        const textForEmbedding = `${article.title}\n${article.content.substring(0, 1000)}`;
        
        // ★ 여기서 generateEmbedding 함수를 호출합니다.
        const vectorString = await generateEmbedding(textForEmbedding);
        
        if (vectorString) {
            await article.update({ embeddingVector: vectorString });
            console.log(`(${index + 1}/${articlesWithoutVector.length}) Article ID ${article.id}의 벡터 생성 완료.`);
        } else {
            console.log(`(${index + 1}/${articlesWithoutVector.length}) Article ID ${article.id}의 벡터 생성 실패.`);
        }

        // Gemini API의 분당 요청 제한(Rate Limit)을 피하기 위해 딜레이 추가
        // 기본 모델은 분당 60회 요청이므로, 1초 이상의 딜레이가 안전합니다.
        await new Promise(resolve => setTimeout(resolve, 1100)); 
    }

    console.log('모든 벡터 생성 작업이 완료되었습니다.');
    // 스크립트가 끝나면 자동으로 프로세스를 종료합니다.
    process.exit(0);
}

run().catch(error => {
    console.error("일괄 벡터 생성 중 심각한 오류 발생:", error);
    process.exit(1);
});