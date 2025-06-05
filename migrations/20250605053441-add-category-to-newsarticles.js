// migrations/20250605053441-add-category-to-newsarticles.js 
'use strict'; 
module.exports = { 
  async up(queryInterface, Sequelize) { 
    await queryInterface.addColumn('NewsArticles', 'category', { 
      type: Sequelize.STRING, allowNull: true, // 모델 정의와 일치 
after: 'imageUrl' // 적절한 위치에 추가 (선택 사항) 
}); 
}, 
async down(queryInterface, Sequelize) { 
  await queryInterface.removeColumn('NewsArticles', 'category'); } };