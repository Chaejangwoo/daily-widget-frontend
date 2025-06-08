'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TrendingTopics', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      topic: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // 토픽 이름은 중복되지 않음
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: false // 순위
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: false // 인기도 점수
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
    await queryInterface.dropTable('TrendingTopics');
  }
};