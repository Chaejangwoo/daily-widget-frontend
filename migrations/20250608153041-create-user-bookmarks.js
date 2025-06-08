//20250608153041-create-user-bookmarks
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserBookmarks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // Users 테이블 참조
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      articleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'NewsArticles', // NewsArticles 테이블 참조
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // 한 사용자가 같은 기사를 중복 북마크하지 못하도록 복합 유니크 인덱스 추가
    await queryInterface.addConstraint('UserBookmarks', {
      fields: ['userId', 'articleId'],
      type: 'unique',
      name: 'unique_user_bookmark'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserBookmarks');
  }
};