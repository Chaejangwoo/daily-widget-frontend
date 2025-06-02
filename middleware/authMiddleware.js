// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../models'); // DB 모델 접근
const User = db.User;

const protect = async (req, res, next) => {
    let token;

    // 요청 헤더의 Authorization 필드에서 토큰 확인 (Bearer 토큰 형식)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 'Bearer ' 부분을 제외하고 토큰 값만 추출
            token = req.headers.authorization.split(' ')[1];

            // 토큰 검증
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 검증된 사용자 정보를 req.user에 저장 (비밀번호 제외)
            // Sequelize 모델을 사용하여 DB에서 최신 사용자 정보를 가져올 수도 있음
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] } // 비밀번호는 제외하고 가져옴
            });

            if (!req.user) {
                return res.status(401).json({ success: false, message: '인증 실패: 사용자를 찾을 수 없습니다.' });
            }

            next(); // 다음 미들웨어 또는 라우터 핸들러로 진행
        } catch (error) {
            console.error('토큰 검증 오류:', error);
            return res.status(401).json({ success: false, message: '인증 실패: 유효하지 않은 토큰입니다.' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: '인증 실패: 토큰이 없습니다.' });
    }
};

module.exports = { protect };