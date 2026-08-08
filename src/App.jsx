import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, Swords, TrendingUp, Check, ChevronRight, RotateCcw, Play, ArrowLeftRight, User, Coins } from 'lucide-react';

/* ============================== 상수 ============================== */

const POSITIONS = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const POS_LABEL = { TOP: '탑', JGL: '정글', MID: '미드', ADC: '원딜', SUP: '서포터' };
const POS_COLOR = { TOP: '#F59E0B', JGL: '#10B981', MID: '#8B5CF6', ADC: '#EC4899', SUP: '#38BDF8' };
const REGIONS = ['한국', '중국', '유럽/중동/아프리카', '아시아/오세아니아', '아메리카/카브리해', '남아메리카'];

const PREFIXES = ['Silent', 'Blaze', 'Frost', 'Shadow', 'Storm', 'Crimson', 'Iron', 'Ghost', 'Solar', 'Lunar', 'Vortex', 'Echo', 'Radiant', 'Obsidian', 'Zenith', 'Toxic', 'Swift', 'Grim', 'Azure', 'Golden'];
const SUFFIXES = ['Fox', 'Wolf', 'Falcon', 'Phoenix', 'Reaper', 'Blade', 'Striker', 'Knight', 'Ranger', 'Specter', 'Hawk', 'Viper', 'Drake', 'Sentinel', 'Nova', 'Fang', 'Storm', 'Edge', 'Soul', 'King'];

const CHAMPIONS = {
  TOP: ['가렌', '다리우스', '카밀', '레넥톤', '오른', '피오라', '나서스', '잭스', '세트', '아트록스', '쉔', '말파이트', '우디르', '볼리베어', '케넨', '신지드', '초가스', '트린다미어', '이렐리아', '럼블', '그웬', '크산테', '사이온', '퀸', '뽀삐', '우르곳', '스웨인'],
  JGL: ['리 신', '비에고', '자르반 4세', '다이애나', '세주아니', '그레이브즈', '니달리', '킨드레드', '헤카림', '릴리아', '엘리스', '카직스', '렝가', '녹턴', '워윅', '아무무', '자크', '벨베스', '판테온', '문도 박사', '마스터 이', '오공', '나피리', '이블린', '신짜오'],
  MID: ['아리', '제드', '야스오', '오리아나', '신드라', '르블랑', '아칼리', '빅토르', '탈리야', '카시오페아', '트위스티드 페이트', '라이즈', '벡스', '조이', '카타리나', '베이가', '직스', '피즈', '갈리오', '아지르', '아우렐리온 솔', '카사딘', '하이머딩거', '벨코즈'],
  ADC: ['징크스', '케이틀린', '이즈리얼', '카이사', '베인', '진', '애쉬', '루시안', '시비르', '자야', '트리스타나', '바루스', '미스 포츈', '드레이븐', '칼리스타', '아펠리오스', '사미라', '세나', '니코', '코그모', '트위치', '제리', '스몰더', '코르키'],
  SUP: ['쓰레쉬', '룰루', '레오나', '노틸러스', '유미', '알리스타', '브라움', '나미', '라칸', '카르마', '파이크', '세라핀', '소나', '밀리오', '렐', '자이라', '모르가나', '바드', '잔나', '탐 켄치', '블리츠크랭크', '레나타 글라스크', '소라카', '럭스'],
};
const ALL_CHAMPION_NAMES = Object.values(CHAMPIONS).flat();
const ALL_CHAMPIONS_FLAT = Object.entries(CHAMPIONS).flatMap(([role, names]) => names.map((name) => ({ name, role })));

// 픽한 5개 챔피언을 가급적 각자 원래 포지션(역할군)에 맞춰 배정한다.
// 해당 포지션 챔피언이 픽 목록에 없으면 남는 픽으로 채운다.
function assignPicksToPositions(picks) {
  const remaining = [...picks];
  const used = new Array(remaining.length).fill(false);
  const assignment = {};
  POSITIONS.forEach((pos) => {
    const idx = remaining.findIndex((c, i) => !used[i] && CHAMPIONS[pos].includes(c));
    if (idx !== -1) {
      assignment[pos] = remaining[idx];
      used[idx] = true;
    }
  });
  const leftoverPicks = remaining.filter((c, i) => !used[i]);
  let li = 0;
  POSITIONS.forEach((pos) => {
    if (!assignment[pos]) assignment[pos] = leftoverPicks[li++];
  });
  return assignment;
}

// 픽 단계에서 아직 채우지 못한 포지션에 맞는 챔피언을 가급적 우선으로 고른다.
// 이미 5명 다 픽했거나 부족한 포지션 챔피언이 전부 밴/픽되어 없으면 전체 후보 중 무작위로 뽑는다.
function pickPositionAwareChampion(available, currentPicks) {
  const coveredPositions = new Set();
  const remaining = [...currentPicks];
  const used = new Array(remaining.length).fill(false);
  POSITIONS.forEach((pos) => {
    const idx = remaining.findIndex((c, i) => !used[i] && CHAMPIONS[pos].includes(c));
    if (idx !== -1) { coveredPositions.add(pos); used[idx] = true; }
  });
  const neededPositions = POSITIONS.filter((pos) => !coveredPositions.has(pos));
  if (neededPositions.length > 0) {
    const availableSet = new Set(available);
    const candidates = neededPositions.flatMap((pos) => CHAMPIONS[pos].filter((c) => availableSet.has(c)));
    if (candidates.length > 0) return candidates[randRange(0, candidates.length - 1)];
  }
  return available[randRange(0, available.length - 1)];
}

// 챔피언 개별 상성: 두 챔피언 이름 조합마다 고유하고 대칭적인(A가 유리하면 B는 그만큼 불리한) 상성값을 부여한다
function champPairHash(a, b) {
  const s = a + '|' + b;
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return hash;
}
// 유리하면 +, 불리하면 - (같은 챔피언끼리거나 정보가 없으면 0)
function championMatchupMod(myChamp, enemyChamp) {
  if (!myChamp || !enemyChamp || myChamp === enemyChamp) return 0;
  const [a, b] = [myChamp, enemyChamp].sort();
  const h = champPairHash(a, b);
  const magnitude = (Math.abs(h) % 1000) / 1000 * 0.16; // 0~0.16 사이의 상성 강도
  const hashSign = (Math.abs(h) % 2 === 0) ? 1 : -1; // a와 b 중 누가 유리한지(고정)
  const mySign = myChamp === a ? 1 : -1;
  return mySign * hashSign * magnitude;
}

const OPPONENTS = [
  { id: 1, name: '블루아이스 e스포츠', tier: '약체', power: 270, region: '북미' },
  { id: 2, name: '레드팽 게이밍', tier: '평범', power: 305, region: '중국' },
  { id: 3, name: '나이트폭스', tier: '강호', power: 345, region: '유럽' },
  { id: 4, name: '선더울프 e스포츠', tier: '강팀', power: 385, region: '한국' },
  { id: 5, name: '크림슨나이트', tier: '최강', power: 425, region: '중국' },
];

const DRAGON_TYPES = ['화염', '바다', '대지', '바람', '마법'];
const DRAGON_COLORS = {
  화염: '#F97316', 바다: '#38BDF8', 대지: '#B08453', 바람: '#5EEAD4', 마법: '#E879F9', 장로: '#C084FC',
};
const DRAGON_EMOJI = {
  화염: '🔥', 바다: '🌊', 대지: '🏔️', 바람: '🌪️', 마법: '🔮', 장로: '👑',
};
// 배포판 전용: 타워(팀별)/바론/드래곤 유형별 아이콘 이미지 (public/objective-icons/)
const TOWER_ICON_BLUE = '/objective-icons/obj-tower-blue.png';
const TOWER_ICON_RED = '/objective-icons/obj-tower-red.png';
const BARON_ICON = '/objective-icons/obj-baron.png';
const DRAGON_ICON = {
  화염: '/objective-icons/obj-dragon-fire.png',
  바다: '/objective-icons/obj-dragon-ocean.png',
  대지: '/objective-icons/obj-dragon-earth.png',
  바람: '/objective-icons/obj-dragon-wind.png',
  마법: '/objective-icons/obj-dragon-magic.png',
  장로: '/objective-icons/obj-dragon-elder.png',
};
const APP_VERSION = 'v.0.056';
const APP_LOGO_DATA_URI = '/logo.png'; // 배포판 전용: 파일 참조
const SINGLE_PULL_COST = 350;
const MULTI_PULL_COUNT = 5;
const MULTI_PULL_COST = 1575;
const GRADE_LABEL = {
  '아이언': '아이언', '브론즈': '브론즈', '실버': '실버', '골드': '골드', '플레티넘': '플레티넘',
  '에메랄드': '에메랄드', '다이아': '다이아', '마스터': '마스터', '그랜드마스터': '그랜드마스터', '챌린저': '챌린저',
};
const GRADE_COLOR = {
  '아이언': '#6B5D52', '브론즈': '#A9702F', '실버': '#9CA8B4', '골드': '#D9A63C', '플레티넘': '#3FBFA6',
  '에메랄드': '#2ECC71', '다이아': '#4FA8E8', '마스터': '#B565D9', '그랜드마스터': '#E0447A', '챌린저': '#F5E6A8',
};
const LEAGUE_NAME = {
  '한국': 'mLCK',
  '중국': 'mLPL',
  '유럽/중동/아프리카': 'mLEC',
  '아시아/오세아니아': 'mLCP',
  '아메리카/카브리해': 'mLCS',
  '남아메리카': 'mCBLOL',
};
const TURN_TIME_LIMIT = 15;
const GAME_WAIT_SECONDS = 30;

const KST_TIMEZONE = 'Asia/Seoul';

// 주어진 Date를 한국시간(KST) 기준으로 분해한다
function getKSTParts(date) {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  // 자정 직후 hour가 '24'로 나오는 브라우저 대응
  if (map.hour === '24') map.hour = '00';
  return map;
}

// 한국시간 기준 "오늘 날짜" 키 (일일 초기화 판정용) - 기기 시간이 아닌 온라인 동기화 시간을 넘겨써야 조작 방지가 된다
function todayString(date) {
  const p = getKSTParts(date || new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

// 지역리그/국제리그 포인트 보상
const REGIONAL_REWARD = { join: 200, win: 100, rank3: 200, rank2: 300, rank1: 500 };
const INTERNATIONAL_REWARD = { join: 1000, win: 300, rank3: 1000, rank2: 1500, rank1: 2000 };

// FA 시장 새로고침 일일 제한
const FA_REFRESH_DAILY_LIMIT = 5;

// 스폰서 시스템
const SPONSOR_CATEGORIES = {
  '통신사': ['m텔레콤', 'm모바일원', 'm커넥트', 'm텔레콴', 'm링크텔'],
  '게이밍 의자': ['m체어킹', 'm시트프로', 'm게이밍시트', 'm에르고체어', 'm레이서시트'],
  '게이밍 모니터': ['m뷰텍', 'm디스플레이랩', 'm모니터스', 'm클리어뷰', 'm픽셀코어'],
  '전자': ['m일렉트로', 'm테크노바', 'm전자월드', 'm스마트텍', 'm디지털코어'],
  '에너지드링크': ['m부스트', 'm에너지웨이브', 'm파워드링크', 'm레이지업', 'm스파크드링크'],
  '자동차': ['m모터스', 'm오토드라이브', 'm카브랜드', 'm스피드모터', 'm레이싱카'],
  '대기업': ['m글로벌그룹', 'm홀딩스', 'm코퍼레이션', 'm인더스트리', 'm엔터프라이즈'],
};
const SPONSOR_VALUE_PER_SLOT = 5000;
const SPONSOR_DAILY_RATE = 0.05;
function generateSponsorOffer(category, usedNames) {
  const pool = SPONSOR_CATEGORIES[category].filter((n) => !usedNames.includes(n));
  const names = pool.length > 0 ? pool : SPONSOR_CATEGORIES[category];
  const companyName = names[randRange(0, names.length - 1)];
  return { id: category + '-' + companyName + '-' + Date.now(), category, companyName };
}

const TEAM_PREFIXES = ['골든', '실버', '레드', '블랙', '화이트', '나이트', '선더', '크림슨', '스톰', '아이언'];
const TEAM_SUFFIXES = ['드래곤', '폭스', '울브즈', '나이츠', '스콰드', '타이탄', '팬텀', '레이븐즈', '가디언즈', '헌터스'];
function buildRegionClubs(region, regionIndex) {
  const clubs = [];
  for (let i = 0; i < 10; i++) {
    const prefix = TEAM_PREFIXES[(i + regionIndex * 3) % TEAM_PREFIXES.length];
    const suffix = TEAM_SUFFIXES[(i + regionIndex * 7) % TEAM_SUFFIXES.length];
    clubs.push({ id: `${region}-${i}`, name: `${prefix}${suffix}`, region, power: 260 + i * 18 });
  }
  return clubs;
}
const REGION_CLUBS = {};
REGIONS.forEach((r, idx) => { REGION_CLUBS[r] = buildRegionClubs(r, idx); });
const KOREA_CLUB_NAMES = ['mT1', 'mBNK FEARX', 'mDplus Kia', 'mGen.G', 'mDN SOOPers', 'mKIWOOM DRX', 'mNongshim RedForce', 'mkt Rolster', 'mHANJIN BRION', 'mHanwha Life Esports'];
REGION_CLUBS['한국'] = KOREA_CLUB_NAMES.map((name, i) => ({ id: `한국-${i}`, name, region: '한국', power: 260 + i * 18 }));
const CHINA_CLUB_NAMES = ['mBilibili Gaming', 'mTop Esports', "mAnyone's Legend", 'mJDG Esports', 'mInvictus Gaming', 'mWeibo Gaming', 'mNinjas in Pyjamas', 'mEdward Gaming', 'mTeam WE', 'mLGD Gaming', 'mUltra Prime', 'mThunder Talk Gaming', 'mLNG Esports', 'mOh My God'];
REGION_CLUBS['중국'] = CHINA_CLUB_NAMES.map((name, i) => ({ id: `중국-${i}`, name, region: '중국', power: 250 + i * 13 }));
const EMEA_CLUB_NAMES = ['mG2 Esports', 'mMovistar KOI', 'mFnatic', 'mKarmine Corp', 'mGIANTX', 'mTeam Vitality', 'mTeam Heretics', 'mShifters', 'mSK Gaming', 'mNatus Vincere'];
REGION_CLUBS['유럽/중동/아프리카'] = EMEA_CLUB_NAMES.map((name, i) => ({ id: `유럽/중동/아프리카-${i}`, name, region: '유럽/중동/아프리카', power: 260 + i * 18 }));
const APAC_CLUB_NAMES = ['mCTBC Flying Oyster', 'mTeam Secret Whales', 'mGAM Esports', 'mMVK Esports', 'mDetonatioN FocusMe', 'mFukuoka SoftBank HAWKS gaming', 'mRelove Deep Cross Gaming', 'mGround Zero Gaming'];
REGION_CLUBS['아시아/오세아니아'] = APAC_CLUB_NAMES.map((name, i) => ({ id: `아시아/오세아니아-${i}`, name, region: '아시아/오세아니아', power: 260 + i * 20 }));
const AMERICAS_CLUB_NAMES = ['mFlyQuest', 'mTeam Liquid Alienware', 'mCloud9 Kia', 'mDignitas', 'mShopify Rebellion', 'mSentinels', 'mDisguised', 'mLYON'];
REGION_CLUBS['아메리카/카브리해'] = AMERICAS_CLUB_NAMES.map((name, i) => ({ id: `아메리카/카브리해-${i}`, name, region: '아메리카/카브리해', power: 260 + i * 20 }));
const SOUTH_AMERICA_CLUB_NAMES = ['mpaiN Gaming', 'mVivo keyd Stars', 'mRED Kalunga', 'mLOUD', 'mFURIA', 'mFluxo W7M', 'mLeviatan', 'mLOS'];
REGION_CLUBS['남아메리카'] = SOUTH_AMERICA_CLUB_NAMES.map((name, i) => ({ id: `남아메리카-${i}`, name, region: '남아메리카', power: 260 + i * 20 }));

// 지정된 구단들을 강호(340~379) 또는 강팀(380~419) 등급으로, 그 외 나머지는 평범/약체(340 미만)로 조정
const CLUB_POWER_OVERRIDE = {
  'mT1': 400, 'mGen.G': 410, 'mDplus Kia': 380, 'mHanwha Life Esports': 365,
  'mBilibili Gaming': 390, "mAnyone's Legend": 360, 'mJDG Esports': 400, 'mWeibo Gaming': 370, 'mTop Esports': 385,
  'mG2 Esports': 395, 'mMovistar KOI': 355, 'mKarmine Corp': 345, 'mFnatic': 405,
  'mGAM Esports': 350,
  'mLYON': 400, 'mTeam Liquid Alienware': 365,
  'mFURIA': 340,
};
Object.keys(REGION_CLUBS).forEach((region) => {
  let weakIdx = 0;
  REGION_CLUBS[region] = REGION_CLUBS[region].map((c) => {
    if (CLUB_POWER_OVERRIDE[c.name] !== undefined) return { ...c, power: CLUB_POWER_OVERRIDE[c.name] };
    const power = 240 + (weakIdx % 6) * 16; // 240~320 사이를 순환하며 분산 (평범/약체 등급)
    weakIdx++;
    return { ...c, power };
  });
});
// 모든 구단에 2군 파워 부여 (1군보다 확연히 약하게, 60~78% 수준)
Object.keys(REGION_CLUBS).forEach((region) => {
  REGION_CLUBS[region] = REGION_CLUBS[region].map((c) => ({ ...c, power2: Math.round(c.power * (0.6 + Math.random() * 0.18)) }));
});
// 파워가 높은 구단일수록 과거 우승 이력이 있을 확률과 횟수가 높아진다
function generateClubTitles(power) {
  let regionalTitles = 0;
  if (power >= 400) regionalTitles = randRange(3, 7);
  else if (power >= 380) regionalTitles = randRange(1, 4);
  else if (power >= 340) regionalTitles = randRange(0, 2);
  else if (power >= 300) regionalTitles = Math.random() < 0.3 ? 1 : 0;
  let internationalTitles = 0;
  if (power >= 410) internationalTitles = Math.random() < 0.5 ? randRange(1, 2) : 0;
  else if (power >= 390) internationalTitles = Math.random() < 0.25 ? 1 : 0;
  return { regionalTitles, internationalTitles };
}
Object.keys(REGION_CLUBS).forEach((region) => {
  REGION_CLUBS[region] = REGION_CLUBS[region].map((c) => ({ ...c, ...generateClubTitles(c.power) }));
});
// 밴1(3:3, user 선공) → 픽1(3:3, 스네이크) → 밴2(2:2, ai 선공) → 픽2(2:2, 스네이크 이어서) = 실제 프로 경기 순서
const DRAFT_ORDER_BAN1 = ['user', 'ai', 'user', 'ai', 'user', 'ai'];
const DRAFT_ORDER_PICK1 = ['user', 'ai', 'ai', 'user', 'user', 'ai'];
const DRAFT_ORDER_BAN2 = ['ai', 'user', 'ai', 'user'];
const DRAFT_ORDER_PICK2 = ['ai', 'user', 'user', 'ai'];
const DRAFT_PHASE_ORDER = { ban1: DRAFT_ORDER_BAN1, pick1: DRAFT_ORDER_PICK1, ban2: DRAFT_ORDER_BAN2, pick2: DRAFT_ORDER_PICK2 };
const DRAFT_PHASE_LABEL = { ban1: '밴 페이즈 1', pick1: '픽 페이즈 1', ban2: '밴 페이즈 2', pick2: '픽 페이즈 2', done: '포지션 배치' };
function isBanPhase(phase) { return phase === 'ban1' || phase === 'ban2'; }

/* ============================== 유틸 ============================== */

function randRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
// 밴/픽 선택 시 짧은 효과음을 직접 합성해서 재생한다 (외부 오디오 파일 없이 Web Audio API 사용)
// 밴/픽 선택 시 재생되는 효과음 파일(따로 구분되어 관리됨)
const DRAFT_SFX = {
  ban: '/sfx/ban.wav',
  pick: '/sfx/pick.wav',
};
function playDraftSfx(kind) {
  try {
    const src = DRAFT_SFX[kind];
    if (!src) return;
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (e) {
    // 브라우저 정책 등으로 재생이 막혀도 게임 진행에는 영향 없도록 무시한다
  }
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// 두 팀의 파워 차이가 작을 때(비등한 전력), 스코어가 한쪽으로 크게 쏠리면 반대쪽으로 완만하게 보정한다.
// 파워 차이가 크면(한쪽이 압도적) 보정 없이 파워 비율을 그대로 사용한다.
function balancedChance(userPower, aiPower, userScore, aiScore) {
  const raw = userPower / (userPower + aiPower);
  const gap = Math.abs(raw - 0.5);
  if (gap >= 0.15) return raw;
  const total = userScore + aiScore;
  if (total < 6) return raw;
  const actualShare = userScore / total;
  const drift = actualShare - raw;
  const correction = clamp(drift, -0.3, 0.3) * (1 - gap / 0.15) * 0.5;
  return clamp(raw - correction, 0.3, 0.7);
}

const PLAYER_NAME_POOL = [...PREFIXES, ...SUFFIXES];

function generateName(usedSet) {
  let name, guard = 0;
  do {
    name = PLAYER_NAME_POOL[randRange(0, PLAYER_NAME_POOL.length - 1)];
    guard++;
  } while (usedSet.has(name) && guard < 60);
  usedSet.add(name);
  return name;
}

// 선수 등급표 (능력치 상한 / 잠재력 상한 / 등장 확률) - 등급이 높을수록 드물게 등장
const PLAYER_GRADE_TABLE = [
  { grade: '아이언', statMax: 30, potentialMax: 50, weight: 65 },
  { grade: '브론즈', statMax: 30, potentialMax: 60, weight: 15 },
  { grade: '실버', statMax: 50, potentialMax: 60, weight: 10 },
  { grade: '골드', statMax: 50, potentialMax: 70, weight: 6 },
  { grade: '플레티넘', statMax: 50, potentialMax: 80, weight: 3 },
  { grade: '에메랄드', statMax: 70, potentialMax: 80, weight: 0.7 },
  { grade: '다이아', statMax: 70, potentialMax: 90, weight: 0.2 },
  { grade: '마스터', statMax: 80, potentialMax: 90, weight: 0.06 },
  { grade: '그랜드마스터', statMax: 80, potentialMax: 100, weight: 0.03 },
  { grade: '챌린저', statMax: 90, potentialMax: 100, weight: 0.01 },
];
function rollPlayerGrade(table) {
  const t = table || PLAYER_GRADE_TABLE;
  const total = t.reduce((s, g) => s + g.weight, 0);
  let roll = Math.random() * total;
  for (const g of t) {
    if (roll < g.weight) return g;
    roll -= g.weight;
  }
  return t[0];
}

// tier(1군/2군)는 더 이상 능력치를 결정하지 않는다 - 구단이 로스터에서 자유롭게 지정하는 "보직"일 뿐이다.
// 능력치는 등급(아이언~챌린저) 확률에 따라 결정된다.
// 포지션에 맞는 주력 챔피언 5개(그중 2개는 특별히 잘 다루는 챔피언)를 무작위로 정한다
function generateSignatureChampions(position) {
  const pool = [...CHAMPIONS[position]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randRange(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const signatureChampions = pool.slice(0, 5);
  const specialChampions = signatureChampions.slice(0, 2);
  return { signatureChampions, specialChampions };
}

function generatePlayer(position, usedSet, idRef, opts = {}) {
  const gradeInfo = opts.gradeInfo || rollPlayerGrade();
  const statMax = gradeInfo.statMax;
  const statMin = Math.max(5, statMax - 18);
  const base = randRange(statMin, statMax);
  const stat = () => clamp(base + randRange(-6, 6), 5, statMax);
  const mechanics = stat(), gameSense = stat(), teamfight = stat(), laning = stat();
  const overall = Math.round((mechanics + gameSense + teamfight + laning) / 4);
  const potentialCap = Math.min(99, gradeInfo.potentialMax);
  const potBonusMax = Math.max(0, potentialCap - overall);
  const potBonus = randRange(0, potBonusMax);
  const potential = clamp(overall + potBonus, overall, potentialCap);
  const value = Math.round(overall * 12 + potential * 4);
  return {
    id: idRef.current++,
    name: generateName(usedSet),
    position, tier: opts.tier || '예비',
    region: REGIONS[randRange(0, REGIONS.length - 1)],
    mechanics, gameSense, teamfight, laning,
    overall, potential, level: 1, exp: 0, value,
    grade: gradeInfo.grade,
    ...generateSignatureChampions(position),
    achievements: { regionalWins: 0, regionalRunnerUps: 0, regionalTop5: 0, internationalWins: 0, internationalRunnerUps: 0, internationalTop5: 0 },
  };
}

function generateInitialGame(name, region, usedSetRef, idRef) {
  const players = [];
  POSITIONS.forEach((pos) => {
    // 창단 시작 선수는 항상 아이언 등급으로 고정 - 낮은 구단파워로 시작해서 성장/영입으로 강해지는 구조
    players.push(generatePlayer(pos, usedSetRef.current, idRef, { tier: '1군', gradeInfo: PLAYER_GRADE_TABLE[0] }));
  });
  const clubValue = computeClubValue(players);
  const club = {
    name, region, value: clubValue, budget: 3500, wins: 0, losses: 0,
    record: {
      domestic: { '1군': { wins: 0, losses: 0 }, '2군': { wins: 0, losses: 0 } },
      international: { '1군': { wins: 0, losses: 0 }, '2군': { wins: 0, losses: 0 } },
      scrim: { '1군': { wins: 0, losses: 0 }, '2군': { wins: 0, losses: 0 } },
    },
  };
  return { club, players, matchHistory: [] };
}

const SPECIAL_PLAYERS = [
  { name: 'mFaker', position: 'MID', region: '한국', mechanics: 88, gameSense: 91, teamfight: 87, laning: 90, potential: 99 },
  { name: 'mKeria', position: 'SUP', region: '한국', mechanics: 85, gameSense: 92, teamfight: 89, laning: 84, potential: 97 },
  { name: 'mDoran', position: 'TOP', region: '한국', mechanics: 84, gameSense: 82, teamfight: 86, laning: 88, potential: 93 },
  { name: 'mOner', position: 'JGL', region: '한국', mechanics: 87, gameSense: 88, teamfight: 90, laning: 80, potential: 95 },
  { name: 'mPeyz', position: 'ADC', region: '한국', mechanics: 89, gameSense: 83, teamfight: 85, laning: 87, potential: 96 },
  { name: 'mChovy', position: 'MID', region: '한국', mechanics: 86, gameSense: 93, teamfight: 84, laning: 92, potential: 97 },
  { name: 'mRuler', position: 'ADC', region: '한국', mechanics: 90, gameSense: 85, teamfight: 88, laning: 86, potential: 95 },
  { name: 'mDuro', position: 'SUP', region: '한국', mechanics: 82, gameSense: 89, teamfight: 87, laning: 83, potential: 92 },
  { name: 'mKiin', position: 'TOP', region: '한국', mechanics: 88, gameSense: 84, teamfight: 85, laning: 89, potential: 94 },
  { name: 'mCanyon', position: 'JGL', region: '한국', mechanics: 89, gameSense: 90, teamfight: 91, laning: 82, potential: 96 },
];

const PLAYER_PORTRAITS = {
  'mDoran': '/portrait-mdoran.png',
  'mOner': '/portrait-moner.png',
  'mFaker': '/portrait-mfaker.png',
  'mPeyz': '/portrait-mpeyz.png',
  'mKeria': '/portrait-mkeria.png',
  'mKiin': '/portrait-mkiin.png',
  'mCanyon': '/portrait-mcanyon.png',
  'mChovy': '/portrait-mchovy.png',
  'mRuler': '/portrait-mruler.png',
  'mDuro': '/portrait-mduro.png',
};

function createSpecialPlayer(config, usedSetRef, idRef) {
  usedSetRef.current.add(config.name);
  const overall = Math.round((config.mechanics + config.gameSense + config.teamfight + config.laning) / 4);
  const value = Math.round(overall * 12 + config.potential * 4);
  return {
    id: idRef.current++,
    name: config.name, position: config.position, tier: '예비', region: config.region,
    mechanics: config.mechanics, gameSense: config.gameSense, teamfight: config.teamfight, laning: config.laning,
    overall, potential: config.potential, level: 1, exp: 0, value,
    ...generateSignatureChampions(config.position),
    achievements: { regionalWins: 0, regionalRunnerUps: 0, regionalTop5: 0, internationalWins: 0, internationalRunnerUps: 0, internationalTop5: 0 },
  };
}

function createSpecialListing(config, usedSetRef, idRef) {
  const player = createSpecialPlayer(config, usedSetRef, idRef);
  return { ...player, price: Math.round(player.value * 1.4), fromClub: `${LEAGUE_NAME[config.region] || config.region} 자유계약`, source: 'special' };
}

function ensureSpecialListings(list, players, usedSetRef, idRef) {
  let next = list;
  SPECIAL_PLAYERS.forEach((config) => {
    const already = next.some((l) => l.name === config.name) || players.some((p) => p.name === config.name);
    if (!already) next = [...next, createSpecialListing(config, usedSetRef, idRef)];
  });
  return next;
}

function generateNpcListing(usedSetRef, idRef, forcedPosition) {
  const position = forcedPosition || POSITIONS[randRange(0, POSITIONS.length - 1)];
  const player = generatePlayer(position, usedSetRef.current, idRef, { tier: '예비', gradeInfo: rollPlayerGrade() });
  const price = Math.round(player.value * (randRange(80, 130) / 100));
  const fromClub = OPPONENTS[randRange(0, OPPONENTS.length - 1)].name;
  return { ...player, price, fromClub, source: 'npc' };
}

function generateFullNpcMarket(usedSetRef, idRef) {
  const listings = [];
  POSITIONS.forEach((pos) => {
    for (let i = 0; i < 5; i++) listings.push(generateNpcListing(usedSetRef, idRef, pos));
  });
  return listings;
}

function gachaPull(usedSetRef, idRef, forcedPosition) {
  const position = forcedPosition || POSITIONS[randRange(0, POSITIONS.length - 1)];
  const player = generatePlayer(position, usedSetRef.current, idRef, { tier: '예비' });
  return player;
}

function resolveWinner(a, b) {
  const pa = a.power / (a.power + b.power);
  return Math.random() < pa ? a : b;
}

// 국제 리그 진출권 순위 조회용 (실제 대진 없이 참가 자격만 계산)
function getInternationalQualifiers(game) {
  const { byeTeams, playInTeams } = getIntlByeAndPlayIn(game);
  return [...byeTeams, ...playInTeams].sort((a, b) => b.power - a.power);
}

// 지역별 국제전 참가 구단 수 (총 10팀: 부전승 6 + 플레이인 4)
const INTL_SLOTS = {
  '한국': 2, '중국': 2, '유럽/중동/아프리카': 2, '아시아/오세아니아': 1, '아메리카/카브리해': 2, '남아메리카': 1,
};

function getIntlByeAndPlayIn(game) {
  const byeTeams = [];
  const playInTeams = [];
  REGIONS.forEach((region) => {
    const slots = INTL_SLOTS[region] || 0;
    if (slots === 0) return;
    const aiSorted = [...REGION_CLUBS[region]].sort((a, b) => b.power - a.power);
    const top = aiSorted.slice(0, slots).map((c) => ({ ...c, region }));
    if (region === game.club.region && game.club.qualifiedRank && game.club.qualifiedRank <= slots) {
      top[game.club.qualifiedRank - 1] = { id: 'USER', name: game.club.name, region, power: (game.club.qualifiedWins || 5) * 40, isUser: true };
    }
    if (slots >= 2) {
      byeTeams.push(top[0]);
      playInTeams.push(top[1]);
    } else {
      byeTeams.push(top[0]);
    }
  });
  return { byeTeams, playInTeams };
}

// 부전승 6팀 + 플레이인 승자 2팀 = 8팀으로 8강 대진을 짜고, 유저 기준 다음 상대들을 미리 계산해둔다
function buildQuarterBracket(eight) {
  const participants = [...eight];
  for (let i = participants.length - 1; i > 0; i--) {
    const j = randRange(0, i);
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }
  const pairsR1 = [[0, 3], [2, 1], [4, 7], [6, 5]];
  const userIndex = participants.findIndex((p) => p.isUser);
  if (userIndex === -1) return null;
  const r1Winners = new Array(4);
  let userOpponent = null;
  pairsR1.forEach(([ia, ib], pairIdx) => {
    if (ia === userIndex || ib === userIndex) {
      userOpponent = participants[ia === userIndex ? ib : ia];
      r1Winners[pairIdx] = null;
    } else {
      r1Winners[pairIdx] = resolveWinner(participants[ia], participants[ib]);
    }
  });
  const userGroup = userIndex < 4 ? 'A' : 'B';
  let semiOtherPairWinner, otherHalfFinalist;
  if (userGroup === 'A') {
    const userPairIdx = pairsR1[0].includes(userIndex) ? 0 : 1;
    const otherPairIdx = userPairIdx === 0 ? 1 : 0;
    semiOtherPairWinner = r1Winners[otherPairIdx];
    otherHalfFinalist = resolveWinner(r1Winners[2], r1Winners[3]);
  } else {
    const userPairIdx = pairsR1[2].includes(userIndex) ? 2 : 3;
    const otherPairIdx = userPairIdx === 2 ? 3 : 2;
    semiOtherPairWinner = r1Winners[otherPairIdx];
    otherHalfFinalist = resolveWinner(r1Winners[0], r1Winners[1]);
  }
  return { userOpponent, semiOtherPairWinner, otherHalfFinalist };
}

function setupInternationalBracket(game) {
  const { byeTeams, playInTeams } = getIntlByeAndPlayIn(game);
  const shuffledPlayIn = [...playInTeams];
  for (let i = shuffledPlayIn.length - 1; i > 0; i--) {
    const j = randRange(0, i);
    [shuffledPlayIn[i], shuffledPlayIn[j]] = [shuffledPlayIn[j], shuffledPlayIn[i]];
  }
  const userPlayInIndex = shuffledPlayIn.findIndex((p) => p.isUser);
  if (userPlayInIndex !== -1) {
    // 유저가 2번 시드(플레이인)로 진출한 경우: 플레이인부터 시작
    const opponentIdx = userPlayInIndex % 2 === 0 ? userPlayInIndex + 1 : userPlayInIndex - 1;
    const userOpponent = shuffledPlayIn[opponentIdx];
    const otherIdxA = userPlayInIndex < 2 ? 2 : 0;
    const otherIdxB = userPlayInIndex < 2 ? 3 : 1;
    const otherPlayInWinner = resolveWinner(shuffledPlayIn[otherIdxA], shuffledPlayIn[otherIdxB]);
    return { stage: 'playin', userOpponent, otherPlayInWinner, byeTeams };
  }
  // 유저가 부전승(1번 시드)인 경우: 플레이인 결과 2개를 먼저 해결하고 8강부터 시작
  const playInWinners = [
    resolveWinner(shuffledPlayIn[0], shuffledPlayIn[1]),
    resolveWinner(shuffledPlayIn[2], shuffledPlayIn[3]),
  ];
  const eight = [...byeTeams, ...playInWinners];
  const bracket = buildQuarterBracket(eight);
  if (!bracket) return { userOpponent: null };
  return { stage: 'quarter', ...bracket };
}

const CHAMPION_WEAPON = {
  '가렌': '⚔️', '다리우스': '🪓', '카밀': '🗡️', '레넥톤': '🗡️', '오른': '🔨',
  '피오라': '🤺', '나서스': '⚔️', '잭스': '🔨', '세트': '👊', '아트록스': '⚔️',
  '쉔': '⚔️', '말파이트': '🪨', '우디르': '👊', '볼리베어': '🐻', '케넨': '🗡️',
  '신지드': '🧪', '초가스': '👹', '트린다미어': '⚔️', '이렐리아': '🗡️', '럼블': '🔥',
  '리 신': '👊', '비에고': '🗡️', '자르반 4세': '🔱', '다이애나': '🗡️', '세주아니': '🔨',
  '그레이브즈': '🔫', '니달리': '🔱', '킨드레드': '🏹', '헤카림': '🔱', '릴리아': '🪄',
  '엘리스': '🕷️', '카직스': '🦂', '렝가': '🐆', '녹턴': '👹', '워윅': '🐺',
  '아무무': '🧟', '자크': '🟢', '벨베스': '👹', '판테온': '🔱', '문도 박사': '🪓',
  '아리': '🪄', '제드': '🗡️', '야스오': '⚔️', '오리아나': '🔮', '신드라': '🔮',
  '르블랑': '🪄', '아칼리': '🗡️', '빅토르': '✨', '탈리야': '🪄', '카시오페아': '🐍',
  '트위스티드 페이트': '🃏', '라이즈': '🪄', '벡스': '🌑', '조이': '⭐', '카타리나': '🗡️',
  '베이가': '🪄', '직스': '💣', '코르키': '✈️', '피즈': '🔱', '갈리오': '🛡️',
  '징크스': '🚀', '케이틀린': '🔫', '이즈리얼': '✨', '카이사': '🗡️', '베인': '🏹',
  '진': '🔫', '애쉬': '🏹', '루시안': '🔫', '시비르': '🪃', '자야': '🗡️',
  '트리스타나': '🔫', '바루스': '🏹', '미스 포츈': '🔫', '드레이븐': '🪓', '칼리스타': '🗡️',
  '아펠리오스': '🔫', '사미라': '🗡️', '자히리': '🏹', '세나': '🔫', '니코': '🪀',
  '쓰레쉬': '⛓️', '룰루': '🪄', '레오나': '🛡️', '노틸러스': '⚓', '유미': '📖',
  '알리스타': '🛡️', '브라움': '🛡️', '나미': '🔱', '라칸': '🪶', '카르마': '🪭',
  '파이크': '🔱', '세라핀': '🎤', '소나': '🎻', '벨코즈': '👁️', '밀리오': '🔥',
  '렐': '🔨', '자이라': '🌿', '모르가나': '⛓️', '바드': '🪄', '스웨인': '🐦',
  '그웬': '✂️', '크산테': '🛡️', '사이온': '🪓', '퀸': '🏹', '뽀삐': '🔨',
  '마스터 이': '⚔️', '오공': '🐒', '나피리': '🗡️', '이블린': '😈', '신짜오': '🔱',
  '아지르': '🏺', '럭스': '✨', '아우렐리온 솔': '⭐', '카사딘': '🌀', '하이머딩거': '🔧',
  '코그모': '👄', '트위치': '🏹', '제리': '⚡', '스몰더': '🔥', '우르곳': '🦾',
  '잔나': '🌪️', '탐 켄치': '👅', '블리츠크랭크': '🤖', '레나타 글라스크': '⛓️', '소라카': '🌟',
};

// 배포판 전용: 챔피언별 고유 아이콘 이미지 (public/champion-icons/)
const CHAMPION_ICON = {
  '가렌': '/champion-icons/champ-garen.png',
  '다리우스': '/champion-icons/champ-darius.png',
  '카밀': '/champion-icons/champ-camille.png',
  '레넥톤': '/champion-icons/champ-renekton.png',
  '오른': '/champion-icons/champ-ornn.png',
  '피오라': '/champion-icons/champ-fiora.png',
  '나서스': '/champion-icons/champ-nasus.png',
  '잭스': '/champion-icons/champ-jax.png',
  '세트': '/champion-icons/champ-sett.png',
  '아트록스': '/champion-icons/champ-aatrox.png',
  '쉔': '/champion-icons/champ-shen.png',
  '말파이트': '/champion-icons/champ-malphite.png',
  '우디르': '/champion-icons/champ-udyr.png',
  '볼리베어': '/champion-icons/champ-volibear.png',
  '케넨': '/champion-icons/champ-kennen.png',
  '신지드': '/champion-icons/champ-singed.png',
  '초가스': '/champion-icons/champ-chogath.png',
  '트린다미어': '/champion-icons/champ-tryndamere.png',
  '이렐리아': '/champion-icons/champ-irelia.png',
  '럼블': '/champion-icons/champ-rumble.png',
  '그웬': '/champion-icons/champ-gwen.png',
  '크산테': '/champion-icons/champ-ksante.png',
  '사이온': '/champion-icons/champ-sion.png',
  '퀸': '/champion-icons/champ-quinn.png',
  '뽀삐': '/champion-icons/champ-poppy.png',
  '리 신': '/champion-icons/champ-leesin.png',
  '비에고': '/champion-icons/champ-viego.png',
  '자르반 4세': '/champion-icons/champ-jarvan4.png',
  '다이애나': '/champion-icons/champ-diana.png',
  '세주아니': '/champion-icons/champ-sejuani.png',
  '그레이브즈': '/champion-icons/champ-graves.png',
  '니달리': '/champion-icons/champ-nidalee.png',
  '킨드레드': '/champion-icons/champ-kindred.png',
  '헤카림': '/champion-icons/champ-hecarim.png',
  '릴리아': '/champion-icons/champ-lillia.png',
  '엘리스': '/champion-icons/champ-elise.png',
  '카직스': '/champion-icons/champ-khazix.png',
  '렝가': '/champion-icons/champ-rengar.png',
  '녹턴': '/champion-icons/champ-nocturne.png',
  '워윅': '/champion-icons/champ-warwick.png',
  '아무무': '/champion-icons/champ-amumu.png',
  '자크': '/champion-icons/champ-zac.png',
  '벨베스': '/champion-icons/champ-belveth.png',
  '판테온': '/champion-icons/champ-pantheon.png',
  '문도 박사': '/champion-icons/champ-drmundo.png',
  '마스터 이': '/champion-icons/champ-masteryi.png',
  '오공': '/champion-icons/champ-wukong.png',
  '나피리': '/champion-icons/champ-naafiri.png',
  '이블린': '/champion-icons/champ-evelynn.png',
  '신짜오': '/champion-icons/champ-xinzhao.png',
  '아리': '/champion-icons/champ-ahri.png',
  '제드': '/champion-icons/champ-zed.png',
  '야스오': '/champion-icons/champ-yasuo.png',
  '오리아나': '/champion-icons/champ-orianna.png',
  '신드라': '/champion-icons/champ-syndra.png',
  '르블랑': '/champion-icons/champ-leblanc.png',
  '아칼리': '/champion-icons/champ-akali.png',
  '빅토르': '/champion-icons/champ-viktor.png',
  '탈리야': '/champion-icons/champ-taliyah.png',
  '카시오페아': '/champion-icons/champ-cassiopeia.png',
  '트위스티드 페이트': '/champion-icons/champ-twistedfate.png',
  '라이즈': '/champion-icons/champ-ryze.png',
  '벡스': '/champion-icons/champ-vex.png',
  '조이': '/champion-icons/champ-zoe.png',
  '카타리나': '/champion-icons/champ-katarina.png',
  '베이가': '/champion-icons/champ-veigar.png',
  '직스': '/champion-icons/champ-ziggs.png',
  '코르키': '/champion-icons/champ-corki.png',
  '피즈': '/champion-icons/champ-fizz.png',
  '갈리오': '/champion-icons/champ-galio.png',
  '아지르': '/champion-icons/champ-azir.png',
  '럭스': '/champion-icons/champ-lux.png',
  '아우렐리온 솔': '/champion-icons/champ-aurelionsol.png',
  '카사딘': '/champion-icons/champ-kassadin.png',
  '하이머딩거': '/champion-icons/champ-heimerdinger.png',
  '징크스': '/champion-icons/champ-jinx.png',
  '케이틀린': '/champion-icons/champ-caitlyn.png',
  '이즈리얼': '/champion-icons/champ-ezreal.png',
  '카이사': '/champion-icons/champ-kaisa.png',
  '베인': '/champion-icons/champ-vayne.png',
  '진': '/champion-icons/champ-jhin.png',
  '애쉬': '/champion-icons/champ-ashe.png',
  '루시안': '/champion-icons/champ-lucian.png',
  '시비르': '/champion-icons/champ-sivir.png',
  '자야': '/champion-icons/champ-xayah.png',
  '트리스타나': '/champion-icons/champ-tristana.png',
  '바루스': '/champion-icons/champ-varus.png',
  '미스 포츈': '/champion-icons/champ-missfortune.png',
  '드레이븐': '/champion-icons/champ-draven.png',
  '칼리스타': '/champion-icons/champ-kalista.png',
  '아펠리오스': '/champion-icons/champ-aphelios.png',
  '사미라': '/champion-icons/champ-samira.png',
  '자히리': '/champion-icons/champ-zeri.png',
  '세나': '/champion-icons/champ-senna.png',
  '니코': '/champion-icons/champ-nilah.png',
  '코그모': '/champion-icons/champ-kogmaw.png',
  '트위치': '/champion-icons/champ-twitch.png',
  '제리': '/champion-icons/champ-zeriadc.png',
  '스몰더': '/champion-icons/champ-smolder.png',
  '우르곳': '/champion-icons/champ-urgot.png',
  '쓰레쉬': '/champion-icons/champ-thresh.png',
  '룰루': '/champion-icons/champ-lulu.png',
  '레오나': '/champion-icons/champ-leona.png',
  '노틸러스': '/champion-icons/champ-nautilus.png',
  '유미': '/champion-icons/champ-yuumi.png',
  '알리스타': '/champion-icons/champ-alistar.png',
  '브라움': '/champion-icons/champ-braum.png',
  '나미': '/champion-icons/champ-nami.png',
  '라칸': '/champion-icons/champ-rakan.png',
  '카르마': '/champion-icons/champ-karma.png',
  '파이크': '/champion-icons/champ-pyke.png',
  '세라핀': '/champion-icons/champ-seraphine.png',
  '소나': '/champion-icons/champ-sona.png',
  '벨코즈': '/champion-icons/champ-velkoz.png',
  '밀리오': '/champion-icons/champ-milio.png',
  '렐': '/champion-icons/champ-rell.png',
  '자이라': '/champion-icons/champ-zyra.png',
  '모르가나': '/champion-icons/champ-morgana.png',
  '바드': '/champion-icons/champ-bard.png',
  '스웨인': '/champion-icons/champ-swain.png',
  '잔나': '/champion-icons/champ-janna.png',
  '탐 켄치': '/champion-icons/champ-tahmkench.png',
  '블리츠크랭크': '/champion-icons/champ-blitzcrank.png',
  '레나타 글라스크': '/champion-icons/champ-renata.png',
  '소라카': '/champion-icons/champ-soraka.png',
};


// 구단 가치는 1군/2군(실제 로스터에 편성된 선수)만 반영하고, 예비 선수는 제외한다
function computeClubValue(players) {
  return players.filter((p) => p.tier === '1군' || p.tier === '2군').reduce((s, p) => s + p.value, 0);
}

function computeTeamPower(players, tier = '1군') {
  return POSITIONS.reduce((sum, pos) => {
    const candidates = players.filter((p) => p.position === pos);
    if (candidates.length === 0) return sum;
    const starter = candidates.find((p) => p.tier === tier) || [...candidates].sort((a, b) => b.overall - a.overall)[0];
    return sum + starter.overall;
  }, 0);
}

function powerTierLabel(power) {
  if (power < 300) return '약체';
  if (power < 340) return '평범';
  if (power < 380) return '강호';
  if (power < 420) return '강팀';
  return '최강';
}

// 특정 AI 구단의 선수 이름을 등급별로 고정하고 싶을 때 사용 (포지션별)
const CLUB_FIXED_ROSTER = {
  'mGen.G': {
    '1군': { TOP: 'mKiin', JGL: 'mCanyon', MID: 'mChovy', ADC: 'mRuler', SUP: 'mDuro' },
    '2군': { TOP: 'mHorangE', JGL: 'mToye', MID: 'mDooly', ADC: 'mSlayer', SUP: 'mDahlia' },
  },
  'mKIWOOM DRX': {
    '1군': { TOP: 'mRich', JGL: 'mVincenzo', MID: 'mUcal', ADC: 'mAiming', SUP: 'mAndil' },
    '2군': { TOP: 'mFrog', JGL: 'mWiller', MID: 'mAKaJe', ADC: 'mLazyFeel', SUP: 'mMinous' },
  },
  'mkt Rolster': {
    '1군': { TOP: 'mPerfecT', JGL: 'mCuzz', MID: 'mBdd', ADC: 'mJiwoo', SUP: 'mEffort' },
    '2군': { TOP: 'mSero', JGL: 'mSylvie', MID: 'mHwichan', ADC: 'mFenRir', SUP: 'mPollu' },
  },
  'mBNK FEARX': {
    '1군': { TOP: 'mClear', JGL: 'mRaptor', MID: 'mVicLa', ADC: 'mTaeyoon', SUP: 'mKellin' },
    '2군': { TOP: 'mKangin', JGL: 'mZephyr', MID: 'mDaystar', ADC: 'mSlayer', SUP: 'mLuon' },
  },
  'mNongshim RedForce': {
    '1군': { TOP: 'mKingen', JGL: 'mSponge', MID: 'mScout', ADC: 'mDiable', SUP: 'mLehends' },
    '2군': { TOP: 'mJanus', JGL: 'mMihawk', MID: 'mCalix', ADC: 'mLucy', SUP: 'mPleata' },
  },
  'mHANJIN BRION': {
    '1군': { TOP: 'mCasting', JGL: 'mGIDEON', MID: 'mRoamer', ADC: 'mTeddy', SUP: 'mNamgung' },
    '2군': { TOP: 'mDDahyuk', JGL: 'mDinai', MID: 'mLoki', ADC: 'mOddEye', SUP: 'mPlanB' },
  },
  'mDplus Kia': {
    '1군': { TOP: 'mSiwoo', JGL: 'mLucid', MID: 'mShowMaker', ADC: 'mSmash', SUP: 'mCarrer' },
    '2군': { TOP: 'mJaehyuk', JGL: 'mSharvel', MID: 'mGarden', ADC: 'mWayne', SUP: 'mLoopy' },
  },
  'mDN SOOPers': {
    '1군': { TOP: 'mDuDu', JGL: 'mPyosik', MID: 'mClozer', ADC: 'mdeokdam', SUP: 'mLife' },
    '2군': { TOP: 'mLancer', JGL: 'mDDoiV', MID: 'mFlip', ADC: 'mEnosh', SUP: 'mPeter' },
  },
  'mHanwha Life Esports': {
    '1군': { TOP: 'mZeus', JGL: 'mKanavi', MID: 'mZeka', ADC: 'mGumayusi', SUP: 'mDelight' },
    '2군': { TOP: 'mPanther', JGL: 'mJackal', MID: 'mCracker', ADC: 'mPyeonsik', SUP: 'mBluffing' },
  },
  'mT1': {
    '1군': { TOP: 'mDoran', JGL: 'mOner', MID: 'mFaker', ADC: 'mPeyz', SUP: 'mKeria' },
    '2군': { TOP: 'mHaetae', JGL: 'mPinter', MID: 'mGuti', ADC: 'mCypher', SUP: 'mCloud' },
  },
  'mG2 Esports': {
    '1군': { TOP: 'mBrokenBlade', JGL: 'mSkewMond', MID: 'mCaps', ADC: 'mHans Sama', SUP: 'mLabrov' },
  },
  'mBilibili Gaming': {
    '1군': { TOP: 'mWenbo', JGL: 'mXun', MID: 'mKnight', ADC: 'mViper', SUP: 'mON' },
  },
  'mJDG Esports': {
    '1군': { TOP: 'mXiaoxu', JGL: 'mJunJia', MID: 'mHongQ', ADC: 'mGALA', SUP: 'mVampire' },
  },
  'mTop Esports': {
    '1군': { TOP: 'm369', JGL: 'mTian', MID: 'mCreme', ADC: 'mJackeyLove', SUP: 'mZhuo' },
  },
  'mWeibo Gaming': {
    '1군': { TOP: 'mZika', MID: 'mXiaohu', ADC: 'mElk', SUP: 'mJwei' },
  },
  "mAnyone's Legend": {
    '1군': { TOP: 'mBreathe', JGL: 'mTarzan', MID: 'mShanks', ADC: 'mHope', SUP: 'mKael' },
  },
};

// 상대 구단의 최근 10경기 전적을 파워 기반 확률로 생성 (실제 이력이 없는 AI 구단이므로 그럴듯하게 합성)
function generateOpponentRecentForm(club, region) {
  const others = (REGION_CLUBS[region] || []).filter((c) => c.name !== club.name);
  if (others.length === 0) return [];
  const winProb = clamp(0.3 + (club.power - 300) / 400, 0.15, 0.85);
  return Array.from({ length: 10 }).map(() => {
    const opp = others[randRange(0, others.length - 1)];
    const win = Math.random() < winProb;
    const userScore = win ? randRange(12, 25) : randRange(3, 14);
    const oppScore = win ? randRange(3, 14) : randRange(12, 25);
    return { opponentName: opp.name, win, scoreLabel: `${userScore}:${oppScore}` };
  });
}

function generateOpponentLineup(power, tierLabel, clubName) {
  const used = new Set();
  const idRef = { current: randRange(9000, 98000) };
  const per = power / 5;
  const tier = tierLabel || '1군';
  const fixedRoster = clubName && CLUB_FIXED_ROSTER[clubName] && CLUB_FIXED_ROSTER[clubName][tier];
  return POSITIONS.map((pos) => {
    const target = clamp(Math.round(per + randRange(-6, 6)), 20, 99);
    const spread = () => clamp(target + randRange(-8, 8), 10, 99);
    const mechanics = spread(), gameSense = spread(), teamfight = spread(), laning = spread();
    const overall = Math.round((mechanics + gameSense + teamfight + laning) / 4);
    const name = (fixedRoster && fixedRoster[pos]) || generateName(used);
    return {
      id: idRef.current++,
      name,
      position: pos, tier,
      mechanics, gameSense, teamfight, laning, overall,
      champion: null, kills: 0, deaths: 0, assists: 0, damage: 0,
      ...generateSignatureChampions(pos),
    };
  });
}

function homeFor(position, side) {
  if (side === 'user') {
    switch (position) {
      case 'TOP': return { x: 0.20, y: 0.25 };
      case 'MID': return { x: 0.46, y: 0.52 };
      case 'ADC': return { x: 0.80, y: 0.95 };
      case 'SUP': return { x: 0.74, y: 0.91 };
      case 'JGL': return { x: 0.36, y: 0.62 };
      default: return { x: 0.5, y: 0.5 };
    }
  }
  switch (position) {
    case 'TOP': return { x: 0.30, y: 0.12 };
    case 'MID': return { x: 0.54, y: 0.48 };
    case 'ADC': return { x: 0.88, y: 0.83 };
    case 'SUP': return { x: 0.82, y: 0.79 };
    case 'JGL': return { x: 0.64, y: 0.38 };
    default: return { x: 0.5, y: 0.5 };
  }
}

const BASE = { user: { x: 0.08, y: 0.96 }, ai: { x: 0.93, y: 0.06 } };
const TICKS_PER_MIN = 12; // 1틱 = 5초, 12틱 = 1분
const MAX_MOVE_PER_TICK = 20; // 사망/귀환(순간이동)을 제외한 모든 이동은 1틱당 이 거리(0~100 기준)를 넘지 않는다
// 0~1 스케일 두 좌표 사이의 거리를 0~100 기준으로 환산
function distance100(a, b) {
  const dx = (a.x - b.x) * 100;
  const dy = (a.y - b.y) * 100;
  return Math.sqrt(dx * dx + dy * dy);
}
// 두 지점 사이를 1틱당 MAX_MOVE_PER_TICK 이하로 이동하며 도달하는 데 필요한 최소 틱 수(최소값 보장)
function ticksForDistance(a, b, minTicks) {
  return Math.max(minTicks, Math.ceil(distance100(a, b) / MAX_MOVE_PER_TICK));
}
const RESPAWN_WALK_TICKS = 4; // 리스폰 후 우물에서 라인까지 복귀하는 데 걸리는 틱 수(약 20초)
// 외곽(먼저 파괴)에서 본진 쪽(나중에 파괴) 순서로 정렬된 팀별 타워 좌표
// 라인별 1차~3차 타워(9개) + 넥서스를 지키는 쌍둥이 타워(2개) = 총 11개
// 각 배열은 [탑1,탑2,탑3, 미드1,미드2,미드3, 봇1,봇2,봇3, 쌍둥이1,쌍둥이2] 순서로,
// 라인 내에서는 1차(바깥)→2차→3차(안쪽, 본진에 가까움) 순서로 배치했다.
const BLUE_TOWERS = [
  { x: 14, y: 32 }, { x: 14, y: 55 }, { x: 14, y: 72 },
  { x: 44, y: 56 }, { x: 38, y: 70 }, { x: 28, y: 76 },
  { x: 74, y: 92 }, { x: 49, y: 91 }, { x: 32, y: 92 },
  { x: 16, y: 86 }, { x: 19, y: 89 },
];
const RED_TOWERS = [
  { x: 35, y: 12 }, { x: 56, y: 12 }, { x: 72, y: 12 },
  { x: 62, y: 44 }, { x: 66, y: 30 }, { x: 75, y: 25 },
  { x: 94, y: 70 }, { x: 92, y: 45 }, { x: 92, y: 30 },
  { x: 83, y: 14 }, { x: 87, y: 17 },
];
const LANES = ['top', 'mid', 'bot'];

// 타워 배열의 인덱스(0~10)가 현재 objectives 상태 기준으로 파괴되었는지 판정
function isTowerDestroyed(sideObj, index) {
  if (index < 9) {
    const lane = LANES[Math.floor(index / 3)];
    const tierInLane = index % 3; // 0,1,2 = 1차,2차,3차
    return (sideObj.laneTowers ? sideObj.laneTowers[lane] : 0) > tierInLane;
  }
  return (sideObj.nexusTowers || 0) > (index - 9);
}
// 방어 시 머물 지점: 해당 포지션의 자기 라인에서 아직 서 있는 가장 바깥쪽(1차에 가까운) 타워. 라인 타워가 다 부서졌으면 쌍둥이 타워. 정글러는 대상 없음(null).
function ownTowerDefendPoint(side, position, objectives) {
  if (position === 'JGL') return null;
  const lane = position === 'TOP' ? 'top' : position === 'MID' ? 'mid' : 'bot';
  const opponent = side === 'user' ? 'ai' : 'user';
  const destroyedByOpp = objectives[opponent].laneTowers[lane];
  const towerArray = side === 'user' ? BLUE_TOWERS : RED_TOWERS;
  const laneIdx = LANES.indexOf(lane);
  if (destroyedByOpp < 3) {
    const t = towerArray[laneIdx * 3 + destroyedByOpp];
    return { x: t.x / 100, y: t.y / 100 };
  }
  const twinDestroyed = objectives[opponent].nexusTowers || 0;
  if (twinDestroyed < 2) {
    const t = towerArray[9 + twinDestroyed];
    return { x: t.x / 100, y: t.y / 100 };
  }
  return null;
}
const ZONES = {
  topLane: { x: 0.26, y: 0.12 },
  midLane: { x: 0.5, y: 0.5 },
  botLane: { x: 0.74, y: 0.86 },
  topRiver: { x: 0.3, y: 0.28 },
  botRiver: { x: 0.7, y: 0.72 },
  topJungle: { x: 0.22, y: 0.42 },
  botJungle: { x: 0.78, y: 0.58 },
  nearBlueBase: { x: 0.2, y: 0.78 },
  nearRedBase: { x: 0.8, y: 0.22 },
  baronPit: { x: 0.38, y: 0.32 },
  dragonPit: { x: 0.69, y: 0.73 },
};
// 맵에 표시되는 정글 캠프 마커 (이름으로 위치 조정 가능)
const JUNGLE_CAMPS = [
  { name: '블루 두꺼비', x: 16, y: 40, size: 7 },
  { name: '레드 돌거북', x: 44, y: 18, size: 7 },
  { name: '블루 블루', x: 25, y: 43, size: 10 },
  { name: '레드 늑대', x: 72, y: 43, size: 7 },
  { name: '레드 두꺼비', x: 82, y: 54, size: 7 },
  { name: '레드 블루', x: 71, y: 50, size: 10 },
  { name: '블루 레드', x: 50, y: 69, size: 10 },
  { name: '블루 돌거북', x: 55, y: 79, size: 7 },
  { name: '블루 늑대', x: 27, y: 54, size: 7 },
  { name: '레드 레드', x: 46, y: 24, size: 10 },
];
// 경기 흐름(초반/중반/후반)에 따라 교전이 벌어질 확률이 높은 구역이 달라진다.
// 상대 진영 깊숙한 곳(본진 인근)은 그쪽 라인의 3차 타워를 2개 이상 파괴해야만 진입할 수 있다(정글 지역은 예외로 항상 가능).
function pickZone(tickRatio, objectives) {
  let pool;
  if (tickRatio < 0.35) pool = ['topLane', 'topLane', 'midLane', 'botLane', 'botLane', 'topJungle', 'botJungle'];
  else if (tickRatio < 0.75) pool = ['midLane', 'topRiver', 'botRiver', 'topJungle', 'botJungle', 'topLane', 'botLane'];
  else pool = ['topRiver', 'botRiver', 'midLane', 'topJungle', 'botJungle'];
  if (objectives) {
    const userInvadeReady = LANES.filter((l) => objectives.user.laneTowers[l] >= 3).length >= 2;
    const aiInvadeReady = LANES.filter((l) => objectives.ai.laneTowers[l] >= 3).length >= 2;
    if (aiInvadeReady) pool.push('nearBlueBase', 'nearBlueBase');
    if (userInvadeReady) pool.push('nearRedBase', 'nearRedBase');
  }
  return ZONES[pool[randRange(0, pool.length - 1)]];
}

// 시드값 기반 결정론적 의사난수(0~1) - 같은 입력이면 항상 같은 값을 반환해 여러 틱에 걸친 보간에 사용
function pseudoRand(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
// 귀환이 아닌 이동은 순간이동하지 않고 cycleLen(틱)에 걸쳐 이전 목표점에서 다음 목표점으로 서서히 흘러가도록 한다
function smoothDrift(seed, tick, cycleLen, range) {
  const cyclePos = tick / cycleLen;
  const idx = Math.floor(cyclePos);
  const t = cyclePos - idx;
  const point = (i) => ({
    dx: (pseudoRand(seed * 31 + i * 97) - 0.5) * 2 * range,
    dy: (pseudoRand(seed * 53 + i * 131 + 17) - 0.5) * 2 * range,
  });
  const p1 = point(idx), p2 = point(idx + 1);
  return { dx: p1.dx + (p2.dx - p1.dx) * t, dy: p1.dy + (p2.dy - p1.dy) * t };
}

function computePositions(userLineup, aiLineup, eventParticipants, clashPoint, tick, pendingClash, objectives) {
  const homes = {};
  userLineup.forEach((p, i) => { homes['user-' + i] = homeFor(p.position, 'user'); });
  aiLineup.forEach((p, i) => { homes['ai-' + i] = homeFor(p.position, 'ai'); });
  const pos = {};
  const allPlayers = [
    ...userLineup.map((p, i) => ({ key: 'user-' + i, p, side: 'user' })),
    ...aiLineup.map((p, i) => ({ key: 'ai-' + i, p, side: 'ai' })),
  ];
  const userInvadeReady = objectives ? LANES.filter((l) => objectives.user.laneTowers[l] >= 3).length >= 2 : false;
  const aiInvadeReady = objectives ? LANES.filter((l) => objectives.ai.laneTowers[l] >= 3).length >= 2 : false;
  const JGL_WANDER_ZONES = ['topJungle', 'botJungle', 'topRiver', 'botRiver', 'midLane', 'topLane', 'botLane'];
  allPlayers.forEach(({ key, p, side }) => {
    const respawnAt = p.respawnAtTick || 0;
    if (tick != null && tick < respawnAt) {
      // 사망 중: 리스폰 시간 동안 맵에서 완전히 사라진다
      return;
    }
    if (tick != null && respawnAt > 0) {
      const fountain = BASE[side];
      const h = homes[key];
      const walkTicks = ticksForDistance(fountain, h, RESPAWN_WALK_TICKS);
      if (tick - respawnAt < walkTicks) {
        // 리스폰 직후: 우물에서 시작해 라인으로 서서히 복귀한다 (1틱당 최대 이동거리를 넘지 않는 속도로)
        const progress = clamp((tick - respawnAt) / walkTicks, 0, 1);
        pos[key] = {
          x: clamp(fountain.x + (h.x - fountain.x) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
          y: clamp(fountain.y + (h.y - fountain.y) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
        };
        return;
      }
    }
    if (tick != null && respawnAt === 0) {
      // 경기 시작 직후: 본진(리스폰 구역)에서 시작해 라인으로 서서히 걸어 들어간다
      const fountain = BASE[side];
      const h = homes[key];
      const walkInTicks = ticksForDistance(fountain, h, RESPAWN_WALK_TICKS);
      if (tick < walkInTicks) {
        const progress = clamp(tick / walkInTicks, 0, 1);
        pos[key] = {
          x: clamp(fountain.x + (h.x - fountain.x) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
          y: clamp(fountain.y + (h.y - fountain.y) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
        };
        return;
      }
    }
    if (pendingClash && (pendingClash.userKeys.includes(key) || pendingClash.aiKeys.includes(key))) {
      // 교전/오브젝트 장소로 이동 중이거나(travel), 끝나고 기준점으로 복귀하는 중(return): 경과 시간에 비례해 서서히 이동한다
      const h = homes[key];
      const target = pendingClash.targetPoint;
      const span = Math.max(1, pendingClash.arriveTick - pendingClash.startTick);
      const progress = clamp((tick - pendingClash.startTick) / span, 0, 1);
      const from = pendingClash.phase === 'return' ? target : h;
      const to = pendingClash.phase === 'return' ? h : target;
      pos[key] = {
        x: clamp(from.x + (to.x - from.x) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
        y: clamp(from.y + (to.y - from.y) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
      };
      return;
    }
    if (clashPoint && eventParticipants.includes(key)) {
      // 교전 중 제자리 움직임도 매 틱 순간이동하지 않고 부드럽게 흔들리도록 한다
      const { dx, dy } = smoothDrift(p.id, tick != null ? tick : 0, 2, 4);
      pos[key] = { x: clamp(clashPoint.x + dx / 100, 0.04, 0.96), y: clamp(clashPoint.y + dy / 100, 0.04, 0.96) };
      return;
    }
    const h = homes[key];
    // 교전 중이 아닐 때는 각자 정해진 주기(선수마다 시점이 다르게 분산됨)로 귀환한다.
    // 이동해서 넥서스로 가는 게 아니라, 제자리에서 귀환모션(10초=2틱) 동안 머문 뒤 그 자리에서 사라지고 본진에서 나타난다.
    // 본진에 머문 뒤 라인으로 돌아올 때는 순간이동하지 않고 거리에 비례해 서서히 걸어서 복귀한다.
    const fountain = BASE[side];
    const walkBackTicks = Math.max(2, ticksForDistance(fountain, h, 2));
    const cycleLen = 40 + walkBackTicks;
    const seed = (p.id * 13) % cycleLen;
    const cycleTick = (tick + seed) % cycleLen;
    const atBase = tick != null && cycleTick >= 32 && cycleTick < 40;
    const walkingBackFromBase = tick != null && cycleTick >= 40 && cycleTick < 40 + walkBackTicks;
    if (atBase) {
      pos[key] = { x: clamp(fountain.x + randRange(-3, 3) / 100, 0.04, 0.96), y: clamp(fountain.y + randRange(-3, 3) / 100, 0.04, 0.96) };
    } else if (walkingBackFromBase) {
      const progress = clamp((cycleTick - 40) / walkBackTicks, 0, 1);
      pos[key] = {
        x: clamp(fountain.x + (h.x - fountain.x) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
        y: clamp(fountain.y + (h.y - fountain.y) * progress + randRange(-3, 3) / 100, 0.04, 0.96),
      };
    } else if (objectives && objectives.baronAdvantage && objectives.baronAdvantage.untilTick > tick && objectives.baronAdvantage.side !== side && ownTowerDefendPoint(side, p.position, objectives)) {
      // 바론을 놓친 팀은 라인 기준점 대신, 자기 라인에서 아직 서 있는 가장 바깥쪽 타워 근처에 머물며 방어한다
      const defendPoint = ownTowerDefendPoint(side, p.position, objectives);
      const { dx, dy } = smoothDrift(p.id, tick != null ? tick : 0, 3, 4);
      pos[key] = { x: clamp(defendPoint.x + dx / 100, 0.04, 0.96), y: clamp(defendPoint.y + dy / 100, 0.04, 0.96) };
    } else if (p.position === 'JGL' && tick != null) {
      // 정글러는 유휴 상태일 때 상대 진영 안쪽을 침투할 수 있게 되기 전까지, 상대 진영을 제외한 전 지역을 자유롭게 순회한다.
      // 목적지가 바뀔 때도 순간이동하지 않고 8틱(40초)에 걸쳐 이전 목적지에서 다음 목적지로 서서히 이동한다.
      const invadeReady = side === 'user' ? userInvadeReady : aiInvadeReady;
      const wanderPool = invadeReady ? [...JGL_WANDER_ZONES, side === 'user' ? 'nearRedBase' : 'nearBlueBase'] : JGL_WANDER_ZONES;
      const wanderCycleLen = 8;
      const wanderSeed = (p.id * 17) % wanderCycleLen;
      const wanderPos = (tick + wanderSeed) / wanderCycleLen;
      const wanderIdx = Math.floor(wanderPos);
      const wanderProgress = wanderPos - wanderIdx;
      const destFor = (i) => ZONES[wanderPool[(p.id * 5 + i * 11) % wanderPool.length]];
      const d1 = destFor(wanderIdx), d2 = destFor(wanderIdx + 1);
      const destX = d1.x + (d2.x - d1.x) * wanderProgress;
      const destY = d1.y + (d2.y - d1.y) * wanderProgress;
      pos[key] = { x: clamp(destX + randRange(-3, 3) / 100, 0.04, 0.96), y: clamp(destY + randRange(-3, 3) / 100, 0.04, 0.96) };
    } else {
      // 라인에 머무는 동안도 매 틱 무작위로 순간이동하지 않고, 3틱(15초)에 걸쳐 서서히 흘러 다니듯 움직인다
      const { dx, dy } = smoothDrift(p.id, tick != null ? tick : 0, 3, 5);
      pos[key] = { x: clamp(h.x + dx / 100, 0.04, 0.96), y: clamp(h.y + dy / 100, 0.04, 0.96) };
    }
  });
  return pos;
}

function finalSiegePositions(userLineup, aiLineup, baseTarget) {
  const pos = {};
  userLineup.forEach((p, i) => { pos['user-' + i] = { x: clamp(baseTarget.x + randRange(-9, 9) / 100, 0.04, 0.96), y: clamp(baseTarget.y + randRange(-9, 9) / 100, 0.04, 0.96) }; });
  aiLineup.forEach((p, i) => { pos['ai-' + i] = { x: clamp(baseTarget.x + randRange(-9, 9) / 100, 0.04, 0.96), y: clamp(baseTarget.y + randRange(-9, 9) / 100, 0.04, 0.96) }; });
  return pos;
}

function tickAdvance(prev) {
  if (prev.finished) return prev;
  const tick = prev.tick + 1;
  const userLineup = prev.userLineup.map((p) => ({ ...p }));
  const aiLineup = prev.aiLineup.map((p) => ({ ...p }));
  let userScore = prev.userScore, aiScore = prev.aiScore;
  let log = prev.log;
  let eventParticipants = [];
  const isFinalTick = tick >= prev.totalTicks;
  const tickRatio = tick / prev.totalTicks;
  const objectives = {
    user: {
      laneTowers: prev.objectives.user.laneTowers ? { ...prev.objectives.user.laneTowers } : { top: 0, mid: 0, bot: 0 },
      nexusTowers: prev.objectives.user.nexusTowers || 0,
      barons: prev.objectives.user.barons, dragons: [...prev.objectives.user.dragons],
    },
    ai: {
      laneTowers: prev.objectives.ai.laneTowers ? { ...prev.objectives.ai.laneTowers } : { top: 0, mid: 0, bot: 0 },
      nexusTowers: prev.objectives.ai.nexusTowers || 0,
      barons: prev.objectives.ai.barons, dragons: [...prev.objectives.ai.dragons],
    },
    lastTowerTick: prev.objectives.lastTowerTick != null ? prev.objectives.lastTowerTick : -999,
    aceAdvantage: prev.objectives.aceAdvantage || null,
    baronAdvantage: prev.objectives.baronAdvantage || null,
    nextDragonType: prev.objectives.nextDragonType || DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)],
    nextDragonTick: prev.objectives.nextDragonTick != null ? prev.objectives.nextDragonTick : 5 * TICKS_PER_MIN,
    nextBaronTick: prev.objectives.nextBaronTick != null ? prev.objectives.nextBaronTick : 20 * TICKS_PER_MIN,
  };
  let elderBuff = prev.elderBuff && prev.elderBuff.ticksLeft > 1 ? { ...prev.elderBuff, ticksLeft: prev.elderBuff.ticksLeft - 1 } : null;
  const ARRIVE_TICKS = 3; // 15초(3틱) 동안 이동해서 모인다
  let capBurstUsed = prev.capBurstUsed || false;

  // 최종 결전 시퀀스가 이미 시작되어 진행 중이라면, 다른 판정보다 최우선으로 이어서 처리한다
  if (prev.endingSequence) {
    const es = prev.endingSequence;
    const winnerLineup = es.winnerSide === 'user' ? userLineup : aiLineup;
    const loserLineup = es.loserSide === 'user' ? userLineup : aiLineup;
    const winnerKeys = winnerLineup.map((_, i) => `${es.winnerSide}-${i}`);

    if (tick < es.arriveTick) {
      // 상대 진영으로 진격하는 중 - 서서히 이동한다 (승리 팀만)
      eventParticipants = winnerKeys;
      const pc = {
        userKeys: es.winnerSide === 'user' ? winnerKeys : [], aiKeys: es.winnerSide === 'ai' ? winnerKeys : [],
        targetPoint: es.targetPoint, startTick: es.startTick, arriveTick: es.arriveTick,
      };
      const positions = computePositions(userLineup, aiLineup, eventParticipants, null, tick, pc, objectives);
      return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff, capBurstUsed, pendingClash: null, endingSequence: es };
    }

    // 도착: 진영을 벗어나지 않고 양 팀이 한데 모여 계속 교전한다 (아직 살아있는 패배 팀원도 함께 표시)
    const survivingLoserIdx = loserLineup.map((p, i) => i).filter((i) => !loserLineup[i].finaleEliminated);
    const survivingLoserKeys = survivingLoserIdx.map((i) => `${es.loserSide}-${i}`);
    eventParticipants = [...winnerKeys, ...survivingLoserKeys];
    const winnerLabel = es.winnerSide === 'user' ? '우리 팀' : '상대 팀';
    let newEs = es;

    if (!es.teardownStarted) {
      // 아직 파괴 시작 전 - 패배 팀이 목표 인원(3~5명)만큼 쓰러질 때까지 계속 교전한다
      if (survivingLoserIdx.length > 0 && Math.random() < 0.6) {
        const victimIdx = survivingLoserIdx[randRange(0, survivingLoserIdx.length - 1)];
        const victim = loserLineup[victimIdx];
        victim.deaths += 1;
        victim.finaleEliminated = true;
        victim.respawnAtTick = Infinity;
        const killer = winnerLineup[randRange(0, winnerLineup.length - 1)];
        killer.kills += 1;
        if (es.winnerSide === 'user') userScore += 2; else aiScore += 2;
        log = [{ id: tick + '-' + Math.random(), text: `${killer.name}(${killer.champion})님이 ${victim.name}(${victim.champion})님을 처치했습니다!` }, ...log].slice(0, 6);
      }
      const eliminatedCount = loserLineup.filter((p) => p.finaleEliminated).length;
      if (eliminatedCount >= es.deathThreshold) {
        newEs = { ...es, teardownStarted: true, teardownStartTick: tick, teardownStep: 0 };
        log = [{ id: tick + '-teardown', text: `${es.loserSide === 'user' ? '우리' : '상대'} 진영의 방어선이 무너지며 쌍둥이 타워가 위협받습니다!` }, ...log].slice(0, 6);
      }
    } else {
      // 파괴 단계: 쌍둥이 타워1 → 쌍둥이 타워2 → 넥서스 순서로, 총 25초(5틱)에 걸쳐 진행한다
      const elapsed = tick - es.teardownStartTick;
      const lo = objectives[es.loserSide];
      if (es.teardownStep === 0 && elapsed >= 2) {
        LANES.forEach((l) => { lo.laneTowers[l] = 3; });
        lo.nexusTowers = 1;
        log = [{ id: tick + '-twin1', text: `${winnerLabel}이(가) 쌍둥이 타워 하나를 파괴했습니다!` }, ...log].slice(0, 6);
        newEs = { ...es, teardownStep: 1 };
      } else if (es.teardownStep === 1 && elapsed >= 4) {
        lo.nexusTowers = 2;
        log = [{ id: tick + '-twin2', text: `${winnerLabel}이(가) 나머지 쌍둥이 타워도 파괴했습니다!` }, ...log].slice(0, 6);
        newEs = { ...es, teardownStep: 2 };
      } else if (es.teardownStep === 2 && elapsed >= 5) {
        objectives.nexusDestroyed = es.loserSide;
        log = [{ id: tick + '-nexus', text: `${winnerLabel}이(가) 넥서스를 파괴했습니다! 경기 종료!` }, ...log].slice(0, 6);
        const positions = computePositions(userLineup, aiLineup, eventParticipants, es.targetPoint, tick, null, objectives);
        const allKeys = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
        return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: true, eventParticipants: allKeys, objectives, finalWin: es.finalWin, elderBuff, capBurstUsed, pendingClash: null, endingSequence: null };
      }
    }
    const positions = computePositions(userLineup, aiLineup, eventParticipants, es.targetPoint, tick, null, objectives);
    return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff, capBurstUsed, pendingClash: null, endingSequence: newEs };
  }

  const userPower = userLineup.reduce((s, p) => s + p.overall, 0);
  const aiPower = aiLineup.reduce((s, p) => s + p.overall, 0);

  function sideChance() {
    let chance = balancedChance(userPower, aiPower, userScore, aiScore);
    if (elderBuff) {
      chance = elderBuff.side === 'user' ? clamp(chance + 0.14, 0.05, 0.95) : clamp(chance - 0.14, 0.05, 0.95);
    }
    if (objectives.aceAdvantage && objectives.aceAdvantage.untilTick > tick) {
      chance = objectives.aceAdvantage.side === 'user' ? clamp(chance + 0.4, 0.05, 0.97) : clamp(chance - 0.4, 0.05, 0.97);
    }
    if (objectives.baronAdvantage && objectives.baronAdvantage.untilTick > tick) {
      chance = objectives.baronAdvantage.side === 'user' ? clamp(chance + 0.3, 0.05, 0.97) : clamp(chance - 0.3, 0.05, 0.97);
    }
    return chance;
  }

  const killCap = prev.killCap != null ? prev.killCap : 28;

  function currentTotalKills() {
    return userLineup.reduce((s, p) => s + p.kills, 0) + aiLineup.reduce((s, p) => s + p.kills, 0);
  }

  function sample(list, n) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randRange(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.max(0, n));
  }

  function availablePlayers(arr) {
    return arr.map((p, i) => ({ p, i })).filter(({ p }) => tick >= (p.respawnAtTick || 0));
  }

  function selectFightParticipants() {
    const remainingBudget = killCap - currentTotalKills();
    if (remainingBudget <= 0) return null;
    const userAvail = availablePlayers(userLineup);
    const aiAvail = availablePlayers(aiLineup);
    if (userAvail.length === 0 || aiAvail.length === 0) return null;

    // 킬 상한에 가까워지면(남은 여유 3~8킬) 마지막으로 양팀이 크게 모이는 결정적 한타를 한 번 터뜨린다
    const isCapBurst = !capBurstUsed && remainingBudget >= 3 && remainingBudget <= 8;

    // 초반 10분까지는 양쪽 다 1명씩인 1:1 결투가 발생할 확률을 20%로 유지한다
    const isEarlyGame = tick < 10 * TICKS_PER_MIN;
    if (!isCapBurst && isEarlyGame && Math.random() < 0.20) {
      const userParticipants = sample(userAvail, 1);
      const aiParticipants = sample(aiAvail, 1);
      return { userParticipants, aiParticipants, isCapBurst };
    }

    // 1:1 결투는 드물게, 다인 한타는 훨씬 자주 나오도록 인원 수를 가중치 기반으로 뽑는다
    function pickParticipantCount(maxAvail) {
      const cap = Math.min(5, maxAvail);
      if (cap <= 1) return cap;
      const roll = Math.random();
      if (roll < 0.20) return cap; // 대규모 한타(가능한 최대 인원)
      if (roll < 0.92) return Math.max(2, cap - 1); // 중규모 교전
      return randRange(1, cap); // 나머지 소수 확률로만 소규모/1:1
    }

    // 교전에 모이는 인원 수를 정한다 (많이 모일수록 이후 킬 상한도 늘어난다)
    const userCount = isCapBurst ? Math.min(5, userAvail.length) : pickParticipantCount(userAvail.length);
    const aiCount = isCapBurst ? Math.min(5, aiAvail.length) : pickParticipantCount(aiAvail.length);
    const userParticipants = sample(userAvail, userCount);
    const aiParticipants = sample(aiAvail, aiCount);
    return { userParticipants, aiParticipants, isCapBurst };
  }

  function planTeamfight(preSelected) {
    let userParticipants, aiParticipants, isCapBurst;
    if (preSelected) {
      // preSelected는 게더링이 시작된 시점(이전 틱)에 골라둔 것이라 그 안의 선수 객체가 낡았을 수 있다.
      // 인덱스만 취해 이번 틱의 실제 userLineup/aiLineup 객체로 다시 연결한다.
      userParticipants = preSelected.userParticipants.map(({ i }) => ({ p: userLineup[i], i }));
      aiParticipants = preSelected.aiParticipants.map(({ i }) => ({ p: aiLineup[i], i }));
      isCapBurst = preSelected.isCapBurst;
    } else {
      const sel = selectFightParticipants();
      if (!sel) return null;
      ({ userParticipants, aiParticipants, isCapBurst } = sel);
    }
    const remainingBudget = killCap - currentTotalKills();
    if (remainingBudget <= 0) return null;
    const userCount = userParticipants.length, aiCount = aiParticipants.length;

    userParticipants.forEach(({ p }) => { p.damage = (p.damage || 0) + Math.round(p.overall * 3.2) + randRange(40, 120); });
    aiParticipants.forEach(({ p }) => { p.damage = (p.damage || 0) + Math.round(p.overall * 3.2) + randRange(40, 120); });

    const userTeamPower = userParticipants.reduce((s, { p }) => s + p.overall, 0);
    const aiTeamPower = aiParticipants.reduce((s, { p }) => s + p.overall, 0);
    const rawProb = userTeamPower / (userTeamPower + aiTeamPower);
    let matchupSum = 0, matchupCount = 0;
    userParticipants.forEach(({ p: up }) => {
      aiParticipants.forEach(({ p: ap }) => {
        matchupSum += championMatchupMod(up.champion, ap.champion);
        matchupCount++;
      });
    });
    const avgMatchup = matchupCount > 0 ? matchupSum / matchupCount : 0;
    const statAdvantage = userTeamPower - aiTeamPower;
    const matchupWeight = clamp(1 - statAdvantage / 60, 0.15, 1.5);
    const combinedProb = clamp(rawProb * 0.55 + sideChance() * 0.45 + avgMatchup * matchupWeight, 0.08, 0.92);
    const winSide = Math.random() < combinedProb ? 'user' : 'ai';
    const winParticipants = winSide === 'user' ? userParticipants : aiParticipants;
    const loseParticipants = winSide === 'user' ? aiParticipants : userParticipants;

    // 분당(교전당) 0~9킬, 모인 인원이 많을수록 최대치가 늘어난다 (마무리 폭발 시에는 3~8킬로 고정)
    const totalParticipants = userCount + aiCount;
    const maxKillsThisFight = clamp(totalParticipants, 1, 9);
    let killsThisFight = isCapBurst ? randRange(3, Math.min(8, remainingBudget)) : randRange(0, maxKillsThisFight);
    killsThisFight = Math.min(killsThisFight, loseParticipants.length, remainingBudget);
    if (killsThisFight <= 0) return null;
    // 패배 팀이 전멸(에이스)하는 경우는 평소엔 드물게, 경기 극후반부로 갈수록 자주 나오게 한다
    if (!isCapBurst && killsThisFight === loseParticipants.length && loseParticipants.length >= 3) {
      const aceAllowProb = clamp(0.06 + Math.pow(tickRatio, 4) * 0.6, 0.06, 0.6);
      if (Math.random() > aceAllowProb) killsThisFight -= 1;
    }
    if (killsThisFight <= 0) return null;
    if (isCapBurst) capBurstUsed = true;

    const victims = sample(loseParticipants, killsThisFight);
    // 서포터는 상대적으로 킬 확률을 낮게, 그 외 포지션은 동일 가중치로 킬러를 뽑는다 (인덱스만 반환)
    function pickKillerIndex() {
      const weights = winParticipants.map(({ p }) => (p.position === 'SUP' ? 0.2 : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      for (let idx = 0; idx < winParticipants.length; idx++) {
        if (roll < weights[idx]) return winParticipants[idx].i;
        roll -= weights[idx];
      }
      return winParticipants[winParticipants.length - 1].i;
    }
    const victimPlans = victims.map(({ i: victimIndex }) => ({ victimIndex, killerIndex: pickKillerIndex() }));

    return {
      winSide, loseSide: winSide === 'user' ? 'ai' : 'user', killsThisFight,
      winIndices: winParticipants.map(({ i }) => i),
      victimPlans,
      userKeys: userParticipants.map(({ i }) => 'user-' + i),
      aiKeys: aiParticipants.map(({ i }) => 'ai-' + i),
    };
  }

  // 계획된 킬 중 하나를 실제로 적용(사망/리스폰 타이머/로그/어시스트) - 항상 "이번 틱"의 실제 라인업 배열에서 대상을 다시 조회한다
  function applyOneKill(plan, index, atTick) {
    const { victimIndex, killerIndex } = plan.victimPlans[index];
    const loseLineup = plan.loseSide === 'user' ? userLineup : aiLineup;
    const winLineup = plan.winSide === 'user' ? userLineup : aiLineup;
    const victim = loseLineup[victimIndex];
    const killer = winLineup[killerIndex];
    if (!victim || !killer) return;
    const gameMinutes = atTick / TICKS_PER_MIN;
    const respawnSeconds = gameMinutes < 10 ? 10 : Math.min(55, 10 + (gameMinutes - 10) * 4);
    const respawnDuration = Math.max(1, Math.round(respawnSeconds / 5));
    victim.deaths++;
    victim.respawnAtTick = atTick + respawnDuration;
    killer.kills++;
    log = [{ id: atTick + '-' + Math.random(), text: `${killer.name}(${killer.champion})님이 ${victim.name}(${victim.champion})님을 처치했습니다!` }, ...log].slice(0, 6);
    plan.winIndices.forEach((wi) => {
      if (wi === killerIndex) return;
      const assistCandidate = winLineup[wi];
      if (!assistCandidate) return;
      const assistChance = assistCandidate.position === 'SUP' ? 0.85 : 0.5;
      if (Math.random() < assistChance) assistCandidate.assists++;
    });
  }

  // 한타 종료 시점에 스코어 반영과 멀티킬/ACE 로그를 마무리
  function finalizeTeamfight(plan) {
    const { winSide, killsThisFight } = plan;
    if (winSide === 'user') userScore += killsThisFight * 2; else aiScore += killsThisFight * 2;
    const winLabel = winSide === 'user' ? '우리 팀' : '상대 팀';
    const winLineup = winSide === 'user' ? userLineup : aiLineup;
    const killTally = new Map();
    plan.victimPlans.forEach(({ killerIndex }) => killTally.set(killerIndex, (killTally.get(killerIndex) || 0) + 1));
    const multiKillLabels = { 2: '더블킬', 3: '트리플킬', 4: '쿼드라킬', 5: '펜타킬' };
    killTally.forEach((count, killerIdx) => {
      const killerPlayer = winLineup[killerIdx];
      if (multiKillLabels[count] && killerPlayer) {
        log = [{ id: tick + '-' + Math.random(), text: `${killerPlayer.champion}이(가) ${multiKillLabels[count]}!` }, ...log].slice(0, 6);
      }
    });
    const losingFullLineup = winSide === 'user' ? aiLineup : userLineup;
    const isAce = losingFullLineup.length === 5 && losingFullLineup.every((p) => tick < (p.respawnAtTick || 0));
    if (isAce) {
      log = [{ id: tick + '-' + Math.random(), text: `${winLabel} ACE!` }, ...log].slice(0, 6);
      objectives.aceAdvantage = { side: winSide, untilTick: tick + 6 };
    }
  }

  // 이동/전투 단계 없이 즉시 해결이 필요한 경우(예: 경기 최종 결전)를 위한 래퍼
  function resolveTeamfight(preSelected) {
    const plan = planTeamfight(preSelected);
    if (!plan) return false;
    plan.victimPlans.forEach((_, idx) => applyOneKill(plan, idx, tick));
    finalizeTeamfight(plan);
    eventParticipants = [...plan.userKeys, ...plan.aiKeys];
    return true;
  }

  // 타워 공략 대상(팀/라인/티어 또는 쌍둥이)을 미리 결정한다 (실제 파괴는 이동+공성 이후 applyTowerPush에서)
  // 특정 라인(top/mid/bot)을 지키는 defenderSide 챔피언들이 전부 사망 중인지 확인
  function isLaneEmpty(defenderSide, lane) {
    const defenderLineup = defenderSide === 'user' ? userLineup : aiLineup;
    const lanePositions = lane === 'top' ? ['TOP'] : lane === 'mid' ? ['MID'] : ['ADC', 'SUP'];
    const laners = defenderLineup.filter((p) => lanePositions.includes(p.position));
    return laners.length > 0 && laners.every((p) => tick < (p.respawnAtTick || 0));
  }
  // attackerSide 입장에서 상대가 약화된 상태(3명 이상 사망, 또는 라인 2개 이상이 비어있음)인지 확인
  function isOpponentWeak(attackerSide) {
    const defenderSide = attackerSide === 'user' ? 'ai' : 'user';
    const defenderLineup = defenderSide === 'user' ? userLineup : aiLineup;
    const deadCount = defenderLineup.filter((p) => tick < (p.respawnAtTick || 0)).length;
    const emptyLaneCount = LANES.filter((l) => isLaneEmpty(defenderSide, l)).length;
    return deadCount >= 3 || emptyLaneCount >= 2;
  }

  function planTowerPush() {
    if (tick - objectives.lastTowerTick < 4) return null; // 타워 파괴 후 최소 20초(4틱) 쿨다운
    const side = Math.random() < sideChance() ? 'user' : 'ai';
    const so = objectives[side];
    const incompleteLanes = LANES.filter((l) => so.laneTowers[l] < 3);
    let isTwin = false, lane = null, tier = null;
    if (so.nexusTowers < 2) {
      const anyLaneCleared = LANES.some((l) => so.laneTowers[l] >= 3);
      const allLanesAtLeast2 = LANES.every((l) => so.laneTowers[l] >= 2);
      const twinEligible = anyLaneCleared && (allLanesAtLeast2 || Math.random() < 0.01);
      if (twinEligible && (incompleteLanes.length === 0 || Math.random() < 0.5)) isTwin = true;
    }
    if (!isTwin) {
      if (incompleteLanes.length === 0) return null;
      // 상대가 약화된 상태라면, 비어있는(수비수가 전멸한) 라인을 적극적으로 노린다
      if (isOpponentWeak(side)) {
        const emptyIncompleteLanes = incompleteLanes.filter((l) => isLaneEmpty(side === 'user' ? 'ai' : 'user', l));
        lane = emptyIncompleteLanes.length > 0
          ? emptyIncompleteLanes[randRange(0, emptyIncompleteLanes.length - 1)]
          : incompleteLanes[randRange(0, incompleteLanes.length - 1)];
      } else {
        lane = incompleteLanes[randRange(0, incompleteLanes.length - 1)];
      }
      tier = so.laneTowers[lane] + 1;
    }
    // side가 파괴하는 대상은 상대 팀의 타워 배열이다
    const towerArray = side === 'user' ? RED_TOWERS : BLUE_TOWERS;
    const arrayIndex = isTwin ? (so.nexusTowers === 0 ? 9 : 10) : LANES.indexOf(lane) * 3 + (tier - 1);
    const towerPos = towerArray[arrayIndex];
    const label = isTwin ? '쌍둥이 타워' : `${{ top: '탑', mid: '미드', bot: '봇' }[lane]} ${tier}차 타워`;
    return { side, isTwin, lane, label, targetPoint: { x: towerPos.x / 100, y: towerPos.y / 100 } };
  }

  // 계획된 타워 공략을 실제로 적용
  function applyTowerPush(plan) {
    const so = objectives[plan.side];
    if (plan.isTwin) {
      so.nexusTowers += 1;
      if (so.nexusTowers >= 2) objectives.nexusDestroyed = plan.side === 'user' ? 'ai' : 'user'; // 쌍둥이 타워 2개가 다 부서지면 즉시 해당 진영의 넥서스 파괴 상태로 반영
    } else {
      so.laneTowers[plan.lane] += 1;
    }
    objectives.lastTowerTick = tick;
    if (plan.side === 'user') userScore += 3; else aiScore += 3;
  }

  function resolveObjective(type) {
    const side = Math.random() < sideChance() ? 'user' : 'ai';
    if (side === 'user') userScore += 3; else aiScore += 3;
    let objLogLabel = type;
    let isElder = false;
    if (type === '바론') {
      objectives[side].barons += 1;
      objectives.nextBaronTick = tick + 6 * TICKS_PER_MIN;
      objectives.baronAdvantage = { side, untilTick: tick + 36 }; // 바론 버프 지속시간(약 3분) 동안 아이콘 표시 및 적극적 공략에 사용
    } else if (type === '드래곤') {
      objectives.nextDragonTick = tick + 5 * TICKS_PER_MIN;
      const elderReady = Math.max(objectives.user.dragons.length, objectives.ai.dragons.length) >= 4;
      const dType = elderReady ? '장로' : (objectives.nextDragonType || DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)]);
      objectives[side].dragons.push(dType);
      objLogLabel = elderReady ? '장로 드래곤' : `${dType} 드래곤`;
      isElder = elderReady;
      if (elderReady) elderBuff = { side, ticksLeft: 3 * TICKS_PER_MIN };
      // 다음에 등장할 드래곤 유형을 미리 정해둔다 (등장과 동시에 맵 아이콘 색상에 반영하기 위함)
      objectives.nextDragonType = DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)];
    }
    return { side, objLogLabel, isElder };
  }

  // 경기 진행률에 따른 목표 페이스 (85% 지점까지 최소 기준 도달을 목표로 완만하게 보정) - 라인 타워(팀당 최대 9개)만 대상, 쌍둥이 타워는 페이스 보정 대상이 아니다
  const paceRatio = Math.min(1, tickRatio / 0.85);
  const targetDragons = 3 * paceRatio;
  const targetLeaderLaneTowers = 7 * paceRatio;
  const totalDragonsSoFar = objectives.user.dragons.length + objectives.ai.dragons.length;
  const laneTowerCount = (o) => LANES.reduce((s, l) => s + o.laneTowers[l], 0);
  const leaderTowersSoFar = Math.max(laneTowerCount(objectives.user), laneTowerCount(objectives.ai));
  const dragonBehind = totalDragonsSoFar < targetDragons;
  const towerBehind = leaderTowersSoFar < targetLeaderLaneTowers;
  const nearEnd = tick >= prev.totalTicks - 2 * TICKS_PER_MIN;

  if (isFinalTick) {
    // 최종 안전장치: 페이스 보정에도 불구하고 여전히 미달이면 마지막에 최소한만 채운다(대부분 이미 충족된 상태)
    const totalDragonsNow = objectives.user.dragons.length + objectives.ai.dragons.length;
    if (totalDragonsNow < 3) {
      const need = 3 - totalDragonsNow;
      for (let i = 0; i < need; i++) {
        const side = userScore >= aiScore ? 'user' : 'ai';
        const elderReady = Math.max(objectives.user.dragons.length, objectives.ai.dragons.length) >= 4;
        const dType = elderReady ? '장로' : DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)];
        objectives[side].dragons.push(dType);
        if (side === 'user') userScore += 3; else aiScore += 3;
      }
    }
    const leaderSide = laneTowerCount(objectives.user) >= laneTowerCount(objectives.ai) ? 'user' : 'ai';
    let leaderLaneCount = laneTowerCount(objectives[leaderSide]);
    if (leaderLaneCount < 7) {
      let need = 7 - leaderLaneCount;
      // 라인 순서(1차→2차→3차)를 지키며 채운다 - 한 라인이 다 차면 다음 라인으로
      while (need > 0) {
        const lane = LANES.find((l) => objectives[leaderSide].laneTowers[l] < 3);
        if (!lane) break;
        objectives[leaderSide].laneTowers[lane] += 1;
        need -= 1;
        if (leaderSide === 'user') userScore += 3; else aiScore += 3;
      }
    }

    let finalWin;
    if (userScore !== aiScore) finalWin = userScore > aiScore;
    else {
      const up = userLineup.reduce((s, p) => s + p.overall, 0);
      const ap = aiLineup.reduce((s, p) => s + p.overall, 0);
      finalWin = up === ap ? Math.random() < 0.5 : up > ap;
    }
    // 즉시 끝내지 않고, 승리 팀이 패배 진영의 쌍둥이 타워 근처로 서서히 진격해 그곳에서 계속 교전하다가,
    // 패배 팀이 3~5명 쓰러진 뒤에야 쌍둥이 타워 2개와 넥서스를 순서대로(25초에 걸쳐) 파괴하는 결전 시퀀스를 시작한다
    const winnerSide = finalWin ? 'user' : 'ai';
    const loserSide = finalWin ? 'ai' : 'user';
    const winnerLineup = winnerSide === 'user' ? userLineup : aiLineup;
    const loserTowerArray = loserSide === 'user' ? BLUE_TOWERS : RED_TOWERS;
    const targetPoint = { x: (loserTowerArray[9].x + loserTowerArray[10].x) / 2 / 100, y: (loserTowerArray[9].y + loserTowerArray[10].y) / 2 / 100 };
    let travelTicks = ARRIVE_TICKS;
    winnerLineup.forEach((p) => { travelTicks = Math.max(travelTicks, ticksForDistance(homeFor(p.position, winnerSide), targetPoint, ARRIVE_TICKS)); });
    const arriveTick = tick + travelTicks;
    const deathThreshold = randRange(3, 5);
    const endingSequence = { winnerSide, loserSide, targetPoint, startTick: tick, arriveTick, finalWin, deathThreshold, teardownStarted: false, teardownStep: 0, teardownStartTick: null };
    log = [{ id: tick + '-final', text: `최종 결전을 위해 ${loserSide === 'user' ? '우리' : '상대'} 진영으로 진격합니다!` }, ...log].slice(0, 6);
    const participantKeys = winnerLineup.map((_, i) => `${winnerSide}-${i}`);
    eventParticipants = participantKeys;
    const pc = {
      userKeys: winnerSide === 'user' ? participantKeys : [], aiKeys: winnerSide === 'ai' ? participantKeys : [],
      targetPoint, startTick: tick, arriveTick,
    };
    const positions = computePositions(userLineup, aiLineup, eventParticipants, null, tick, pc, objectives);
    return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff, capBurstUsed, pendingClash: null, endingSequence };
  }

  const totalBarons = objectives.user.barons + objectives.ai.barons;
  const aceAdvantageActive = objectives.aceAdvantage && objectives.aceAdvantage.untilTick > tick;
  const baronAdvantageActive = objectives.baronAdvantage && objectives.baronAdvantage.untilTick > tick;
  const objectiveRushMult = (aceAdvantageActive || baronAdvantageActive) ? 4 : 1; // ACE 또는 바론 직후에는 오브젝트를 적극적으로 노린다
  // 판정이 분당 1회에서 틱당(5초당) 1회로 12배 잦아졌으므로, 분당 확률을 틱당 확률로 환산(÷12)한다
  const skirmishChance = 0.65 / TICKS_PER_MIN;
  const towerAvailable = tick >= 5 * TICKS_PER_MIN;
  const opponentWeakBoost = (isOpponentWeak('user') || isOpponentWeak('ai')) ? 2.5 : 1; // 상대가 약화된 상태면 타워를 더 적극적으로 노린다
  let towerChance = 0;
  if (towerAvailable) {
    towerChance = (0.50 + tickRatio * 0.25) / TICKS_PER_MIN;
    if (towerBehind) towerChance += (nearEnd ? 0.85 : 0.55) / TICKS_PER_MIN;
    const baronTowerBoost = baronAdvantageActive ? 2.5 : 1; // 바론 버프 유지 중에는 타워 파괴를 한층 더 적극적으로 노린다
    towerChance *= objectiveRushMult * opponentWeakBoost * baronTowerBoost;
  }
  const dragonAvailable = tick >= objectives.nextDragonTick;
  let dragonChance = 0;
  if (dragonAvailable) {
    dragonChance = (1.10 + tickRatio * 0.20) / TICKS_PER_MIN;
    if (dragonBehind) dragonChance += (nearEnd ? 0.35 : 0.15) / TICKS_PER_MIN;
    dragonChance *= objectiveRushMult;
  }
  const baronAvailable = tick >= objectives.nextBaronTick;
  const baronChance = (baronAvailable && totalBarons < 2) ? (0.75 / TICKS_PER_MIN) * objectiveRushMult : 0;
  const heraldChance = tickRatio < 0.55 ? 0.05 / TICKS_PER_MIN : 0;

  let pendingClash = prev.pendingClash || null;
  let justResolvedPoint = null;
  let justResolvedKind = null;

  if (pendingClash && pendingClash.phase === 'travel' && tick < pendingClash.arriveTick) {
    // 아직 모이는 중 - 새 판정을 굴리지 않고 이동만 진행
    eventParticipants = [...pendingClash.userKeys, ...pendingClash.aiKeys];
  } else if (pendingClash && pendingClash.phase === 'travel' && tick >= pendingClash.arriveTick) {
    // 도착 - 이동을 마치고 15~20초(3~4틱)간 그 자리에서 교전/처리 상태로 전환
    eventParticipants = [...pendingClash.userKeys, ...pendingClash.aiKeys];
    const combatTicks = pendingClash.kind === 'tower' ? 3 : randRange(3, 4); // 타워는 정확히 15초(3틱) 공성
    if (pendingClash.kind === 'fight') {
      const plan = planTeamfight(pendingClash.selection);
      pendingClash = plan
        ? { ...pendingClash, phase: 'combat', combatPlan: plan, appliedCount: 0, resolveTick: tick + combatTicks }
        : null;
    } else if (pendingClash.kind === 'tower' && pendingClash.fightSelection) {
      const plan = planTeamfight(pendingClash.fightSelection);
      pendingClash = { ...pendingClash, phase: 'combat', combatPlan: plan, appliedCount: 0, resolveTick: tick + combatTicks };
    } else {
      pendingClash = { ...pendingClash, phase: 'combat', resolveTick: tick + combatTicks };
    }
  } else if (pendingClash && pendingClash.phase === 'combat' && tick < pendingClash.resolveTick) {
    // 교전 중: 목표 지점에서 조금씩 움직이며 싸운다. 동반 교전이 있다면 이번 틱에 1~2명만 처치를 적용한다
    eventParticipants = [...pendingClash.userKeys, ...pendingClash.aiKeys];
    if (pendingClash.combatPlan) {
      const plan = pendingClash.combatPlan;
      const remaining = plan.victimPlans.length - pendingClash.appliedCount;
      if (remaining > 0) {
        const applyNow = Math.min(remaining, randRange(1, 2));
        for (let k = 0; k < applyNow; k++) applyOneKill(plan, pendingClash.appliedCount + k, tick);
        pendingClash = { ...pendingClash, appliedCount: pendingClash.appliedCount + applyNow };
      }
    }
  } else if (pendingClash && pendingClash.phase === 'combat' && tick >= pendingClash.resolveTick) {
    // 교전/처리 종료 - 마무리
    justResolvedPoint = pendingClash.targetPoint;
    justResolvedKind = pendingClash.kind;
    eventParticipants = [...pendingClash.userKeys, ...pendingClash.aiKeys];
    if (pendingClash.combatPlan) {
      const plan = pendingClash.combatPlan;
      for (let k = pendingClash.appliedCount; k < plan.victimPlans.length; k++) applyOneKill(plan, k, tick);
      finalizeTeamfight(plan);
    }
    if (pendingClash.kind === 'dragon') {
      const { side, objLogLabel, isElder } = resolveObjective('드래곤');
      const flavor = isElder ? `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 치열한 한타 끝에 ${objLogLabel}을(를) 처치했습니다! 승리에 대한 확신이 차오릅니다!` : `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 드래곤 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다!`;
      log = [{ id: tick + '-' + Math.random(), text: flavor }, ...log].slice(0, 6);
    } else if (pendingClash.kind === 'baron') {
      const { side, objLogLabel } = resolveObjective('바론');
      log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 바론 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다!` }, ...log].slice(0, 6);
    } else if (pendingClash.kind === 'tower') {
      applyTowerPush(pendingClash.towerPlan);
      const siegeLabel = pendingClash.combatPlan ? '수비 병력과의 교전 끝에' : '';
      log = [{ id: tick + '-' + Math.random(), text: `${pendingClash.towerPlan.side === 'user' ? '우리 팀' : '상대 팀'}이(가) ${siegeLabel}${pendingClash.towerPlan.label}을(를) 파괴했습니다!` }, ...log].slice(0, 6);
    }
    // 전투/처리가 끝나면 그 자리에서 사라지지 않고, 각자 기준점(라인)으로 서서히 복귀한다.
    // 이때 아직 사망 중(리스폰 대기)인 참가자는 제외한다 - 그들은 리스폰 후 별도의 걸어서 복귀하는 로직으로 처리되며,
    // 여기 포함시키면 나중에 되살아났을 때 이 복귀 타이밍과 어긋나 순간이동한 것처럼 보이는 버그가 있었다.
    const aliveKeys = [...pendingClash.userKeys, ...pendingClash.aiKeys].filter((key) => {
      const side = key.startsWith('user-') ? 'user' : 'ai';
      const idx = Number(key.slice(side.length + 1));
      const p = side === 'user' ? userLineup[idx] : aiLineup[idx];
      return p && tick >= (p.respawnAtTick || 0);
    });
    let returnTicks = ARRIVE_TICKS;
    aliveKeys.forEach((key) => {
      const side = key.startsWith('user-') ? 'user' : 'ai';
      const idx = Number(key.slice(side.length + 1));
      const p = side === 'user' ? userLineup[idx] : aiLineup[idx];
      if (p) returnTicks = Math.max(returnTicks, ticksForDistance(pendingClash.targetPoint, homeFor(p.position, side), ARRIVE_TICKS));
    });
    pendingClash = {
      ...pendingClash, phase: 'return', startTick: tick, arriveTick: tick + returnTicks,
      userKeys: aliveKeys.filter((k) => k.startsWith('user-')), aiKeys: aliveKeys.filter((k) => k.startsWith('ai-')),
    };
  } else if (pendingClash && pendingClash.phase === 'return' && tick < pendingClash.arriveTick) {
    // 복귀 이동 중: 새 판정을 굴리지 않고 기준점으로 서서히 돌아간다 (강조 표시는 하지 않는다)
  } else if (pendingClash && pendingClash.phase === 'return' && tick >= pendingClash.arriveTick) {
    // 복귀 완료
    pendingClash = null;
  } else {
    // 진행 중인 게더링이 없을 때만 새 판정을 굴린다
    const roll = Math.random();
    let acc = 0;
    if (roll < (acc += skirmishChance)) {
      const selection = selectFightParticipants();
      if (selection) {
        const userKeys = selection.userParticipants.map(({ i }) => 'user-' + i);
        const aiKeys = selection.aiParticipants.map(({ i }) => 'ai-' + i);
        const targetPoint = pickZone(tickRatio, objectives);
        const allParticipants = [...selection.userParticipants.map(({ p }) => ({ p, side: 'user' })), ...selection.aiParticipants.map(({ p }) => ({ p, side: 'ai' }))];
        let travelTicks = ARRIVE_TICKS;
        allParticipants.forEach(({ p, side }) => { travelTicks = Math.max(travelTicks, ticksForDistance(homeFor(p.position, side), targetPoint, ARRIVE_TICKS)); });
        pendingClash = { kind: 'fight', phase: 'travel', selection, targetPoint, userKeys, aiKeys, startTick: tick, arriveTick: tick + travelTicks };
        eventParticipants = [...userKeys, ...aiKeys];
      }
    } else if (roll < (acc += towerChance)) {
      const towerPlan = planTowerPush();
      if (towerPlan) {
        const defSide = towerPlan.side === 'user' ? 'ai' : 'user';
        const attackerLineup = towerPlan.side === 'user' ? userLineup : aiLineup;
        const defenderLineup = defSide === 'user' ? userLineup : aiLineup;
        const attackerAvail = availablePlayers(attackerLineup);
        if (attackerAvail.length > 0) {
          const attackCount = Math.min(attackerAvail.length, randRange(1, 3));
          const attackers = sample(attackerAvail, attackCount);
          const atkKeys = attackers.map(({ i }) => `${towerPlan.side}-${i}`);
          // 45% 확률로 수비 측이 타워를 지키러 나타나 교전이 함께 벌어진다
          const defenderAvail = availablePlayers(defenderLineup);
          let fightSelection = null;
          let defKeys = [];
          if (defenderAvail.length > 0 && Math.random() < 0.45) {
            const defendCount = Math.min(defenderAvail.length, randRange(1, 3));
            const defenders = sample(defenderAvail, defendCount);
            defKeys = defenders.map(({ i }) => `${defSide}-${i}`);
            fightSelection = {
              userParticipants: towerPlan.side === 'user' ? attackers : defenders,
              aiParticipants: towerPlan.side === 'ai' ? attackers : defenders,
              isCapBurst: false,
            };
          }
          pendingClash = {
            kind: 'tower', phase: 'travel', towerPlan, fightSelection, targetPoint: towerPlan.targetPoint,
            userKeys: towerPlan.side === 'user' ? [...atkKeys, ...(defSide === 'user' ? defKeys : [])] : (defSide === 'user' ? defKeys : []),
            aiKeys: towerPlan.side === 'ai' ? [...atkKeys, ...(defSide === 'ai' ? defKeys : [])] : (defSide === 'ai' ? defKeys : []),
            startTick: tick, arriveTick: tick + (() => {
              let travelTicks = ARRIVE_TICKS;
              attackers.forEach(({ p }) => { travelTicks = Math.max(travelTicks, ticksForDistance(homeFor(p.position, towerPlan.side), towerPlan.targetPoint, ARRIVE_TICKS)); });
              if (fightSelection) {
                const defenderList = towerPlan.side === 'user' ? fightSelection.aiParticipants : fightSelection.userParticipants;
                defenderList.forEach(({ p }) => { travelTicks = Math.max(travelTicks, ticksForDistance(homeFor(p.position, defSide), towerPlan.targetPoint, ARRIVE_TICKS)); });
              }
              return travelTicks;
            })(),
          };
          eventParticipants = [...pendingClash.userKeys, ...pendingClash.aiKeys];
        }
      }
    } else if (roll < (acc += dragonChance)) {
      const userKeys = userLineup.map((_, i) => 'user-' + i);
      const aiKeys = aiLineup.map((_, i) => 'ai-' + i);
      const dragonTarget = { x: ZONES.dragonPit.x, y: ZONES.dragonPit.y };
      let dragonTravelTicks = ARRIVE_TICKS;
      userLineup.forEach((p) => { dragonTravelTicks = Math.max(dragonTravelTicks, ticksForDistance(homeFor(p.position, 'user'), dragonTarget, ARRIVE_TICKS)); });
      aiLineup.forEach((p) => { dragonTravelTicks = Math.max(dragonTravelTicks, ticksForDistance(homeFor(p.position, 'ai'), dragonTarget, ARRIVE_TICKS)); });
      pendingClash = { kind: 'dragon', phase: 'travel', targetPoint: dragonTarget, userKeys, aiKeys, startTick: tick, arriveTick: tick + dragonTravelTicks };
      eventParticipants = [...userKeys, ...aiKeys];
    } else if (roll < (acc += baronChance)) {
      const userKeys = userLineup.map((_, i) => 'user-' + i);
      const aiKeys = aiLineup.map((_, i) => 'ai-' + i);
      const baronTarget = { x: ZONES.baronPit.x, y: ZONES.baronPit.y };
      let baronTravelTicks = ARRIVE_TICKS;
      userLineup.forEach((p) => { baronTravelTicks = Math.max(baronTravelTicks, ticksForDistance(homeFor(p.position, 'user'), baronTarget, ARRIVE_TICKS)); });
      aiLineup.forEach((p) => { baronTravelTicks = Math.max(baronTravelTicks, ticksForDistance(homeFor(p.position, 'ai'), baronTarget, ARRIVE_TICKS)); });
      pendingClash = { kind: 'baron', phase: 'travel', targetPoint: baronTarget, userKeys, aiKeys, startTick: tick, arriveTick: tick + baronTravelTicks };
      eventParticipants = [...userKeys, ...aiKeys];
    } else if (roll < (acc += heraldChance)) {
      const side = Math.random() < sideChance() ? 'user' : 'ai';
      if (side === 'user') userScore += 3; else aiScore += 3;
      log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 전령을(를) 처치했습니다!` }, ...log].slice(0, 6);
    }
  }

  let positions;
  if (justResolvedPoint && justResolvedKind !== 'fight') {
    positions = finalSiegePositions(userLineup, aiLineup, justResolvedPoint);
  } else if (justResolvedPoint && justResolvedKind === 'fight') {
    positions = computePositions(userLineup, aiLineup, eventParticipants, justResolvedPoint, tick, null, objectives);
  } else if (pendingClash && pendingClash.phase === 'combat') {
    // 교전 중: 목표 지점 근처에서 소폭 흔들리며 싸우는 모습을 보인다
    positions = computePositions(userLineup, aiLineup, eventParticipants, pendingClash.targetPoint, tick, null, objectives);
  } else if (pendingClash) {
    positions = computePositions(userLineup, aiLineup, eventParticipants, null, tick, pendingClash, objectives);
  } else {
    positions = computePositions(userLineup, aiLineup, eventParticipants, null, tick, null, objectives);
  }
  return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff, capBurstUsed, pendingClash };
}

/* ============================== 작은 컴포넌트 ============================== */

function StatBar({ label, value, max = 99, color = '#38BDF8' }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 shrink-0 lm-muted">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden lm-track">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
      </div>
      <span className="w-6 text-right font-semibold lm-text-value">{value}</span>
    </div>
  );
}

function TierBadge({ tier }) {
  const cls = tier === '1군' ? 'lm-tier-1' : tier === '2군' ? 'lm-tier-2' : 'lm-tier-reserve';
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>
      {tier}
    </span>
  );
}

function PosBadge({ position }) {
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: POS_COLOR[position], color: '#0A0E17' }}>
      {POS_LABEL[position]}
    </span>
  );
}

/* ============================== 메인 앱 ============================== */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [screen, setScreen] = useState('create');
  const [clubNameInput, setClubNameInput] = useState('');
  const [clubRegionInput, setClubRegionInput] = useState(REGIONS[0]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [opponentLineup, setOpponentLineup] = useState(null);
  const [lineupChoice, setLineupChoice] = useState({});
  const [userLineup, setUserLineup] = useState(null);
  const [draft, setDraft] = useState(null);
  const [champFilter, setChampFilter] = useState('ALL');
  const [guideChampFilter, setGuideChampFilter] = useState('ALL');
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [viewingOpponentPlayer, setViewingOpponentPlayer] = useState(null);
  const [opponentDetailReturnScreen, setOpponentDetailReturnScreen] = useState('clubDetail');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [scoutingTimeLeft, setScoutingTimeLeft] = useState(180);
  const [scoutingForm, setScoutingForm] = useState([]);
  const [expandedScoutPlayer, setExpandedScoutPlayer] = useState(null);
  const [champAssignment, setChampAssignment] = useState({});
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const [entryPoolDraft, setEntryPoolDraft] = useState({});
  const [leagueStartConfirm, setLeagueStartConfirm] = useState(null);
  const [leagueTierChoice, setLeagueTierChoice] = useState(null);
  const [rosterFilter, setRosterFilter] = useState('ALL');
  const [releaseConfirmId, setReleaseConfirmId] = useState(null);
  const [pullResults, setPullResults] = useState([]);
  const [flippedCards, setFlippedCards] = useState({});
  const [shopPositionFilter, setShopPositionFilter] = useState('ALL');
  const [faPositionFilter, setFaPositionFilter] = useState('ALL');
  const [showPullModal, setShowPullModal] = useState(false);
  const [scrimRegionFilter, setScrimRegionFilter] = useState('ALL');
  const [expandedChallengeId, setExpandedChallengeId] = useState(null);
  const [viewingClub, setViewingClub] = useState(null);
  const [viewingClubRosters, setViewingClubRosters] = useState(null);
  const [clubDetailTier, setClubDetailTier] = useState('1군');
  const [rankingTab, setRankingTab] = useState('domestic');
  const [historyCategory, setHistoryCategory] = useState('domestic');
  const [historyTier, setHistoryTier] = useState('1군');
  const [onlineMatchCode, setOnlineMatchCode] = useState(null);
  const [myInviteCode, setMyInviteCode] = useState(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteCodeStatus, setInviteCodeStatus] = useState('');
  const [inviteRecord, setInviteRecord] = useState(null);
  const [faMarket, setFaMarket] = useState(null);
  const [faDeclareId, setFaDeclareId] = useState(null);
  const [faPriceInput, setFaPriceInput] = useState('');
  const [faDeclareMode, setFaDeclareMode] = useState(null);
  const [lastCreatedSaleCode, setLastCreatedSaleCode] = useState(null);
  const [saleCodeClaimMessage, setSaleCodeClaimMessage] = useState('');
  const [playerCodeInput, setPlayerCodeInput] = useState('');
  const [playerCodeStatus, setPlayerCodeStatus] = useState('');
  const [faRefreshStatus, setFaRefreshStatus] = useState('');
  const [sim, setSim] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [timeSynced, setTimeSynced] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const [waitCountdown, setWaitCountdown] = useState(GAME_WAIT_SECONDS);
  const [draftIntroCountdown, setDraftIntroCountdown] = useState(5);

  const usedNamesRef = useRef(new Set());
  const waitCompletedRef = useRef(false);
  const scoutingCompletedRef = useRef(false);
  const idRef = useRef(1);

  // 기기 자체 시간이 아닌 온라인(네트워크) 시간을 기준으로 삼기 위한 동기화.
  // 기기 시간을 조작해서 스폰서 일일 수익이나 FA 새로고침 횟수를 초기화하는 걸 막기 위함.
  function getOnlineNow() {
    return new Date(Date.now() + timeOffsetMs);
  }

  useEffect(() => {
    let cancelled = false;
    async function syncTime() {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled || !data || !data.unixtime) return;
        setTimeOffsetMs(data.unixtime * 1000 - Date.now());
        setTimeSynced(true);
      } catch (e) {
        if (!cancelled) setTimeSynced(false);
      }
    }
    syncTime();
    const resync = setInterval(syncTime, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(resync); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClockTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function checkOrientation() {
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight < 600);
    }
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (!game) return;
    const today = todayString(getOnlineNow());
    const sponsors = game.club.sponsors || [];
    if (sponsors.length === 0) return;
    if (game.club.lastSponsorClaimDate === today) return;
    setGame((prev) => {
      if (prev.club.lastSponsorClaimDate === today) return prev;
      const prevSponsors = prev.club.sponsors || [];
      if (prevSponsors.length === 0) return prev;
      const dailyIncome = prevSponsors.length * Math.round(prev.club.value * SPONSOR_DAILY_RATE);
      const club = { ...prev.club, budget: prev.club.budget + dailyIncome, lastSponsorClaimDate: today };
      const newGame = { ...prev, club };
      saveGame(newGame);
      return newGame;
    });
  }, [game, timeOffsetMs]);


  useEffect(() => {
    (async () => {
      let loadedPlayers = [];
      try {
        const res = await window.storage.get('club_save', false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          let needsBackfillSave = false;
          parsed.players = parsed.players.map((p) => {
            let updated = p;
            if (!updated.signatureChampions || !updated.specialChampions) {
              needsBackfillSave = true;
              updated = { ...updated, ...generateSignatureChampions(updated.position) };
            }
            if (!updated.achievements) {
              needsBackfillSave = true;
              updated = { ...updated, achievements: { regionalWins: 0, regionalRunnerUps: 0, regionalTop5: 0, internationalWins: 0, internationalRunnerUps: 0, internationalTop5: 0 } };
            }
            return updated;
          });
          parsed.players.forEach((p) => usedNamesRef.current.add(p.name));
          idRef.current = Math.max(...parsed.players.map((p) => p.id)) + 1;
          loadedPlayers = parsed.players;
          if (!parsed.club.record) {
            needsBackfillSave = true;
            parsed.club = {
              ...parsed.club,
              record: {
                domestic: { '1군': { wins: parsed.club.wins || 0, losses: parsed.club.losses || 0 }, '2군': { wins: 0, losses: 0 } },
                international: { '1군': { wins: 0, losses: 0 }, '2군': { wins: 0, losses: 0 } },
                scrim: { '1군': { wins: 0, losses: 0 }, '2군': { wins: 0, losses: 0 } },
              },
            };
          }
          setGame(parsed);
          setScreen('home');
          if (needsBackfillSave) saveGame(parsed);
        } else {
          setScreen('create');
        }
      } catch (e) {
        setScreen('create');
      }

      try {
        const faRes = await window.storage.get('fa_market', false);
        if (faRes && faRes.value) {
          const parsedFa = JSON.parse(faRes.value);
          parsedFa.forEach((p) => usedNamesRef.current.add(p.name));
          idRef.current = Math.max(idRef.current, ...parsedFa.map((p) => p.id + 1));
          const withSpecial = ensureSpecialListings(parsedFa, loadedPlayers, usedNamesRef, idRef);
          setFaMarket(withSpecial);
          if (withSpecial.length !== parsedFa.length) saveFaMarket(withSpecial);
        } else {
          const initial = generateFullNpcMarket(usedNamesRef, idRef);
          const withSpecial = ensureSpecialListings(initial, loadedPlayers, usedNamesRef, idRef);
          setFaMarket(withSpecial);
          saveFaMarket(withSpecial);
        }
      } catch (e) {
        const initial = generateFullNpcMarket(usedNamesRef, idRef);
        setFaMarket(initial);
        saveFaMarket(initial);
      }

      setLoading(false);
    })();
  }, []);

  async function saveGame(g) {
    try { await window.storage.set('club_save', JSON.stringify(g), false); } catch (e) { /* 저장 실패 시 무시 */ }
  }

  async function saveFaMarket(list) {
    try { await window.storage.set('fa_market', JSON.stringify(list), false); } catch (e) { /* 저장 실패 시 무시 */ }
  }

  function handleCreateClub() {
    if (!clubNameInput.trim()) return;
    const { club, players } = generateInitialGame(clubNameInput.trim(), clubRegionInput, usedNamesRef, idRef);
    const g = { club, players };
    setGame(g);
    saveGame(g);
    setScreen('home');
  }

  async function handleReset() {
    try { await window.storage.delete('club_save', false); } catch (e) { /* ignore */ }
    usedNamesRef.current = new Set();
    idRef.current = 1;
    setGame(null);
    setClubNameInput('');
    setScreen('create');
  }

  function handleReleasePlayer(playerId) {
    setGame((prev) => {
      const newPlayers = prev.players.filter((p) => p.id !== playerId);
      const club = { ...prev.club, value: computeClubValue(newPlayers) };
      const newGame = { ...prev, club, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
    setReleaseConfirmId(null);
  }

  function handleSetTier(playerId, newTier) {
    setGame((prev) => {
      const player = prev.players.find((p) => p.id === playerId);
      if (!player || player.tier === newTier) return prev;
      const oldTier = player.tier;
      const occupant = prev.players.find((p) => p.position === player.position && p.tier === newTier && p.id !== playerId);
      const newPlayers = prev.players.map((p) => {
        if (p.id === playerId) return { ...p, tier: newTier };
        if (occupant && p.id === occupant.id) return { ...p, tier: oldTier };
        return p;
      });
      const newGame = { ...prev, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
  }

  function handleSignSponsor(category) {
    setGame((prev) => {
      const sponsors = prev.club.sponsors || [];
      const maxSlots = Math.floor(prev.club.value / SPONSOR_VALUE_PER_SLOT);
      if (sponsors.length >= maxSlots) return prev;
      const usedNames = sponsors.map((s) => s.companyName);
      const offer = generateSponsorOffer(category, usedNames);
      const newSponsors = [...sponsors, { id: offer.id, category, companyName: offer.companyName, signedAt: Date.now() }];
      const club = { ...prev.club, sponsors: newSponsors };
      const newGame = { ...prev, club };
      saveGame(newGame);
      return newGame;
    });
  }

  function handleDeclareFA(playerId, priceStr) {
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;
    const price = clamp(Math.round(Number(priceStr) || 0), 1, player.value);
    const listing = { ...player, price, fromClub: game.club.name, source: 'user' };
    setGame((prev) => {
      const newPlayers = prev.players.filter((p) => p.id !== playerId);
      const club = { ...prev.club, value: computeClubValue(newPlayers) };
      const newGame = { ...prev, club, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
    setFaMarket((prev) => {
      const next = [...(prev || []), listing];
      saveFaMarket(next);
      return next;
    });
    setFaDeclareId(null);
    setFaPriceInput('');
    setFaDeclareMode(null);
  }

  async function handleCreateSaleCode(playerId, priceStr) {
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;
    const price = clamp(Math.round(Number(priceStr) || 0), 1, player.value);
    const code = generateInviteCode();
    const snapshot = {
      position: player.position, name: player.name, tier: player.tier,
      mechanics: player.mechanics, gameSense: player.gameSense, teamfight: player.teamfight, laning: player.laning,
      overall: player.overall, potential: player.potential,
    };
    const record = { code, sellerClubName: game.club.name, player: snapshot, price, sold: false, buyerClubName: null, createdAt: Date.now() };
    try {
      await window.storage.set('playersale:' + code, JSON.stringify(record), true);
    } catch (e) {
      setInviteCodeStatus('코드 생성에 실패했어요.');
      return;
    }
    setGame((prev) => {
      const newPlayers = prev.players.filter((p) => p.id !== playerId);
      const mySaleCodes = [...(prev.club.mySaleCodes || []), { code, playerName: player.name, price, claimed: false }];
      const club = { ...prev.club, value: computeClubValue(newPlayers), mySaleCodes };
      const newGame = { ...prev, club, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
    setFaDeclareId(null);
    setFaPriceInput('');
    setFaDeclareMode(null);
    setLastCreatedSaleCode(code);
  }

  async function handleCheckSaleCodes() {
    const codes = (game.club.mySaleCodes || []).filter((c) => !c.claimed);
    if (codes.length === 0) return;
    let totalClaim = 0;
    const updatedCodes = [...(game.club.mySaleCodes || [])];
    for (const entry of codes) {
      try {
        const res = await window.storage.get('playersale:' + entry.code, true);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (data.sold) {
            totalClaim += entry.price;
            const idx = updatedCodes.findIndex((c) => c.code === entry.code);
            if (idx !== -1) updatedCodes[idx] = { ...updatedCodes[idx], claimed: true, buyerClubName: data.buyerClubName };
          }
        }
      } catch (e) { /* ignore */ }
    }
    if (totalClaim > 0) {
      setGame((prev) => {
        const club = { ...prev.club, budget: prev.club.budget + totalClaim, mySaleCodes: updatedCodes };
        const newGame = { ...prev, club };
        saveGame(newGame);
        return newGame;
      });
      setSaleCodeClaimMessage(`판매 대금 ${totalClaim.toLocaleString()}P를 받았어요!`);
    } else {
      setGame((prev) => {
        const club = { ...prev.club, mySaleCodes: updatedCodes };
        const newGame = { ...prev, club };
        saveGame(newGame);
        return newGame;
      });
      setSaleCodeClaimMessage('아직 판매되지 않았어요.');
    }
  }

  async function handleBuyPlayerCode() {
    const code = playerCodeInput.trim().toUpperCase();
    if (!code) return;
    setPlayerCodeStatus('조회 중...');
    try {
      const res = await window.storage.get('playersale:' + code, true);
      if (!res || !res.value) { setPlayerCodeStatus('해당 코드를 찾을 수 없어요.'); return; }
      const data = JSON.parse(res.value);
      if (data.sold) { setPlayerCodeStatus('이미 판매 완료된 선수예요.'); return; }
      if (game.club.budget < data.price) { setPlayerCodeStatus('포인트가 부족해요.'); return; }
      const newPlayer = { id: idRef.current++, ...data.player, tier: '예비', exp: 0, level: 1, value: Math.round(data.player.overall * 12 + data.player.potential * 4) };
      setGame((prev) => {
        const players = [...prev.players, newPlayer];
        const club = { ...prev.club, budget: prev.club.budget - data.price, value: computeClubValue(players) };
        const newGame = { ...prev, club, players };
        saveGame(newGame);
        return newGame;
      });
      data.sold = true;
      data.buyerClubName = game.club.name;
      await window.storage.set('playersale:' + code, JSON.stringify(data), true);
      setPlayerCodeStatus(`${data.player.name} 선수를 영입했어요!`);
      setPlayerCodeInput('');
    } catch (e) {
      setPlayerCodeStatus('오류가 발생했어요.');
    }
  }

  function handleBuyFA(listingId) {
    const listing = (faMarket || []).find((l) => l.id === listingId);
    if (!listing || game.club.budget < listing.price) return;
    const { price, fromClub, source, ...playerData } = listing;
    setGame((prev) => {
      const players = [...prev.players, playerData];
      const club = { ...prev.club, budget: prev.club.budget - price, value: computeClubValue(players) };
      const newGame = { ...prev, club, players };
      saveGame(newGame);
      return newGame;
    });
    setFaMarket((prev) => {
      const next = (prev || []).filter((l) => l.id !== listingId);
      saveFaMarket(next);
      return next;
    });
  }

  function handleRefreshMarket() {
    const today = todayString(getOnlineNow());
    const usedToday = game.club.faRefreshDate === today ? (game.club.faRefreshCount || 0) : 0;
    if (usedToday >= FA_REFRESH_DAILY_LIMIT) {
      setFaRefreshStatus(`오늘은 새로고침을 모두 사용했어요 (최대 ${FA_REFRESH_DAILY_LIMIT}회).`);
      return;
    }
    setFaRefreshStatus('');
    setGame((prev) => {
      const club = { ...prev.club, faRefreshDate: today, faRefreshCount: usedToday + 1 };
      const newGame = { ...prev, club };
      saveGame(newGame);
      return newGame;
    });
    setFaMarket((prev) => {
      const keptListings = (prev || []).filter((l) => l.source === 'user' || l.source === 'special');
      const npcListings = generateFullNpcMarket(usedNamesRef, idRef);
      const next = [...keptListings, ...npcListings];
      saveFaMarket(next);
      return next;
    });
  }

  function handlePull(count) {
    const cost = count === 1 ? SINGLE_PULL_COST : MULTI_PULL_COST;
    if (game.club.budget < cost) return;
    const forcedPosition = shopPositionFilter === 'ALL' ? null : shopPositionFilter;
    const newPlayers = [];
    for (let i = 0; i < count; i++) {
      newPlayers.push(gachaPull(usedNamesRef, idRef, forcedPosition));
    }
    setGame((prev) => {
      const players = [...prev.players, ...newPlayers];
      const club = { ...prev.club, budget: prev.club.budget - cost, value: computeClubValue(players) };
      const newGame = { ...prev, club, players };
      saveGame(newGame);
      return newGame;
    });
    setPullResults(newPlayers);
    setFlippedCards({});
    setShowPullModal(true);
  }

  function handleFlipCard(idx) {
    if (flippedCards[idx] !== undefined) return;
    setFlippedCards((prev) => ({ ...prev, [idx]: 1 }));
    setTimeout(() => setFlippedCards((prev) => ({ ...prev, [idx]: 2 })), 500);
    setTimeout(() => setFlippedCards((prev) => ({ ...prev, [idx]: 3 })), 1000);
    setTimeout(() => setFlippedCards((prev) => ({ ...prev, [idx]: 4 })), 1500);
  }

  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[randRange(0, chars.length - 1)];
    return code;
  }

  async function handleCreateInviteCode() {
    const code = generateInviteCode();
    const hostLineup = POSITIONS.map((pos) => {
      const candidates = game.players.filter((p) => p.position === pos);
      const p = candidates.find((c) => c.tier === '1군') || candidates[0];
      return { position: pos, name: p.name, tier: p.tier, overall: p.overall, mechanics: p.mechanics, gameSense: p.gameSense, teamfight: p.teamfight, laning: p.laning };
    });
    const record = {
      code, hostClubName: game.club.name, hostRegion: game.club.region || REGIONS[0],
      hostLineup, createdAt: Date.now(), challengers: [],
    };
    try {
      await window.storage.set('onlinematch:' + code, JSON.stringify(record), true);
      setMyInviteCode(code);
      setInviteRecord(record);
      setInviteCodeStatus('');
    } catch (e) {
      setInviteCodeStatus('코드 생성에 실패했어요. 다시 시도해주세요.');
    }
  }

  async function handleRefreshMyInvite() {
    if (!myInviteCode) return;
    try {
      const res = await window.storage.get('onlinematch:' + myInviteCode, true);
      if (res && res.value) setInviteRecord(JSON.parse(res.value));
    } catch (e) { /* ignore */ }
  }

  async function handleJoinWithCode() {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code) return;
    setInviteCodeStatus('조회 중...');
    try {
      const res = await window.storage.get('onlinematch:' + code, true);
      if (!res || !res.value) {
        setInviteCodeStatus('해당 코드를 찾을 수 없어요. 코드를 다시 확인해주세요.');
        return;
      }
      const data = JSON.parse(res.value);
      const opp = { id: 'ONLINE-' + code, name: data.hostClubName, region: data.hostRegion, power: Math.round(data.hostLineup.reduce((s, p) => s + p.overall, 0)) };
      const aiLineup = data.hostLineup.map((p, i) => ({
        id: 9500 + i, name: p.name, position: p.position, overall: p.overall,
        mechanics: p.mechanics, gameSense: p.gameSense, teamfight: p.teamfight, laning: p.laning,
        champion: null, kills: 0, deaths: 0, assists: 0, damage: 0,
      }));
      setSelectedOpponent(opp);
      setOpponentLineup(aiLineup);
      setOnlineMatchCode(code);
      setLineupChoice(POSITIONS.reduce((acc, p) => ({ ...acc, [p]: '1군' }), {}));
      setInviteCodeStatus('');
      setScreen('lineup');
    } catch (e) {
      setInviteCodeStatus('오류가 발생했어요. 다시 시도해주세요.');
    }
  }

  function handleStartTestMatch() {
    // 무작위 상대 구단을 골라 로스터 설정·전력분석·밴픽 단계 없이 곧바로 시뮬레이션을 시작한다 (전적/성장에 반영되지 않는 테스트 경기)
    const opp = OPPONENTS[randRange(0, OPPONENTS.length - 1)];
    const oppLineup = generateOpponentLineup(opp.power, '1군', opp.name);

    const lineup = POSITIONS.map((pos) => {
      const posPlayers = game.players.filter((p) => p.position === pos);
      const starter = posPlayers.find((p) => p.tier === '1군') || [...posPlayers].sort((a, b) => b.overall - a.overall)[0];
      return { id: starter.id, name: starter.name, position: pos, overall: starter.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
    });

    const userAssignment = {};
    const aiAssignment = {};
    POSITIONS.forEach((pos) => {
      const pool = CHAMPIONS[pos];
      userAssignment[pos] = pool[randRange(0, pool.length - 1)];
      aiAssignment[pos] = pool[randRange(0, pool.length - 1)];
    });

    const userFinal = lineup.map((u) => applyChampionMastery({ ...u, champion: userAssignment[u.position], kills: 0, deaths: 0, assists: 0, damage: 0, respawnAtTick: 0 }));
    const aiFinal = oppLineup.map((a) => applyChampionMastery({ ...a, champion: aiAssignment[a.position], kills: 0, deaths: 0, assists: 0, damage: 0, respawnAtTick: 0 }));
    const totalTicks = randRange(21, 50) * TICKS_PER_MIN;

    setSelectedOpponent(opp);
    setOpponentLineup(oppLineup);
    setUserLineup(lineup);
    setSim({
      tick: 0, totalTicks, userLineup: userFinal, aiLineup: aiFinal,
      userScore: 0, aiScore: 0, log: [], finished: false,
      positions: computePositions(userFinal, aiFinal, [], null, 0), eventParticipants: [],
      objectives: {
        user: { laneTowers: { top: 0, mid: 0, bot: 0 }, nexusTowers: 0, barons: 0, dragons: [] },
        ai: { laneTowers: { top: 0, mid: 0, bot: 0 }, nexusTowers: 0, barons: 0, dragons: [] },
        lastTowerTick: -999, nextDragonTick: 5 * TICKS_PER_MIN, nextBaronTick: 20 * TICKS_PER_MIN, nexusDestroyed: null,
        nextDragonType: DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)],
      },
      elderBuff: null,
      finalWin: null,
      killCap: randRange(13, 43),
      capBurstUsed: false,
      pendingClash: null,
      endingSequence: null,
      isTest: true,
    });
    setScreen('sim');
  }

  function handleChallenge(opp, tier) {
    const chosenTier = tier || '1군';
    const power = chosenTier === '2군' ? (opp.power2 || Math.round(opp.power * 0.7)) : opp.power;
    const oppWithTier = { ...opp, name: `${opp.name} ${chosenTier}`, baseName: opp.name, challengeTier: chosenTier };
    setSelectedOpponent(oppWithTier);
    setOpponentLineup(generateOpponentLineup(power, chosenTier, opp.name));
    setLineupChoice(POSITIONS.reduce((acc, p) => ({ ...acc, [p]: '1군' }), {}));
    setExpandedChallengeId(null);
    setScreen('lineup');
  }

  function handleViewClubDetail(club) {
    const roster1 = generateOpponentLineup(club.power, '1군', club.name);
    const roster2 = generateOpponentLineup(club.power2 || Math.round(club.power * 0.7), '2군', club.name);
    setViewingClub(club);
    setViewingClubRosters({ tier1: roster1, tier2: roster2 });
    setClubDetailTier('1군');
    setScreen('clubDetail');
  }

  function handleChallengeClub(clubDef, leagueOverride) {
    const baseLeague = leagueOverride || game.league;
    const entryPool = baseLeague.entryPool || {};
    const activeStarters = {};
    POSITIONS.forEach((pos) => {
      const pool = entryPool[pos] || [];
      activeStarters[pos] = pool[0];
    });
    const lineup = POSITIONS.map((pos) => {
      const p = game.players.find((pl) => pl.id === activeStarters[pos]);
      return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
    });
    setSelectedOpponent(clubDef);
    const oppPower = baseLeague.tier === '2군' ? (clubDef.power2 || Math.round(clubDef.power * 0.7)) : clubDef.power;
    setOpponentLineup(generateOpponentLineup(oppPower, baseLeague.tier, clubDef.name));
    const newLeague = { ...baseLeague, started: true, current: { opponent: clubDef, userWins: 0, aiWins: 0, gameNumber: 1, activeStarters } };
    setGame((prev) => {
      const newGame = { ...prev, league: newLeague };
      saveGame(newGame);
      return newGame;
    });
    setUserLineup(lineup);
    startScoutingPhase();
  }

  function toggleEntryCandidate(pos, playerId) {
    setEntryPoolDraft((prev) => {
      const cur = prev[pos] || [];
      let next;
      if (cur.includes(playerId)) next = cur.filter((id) => id !== playerId);
      else if (cur.length < 2) next = [...cur, playerId];
      else next = cur;
      return { ...prev, [pos]: next };
    });
  }

  function handleConfirmLeagueRoster() {
    const entryPool = {};
    POSITIONS.forEach((pos) => { entryPool[pos] = entryPoolDraft[pos] || []; });
    setGame((prev) => {
      const newLeague = { ...prev.league, entryPool };
      const newGame = { ...prev, league: newLeague };
      saveGame(newGame);
      return newGame;
    });
    setScreen('leagueSchedule');
  }

  function handleSwapStarter(pos, playerId) {
    setGame((prev) => {
      if (!prev.league || !prev.league.current) return prev;
      const activeStarters = { ...prev.league.current.activeStarters, [pos]: playerId };
      const newLeague = { ...prev.league, current: { ...prev.league.current, activeStarters } };
      const newGame = { ...prev, league: newLeague };
      saveGame(newGame);
      return newGame;
    });
  }

  function handleConfirmLeagueStart(tier) {
    const chosenTier = tier || '1군';
    if (leagueStartConfirm === 'regional') handleStartRegionalLeague(chosenTier);
    else if (leagueStartConfirm === 'international') handleStartInternational(chosenTier);
    setLeagueStartConfirm(null);
    setLeagueTierChoice(null);
  }

  function handleStartRegionalLeague(tier) {
    const region = game.club.region || REGIONS[0];
    const queue = [...REGION_CLUBS[region]];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = randRange(0, i);
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    const league = { type: 'regional', tier: tier || '1군', region, queue, results: [], current: null, entryPool: null, started: false, roundIndex: 0, roundLabel: LEAGUE_NAME[region] || '지역 리그' };
    setGame((prev) => {
      const newGame = { ...prev, league };
      saveGame(newGame);
      return newGame;
    });
    setEntryPoolDraft({});
    setScreen('leagueRosterSetup');
  }

  function handleStartInternational(tier) {
    const bracket = setupInternationalBracket(game);
    if (!bracket.userOpponent) return;
    const league = bracket.stage === 'playin'
      ? {
          type: 'international', tier: tier || '1군', region: game.club.region, queue: [bracket.userOpponent], results: [], current: null, entryPool: null, started: false,
          roundIndex: -1, roundLabel: '플레이인',
          shadow: { otherPlayInWinner: bracket.otherPlayInWinner, byeTeams: bracket.byeTeams },
        }
      : {
          type: 'international', tier: tier || '1군', region: game.club.region, queue: [bracket.userOpponent], results: [], current: null, entryPool: null, started: false,
          roundIndex: 0, roundLabel: '8강',
          shadow: { semiOpponent: bracket.semiOtherPairWinner, finalOpponent: bracket.otherHalfFinalist },
        };
    setGame((prev) => {
      const newGame = { ...prev, league };
      saveGame(newGame);
      return newGame;
    });
    setEntryPoolDraft({});
    setScreen('leagueRosterSetup');
  }

  function handleBeginLeagueMatches() {
    const league = game.league;
    const queue = [...league.queue];
    const first = queue.shift();
    const tierMult = league.tier === '2군' ? 0.5 : 1;
    const joinReward = Math.round((league.type === 'regional' ? REGIONAL_REWARD.join : INTERNATIONAL_REWARD.join) * tierMult);
    setGame((prev) => {
      const club = { ...prev.club, budget: prev.club.budget + joinReward };
      const newGame = { ...prev, club };
      saveGame(newGame);
      return newGame;
    });
    handleChallengeClub(first, { ...league, queue });
  }

  function handleContinueLeague() {
    const league = game.league;
    if (!league) return;
    if (league.type === 'regional') {
      const queue = [...league.queue];
      const next = queue.shift();
      if (!next) return;
      handleChallengeClub(next, { ...league, queue, current: null });
    } else if (league.roundIndex === -1) {
      // 플레이인 승리 → 부전승 6팀 + 나머지 플레이인 승자와 함께 8강 대진 구성
      const userEntry = { id: 'USER', name: game.club.name, region: game.club.region, power: (game.club.qualifiedWins || 5) * 40, isUser: true };
      const eight = [...league.shadow.byeTeams, league.shadow.otherPlayInWinner, userEntry];
      const bracket = buildQuarterBracket(eight);
      if (!bracket || !bracket.userOpponent) return;
      const newShadow = { semiOpponent: bracket.semiOtherPairWinner, finalOpponent: bracket.otherHalfFinalist };
      handleChallengeClub(bracket.userOpponent, { ...league, roundIndex: 0, roundLabel: '8강', shadow: newShadow, current: null });
    } else {
      const nextOpp = league.roundIndex === 0 ? league.shadow.semiOpponent : league.shadow.finalOpponent;
      if (!nextOpp) return;
      const newRoundIndex = league.roundIndex + 1;
      const roundLabel = newRoundIndex === 1 ? '4강' : '결승';
      handleChallengeClub(nextOpp, { ...league, roundIndex: newRoundIndex, roundLabel, current: null });
    }
  }

  function handleResumeLeague() {
    const league = game.league;
    if (!league) return;
    if (league.current) {
      setSelectedOpponent(league.current.opponent);
      const oppPower = league.tier === '2군' ? (league.current.opponent.power2 || Math.round(league.current.opponent.power * 0.7)) : league.current.opponent.power;
      setOpponentLineup(generateOpponentLineup(oppPower, league.tier, league.current.opponent.name));
      const lineup = POSITIONS.map((pos) => {
        const p = game.players.find((pl) => pl.id === league.current.activeStarters[pos]);
        return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
      });
      setUserLineup(lineup);
      startScoutingPhase();
    } else if (!league.started) {
      if (!league.entryPool) {
        setEntryPoolDraft({});
        setScreen('leagueRosterSetup');
      } else {
        setScreen('leagueSchedule');
      }
    } else {
      handleContinueLeague();
    }
  }

  function handleCancelLeagueSetup() {
    setGame((prev) => {
      const newGame = { ...prev, league: null };
      saveGame(newGame);
      return newGame;
    });
    setScreen('home');
  }

  const ACHIEVEMENT_VALUE_BONUS = {
    regionalWins: 100, regionalRunnerUps: 80, regionalTop5: 30,
    internationalWins: 1000, internationalRunnerUps: 800, internationalTop5: 300,
  };

  function creditAchievements(players, entryPool, field, leagueTier) {
    if (!entryPool || !field) return players;
    const participantIds = new Set(POSITIONS.flatMap((pos) => entryPool[pos] || []));
    const baseBonus = ACHIEVEMENT_VALUE_BONUS[field] || 0;
    const bonus = leagueTier === '2군' ? Math.round(baseBonus / 2) : baseBonus;
    return players.map((p) => {
      if (!participantIds.has(p.id)) return p;
      const prevAch = p.achievements || { regionalWins: 0, regionalRunnerUps: 0, regionalTop5: 0, internationalWins: 0, internationalRunnerUps: 0, internationalTop5: 0 };
      return { ...p, achievements: { ...prevAch, [field]: (prevAch[field] || 0) + 1 }, value: p.value + bonus };
    });
  }

  function handleFinishLeague() {
    const league = game.league;
    const tierMult = league && league.tier === '2군' ? 0.5 : 1;
    if (league && league.type === 'regional' && league.queue.length === 0) {
      const userWinsCount = league.results.filter((x) => x.won).length;
      const aiScores = REGION_CLUBS[league.region].map((c) => c.power);
      const userScore = userWinsCount * 40;
      const allScores = [...aiScores, userScore].sort((a, b) => b - a);
      const rank = allScores.indexOf(userScore) + 1;
      const rankReward = Math.round((rank === 1 ? REGIONAL_REWARD.rank1 : rank === 2 ? REGIONAL_REWARD.rank2 : rank === 3 ? REGIONAL_REWARD.rank3 : 0) * tierMult);
      const achField = rank === 1 ? 'regionalWins' : rank === 2 ? 'regionalRunnerUps' : (rank === 3 || rank === 4 || rank === 5) ? 'regionalTop5' : null;
      setGame((prev) => {
        const club = {
          ...prev.club, qualifiedRank: rank, qualifiedRegion: league.region, qualifiedWins: userWinsCount, budget: prev.club.budget + rankReward,
          regionalTitles: (prev.club.regionalTitles || 0) + (rank === 1 ? 1 : 0),
          qualifiedRankByTier: { ...(prev.club.qualifiedRankByTier || {}), [league.tier || '1군']: rank },
        };
        const players = creditAchievements(prev.players, league.entryPool, achField, league.tier);
        const newGame = { ...prev, club, players, league: null };
        saveGame(newGame);
        return newGame;
      });
    } else if (league && league.type === 'international') {
      const lastEntry = league.results[league.results.length - 1];
      const wonLast = lastEntry && lastEntry.won;
      let placement = null;
      if (wonLast && league.roundIndex >= 2) placement = '우승';
      else if (!wonLast && league.roundIndex === 2) placement = '준우승';
      else if (!wonLast && league.roundIndex === 1) placement = '4강';
      else if (!wonLast && league.roundIndex === 0) placement = '8강';
      else if (!wonLast && league.roundIndex === -1) placement = '플레이인 탈락';
      const rankReward = Math.round((placement === '우승' ? INTERNATIONAL_REWARD.rank1 : placement === '준우승' ? INTERNATIONAL_REWARD.rank2 : placement === '4강' ? INTERNATIONAL_REWARD.rank3 : 0) * tierMult);
      const achField = placement === '우승' ? 'internationalWins' : placement === '준우승' ? 'internationalRunnerUps' : (placement === '4강' || placement === '8강') ? 'internationalTop5' : null;
      setGame((prev) => {
        const club = {
          ...prev.club, ...(placement ? { internationalResult: placement } : {}), budget: prev.club.budget + rankReward,
          internationalTitles: (prev.club.internationalTitles || 0) + (placement === '우승' ? 1 : 0),
          ...(placement ? { internationalResultByTier: { ...(prev.club.internationalResultByTier || {}), [league.tier || '1군']: placement } } : {}),
        };
        const players = creditAchievements(prev.players, league.entryPool, achField, league.tier);
        const newGame = { ...prev, club, players, league: null };
        saveGame(newGame);
        return newGame;
      });
    } else {
      setGame((prev) => {
        const newGame = { ...prev, league: null };
        saveGame(newGame);
        return newGame;
      });
    }
    setScreen('home');
  }

  function startScoutingPhase() {
    if (selectedOpponent) {
      setScoutingForm(generateOpponentRecentForm(selectedOpponent, selectedOpponent.region || (game.club && game.club.region) || REGIONS[0]));
    }
    setExpandedScoutPlayer(null);
    setScoutingTimeLeft(180);
    setScreen('scouting');
  }

  function startDraftPhase() {
    setDraft({ phase: 'ban1', idx: 0, userBans: [], aiBans: [], userPicks: [], aiPicks: [] });
    setChampFilter('ALL');
    setChampAssignment({});
    setForfeitConfirm(false);
    setScreen('draftIntro');
  }

  function confirmLineup() {
    const final = POSITIONS.map((pos) => {
      const p = game.players.find((pl) => pl.position === pos && pl.tier === lineupChoice[pos]);
      return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
    });
    setUserLineup(final);
    startScoutingPhase();
  }

  function processBan(team, champ) {
    if (champ) playDraftSfx('ban');
    setDraft((prev) => {
      if (!prev) return prev;
      const userBans = team === 'user' && champ ? [...prev.userBans, champ] : prev.userBans;
      const aiBans = team === 'ai' && champ ? [...prev.aiBans, champ] : prev.aiBans;
      let idx = prev.idx + 1, phase = prev.phase;
      const order = DRAFT_PHASE_ORDER[prev.phase];
      if (idx >= order.length) { idx = 0; phase = prev.phase === 'ban1' ? 'pick1' : 'pick2'; }
      return { ...prev, userBans, aiBans, idx, phase };
    });
  }

  function processPick(team, champ) {
    if (champ) playDraftSfx('pick');
    setDraft((prev) => {
      if (!prev) return prev;
      const userPicks = team === 'user' ? [...prev.userPicks, champ] : prev.userPicks;
      const aiPicks = team === 'ai' ? [...prev.aiPicks, champ] : prev.aiPicks;
      let idx = prev.idx + 1, phase = prev.phase;
      const order = DRAFT_PHASE_ORDER[prev.phase];
      if (idx >= order.length) { idx = 0; phase = prev.phase === 'pick1' ? 'ban2' : 'done'; }
      return { ...prev, userPicks, aiPicks, idx, phase };
    });
  }

  function handleChampionClick(champName) {
    if (!draft || draft.phase === 'done') return;
    const order = DRAFT_PHASE_ORDER[draft.phase];
    const currentTeam = order[draft.idx];
    if (currentTeam !== 'user') return;
    if (isBanPhase(draft.phase)) processBan('user', champName); else processPick('user', champName);
  }

  useEffect(() => {
    if (!draft || draft.phase === 'done') return;
    const order = DRAFT_PHASE_ORDER[draft.phase];
    const currentTeam = order[draft.idx];
    if (currentTeam !== 'user') { setTurnTimeLeft(TURN_TIME_LIMIT); return; }
    setTurnTimeLeft(TURN_TIME_LIMIT);
    const interval = setInterval(() => {
      setTurnTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [draft && draft.phase, draft && draft.idx]);

  useEffect(() => {
    if (!draft || draft.phase === 'done' || turnTimeLeft > 0) return;
    const order = DRAFT_PHASE_ORDER[draft.phase];
    const currentTeam = order[draft.idx];
    if (currentTeam !== 'user') return;
    if (isBanPhase(draft.phase)) {
      processBan('user', null);
    } else {
      const bannedSet = new Set([...draft.userBans, ...draft.aiBans]);
      const pickedSet = new Set([...draft.userPicks, ...draft.aiPicks]);
      const available = ALL_CHAMPION_NAMES.filter((n) => !bannedSet.has(n) && !pickedSet.has(n));
      if (available.length > 0) processPick('user', pickPositionAwareChampion(available, draft.userPicks));
    }
  }, [turnTimeLeft]);

  useEffect(() => {
    if (!draft || draft.phase === 'done') return;
    const order = DRAFT_PHASE_ORDER[draft.phase];
    const currentTeam = order[draft.idx];
    if (currentTeam !== 'ai') return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      const bannedSet = new Set([...draft.userBans, ...draft.aiBans]);
      const pickedSet = new Set([...draft.userPicks, ...draft.aiPicks]);
      const available = ALL_CHAMPION_NAMES.filter((n) => !bannedSet.has(n) && !pickedSet.has(n));
      if (available.length === 0) return;
      const choice = isBanPhase(draft.phase) ? available[randRange(0, available.length - 1)] : pickPositionAwareChampion(available, draft.aiPicks);
      if (isBanPhase(draft.phase)) processBan('ai', choice); else processPick('ai', choice);
    }, 650);
    return () => { cancelled = true; clearTimeout(t); };
  }, [draft]);

  useEffect(() => {
    if (draft && draft.phase === 'done' && draft.userPicks.length === 5) {
      setChampAssignment(assignPicksToPositions(draft.userPicks));
    }
  }, [draft && draft.phase]);

  function handleAssignChamp(pos, newChamp) {
    setChampAssignment((prev) => {
      const next = { ...prev };
      const otherPos = Object.keys(next).find((p) => next[p] === newChamp);
      if (otherPos && otherPos !== pos) next[otherPos] = prev[pos];
      next[pos] = newChamp;
      return next;
    });
  }

  function handleForfeitDraft() {
    setDraft(null);
    setUserLineup(null);
    setSelectedOpponent(null);
    setOpponentLineup(null);
    setChampFilter('ALL');
    setChampAssignment({});
    setForfeitConfirm(false);
    setOnlineMatchCode(null);
    setScreen('home');
  }

  function applyChampionMastery(p) {
    if (!p.champion) return p;
    let bonus = 0;
    if (p.specialChampions && p.specialChampions.includes(p.champion)) bonus = 4;
    else if (p.signatureChampions && p.signatureChampions.includes(p.champion)) bonus = 2;
    if (bonus === 0) return p;
    return { ...p, overall: clamp(p.overall + bonus, 0, 99) };
  }

  function initSim() {
    const userFinal = userLineup.map((u) => applyChampionMastery({ ...u, champion: champAssignment[u.position], kills: 0, deaths: 0, assists: 0, damage: 0, respawnAtTick: 0 }));
    const aiAssignment = assignPicksToPositions(draft.aiPicks);
    const aiFinal = opponentLineup.map((a) => applyChampionMastery({ ...a, champion: aiAssignment[a.position], kills: 0, deaths: 0, assists: 0, damage: 0, respawnAtTick: 0 }));
    const totalTicks = randRange(21, 50) * TICKS_PER_MIN; // 1틱 = 5초, 경기 길이 21~50분
    setSim({
      tick: 0, totalTicks, userLineup: userFinal, aiLineup: aiFinal,
      userScore: 0, aiScore: 0, log: [], finished: false,
      positions: computePositions(userFinal, aiFinal, [], null, 0), eventParticipants: [],
      objectives: {
        user: { laneTowers: { top: 0, mid: 0, bot: 0 }, nexusTowers: 0, barons: 0, dragons: [] },
        ai: { laneTowers: { top: 0, mid: 0, bot: 0 }, nexusTowers: 0, barons: 0, dragons: [] },
        lastTowerTick: -999, nextDragonTick: 5 * TICKS_PER_MIN, nextBaronTick: 20 * TICKS_PER_MIN, nexusDestroyed: null,
        nextDragonType: DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)],
      },
      elderBuff: null,
      finalWin: null,
      killCap: randRange(13, 43),
      capBurstUsed: false,
      pendingClash: null,
      endingSequence: null,
    });
    setScreen('sim');
  }

  const tickErrorCountRef = useRef(0);

  useEffect(() => {
    if (screen !== 'sim') return;
    const id = setInterval(() => {
      setSim((prev) => {
        if (!prev || prev.finished) return prev;
        try {
          const next = tickAdvance(prev);
          tickErrorCountRef.current = 0;
          return next;
        } catch (err) {
          tickErrorCountRef.current += 1;
          console.error(`시뮬레이션 처리 중 오류(연속 ${tickErrorCountRef.current}회):`, err);
          if (tickErrorCountRef.current >= 3) {
            // 같은 오류가 계속 반복되어 진행이 안 될 경우, 게임이 멈춰버리지 않도록 현재 스코어 기준으로 안전하게 종료한다
            const finalWin = prev.userScore !== prev.aiScore
              ? prev.userScore > prev.aiScore
              : prev.userLineup.reduce((s, p) => s + p.overall, 0) >= prev.aiLineup.reduce((s, p) => s + p.overall, 0);
            const allKeys = [...prev.userLineup.map((_, i) => 'user-' + i), ...prev.aiLineup.map((_, i) => 'ai-' + i)];
            return {
              ...prev, finished: true, finalWin, eventParticipants: allKeys, pendingClash: null, endingSequence: null,
              log: [{ id: 'err-end-' + Date.now(), text: '경기 진행 중 문제가 발생해 현재까지의 스코어로 경기를 종료합니다.' }, ...prev.log].slice(0, 6),
            };
          }
          return prev;
        }
      });
    }, 500);
    return () => clearInterval(id);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'scouting') return;
    scoutingCompletedRef.current = false;
    setScoutingTimeLeft(180);
    const interval = setInterval(() => {
      setScoutingTimeLeft((t) => {
        if (t <= 1) {
          if (!scoutingCompletedRef.current) {
            scoutingCompletedRef.current = true;
            setTimeout(() => startDraftPhase(), 0);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'draftIntro') return;
    setDraftIntroCountdown(5);
    const interval = setInterval(() => {
      setDraftIntroCountdown((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen === 'draftIntro' && draftIntroCountdown === 0) {
      setScreen('draft');
    }
  }, [draftIntroCountdown, screen]);

  function handleWaitComplete() {
    if (waitCompletedRef.current) return;
    waitCompletedRef.current = true;
    if (game.league && game.league.current && game.league.current.activeStarters) {
      const lineup = POSITIONS.map((pos) => {
        const pid = game.league.current.activeStarters[pos];
        const p = game.players.find((pl) => pl.id === pid);
        return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
      });
      setUserLineup(lineup);
    }
    startScoutingPhase();
  }

  useEffect(() => {
    if (screen !== 'gameWait') return;
    waitCompletedRef.current = false;
    setWaitCountdown(GAME_WAIT_SECONDS);
    const interval = setInterval(() => {
      setWaitCountdown((t) => {
        if (t <= 1) {
          if (!waitCompletedRef.current) setTimeout(() => handleWaitComplete(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  function finalizeMatch() {
    const wasWin = sim.finalWin;
    if (sim.isTest) {
      // 테스트 경기: 성장, 전적, 경기 기록, 구단 상태 전부 건드리지 않고 결과만 보여준다
      const details = sim.userLineup.map((starter) => ({
        id: starter.id, name: starter.name, position: starter.position, tier: starter.tier,
        kills: starter.kills, deaths: starter.deaths, assists: starter.assists, champion: starter.champion, damage: starter.damage || 0,
        expGained: 0, leveledUp: false, newLevel: starter.level, valueBefore: starter.value, valueAfter: starter.value,
      }));
      const aiDetails = sim.aiLineup.map((a) => ({
        id: a.id, name: a.name, position: a.position, champion: a.champion,
        kills: a.kills, deaths: a.deaths, assists: a.assists, damage: a.damage || 0,
      }));
      setLastResult({
        win: wasWin, userScore: sim.userScore, aiScore: sim.aiScore, playTime: Math.round(sim.tick / TICKS_PER_MIN),
        opponentName: selectedOpponent ? selectedOpponent.name : '테스트 상대', details, aiDetails,
        oldClubValue: game.club.value, newClubValue: game.club.value,
        isLeague: false, seriesDecided: false, seriesWon: null, seriesTally: null, isTest: true,
      });
      setScreen('result');
      return;
    }
    const oldClubValue = game.club.value;
    const details = [];
    const newPlayers = game.players.map((p) => {
      const starter = sim.userLineup.find((u) => u.id === p.id);
      if (!starter) return p;
      let exp = (wasWin ? 30 : 15) + starter.kills * 5 + starter.assists * 2 - starter.deaths * 1;
      exp = Math.max(5, exp);
      let { level, exp: curExp, mechanics, gameSense, teamfight, laning, potential } = p;
      curExp += exp;
      let leveledUp = false;
      const growthKeys = ['mechanics', 'gameSense', 'teamfight', 'laning'];
      const statObj = { mechanics, gameSense, teamfight, laning };
      while (curExp >= level * 100) {
        curExp -= level * 100;
        level++;
        leveledUp = true;
        const times = randRange(1, 2);
        for (let i = 0; i < times; i++) {
          const k = growthKeys[randRange(0, 3)];
          statObj[k] = clamp(statObj[k] + randRange(1, 3), 0, potential);
        }
      }
      ({ mechanics, gameSense, teamfight, laning } = statObj);
      const overall = Math.round((mechanics + gameSense + teamfight + laning) / 4);
      const value = Math.round(overall * 12 + potential * 4);
      details.push({
        id: p.id, name: p.name, position: p.position, tier: p.tier,
        kills: starter.kills, deaths: starter.deaths, assists: starter.assists, champion: starter.champion, damage: starter.damage || 0,
        expGained: exp, leveledUp, newLevel: level, valueBefore: p.value, valueAfter: value,
      });
      return { ...p, level, exp: curExp, mechanics, gameSense, teamfight, laning, overall, value };
    });
    const aiDetails = sim.aiLineup.map((a) => ({
      id: a.id, name: a.name, position: a.position, champion: a.champion,
      kills: a.kills, deaths: a.deaths, assists: a.assists, damage: a.damage || 0,
    }));
    const isLeague = !!(game.league && game.league.current);
    let club = { ...game.club, record: { domestic: { ...game.club.record.domestic }, international: { ...game.club.record.international }, scrim: { ...game.club.record.scrim } } };
    let newLeague = game.league;
    let seriesDecided = false;
    let seriesWon = null;
    let seriesTally = null;
    // 스크림/온라인 매칭은 리그 티어가 없으므로, 이번 경기에 나선 선수단의 다수 등급으로 티어를 판단한다
    const scrimTier = sim.userLineup.filter((p) => p.tier === '2군').length >= 3 ? '2군' : '1군';
    let matchCategory = null;
    let matchTier = null;
    if (isLeague) {
      const cur = { ...game.league.current };
      cur.userWins += wasWin ? 1 : 0;
      cur.aiWins += wasWin ? 0 : 1;
      cur.gameNumber += 1;
      seriesTally = { user: cur.userWins, ai: cur.aiWins };
      if (cur.userWins >= 2 || cur.aiWins >= 2) {
        seriesDecided = true;
        seriesWon = cur.userWins >= 2;
        matchCategory = game.league.type === 'regional' ? 'domestic' : 'international';
        matchTier = game.league.tier || '1군';
        club.wins += seriesWon ? 1 : 0;
        club.losses += seriesWon ? 0 : 1;
        club.record[matchCategory][matchTier] = {
          wins: club.record[matchCategory][matchTier].wins + (seriesWon ? 1 : 0),
          losses: club.record[matchCategory][matchTier].losses + (seriesWon ? 0 : 1),
        };
        if (seriesWon) {
          const winBase = game.league.type === 'regional' ? REGIONAL_REWARD.win : INTERNATIONAL_REWARD.win;
          const winReward = Math.round(winBase * (game.league.tier === '2군' ? 0.5 : 1));
          club.budget += winReward;
        }
        newLeague = { ...game.league, current: null, results: [...game.league.results, { id: game.league.current.opponent.id, name: game.league.current.opponent.name, won: seriesWon }] };
      } else {
        newLeague = { ...game.league, current: cur };
      }
    } else {
      matchCategory = 'scrim';
      matchTier = scrimTier;
      club.wins += wasWin ? 1 : 0;
      club.losses += wasWin ? 0 : 1;
      club.record.scrim[scrimTier] = {
        wins: club.record.scrim[scrimTier].wins + (wasWin ? 1 : 0),
        losses: club.record.scrim[scrimTier].losses + (wasWin ? 0 : 1),
      };
    }
    club.value = computeClubValue(newPlayers);

    const prevHistory = game.matchHistory || [];
    let matchHistory = prevHistory;
    if (!isLeague) {
      const userKillTotal = sim.userLineup.reduce((s, p) => s + p.kills, 0);
      const aiKillTotal = sim.aiLineup.reduce((s, p) => s + p.kills, 0);
      matchHistory = [{
        id: Date.now() + '-' + Math.random(),
        opponentName: selectedOpponent.name, win: wasWin,
        scoreLabel: `${userKillTotal}:${aiKillTotal}`, playTime: Math.round(sim.tick / TICKS_PER_MIN), context: onlineMatchCode ? '온라인 매칭' : '구단 스크림',
        category: matchCategory, tier: matchTier,
      }, ...prevHistory];
    } else if (seriesDecided) {
      matchHistory = [{
        id: Date.now() + '-' + Math.random(),
        opponentName: selectedOpponent.name, win: seriesWon,
        scoreLabel: `${seriesTally.user}:${seriesTally.ai}`, playTime: null, context: game.league.roundLabel,
        category: matchCategory, tier: matchTier,
      }, ...prevHistory];
    }

    if (onlineMatchCode) {
      const codeToReport = onlineMatchCode;
      (async () => {
        try {
          const res = await window.storage.get('onlinematch:' + codeToReport, true);
          if (res && res.value) {
            const data = JSON.parse(res.value);
            data.challengers = [...(data.challengers || []), {
              name: game.club.name, result: wasWin ? 'win' : 'loss',
              score: `${sim.userLineup.reduce((s, p) => s + p.kills, 0)}:${sim.aiLineup.reduce((s, p) => s + p.kills, 0)}`, challengedAt: Date.now(),
            }];
            await window.storage.set('onlinematch:' + codeToReport, JSON.stringify(data), true);
          }
        } catch (e) { /* 결과 기록 실패해도 경기 자체 진행에는 영향 없음 */ }
      })();
      setOnlineMatchCode(null);
    }

    const newGame = { ...game, club, players: newPlayers, league: newLeague, matchHistory };
    setGame(newGame);
    saveGame(newGame);
    setLastResult({
      win: wasWin, userScore: sim.userScore, aiScore: sim.aiScore, playTime: Math.round(sim.tick / TICKS_PER_MIN),
      opponentName: selectedOpponent.name, details, aiDetails, oldClubValue, newClubValue: club.value,
      isLeague, seriesDecided, seriesWon, seriesTally,
    });
    setScreen(isLeague ? (seriesDecided ? 'seriesResult' : 'gameWait') : 'result');
  }

  /* ============================== 화면 렌더 ============================== */

  const shell = 'min-h-screen w-full lm-root';
    // 배포판에서는 인라인 data URI 대신 실제 파일(public/backdrop.png)을 참조하며,
  // 이미지 1장이 폭에 맞춰 늘어나도록(여러 장 이어붙지 않도록) 설정합니다.
  const backdropStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(10,14,23,0) 0%, rgba(10,14,23,0.55) 62%, rgba(10,14,23,1) 100%), url("/backdrop.png")`,
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundPosition: 'top, top center',
    backgroundSize: '100% 160px, 100% 160px',
  };
  const panel = 'lm-panel rounded-xl';
  const btnPrimary = 'lm-btn-primary font-bold rounded-lg transition-colors';
  const btnGhost = 'lm-btn-ghost font-semibold rounded-lg transition-colors';
  const fontStyle = { fontFamily: "'Rajdhani', system-ui, sans-serif" };
  const displayFont = { fontFamily: "'Teko', system-ui, sans-serif" };

  function ConfirmModal() {
    if (!confirmDialog) return null;
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 70 }}>
        <div className={`${panel} p-6 max-w-sm w-full text-center`}>
          <div className="text-sm mb-6 leading-relaxed">{confirmDialog.message}</div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDialog(null)} className={`${btnGhost} flex-1 py-2.5 text-sm`}>취소</button>
            <button
              onClick={() => {
                const fn = confirmDialog.onConfirm;
                setConfirmDialog(null);
                fn();
              }}
              className={`${btnPrimary} flex-1 py-2.5 text-sm`}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Header({ subtitle }) {
    if (!game) return null;
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <h1 className="text-3xl leading-none tracking-wide" style={displayFont}>{game.club.name}</h1>
          <button onClick={() => setScreen('rankings')} className="flex items-center gap-1.5 flex-wrap mt-1 hover:opacity-80 transition-opacity">
            {game.club.region && <span className="text-xs px-1.5 py-0.5 rounded lm-tier-2">{game.club.region}</span>}
            {game.club.qualifiedRankByTier && game.club.qualifiedRankByTier['1군'] && (
              <span className="text-xs px-1.5 py-0.5 rounded lm-tier-2">1군 {LEAGUE_NAME[game.club.region] || '지역리그'} {game.club.qualifiedRankByTier['1군']}위</span>
            )}
            {game.club.qualifiedRankByTier && game.club.qualifiedRankByTier['2군'] && (
              <span className="text-xs px-1.5 py-0.5 rounded lm-tier-reserve">2군 {LEAGUE_NAME[game.club.region] || '지역리그'} {game.club.qualifiedRankByTier['2군']}위</span>
            )}
            {game.club.internationalResultByTier && game.club.internationalResultByTier['1군'] && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#C89B3C', color: '#1A1305' }}>1군 국제 리그 {game.club.internationalResultByTier['1군']}</span>
            )}
            {game.club.internationalResultByTier && game.club.internationalResultByTier['2군'] && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#8A7440', color: '#1A1305' }}>2군 국제 리그 {game.club.internationalResultByTier['2군']}</span>
            )}
          </button>
          {subtitle && <p className="text-xs mt-1 lm-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <button onClick={() => setScreen('matchHistory')} className={`${panel} lm-panel-hover px-3 py-1.5 flex items-center gap-1.5 transition-colors`}>
            <Trophy size={14} color="#C89B3C" />
            <span className="font-semibold">{game.club.wins}승 {game.club.losses}패</span>
          </button>
          <div className={`${panel} px-3 py-1.5 flex items-center gap-1.5`}>
            <TrendingUp size={14} color="#2DD4C6" />
            <span className="font-semibold">{game.club.value.toLocaleString()}</span>
            <span className="text-xs lm-muted">가치</span>
          </div>
          <div className={`${panel} px-3 py-1.5 flex items-center gap-1.5`}>
            <Coins size={14} color="#C89B3C" />
            <span className="font-semibold">{game.club.budget.toLocaleString()} P</span>
          </div>
        </div>
      </div>
    );
  }

  function renderCreate() {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`${panel} p-8 w-full max-w-md text-center`}>
          <img src={APP_LOGO_DATA_URI} alt="롤매니저 로고" className="mx-auto mb-2" width="120" height="120" style={{ objectFit: 'contain' }} />
          <h1 className="text-5xl mb-1 tracking-wide" style={{ ...displayFont, color: '#D9AE55' }}>롤매니저</h1>
          <p className="text-sm mb-6 lm-muted">나만의 e스포츠 구단을 만들어보세요</p>
          <input
            value={clubNameInput}
            onChange={(e) => setClubNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateClub()}
            placeholder="구단 이름을 입력하세요"
            className="w-full rounded-lg px-4 py-3 text-center text-lg lm-input mb-4"
          />
          <div className="mb-4">
            <div className="text-xs mb-2 lm-muted text-left">지역 리그 선택</div>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setClubRegionInput(r)}
                  className={`text-xs px-2 py-2 rounded-lg font-semibold transition-colors ${clubRegionInput === r ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}
                >
                  <div>{r}</div>
                  <div className="text-xs font-normal opacity-80">{LEAGUE_NAME[r]}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleCreateClub} className={`${btnPrimary} w-full py-3 text-lg`}>구단 창단하기</button>
          <p className="text-xs mt-4 lm-dim">※ 등장하는 모든 선수는 가상의 인물입니다. 자유롭게 명단을 직접 편집해서 즐기셔도 좋아요.</p>
        </div>
      </div>
    );
  }

  function renderHome() {
    const nowParts = getKSTParts(getOnlineNow());
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <div className={`${panel} p-3 mb-4 flex items-center justify-center gap-2`}>
          <span className="text-sm font-semibold tracking-wide">
            {nowParts.year}년 {nowParts.month}월 {nowParts.day}일 {nowParts.hour}:{nowParts.minute}
          </span>
          <span className="text-xs lm-dim">(한국시간{timeSynced ? '' : ' · 동기화 중'})</span>
        </div>
        <Header subtitle="구단 홈" />
        {game.club.record && (
          <button onClick={() => setScreen('matchHistory')} className={`${panel} lm-panel-hover w-full p-3 mb-4 text-left transition-colors`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="lm-muted">
                  <th className="text-left font-normal pb-1"></th>
                  <th className="text-center font-normal pb-1">국내리그</th>
                  <th className="text-center font-normal pb-1">국제리그</th>
                  <th className="text-center font-normal pb-1">스크림</th>
                </tr>
              </thead>
              <tbody>
                {['1군', '2군'].map((tier) => (
                  <tr key={tier}>
                    <td className="font-semibold pr-2 py-0.5">{tier}</td>
                    <td className="text-center py-0.5">{game.club.record.domestic[tier].wins}승 {game.club.record.domestic[tier].losses}패</td>
                    <td className="text-center py-0.5">{game.club.record.international[tier].wins}승 {game.club.record.international[tier].losses}패</td>
                    <td className="text-center py-0.5">{game.club.record.scrim[tier].wins}승 {game.club.record.scrim[tier].losses}패</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </button>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setScreen('roster')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Users size={26} color="#38BDF8" className="mb-2" />
            <div className="font-bold text-lg">선수단</div>
            <div className="text-xs mt-1 lm-muted">보유 선수 {game.players.length}명 확인 및 관리</div>
          </button>
          <button onClick={() => { setPullResults([]); setShowPullModal(false); setScreen('recruit'); }} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <ArrowLeftRight size={26} color="#2DD4C6" className="mb-2" />
            <div className="font-bold text-lg">선수 영입</div>
            <div className="text-xs mt-1 lm-muted">신인 뽑기 · FA 시장 · {game.club.budget.toLocaleString()} P 보유</div>
          </button>
          <button
            onClick={() => setScreen('matchSelect')}
            disabled={!!(game.league && game.league.current)}
            className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Swords size={26} color="#EF4444" className="mb-2" />
            <div className="font-bold text-lg">구단 스크림</div>
            <div className="text-xs mt-1 lm-muted">
              {game.league && game.league.current
                ? '매칭된 구단과의 경기가 끝나기 전까지 스크림을 할 수 없습니다'
                : '상대 구단과 단판 친선 매치'}
            </div>
          </button>
          {(() => {
            const regionalActive = game.league && game.league.type === 'regional';
            const intlActive = game.league && game.league.type === 'international';
            const mySlots = INTL_SLOTS[game.club.region] || 2;
            const canJoinIntl = !game.league && game.club.qualifiedRank && game.club.qualifiedRank <= mySlots;
            return (
              <>
                <button
                  onClick={() => (regionalActive ? handleResumeLeague() : setLeagueStartConfirm('regional'))}
                  disabled={!!intlActive}
                  className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Trophy size={26} color="#38BDF8" className="mb-2" />
                  <div className="font-bold text-lg flex items-center gap-1.5 flex-wrap">
                    국내 리그
                    <span className="text-xs px-1.5 py-0.5 rounded lm-tier-2">{game.club.region || REGIONS[0]}</span>
                    {regionalActive && <span className="text-xs lm-muted">({game.league.tier} 진행 중)</span>}
                  </div>
                  <div className="text-xs mt-1 lm-muted">{LEAGUE_NAME[game.club.region || REGIONS[0]]} · {REGION_CLUBS[game.club.region || REGIONS[0]].length}개 구단 라운드로빈{regionalActive ? ` · ${game.league.results.length}/${REGION_CLUBS[game.club.region || REGIONS[0]].length} 완료` : ''}</div>
                </button>
                {intlActive ? (
                  <button onClick={handleResumeLeague} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
                    <Trophy size={26} color="#C89B3C" className="mb-2" />
                    <div className="font-bold text-lg">국제 리그 ({game.league.tier} 진행 중)</div>
                    <div className="text-xs mt-1 lm-muted">{game.league.roundLabel} 진행 중</div>
                  </button>
                ) : (
                  <button
                    onClick={() => setLeagueStartConfirm('international')}
                    disabled={!canJoinIntl}
                    className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Trophy size={26} color="#C89B3C" className="mb-2" />
                    <div className="font-bold text-lg">국제 리그</div>
                    <div className="text-xs mt-1 lm-muted">{canJoinIntl ? '10개 구단 토너먼트 참가 가능' : `지역 리그 상위 ${mySlots}위 안에 들어야 참가 가능`}</div>
                  </button>
                )}
              </>
            );
          })()}
          <button onClick={() => setScreen('onlineMatch')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Users size={26} color="#38BDF8" className="mb-2" />
            <div className="font-bold text-lg">온라인 매칭</div>
            <div className="text-xs mt-1 lm-muted">초대 코드로 다른 유저 구단과 비동기 스크림</div>
          </button>
          <button onClick={() => setScreen('sponsors')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Coins size={26} color="#D9AE55" className="mb-2" />
            <div className="font-bold text-lg">기업 스폰</div>
            <div className="text-xs mt-1 lm-muted">계약 {(game.club.sponsors || []).length} / {Math.floor(game.club.value / SPONSOR_VALUE_PER_SLOT)} · 매일 자동 수익</div>
          </button>
          <button onClick={() => setScreen('guide')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Trophy size={26} color="#2DD4C6" className="mb-2" />
            <div className="font-bold text-lg">게임 가이드</div>
            <div className="text-xs mt-1 lm-muted">게임 설명 보기</div>
          </button>
        </div>
        <button onClick={handleStartTestMatch} className={`${panel} lm-panel-hover w-full p-4 text-left transition-colors flex items-center justify-between mt-3`}>
          <div>
            <div className="font-bold text-sm">경기 테스트</div>
            <div className="text-xs mt-0.5 lm-muted">무작위 상대와 바로 시뮬레이션 (전적·성장에 반영되지 않음)</div>
          </div>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setConfirmDialog({ message: '정말로 구단을 초기화하고 새로 시작하시겠습니까? 이 작업은 되돌릴 수 없습니다.', onConfirm: handleReset })} className="mt-8 text-xs flex items-center gap-1 lm-dim lm-hover-muted">
          <RotateCcw size={12} /> 구단 초기화하고 새로 시작
        </button>
        <div className="mt-4 text-xs text-center lm-dim">{APP_VERSION}</div>
        {leagueStartConfirm && (
          <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}>
            <div className={`${panel} p-6 max-w-sm w-full text-center`}>
              <div className="text-lg font-bold mb-2">경기를 시작하시겠습니까?</div>
              <div className="text-sm mb-4 lm-muted">경기가 시작되면 매치가 끝날 때까지 스크림을 할 수 없습니다.</div>
              <div className="text-xs mb-3 lm-muted">어느 등급으로 참가할까요? (2군은 보상이 절반이에요)</div>
              <div className="flex gap-3 mb-3">
                <button onClick={() => handleConfirmLeagueStart('1군')} className={`${btnPrimary} flex-1 py-2.5 text-sm`}>1군으로 참가</button>
                <button onClick={() => handleConfirmLeagueStart('2군')} className={`${btnPrimary} flex-1 py-2.5 text-sm`}>2군으로 참가</button>
              </div>
              <button onClick={() => setLeagueStartConfirm(null)} className={`${btnGhost} w-full py-2.5 text-sm`}>취소하기</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderRoster() {
    const filteredPositions = rosterFilter === 'ALL' ? POSITIONS : [rosterFilter];
    const has2gun = game.players.some((p) => p.tier === '2군');
    const power1 = computeTeamPower(game.players, '1군');
    const power2 = has2gun ? computeTeamPower(game.players, '2군') : null;
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="선수단 관리" />
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm`}>← 홈으로</button>
          <button onClick={() => setScreen('rosterManage')} className={`${btnGhost} px-4 py-2 text-sm`}>선수단 관리</button>
          <button onClick={() => setScreen('rankings')} className={`${btnGhost} px-4 py-2 text-sm`}>랭킹</button>
        </div>
        <div className={`${panel} p-3 mb-4 flex items-center justify-center gap-4`}>
          <span className="text-xs lm-muted">국내리그 우승 <b className="lm-text-value">{game.club.regionalTitles || 0}</b>회</span>
          <span className="text-xs lm-muted">국제리그 우승 <b className="lm-text-value">{game.club.internationalTitles || 0}</b>회</span>
        </div>
        <div className={`${panel} p-4 mb-4 flex items-center justify-between flex-wrap gap-3`}>
          <div>
            <span className="text-sm font-semibold">1군 팀파워</span>
            <span className="text-2xl font-bold ml-2" style={{ color: '#D9AE55' }}>{power1}</span>
          </div>
          {has2gun && (
            <div>
              <span className="text-sm font-semibold">2군 팀파워</span>
              <span className="text-2xl font-bold ml-2" style={{ color: '#9AA6C7' }}>{power2}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setRosterFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rosterFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체</button>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => setRosterFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rosterFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
              {POS_LABEL[pos]}
            </button>
          ))}
        </div>
        <div className="text-xs mb-4 lm-muted">1군/2군 배치는 "선수단 관리" 화면에서 바꿀 수 있어요.</div>
        <div className="space-y-6">
          {filteredPositions.map((pos) => {
            const posPlayers = game.players.filter((p) => p.position === pos);
            return (
              <div key={pos}>
                <div className="flex items-center gap-2 mb-2">
                  <PosBadge position={pos} />
                  <span className="text-sm font-semibold lm-muted">{POS_LABEL[pos]}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {posPlayers.sort((a, b) => (a.tier === '1군' ? -1 : 1)).map((p) => {
                    const isLast = posPlayers.length <= 1;
                    return (
                      <div key={p.id} className={`${panel} p-3 flex flex-col`}>
                        <div className="flex items-center justify-between mb-2 gap-1">
                          <span className="font-bold text-sm truncate">{p.name}</span>
                          <span className="text-xs lm-muted shrink-0">{p.region}</span>
                        </div>

                        <div className="flex flex-col items-center mb-2">
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-1.5"
                            style={{ background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: `2px solid ${POS_COLOR[p.position]}` }}
                          >
                            {PLAYER_PORTRAITS[p.name] ? (
                              <img src={PLAYER_PORTRAITS[p.name]} alt={p.name} className="w-full h-full rounded-full" style={{ objectFit: 'cover' }} />
                            ) : (
                              <img src="/player-face-blind.png" alt="" width="30" height="30" />
                            )}
                          </div>
                          <TierBadge tier={p.tier} />
                        </div>

                        <div className="text-center text-xs lm-muted">OVR <b className="lm-text-value">{p.overall}</b> · 잠재력 <b className="lm-text-value">{p.potential}</b></div>
                        <div className="text-center text-xs mb-2 lm-muted">Lv.{p.level} · <span style={{ color: '#D9AE55' }}>{p.value.toLocaleString()} P</span></div>
                        <div className="h-1 rounded-full overflow-hidden mb-2 lm-track">
                          <div className="h-full" style={{ width: `${(p.exp / (p.level * 100)) * 100}%`, backgroundColor: '#2DD4C6' }} />
                        </div>
                        <div className="space-y-1 mb-3">
                          <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
                          <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
                          <StatBar label="한타" value={p.teamfight} color="#EF4444" />
                          <StatBar label="라인전" value={p.laning} color="#38BDF8" />
                        </div>
                        <button onClick={() => { setViewingPlayerId(p.id); setScreen('playerDetail'); }} className={`${btnGhost} w-full py-1.5 text-xs mb-2`}>상세보기</button>
                        {faDeclareId === p.id ? (
                          faDeclareMode === null ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs lm-muted text-center">어떻게 판매할까요?</span>
                              <button onClick={() => { setFaDeclareMode('market'); setFaPriceInput(String(p.value)); }} className="text-xs px-2 py-1 rounded lm-btn-ghost">FA 시장으로 보내기</button>
                              <button onClick={() => { setFaDeclareMode('code'); setFaPriceInput(String(p.value)); }} className="text-xs px-2 py-1 rounded lm-btn-ghost">특정 유저에게 코드로 팔기</button>
                              <button onClick={() => setFaDeclareId(null)} className="text-xs px-2 py-1 rounded lm-btn-ghost">취소</button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <input
                                type="number"
                                value={faPriceInput}
                                onChange={(e) => setFaPriceInput(String(clamp(Number(e.target.value) || 0, 0, p.value)))}
                                placeholder="가격(P)"
                                max={p.value}
                                className="lm-input rounded-lg px-2 py-1 text-xs w-full"
                              />
                              <div className="text-xs lm-dim text-center">최대 {p.value.toLocaleString()}P (책정금액)</div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => (faDeclareMode === 'market' ? handleDeclareFA(p.id, faPriceInput) : handleCreateSaleCode(p.id, faPriceInput))}
                                  disabled={!faPriceInput || Number(faPriceInput) <= 0}
                                  className="text-xs px-2 py-1 rounded lm-btn-primary font-semibold flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {faDeclareMode === 'market' ? 'FA 등록' : '코드 생성'}
                                </button>
                                <button onClick={() => { setFaDeclareId(null); setFaDeclareMode(null); setFaPriceInput(''); }} className="text-xs px-2 py-1 rounded lm-btn-ghost flex-1">취소</button>
                              </div>
                            </div>
                          )
                        ) : releaseConfirmId === p.id ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs lm-muted text-center">정말 방출하시겠습니까?</span>
                            <div className="flex gap-1.5">
                              <button onClick={() => handleReleasePlayer(p.id)} className="text-xs px-2 py-1 rounded lm-ban-tag font-semibold flex-1">방출</button>
                              <button onClick={() => setReleaseConfirmId(null)} className="text-xs px-2 py-1 rounded lm-btn-ghost flex-1">취소</button>
                            </div>
                          </div>
                        ) : isLast ? (
                          <span className="text-xs lm-dim text-center">포지션 최소 인원 · 방출/FA선언 불가</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => setReleaseConfirmId(p.id)} className="text-xs px-2 py-1 rounded lm-btn-ghost" style={{ color: '#F87171' }}>방출</button>
                            <button onClick={() => { setFaDeclareId(p.id); setFaDeclareMode(null); }} className="text-xs px-2 py-1 rounded lm-btn-ghost" style={{ color: '#38BDF8' }}>FA선언</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPlayerDetail() {
    const p = game.players.find((pl) => pl.id === viewingPlayerId);
    if (!p) {
      return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <button onClick={() => setScreen('roster')} className={`${btnGhost} px-4 py-2 text-sm`}>← 선수단으로</button>
          <div className="text-sm mt-4 lm-muted">선수를 찾을 수 없어요.</div>
        </div>
      );
    }
    const ach = p.achievements || { regionalWins: 0, regionalRunnerUps: 0, regionalTop5: 0, internationalWins: 0, internationalRunnerUps: 0, internationalTop5: 0 };
    const signature = p.signatureChampions || [];
    const special = p.specialChampions || [];
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="선수 상세정보" />
        <button onClick={() => setScreen('roster')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 선수단으로</button>

        <div className={`${panel} p-4 mb-4`}>
          {PLAYER_PORTRAITS[p.name] && (
            <div className="flex justify-center mb-3">
              <img
                src={PLAYER_PORTRAITS[p.name]} alt={p.name}
                className="w-20 h-20 rounded-full"
                style={{ border: `2px solid ${POS_COLOR[p.position]}`, objectFit: 'cover' }}
              />
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{p.name}</span>
              <PosBadge position={p.position} />
              <TierBadge tier={p.tier} />
            </div>
            <span className="text-xs lm-muted">{p.region}</span>
          </div>
          <div className="text-xs lm-muted">OVR <b className="lm-text-value">{p.overall}</b> · 잠재력 <b className="lm-text-value">{p.potential}</b> · Lv.{p.level}</div>
          <div className="text-xs lm-muted">시장가치 <span style={{ color: '#D9AE55' }}>{p.value.toLocaleString()} P</span></div>
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-2">능력치</div>
          <div className="space-y-1.5">
            <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
            <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
            <StatBar label="한타" value={p.teamfight} color="#EF4444" />
            <StatBar label="라인전" value={p.laning} color="#38BDF8" />
          </div>
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-2">개인 우승 기록</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="lm-muted mb-1">국내리그</div>
              <div>우승 <b className="lm-text-value">{ach.regionalWins}</b>회 · 준우승 <b className="lm-text-value">{ach.regionalRunnerUps}</b>회</div>
              <div className="mt-0.5">3~5위 <b className="lm-text-value">{ach.regionalTop5 || 0}</b>회</div>
            </div>
            <div>
              <div className="lm-muted mb-1">국제리그</div>
              <div>우승 <b className="lm-text-value">{ach.internationalWins}</b>회 · 준우승 <b className="lm-text-value">{ach.internationalRunnerUps}</b>회</div>
              <div className="mt-0.5">3~5위 <b className="lm-text-value">{ach.internationalTop5 || 0}</b>회</div>
            </div>
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <div className="text-sm font-semibold mb-1">주력 챔피언</div>
          <div className="text-xs mb-3 lm-muted">이 중 골드로 표시된 2개는 특별히 잘 다루는 챔피언이에요.</div>
          <div className="grid grid-cols-5 gap-2">
            {signature.map((champ) => {
              const isSpecial = special.includes(champ);
              return (
                <div key={champ} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                      border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                    }}
                  >
                    {CHAMPION_ICON[champ] ? (
                      <img src={CHAMPION_ICON[champ]} alt={champ} className="w-full h-full" style={{ objectFit: 'cover' }} />
                    ) : (
                      CHAMPION_WEAPON[champ] || '❔'
                    )}
                  </div>
                  <div className="text-xs text-center truncate w-full" style={isSpecial ? { color: '#D9AE55', fontWeight: 700 } : {}}>{champ}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderRosterManage() {
    const SlotBoard = ({ tier, color }) => (
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">{tier}</div>
        <div className="grid grid-cols-5 gap-2">
          {POSITIONS.map((pos) => {
            const occupant = game.players.find((p) => p.position === pos && p.tier === tier);
            return (
              <div key={pos} className={`${panel} p-2 text-center`}>
                <PosBadge position={pos} />
                <div className="text-xs mt-1 truncate" style={occupant ? { color } : {}}>
                  {occupant ? occupant.name : '(비어있음)'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="선수단 관리" />
        <button onClick={() => setScreen('roster')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 선수단으로</button>

        <SlotBoard tier="1군" color="#D9AE55" />
        <SlotBoard tier="2군" color="#9AA6C7" />

        <div className="text-sm font-semibold mb-2 mt-6">전체 선수</div>
        <div className="text-xs mb-3 lm-muted">선수 아래 1군/2군 버튼을 누르면 그 자리로 배치돼요. 이미 그 자리에 있던 선수는 서로 자리를 맞바꿔요.</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...game.players].sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position)).map((p) => (
            <div key={p.id} className={`${panel} p-3`}>
              <div className="flex items-center justify-between mb-2 gap-1">
                <span className="font-bold text-sm truncate flex items-center gap-1"><PosBadge position={p.position} /> {p.name}</span>
              </div>
              <div className="text-xs mb-2 lm-muted text-center">OVR <b className="lm-text-value">{p.overall}</b> · 현재 <b className="lm-text-value">{p.tier}</b></div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleSetTier(p.id, '1군')}
                  disabled={p.tier === '1군'}
                  className="text-xs px-2 py-1.5 rounded lm-btn-ghost flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: '#D9AE55' }}
                >
                  1군
                </button>
                <button
                  onClick={() => handleSetTier(p.id, '2군')}
                  disabled={p.tier === '2군'}
                  className="text-xs px-2 py-1.5 rounded lm-btn-ghost flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: '#9AA6C7' }}
                >
                  2군
                </button>
              </div>
              <button onClick={() => { setViewingPlayerId(p.id); setScreen('playerDetail'); }} className={`${btnGhost} w-full py-1.5 text-xs mt-1.5`}>상세보기</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSponsors() {
    const sponsors = game.club.sponsors || [];
    const maxSlots = Math.floor(game.club.value / SPONSOR_VALUE_PER_SLOT);
    const dailyPerSponsor = Math.round(game.club.value * SPONSOR_DAILY_RATE);
    const categories = Object.keys(SPONSOR_CATEGORIES);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="기업 스폰" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-1">스폰서 슬롯 {sponsors.length} / {maxSlots}</div>
          <div className="text-xs lm-muted">구단 가치 {SPONSOR_VALUE_PER_SLOT.toLocaleString()}당 슬롯 1개가 생겨요. 스폰서 1곳당 매일 00시(날짜가 바뀔 때) 구단 가치의 {Math.round(SPONSOR_DAILY_RATE * 100)}%를 포인트로 받아요.</div>
          <div className="text-xs mt-1 lm-muted">현재 스폰서 1곳당 예상 일일 수익: <span className="lm-text-value font-semibold">{dailyPerSponsor.toLocaleString()} P</span></div>
        </div>

        {sponsors.length > 0 && (
          <div className={`${panel} p-4 mb-4`}>
            <div className="text-sm font-semibold mb-2">계약 중인 스폰서</div>
            <div className="space-y-1.5">
              {sponsors.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span>{s.companyName}</span>
                  <span className="lm-muted">{s.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${panel} p-4`}>
          <div className="text-sm font-semibold mb-3">새 스폰서 카테고리 선택</div>
          {sponsors.length >= maxSlots ? (
            <div className="text-xs text-center py-4 lm-muted">
              {maxSlots === 0 ? '구단 가치가 5,000 이상이 되면 스폰서 슬롯이 열려요.' : '남은 스폰서 슬롯이 없어요. 구단 가치를 더 키워보세요.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => handleSignSponsor(cat)} className="text-xs px-3 py-3 rounded-lg font-semibold lm-filter-tab transition-colors">
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderGuide() {
    const Section = ({ title, children }) => (
      <div className={`${panel} p-4 mb-3`}>
        <div className="text-sm font-semibold mb-2" style={{ color: '#D9AE55' }}>{title}</div>
        <div className="text-xs leading-relaxed space-y-1.5 lm-muted">{children}</div>
      </div>
    );
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="게임 가이드" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>

        <Section title="구단과 선수단">
          <p>구단은 포지션(탑/정글/미드/원딜/서포터)마다 선수를 보유하며, 각 선수는 1군/2군 중 하나로 지정돼요. 1군/2군은 능력치와 무관한 "보직"일 뿐이며, 선수단 화면에서 배지를 탭해 언제든 바꿀 수 있어요.</p>
          <p>홈 화면의 "팀파워"는 포지션별 1군 선수(없으면 최고 능력치 선수)의 OVR 합계예요.</p>
        </Section>

        <Section title="선수 영입">
          <p>선수는 아이언~챌린저까지 10단계 등급 확률로 생성돼요. 등급이 높을수록 능력치와 잠재력이 좋지만 그만큼 훨씬 드물게 나와요. (자세한 구간은 아래 "능력치 등급표 보기" 참고)</p>
          <p>· 신인 발굴: 포인트로 뽑기(1회/5회)</p>
          <p>· FA 시장: 포지션별로 매물을 보고 구매. 하루 최대 5회 새로고침 가능</p>
        </Section>

        <Section title="경기 방식">
          <p>· 구단 스크림: 아무 구단과 단판(Bo1) 친선전. 1군/2군 중 선택해서 도전할 수 있어요.</p>
          <p>· 지역 리그: 소속 지역 구단들과 라운드로빈(재대결 없음), 3판2선승. 상위 2위 안에 들면 국제 리그 자격을 얻어요.</p>
          <p>· 국제 리그: 6개 지역 대표 10개 구단의 토너먼트. 지역별로 1~2팀이 참가하고(한국·중국·유럽·아메리카 2팀, 아시아·남아메리카 1팀), 2번 시드 4팀은 플레이인을 먼저 치른 뒤 나머지 6팀과 8강부터 합류해요. 이후 8강-4강-결승, 3판2선승.</p>
          <p>경기 전 밴/픽 단계에서 챔피언을 직접 고르고, 챔피언끼리도 개별 상성이 있어요(능력치 차이가 크면 상성을 극복할 수 있어요).</p>
        </Section>

        <Section title="포인트 수입원">
          <p>· 리그 참가 보상, 승리 보상, 최종 순위 보상 (지역리그/국제 리그)</p>
          <p>· 스폰서 계약: 구단 가치 5,000당 슬롯 1개, 스폰서 1곳당 매일 구단 가치의 5%를 자동으로 받아요.</p>
          <p>· FA선언한 선수가 팔렸을 때의 대금 (아래 참고)</p>
        </Section>

        <Section title="선수 방출 / FA선언">
          <p>방출은 그냥 내보내는 것, FA선언은 파는 거예요. FA선언 시 가격은 선수의 책정금액(능력치 기반 가치)을 넘길 수 없어요.</p>
          <p>· FA 시장으로 보내기: 내 FA 시장에 매물로 등록</p>
          <p>· 코드로 팔기: 판매 코드를 만들어 다른 유저에게 전달, 그 유저가 "온라인 매칭" 화면에서 코드를 입력하면 구매돼요. 판매되면 "판매 대금 확인" 버튼으로 대금을 수령하세요.</p>
        </Section>

        <Section title="온라인 매칭">
          <p>실시간 대전은 아니고, 초대 코드로 상대 구단의 스냅샷과 비동기로 스크림을 치르는 방식이에요. 같은 화면에서 선수 코드 거래도 할 수 있어요.</p>
        </Section>

        <button onClick={() => setScreen('championList')} className={`${panel} lm-panel-hover w-full p-4 text-left transition-colors flex items-center justify-between mb-3`}>
          <span className="text-sm font-semibold">챔피언 리스트 보기</span>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setScreen('gradeTable')} className={`${panel} lm-panel-hover w-full p-4 text-left transition-colors flex items-center justify-between`}>
          <span className="text-sm font-semibold">능력치 등급표 보기</span>
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  function renderGradeTable() {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="능력치 등급표" />
        <button onClick={() => setScreen('guide')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 가이드로</button>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-xs lm-muted">신인 발굴과 FA 시장에서 선수가 생성될 때 이 등급표를 따라요. 등급이 높을수록 능력치·잠재력 상한이 높아지지만 등장 확률은 훨씬 낮아져요.</div>
        </div>

        <div className={`${panel} p-3 overflow-x-auto`}>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="lm-muted" style={{ borderBottom: '1px solid #232E4A' }}>
                <th className="text-left py-2 px-2">등급</th>
                <th className="text-right py-2 px-2">능력치 상한</th>
                <th className="text-right py-2 px-2">잠재력 상한</th>
                <th className="text-right py-2 px-2">등장 확률</th>
              </tr>
            </thead>
            <tbody>
              {PLAYER_GRADE_TABLE.map((g) => (
                <tr key={g.grade} style={{ borderBottom: '1px solid #1D2740' }}>
                  <td className="py-2 px-2 font-bold" style={{ color: GRADE_COLOR[g.grade] }}>{g.grade}</td>
                  <td className="py-2 px-2 text-right lm-text-value">{g.statMax} 이하</td>
                  <td className="py-2 px-2 text-right lm-text-value">{g.potentialMax} 이하</td>
                  <td className="py-2 px-2 text-right lm-text-value">{g.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderChampionList() {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="챔피언 리스트" />
        <button onClick={() => setScreen('guide')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 가이드로</button>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setGuideChampFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${guideChampFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체</button>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => setGuideChampFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${guideChampFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
              {POS_LABEL[pos]}
            </button>
          ))}
        </div>

        <div className="text-xs mb-3 lm-muted">총 {ALL_CHAMPIONS_FLAT.filter((c) => guideChampFilter === 'ALL' || c.role === guideChampFilter).length}명</div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ALL_CHAMPIONS_FLAT.filter((c) => guideChampFilter === 'ALL' || c.role === guideChampFilter).map(({ name, role }) => (
            <div key={name} className={`${panel} p-2 flex flex-col items-center gap-1`}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${POS_COLOR[role]}, #0A0E17)`, border: `1px solid ${POS_COLOR[role]}` }}
              >
                {CHAMPION_ICON[name] ? (
                  <img src={CHAMPION_ICON[name]} alt={name} className="w-full h-full" style={{ objectFit: 'cover' }} />
                ) : (
                  CHAMPION_WEAPON[name] || '❔'
                )}
              </div>
              <div className="text-xs text-center truncate w-full">{name}</div>
              <PosBadge position={role} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderRankings() {
    const region = game.club.region || REGIONS[0];
    const domestic = REGION_CLUBS[region].map((c) => ({ ...c, isUser: false }));
    if (game.club.qualifiedRank) {
      domestic.push({ name: game.club.name, power: (game.club.qualifiedWins || 0) * 40, isUser: true, region });
    }
    domestic.sort((a, b) => b.power - a.power);
    const international = getInternationalQualifiers(game);

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="랭킹" />
        <button onClick={() => setScreen('roster')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 선수단으로</button>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setRankingTab('domestic')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rankingTab === 'domestic' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>국내 ({LEAGUE_NAME[region]})</button>
          <button onClick={() => setRankingTab('international')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rankingTab === 'international' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>국제 랭킹</button>
        </div>

        {rankingTab === 'domestic' ? (
          <div className={`${panel} p-4`}>
            <div className="text-sm font-semibold mb-3">{LEAGUE_NAME[region]} 전체 순위{!game.club.qualifiedRank && ' (지역리그를 완주하면 우리 구단 순위도 표시돼요)'}</div>
            <div className="space-y-1.5">
              {domestic.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm" style={{ borderBottom: i < domestic.length - 1 ? '1px solid #1D2740' : 'none', paddingBottom: 6, color: c.isUser ? '#D9AE55' : undefined }}>
                  <span className={c.isUser ? 'font-bold' : 'lm-muted'}>{i + 1}위 · {c.name}{c.isUser ? ' (우리 구단)' : ''}</span>
                  <span className="text-xs lm-muted">파워 {c.power}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${panel} p-4`}>
            <div className="text-sm font-semibold mb-3">국제 리그 진출권 순위 (한국·중국·유럽·아메리카 2팀, 아시아·남아메리카 1팀 = 총 10팀)</div>
            <div className="space-y-1.5">
              {international.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm" style={{ borderBottom: i < international.length - 1 ? '1px solid #1D2740' : 'none', paddingBottom: 6, color: c.isUser ? '#D9AE55' : undefined }}>
                  <span className={c.isUser ? 'font-bold' : 'lm-muted'}>{i + 1}위 · {c.name}{c.isUser ? ' (우리 구단)' : ''}</span>
                  <span className="text-xs lm-muted">{c.region} · 파워 {c.power}</span>
                </div>
              ))}
            </div>
            {game.club.internationalResult && (
              <div className="text-xs mt-3" style={{ color: '#2DD4C6' }}>지난 국제 리그 결과: {game.club.internationalResult}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderOnlineMatch() {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="온라인 매칭" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-xs lm-muted">실시간 대전은 아니에요. 상대가 만든 코드를 입력하면, 그 시점의 상대 구단 선수단 스냅샷을 상대로 스크림을 치르는 비동기 방식이에요. 두 사람이 동시에 켜져 있지 않아도 돼요.</div>
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-2">내 초대 코드</div>
          {myInviteCode ? (
            <div>
              <div className="text-3xl font-bold tracking-widest text-center mb-2" style={{ ...displayFont, color: '#D9AE55' }}>{myInviteCode}</div>
              <div className="text-xs lm-muted text-center mb-3">이 코드를 상대에게 알려주세요. 상대가 이 코드로 우리 구단(현재 1군 라인업 스냅샷)에 도전할 수 있어요.</div>
              <button onClick={handleRefreshMyInvite} className={`${btnGhost} w-full py-2 text-sm mb-2`}>도전 기록 새로고침</button>
              {inviteRecord && inviteRecord.challengers && inviteRecord.challengers.length > 0 ? (
                <div className="space-y-1.5 mt-2">
                  {inviteRecord.challengers.slice().reverse().map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="lm-muted">{c.name}</span>
                      <span style={{ color: c.result === 'win' ? '#EF4444' : '#2DD4C6' }}>{c.result === 'win' ? '우리 패배' : '우리 승리'} · {c.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs lm-muted text-center">아직 도전한 상대가 없어요.</div>
              )}
            </div>
          ) : (
            <button onClick={handleCreateInviteCode} className={`${btnPrimary} w-full py-3 text-sm`}>초대 코드 생성</button>
          )}
        </div>

        <div className={`${panel} p-4`}>
          <div className="text-sm font-semibold mb-2">코드로 도전하기</div>
          <div className="flex gap-2">
            <input
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="코드 입력"
              maxLength={6}
              className="lm-input rounded-lg px-3 py-2 text-sm flex-1 tracking-widest"
            />
            <button onClick={handleJoinWithCode} className={`${btnPrimary} px-4 py-2 text-sm`}>참가</button>
          </div>
          {inviteCodeStatus && <div className="text-xs mt-2" style={{ color: '#F87171' }}>{inviteCodeStatus}</div>}
        </div>

        <div className={`${panel} p-4 mt-4`}>
          <div className="text-sm font-semibold mb-2">선수 코드로 영입하기</div>
          <div className="text-xs mb-3 lm-muted">다른 유저가 선수단에서 "특정 유저에게 코드로 팔기"로 만든 코드를 입력하면 그 선수를 바로 영입할 수 있어요.</div>
          <div className="flex gap-2">
            <input
              value={playerCodeInput}
              onChange={(e) => setPlayerCodeInput(e.target.value.toUpperCase())}
              placeholder="선수 코드 입력"
              maxLength={6}
              className="lm-input rounded-lg px-3 py-2 text-sm flex-1 tracking-widest"
            />
            <button onClick={handleBuyPlayerCode} className={`${btnPrimary} px-4 py-2 text-sm`}>구매</button>
          </div>
          {playerCodeStatus && <div className="text-xs mt-2" style={{ color: '#2DD4C6' }}>{playerCodeStatus}</div>}
        </div>

        <div className={`${panel} p-4 mt-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">내가 코드로 등록한 선수</div>
            <button onClick={handleCheckSaleCodes} className={`${btnGhost} px-3 py-1.5 text-xs`}>판매 대금 확인</button>
          </div>
          {lastCreatedSaleCode && (
            <div className="text-center mb-3">
              <div className="text-xs lm-muted mb-1">방금 만든 코드</div>
              <div className="text-2xl font-bold tracking-widest" style={{ ...displayFont, color: '#D9AE55' }}>{lastCreatedSaleCode}</div>
            </div>
          )}
          {saleCodeClaimMessage && <div className="text-xs mb-2 text-center" style={{ color: '#2DD4C6' }}>{saleCodeClaimMessage}</div>}
          {(game.club.mySaleCodes || []).length === 0 ? (
            <div className="text-xs lm-muted text-center">등록한 판매 코드가 없어요.</div>
          ) : (
            <div className="space-y-1.5">
              {[...(game.club.mySaleCodes || [])].reverse().map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="lm-muted">{c.playerName} · {c.code}</span>
                  <span style={{ color: c.claimed ? '#2DD4C6' : '#9AA6C7' }}>{c.claimed ? `판매완료 (${c.price.toLocaleString()}P 수령)` : '판매 대기중'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderMatchHistory() {
    const history = game.matchHistory || [];
    const CATEGORY_LABEL = { domestic: '국내리그', international: '국제리그', scrim: '스크림' };
    const filtered = history.filter((h) => h.category === historyCategory && h.tier === historyTier);
    const record = game.club.record ? game.club.record[historyCategory][historyTier] : { wins: 0, losses: 0 };
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="전적" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>
        <div className="flex gap-2 mb-2">
          {['domestic', 'international', 'scrim'].map((cat) => (
            <button key={cat} onClick={() => setHistoryCategory(cat)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${historyCategory === cat ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>{CATEGORY_LABEL[cat]}</button>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          {['1군', '2군'].map((t) => (
            <button key={t} onClick={() => setHistoryTier(t)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${historyTier === t ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>{t}</button>
          ))}
        </div>
        <div className={`${panel} p-4 mb-4 text-center`}>
          <div className="text-xs mb-1 lm-muted">{CATEGORY_LABEL[historyCategory]} · {historyTier}</div>
          <div className="text-2xl font-bold">{record.wins}승 {record.losses}패</div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-center py-10 lm-muted">아직 치른 경기가 없어요.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((h) => (
              <div key={h.id} className={`${panel} p-3 flex items-center justify-between gap-2`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: h.win ? '#2DD4C6' : '#EF4444', color: h.win ? '#052A26' : '#3A0A0A' }}>{h.win ? '승' : '패'}</span>
                    <span className="font-semibold truncate">vs {h.opponentName}</span>
                  </div>
                  <div className="text-xs mt-1 lm-muted">{h.context}{h.playTime ? ` · ${h.playTime}분` : ''}</div>
                </div>
                <span className="text-sm font-mono lm-text-value shrink-0">{h.scoreLabel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderRecruit() {
    const listings = faMarket || [];
    const filteredListings = faPositionFilter === 'ALL' ? listings : listings.filter((l) => l.position === faPositionFilter);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="선수 영입" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-6`}>← 홈으로</button>

        {/* 신인 발굴 (뽑기) */}
        <div className="text-sm font-semibold mb-2">신인 발굴</div>
        <div className={`${panel} p-5 text-center mb-4`}>
          <div className="text-xs mb-1 lm-muted">보유 포인트</div>
          <div className="text-3xl font-bold flex items-center justify-center gap-2" style={{ color: '#D9AE55' }}>
            <Coins size={24} color="#D9AE55" />
            {game.club.budget.toLocaleString()} P
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs mb-2 lm-muted">뽑기 포지션 선택</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShopPositionFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${shopPositionFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체(무작위)</button>
            {POSITIONS.map((pos) => (
              <button key={pos} onClick={() => setShopPositionFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${shopPositionFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
                {POS_LABEL[pos]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <button onClick={() => setConfirmDialog({ message: `${SINGLE_PULL_COST.toLocaleString()}P를 사용해 1회 뽑기를 진행하시겠습니까?`, onConfirm: () => handlePull(1) })} disabled={game.club.budget < SINGLE_PULL_COST} className={`${panel} lm-panel-hover p-5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}>
            <div className="font-bold text-lg mb-1">1회 뽑기</div>
            <div className="text-xs lm-muted">{shopPositionFilter === 'ALL' ? '무작위 포지션' : POS_LABEL[shopPositionFilter]} 선수 1명 영입</div>
            <div className="text-sm mt-2 font-semibold" style={{ color: '#D9AE55' }}>{SINGLE_PULL_COST.toLocaleString()} P</div>
          </button>
          <button onClick={() => setConfirmDialog({ message: `${MULTI_PULL_COST.toLocaleString()}P를 사용해 ${MULTI_PULL_COUNT}회 뽑기를 진행하시겠습니까?`, onConfirm: () => handlePull(MULTI_PULL_COUNT) })} disabled={game.club.budget < MULTI_PULL_COST} className={`${panel} lm-panel-hover p-5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}>
            <div className="font-bold text-lg mb-1">{MULTI_PULL_COUNT}회 뽑기</div>
            <div className="text-xs lm-muted">{shopPositionFilter === 'ALL' ? '무작위 포지션' : POS_LABEL[shopPositionFilter]} 선수 {MULTI_PULL_COUNT}명 영입 (10% 할인)</div>
            <div className="text-sm mt-2 font-semibold" style={{ color: '#D9AE55' }}>{MULTI_PULL_COST.toLocaleString()} P</div>
          </button>
        </div>

        <div className={`${panel} p-3 mb-8`}>
          <div className="text-xs lm-muted">확률 · 아이언~챌린저 10단계 (게임 가이드에서 등급표 확인 가능)</div>
        </div>

        {/* FA 시장 */}
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold">FA 시장</div>
          <button onClick={handleRefreshMarket} className={`${btnGhost} px-3 py-1.5 text-xs flex items-center gap-1`}>
            <RotateCcw size={12} /> 시장 새로고침 ({Math.max(0, FA_REFRESH_DAILY_LIMIT - (game.club.faRefreshDate === todayString(getOnlineNow()) ? (game.club.faRefreshCount || 0) : 0))}/{FA_REFRESH_DAILY_LIMIT} 남음)
          </button>
        </div>
        {faRefreshStatus && <div className="text-xs mb-2" style={{ color: '#F87171' }}>{faRefreshStatus}</div>}
        <div className="flex flex-wrap gap-2 mb-4 mt-2">
          <button onClick={() => setFaPositionFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${faPositionFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체</button>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => setFaPositionFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${faPositionFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
              {POS_LABEL[pos]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredListings.length === 0 && <div className="col-span-full text-sm text-center py-6 lm-muted">해당 조건의 선수가 없어요.</div>}
          {filteredListings.map((l) => (
            <div key={l.id} className={`${panel} p-3 flex flex-col`}>
              <div className="flex items-center justify-between mb-2 gap-1">
                <span className="font-bold text-sm truncate">{l.name}</span>
                <span className="text-xs lm-muted shrink-0">{l.region}</span>
              </div>

              <div className="flex flex-col items-center mb-2">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-1.5"
                  style={{ background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: `2px solid ${POS_COLOR[l.position]}` }}
                >
                  {PLAYER_PORTRAITS[l.name] ? (
                    <img src={PLAYER_PORTRAITS[l.name]} alt={l.name} className="w-full h-full rounded-full" style={{ objectFit: 'cover' }} />
                  ) : (
                    <img src="/player-face-blind.png" alt="" width="30" height="30" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <PosBadge position={l.position} />
                  <TierBadge tier={l.tier} />
                </div>
              </div>

              <div className="text-center text-xs lm-muted">OVR <b className="lm-text-value">{l.overall}</b> · 잠재력 <b className="lm-text-value">{l.potential}</b></div>
              <div className="text-center text-xs mb-2 lm-muted truncate">{l.fromClub}</div>
              <div className="text-center text-sm font-semibold mb-2" style={{ color: '#D9AE55' }}>{l.price.toLocaleString()} P</div>
              <button onClick={() => { setViewingOpponentPlayer(l); setOpponentDetailReturnScreen('recruit'); setScreen('opponentPlayerDetail'); }} className={`${btnGhost} w-full py-1.5 text-xs mb-1.5`}>상세보기</button>
              <button
                onClick={() => setConfirmDialog({ message: `${l.name} 선수를 ${l.price.toLocaleString()}P에 영입하시겠습니까?`, onConfirm: () => handleBuyFA(l.id) })}
                disabled={game.club.budget < l.price}
                className={`${btnPrimary} w-full py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                구매
              </button>
            </div>
          ))}
        </div>

        {/* 뽑기 결과 모달 (새 창) */}
        {showPullModal && (
          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 50 }}>
            <div className={`${panel} p-5 max-w-lg w-full my-8`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-semibold">뽑기 결과</div>
                <button onClick={() => setShowPullModal(false)} className={`${btnGhost} px-3 py-1 text-xs`}>닫기</button>
              </div>
              <div className="text-xs mb-3 lm-muted">카드를 탭하면 선수 정보가 순서대로 공개돼요.</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pullResults.map((p, idx) => {
                  const stage = flippedCards[idx] || 0;
                  const isFlipped = stage > 0;
                  return (
                    <div key={p.id} style={{ perspective: '900px' }}>
                      <div
                        onClick={() => handleFlipCard(idx)}
                        className="relative"
                        style={{
                          width: '100%', height: 216, transformStyle: 'preserve-3d',
                          transition: 'transform 0.6s cubic-bezier(0.4,0.2,0.2,1)',
                          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          cursor: isFlipped ? 'default' : 'pointer',
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-1"
                          style={{ backfaceVisibility: 'hidden', backgroundImage: 'url("/card-back.png")', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #C89B3C' }}
                        >
                          <div className="text-xl" style={{ ...displayFont, color: '#D9AE55', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>롤매니저</div>
                          <div className="text-xs" style={{ color: '#E5E9F0', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>탭하여 공개</div>
                        </div>
                        <div
                          className="absolute inset-0 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1"
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#131A2A', border: '1px solid #232E4A' }}
                        >
                          {stage >= 1 && <div className="text-xs lm-muted">{LEAGUE_NAME[p.region] || p.region}</div>}
                          {stage >= 2 && <PosBadge position={p.position} />}
                          {stage >= 3 && (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center mt-1"
                              style={{ background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: `2px solid ${POS_COLOR[p.position]}` }}
                            >
                              {PLAYER_PORTRAITS[p.name] ? (
                                <img src={PLAYER_PORTRAITS[p.name]} alt={p.name} className="w-full h-full rounded-full" style={{ objectFit: 'cover' }} />
                              ) : (
                                <img src="/player-face-blind.png" alt="" width="22" height="22" />
                              )}
                            </div>
                          )}
                          {stage >= 3 && <div className="font-bold text-sm mt-1">{p.name}</div>}
                          {stage >= 4 && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <TierBadge tier={p.tier} />
                                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: GRADE_COLOR[p.grade], color: '#0A0E17' }}>{GRADE_LABEL[p.grade]}</span>
                              </div>
                              <div className="text-xs lm-muted">OVR {p.overall} · 잠재력 {p.potential}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMatchSelect() {
    const allClubs = REGIONS.flatMap((r) => REGION_CLUBS[r]);
    const filteredClubs = [...(scrimRegionFilter === 'ALL' ? allClubs : REGION_CLUBS[scrimRegionFilter])].sort((a, b) => a.power - b.power);
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header subtitle="상대 구단 선택 (단판 스크림)" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setScrimRegionFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${scrimRegionFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체 지역</button>
          {REGIONS.map((r) => (
            <button key={r} onClick={() => setScrimRegionFilter(r)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${scrimRegionFilter === r ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="text-xs mb-3 lm-muted">팀 파워가 낮은 구단부터 표시돼요.</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredClubs.map((opp) => (
            <div key={opp.id} className={`${panel} p-5`}>
              <div className="mb-3">
                <div className="font-bold text-lg">{opp.name}</div>
                <div className="text-xs mt-1 lm-muted">등급: {powerTierLabel(opp.power)} · 지역: {opp.region}</div>
                <div className="flex items-center gap-3 mt-1 text-xs lm-muted">
                  <span>1군 파워 <b className="lm-text-value">{opp.power}</b></span>
                  <span>2군 파워 <b className="lm-text-value">{opp.power2 || Math.round(opp.power * 0.7)}</b></span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleViewClubDetail(opp)} className={`${btnGhost} w-full py-2 text-sm`}>상세보기</button>
                {expandedChallengeId === opp.id ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleChallenge(opp, '1군')} className={`${btnPrimary} flex-1 py-2 text-sm`}>1군 도전</button>
                    <button onClick={() => handleChallenge(opp, '2군')} className={`${btnPrimary} flex-1 py-2 text-sm`}>2군 도전</button>
                    <button onClick={() => setExpandedChallengeId(null)} className={`${btnGhost} px-3 py-2 text-sm`}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => setExpandedChallengeId(opp.id)} className={`${btnPrimary} w-full py-2 text-sm flex items-center justify-center gap-1`}>
                    도전 <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderClubDetail() {
    const club = viewingClub;
    const rosters = viewingClubRosters;
    const roster = clubDetailTier === '1군' ? rosters.tier1 : rosters.tier2;
    const teamPower = roster.reduce((s, p) => s + p.overall, 0);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Header subtitle="상대 구단 상세정보" />
        <button onClick={() => setScreen('matchSelect')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 목록으로</button>

        <div className={`${panel} p-4 mb-4`}>
          <div className="font-bold text-xl">{club.name}</div>
          <div className="text-xs mt-1 lm-muted">{club.region} · 등급 {powerTierLabel(club.power)}</div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="lm-muted">국내리그 우승 <b className="lm-text-value">{club.regionalTitles || 0}</b>회</span>
            <span className="lm-muted">국제리그 우승 <b className="lm-text-value">{club.internationalTitles || 0}</b>회</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="lm-muted">1군 파워 <b className="lm-text-value">{club.power}</b></span>
            <span className="lm-muted">2군 파워 <b className="lm-text-value">{club.power2 || Math.round(club.power * 0.7)}</b></span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setClubDetailTier('1군')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${clubDetailTier === '1군' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>1군</button>
          <button onClick={() => setClubDetailTier('2군')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${clubDetailTier === '2군' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>2군</button>
        </div>

        <div className="text-xs mb-3 lm-muted">이 라인업 팀 파워 합계: <span className="lm-text-value font-semibold">{teamPower}</span></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {roster.map((p) => (
            <div key={p.id} className={`${panel} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5"><PosBadge position={p.position} /> {p.name}</span>
                <span className="text-xs lm-muted">OVR <b className="lm-text-value">{p.overall}</b></span>
              </div>
              <div className="flex justify-center mb-2">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: `2px solid ${POS_COLOR[p.position]}` }}
                >
                  {PLAYER_PORTRAITS[p.name] ? (
                    <img src={PLAYER_PORTRAITS[p.name]} alt={p.name} className="w-full h-full" style={{ objectFit: 'cover' }} />
                  ) : (
                    <img src="/player-face-blind.png" alt="" width="26" height="26" />
                  )}
                </div>
              </div>
              <div className="space-y-1 mb-2">
                <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
                <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
                <StatBar label="한타" value={p.teamfight} color="#EF4444" />
                <StatBar label="라인전" value={p.laning} color="#38BDF8" />
              </div>
              <button onClick={() => { setViewingOpponentPlayer(p); setOpponentDetailReturnScreen('clubDetail'); setScreen('opponentPlayerDetail'); }} className={`${btnGhost} w-full py-1.5 text-xs`}>상세보기</button>
            </div>
          ))}
        </div>

        <button onClick={() => handleChallenge(club, clubDetailTier)} className={`${btnPrimary} w-full py-3 text-sm`}>{clubDetailTier}으로 도전하기</button>
      </div>
    );
  }

  function renderOpponentPlayerDetail() {
    const p = viewingOpponentPlayer;
    if (!p) return null;
    const signature = p.signatureChampions || [];
    const special = p.specialChampions || [];
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="상대 선수 상세정보" />
        <button onClick={() => setScreen(opponentDetailReturnScreen)} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 뒤로</button>

        <div className={`${panel} p-4 mb-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{p.name}</span>
              <PosBadge position={p.position} />
              <TierBadge tier={p.tier} />
            </div>
          </div>
          <div className="text-xs lm-muted">OVR <b className="lm-text-value">{p.overall}</b></div>
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-2">능력치</div>
          <div className="space-y-1.5">
            <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
            <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
            <StatBar label="한타" value={p.teamfight} color="#EF4444" />
            <StatBar label="라인전" value={p.laning} color="#38BDF8" />
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <div className="text-sm font-semibold mb-1">주력 챔피언</div>
          <div className="text-xs mb-3 lm-muted">이 중 골드로 표시된 2개는 특별히 잘 다루는 챔피언이에요.</div>
          <div className="grid grid-cols-5 gap-2">
            {signature.map((champ) => {
              const isSpecial = special.includes(champ);
              return (
                <div key={champ} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                      border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                    }}
                  >
                    {CHAMPION_ICON[champ] ? (
                      <img src={CHAMPION_ICON[champ]} alt={champ} className="w-full h-full" style={{ objectFit: 'cover' }} />
                    ) : (
                      CHAMPION_WEAPON[champ] || '❔'
                    )}
                  </div>
                  <div className="text-xs text-center truncate w-full" style={isSpecial ? { color: '#D9AE55', fontWeight: 700 } : {}}>{champ}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderScouting() {
    const opp = selectedOpponent;
    if (!opp) return null;
    const minutes = Math.floor(scoutingTimeLeft / 60);
    const seconds = scoutingTimeLeft % 60;
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="전력분석" />
        <div className={`${panel} p-4 mb-4 text-center`}>
          <div className="text-xs mb-1 lm-muted">분석 가능 시간</div>
          <div className="text-3xl font-bold" style={displayFont}>{minutes}:{String(seconds).padStart(2, '0')}</div>
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-3">{opp.name} 최근 10경기</div>
          {scoutingForm.length === 0 ? (
            <div className="text-xs lm-muted text-center">전적 정보가 없어요.</div>
          ) : (
            <div className="space-y-1.5">
              {scoutingForm.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: r.win ? '#2DD4C6' : '#EF4444', color: r.win ? '#052A26' : '#3A0A0A' }}>{r.win ? '승' : '패'}</span>
                    <span className="lm-muted">vs {r.opponentName}</span>
                  </span>
                  <span className="font-mono lm-text-value">{r.scoreLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-3">출전 선수단</div>
          <div className="space-y-2">
            {(opponentLineup || []).map((p) => {
              const expanded = expandedScoutPlayer === p.id;
              return (
                <div key={p.id} className={`${panel} p-3`}>
                  <button onClick={() => setExpandedScoutPlayer(expanded ? null : p.id)} className="w-full flex items-center justify-between text-left">
                    <span className="flex items-center gap-2 text-sm font-semibold"><PosBadge position={p.position} /> {p.name}</span>
                    <span className="text-xs lm-muted">OVR <b className="lm-text-value">{p.overall}</b> {expanded ? '▲' : '▼'}</span>
                  </button>
                  {expanded && (
                    <div className="mt-3">
                      <div className="flex justify-center mb-3">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: `2px solid ${POS_COLOR[p.position]}` }}
                        >
                          {PLAYER_PORTRAITS[p.name] ? (
                            <img src={PLAYER_PORTRAITS[p.name]} alt={p.name} className="w-full h-full" style={{ objectFit: 'cover' }} />
                          ) : (
                            <img src="/player-face-blind.png" alt="" width="26" height="26" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
                        <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
                        <StatBar label="한타" value={p.teamfight} color="#EF4444" />
                        <StatBar label="라인전" value={p.laning} color="#38BDF8" />
                      </div>
                      <div className="text-xs font-semibold mb-1.5">주력 챔피언</div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(p.signatureChampions || []).map((champ) => {
                          const isSpecial = (p.specialChampions || []).includes(champ);
                          return (
                            <div key={champ} className="flex flex-col items-center gap-1">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm overflow-hidden"
                                style={{
                                  background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                                  border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                                }}
                              >
                                {CHAMPION_ICON[champ] ? (
                      <img src={CHAMPION_ICON[champ]} alt={champ} className="w-full h-full" style={{ objectFit: 'cover' }} />
                    ) : (
                      CHAMPION_WEAPON[champ] || '❔'
                    )}
                              </div>
                              <div className="text-xs text-center truncate w-full" style={isSpecial ? { color: '#D9AE55', fontWeight: 700 } : {}}>{champ}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={() => { scoutingCompletedRef.current = true; startDraftPhase(); }} className={`${btnPrimary} w-full py-3 text-sm`}>준비 완료</button>
      </div>
    );
  }

  function renderLineup() {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Header subtitle={`${game.league ? game.league.roundLabel + ' · ' : ''}${selectedOpponent.name}(${selectedOpponent.region}) 전 - 출전 명단 확정`} />
        <div className={`${panel} p-5 space-y-4`}>
          {POSITIONS.map((pos) => {
            const candidates = game.players.filter((p) => p.position === pos);
            return (
              <div key={pos}>
                <div className="flex items-center gap-2 mb-2">
                  <PosBadge position={pos} />
                  <span className="text-sm font-semibold lm-muted">{POS_LABEL[pos]} 출전 선수 선택</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidates.map((p) => {
                    const selected = lineupChoice[pos] === p.tier;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setLineupChoice((prev) => ({ ...prev, [pos]: p.tier }))}
                        className={`text-left px-3 py-2 rounded-lg transition-colors ${selected ? 'lm-lineup-selected' : 'lm-lineup-default lm-lineup-hover'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">{p.name} <TierBadge tier={p.tier} /></span>
                          {selected && <Check size={14} color="#C89B3C" />}
                        </div>
                        <div className="text-xs lm-muted">OVR {p.overall} · 잠재력 {p.potential}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setScreen('matchSelect')} className={`${btnGhost} px-4 py-3 text-sm`}>← 취소</button>
          <button onClick={confirmLineup} className={`${btnPrimary} flex-1 py-3 text-sm`}>드래프트 시작하기</button>
        </div>
      </div>
    );
  }

  function renderDraftIntro() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-xl md:text-2xl font-bold mb-6 leading-relaxed">
          곧 경기가 시작됩니다.<br />금지 캐릭터를 먼저 선택해 주세요.
        </div>
        <div className="text-7xl" style={{ ...displayFont, color: '#D9AE55' }}>{draftIntroCountdown}</div>
      </div>
    );
  }

  function renderDraft() {
    const phaseLabel = DRAFT_PHASE_LABEL[draft.phase];
    const order = draft.phase !== 'done' ? DRAFT_PHASE_ORDER[draft.phase] : [];
    const currentTeam = draft.phase !== 'done' ? order[draft.idx] : null;
    const bannedSet = new Set([...draft.userBans, ...draft.aiBans]);
    const pickedSet = new Set([...draft.userPicks, ...draft.aiPicks]);

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex justify-end mb-2">
          {!forfeitConfirm ? (
            <button onClick={() => setForfeitConfirm(true)} className="text-xs px-3 py-1.5 rounded-lg lm-btn-ghost" style={{ color: '#F87171' }}>경기 기권</button>
          ) : (
            <div className={`${panel} px-3 py-2 flex items-center gap-2`}>
              <span className="text-xs lm-muted">정말 기권하시겠습니까?</span>
              <button onClick={handleForfeitDraft} className="text-xs px-2 py-1 rounded lm-ban-tag font-semibold">기권</button>
              <button onClick={() => setForfeitConfirm(false)} className="text-xs px-2 py-1 rounded lm-btn-ghost">취소</button>
            </div>
          )}
        </div>

        <div className="text-center mb-4">
          <h2 className="text-3xl tracking-wide" style={{ ...displayFont, color: draft.phase === 'done' ? undefined : isBanPhase(draft.phase) ? '#F87171' : '#38BDF8' }}>{phaseLabel}</h2>
          {game.league && game.league.current && (
            <p className="text-xs mt-1 lm-muted">{game.league.roundLabel} · vs {game.league.current.opponent.name} · {game.league.current.gameNumber}경기 · 시리즈 {game.league.current.userWins}:{game.league.current.aiWins}</p>
          )}
          {draft.phase !== 'done' ? (
            <>
              <p className="text-sm mt-1 lm-muted">
                {currentTeam === 'user' ? '우리 팀 차례입니다' : '상대 팀이 선택 중...'}
              </p>
              {currentTeam === 'user' && (
                <div className="text-2xl font-bold mt-2" style={{ color: turnTimeLeft <= 5 ? '#EF4444' : '#D9AE55' }}>⏱ {turnTimeLeft}초</div>
              )}
            </>
          ) : (
            <p className="text-sm mt-1" style={{ color: '#2DD4C6' }}>모든 밴/픽이 완료되었습니다 · 포지션을 배치해주세요</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className={`${panel} p-3`}>
            <div className="text-xs mb-2 lm-muted">우리 팀</div>
            <div className="mb-2">
              <div className="text-xs mb-1 font-semibold" style={{ color: '#F87171' }}>밴</div>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`text-xs px-1 py-1 rounded text-center truncate ${draft.userBans[i] ? 'lm-ban-tag' : 'lm-track'}`} style={!draft.userBans[i] ? { opacity: 0.4 } : {}}>
                    {draft.userBans[i] || '-'}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1 font-semibold" style={{ color: '#38BDF8' }}>픽</div>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`text-xs px-1 py-1 rounded text-center truncate ${draft.userPicks[i] ? 'lm-pick-tag-user' : 'lm-track'}`} style={!draft.userPicks[i] ? { opacity: 0.4 } : {}}>
                    {draft.userPicks[i] || '-'}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`${panel} p-3`}>
            <div className="text-xs mb-2 lm-muted">상대 팀</div>
            <div className="mb-2">
              <div className="text-xs mb-1 font-semibold" style={{ color: '#F87171' }}>밴</div>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`text-xs px-1 py-1 rounded text-center truncate ${draft.aiBans[i] ? 'lm-ban-tag' : 'lm-track'}`} style={!draft.aiBans[i] ? { opacity: 0.4 } : {}}>
                    {draft.aiBans[i] || '-'}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1 font-semibold" style={{ color: '#38BDF8' }}>픽</div>
              <div className="grid grid-cols-5 gap-1">
                {(() => {
                  const aiAssignmentPreview = draft.phase === 'done' ? assignPicksToPositions(draft.aiPicks) : null;
                  return Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`text-xs px-1 py-1 rounded text-center truncate ${draft.aiPicks[i] ? 'lm-pick-tag-ai' : 'lm-track'}`} style={!draft.aiPicks[i] ? { opacity: 0.4 } : {}} title={draft.aiPicks[i] || ''}>
                      {draft.aiPicks[i] ? (aiAssignmentPreview ? `${POS_LABEL[POSITIONS.find((pos) => aiAssignmentPreview[pos] === draft.aiPicks[i])]} · ${draft.aiPicks[i]}` : draft.aiPicks[i]) : '-'}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {draft.phase !== 'done' ? (
          <div className={`${panel} p-4`}>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setChampFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${champFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체</button>
              {POSITIONS.map((pos) => (
                <button key={pos} onClick={() => setChampFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${champFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
                  {POS_LABEL[pos]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {ALL_CHAMPIONS_FLAT.filter((c) => champFilter === 'ALL' || c.role === champFilter).map(({ name, role }) => {
                const isBanned = bannedSet.has(name);
                const isPicked = pickedSet.has(name);
                const disabled = isBanned || isPicked || currentTeam !== 'user';
                const pickedByUser = draft.userPicks.includes(name);
                const pickedByAi = draft.aiPicks.includes(name);
                const tileClass = isBanned ? 'lm-tile-banned' : pickedByUser ? 'lm-tile-user' : pickedByAi ? 'lm-tile-ai' : 'lm-tile-default';
                return (
                  <button
                    key={name}
                    disabled={disabled}
                    onClick={() => handleChampionClick(name)}
                    className={`p-1.5 rounded-lg text-center transition-colors flex flex-col items-center gap-1.5 ${tileClass}`}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${POS_COLOR[role]}, #0A0E17)`,
                        filter: isBanned ? 'grayscale(1) opacity(0.5)' : 'none',
                        border: `1px solid ${POS_COLOR[role]}`,
                      }}
                    >
                      {CHAMPION_ICON[name] ? (
                        <img src={CHAMPION_ICON[name]} alt={name} className="w-full h-full" style={{ objectFit: 'cover' }} />
                      ) : (
                        CHAMPION_WEAPON[name] || '❔'
                      )}
                    </div>
                    <div className="text-xs">{name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`${panel} p-4`}>
            <div className="text-sm font-semibold mb-3">우리 팀 포지션 배치</div>
            <div className="space-y-2 mb-4">
              {POSITIONS.map((pos) => (
                <div key={pos} className="flex items-center gap-2">
                  <PosBadge position={pos} />
                  <select
                    value={champAssignment[pos] || ''}
                    onChange={(e) => handleAssignChamp(pos, e.target.value)}
                    className="lm-input rounded-lg px-2 py-2 text-sm flex-1"
                  >
                    {draft.userPicks.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={initSim} className={`${btnPrimary} w-full py-3 text-lg flex items-center justify-center gap-2`}>
              <Play size={18} /> 경기 시작
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderSim() {
    const s = sim;

    const userKillScore = s.userLineup.reduce((sum, p) => sum + p.kills, 0);
    const aiKillScore = s.aiLineup.reduce((sum, p) => sum + p.kills, 0);

    const headerNode = (
      <div className="mb-2">
        <div className="grid grid-cols-3 items-center">
          <div>
            <div className="text-sm font-semibold truncate" style={{ color: '#38BDF8' }}>{game.club.name}</div>
            {s.finished && (
              <div className="text-lg font-bold" style={{ ...displayFont, color: s.finalWin ? '#2DD4C6' : '#EF4444' }}>
                {s.finalWin ? 'WIN' : 'LOSE'}
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-4xl leading-none" style={displayFont}>{userKillScore} : {aiKillScore}</div>
            <div className="text-xs mt-1 lm-muted">
              {(() => {
                const gs = s.tick * 5;
                const mm = Math.floor(gs / 60);
                const ss = String(gs % 60).padStart(2, '0');
                return s.finished ? `${mm}:${ss} 경과 · 경기 종료` : `${mm}:${ss} 경과`;
              })()}
            </div>
            {game.league && game.league.current && (
              <div className="text-xs mt-0.5 lm-muted">시리즈 {game.league.current.userWins}:{game.league.current.aiWins} · {game.league.current.gameNumber}경기</div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-right truncate" style={{ color: '#EF4444' }}>{selectedOpponent.name}</div>
            {s.finished && (
              <div className="text-lg font-bold text-right" style={{ ...displayFont, color: !s.finalWin ? '#2DD4C6' : '#EF4444' }}>
                {!s.finalWin ? 'WIN' : 'LOSE'}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-stretch text-sm mt-2 px-2 py-1.5 rounded-lg" style={{ border: '1px solid #2A3550' }}>
          <div className="flex-1 flex items-center justify-end gap-1 flex-wrap">
            {s.objectives.baronAdvantage && s.objectives.baronAdvantage.side === 'user' && s.objectives.baronAdvantage.untilTick > s.tick && <img src={BARON_ICON} alt="바론 버프" title="바론 버프" width="16" height="16" />}
            {s.objectives.user.dragons.map((d, i) => <img key={'ud' + i} src={DRAGON_ICON[d] || DRAGON_ICON.화염} alt={d} title={d} width="16" height="16" />)}
            <span className="inline-flex items-center gap-0.5">{LANES.reduce((sum, l) => sum + s.objectives.user.laneTowers[l], 0) + s.objectives.user.nexusTowers}<img src={TOWER_ICON_BLUE} alt="타워" width="16" height="16" /></span>
          </div>
          <span className="w-px mx-2 shrink-0" style={{ background: '#2A3550' }} />
          <div className="flex-1 flex items-center justify-start gap-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5"><img src={TOWER_ICON_RED} alt="타워" width="16" height="16" />{LANES.reduce((sum, l) => sum + s.objectives.ai.laneTowers[l], 0) + s.objectives.ai.nexusTowers}</span>
            {s.objectives.ai.dragons.map((d, i) => <img key={'ad' + i} src={DRAGON_ICON[d] || DRAGON_ICON.화염} alt={d} title={d} width="16" height="16" />)}
            {s.objectives.baronAdvantage && s.objectives.baronAdvantage.side === 'ai' && s.objectives.baronAdvantage.untilTick > s.tick && <img src={BARON_ICON} alt="바론 버프" title="바론 버프" width="16" height="16" />}
          </div>
        </div>
        {s.elderBuff && (
          <div className="text-center text-xs font-bold mt-1" style={{ color: '#C084FC' }}>
            👑 장로버프 - {s.elderBuff.side === 'user' ? '우리 팀' : '상대 팀'}
          </div>
        )}
      </div>
    );

    const teamPanelsNode = (
      <div className={`${panel} p-3`}>
        {s.userLineup.map((p, i) => {
          const ai = s.aiLineup[i];
          return (
            <div key={p.id} className="flex items-center justify-between text-xs py-1.5 gap-1.5" style={{ borderBottom: i < s.userLineup.length - 1 ? '1px solid #1D2740' : 'none' }}>
              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="truncate">{p.name} <span className="lm-dim">({p.champion})</span></span>
              </span>
              <span className="font-mono lm-text-value shrink-0">{p.kills}/{p.deaths}/{p.assists}</span>
              <span className="lm-dim shrink-0">vs</span>
              <span className="font-mono lm-text-value shrink-0">{ai.kills}/{ai.deaths}/{ai.assists}</span>
              <span className="flex items-center gap-1.5 min-w-0 flex-1 justify-end text-right">
                <span className="truncate">({ai.champion}) {ai.name}</span>
              </span>
            </div>
          );
        })}
      </div>
    );

    const finishButtonNode = s.finished ? (
      s.isTest ? (
        <button onClick={() => setScreen('home')} className={`${btnPrimary} w-full py-3 text-sm`}>홈으로 돌아가기</button>
      ) : (
        <button onClick={finalizeMatch} className={`${btnPrimary} w-full py-3 text-sm`}>결과 확인하기</button>
      )
    ) : null;

    const logNode = (
      <div className="space-y-1">
        {s.log.map((l) => <div key={l.id} className="text-xs lm-muted">{l.text}</div>)}
      </div>
    );

    const mapInner = (
      <>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(56,189,248,0.22) 50%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ clipPath: 'polygon(0% 55%, 0% 100%, 45% 100%)', background: 'rgba(59,130,246,0.12)' }} />
        <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 45%, 100% 0%, 55% 0%)', background: 'rgba(239,68,68,0.12)' }} />
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <image href="/map-background.png" x="0" y="0" width="100" height="100" />
          {BLUE_TOWERS.map((pt, i) => !isTowerDestroyed(s.objectives.ai, i) && (
            <circle key={'bt' + i} cx={pt.x} cy={pt.y} r="1.4" fill="#3B82F6" fillOpacity="0.85" stroke="#BFDBFE" strokeWidth="0.5" />
          ))}
          {RED_TOWERS.map((pt, i) => !isTowerDestroyed(s.objectives.user, i) && (
            <circle key={'rt' + i} cx={pt.x} cy={pt.y} r="1.4" fill="#EF4444" fillOpacity="0.85" stroke="#FECACA" strokeWidth="0.5" />
          ))}
          <polygon
            points="14,88.5 16.5,91 14,93.5 11.5,91"
            fill={s.objectives.nexusDestroyed === 'user' ? '#3A4152' : '#93C5FD'}
            fillOpacity={s.objectives.nexusDestroyed === 'user' ? 0.6 : 0.95}
            stroke={s.objectives.nexusDestroyed === 'user' ? '#5B6478' : '#EFF6FF'}
            strokeWidth="0.4"
            className={s.objectives.nexusDestroyed === 'user' ? '' : 'animate-pulse'}
          />
          <polygon
            points="88,9.5 90.5,12 88,14.5 85.5,12"
            fill={s.objectives.nexusDestroyed === 'ai' ? '#3A4152' : '#FCA5A5'}
            fillOpacity={s.objectives.nexusDestroyed === 'ai' ? 0.6 : 0.95}
            stroke={s.objectives.nexusDestroyed === 'ai' ? '#5B6478' : '#FEF2F2'}
            strokeWidth="0.4"
            className={s.objectives.nexusDestroyed === 'ai' ? '' : 'animate-pulse'}
          />
          {s.tick >= s.objectives.nextBaronTick && (s.objectives.user.barons + s.objectives.ai.barons) < 2 && (
            <image href={BARON_ICON} x={ZONES.baronPit.x * 100 - 2.4} y={ZONES.baronPit.y * 100 - 2.4} width="4.8" height="4.8" className="animate-pulse" />
          )}
          {s.tick >= s.objectives.nextDragonTick && (() => {
            const isElderNext = Math.max(s.objectives.user.dragons.length, s.objectives.ai.dragons.length) >= 4;
            const dragonSrc = DRAGON_ICON[isElderNext ? '장로' : s.objectives.nextDragonType] || DRAGON_ICON.화염;
            return (
              <image href={dragonSrc} x={ZONES.dragonPit.x * 100 - 2.4} y={ZONES.dragonPit.y * 100 - 2.4} width="4.8" height="4.8" className="animate-pulse" />
            );
          })()}
        </svg>
        {JUNGLE_CAMPS.map((camp, bi) => (
          <div key={bi} className="absolute rounded-full" style={{ left: `${camp.x}%`, top: `${camp.y}%`, width: `${camp.size}%`, height: `${camp.size}%`, background: 'radial-gradient(circle, rgba(52,180,100,0.7), rgba(52,180,100,0.15) 65%, transparent 85%)', border: '1px solid rgba(74,222,128,0.35)' }} />
        ))}
        <div className="absolute rounded-full" style={{ left: '16%', top: '58%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '76%', top: '38%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        {s.tick >= s.objectives.nextBaronTick && (s.objectives.user.barons + s.objectives.ai.barons) < 2 && (
          <div className="absolute rounded-full" style={{ left: `${(ZONES.baronPit.x - 0.07) * 100}%`, top: `${(ZONES.baronPit.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(192,132,252,0.5), transparent 75%)' }} />
        )}
        {s.tick >= s.objectives.nextDragonTick && (
          <div className="absolute rounded-full" style={{ left: `${(ZONES.dragonPit.x - 0.07) * 100}%`, top: `${(ZONES.dragonPit.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(251,146,60,0.5), transparent 75%)' }} />
        )}
        <div className="absolute rounded-full" style={{ left: '1%', top: '85%', width: '18%', height: '18%', background: 'radial-gradient(circle, rgba(56,189,248,0.7), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '81%', top: '-3%', width: '18%', height: '18%', background: 'radial-gradient(circle, rgba(239,68,68,0.7), transparent 75%)' }} />
        {s.userLineup.map((p, i) => {
          const pos = s.positions['user-' + i];
          if (!pos) return null;
          const active = s.eventParticipants.includes('user-' + i);
          return (
            <div key={p.id} title={p.name} className="absolute rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out overflow-hidden"
              style={{
                left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)',
                width: 16, height: 16, background: '#3B82F6', color: '#0A0E17', zIndex: active ? 10 : 1,
                border: '1px solid #3B82F6',
                boxShadow: active ? '0 0 0 3px #FDE68A' : 'none',
              }}>
              {CHAMPION_ICON[p.champion] ? (
                <img src={CHAMPION_ICON[p.champion]} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
              ) : (
                CHAMPION_WEAPON[p.champion] || POS_LABEL[p.position][0]
              )}
            </div>
          );
        })}
        {s.aiLineup.map((p, i) => {
          const pos = s.positions['ai-' + i];
          if (!pos) return null;
          const active = s.eventParticipants.includes('ai-' + i);
          return (
            <div key={p.id} title={p.name} className="absolute rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out overflow-hidden"
              style={{
                left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%,-50%)',
                width: 16, height: 16, background: '#EF4444', color: '#0A0E17', zIndex: active ? 10 : 1,
                border: '1px solid #EF4444',
                boxShadow: active ? '0 0 0 3px #FDE68A' : 'none',
              }}>
              {CHAMPION_ICON[p.champion] ? (
                <img src={CHAMPION_ICON[p.champion]} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
              ) : (
                CHAMPION_WEAPON[p.champion] || POS_LABEL[p.position][0]
              )}
            </div>
          );
        })}
      </>
    );

    const mapBoxStyle = { background: 'linear-gradient(135deg, #0E2A1E 0%, #142A3A 50%, #2A1E14 100%)', border: '1px solid #232E4A' };

    if (isLandscape) {
      return (
        <div className="w-full h-screen overflow-y-auto p-3">
          {headerNode}
          <div className="flex gap-3 mb-3">
            <div className="w-44 shrink-0">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden" style={mapBoxStyle}>
                {mapInner}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {logNode}
            </div>
          </div>
          <div className="mb-3">{teamPanelsNode}</div>
          {finishButtonNode}
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {headerNode}
        <div className="w-full sm:max-w-md mx-auto">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden" style={mapBoxStyle}>
            {mapInner}
          </div>
        </div>
        <div className="w-full sm:max-w-md mx-auto mt-4">{teamPanelsNode}</div>
        {finishButtonNode && (
          <div className="w-full sm:max-w-md mx-auto mt-4">{finishButtonNode}</div>
        )}
        <div className="mt-4">{logNode}</div>
      </div>
    );
  }

  function renderResult() {
    const r = lastResult;
    const delta = r.newClubValue - r.oldClubValue;
    const mvp = [...r.details].sort((a, b) => (b.kills + b.assists - b.deaths) - (a.kills + a.assists - a.deaths))[0];
    const userKillScore = r.details.reduce((s, d) => s + d.kills, 0);
    const aiKillScore = r.aiDetails.reduce((s, d) => s + d.kills, 0);
    const globalMaxDamage = Math.max(...r.details.map((d) => d.damage), ...r.aiDetails.map((d) => d.damage), 1);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          {r.isTest && (
            <div className="inline-block text-xs font-bold px-2.5 py-1 rounded mb-2" style={{ background: '#3A3220', color: '#D9AE55' }}>테스트 경기 (전적·성장 미반영)</div>
          )}
          <div className="grid grid-cols-3 items-center mb-2">
            <div className="text-left">
              <div className="font-bold truncate">{game.club.name}</div>
              <div className="text-sm font-bold" style={{ color: r.win ? '#2DD4C6' : '#EF4444' }}>{r.win ? 'WIN' : 'LOSE'}</div>
            </div>
            <div>
              <div className="text-4xl tracking-wide" style={displayFont}>{userKillScore} : {aiKillScore}</div>
              <div className="text-xs mt-1 lm-muted">플레이 타임 {r.playTime}분</div>
            </div>
            <div className="text-right">
              <div className="font-bold truncate">{r.opponentName}</div>
              <div className="text-sm font-bold" style={{ color: !r.win ? '#2DD4C6' : '#EF4444' }}>{!r.win ? 'WIN' : 'LOSE'}</div>
            </div>
          </div>
          {!r.isTest && (
            <div className="text-sm mt-2" style={{ color: delta >= 0 ? '#2DD4C6' : '#EF4444' }}>구단 가치 {delta >= 0 ? '+' : ''}{delta.toLocaleString()} P</div>
          )}
        </div>

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-3">선수별 딜량 비교</div>
          <div className="space-y-3">
            {r.details.map((d, i) => {
              const ai = r.aiDetails[i];
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between text-xs mb-1 gap-2">
                    <span className="flex items-center gap-1 min-w-0 flex-1" style={{ color: '#38BDF8' }}>
                      <span className="truncate">{d.name} <span className="lm-dim">({d.champion})</span></span>
                    </span>
                    <span className="font-mono lm-text-value shrink-0">{d.damage.toLocaleString()}</span>
                    <span className="font-mono lm-text-value shrink-0">{ai.damage.toLocaleString()}</span>
                    <span className="flex items-center gap-1 min-w-0 flex-1 justify-end text-right" style={{ color: '#EF4444' }}>
                      <span className="truncate">({ai.champion}) {ai.name}</span>
                    </span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="flex-1 rounded-full overflow-hidden lm-track">
                      <div className="h-full rounded-full" style={{ width: `${(d.damage / globalMaxDamage) * 100}%`, backgroundColor: '#3B82F6' }} />
                    </div>
                    <div className="flex-1 rounded-full overflow-hidden lm-track flex justify-end">
                      <div className="h-full rounded-full" style={{ width: `${(ai.damage / globalMaxDamage) * 100}%`, backgroundColor: '#EF4444' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${panel} p-4`}>
          <div className="text-sm font-semibold mb-3">선수별 결과</div>
          <div className="space-y-2">
            {r.details.map((d, i) => (
              <div key={d.id} className="flex items-center justify-between text-sm pb-2" style={{ borderBottom: i < r.details.length - 1 ? '1px solid #1D2740' : 'none' }}>
                <div className="flex items-center gap-2">
                  <PosBadge position={d.position} />
                  <span className="font-semibold">{d.name}</span>
                  {mvp && mvp.id === d.id && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#C89B3C', color: '#1A1305' }}>MVP</span>}
                  {d.leveledUp && <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#2DD4C6', color: '#052A26' }}>LV UP → {d.newLevel}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono lm-muted">{d.kills}/{d.deaths}/{d.assists}</span>
                  <span style={{ color: '#2DD4C6' }}>+{d.expGained} EXP</span>
                  <span style={{ color: '#D9AE55' }}>{d.valueAfter.toLocaleString()} P</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setScreen('home')} className={`${btnPrimary} w-full py-3 mt-6 text-sm`}>홈으로 돌아가기</button>
      </div>
    );
  }

  function renderGameWait() {
    const r = lastResult;
    const cur = game.league && game.league.current;
    const pool = game.league && game.league.entryPool;
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="text-2xl font-bold mb-1" style={{ color: r.win ? '#2DD4C6' : '#EF4444' }}>{r.win ? '이번 게임 승리' : '이번 게임 패배'}</div>
        <div className="text-sm mb-4 lm-muted">현재 시리즈 스코어 {r.seriesTally.user} : {r.seriesTally.ai} (2선승제)</div>
        <div className="text-6xl mb-2" style={displayFont}>{waitCountdown}</div>
        <div className="text-xs mb-6 lm-muted">초 후 다음 게임 드래프트가 자동으로 시작됩니다</div>

        {cur && pool && (
          <div className={`${panel} p-4 text-left`}>
            <div className="text-sm font-semibold mb-3 text-center">출전 선수 교체</div>
            <div className="space-y-3">
              {POSITIONS.map((pos) => {
                const posPool = pool[pos] || [];
                if (posPool.length < 2) return null;
                return (
                  <div key={pos} className="flex items-center gap-2">
                    <PosBadge position={pos} />
                    <div className="flex gap-2 flex-1">
                      {posPool.map((pid) => {
                        const pl = game.players.find((x) => x.id === pid);
                        if (!pl) return null;
                        const active = cur.activeStarters[pos] === pid;
                        return (
                          <button
                            key={pid}
                            onClick={() => handleSwapStarter(pos, pid)}
                            className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-semibold transition-colors ${active ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}
                          >
                            {pl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={handleWaitComplete} className={`${btnPrimary} w-full py-3 mt-6 text-sm`}>준비완료 (바로 시작)</button>
      </div>
    );
  }

  function renderLeagueRosterSetup() {
    const canConfirm = POSITIONS.every((pos) => (entryPoolDraft[pos] || []).length > 0);
    const leagueTier = (game.league && game.league.tier) || '1군';
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <button onClick={handleCancelLeagueSetup} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 취소</button>
        <Header subtitle={`${game.league ? game.league.roundLabel : ''} · ${leagueTier} 로스터 등록`} />
        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-1">포지션별 엔트리 최대 2명 선택</div>
          <div className="text-xs lm-muted">여기서 정한 로스터는 이번 리그 전체에 적용돼요. 경기마다 등록된 2명 중 출전 선수를 골라 번갈아 기용할 수 있어요. ({leagueTier} 참가이므로 기본적으로 {leagueTier} 선수가 후보로 표시돼요.)</div>
        </div>
        <div className="space-y-5">
          {POSITIONS.map((pos) => {
            const tierMatched = game.players.filter((p) => p.position === pos && p.tier === leagueTier);
            const otherActiveTier = leagueTier === '1군' ? '2군' : '1군';
            const candidates = tierMatched.length > 0 ? tierMatched : game.players.filter((p) => p.position === pos && p.tier === otherActiveTier);
            const pool = entryPoolDraft[pos] || [];
            return (
              <div key={pos}>
                <div className="flex items-center gap-2 mb-2">
                  <PosBadge position={pos} />
                  <span className="text-sm font-semibold lm-muted">{POS_LABEL[pos]} 엔트리 ({pool.length}/2)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidates.map((p) => {
                    const inPool = pool.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleEntryCandidate(pos, p.id)}
                        className={`text-left px-3 py-2 rounded-lg transition-colors ${inPool ? 'lm-lineup-selected' : 'lm-lineup-default lm-lineup-hover'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">{p.name} <TierBadge tier={p.tier} /></span>
                          {inPool && <Check size={14} color="#C89B3C" />}
                        </div>
                        <div className="text-xs lm-muted">OVR {p.overall} · 잠재력 {p.potential}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={handleConfirmLeagueRoster} disabled={!canConfirm} className={`${btnPrimary} w-full py-3 text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed`}>로스터 확정하고 대진표 보기</button>
      </div>
    );
  }

  function renderLeagueSchedule() {
    const league = game.league;
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <button onClick={handleCancelLeagueSetup} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 취소</button>
        <Header subtitle={`${league.roundLabel} · 대진표`} />
        {league.type === 'regional' ? (
          <div className={`${panel} p-4`}>
            <div className="text-sm font-semibold mb-3">라운드로빈 일정 (총 {league.queue.length}경기, 재대결 없음)</div>
            <div className="space-y-2">
              {league.queue.map((opp, i) => (
                <div key={opp.id} className="flex items-center justify-between text-sm" style={{ borderBottom: i < league.queue.length - 1 ? '1px solid #1D2740' : 'none', paddingBottom: 6 }}>
                  <span className="lm-muted">{i + 1}경기</span>
                  <span className="font-semibold">{opp.name}</span>
                  <span className="text-xs lm-muted">{opp.region} · 파워 {opp.power}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${panel} p-4`}>
            <div className="text-sm font-semibold mb-3">토너먼트 대진 (3판2선)</div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="lm-muted">8강</span>
                <span className="font-semibold">vs {league.queue[0] && league.queue[0].name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="lm-muted">4강</span>
                <span className="lm-dim">승리 시 상대 확정</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="lm-muted">결승</span>
                <span className="lm-dim">승리 시 상대 확정</span>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleBeginLeagueMatches} className={`${btnPrimary} w-full py-3 text-sm mt-6`}>경기 시작하기</button>
      </div>
    );
  }

  function renderSeriesResult() {
    const r = lastResult;
    const league = game.league;
    let regionalComplete = false, regionalStandings = null, regionalRank = null;
    let intlNextOpponent = null, intlChampion = false, intlEliminated = false, intlAdvancing = false;

    if (league && league.type === 'regional') {
      if (league.queue.length === 0) {
        regionalComplete = true;
        const userWinsCount = league.results.filter((x) => x.won).length;
        const aiEntries = REGION_CLUBS[league.region].map((c) => ({ name: c.name, score: c.power, isUser: false }));
        const userScore = userWinsCount * 40;
        const all = [...aiEntries, { name: game.club.name, score: userScore, isUser: true }].sort((a, b) => b.score - a.score);
        regionalStandings = all;
        regionalRank = all.findIndex((e) => e.isUser) + 1;
      }
    } else if (league && league.type === 'international') {
      if (!r.seriesWon) {
        intlEliminated = true;
      } else if (league.roundIndex >= 2) {
        intlChampion = true;
      } else {
        intlAdvancing = true;
        if (league.roundIndex >= 0) intlNextOpponent = league.roundIndex === 0 ? league.shadow.semiOpponent : league.shadow.finalOpponent;
      }
    }
    const isLeagueOver = regionalComplete || intlChampion || intlEliminated;

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          <div className="text-4xl tracking-wide" style={{ ...displayFont, color: r.seriesWon ? '#2DD4C6' : '#EF4444' }}>{r.seriesWon ? '시리즈 승리' : '시리즈 패배'}</div>
          <div className="text-lg mt-1">{r.seriesTally.user} : {r.seriesTally.ai} vs {r.opponentName}</div>
        </div>

        {intlChampion && (
          <div className={`${panel} p-6 text-center mb-4`}>
            <div className="text-2xl font-bold mb-1" style={{ color: '#C89B3C' }}>국제 리그 우승!</div>
            <div className="text-sm lm-muted">모든 라운드를 제패했습니다.</div>
          </div>
        )}
        {intlEliminated && (
          <div className={`${panel} p-6 text-center mb-4`}>
            <div className="text-lg font-bold">{league.roundLabel}에서 탈락했습니다</div>
          </div>
        )}
        {intlNextOpponent && (
          <div className={`${panel} p-4 mb-4`}>
            <div className="text-sm mb-1 lm-muted">다음 라운드 상대</div>
            <div className="font-bold">{intlNextOpponent.name} ({intlNextOpponent.region})</div>
          </div>
        )}
        {intlAdvancing && !intlNextOpponent && (
          <div className={`${panel} p-4 mb-4`}>
            <div className="text-sm font-bold" style={{ color: '#2DD4C6' }}>플레이인을 통과했습니다! 8강 대진은 계속하기를 누르면 정해져요.</div>
          </div>
        )}
        {regionalComplete && (
          <div className={`${panel} p-4 mb-4`}>
            <div className="text-sm font-semibold mb-2">지역 리그 최종 순위: {regionalRank}위 / {regionalStandings.length}팀</div>
            <div className="space-y-1 mb-3">
              {regionalStandings.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs" style={s.isUser ? { color: '#D9AE55' } : undefined}>
                  <span className={s.isUser ? 'font-bold' : 'lm-muted'}>{i + 1}위 · {s.name}{s.isUser ? ' (우리 구단)' : ''}</span>
                </div>
              ))}
            </div>
            {regionalRank <= 2 ? (
              <div className="text-xs" style={{ color: '#2DD4C6' }}>국제 리그 진출 자격을 획득했습니다!</div>
            ) : (
              <div className="text-xs lm-muted">국제 리그 진출에는 상위 2위 안에 들어야 해요.</div>
            )}
          </div>
        )}

        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-3">마지막 게임 선수별 결과</div>
          <div className="space-y-2">
            {r.details.map((d, i) => (
              <div key={d.id} className="flex items-center justify-between text-xs" style={{ borderBottom: i < r.details.length - 1 ? '1px solid #1D2740' : 'none', paddingBottom: 6 }}>
                <span className="flex items-center gap-2"><PosBadge position={d.position} />{d.name}</span>
                <span className="lm-muted">{d.kills}/{d.deaths}/{d.assists} · +{d.expGained} EXP</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={isLeagueOver ? handleFinishLeague : () => setScreen('home')} className={`${btnGhost} flex-1 py-3 text-sm`}>메인 화면으로</button>
          {!isLeagueOver && league && league.type === 'regional' && (
            <button onClick={handleContinueLeague} className={`${btnPrimary} flex-1 py-3 text-sm`}>다음 경기 이어하기</button>
          )}
          {intlAdvancing && (
            <button onClick={handleContinueLeague} className={`${btnPrimary} flex-1 py-3 text-sm`}>다음 라운드 이어하기</button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${shell} flex items-center justify-center`} style={fontStyle}>
        <style>{`
          .lm-root { background:#0A0E17; color:#E7ECFA; }
        `}</style>
        <div className="lm-muted">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={shell} style={fontStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@500;600;700&family=Rajdhani:wght@500;600;700&display=swap');
        .lm-root { background:#0A0E17; color:#E7ECFA; }
        .lm-panel { background:#131A2A; border:1px solid #232E4A; }
        .lm-panel-hover:hover { border-color:#C89B3C; }
        .lm-btn-primary { background:#C89B3C; color:#1A1305; }
        .lm-btn-primary:hover:not(:disabled) { background:#DBAE4D; }
        .lm-btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
        .lm-btn-ghost { background:#1D2740; color:#C9D2EC; }
        .lm-btn-ghost:hover { background:#26325A; }
        .lm-muted { color:#9AA6C7; }
        .lm-dim { color:#6B7699; }
        .lm-hover-muted:hover { color:#9AA6C7; }
        .lm-text-value { color:#C9D2EC; }
        .lm-track { background:#1D2740; }
        .lm-input { background:#0A0E17; border:1px solid #2A3550; color:#E7ECFA; }
        .lm-input:focus { border-color:#C89B3C; outline:none; }
        .lm-tier-1 { background:#C89B3C; color:#1A1305; }
        .lm-tier-2 { background:#2A3550; color:#9FB0D9; }
        .lm-tier-reserve { background:#1A2033; color:#5C6786; }
        .lm-lineup-selected { border:1px solid #C89B3C; background:#1D2740; }
        .lm-lineup-default { border:1px solid #232E4A; background:#0A0E17; }
        .lm-lineup-hover:hover { border-color:#3A4670; }
        .lm-ban-tag { background:#3A1F1F; color:#F87171; text-decoration:line-through; }
        .lm-pick-tag-user { background:#1F2E3A; color:#38BDF8; }
        .lm-pick-tag-ai { background:#3A1F2E; color:#EF4444; }
        .lm-tile-banned { background:#1A1015; color:#5C3A3A; text-decoration:line-through; border:1px solid #3A1F1F; }
        .lm-tile-user { background:#122236; color:#38BDF8; border:1px solid #38BDF8; }
        .lm-tile-ai { background:#2B1518; color:#EF4444; border:1px solid #EF4444; }
        .lm-tile-default { background:#0A0E17; color:#E7ECFA; border:1px solid #232E4A; }
        .lm-tile-default:hover:not(:disabled) { border-color:#C89B3C; }
        .lm-tile-default:disabled { opacity:0.5; cursor:not-allowed; }
        .lm-filter-tab { background:#1D2740; color:#C9D2EC; }
        .lm-filter-tab:hover { background:#26325A; }
        .lm-filter-tab-active { background:#C89B3C; color:#1A1305; }
      `}</style>
      {screen === 'create' && renderCreate()}
      {screen === 'home' && game && renderHome()}
      {screen === 'roster' && game && renderRoster()}
      {screen === 'rosterManage' && game && renderRosterManage()}
      {screen === 'playerDetail' && game && renderPlayerDetail()}
      {screen === 'matchHistory' && game && renderMatchHistory()}
      {screen === 'rankings' && game && renderRankings()}
      {screen === 'onlineMatch' && game && renderOnlineMatch()}
      {screen === 'sponsors' && game && renderSponsors()}
      {screen === 'guide' && game && renderGuide()}
      {screen === 'championList' && game && renderChampionList()}
      {screen === 'gradeTable' && game && renderGradeTable()}
      {screen === 'recruit' && game && renderRecruit()}
      {screen === 'matchSelect' && game && renderMatchSelect()}
      {screen === 'clubDetail' && game && viewingClub && viewingClubRosters && renderClubDetail()}
      {screen === 'opponentPlayerDetail' && game && viewingOpponentPlayer && renderOpponentPlayerDetail()}
      {screen === 'lineup' && game && selectedOpponent && renderLineup()}
      {screen === 'leagueRosterSetup' && game && game.league && renderLeagueRosterSetup()}
      {screen === 'leagueSchedule' && game && game.league && renderLeagueSchedule()}
      {screen === 'scouting' && game && selectedOpponent && renderScouting()}
      {screen === 'draftIntro' && draft && renderDraftIntro()}
      {screen === 'draft' && draft && renderDraft()}
      {screen === 'sim' && sim && renderSim()}
      {screen === 'result' && lastResult && renderResult()}
      {screen === 'gameWait' && lastResult && renderGameWait()}
      {screen === 'seriesResult' && lastResult && game.league && renderSeriesResult()}
      <ConfirmModal />
    </div>
  );
}
