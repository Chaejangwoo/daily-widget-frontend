'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Keyword extends Model {
    static associate(models) {
      Keyword.belongsTo(models.NewsArticle, {
        foreignKey: 'articleId',
        as: 'article',
        onDelete: 'CASCADE',
      });
    }
  }
  Keyword.init({
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'NewsArticles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    keywordText: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, { sequelize, modelName: 'Keyword' });
  return Keyword;
};