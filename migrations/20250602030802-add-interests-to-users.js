// migrations/20250602030802-add-interests-to-users.js
'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'interests', { // 'Users' 테이블에 'interests' 컬럼 추가
      type: Sequelize.JSON, // JSON 타입으로 관심사 배열 저장
      allowNull: true,      // 관심사는 필수가 아닐 수 있음
      defaultValue: null    // 기본값은 null (또는 '[]' - 빈 배열 문자열)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'interests'); // 롤백 시 'interests' 컬럼 제거
  }
};