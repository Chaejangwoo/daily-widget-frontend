// models/user.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      // 예: User.hasMany(models.Post);
    }
  }
  User.init({
    // id: 기본 키, 자동 증가 (Sequelize가 자동으로 추가해줌, 명시 안 해도 됨)
    username: {
      type: DataTypes.STRING,
      allowNull: false, // 사용자 이름은 비어있을 수 없음
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false, // 이메일은 비어있을 수 없음
      unique: true,     // 이메일은 고유해야 함
      validate: {
        isEmail: true,  // 이메일 형식이어야 함
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false, // 비밀번호는 비어있을 수 없음
    },
    interests: { // interests 필드 추가
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [] // 기본값을 빈 배열로 설정 (선택 사항)
    }
    // createdAt, updatedAt: Sequelize가 자동으로 추가해줌 (timestamps: true 기본값)
  }, {
    sequelize,
    modelName: 'User',
    // tableName: 'users' // 기본적으로 모델 이름의 복수형으로 테이블 이름 생성 (Users)
                         // 명시적으로 지정하고 싶다면 tableName 옵션 사용
  });
  return User;
};