// userController.js 상단에 필요한 모듈 추가
const { User } = require('../models');
const bcrypt = require('bcryptjs'); // 비밀번호 암호화를 위해 bcrypt 추가
const jwt = require('jsonwebtoken'); // 필요 시 토큰 재발급을 위해

// ... 기존 registerUser, loginUser 함수 ...

// --- ★ 설정 페이지를 위한 신규 함수들 ---

// 1. 현재 사용자 프로필 가져오기
exports.getUserProfile = async (req, res) => {
    // protect 미들웨어가 req.user에 사용자 정보를 이미 담아주었음
    // 비밀번호는 제외된 상태이므로 그대로 반환하면 됨
    if (req.user) {
        res.status(200).json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email
            }
        });
    } else {
        res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
};

// 2. 사용자 프로필(이름) 업데이트
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const { username } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).json({ success: false, message: '사용자 이름을 입력해주세요.' });
        }

        if (user) {
            user.username = username;
            await user.save();
            res.status(200).json({
                success: true,
                message: '프로필이 성공적으로 업데이트되었습니다.',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } else {
            res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('프로필 업데이트 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};

// 3. 사용자 비밀번호 변경
exports.updateUserPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: '새 비밀번호는 8자 이상이어야 합니다.' });
        }
        
        // DB에서 전체 사용자 정보를 다시 가져옴 (비밀번호 포함)
        const user = await User.findByPk(req.user.id);

        if (user && (await bcrypt.compare(currentPassword, user.password))) {
            // 현재 비밀번호가 일치하면 새 비밀번호를 암호화하여 저장
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();
            
            res.status(200).json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
        } else {
            // 사용자를 찾지 못하거나 현재 비밀번호가 틀린 경우
            res.status(401).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
};