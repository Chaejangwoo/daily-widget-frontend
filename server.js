// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs'); // 비밀번호 해싱을 위한 bcryptjs
const jwt = require('jsonwebtoken'); // JWT 토큰 생성을 위한 jsonwebtoken
const db = require('./models'); // ./models/index.js 에서 내보낸 db 객체 (sequelize 인스턴스 포함)
const { protect } = require('./middleware/authMiddleware'); // 인증 미들웨어 가져오기
const newsRoutes = require('./routes/newsRoutes'); // 뉴스 라우트 불러오기
const apiRoutes = require('./routes/api');
// --- 스케줄러 시작 ---
require('./scheduler'); // scheduler.js 파일을 실행하여 cron 작업들을 등록
// --------------------
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('Daily Widget 백엔드 서버에 오신 것을 환영합니다!');
});

// ----- 라우터 연결 (회원가입 API 추가) -----

// 회원가입 API (POST /api/users/register) - DB 연동으로 수정 필요
app.post('/api/users/register', async (req, res) => { // async 추가
    const { username, email, password } = req.body;
    console.log('회원가입 요청 받음:', req.body);

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    try {
        // 이메일 중복 확인 (DB 사용)
        const existingUser = await db.User.findOne({ where: { email: email } }); // 'User' 모델 사용 (다음 단계에서 생성)
        if (existingUser) {
            return res.status(409).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
        }

        // 비밀번호 해싱 (bcryptjs 사용)
        const hashedPassword = await bcrypt.hash(password, 10); // 10은 salt rounds

        // 새 사용자 생성 (DB 사용)
        const newUser = await db.User.create({
            username,
            email,
            password: hashedPassword, // 해싱된 비밀번호 저장
        });

        res.status(201).json({
            success: true,
            message: '회원가입이 성공적으로 완료되었습니다.',
            userId: newUser.id, // 생성된 사용자의 ID
        });
    } catch (error) {
        console.error('회원가입 처리 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 회원가입에 실패했습니다.' });
    }
});

// 로그인 API (POST /api/users/login) - DB 연동 및 JWT 사용으로 수정 필요
app.post('/api/users/login', async (req, res) => { // async 추가
    const { email, password } = req.body;
    console.log('로그인 요청 받음:', req.body);

    if (!email || !password) {
        return res.status(400).json({ success: false, message: '이메일과 비밀번호를 모두 입력해주세요.' });
    }

    try {
        // 사용자 찾기 (DB 사용)
        const user = await db.User.findOne({ where: { email: email } });

        if (!user) {
            return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }

        // 비밀번호 비교 (bcryptjs 사용)
        const isMatch = await bcrypt.compare(password, user.password); // 입력된 pw와 DB의 해시된 pw 비교
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }

        // 로그인 성공: JWT 토큰 생성 (jsonwebtoken 사용)
        const payload = { id: user.id, email: user.email, username: user.username };
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // .env 파일에 JWT_SECRET 설정 필요!
            { expiresIn: '1h' } // 토큰 만료 시간 (예: 1시간)
        );

        res.status(200).json({
            success: true,
            message: '로그인 성공',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 로그인에 실패했습니다.' });
    }
});
app.get('/api/users/me', protect, async (req, res) => {
    // protect 미들웨어를 통과하면 req.user 에 사용자 정보가 들어있음
    if (req.user) {
        res.status(200).json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                interests: req.user.interests || [] // interests가 null일 경우 빈 배열
            }
        });
    } else {
        // 이 경우는 protect 미들웨어에서 이미 처리되었어야 함
        res.status(404).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' });
    }
});


// 사용자 관심사 조회 API (GET /api/users/me/interests - 인증 필요)
app.get('/api/users/me/interests', protect, async (req, res) => {
    try {
        // protect 미들웨어는 req.user에 DB에서 조회한 User 객체를 넣어줍니다.
        // User 모델에서 interests 컬럼이 JSON 타입으로 정의되어 있다면,
        // req.user.interests는 이미 JavaScript 배열이거나 null이어야 합니다.

        let userInterests = req.user.interests;

        // 만약 req.user.interests가 어떤 이유로든 문자열이라면, 여기서 파싱합니다.
        // (하지만 Sequelize JSON 타입은 보통 자동으로 파싱합니다.)
        if (userInterests && typeof userInterests === 'string') {
            try {
                userInterests = JSON.parse(userInterests);
                console.log('[백엔드] interests를 문자열에서 배열로 파싱 성공:', userInterests);
            } catch (e) {
                console.error('[백엔드] DB에서 가져온 interests 문자열 파싱 오류:', e, '원본 문자열:', req.user.interests);
                userInterests = []; // 파싱 실패 시 빈 배열로 처리
            }
        } else if (!Array.isArray(userInterests)) {
            // 배열도 아니고 문자열도 아닌 경우 (예: null, undefined) 빈 배열로 처리
            userInterests = [];
        }
        
        console.log(`[백엔드] 사용자 ID ${req.user.id}의 관심사 조회 결과 (배열이어야 함):`, userInterests);
        console.log(`[백엔드] 최종적으로 보내는 userInterests의 타입: ${typeof userInterests}, Array.isArray: ${Array.isArray(userInterests)}`);

        res.status(200).json({
            success: true,
            interests: userInterests // userInterests가 반드시 배열 형태로 전달되어야 함
        });

    } catch (error) {
        console.error('관심사 조회 중 서버 내부 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 관심사를 불러오지 못했습니다.' });
    }
});

// 5. 사용자 관심사 업데이트 API (PUT /api/users/me/interests - 인증 필요)
app.put('/api/users/me/interests', protect, async (req, res) => {
    const { interests } = req.body; // 프론트에서 보낸 관심사 배열

    if (!Array.isArray(interests)) {
        return res.status(400).json({ success: false, message: '관심사 목록은 배열이어야 합니다.' });
    }

    try {
        // protect 미들웨어에서 req.user에 사용자 정보를 넣어줌
        const user = req.user;
        user.interests = interests; // 사용자 객체의 interests 업데이트
        await user.save();          // 변경사항 DB에 저장
        console.log(`[백엔드] 사용자 ID ${user.id}의 관심사 업데이트됨:`, user.interests);
        console.log(`[백엔드] 업데이트된 interests 타입: ${typeof user.interests}`);

        res.status(200).json({
            success: true,
            message: '관심사가 성공적으로 업데이트되었습니다.',
            interests: user.interests,
        });
    } catch (error) {
        console.error('관심사 업데이트 중 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류로 관심사 업데이트에 실패했습니다.' });
    }
});
app.use('/api', apiRoutes);
app.use('/api/news', newsRoutes); // '/api/news' 경로로 들어오는 요청은 newsRoutes가 처리

// ----- 데이터베이스 연결 (나중에 추가될 부분) -----
db.sequelize.sync({ force: false }) // force: true 이면 개발 중 테이블 초기화 (주의!)
  .then(() => {
    console.log('데이터베이스 연결 및 동기화 성공.');
  })
  .catch((err) => {
    console.error('데이터베이스 연결 또는 동기화 실패:', err);
  });

// ----- 서버 실행 -----
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});