// migrations/20250602071934-create-news-article.js (예시)
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('NewsArticles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      publishedDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sourceName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sourceUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      originalUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // 여기에 unique 제약 조건 추가
      },
      isSummarized: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isKeywordsExtracted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('NewsArticles');
  }
};