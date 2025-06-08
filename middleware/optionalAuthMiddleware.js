const jwt = require('jsonwebtoken');
const { User } = require('../models');

const optionalProtect = async (req, res, next) => {
    let token;

    // 토큰이 헤더에 존재하는지 확인
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 토큰이 유효하면 사용자 정보를 찾아서 req.user에 추가
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }
            });
            
        } catch (error) {
            // 토큰이 유효하지 않더라도 에러를 발생시키지 않고 그냥 넘어감
            // req.user는 세팅되지 않은 상태로 남게 됨
            console.log('선택적 인증: 유효하지 않은 토큰입니다. 비로그인 상태로 처리합니다.');
        }
    }
    
    // 토큰이 있든 없든, 유효하든 안 하든 항상 next()를 호출하여 다음 단계로 진행
    next();
};

module.exports = { optionalProtect };