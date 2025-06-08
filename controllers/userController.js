const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Keyword, sequelize } = require('../models');
// Op는 sequelize 라이브러리에서 직접 가져와야 합니다. 이것이 올바른 방법입니다.
const { Op } = require('sequelize');
/**
 * 사용자 관심사(interests) 필드를 안전하게 배열 형태로 파싱하는 헬퍼 함수
 * @param {string | string[] | null | undefined} interests - User 모델의 interests 값
 * @returns {string[]} 파싱된 배열. 실패 시 빈 배열 반환.
 */
const parseUserInterests = (interests) => {
    // 1. interests가 없는 경우 (null, undefined) 빈 배열 반환
    if (!interests) {
        return [];
    }
    // 2. 이미 배열인 경우 그대로 반환
    if (Array.isArray(interests)) {
        return interests;
    }
    // 3. 문자열인 경우 JSON 파싱 시도
    if (typeof interests === 'string') {
        try {
            const parsed = JSON.parse(interests);
            // 파싱 결과가 배열이면 반환, 아니면 빈 배열 반환
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            // JSON 파싱 실패 시 (예: "abc" 같은 일반 문자열) 빈 배열 반환
            console.error("User interests JSON parsing error:", e);
            return [];
        }
    }
    // 4. 그 외의 모든 경우 (객체 등) 빈 배열 반환
    return [];
};


// 1. 회원가입
const registerUser = async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }
    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ success: true, message: '회원가입이 성공적으로 완료되었습니다.', userId: newUser.id });
    } catch (error) {
        console.error('회원가입 처리 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 회원가입에 실패했습니다.' });
    }
};

// 2. 로그인
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }
    try {
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }
        // User 모델 전체를 req.user에 넣으면 순환 참조 문제가 발생할 수 있으므로 필요한 정보만 payload에 담습니다.
        const payload = { id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
        
        // 프론트엔드에 전달할 사용자 정보
        const userInfo = {
            id: user.id,
            username: user.username,
            email: user.email,
            interests: parseUserInterests(user.interests) // 로그인 시에도 관심사를 파싱해서 전달
        };

        res.status(200).json({
            success: true, message: '로그인 성공', token,
            user: userInfo
        });
    } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 로그인에 실패했습니다.' });
    }
};

// 3. 내 프로필 정보 가져오기 (authMiddleware가 이미 user를 찾아 req에 넣어줌)
const getUserProfile = async (req, res) => {
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
        // 이 경우는 authMiddleware에서 이미 걸러지지만, 방어 코드로 남겨둡니다.
        res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
};

// 4. 프로필 업데이트
const updateUserProfile = async (req, res) => {
    try {
        const user = req.user; // authMiddleware가 찾아준 사용자 객체
        const { username } = req.body;
        if (!username || username.trim() === '') {
            return res.status(400).json({ success: false, message: '사용자 이름을 입력해주세요.' });
        }
        
        user.username = username;
        await user.save();
        
        const updatedUserInfo = { id: user.id, username: user.username, email: user.email };
        
        res.status(200).json({
            success: true, message: '프로필이 업데이트되었습니다.',
            user: updatedUserInfo
        });

    } catch (error) {
        console.error("프로필 업데이트 중 오류:", error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};

// 5. 비밀번호 변경
const updateUserPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 6) { // 비밀번호 길이 정책에 맞게 조절
            return res.status(400).json({ success: false, message: '입력값을 확인해주세요. 새 비밀번호는 6자 이상이어야 합니다.' });
        }

        const user = req.user; // authMiddleware가 찾아준 사용자 객체
        
        if (await bcrypt.compare(currentPassword, user.password)) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            res.status(200).json({ success: true, message: '비밀번호가 변경되었습니다.' });
        } else {
            res.status(401).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
        }
    } catch (error) {
        console.error("비밀번호 변경 중 오류:", error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};

// 6. 내 관심사 가져오기
const getUserInterests = async (req, res) => {
    try {
        // ★★★ 수정된 부분 ★★★
        // req.user.interests가 문자열일 수 있으므로, 안전하게 파싱하는 헬퍼 함수를 사용합니다.
        const userInterests = parseUserInterests(req.user.interests);

        console.log(`[Backend] 사용자 ID ${req.user.id}의 관심사 조회 결과:`, userInterests);
        
        res.status(200).json({
            success: true,
            interests: userInterests // 'interests' 키로 항상 배열을 반환
        });
    } catch (error) {
        console.error('관심사 조회 중 서버 내부 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};

// 7. 내 관심사 업데이트
const updateUserInterests = async (req, res) => {
    const { interests } = req.body;
    if (!Array.isArray(interests)) {
        return res.status(400).json({ success: false, message: '관심사 목록은 배열이어야 합니다.' });
    }
    try {
        const user = req.user; // authMiddleware가 찾아준 사용자 객체
        // DB에 저장할 때는 JSON 문자열로 저장하는 것이 일반적입니다. (모델 정의에 따라 다름)
        // Sequelize의 JSON 타입은 자동으로 처리해주므로, 배열 그대로 저장해도 됩니다.
        user.interests = interests;
        await user.save();
        res.status(200).json({ success: true, message: '관심사가 업데이트되었습니다.', interests: user.interests });
    } catch (error) {
        console.error("관심사 업데이트 중 오류:", error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
};

// 8. 추천 키워드 가져오기
const getRecommendedKeywords = async (req, res, next) => {
    try {
        // ★★★ 수정된 부분 ★★★
        // req.user.interests를 안전하게 파싱하여 항상 배열을 반환받도록 합니다.
        // 이렇게 하면 userInterests는 절대 문자열이나 null이 될 수 없습니다.
        const userInterests = parseUserInterests(req.user.interests);

        // 사용자의 관심사가 없는 경우의 로직
        if (userInterests.length === 0) {
            const popularKeywords = await Keyword.findAll({
                attributes: ['keywordText', [sequelize.fn('COUNT', sequelize.col('keywordText')), 'count']],
                group: ['keywordText'],
                order: [[sequelize.col('count'), 'DESC']],
                limit: 5,
                raw: true
            });
            const topics = popularKeywords.map(k => k.keywordText);
            return res.status(200).json({ success: true, keywords: topics });
        }

        // --- 사용자의 관심사가 있는 경우의 로직 ---

        // 1. 사용자의 관심사와 관련된 뉴스 기사 ID들을 찾습니다.
        // userInterests가 항상 배열이므로 [Op.in]은 안전하게 동작합니다.
        const relatedArticles = await Keyword.findAll({
            where: {
                keywordText: {
                    [Op.in]: userInterests
                }
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('articleId')), 'articleId']],
            raw: true
        });

        const articleIds = relatedArticles.map(k => k.articleId);

        if (articleIds.length === 0) {
            return res.status(200).json({ success: true, keywords: [] });
        }

        // 2. 해당 기사들에 포함된 모든 키워드 중, 빈도수 높은 순으로 추천
        const coOccurringKeywords = await Keyword.findAll({
            where: {
                articleId: {
                    [Op.in]: articleIds
                },
                // 3. 사용자가 이미 관심사로 등록한 키워드는 제외
                keywordText: {
                    [Op.notIn]: userInterests
                }
            },
            attributes: ['keywordText', [sequelize.fn('COUNT', sequelize.col('keywordText')), 'count']],
            group: ['keywordText'],
            order: [[sequelize.col('count'), 'DESC']],
            limit: 5,
            raw: true
        });
        
        const recommendedKeywords = coOccurringKeywords.map(k => k.keywordText);

        res.status(200).json({ success: true, keywords: recommendedKeywords });

    } catch (error) {
        console.error('추천 키워드 생성 중 오류:', error);
        next(error); // 에러를 Express의 다음 미들웨어로 전달
    }
};

// 모든 함수를 exports 객체에 담아서 내보냅니다.
module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    getUserInterests,
    updateUserInterests,
    getRecommendedKeywords
};