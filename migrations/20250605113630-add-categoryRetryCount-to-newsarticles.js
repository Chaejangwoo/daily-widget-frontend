// migrations/20250605113630-add-categoryRetryCount-to-newsarticles.js
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('NewsArticles', 'categoryRetryCount', { // 테이블명은 실제 NewsArticles 테이블명 확인
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'category' // category 필드 뒤에 추가 (선택 사항)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('NewsArticles', 'categoryRetryCount');
  }
};