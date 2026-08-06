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
  TOP: ['가렌', '다리우스', '카밀', '레넥톤', '오른', '피오라', '나서스', '잭스', '세트', '아트록스', '쉔', '말파이트', '우디르', '볼리베어', '케넨', '신지드', '초가스', '트린다미어', '이렐리아', '럼블', '그웬', '크산테', '사이온', '퀸', '뽀삐'],
  JGL: ['리 신', '비에고', '자르반 4세', '다이애나', '세주아니', '그레이브즈', '니달리', '킨드레드', '헤카림', '릴리아', '엘리스', '카직스', '렝가', '노커', '워윅', '아무무', '자크', '벨베스', '판테온', '문도 박사', '마스터 이', '오공', '나피리', '이블린', '신짜오'],
  MID: ['아리', '제드', '야스오', '오리아나', '신드라', '르블랑', '아칼리', '빅토르', '탈리야', '카시오페아', '트위스티드 페이트', '라이즈', '벡스', '조이', '카타리나', '베이가', '직스', '코르키', '피즈', '갈리오', '아지르', '럭스', '아우렐리온 솔', '카사딘', '하이머딩거'],
  ADC: ['징크스', '케이틀린', '이즈리얼', '카이사', '베인', '진', '애쉬', '루시안', '시비르', '자야', '트리스타나', '바루스', '미스 포츈', '드레이븐', '칼리스타', '아펠리오스', '사미라', '자히리', '세나', '니코', '코그모', '트위치', '제리', '스몰더', '우르곳'],
  SUP: ['쓰레쉬', '룰루', '레오나', '노틸러스', '유미', '알리스타', '브라움', '나미', '라칸', '카르마', '파이크', '세라핀', '소나', '벨코즈', '밀리오', '렐', '자이라', '모르가나', '바드', '스웨인', '잔나', '탐 켄치', '블리츠크랭크', '레나타 글라스크', '소라카'],
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
const APP_VERSION = 'v.0.028';
const APP_LOGO_DATA_URI = 'data:image/webp;base64,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';
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
  const club = { name, region, value: clubValue, budget: 3500, wins: 0, losses: 0 };
  return { club, players, matchHistory: [] };
}

const SPECIAL_PLAYERS = [
  { name: 'mFAKER', position: 'MID', region: '한국', mechanics: 88, gameSense: 91, teamfight: 87, laning: 90, potential: 99 },
  { name: 'mKeria', position: 'SUP', region: '한국', mechanics: 85, gameSense: 92, teamfight: 89, laning: 84, potential: 97 },
  { name: 'mDoran', position: 'TOP', region: '한국', mechanics: 84, gameSense: 82, teamfight: 86, laning: 88, potential: 93 },
  { name: 'mOner', position: 'JGL', region: '한국', mechanics: 87, gameSense: 88, teamfight: 90, laning: 80, potential: 95 },
  { name: 'mPeyz', position: 'ADC', region: '한국', mechanics: 89, gameSense: 83, teamfight: 85, laning: 87, potential: 96 },
];

const PLAYER_PORTRAITS = {
  'mDoran': '/portrait-mdoran.png',
  'mOner': '/portrait-moner.png',
  'mFAKER': '/portrait-mfaker.png',
  'mPeyz': '/portrait-mpeyz.png',
  'mKeria': '/portrait-mkeria.png',
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
  '엘리스': '🕷️', '카직스': '🦂', '렝가': '🐆', '노커': '👹', '워윅': '🐺',
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
  const off = side === 'user' ? -0.04 : 0.04;
  switch (position) {
    case 'TOP': return { x: 0.26 + off, y: 0.14 + off };
    case 'MID': return { x: 0.5 + off, y: 0.5 + off };
    case 'ADC': return { x: 0.74 + off, y: 0.84 + off };
    case 'SUP': return { x: 0.68 + off, y: 0.8 + off };
    case 'JGL': return side === 'user' ? { x: 0.36, y: 0.62 } : { x: 0.64, y: 0.38 };
    default: return { x: 0.5, y: 0.5 };
  }
}

const BASE = { user: { x: 0.10, y: 0.94 }, ai: { x: 0.90, y: 0.06 } };
// 외곽(먼저 파괴)에서 본진 쪽(나중에 파괴) 순서로 정렬된 팀별 타워 좌표
// 라인별 1차~3차 타워(9개) + 넥서스를 지키는 쌍둥이 타워(2개) = 총 11개
const BLUE_TOWERS = [
  { x: 11, y: 32 }, { x: 56, y: 56 }, { x: 30, y: 90 },
  { x: 10, y: 50 }, { x: 38, y: 70 }, { x: 50, y: 90 },
  { x: 10, y: 70 }, { x: 22, y: 80 }, { x: 70, y: 90 },
  { x: 16, y: 85 }, { x: 10, y: 78 },
];
const RED_TOWERS = [
  { x: 35, y: 9 }, { x: 44, y: 44 }, { x: 92, y: 68 },
  { x: 58, y: 8 }, { x: 62, y: 30 }, { x: 92, y: 45 },
  { x: 80, y: 8 }, { x: 78, y: 20 }, { x: 92, y: 25 },
  { x: 84, y: 15 }, { x: 90, y: 22 },
];
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
  baronPit: { x: 0.21, y: 0.23 },
  dragonPit: { x: 0.79, y: 0.77 },
};
// 경기 흐름(초반/중반/후반)에 따라 교전이 벌어질 확률이 높은 구역이 달라진다 (상대 넥서스 안쪽은 제외, 최종 결전에서만 사용)
function pickZone(tickRatio) {
  let pool;
  if (tickRatio < 0.35) pool = ['topLane', 'topLane', 'midLane', 'botLane', 'botLane', 'topJungle', 'botJungle'];
  else if (tickRatio < 0.75) pool = ['midLane', 'topRiver', 'botRiver', 'topJungle', 'botJungle', 'topLane', 'botLane', 'nearBlueBase', 'nearRedBase'];
  else pool = ['topRiver', 'botRiver', 'midLane', 'topJungle', 'botJungle', 'nearBlueBase', 'nearRedBase', 'nearBlueBase', 'nearRedBase'];
  return ZONES[pool[randRange(0, pool.length - 1)]];
}

function computePositions(userLineup, aiLineup, eventParticipants, clashPoint) {
  const homes = {};
  userLineup.forEach((p, i) => { homes['user-' + i] = homeFor(p.position, 'user'); });
  aiLineup.forEach((p, i) => { homes['ai-' + i] = homeFor(p.position, 'ai'); });
  const pos = {};
  Object.keys(homes).forEach((key) => {
    if (clashPoint && eventParticipants.includes(key)) {
      pos[key] = { x: clamp(clashPoint.x + randRange(-4, 4) / 100, 0.04, 0.96), y: clamp(clashPoint.y + randRange(-4, 4) / 100, 0.04, 0.96) };
    } else {
      const h = homes[key];
      pos[key] = { x: clamp(h.x + randRange(-5, 5) / 100, 0.04, 0.96), y: clamp(h.y + randRange(-5, 5) / 100, 0.04, 0.96) };
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
    user: { towers: prev.objectives.user.towers, barons: prev.objectives.user.barons, dragons: [...prev.objectives.user.dragons] },
    ai: { towers: prev.objectives.ai.towers, barons: prev.objectives.ai.barons, dragons: [...prev.objectives.ai.dragons] },
    nextDragonTick: prev.objectives.nextDragonTick != null ? prev.objectives.nextDragonTick : 5,
    nextBaronTick: prev.objectives.nextBaronTick != null ? prev.objectives.nextBaronTick : 20,
  };
  let elderBuff = prev.elderBuff && prev.elderBuff.ticksLeft > 1 ? { ...prev.elderBuff, ticksLeft: prev.elderBuff.ticksLeft - 1 } : null;

  const userPower = userLineup.reduce((s, p) => s + p.overall, 0);
  const aiPower = aiLineup.reduce((s, p) => s + p.overall, 0);

  function sideChance() {
    let chance = balancedChance(userPower, aiPower, userScore, aiScore);
    if (elderBuff) {
      chance = elderBuff.side === 'user' ? clamp(chance + 0.14, 0.05, 0.95) : clamp(chance - 0.14, 0.05, 0.95);
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

  let capBurstUsed = prev.capBurstUsed || false;

  function resolveTeamfight() {
    const remainingBudget = killCap - currentTotalKills();
    if (remainingBudget <= 0) return false;

    const userAvail = availablePlayers(userLineup);
    const aiAvail = availablePlayers(aiLineup);
    if (userAvail.length === 0 || aiAvail.length === 0) return false;

    // 킬 상한에 가까워지면(남은 여유 3~8킬) 마지막으로 양팀이 크게 모이는 결정적 한타를 한 번 터뜨린다
    const isCapBurst = !capBurstUsed && remainingBudget >= 3 && remainingBudget <= 8;

    // 교전에 모이는 인원 수를 무작위로 정한다 (많이 모일수록 이후 킬 상한도 늘어난다)
    const userCount = isCapBurst ? Math.min(5, userAvail.length) : randRange(1, Math.min(5, userAvail.length));
    const aiCount = isCapBurst ? Math.min(5, aiAvail.length) : randRange(1, Math.min(5, aiAvail.length));
    const userParticipants = sample(userAvail, userCount);
    const aiParticipants = sample(aiAvail, aiCount);

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
    if (killsThisFight <= 0) return false;
    if (isCapBurst) capBurstUsed = true;

    // 죽을 경우 게임 진행도에 따라 리스폰 시간이 늘어난다 (2~6분)
    const respawnDuration = Math.round(2 + tickRatio * 4);
    const victims = sample(loseParticipants, killsThisFight);
    const killNames = [];
    const killTally = new Map();
    // 서포터는 상대적으로 킬 확률을 낮게, 그 외 포지션은 동일 가중치로 킬러를 뽑는다
    function pickKiller(participants) {
      const weights = participants.map(({ p }) => (p.position === 'SUP' ? 0.2 : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      for (let idx = 0; idx < participants.length; idx++) {
        if (roll < weights[idx]) return participants[idx].p;
        roll -= weights[idx];
      }
      return participants[participants.length - 1].p;
    }
    victims.forEach(({ p: victim }) => {
      victim.deaths++;
      victim.respawnAtTick = tick + respawnDuration;
      const killer = pickKiller(winParticipants);
      killer.kills++;
      killNames.push(victim.name);
      killTally.set(killer, (killTally.get(killer) || 0) + 1);
      log = [{ id: tick + '-' + Math.random(), text: `${killer.name}(${killer.champion})님이 ${victim.name}(${victim.champion})님을 처치했습니다!` }, ...log].slice(0, 6);
      winParticipants.forEach(({ p: assistCandidate }) => {
        if (assistCandidate === killer) return;
        const assistChance = assistCandidate.position === 'SUP' ? 0.85 : 0.5;
        if (Math.random() < assistChance) assistCandidate.assists++;
      });
    });

    if (winSide === 'user') userScore += killsThisFight * 2; else aiScore += killsThisFight * 2;
    const winLabel = winSide === 'user' ? '우리 팀' : '상대 팀';

    // 한타 내 멀티킬 로그
    const multiKillLabels = { 2: '더블킬', 3: '트리플킬', 4: '쿼드라킬', 5: '펜타킬' };
    killTally.forEach((count, killerPlayer) => {
      if (multiKillLabels[count]) {
        log = [{ id: tick + '-' + Math.random(), text: `${killerPlayer.champion}이(가) ${multiKillLabels[count]}!` }, ...log].slice(0, 6);
      }
    });

    // 한타 내 상대 팀 전원(5명) 전멸 시 ACE 로그
    const losingFullLineup = winSide === 'user' ? aiLineup : userLineup;
    const isAce = losingFullLineup.length === 5 && losingFullLineup.every((p) => tick < (p.respawnAtTick || 0));
    if (isAce) {
      log = [{ id: tick + '-' + Math.random(), text: `${winLabel} ACE!` }, ...log].slice(0, 6);
    }

    eventParticipants = [
      ...userParticipants.map(({ i }) => 'user-' + i),
      ...aiParticipants.map(({ i }) => 'ai-' + i),
    ];
    return true;
  }

  function resolveObjective(type) {
    const side = Math.random() < sideChance() ? 'user' : 'ai';
    if (side === 'user') userScore += 3; else aiScore += 3;
    let objLogLabel = type;
    let isElder = false;
    if (type === '타워') {
      objectives[side].towers += 1;
    } else if (type === '바론') {
      objectives[side].barons += 1;
      objectives.nextBaronTick = tick + 6;
    } else if (type === '드래곤') {
      objectives.nextDragonTick = tick + 5;
      const elderReady = Math.max(objectives.user.dragons.length, objectives.ai.dragons.length) >= 4;
      if (elderReady) {
        objectives[side].dragons.push('장로');
        objLogLabel = '장로 드래곤';
        isElder = true;
        elderBuff = { side, ticksLeft: 3 };
      } else {
        const dType = DRAGON_TYPES[randRange(0, DRAGON_TYPES.length - 1)];
        objectives[side].dragons.push(dType);
        objLogLabel = `${dType} 드래곤`;
      }
    }
    return { side, objLogLabel, isElder };
  }

  // 경기 진행률에 따른 목표 페이스 (85% 지점까지 최소 기준 도달을 목표로 완만하게 보정)
  const paceRatio = Math.min(1, tickRatio / 0.85);
  const targetDragons = 3 * paceRatio;
  const targetLeaderTowers = 8 * paceRatio;
  const totalDragonsSoFar = objectives.user.dragons.length + objectives.ai.dragons.length;
  const leaderTowersSoFar = Math.max(objectives.user.towers, objectives.ai.towers);
  const dragonBehind = totalDragonsSoFar < targetDragons;
  const towerBehind = leaderTowersSoFar < targetLeaderTowers;
  const nearEnd = tick >= prev.totalTicks - 2;

  if (isFinalTick) {
    resolveTeamfight();
    if (eventParticipants.length === 0) resolveTeamfight();

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
    const leaderSide = objectives.user.towers >= objectives.ai.towers ? 'user' : 'ai';
    if (objectives[leaderSide].towers < 8) {
      const need = 8 - objectives[leaderSide].towers;
      objectives[leaderSide].towers += need;
      if (leaderSide === 'user') userScore += need * 3; else aiScore += need * 3;
    }

    const loserSide = userScore <= aiScore ? 'user' : 'ai';
    const loserBase = BASE[loserSide];
    const positions = finalSiegePositions(userLineup, aiLineup, loserBase);
    const allKeys = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
    log = [{ id: tick + '-final', text: `최종 결전이 ${loserSide === 'user' ? '우리' : '상대'} 진영에서 벌어집니다!` }, ...log].slice(0, 6);
    let finalWin;
    if (userScore !== aiScore) finalWin = userScore > aiScore;
    else {
      const up = userLineup.reduce((s, p) => s + p.overall, 0);
      const ap = aiLineup.reduce((s, p) => s + p.overall, 0);
      finalWin = up === ap ? Math.random() < 0.5 : up > ap;
    }
    return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: true, eventParticipants: allKeys, objectives, finalWin, elderBuff, capBurstUsed };
  }

  const totalBarons = objectives.user.barons + objectives.ai.barons;
  const skirmishChance = 0.65;
  const towerAvailable = tick >= 5;
  let towerChance = 0;
  if (towerAvailable) {
    towerChance = 0.20 + tickRatio * 0.10;
    if (towerBehind) towerChance += nearEnd ? 0.45 : 0.20;
  }
  const dragonAvailable = tick >= objectives.nextDragonTick;
  let dragonChance = 0;
  if (dragonAvailable) {
    dragonChance = 0.07 + tickRatio * 0.05;
    if (dragonBehind) dragonChance += nearEnd ? 0.35 : 0.15;
  }
  const baronAvailable = tick >= objectives.nextBaronTick;
  const baronChance = (baronAvailable && totalBarons < 2) ? 0.05 : 0;
  const heraldChance = tickRatio < 0.55 ? 0.05 : 0;

  const roll = Math.random();
  let acc = 0;
  let gatherPoint = null;
  if (roll < (acc += skirmishChance)) {
    resolveTeamfight();
  } else if (roll < (acc += towerChance)) {
    const { side, objLogLabel } = resolveObjective('타워');
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) ${objLogLabel}을(를) 처치했습니다!` }, ...log].slice(0, 6);
  } else if (roll < (acc += dragonChance)) {
    const { side, objLogLabel, isElder } = resolveObjective('드래곤');
    const flavor = isElder ? `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 치열한 한타 끝에 ${objLogLabel}을(를) 처치했습니다! 승리에 대한 확신이 차오릅니다!` : `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 드래곤 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다!`;
    log = [{ id: tick + '-' + Math.random(), text: flavor }, ...log].slice(0, 6);
    eventParticipants = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
    gatherPoint = { x: ZONES.dragonPit.x * 100, y: ZONES.dragonPit.y * 100 };
  } else if (roll < (acc += baronChance)) {
    const { side, objLogLabel } = resolveObjective('바론');
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 바론 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다!` }, ...log].slice(0, 6);
    eventParticipants = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
    gatherPoint = { x: ZONES.baronPit.x * 100, y: ZONES.baronPit.y * 100 };
  } else if (roll < (acc += heraldChance)) {
    const side = Math.random() < sideChance() ? 'user' : 'ai';
    if (side === 'user') userScore += 3; else aiScore += 3;
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 전령을(를) 처치했습니다!` }, ...log].slice(0, 6);
  }

  let positions;
  if (gatherPoint) {
    positions = finalSiegePositions(userLineup, aiLineup, gatherPoint);
  } else {
    const clashPoint = eventParticipants.length === 2 ? pickZone(tickRatio) : null;
    positions = computePositions(userLineup, aiLineup, eventParticipants, clashPoint);
  }
  return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff, capBurstUsed };
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
  const [renameId, setRenameId] = useState(null);
  const [renameInput, setRenameInput] = useState('');
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

  function handleRenamePlayer(playerId, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setGame((prev) => {
      const newPlayers = prev.players.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p));
      const newGame = { ...prev, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
    setRenameId(null);
    setRenameInput('');
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
    const totalTicks = randRange(21, 34);
    setSim({
      tick: 0, totalTicks, userLineup: userFinal, aiLineup: aiFinal,
      userScore: 0, aiScore: 0, log: [], finished: false,
      positions: computePositions(userFinal, aiFinal, []), eventParticipants: [],
      objectives: { user: { towers: 0, barons: 0, dragons: [] }, ai: { towers: 0, barons: 0, dragons: [] }, nextDragonTick: 5, nextBaronTick: 20 },
      elderBuff: null,
      finalWin: null,
      killCap: randRange(13, 43),
      capBurstUsed: false,
    });
    setScreen('sim');
  }

  useEffect(() => {
    if (screen !== 'sim') return;
    const id = setInterval(() => {
      setSim((prev) => (prev && !prev.finished ? tickAdvance(prev) : prev));
    }, 1000);
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
    let club = { ...game.club };
    let newLeague = game.league;
    let seriesDecided = false;
    let seriesWon = null;
    let seriesTally = null;
    if (isLeague) {
      const cur = { ...game.league.current };
      cur.userWins += wasWin ? 1 : 0;
      cur.aiWins += wasWin ? 0 : 1;
      cur.gameNumber += 1;
      seriesTally = { user: cur.userWins, ai: cur.aiWins };
      if (cur.userWins >= 2 || cur.aiWins >= 2) {
        seriesDecided = true;
        seriesWon = cur.userWins >= 2;
        club.wins += seriesWon ? 1 : 0;
        club.losses += seriesWon ? 0 : 1;
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
      club.wins += wasWin ? 1 : 0;
      club.losses += wasWin ? 0 : 1;
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
        scoreLabel: `${userKillTotal}:${aiKillTotal}`, playTime: sim.tick, context: onlineMatchCode ? '온라인 매칭' : '구단 스크림',
      }, ...prevHistory];
    } else if (seriesDecided) {
      matchHistory = [{
        id: Date.now() + '-' + Math.random(),
        opponentName: selectedOpponent.name, win: seriesWon,
        scoreLabel: `${seriesTally.user}:${seriesTally.ai}`, playTime: null, context: game.league.roundLabel,
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
      win: wasWin, userScore: sim.userScore, aiScore: sim.aiScore, playTime: sim.tick,
      opponentName: selectedOpponent.name, details, aiDetails, oldClubValue, newClubValue: club.value,
      isLeague, seriesDecided, seriesWon, seriesTally,
    });
    setScreen(isLeague ? (seriesDecided ? 'seriesResult' : 'gameWait') : 'result');
  }

  /* ============================== 화면 렌더 ============================== */

  const shell = 'min-h-screen w-full lm-root';
    // 배포판에서는 인라인 data URI 대신 실제 파일(public/backdrop.png)을 참조합니다.
  const backdropStyle = {
    backgroundImage: `linear-gradient(to bottom, rgba(10,14,23,0) 0%, rgba(10,14,23,0.55) 62%, rgba(10,14,23,1) 100%), url("/backdrop.png")`,
    backgroundRepeat: 'no-repeat, repeat-x',
    backgroundPosition: 'top, top left',
    backgroundSize: '100% 160px, auto 160px',
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
            {game.club.qualifiedRank && (
              <span className="text-xs px-1.5 py-0.5 rounded lm-tier-2">{LEAGUE_NAME[game.club.region] || '지역리그'} {game.club.qualifiedRank}위</span>
            )}
            {game.club.internationalResult && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#C89B3C', color: '#1A1305' }}>국제 리그 {game.club.internationalResult}</span>
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
                        {renameId === p.id ? (
                          <div className="flex items-center gap-1 mb-2">
                            <input
                              type="text"
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenamePlayer(p.id, renameInput)}
                              className="lm-input rounded px-1.5 py-1 text-xs flex-1 min-w-0"
                              autoFocus
                            />
                            <button onClick={() => handleRenamePlayer(p.id, renameInput)} className="text-xs px-1.5 py-1 rounded lm-btn-primary font-semibold shrink-0">✓</button>
                            <button onClick={() => { setRenameId(null); setRenameInput(''); }} className="text-xs px-1.5 py-1 rounded lm-btn-ghost shrink-0">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-2 gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-sm truncate">{p.name}</span>
                              <button onClick={() => { setRenameId(p.id); setRenameInput(p.name); }} className="text-xs lm-dim lm-hover-muted shrink-0">✏️</button>
                            </div>
                            <span className="text-xs lm-muted shrink-0">{p.region}</span>
                          </div>
                        )}

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
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                      border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                    }}
                  >
                    {CHAMPION_WEAPON[champ] || '❔'}
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
                className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: `linear-gradient(135deg, ${POS_COLOR[role]}, #0A0E17)`, border: `1px solid ${POS_COLOR[role]}` }}
              >
                {CHAMPION_WEAPON[name] || '❔'}
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
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 relative" style={backdropStyle}>
        <Header subtitle="전적" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>
        <div className={`${panel} p-4 mb-4 text-center`}>
          <div className="text-2xl font-bold">{game.club.wins}승 {game.club.losses}패</div>
        </div>
        {history.length === 0 ? (
          <div className="text-sm text-center py-10 lm-muted">아직 치른 경기가 없어요.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
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
                          style={{ backfaceVisibility: 'hidden', background: 'linear-gradient(135deg, #1D2740, #0A0E17)', border: '1px solid #C89B3C' }}
                        >
                          <div className="text-xl" style={{ ...displayFont, color: '#D9AE55' }}>롤매니저</div>
                          <div className="text-xs lm-dim">탭하여 공개</div>
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
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                      border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                    }}
                  >
                    {CHAMPION_WEAPON[champ] || '❔'}
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
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                                style={{
                                  background: 'linear-gradient(135deg, #1D2740, #0A0E17)',
                                  border: `2px solid ${isSpecial ? '#D9AE55' : '#2A3550'}`,
                                }}
                              >
                                {CHAMPION_WEAPON[champ] || '❔'}
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                    className={`p-2 rounded-lg text-center transition-colors flex flex-col items-center gap-1.5 ${tileClass}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${POS_COLOR[role]}, #0A0E17)`,
                        filter: isBanned ? 'grayscale(1) opacity(0.5)' : 'none',
                        border: `1px solid ${POS_COLOR[role]}`,
                      }}
                    >
                      {name === '가렌' ? (
                        <img src="/champion-garen.png" alt="가렌" width="26" height="26" />
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

    function objRow(side) {
      const o = s.objectives[side];
      const align = side === 'user' ? 'justify-start' : 'justify-end';
      const buffed = s.elderBuff && s.elderBuff.side === side;
      return (
        <div className={`flex items-center gap-2 text-xs mt-1 lm-muted ${align}`}>
          <span>🗼{o.towers}</span>
          <span title={o.dragons.join(', ')}>🐉{o.dragons.length}{o.dragons.length > 0 && ` (${o.dragons.join(',')})`}</span>
          <span>💀{o.barons}</span>
          {buffed && <span className="font-bold" style={{ color: '#C084FC' }}>👑장로버프</span>}
        </div>
      );
    }

    const userKillScore = s.userLineup.reduce((sum, p) => sum + p.kills, 0);
    const aiKillScore = s.aiLineup.reduce((sum, p) => sum + p.kills, 0);

    const headerNode = (
      <div className="mb-2">
        {s.finished && (
          <div className="text-center text-2xl font-bold mb-2" style={{ ...displayFont, color: s.finalWin ? '#2DD4C6' : '#EF4444' }}>
            {s.finalWin ? '승리' : '패배'}
          </div>
        )}
        <div className="grid grid-cols-3 items-center">
          <div>
            <div className="text-sm font-semibold truncate" style={{ color: '#38BDF8' }}>{game.club.name}</div>
            {objRow('user')}
          </div>
          <div className="text-center">
            <div className="text-4xl leading-none" style={displayFont}>{userKillScore} : {aiKillScore}</div>
            <div className="text-xs mt-1 lm-muted">{s.finished ? `${s.tick}분 경과 / 총 ${s.totalTicks}분 · 경기 종료` : `${s.tick}분 경과`}</div>
            {game.league && game.league.current && (
              <div className="text-xs mt-0.5 lm-muted">시리즈 {game.league.current.userWins}:{game.league.current.aiWins} · {game.league.current.gameNumber}경기</div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-right truncate" style={{ color: '#EF4444' }}>{selectedOpponent.name}</div>
            {objRow('ai')}
          </div>
        </div>
      </div>
    );

    const teamPanelsNode = (
      <div className={`${panel} p-3`}>
        <div className="flex items-center justify-between text-xs font-semibold mb-2 px-1">
          <span style={{ color: '#38BDF8' }}>우리 팀</span>
          <span style={{ color: '#EF4444' }}>상대 팀</span>
        </div>
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
      <button onClick={finalizeMatch} className={`${btnPrimary} w-full py-3 text-sm`}>결과 확인하기</button>
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
          {BLUE_TOWERS.map((pt, i) => i >= s.objectives.ai.towers && (
            <circle key={'bt' + i} cx={pt.x} cy={pt.y} r="1.9" fill="#3B82F6" fillOpacity="0.85" stroke="#BFDBFE" strokeWidth="0.5" />
          ))}
          {RED_TOWERS.map((pt, i) => i >= s.objectives.user.towers && (
            <circle key={'rt' + i} cx={pt.x} cy={pt.y} r="1.9" fill="#EF4444" fillOpacity="0.85" stroke="#FECACA" strokeWidth="0.5" />
          ))}
          <polygon points="10,89.3 12.3,93 10,96.7 7.7,93" fill="#60CFFF" fillOpacity="0.95" stroke="#DBF3FF" strokeWidth="0.3" />
          <polygon points="90,4.3 92.3,8 90,11.7 87.7,8" fill="#FF6B6B" fillOpacity="0.95" stroke="#FFE1E1" strokeWidth="0.3" />
          <polygon
            points={`${ZONES.baronPit.x * 100},${ZONES.baronPit.y * 100 - 2.6} ${ZONES.baronPit.x * 100 + 2.6},${ZONES.baronPit.y * 100} ${ZONES.baronPit.x * 100},${ZONES.baronPit.y * 100 + 2.6} ${ZONES.baronPit.x * 100 - 2.6},${ZONES.baronPit.y * 100}`}
            fill="#C084FC" fillOpacity="0.85" stroke="#F3E8FF" strokeWidth="0.3" className="animate-pulse"
          />
          <polygon
            points={`${ZONES.dragonPit.x * 100},${ZONES.dragonPit.y * 100 - 2.6} ${ZONES.dragonPit.x * 100 + 2.6},${ZONES.dragonPit.y * 100} ${ZONES.dragonPit.x * 100},${ZONES.dragonPit.y * 100 + 2.6} ${ZONES.dragonPit.x * 100 - 2.6},${ZONES.dragonPit.y * 100}`}
            fill="#FB923C" fillOpacity="0.85" stroke="#FFEDD5" strokeWidth="0.3" className="animate-pulse"
          />
        </svg>
        {[[0.16, 0.26, 11], [0.32, 0.15, 9], [0.24, 0.36, 8], [0.66, 0.3, 10], [0.8, 0.6, 11], [0.7, 0.4, 8], [0.2, 0.72, 12], [0.6, 0.6, 9], [0.12, 0.58, 8], [0.86, 0.2, 8]].map(([bx, by, sz], bi) => (
          <div key={bi} className="absolute rounded-full" style={{ left: `${bx * 100}%`, top: `${by * 100}%`, width: `${sz}%`, height: `${sz}%`, background: 'radial-gradient(circle, rgba(52,180,100,0.7), rgba(52,180,100,0.15) 65%, transparent 85%)', border: '1px solid rgba(74,222,128,0.35)' }} />
        ))}
        <div className="absolute rounded-full" style={{ left: '16%', top: '58%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '76%', top: '38%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: `${(ZONES.baronPit.x - 0.07) * 100}%`, top: `${(ZONES.baronPit.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(192,132,252,0.5), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: `${(ZONES.dragonPit.x - 0.07) * 100}%`, top: `${(ZONES.dragonPit.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(251,146,60,0.5), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '1%', top: '85%', width: '18%', height: '18%', background: 'radial-gradient(circle, rgba(56,189,248,0.7), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '81%', top: '-3%', width: '18%', height: '18%', background: 'radial-gradient(circle, rgba(239,68,68,0.7), transparent 75%)' }} />
        {s.userLineup.map((p, i) => {
          const pos = s.positions['user-' + i] || { x: 0.5, y: 0.5 };
          const active = s.eventParticipants.includes('user-' + i);
          return (
            <div key={p.id} title={p.name} className="absolute rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out"
              style={{
                left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: active ? 'translate(-50%,-50%) scale(1.5)' : 'translate(-50%,-50%)',
                width: 20, height: 20, background: '#3B82F6', color: '#0A0E17', zIndex: active ? 10 : 1,
                boxShadow: active ? '0 0 0 3px #FDE68A' : 'none',
              }}>
              {POS_LABEL[p.position][0]}
            </div>
          );
        })}
        {s.aiLineup.map((p, i) => {
          const pos = s.positions['ai-' + i] || { x: 0.5, y: 0.5 };
          const active = s.eventParticipants.includes('ai-' + i);
          return (
            <div key={p.id} title={p.name} className="absolute rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ease-out"
              style={{
                left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: active ? 'translate(-50%,-50%) scale(1.5)' : 'translate(-50%,-50%)',
                width: 20, height: 20, background: '#EF4444', color: '#0A0E17', zIndex: active ? 10 : 1,
                boxShadow: active ? '0 0 0 3px #FDE68A' : 'none',
              }}>
              {POS_LABEL[p.position][0]}
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
          <div className="mb-3">{teamPanelsNode}</div>
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
          {finishButtonNode}
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {headerNode}
        <div className="mb-6">{teamPanelsNode}</div>
        <div className="w-full sm:max-w-md mx-auto">
          <div className="relative w-full aspect-square rounded-xl overflow-hidden" style={mapBoxStyle}>
            {mapInner}
          </div>
        </div>
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
          <div className="grid grid-cols-3 items-center mb-2">
            <div className="text-left">
              <div className="font-bold truncate">{game.club.name}</div>
              <div className="text-sm font-bold" style={{ color: r.win ? '#2DD4C6' : '#EF4444' }}>{r.win ? '승리' : '패배'}</div>
            </div>
            <div>
              <div className="text-4xl tracking-wide" style={displayFont}>{userKillScore} : {aiKillScore}</div>
              <div className="text-xs mt-1 lm-muted">플레이 타임 {r.playTime}분</div>
            </div>
            <div className="text-right">
              <div className="font-bold truncate">{r.opponentName}</div>
              <div className="text-sm font-bold" style={{ color: !r.win ? '#2DD4C6' : '#EF4444' }}>{!r.win ? '승리' : '패배'}</div>
            </div>
          </div>
          <div className="text-sm mt-2" style={{ color: delta >= 0 ? '#2DD4C6' : '#EF4444' }}>구단 가치 {delta >= 0 ? '+' : ''}{delta.toLocaleString()} P</div>
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
