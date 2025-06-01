// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan'); // 개발용 로그 라이브러리

dotenv.config(); // .env 파일의 환경 변수를 process.env로 로드

const app = express(); // Express 애플리케이션 생성

// 포트 설정 (환경 변수 PORT가 있으면 사용하고, 없으면 5001번 사용)
const PORT = process.env.PORT || 5001;

// ----- 미들웨어 설정 -----
app.use(cors()); // CORS 미들웨어: 모든 도메인에서의 요청을 허용 (개발 초기 설정)
                 // 배포 시에는 특정 도메인만 허용하도록 설정하는 것이 좋습니다.
                 // 예: app.use(cors({ origin: 'http://localhost:3000' }));

app.use(express.json()); // 요청 본문(body)을 JSON 형태로 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true })); // URL-encoded 형태의 요청 본문 파싱

app.use(morgan('dev')); // HTTP 요청 로그를 콘솔에 출력하는 미들웨어 (개발 시 유용)
                       // 'combined', 'short' 등 다른 포맷도 사용 가능

// ----- 기본 라우트 (테스트용) -----
app.get('/', (req, res) => {
    res.send('Daily Widget 백엔드 서버에 오신 것을 환영합니다!');
});

// ----- 라우터 연결 (나중에 추가될 부분) -----
// 예시:
// const userRoutes = require('./routes/userRoutes');
// const newsRoutes = require('./routes/newsRoutes');
//
// app.use('/api/users', userRoutes); // '/api/users' 경로로 오는 요청은 userRoutes가 처리
// app.use('/api/news', newsRoutes);   // '/api/news' 경로로 오는 요청은 newsRoutes가 처리

// ----- 데이터베이스 연결 (나중에 추가될 부분, MySQL & Sequelize 예시) -----
/*
const { sequelize } = require('./models'); // ./models/index.js 에서 sequelize 인스턴스를 가져옴 (나중에 생성할 파일)

sequelize.sync({ force: false }) // force: true 이면 기존 테이블 삭제 후 재생성 (개발 초기 유용)
  .then(() => {
    console.log('데이터베이스 연결 성공');
  })
  .catch((err) => {
    console.error('데이터베이스 연결 실패:', err);
  });
*/

// ----- 서버 실행 -----
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});