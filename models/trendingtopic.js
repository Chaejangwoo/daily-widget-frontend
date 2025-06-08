'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrendingTopic extends Model {
    static associate(models) {
      // 다른 모델과 특별한 관계는 필요 없음
    }
  }
  TrendingTopic.init({
    topic: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'TrendingTopic',
  });
  return TrendingTopic;
};