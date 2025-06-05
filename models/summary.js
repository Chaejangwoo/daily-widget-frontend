'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Summary extends Model {
    static associate(models) {
      Summary.belongsTo(models.NewsArticle, {
        foreignKey: 'articleId',
        as: 'article', // 접근 시 사용할 별칭
        onDelete: 'CASCADE', // 기사 삭제 시 요약도 함께 삭제
      });
    }
  }
  Summary.init({
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { // 외래 키 설정
        model: 'NewsArticles', // 참조할 테이블 이름 (Sequelize가 자동으로 복수형으로 만듦)
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    summaryText: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, { sequelize, modelName: 'Summary' });
  return Summary;
};