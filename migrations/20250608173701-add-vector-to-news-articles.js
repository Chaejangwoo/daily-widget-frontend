'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('NewsArticles', 'embeddingVector', {
      type: Sequelize.TEXT('long'), // 매우 긴 텍스트를 위해 'long' 지정
      allowNull: true,
      after: 'category' // category 컬럼 뒤에 추가
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('NewsArticles', 'embeddingVector');
  }
};