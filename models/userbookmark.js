'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserBookmark extends Model {
    static associate(models) {
      // User 모델과 관계 설정
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      // NewsArticle 모델과 관계 설정
      this.belongsTo(models.NewsArticle, {
        foreignKey: 'articleId',
        as: 'article'
      });
    }
  }
  UserBookmark.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'UserBookmark',
  });
  return UserBookmark;
};