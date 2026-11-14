/* =========================================================
   오늘러닝 — 예시 데이터
   시범 화면을 보여 주기 위한 예시입니다. 크루·모임·매장·대회 이름과
   위치, 경로는 실제와 다를 수 있습니다. 실제 서비스에서는 서버(API)에서 불러옵니다.
   ========================================================= */
(function () {
  'use strict';

  // 위경도 계산 도우미: 중심점 기준 타원 경로(순환 코스 예시)
  function loop(lat, lng, rxM, ryM, rotDeg, n) {
    const pts = [];
    const rot = (rotDeg || 0) * Math.PI / 180;
    const mLat = 111320;
    const mLng = 111320 * Math.cos(lat * Math.PI / 180);
    n = n || 28;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const x = rxM * Math.cos(t), y = ryM * Math.sin(t);
      const xr = x * Math.cos(rot) - y * Math.sin(rot);
      const yr = x * Math.sin(rot) + y * Math.cos(rot);
      pts.push([+(lat + yr / mLat).toFixed(6), +(lng + xr / mLng).toFixed(6)]);
    }
    return pts;
  }
  // 직선 구간을 이어 만든 왕복 경로
  function outBack(points) {
    return points.concat(points.slice(0, -1).reverse());
  }

  const hubs = [
    { id: 'yeouido', region: '서울', name: '여의도 한강공원', lat: 37.5281, lng: 126.9338 },
    { id: 'banpo', region: '서울', name: '반포 한강공원', lat: 37.5103, lng: 126.9955 },
    { id: 'seokchon', region: '서울', name: '석촌호수·올림픽공원', lat: 37.5093, lng: 127.1012 },
    { id: 'seoulforest', region: '서울', name: '서울숲·성수', lat: 37.5443, lng: 127.0374 },
    { id: 'mangwon', region: '서울', name: '망원 한강공원', lat: 37.5553, lng: 126.8946 },
    { id: 'gwanggyo', region: '경기', name: '수원 광교호수공원', lat: 37.2838, lng: 127.0652 },
    { id: 'tancheon', region: '경기', name: '성남 탄천(정자)', lat: 37.3665, lng: 127.1095 },
    { id: 'ilsan', region: '경기', name: '고양 일산호수공원', lat: 37.6565, lng: 126.7660 },
    { id: 'gwangalli', region: '부산', name: '광안리·수영강', lat: 35.1532, lng: 129.1186 },
    { id: 'oncheon', region: '부산', name: '온천천·동래', lat: 35.2010, lng: 129.0830 },
    { id: 'haeundae', region: '부산', name: '해운대', lat: 35.1587, lng: 129.1604 },
    { id: 'bukhang', region: '부산', name: '북항 친수공원', lat: 35.1120, lng: 129.0460 },
    { id: 'jeju', region: '제주', name: '제주 이호테우 해안', lat: 33.4975, lng: 126.4530 },
  ];

  const crews = [
    { id: 'c1', name: '한강러너스', hubId: 'yeouido', members: 124, since: 2019, schedule: '화·목 19:30 정기런', paces: "5'30\"~7'30\"", beginner: true, manner: true,
      intro: '여의도 한강공원에서 화요일과 목요일 저녁에 달립니다. 페이스별로 다섯 명 이하 소그룹으로 나눠 2분 간격으로 출발해요. 처음 오신 분은 C그룹에서 시작하시면 됩니다.',
      tags: ['소그룹 운영', '입문 환영', '귀환 확인'], notices: ['12월 장거리런은 반포로 장소가 바뀝니다.', '겨울철에는 장갑과 반사 조끼를 챙겨 주세요.'] },
    { id: 'c2', name: '성수 새벽런', hubId: 'seoulforest', members: 38, since: 2022, schedule: '수·금 06:30', paces: "5'00\"~6'30\"", beginner: false, manner: true,
      intro: '출근 전 서울숲 한 바퀴. 끝나면 근처 러너 프렌들리 카페에서 커피 한 잔 하고 흩어집니다.',
      tags: ['새벽', '카페 제휴'], notices: ['피니시 카페 서울숲에 크루 보관함 6자리가 생겼습니다.'] },
    { id: 'c3', name: '석촌 레이크런', hubId: 'seokchon', members: 56, since: 2021, schedule: '토 07:00', paces: "5'30\"~7'00\"", beginner: true, manner: true,
      intro: '석촌호수와 올림픽공원을 오가는 주말 아침 모임입니다. 호수 둘레길에서는 반드시 소그룹으로 나눠 조용히 달립니다.',
      tags: ['주말', '소그룹 운영', '장소 규칙 준수'], notices: ['호수 둘레길은 단체 달리기 자제 안내가 있습니다. 4명 이하로 나눠 출발합니다.'] },
    { id: 'c4', name: '반포 문라이트', hubId: 'banpo', members: 42, since: 2023, schedule: '월 20:00', paces: "6'00\"~7'30\"", beginner: true, manner: false,
      intro: '월요일 밤 반포에서 잠수교를 건너는 6km 회복런. 한 주를 가볍게 시작해요.', tags: ['야간', '회복런'], notices: [] },
    { id: 'c5', name: '광교 레이크러너스', hubId: 'gwanggyo', members: 61, since: 2020, schedule: '화 20:00 · 일 07:00', paces: "5'00\"~7'30\"", beginner: true, manner: true,
      intro: '광교호수공원 원천호수를 돕니다. 평일 저녁은 짧게, 일요일 아침은 길게 달려요.', tags: ['입문 환영', '장거리'], notices: ['일요일 장거리런 급수는 6km 지점 매점 앞입니다.'] },
    { id: 'c6', name: '탄천 슬로우런', hubId: 'tancheon', members: 33, since: 2024, schedule: '목 20:00', paces: "7'00\"~8'30\"", beginner: true, manner: true,
      intro: '대화가 되는 속도로 천천히 달리는 모임입니다. 기록보다 꾸준함이 목표예요.', tags: ['슬로우런', '입문 환영'], notices: [] },
    { id: 'c7', name: '일산 호수크루', hubId: 'ilsan', members: 47, since: 2021, schedule: '토 07:30', paces: "5'30\"~7'00\"", beginner: false, manner: true,
      intro: '일산호수공원 한 바퀴(약 4.5km)를 기본으로 주 1회 모입니다.', tags: ['주말'], notices: [] },
    { id: 'c8', name: '광안 선셋런', hubId: 'gwangalli', members: 58, since: 2022, schedule: '수 19:30', paces: "5'30\"~7'00\"", beginner: true, manner: true,
      intro: '광안리 해변과 수영강변을 달리는 수요일 저녁 모임. 끝나고 바다 보며 쿨다운합니다.', tags: ['해변', '입문 환영'], notices: [] },
    { id: 'c9', name: '온천천 러닝클럽', hubId: 'oncheon', members: 40, since: 2020, schedule: '화 20:00', paces: "5'30\"~7'30\"", beginner: true, manner: true,
      intro: '온천천 산책로를 왕복합니다. 보행자가 많아 두 줄 이하로 달려요.', tags: ['평일 저녁'], notices: [] },
    { id: 'c10', name: '해운대 모닝런', hubId: 'haeundae', members: 35, since: 2023, schedule: '일 06:30', paces: "5'00\"~6'30\"", beginner: false, manner: true,
      intro: '해운대 해변에서 동백섬을 한 바퀴 돌고 돌아오는 일요일 아침 모임.', tags: ['새벽', '해변'], notices: [] },
  ];

  // 모임: weekday(0=일)와 time으로 다음 일정을 계산. offsetDays가 있으면 오늘 기준 며칠 뒤 한 번만.
  const G = (name, pace, cap, filled) => ({ name, pace, cap, filled });
  const meetups = [
    { id: 'm1', crewId: 'c1', title: '화요 정기런 5km', kind: '정기', weekday: 2, time: '19:30', hubId: 'yeouido', place: '여의나루역 2번 출구 앞 광장', distance: 5, courseId: 'k1', level: '중급',
      groups: [G('A', "5'30\"", 5, 5), G('B', "6'30\"", 5, 4), G('C', "7'30\"", 5, 2)], beginner: true, guest: true, note: '보행자가 많은 구간입니다. 5명 이하 소그룹으로 나눠 2분 간격으로 출발합니다.' },
    { id: 'm2', crewId: 'c1', title: '목요 정기런 10km', kind: '정기', weekday: 4, time: '19:30', hubId: 'yeouido', place: '여의나루역 2번 출구 앞 광장', distance: 10, courseId: 'k1', level: '중급',
      groups: [G('A', "5'30\"", 5, 3), G('B', "6'30\"", 5, 5), G('C', "7'30\"", 5, 1)], beginner: true, guest: true, note: '' },
    { id: 'm3', crewId: 'c2', title: '서울숲 새벽 한 바퀴', kind: '정기', weekday: 3, time: '06:30', hubId: 'seoulforest', place: '서울숲 정문 앞', distance: 5, courseId: 'k3', level: '중급',
      groups: [G('A', "5'15\"", 5, 3), G('B', "6'15\"", 5, 2)], beginner: false, guest: true, note: '끝나고 피니시 카페 서울숲에서 인증 할인을 받을 수 있어요.' },
    { id: 'm4', crewId: 'c3', title: '토요 석촌호수 소그룹런', kind: '정기', weekday: 6, time: '07:00', hubId: 'seokchon', place: '석촌호수 서호 입구', distance: 5, courseId: 'k2', level: '초중급',
      groups: [G('A', "5'45\"", 4, 4), G('B', "6'30\"", 4, 3), G('C', "7'15\"", 4, 1)], beginner: true, guest: false, note: '호수 둘레길은 4명 이하로 나눠 3분 간격 출발. 박수·구호 없이 조용히 달립니다.' },
    { id: 'm5', crewId: 'c4', title: '월요 반포 회복런', kind: '정기', weekday: 1, time: '20:00', hubId: 'banpo', place: '반포 한강공원 달빛광장', distance: 6, courseId: 'k4', level: '초중급',
      groups: [G('A', "6'15\"", 5, 2), G('B', "7'15\"", 5, 3)], beginner: true, guest: true, note: '' },
    { id: 'm6', crewId: 'c5', title: '일요 광교 장거리 12km', kind: '정기', weekday: 0, time: '07:00', hubId: 'gwanggyo', place: '광교호수공원 원천호수 주차장 앞', distance: 12, courseId: 'k5', level: '중상급',
      groups: [G('A', "5'15\"", 5, 4), G('B', "6'00\"", 5, 5), G('C', "6'45\"", 5, 2)], beginner: false, guest: true, note: '6km 지점 급수. 개인 물병을 꼭 챙겨 주세요.' },
    { id: 'm7', crewId: 'c6', title: '목요 탄천 슬로우런', kind: '정기', weekday: 4, time: '20:00', hubId: 'tancheon', place: '정자역 4번 출구 탄천 진입로', distance: 5, courseId: null, level: '입문',
      groups: [G('A', "7'30\"", 5, 3), G('B', "8'15\"", 5, 2)], beginner: true, guest: true, note: '대화가 되는 속도로 달립니다. 처음 오시는 분 환영해요.' },
    { id: 'm8', crewId: 'c7', title: '토요 일산호수 한 바퀴', kind: '정기', weekday: 6, time: '07:30', hubId: 'ilsan', place: '일산호수공원 노래하는 분수대 앞', distance: 4.5, courseId: 'k6', level: '중급',
      groups: [G('A', "5'45\"", 5, 3), G('B', "6'40\"", 5, 4)], beginner: false, guest: true, note: '' },
    { id: 'm9', crewId: 'c8', title: '수요 광안 선셋런', kind: '정기', weekday: 3, time: '19:30', hubId: 'gwangalli', place: '광안리 해변 만남의 광장', distance: 6, courseId: 'k8', level: '초중급',
      groups: [G('A', "5'45\"", 5, 5), G('B', "6'30\"", 5, 3), G('C', "7'15\"", 5, 2)], beginner: true, guest: true, note: '' },
    { id: 'm10', crewId: 'c9', title: '화요 온천천 왕복 7km', kind: '정기', weekday: 2, time: '20:00', hubId: 'oncheon', place: '온천천 시민공원 연안교 아래', distance: 7, courseId: 'k7', level: '초중급',
      groups: [G('A', "6'00\"", 5, 2), G('B', "7'00\"", 5, 3)], beginner: true, guest: true, note: '보행자가 많아 두 줄 이하로 달립니다.' },
    { id: 'm11', crewId: 'c10', title: '일요 해운대·동백섬', kind: '정기', weekday: 0, time: '06:30', hubId: 'haeundae', place: '해운대 해변 이벤트 광장', distance: 5, courseId: 'k9', level: '중급',
      groups: [G('A', "5'15\"", 5, 3), G('B', "6'15\"", 5, 2)], beginner: false, guest: true, note: '' },
    { id: 'm12', crewId: 'c1', title: '입문 환영런 5km', kind: '입문', offsetDays: 3, time: '10:00', hubId: 'yeouido', place: '여의나루역 2번 출구 앞 광장', distance: 5, courseId: 'k1', level: '입문',
      groups: [G('입문', "7'30\"", 8, 3), G('걷뛰', "8'30\"", 6, 2)], beginner: true, guest: true, note: '걷기와 달리기를 섞어 5km를 완주합니다. 운영진 두 명이 함께 달려요.' },
    { id: 'm13', crewId: null, host: '러너 지수', title: '망원 한강 번개런', kind: '번개', offsetDays: 1, time: '20:30', hubId: 'mangwon', place: '망원 한강공원 수영장 앞', distance: 6, courseId: null, level: '초중급',
      groups: [G('번개', "6'30\"", 5, 2)], beginner: true, guest: true, note: '퇴근 후 가볍게 6km. 끝나면 바로 해산해요.' },
    { id: 'm14', crewId: null, host: '러너 도윤', title: '북항 친수공원 야간 번개', kind: '번개', offsetDays: 2, time: '21:00', hubId: 'bukhang', place: '북항 친수공원 마당', distance: 5, courseId: null, level: '중급',
      groups: [G('번개', "5'45\"", 5, 3)], beginner: false, guest: true, note: '' },
  ];

  const courses = [
    { id: 'k1', name: '여의도 한강 왕복', hubId: 'yeouido', type: '왕복', elev: 8, surface: '아스팔트', night: true, rep: true,
      facilities: { wc: 3, aed: 2, water: 1, locker: 1 }, rule: '물빛광장 주변은 보행자가 많아 소그룹 운영을 권장합니다.',
      path: outBack([[37.5281, 126.9338], [37.5297, 126.9311], [37.5313, 126.9284], [37.5329, 126.9257], [37.5345, 126.9230], [37.5361, 126.9203], [37.5377, 126.9176], [37.5389, 126.9154], [37.5401, 126.9131], [37.5413, 126.9108], [37.5425, 126.9085]]) },
    { id: 'k2', name: '석촌호수 서호 한 바퀴', hubId: 'seokchon', type: '순환', elev: 4, surface: '우레탄', night: true, rep: true,
      facilities: { wc: 2, aed: 1, water: 1, locker: 0 }, rule: '둘레길 단체 달리기 자제 안내가 있습니다. 4명 이하로 나눠 조용히 달려 주세요.',
      path: loop(37.5088, 127.0985, 330, 165, -18, 30) },
    { id: 'k3', name: '서울숲 순환', hubId: 'seoulforest', type: '순환', elev: 10, surface: '흙길·포장', night: false, rep: true,
      facilities: { wc: 4, aed: 2, water: 2, locker: 0 }, rule: '숲길 구간은 자전거 진입 금지, 보행자 우선.',
      path: loop(37.5445, 127.0392, 470, 300, 25, 32) },
    { id: 'k4', name: '반포·잠수교 순환', hubId: 'banpo', type: '순환', elev: 14, surface: '아스팔트', night: true, rep: true,
      facilities: { wc: 3, aed: 2, water: 1, locker: 1 }, rule: '잠수교는 보행로 폭이 좁습니다. 한 줄로 건너 주세요.',
      path: loop(37.5140, 126.9965, 1350, 430, 12, 40) },
    { id: 'k5', name: '광교 원천호수 순환', hubId: 'gwanggyo', type: '순환', elev: 12, surface: '우레탄', night: true, rep: true,
      facilities: { wc: 3, aed: 1, water: 1, locker: 0 }, rule: '',
      path: loop(37.2838, 127.0652, 520, 300, 30, 32) },
    { id: 'k6', name: '일산호수공원 한 바퀴', hubId: 'ilsan', type: '순환', elev: 5, surface: '우레탄', night: true, rep: true,
      facilities: { wc: 5, aed: 2, water: 2, locker: 1 }, rule: '',
      path: loop(37.6565, 126.7660, 950, 420, -35, 40) },
    { id: 'k7', name: '온천천 왕복', hubId: 'oncheon', type: '왕복', elev: 6, surface: '포장', night: true, rep: true,
      facilities: { wc: 4, aed: 1, water: 0, locker: 0 }, rule: '산책로 폭이 좁은 구간이 많아 두 줄 이하로 달립니다.',
      path: outBack([[35.2010, 129.0830], [35.1990, 129.0870], [35.1968, 129.0905], [35.1945, 129.0938], [35.1922, 129.0972], [35.1900, 129.1005], [35.1880, 129.1040], [35.1862, 129.1076], [35.1848, 129.1112], [35.1835, 129.1148]]) },
    { id: 'k8', name: '광안리 해변 왕복', hubId: 'gwangalli', type: '왕복', elev: 2, surface: '포장', night: true, rep: true,
      facilities: { wc: 4, aed: 2, water: 1, locker: 1 }, rule: '여름철 해변 행사 기간에는 우회 경로를 이용하세요.',
      path: outBack([[35.1583, 129.1135], [35.1560, 129.1157], [35.1540, 129.1180], [35.1522, 129.1205], [35.1508, 129.1232], [35.1497, 129.1260], [35.1490, 129.1290]]) },
    { id: 'k9', name: '해운대·동백섬 순환', hubId: 'haeundae', type: '순환', elev: 18, surface: '포장·데크', night: true, rep: true,
      facilities: { wc: 3, aed: 2, water: 1, locker: 1 }, rule: '동백섬 데크길은 한 줄로 달려 주세요.',
      path: loop(35.1560, 129.1550, 620, 260, 10, 30) },
  ];

  // 매장 시설: 화장실, 물, 짐 보관, 탈의실, 샤워, 주차
  const stores = [
    { id: 's1', name: '카페 트랙라인', type: '카페', hubId: 'yeouido', lat: 37.5262, lng: 126.9305, addr: '서울 영등포구 여의도동 (예시)', open: '07:00', close: '22:00', closedDay: '',
      benefit: { title: '러닝 인증 시 음료 1,000원 할인', cond: '당일 3km 이상', limit: '하루 1회' }, storage: { cap: 12, used: 7, size: '백팩·운동가방', free: true },
      amen: ['화장실', '물', '짐 보관', '탈의실'], crew: 'c1', rating: 4.8, reviews: 37,
      news: ['목요일 정기런 끝나고 오시는 분께 바나나를 드려요.'], founding: true },
    { id: 's2', name: '반포 레인커피', type: '카페', hubId: 'banpo', lat: 37.5089, lng: 126.9938, addr: '서울 서초구 반포동 (예시)', open: '08:00', close: '23:00', closedDay: '월',
      benefit: { title: '아메리카노 20% 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 8, used: 8, size: '백팩', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c4', rating: 4.6, reviews: 21, news: [], founding: true },
    { id: 's3', name: '피니시 카페 서울숲', type: '카페', hubId: 'seoulforest', lat: 37.5458, lng: 127.0418, addr: '서울 성동구 성수동1가 (예시)', open: '06:30', close: '21:00', closedDay: '',
      benefit: { title: '러닝 인증 시 음료 1,500원 할인', cond: '당일 3km 이상', limit: '하루 1회' }, storage: { cap: 10, used: 3, size: '백팩·운동가방', free: true },
      amen: ['화장실', '물', '짐 보관', '탈의실'], crew: 'c2', rating: 4.9, reviews: 52,
      news: ['화요일 저녁 7시 매장 주최 런이 있어요. 5km 입문 환영.'], founding: true },
    { id: 's4', name: '스플릿 로스터스', type: '카페', hubId: 'seokchon', lat: 37.5068, lng: 127.1003, addr: '서울 송파구 석촌동 (예시)', open: '07:30', close: '22:00', closedDay: '',
      benefit: { title: '음료 사이즈 업', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 6, used: 2, size: '백팩', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c3', rating: 4.7, reviews: 18, news: [], founding: true },
    { id: 's5', name: '러닝 스토어 페이스랩', type: '러닝 용품', hubId: 'seoulforest', lat: 37.5431, lng: 127.0447, addr: '서울 성동구 성수동2가 (예시)', open: '11:00', close: '21:00', closedDay: '',
      benefit: { title: '러닝 양말·젤 10% 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 15, used: 4, size: '캐리어까지', free: true },
      amen: ['화장실', '물', '짐 보관', '탈의실', '샤워'], crew: null, rating: 4.8, reviews: 29, news: ['토요일 오전 러닝화 시착 런을 엽니다.'], founding: false },
    { id: 's6', name: '망원 쿨다운', type: '카페', hubId: 'mangwon', lat: 37.5560, lng: 126.9008, addr: '서울 마포구 망원동 (예시)', open: '09:00', close: '22:30', closedDay: '화',
      benefit: { title: '스무디 1,000원 할인', cond: '당일 5km 이상', limit: '하루 1회' }, storage: { cap: 0, used: 0, size: '', free: false },
      amen: ['화장실', '물'], crew: null, rating: 4.4, reviews: 9, news: [], founding: false },
    { id: 's7', name: '광교 레이크 카페', type: '카페', hubId: 'gwanggyo', lat: 37.2858, lng: 127.0618, addr: '경기 수원시 영통구 하동 (예시)', open: '07:00', close: '22:00', closedDay: '',
      benefit: { title: '러닝 인증 시 음료 10% 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 10, used: 5, size: '백팩·운동가방', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c5', rating: 4.7, reviews: 24, news: [], founding: true },
    { id: 's8', name: '탄천 페이스 커피', type: '카페', hubId: 'tancheon', lat: 37.3672, lng: 127.1078, addr: '경기 성남시 분당구 정자동 (예시)', open: '07:00', close: '21:00', closedDay: '일',
      benefit: { title: '아메리카노 1,000원 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 6, used: 1, size: '백팩', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c6', rating: 4.6, reviews: 12, news: [], founding: true },
    { id: 's9', name: '일산 호수 쉼표', type: '카페', hubId: 'ilsan', lat: 37.6588, lng: 126.7702, addr: '경기 고양시 일산동구 장항동 (예시)', open: '08:00', close: '22:00', closedDay: '',
      benefit: { title: '음료 1,000원 할인', cond: '당일 3km 이상', limit: '하루 1회' }, storage: { cap: 8, used: 6, size: '백팩', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c7', rating: 4.5, reviews: 15, news: [], founding: true },
    { id: 's10', name: '광안 오션런 카페', type: '카페', hubId: 'gwangalli', lat: 35.1545, lng: 129.1172, addr: '부산 수영구 광안동 (예시)', open: '08:00', close: '24:00', closedDay: '',
      benefit: { title: '러닝 인증 시 음료 1,500원 할인', cond: '당일 3km 이상', limit: '하루 1회' }, storage: { cap: 14, used: 9, size: '백팩·운동가방', free: true },
      amen: ['화장실', '물', '짐 보관', '탈의실'], crew: 'c8', rating: 4.8, reviews: 41, news: ['수요일 선셋런 참가자는 보관함 우선 배정.'], founding: true },
    { id: 's11', name: '온천천 급수대 카페', type: '카페', hubId: 'oncheon', lat: 35.2002, lng: 129.0858, addr: '부산 동래구 온천동 (예시)', open: '07:00', close: '22:00', closedDay: '',
      benefit: { title: '물 무료 + 음료 10% 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 6, used: 2, size: '백팩', free: true },
      amen: ['화장실', '물', '짐 보관'], crew: 'c9', rating: 4.6, reviews: 19, news: [], founding: true },
    { id: 's12', name: '해운대 모닝브루', type: '카페', hubId: 'haeundae', lat: 35.1598, lng: 129.1588, addr: '부산 해운대구 우동 (예시)', open: '06:00', close: '20:00', closedDay: '',
      benefit: { title: '러닝 인증 시 음료 1,000원 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 10, used: 4, size: '백팩·운동가방', free: true },
      amen: ['화장실', '물', '짐 보관', '샤워'], crew: 'c10', rating: 4.7, reviews: 33, news: [], founding: true },
    { id: 's13', name: '이호테우 러너스 라운지', type: '카페', hubId: 'jeju', lat: 33.4980, lng: 126.4542, addr: '제주 제주시 이호일동 (예시)', open: '08:00', close: '20:00', closedDay: '수',
      benefit: { title: '여행 러너 음료 1,000원 할인', cond: '당일 러닝 기록', limit: '하루 1회' }, storage: { cap: 12, used: 3, size: '캐리어까지', free: false, fee: '캐리어 3,000원' },
      amen: ['화장실', '물', '짐 보관', '탈의실', '샤워'], crew: null, rating: 4.9, reviews: 27, news: ['여행 중 러닝하시는 분, 캐리어도 맡아 드려요.'], founding: false },
  ];

  // 대회: 모두 예시(실제 대회 일정은 주최 측 공지를 확인)
  const races = [
    { id: 'r1', name: '한강 겨울 10K (예시)', date: '2026-12-13', region: '서울', place: '여의도 한강공원', dist: ['5K', '10K'], regOpen: '2026-10-20', regClose: '2026-11-30', fee: '35,000원' },
    { id: 'r2', name: '해운대 새해 첫 달리기 (예시)', date: '2027-01-01', region: '부산', place: '해운대 해변', dist: ['5K'], regOpen: '2026-11-10', regClose: '2026-12-20', fee: '20,000원' },
    { id: 'r3', name: '광교 호수 하프 (예시)', date: '2027-03-07', region: '경기', place: '광교호수공원', dist: ['10K', '하프'], regOpen: '2026-12-01', regClose: '2027-02-10', fee: '45,000원' },
    { id: 'r4', name: '서울 봄 강변 마라톤 (예시)', date: '2027-03-21', region: '서울', place: '잠실 일대', dist: ['10K', '하프', '풀'], regOpen: '2026-11-25', regClose: '2027-01-15', fee: '60,000원' },
    { id: 'r5', name: '온천천 벚꽃런 (예시)', date: '2027-04-04', region: '부산', place: '온천천 시민공원', dist: ['5K', '10K'], regOpen: '2027-01-05', regClose: '2027-03-10', fee: '30,000원' },
    { id: 'r6', name: '일산 호수 10K (예시)', date: '2027-04-18', region: '경기', place: '일산호수공원', dist: ['5K', '10K'], regOpen: '2027-01-20', regClose: '2027-03-31', fee: '35,000원' },
    { id: 'r7', name: '부산 바다 하프 (예시)', date: '2027-05-09', region: '부산', place: '광안리 일대', dist: ['10K', '하프'], regOpen: '2027-02-01', regClose: '2027-04-05', fee: '50,000원' },
  ];

  // 시설(지도 레이어 예시): hubId별 상대 위치
  const facilities = [];
  const facKinds = [['WC', 'wc'], ['AED', 'aed'], ['보관', 'locker'], ['급수', 'water']];
  hubs.forEach((h, i) => {
    facKinds.forEach(([label, kind], j) => {
      const a = (i * 47 + j * 83) % 360 * Math.PI / 180;
      const r = 0.0028 + (j % 2) * 0.0016;
      facilities.push({ hubId: h.id, kind, label, lat: +(h.lat + Math.sin(a) * r).toFixed(6), lng: +(h.lng + Math.cos(a) * r * 1.25).toFixed(6) });
    });
  });

  const principles = [
    { t: '공공 보행로에서는 5명 이하로 나눠 달리고, 그룹 사이에 간격을 둡니다.', a: '6명 이상 모임은 소그룹 편성을 기본으로 보여 주고 출발 간격을 안내합니다.' },
    { t: '보행자가 먼저입니다. 나란히는 두 줄까지, 좁은 길은 한 줄로.', a: '모임 안내문 기본 문구에 넣습니다.' },
    { t: '소리치지 않습니다. 박수·구호·“비켜요” 대신 조용히 지나갑니다.', a: '참가 동의 항목에 넣습니다.' },
    { t: '웃옷은 입고 달립니다.', a: '공원 안내 사항을 참가 동의 항목에 넣습니다.' },
    { t: '사진은 통행에 방해되지 않는 곳에서, 찍히는 사람의 동의를 받아 찍습니다.', a: '사진 태그·게시 동의 기능을 둡니다.' },
    { t: '시설 규칙이 먼저입니다.', a: '장소 규칙을 지도에 보여 주고, 규칙과 맞지 않는 모임 설정에는 경고합니다.' },
    { t: '아무것도 남기지 않습니다.', a: '물병·쓰레기 회수를 안내합니다.' },
  ];

  window.TR_DATA = { hubs, crews, meetups, courses, stores, races, facilities, principles };
})();
