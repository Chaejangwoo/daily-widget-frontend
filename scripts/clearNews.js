
  // scripts/clearNews.js
  require('dotenv').config();
  const db = require('../models');
  const { NewsArticle } = db; // NewsArticle 모델 가져오기

  async function clearAllNews() {
      console.log('모든 뉴스 데이터 삭제를 시작합니다...');
      try {
          const numDeleted = await NewsArticle.destroy({
              where: {}, // 모든 레코드 대상
              truncate: true // 테이블을 비우고 ID 시퀀스도 리셋 (선택 사항, 더 확실한 초기화)
                             // truncate: false 로 하면 그냥 모든 행 DELETE
          });
          console.log(`${numDeleted}개의 뉴스 데이터가 삭제되었습니다.`);
          if (numDeleted === undefined && true) { // truncate: true 사용 시 numDeleted는 undefined 일 수 있음
              console.log("테이블이 truncate 되었습니다 (모든 데이터 삭제 및 초기화).");
          }
      } catch (error) {
          console.error('뉴스 데이터 삭제 중 오류 발생:', error);
      } finally {
          await db.sequelize.close();
          console.log('DB 연결이 종료되었습니다.');
      }
  }

  clearAllNews();

