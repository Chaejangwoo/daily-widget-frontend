// migrations/20250603123232-add-imageUrl-to-newsarticles.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('NewsArticles', 'imageUrl', { // 'NewsArticles' 테이블에
      type: Sequelize.STRING,                                  // STRING 타입의
      allowNull: true,                                         // null을 허용하는
                                                               // 'imageUrl' 컬럼을 추가
      after: 'isKeywordsExtracted' // (선택 사항) 특정 컬럼 뒤에 추가하고 싶을 때
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('NewsArticles', 'imageUrl'); // 롤백 시 imageUrl 컬럼 제거
  }
};
