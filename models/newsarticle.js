// models/newsarticle.js
'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NewsArticle extends Model {
    static associate(models) {
    }
  }
  NewsArticle.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT, // 긴 텍스트
      allowNull: true, // 본문 수집이 어려울 수도 있으므로, 초기에는 true 허용 고려
    },
    publishedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sourceName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourceUrl: { // 출처 사이트 URL (선택 사항)
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true,
      }
    },
    originalUrl: { // 뉴스 원문 URL
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // 중복 기사 방지를 위해 고유해야 함
      validate: {
        isUrl: true,
      }
    },
    isSummarized: { // 요약 완료 여부
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isKeywordsExtracted: { // 키워드 추출 완료 여부
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    imageUrl: { // <<--- 새로운 필드 추가
      type: DataTypes.STRING, // URL은 문자열
      allowNull: true,        // 이미지가 없을 수도 있으므로 null 허용
      validate: {
        isUrl: true,          // 유효한 URL 형식인지 검사 (선택 사항)
      }
    }
  }, {
    sequelize,
    modelName: 'NewsArticle',
    // tableName: 'NewsArticles' // 기본값
  });
  return NewsArticle;
};