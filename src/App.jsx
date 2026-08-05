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
  TOP: ['가렌', '다리우스', '카밀', '레넥톤', '오른', '피오라', '나서스', '잭스', '세트', '아트록스', '쉔', '말파이트', '우디르', '볼리베어', '케넨', '신지드', '초가스', '트린다미어', '이렐리아', '럼블'],
  JGL: ['리 신', '비에고', '자르반 4세', '다이애나', '세주아니', '그레이브즈', '니달리', '킨드레드', '헤카림', '릴리아', '엘리스', '카직스', '렝가', '노커', '워윅', '아무무', '자크', '벨베스', '판테온', '문도 박사'],
  MID: ['아리', '제드', '야스오', '오리아나', '신드라', '르블랑', '아칼리', '빅토르', '탈리야', '카시오페아', '트위스티드 페이트', '라이즈', '벡스', '조이', '카타리나', '베이가', '직스', '코르키', '피즈', '갈리오'],
  ADC: ['징크스', '케이틀린', '이즈리얼', '카이사', '베인', '진', '애쉬', '루시안', '시비르', '자야', '트리스타나', '바루스', '미스 포츈', '드레이븐', '칼리스타', '아펠리오스', '사미라', '자히리', '세나', '니코'],
  SUP: ['쓰레쉬', '룰루', '레오나', '노틸러스', '유미', '알리스타', '브라움', '나미', '라칸', '카르마', '파이크', '세라핀', '소나', '벨코즈', '밀리오', '렐', '자이라', '모르가나', '바드', '스웨인'],
};
const ALL_CHAMPION_NAMES = Object.values(CHAMPIONS).flat();
const ALL_CHAMPIONS_FLAT = Object.entries(CHAMPIONS).flatMap(([role, names]) => names.map((name) => ({ name, role })));

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
const SINGLE_PULL_COST = 500;
const MULTI_PULL_COUNT = 5;
const MULTI_PULL_COST = 2250;
const GRADE_LABEL = { COMMON: '커먼', RARE: '레어', EPIC: '에픽' };
const GRADE_COLOR = { COMMON: '#9CA3AF', RARE: '#38BDF8', EPIC: '#C89B3C' };
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
const KOREA_CLUB_NAMES = ['mT1', 'mBNK FEARX', 'mDplus Kia', 'mGen.G', 'mDN SOOPers', 'mKIWOOM DRX', 'mNonghim RedForce', 'mkt Rolster', 'mHANJIN BRION', 'mHanwha Life Esports'];
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

function generateName(usedSet) {
  let name, guard = 0;
  do {
    name = PREFIXES[randRange(0, PREFIXES.length - 1)] + SUFFIXES[randRange(0, SUFFIXES.length - 1)];
    guard++;
  } while (usedSet.has(name) && guard < 60);
  usedSet.add(name);
  return name;
}

// 선수 등급별 능력치 기초 범위 (등급이 높을수록 드물게 등장 = 상향평준화 방지)
const PLAYER_GRADE_TABLE = [
  { grade: 'COMMON', weight: 70, baseMin: 28, baseMax: 52 },
  { grade: 'RARE', weight: 22, baseMin: 48, baseMax: 68 },
  { grade: 'EPIC', weight: 8, baseMin: 64, baseMax: 88 },
];
function rollPlayerGrade() {
  const total = PLAYER_GRADE_TABLE.reduce((s, g) => s + g.weight, 0);
  let roll = Math.random() * total;
  for (const g of PLAYER_GRADE_TABLE) {
    if (roll < g.weight) return g;
    roll -= g.weight;
  }
  return PLAYER_GRADE_TABLE[0];
}

// tier(1군/2군)는 더 이상 능력치를 결정하지 않는다 - 구단이 로스터에서 자유롭게 지정하는 "보직"일 뿐이다.
// 능력치는 등급(COMMON/RARE/EPIC) 확률에 따라 결정된다.
function generatePlayer(position, usedSet, idRef, opts = {}) {
  const gradeInfo = opts.gradeInfo || rollPlayerGrade();
  const base = randRange(gradeInfo.baseMin, gradeInfo.baseMax);
  const stat = () => clamp(base + randRange(-9, 9), 15, 99);
  const mechanics = stat(), gameSense = stat(), teamfight = stat(), laning = stat();
  const overall = Math.round((mechanics + gameSense + teamfight + laning) / 4);
  const potBonus = randRange(8, 26);
  const potential = clamp(overall + potBonus, overall, 99);
  const value = Math.round(overall * 12 + potential * 4);
  return {
    id: idRef.current++,
    name: generateName(usedSet),
    position, tier: opts.tier || '2군',
    region: REGIONS[randRange(0, REGIONS.length - 1)],
    mechanics, gameSense, teamfight, laning,
    overall, potential, level: 1, exp: 0, value,
    grade: gradeInfo.grade,
  };
}

function generateInitialGame(name, region, usedSetRef, idRef) {
  const players = [];
  POSITIONS.forEach((pos) => {
    // 창단 시작 선수는 항상 커먼 등급으로 고정 - 낮은 구단파워로 시작해서 성장/영입으로 강해지는 구조
    players.push(generatePlayer(pos, usedSetRef.current, idRef, { tier: '1군', gradeInfo: PLAYER_GRADE_TABLE[0] }));
  });
  const clubValue = players.reduce((s, p) => s + p.value, 0);
  const club = { name, region, value: clubValue, budget: 5000, wins: 0, losses: 0 };
  return { club, players, matchHistory: [] };
}

const SPECIAL_PLAYERS = [
  { name: 'mFAKER', position: 'MID', region: '한국', mechanics: 88, gameSense: 91, teamfight: 87, laning: 90, potential: 99 },
  { name: 'mKeria', position: 'SUP', region: '한국', mechanics: 85, gameSense: 92, teamfight: 89, laning: 84, potential: 97 },
  { name: 'mDoran', position: 'TOP', region: '한국', mechanics: 84, gameSense: 82, teamfight: 86, laning: 88, potential: 93 },
  { name: 'mOner', position: 'JGL', region: '한국', mechanics: 87, gameSense: 88, teamfight: 90, laning: 80, potential: 95 },
  { name: 'mPeyz', position: 'ADC', region: '한국', mechanics: 89, gameSense: 83, teamfight: 85, laning: 87, potential: 96 },
];

function createSpecialPlayer(config, usedSetRef, idRef) {
  usedSetRef.current.add(config.name);
  const overall = Math.round((config.mechanics + config.gameSense + config.teamfight + config.laning) / 4);
  const value = Math.round(overall * 12 + config.potential * 4);
  return {
    id: idRef.current++,
    name: config.name, position: config.position, tier: '1군', region: config.region,
    mechanics: config.mechanics, gameSense: config.gameSense, teamfight: config.teamfight, laning: config.laning,
    overall, potential: config.potential, level: 1, exp: 0, value,
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
  const player = generatePlayer(position, usedSetRef.current, idRef, { tier: '2군' });
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
  const player = generatePlayer(position, usedSetRef.current, idRef, { tier: '2군' });
  return player;
}

function resolveWinner(a, b) {
  const pa = a.power / (a.power + b.power);
  return Math.random() < pa ? a : b;
}

// 국제전 진출권 순위 조회용 (실제 대진 없이 참가 자격만 계산)
function getInternationalQualifiers(game) {
  const regionFirsts = [];
  const regionSeconds = [];
  REGIONS.forEach((region) => {
    const aiSorted = [...REGION_CLUBS[region]].sort((a, b) => b.power - a.power);
    regionFirsts.push({ ...aiSorted[0], region });
    regionSeconds.push({ ...aiSorted[1], region });
  });
  const userRegionIdx = REGIONS.indexOf(game.club.region);
  const userQualified = userRegionIdx !== -1 && game.club.qualifiedRank && game.club.qualifiedRank <= 2;
  if (userQualified) {
    const userEntry = { id: 'USER', name: game.club.name, region: game.club.region, power: (game.club.qualifiedWins || 5) * 40, isUser: true };
    if (game.club.qualifiedRank === 1) regionFirsts[userRegionIdx] = userEntry;
    else regionSeconds[userRegionIdx] = userEntry;
  }
  const userInSeconds = regionSeconds.find((c) => c.isUser);
  let wildcards;
  if (userInSeconds) {
    const rest = regionSeconds.filter((c) => !c.isUser).sort((a, b) => b.power - a.power);
    wildcards = [userInSeconds, rest[0]];
  } else {
    wildcards = [...regionSeconds].sort((a, b) => b.power - a.power).slice(0, 2);
  }
  return [...regionFirsts, ...wildcards].sort((a, b) => b.power - a.power);
}

function setupInternationalBracket(game) {
  const regionFirsts = [];
  const regionSeconds = [];
  REGIONS.forEach((region) => {
    const aiSorted = [...REGION_CLUBS[region]].sort((a, b) => b.power - a.power);
    regionFirsts.push({ ...aiSorted[0], region });
    regionSeconds.push({ ...aiSorted[1], region });
  });
  const userRegionIdx = REGIONS.indexOf(game.club.region);
  const userQualified = userRegionIdx !== -1 && game.club.qualifiedRank && game.club.qualifiedRank <= 2;
  if (userQualified) {
    const userEntry = { id: 'USER', name: game.club.name, region: game.club.region, power: (game.club.qualifiedWins || 5) * 40, isUser: true };
    if (game.club.qualifiedRank === 1) regionFirsts[userRegionIdx] = userEntry;
    else regionSeconds[userRegionIdx] = userEntry;
  }
  const userInSeconds = regionSeconds.find((c) => c.isUser);
  let wildcards;
  if (userInSeconds) {
    const rest = regionSeconds.filter((c) => !c.isUser).sort((a, b) => b.power - a.power);
    wildcards = [userInSeconds, rest[0]];
  } else {
    wildcards = [...regionSeconds].sort((a, b) => b.power - a.power).slice(0, 2);
  }
  // 지역 1위 6팀 + 와일드카드(지역 2위 중 상위) 2팀 = 총 8팀
  const participants = [...regionFirsts, ...wildcards];
  for (let i = participants.length - 1; i > 0; i--) {
    const j = randRange(0, i);
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }
  const pairsR1 = [[0, 3], [2, 1], [4, 7], [6, 5]];
  const userIndex = participants.findIndex((p) => p.isUser);
  if (userIndex === -1) return { userOpponent: null };
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
};

function computeTeamPower(players) {
  return POSITIONS.reduce((sum, pos) => {
    const candidates = players.filter((p) => p.position === pos);
    if (candidates.length === 0) return sum;
    const starter = candidates.find((p) => p.tier === '1군') || [...candidates].sort((a, b) => b.overall - a.overall)[0];
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

function generateOpponentLineup(power, tierLabel) {
  const used = new Set();
  const idRef = { current: randRange(9000, 98000) };
  const per = power / 5;
  return POSITIONS.map((pos) => {
    const target = clamp(Math.round(per + randRange(-6, 6)), 20, 99);
    const spread = () => clamp(target + randRange(-8, 8), 10, 99);
    const mechanics = spread(), gameSense = spread(), teamfight = spread(), laning = spread();
    const overall = Math.round((mechanics + gameSense + teamfight + laning) / 4);
    return {
      id: idRef.current++,
      name: generateName(used),
      position: pos, tier: tierLabel || '1군',
      mechanics, gameSense, teamfight, laning, overall,
      champion: null, kills: 0, deaths: 0, assists: 0, damage: 0,
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
const BLUE_TOWERS = [
  { x: 47, y: 54 }, { x: 10, y: 22 }, { x: 72, y: 90 }, { x: 30, y: 70 },
  { x: 10, y: 47 }, { x: 50, y: 90 }, { x: 10, y: 70 }, { x: 27, y: 90 },
];
const RED_TOWERS = [
  { x: 53, y: 46 }, { x: 90, y: 78 }, { x: 38, y: 8 }, { x: 70, y: 26 },
  { x: 92, y: 55 }, { x: 60, y: 8 }, { x: 92, y: 25 }, { x: 78, y: 8 },
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

  function resolveSkirmish() {
    const attackerSide = Math.random() < sideChance() ? 'user' : 'ai';
    const defenderSide = attackerSide === 'user' ? 'ai' : 'user';
    const atkArr = attackerSide === 'user' ? userLineup : aiLineup;
    const defArr = defenderSide === 'user' ? userLineup : aiLineup;
    const atkIdx = randRange(0, 4);
    const defIdx = randRange(0, 4);
    const attacker = atkArr[atkIdx];
    const defender = defArr[defIdx];
    attacker.damage = (attacker.damage || 0) + Math.round(attacker.overall * 4) + randRange(50, 150);
    defender.damage = (defender.damage || 0) + Math.round(defender.overall * 3) + randRange(30, 100);
    const rawStatProb = attacker.overall / (attacker.overall + defender.overall);
    const champMod = championMatchupMod(attacker.champion, defender.champion);
    const statAdvantage = attacker.overall - defender.overall;
    // 능력치 격차가 클수록(공격자가 더 강할수록) 상성의 영향력이 줄어든다 = 상성을 실력으로 극복
    const matchupWeight = clamp(1 - statAdvantage / 30, 0.15, 1.5);
    const winProb = clamp(rawStatProb + champMod * matchupWeight, 0.08, 0.92);
    if (Math.random() < winProb) {
      attacker.kills++; defender.deaths++;
      if (Math.random() < 0.65) {
        let aIdx = randRange(0, 4);
        if (aIdx === atkIdx) aIdx = (aIdx + 1) % 5;
        atkArr[aIdx].assists++;
      }
      if (attackerSide === 'user') userScore += 2; else aiScore += 2;
      log = [{ id: tick + '-' + Math.random(), text: `${attacker.name}(${POS_LABEL[attacker.position]})님이 ${defender.name}(${POS_LABEL[defender.position]})님을 처치했습니다!` }, ...log].slice(0, 6);
      eventParticipants = [`${attackerSide}-${atkIdx}`, `${defenderSide}-${defIdx}`];
      return true;
    } else if (Math.random() < 0.3) {
      defender.kills++; attacker.deaths++;
      if (defenderSide === 'user') userScore += 2; else aiScore += 2;
      log = [{ id: tick + '-' + Math.random(), text: `${defender.name}(${POS_LABEL[defender.position]})님이 ${attacker.name}(${POS_LABEL[attacker.position]})님을 역으로 처치했습니다!` }, ...log].slice(0, 6);
      eventParticipants = [`${attackerSide}-${atkIdx}`, `${defenderSide}-${defIdx}`];
      return true;
    }
    return false;
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
    } else if (type === '드래곤') {
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
    resolveSkirmish();
    if (eventParticipants.length === 0) resolveSkirmish();

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
    return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: true, eventParticipants: allKeys, objectives, finalWin, elderBuff };
  }

  const totalBarons = objectives.user.barons + objectives.ai.barons;
  const skirmishChance = 0.34;
  let towerChance = 0.20 + tickRatio * 0.10;
  if (towerBehind) towerChance += nearEnd ? 0.45 : 0.20;
  let dragonChance = 0.07 + tickRatio * 0.05;
  if (dragonBehind) dragonChance += nearEnd ? 0.35 : 0.15;
  const baronChance = (totalBarons < 2 && tickRatio > 0.5) ? 0.05 : 0;
  const heraldChance = tickRatio < 0.55 ? 0.05 : 0;

  const roll = Math.random();
  let acc = 0;
  let gatherPoint = null;
  if (roll < (acc += skirmishChance)) {
    resolveSkirmish();
  } else if (roll < (acc += towerChance)) {
    const { side, objLogLabel } = resolveObjective('타워');
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) ${objLogLabel}을(를) 처치했습니다! (+3점)` }, ...log].slice(0, 6);
  } else if (roll < (acc += dragonChance)) {
    const { side, objLogLabel, isElder } = resolveObjective('드래곤');
    const flavor = isElder ? `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 치열한 한타 끝에 ${objLogLabel}을(를) 처치했습니다! 승리에 대한 확신이 차오릅니다! (+3점)` : `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 드래곤 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다! (+3점)`;
    log = [{ id: tick + '-' + Math.random(), text: flavor }, ...log].slice(0, 6);
    eventParticipants = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
    gatherPoint = { x: ZONES.botRiver.x * 100, y: ZONES.botRiver.y * 100 };
  } else if (roll < (acc += baronChance)) {
    const { side, objLogLabel } = resolveObjective('바론');
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 바론 앞에서 한타 끝에 ${objLogLabel}을(를) 처치했습니다! (+3점)` }, ...log].slice(0, 6);
    eventParticipants = [...userLineup.map((_, i) => 'user-' + i), ...aiLineup.map((_, i) => 'ai-' + i)];
    gatherPoint = { x: ZONES.topRiver.x * 100, y: ZONES.topRiver.y * 100 };
  } else if (roll < (acc += heraldChance)) {
    const side = Math.random() < sideChance() ? 'user' : 'ai';
    if (side === 'user') userScore += 3; else aiScore += 3;
    log = [{ id: tick + '-' + Math.random(), text: `${side === 'user' ? '우리 팀' : '상대 팀'}이(가) 전령을(를) 처치했습니다! (+3점)` }, ...log].slice(0, 6);
  }

  let positions;
  if (gatherPoint) {
    positions = finalSiegePositions(userLineup, aiLineup, gatherPoint);
  } else {
    const clashPoint = eventParticipants.length === 2 ? pickZone(tickRatio) : null;
    positions = computePositions(userLineup, aiLineup, eventParticipants, clashPoint);
  }
  return { ...prev, tick, userLineup, aiLineup, userScore, aiScore, log, positions, finished: false, eventParticipants, objectives, elderBuff };
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
  const isFirst = tier === '1군';
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isFirst ? 'lm-tier-1' : 'lm-tier-2'}`}>
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
  const [champAssignment, setChampAssignment] = useState({});
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const [entryPoolDraft, setEntryPoolDraft] = useState({});
  const [leagueStartConfirm, setLeagueStartConfirm] = useState(null);
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
  const [sim, setSim] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const [waitCountdown, setWaitCountdown] = useState(GAME_WAIT_SECONDS);
  const [draftIntroCountdown, setDraftIntroCountdown] = useState(5);

  const usedNamesRef = useRef(new Set());
  const idRef = useRef(1);

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
    (async () => {
      let loadedPlayers = [];
      try {
        const res = await window.storage.get('club_save', false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          parsed.players.forEach((p) => usedNamesRef.current.add(p.name));
          idRef.current = Math.max(...parsed.players.map((p) => p.id)) + 1;
          loadedPlayers = parsed.players;
          setGame(parsed);
          setScreen('home');
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
      const club = { ...prev.club, value: newPlayers.reduce((s, p) => s + p.value, 0) };
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
      const newPlayers = prev.players.map((p) => (p.id === playerId ? { ...p, tier: newTier } : p));
      const newGame = { ...prev, players: newPlayers };
      saveGame(newGame);
      return newGame;
    });
  }

  function handleDeclareFA(playerId, priceStr) {
    const price = Math.max(1, Math.round(Number(priceStr) || 0));
    if (!price) return;
    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;
    const listing = { ...player, price, fromClub: game.club.name, source: 'user' };
    setGame((prev) => {
      const newPlayers = prev.players.filter((p) => p.id !== playerId);
      const club = { ...prev.club, value: newPlayers.reduce((s, p) => s + p.value, 0) };
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
  }

  function handleBuyFA(listingId) {
    const listing = (faMarket || []).find((l) => l.id === listingId);
    if (!listing || game.club.budget < listing.price) return;
    const { price, fromClub, source, ...playerData } = listing;
    setGame((prev) => {
      const players = [...prev.players, playerData];
      const club = { ...prev.club, budget: prev.club.budget - price, value: players.reduce((s, p) => s + p.value, 0) };
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
      const club = { ...prev.club, budget: prev.club.budget - cost, value: players.reduce((s, p) => s + p.value, 0) };
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
    setOpponentLineup(generateOpponentLineup(power, chosenTier));
    setLineupChoice(POSITIONS.reduce((acc, p) => ({ ...acc, [p]: '1군' }), {}));
    setExpandedChallengeId(null);
    setScreen('lineup');
  }

  function handleViewClubDetail(club) {
    const roster1 = generateOpponentLineup(club.power, '1군');
    const roster2 = generateOpponentLineup(club.power2 || Math.round(club.power * 0.7), '2군');
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
    setOpponentLineup(generateOpponentLineup(clubDef.power));
    const newLeague = { ...baseLeague, started: true, current: { opponent: clubDef, userWins: 0, aiWins: 0, gameNumber: 1, activeStarters } };
    setGame((prev) => {
      const newGame = { ...prev, league: newLeague };
      saveGame(newGame);
      return newGame;
    });
    setUserLineup(lineup);
    startDraftPhase();
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

  function handleConfirmLeagueStart() {
    if (leagueStartConfirm === 'regional') handleStartRegionalLeague();
    else if (leagueStartConfirm === 'international') handleStartInternational();
    setLeagueStartConfirm(null);
  }

  function handleStartRegionalLeague() {
    const region = game.club.region || REGIONS[0];
    const queue = [...REGION_CLUBS[region]];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = randRange(0, i);
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    const league = { type: 'regional', region, queue, results: [], current: null, entryPool: null, started: false, roundIndex: 0, roundLabel: LEAGUE_NAME[region] || '지역 리그' };
    setGame((prev) => {
      const newGame = { ...prev, league };
      saveGame(newGame);
      return newGame;
    });
    setEntryPoolDraft({});
    setScreen('leagueRosterSetup');
  }

  function handleStartInternational() {
    const bracket = setupInternationalBracket(game);
    if (!bracket.userOpponent) return;
    const league = {
      type: 'international', region: game.club.region, queue: [bracket.userOpponent], results: [], current: null, entryPool: null, started: false,
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
      setOpponentLineup(generateOpponentLineup(league.current.opponent.power));
      const lineup = POSITIONS.map((pos) => {
        const p = game.players.find((pl) => pl.id === league.current.activeStarters[pos]);
        return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
      });
      setUserLineup(lineup);
      startDraftPhase();
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

  function handleFinishLeague() {
    const league = game.league;
    if (league && league.type === 'regional' && league.queue.length === 0) {
      const userWinsCount = league.results.filter((x) => x.won).length;
      const aiScores = REGION_CLUBS[league.region].map((c) => c.power);
      const userScore = userWinsCount * 40;
      const allScores = [...aiScores, userScore].sort((a, b) => b - a);
      const rank = allScores.indexOf(userScore) + 1;
      setGame((prev) => {
        const club = { ...prev.club, qualifiedRank: rank, qualifiedRegion: league.region, qualifiedWins: userWinsCount };
        const newGame = { ...prev, club, league: null };
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
      setGame((prev) => {
        const club = placement ? { ...prev.club, internationalResult: placement } : prev.club;
        const newGame = { ...prev, club, league: null };
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
    startDraftPhase();
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
      if (available.length > 0) processPick('user', available[randRange(0, available.length - 1)]);
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
      const choice = available[randRange(0, available.length - 1)];
      if (isBanPhase(draft.phase)) processBan('ai', choice); else processPick('ai', choice);
    }, 650);
    return () => { cancelled = true; clearTimeout(t); };
  }, [draft]);

  useEffect(() => {
    if (draft && draft.phase === 'done' && draft.userPicks.length === 5) {
      const def = {};
      POSITIONS.forEach((pos, i) => { def[pos] = draft.userPicks[i]; });
      setChampAssignment(def);
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

  function initSim() {
    const userFinal = userLineup.map((u) => ({ ...u, champion: champAssignment[u.position], kills: 0, deaths: 0, assists: 0, damage: 0 }));
    const aiFinal = opponentLineup.map((a, i) => ({ ...a, champion: draft.aiPicks[i], kills: 0, deaths: 0, assists: 0, damage: 0 }));
    const totalTicks = randRange(21, 34);
    setSim({
      tick: 0, totalTicks, userLineup: userFinal, aiLineup: aiFinal,
      userScore: 0, aiScore: 0, log: [], finished: false,
      positions: computePositions(userFinal, aiFinal, []), eventParticipants: [],
      objectives: { user: { towers: 0, barons: 0, dragons: [] }, ai: { towers: 0, barons: 0, dragons: [] } },
      elderBuff: null,
      finalWin: null,
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
    if (screen !== 'gameWait') return;
    setWaitCountdown(GAME_WAIT_SECONDS);
    const interval = setInterval(() => {
      setWaitCountdown((t) => (t > 0 ? t - 1 : 0));
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

  useEffect(() => {
    if (screen === 'gameWait' && waitCountdown === 0) {
      if (game.league && game.league.current && game.league.current.activeStarters) {
        const lineup = POSITIONS.map((pos) => {
          const pid = game.league.current.activeStarters[pos];
          const p = game.players.find((pl) => pl.id === pid);
          return { id: p.id, name: p.name, position: pos, overall: p.overall, champion: null, kills: 0, deaths: 0, assists: 0 };
        });
        setUserLineup(lineup);
      }
      startDraftPhase();
    }
  }, [waitCountdown, screen]);

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
        newLeague = { ...game.league, current: null, results: [...game.league.results, { id: game.league.current.opponent.id, name: game.league.current.opponent.name, won: seriesWon }] };
      } else {
        newLeague = { ...game.league, current: cur };
      }
    } else {
      club.wins += wasWin ? 1 : 0;
      club.losses += wasWin ? 0 : 1;
    }
    club.value = newPlayers.reduce((s, p) => s + p.value, 0);

    const prevHistory = game.matchHistory || [];
    let matchHistory = prevHistory;
    if (!isLeague) {
      matchHistory = [{
        id: Date.now() + '-' + Math.random(),
        opponentName: selectedOpponent.name, win: wasWin,
        scoreLabel: `${sim.userScore}:${sim.aiScore}`, playTime: sim.tick, context: onlineMatchCode ? '온라인 매칭' : '구단 스크림',
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
              score: `${sim.userScore}:${sim.aiScore}`, challengedAt: Date.now(),
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
  const panel = 'lm-panel rounded-xl';
  const btnPrimary = 'lm-btn-primary font-bold rounded-lg transition-colors';
  const btnGhost = 'lm-btn-ghost font-semibold rounded-lg transition-colors';
  const fontStyle = { fontFamily: "'Rajdhani', system-ui, sans-serif" };
  const displayFont = { fontFamily: "'Teko', system-ui, sans-serif" };

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
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: '#C89B3C', color: '#1A1305' }}>국제전 {game.club.internationalResult}</span>
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
          <svg viewBox="0 0 100 100" width="72" height="72" className="mx-auto mb-2">
            <circle cx="50" cy="8" r="3.5" fill="#2DD4C6" />
            <path d="M35 20 Q18 20 18 34 Q18 49 35 49" fill="none" stroke="#D9AE55" strokeWidth="4" strokeLinecap="round" />
            <path d="M65 20 Q82 20 82 34 Q82 49 65 49" fill="none" stroke="#D9AE55" strokeWidth="4" strokeLinecap="round" />
            <path d="M34 16 H66 V36 Q66 58 50 61 Q34 58 34 36 Z" fill="#0F1830" stroke="#D9AE55" strokeWidth="3.5" />
            <rect x="47" y="61" width="6" height="13" fill="#D9AE55" />
            <path d="M38 74 H62 L57 87 H43 Z" fill="#0F1830" stroke="#D9AE55" strokeWidth="3" />
            <rect x="32" y="87" width="36" height="7" rx="1.5" fill="#D9AE55" />
          </svg>
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
    const myTeamPower = computeTeamPower(game.players);
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header subtitle="구단 홈" />
        <div className={`${panel} p-4 mb-4 flex items-center justify-between`}>
          <span className="text-sm font-semibold">우리 구단 팀파워 (1군 기준)</span>
          <span className="text-2xl font-bold" style={{ color: '#D9AE55' }}>{myTeamPower}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => setScreen('roster')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Users size={26} color="#38BDF8" className="mb-2" />
            <div className="font-bold text-lg">선수단</div>
            <div className="text-xs mt-1 lm-muted">보유 선수 {game.players.length}명 확인 및 관리</div>
          </button>
          <button
            onClick={() => setScreen('matchSelect')}
            disabled={!!(game.league && game.league.current)}
            className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Swords size={26} color="#EF4444" className="mb-2" />
            <div className="font-bold text-lg">구단 스크림하기</div>
            <div className="text-xs mt-1 lm-muted">
              {game.league && game.league.current
                ? '매칭된 구단과의 경기가 끝나기 전까지 스크림을 할 수 없습니다'
                : '상대 구단과 단판 친선 매치'}
            </div>
          </button>
          <button onClick={() => { setPullResults([]); setShowPullModal(false); setScreen('recruit'); }} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <ArrowLeftRight size={26} color="#2DD4C6" className="mb-2" />
            <div className="font-bold text-lg">선수 영입</div>
            <div className="text-xs mt-1 lm-muted">신인 뽑기 · FA 시장 · {game.club.budget.toLocaleString()} P 보유</div>
          </button>
          <button onClick={() => setScreen('onlineMatch')} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
            <Users size={26} color="#38BDF8" className="mb-2" />
            <div className="font-bold text-lg">온라인 매칭</div>
            <div className="text-xs mt-1 lm-muted">초대 코드로 다른 유저 구단과 비동기 스크림</div>
          </button>
          {(() => {
            const regionalActive = game.league && game.league.type === 'regional';
            const intlActive = game.league && game.league.type === 'international';
            const canJoinIntl = !game.league && game.club.qualifiedRank && game.club.qualifiedRank <= 2;
            return (
              <>
                <button
                  onClick={() => (regionalActive ? handleResumeLeague() : setLeagueStartConfirm('regional'))}
                  disabled={!!intlActive}
                  className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Trophy size={26} color="#38BDF8" className="mb-2" />
                  <div className="font-bold text-lg flex items-center gap-1.5 flex-wrap">
                    지역 리그
                    <span className="text-xs px-1.5 py-0.5 rounded lm-tier-2">{game.club.region || REGIONS[0]}</span>
                    {regionalActive && <span className="text-xs lm-muted">(진행 중)</span>}
                  </div>
                  <div className="text-xs mt-1 lm-muted">{LEAGUE_NAME[game.club.region || REGIONS[0]]} · {REGION_CLUBS[game.club.region || REGIONS[0]].length}개 구단 라운드로빈{regionalActive ? ` · ${game.league.results.length}/${REGION_CLUBS[game.club.region || REGIONS[0]].length} 완료` : ''}</div>
                </button>
                {intlActive ? (
                  <button onClick={handleResumeLeague} className={`${panel} lm-panel-hover p-6 text-left transition-colors`}>
                    <Trophy size={26} color="#C89B3C" className="mb-2" />
                    <div className="font-bold text-lg">국제전 (진행 중)</div>
                    <div className="text-xs mt-1 lm-muted">{game.league.roundLabel} 진행 중</div>
                  </button>
                ) : (
                  <button
                    onClick={() => setLeagueStartConfirm('international')}
                    disabled={!canJoinIntl}
                    className={`${panel} lm-panel-hover p-6 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Trophy size={26} color="#C89B3C" className="mb-2" />
                    <div className="font-bold text-lg">국제전</div>
                    <div className="text-xs mt-1 lm-muted">{canJoinIntl ? '8개 구단 토너먼트 참가 가능' : '지역 리그 상위 2위 안에 들어야 참가 가능'}</div>
                  </button>
                )}
              </>
            );
          })()}
        </div>
        <button onClick={handleReset} className="mt-8 text-xs flex items-center gap-1 lm-dim lm-hover-muted">
          <RotateCcw size={12} /> 구단 초기화하고 새로 시작
        </button>
        {leagueStartConfirm && (
          <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 50 }}>
            <div className={`${panel} p-6 max-w-sm w-full text-center`}>
              <div className="text-lg font-bold mb-2">경기를 시작하시겠습니까?</div>
              <div className="text-sm mb-6 lm-muted">경기가 시작되면 매치가 끝날 때까지 스크림을 할 수 없습니다.</div>
              <div className="flex gap-3">
                <button onClick={() => setLeagueStartConfirm(null)} className={`${btnGhost} flex-1 py-2.5 text-sm`}>취소하기</button>
                <button onClick={handleConfirmLeagueStart} className={`${btnPrimary} flex-1 py-2.5 text-sm`}>진행하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderRoster() {
    const filteredPositions = rosterFilter === 'ALL' ? POSITIONS : [rosterFilter];
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header subtitle="선수단 관리" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setRosterFilter('ALL')} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rosterFilter === 'ALL' ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>전체</button>
          {POSITIONS.map((pos) => (
            <button key={pos} onClick={() => setRosterFilter(pos)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${rosterFilter === pos ? 'lm-filter-tab-active' : 'lm-filter-tab'}`}>
              {POS_LABEL[pos]}
            </button>
          ))}
        </div>
        <div className="text-xs mb-4 lm-muted">선수 카드의 1군/2군 배지를 탭하면 보직을 바로 전환할 수 있어요.</div>
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
                            <User size={30} color="#3A4670" />
                          </div>
                          <button
                            onClick={() => handleSetTier(p.id, p.tier === '1군' ? '2군' : '1군')}
                            title="탭하여 1군/2군 전환"
                          >
                            <TierBadge tier={p.tier} />
                          </button>
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
                        {faDeclareId === p.id ? (
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="number"
                              value={faPriceInput}
                              onChange={(e) => setFaPriceInput(e.target.value)}
                              placeholder="가격(P)"
                              className="lm-input rounded-lg px-2 py-1 text-xs w-full"
                            />
                            <div className="flex gap-1.5">
                              <button onClick={() => handleDeclareFA(p.id, faPriceInput)} disabled={!faPriceInput || Number(faPriceInput) <= 0} className="text-xs px-2 py-1 rounded lm-btn-primary font-semibold flex-1 disabled:opacity-40 disabled:cursor-not-allowed">등록</button>
                              <button onClick={() => { setFaDeclareId(null); setFaPriceInput(''); }} className="text-xs px-2 py-1 rounded lm-btn-ghost flex-1">취소</button>
                            </div>
                          </div>
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
                            <button onClick={() => { setFaDeclareId(p.id); setFaPriceInput(String(p.value)); }} className="text-xs px-2 py-1 rounded lm-btn-ghost" style={{ color: '#38BDF8' }}>FA선언</button>
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

  function renderRankings() {
    const region = game.club.region || REGIONS[0];
    const domestic = REGION_CLUBS[region].map((c) => ({ ...c, isUser: false }));
    if (game.club.qualifiedRank) {
      domestic.push({ name: game.club.name, power: (game.club.qualifiedWins || 0) * 40, isUser: true, region });
    }
    domestic.sort((a, b) => b.power - a.power);
    const international = getInternationalQualifiers(game);

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Header subtitle="랭킹" />
        <button onClick={() => setScreen('home')} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 홈으로</button>

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
            <div className="text-sm font-semibold mb-3">국제전 진출권 순위 (지역별 1위 6팀 + 와일드카드 2팀)</div>
            <div className="space-y-1.5">
              {international.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm" style={{ borderBottom: i < international.length - 1 ? '1px solid #1D2740' : 'none', paddingBottom: 6, color: c.isUser ? '#D9AE55' : undefined }}>
                  <span className={c.isUser ? 'font-bold' : 'lm-muted'}>{i + 1}위 · {c.name}{c.isUser ? ' (우리 구단)' : ''}</span>
                  <span className="text-xs lm-muted">{c.region} · 파워 {c.power}</span>
                </div>
              ))}
            </div>
            {game.club.internationalResult && (
              <div className="text-xs mt-3" style={{ color: '#2DD4C6' }}>지난 국제전 결과: {game.club.internationalResult}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderOnlineMatch() {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
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
      </div>
    );
  }

  function renderMatchHistory() {
    const history = game.matchHistory || [];
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
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
      <div className="max-w-3xl mx-auto p-4 md:p-8">
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
          <button onClick={() => handlePull(1)} disabled={game.club.budget < SINGLE_PULL_COST} className={`${panel} lm-panel-hover p-5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}>
            <div className="font-bold text-lg mb-1">1회 뽑기</div>
            <div className="text-xs lm-muted">{shopPositionFilter === 'ALL' ? '무작위 포지션' : POS_LABEL[shopPositionFilter]} 선수 1명 영입</div>
            <div className="text-sm mt-2 font-semibold" style={{ color: '#D9AE55' }}>{SINGLE_PULL_COST.toLocaleString()} P</div>
          </button>
          <button onClick={() => handlePull(MULTI_PULL_COUNT)} disabled={game.club.budget < MULTI_PULL_COST} className={`${panel} lm-panel-hover p-5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}>
            <div className="font-bold text-lg mb-1">{MULTI_PULL_COUNT}회 뽑기</div>
            <div className="text-xs lm-muted">{shopPositionFilter === 'ALL' ? '무작위 포지션' : POS_LABEL[shopPositionFilter]} 선수 {MULTI_PULL_COUNT}명 영입 (10% 할인)</div>
            <div className="text-sm mt-2 font-semibold" style={{ color: '#D9AE55' }}>{MULTI_PULL_COST.toLocaleString()} P</div>
          </button>
        </div>

        <div className={`${panel} p-3 mb-8`}>
          <div className="text-xs lm-muted">확률 · 에픽 8% / 레어 22% / 커먼 70%</div>
        </div>

        {/* FA 시장 */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">FA 시장</div>
          <button onClick={handleRefreshMarket} className={`${btnGhost} px-3 py-1.5 text-xs flex items-center gap-1`}>
            <RotateCcw size={12} /> 시장 새로고침
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
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
                  <User size={30} color="#3A4670" />
                </div>
                <div className="flex items-center gap-1">
                  <PosBadge position={l.position} />
                  <TierBadge tier={l.tier} />
                </div>
              </div>

              <div className="text-center text-xs lm-muted">OVR <b className="lm-text-value">{l.overall}</b> · 잠재력 <b className="lm-text-value">{l.potential}</b></div>
              <div className="text-center text-xs mb-2 lm-muted truncate">{l.fromClub}</div>
              <div className="text-center text-sm font-semibold mb-2" style={{ color: '#D9AE55' }}>{l.price.toLocaleString()} P</div>
              <button onClick={() => handleBuyFA(l.id)} disabled={game.club.budget < l.price} className={`${btnPrimary} w-full py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed`}>구매</button>
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
                              <User size={22} color="#3A4670" />
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
              <div className="space-y-1">
                <StatBar label="피지컬" value={p.mechanics} color="#F59E0B" />
                <StatBar label="운영" value={p.gameSense} color="#8B5CF6" />
                <StatBar label="한타" value={p.teamfight} color="#EF4444" />
                <StatBar label="라인전" value={p.laning} color="#38BDF8" />
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => handleChallenge(club, clubDetailTier)} className={`${btnPrimary} w-full py-3 text-sm`}>{clubDetailTier}으로 도전하기</button>
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
          <h2 className="text-3xl tracking-wide" style={displayFont}>{phaseLabel}</h2>
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

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`${panel} p-3`}>
            <div className="text-xs mb-1 lm-muted">우리 팀 밴 / 픽</div>
            <div className="flex flex-wrap gap-1 mb-1">
              {draft.userBans.map((c, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded lm-ban-tag">{c}</span>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {draft.userPicks.map((c, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded lm-pick-tag-user">{c}</span>)}
            </div>
          </div>
          <div className={`${panel} p-3`}>
            <div className="text-xs mb-1 lm-muted">상대 팀 밴 / 픽</div>
            <div className="flex flex-wrap gap-1 mb-1">
              {draft.aiBans.map((c, i) => <span key={i} className="text-xs px-1.5 py-0.5 rounded lm-ban-tag">{c}</span>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {draft.aiPicks.map((c, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded lm-pick-tag-ai">
                  {draft.phase === 'done' ? `${POS_LABEL[POSITIONS[i]]} · ${c}` : c}
                </span>
              ))}
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
                        <svg viewBox="0 0 40 40" width="26" height="26">
                          <path d="M20 4 C11 4 6 11 6 20 V26 C6 30 9 33 13 33 H27 C31 33 34 30 34 26 V20 C34 11 29 4 20 4 Z" fill="#D9AE55" stroke="#1B2A55" strokeWidth="1.5" />
                          <rect x="18" y="3" width="4" height="8" fill="#3B5BDB" />
                          <path d="M18 18 V33 M13 24 H27" stroke="#0A0E17" strokeWidth="2.2" strokeLinecap="round" />
                          <path d="M6 20 L1.5 22 L6 26 Z" fill="#3B5BDB" />
                          <path d="M34 20 L38.5 22 L34 26 Z" fill="#3B5BDB" />
                          <line x1="11" y1="33" x2="29" y2="15" stroke="#C7CDD9" strokeWidth="3.2" strokeLinecap="square" />
                          <path d="M29 15 L34 8 L31 18 Z" fill="#E5E9F0" />
                          <line x1="14" y1="30" x2="19" y2="25" stroke="#D9AE55" strokeWidth="2" strokeLinecap="round" />
                          <line x1="9" y1="35" x2="11.5" y2="32.5" stroke="#3B2A1A" strokeWidth="2.4" strokeLinecap="round" />
                          <circle cx="8" cy="36" r="1.8" fill="#D9AE55" />
                        </svg>
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
            <div className="text-4xl leading-none" style={displayFont}>{s.userScore} : {s.aiScore}</div>
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

    const progressNode = (
      <div className="h-1.5 rounded-full overflow-hidden lm-track">
        {s.finished ? (
          <div className="h-full" style={{ width: '100%', backgroundColor: '#C89B3C' }} />
        ) : (
          <div className="h-full animate-pulse" style={{ width: '100%', backgroundColor: '#C89B3C', opacity: 0.35 }} />
        )}
      </div>
    );

    const teamPanelsNode = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={`${panel} p-3`}>
          <div className="text-xs font-semibold mb-2" style={{ color: '#38BDF8' }}>우리 팀</div>
          {s.userLineup.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: i < s.userLineup.length - 1 ? '1px solid #1D2740' : 'none' }}>
              <span className="flex items-center gap-1.5"><PosBadge position={p.position} /> {p.name} <span className="lm-dim">({p.champion})</span></span>
              <span className="font-mono lm-text-value">{p.kills}/{p.deaths}/{p.assists}</span>
            </div>
          ))}
        </div>
        <div className={`${panel} p-3`}>
          <div className="text-xs font-semibold mb-2" style={{ color: '#EF4444' }}>상대 팀</div>
          {s.aiLineup.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: i < s.aiLineup.length - 1 ? '1px solid #1D2740' : 'none' }}>
              <span className="flex items-center gap-1.5"><PosBadge position={p.position} /> {p.name} <span className="lm-dim">({p.champion})</span></span>
              <span className="font-mono lm-text-value">{p.kills}/{p.deaths}/{p.assists}</span>
            </div>
          ))}
        </div>
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
          <path d="M 0,36 Q 32,30 44,48 Q 58,68 100,60" stroke="rgba(80,175,215,0.65)" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          <path d="M 0,36 Q 32,30 44,48 Q 58,68 100,60" stroke="rgba(210,240,250,0.55)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 10,90 L 10,18 Q 10,8 20,8 L 90,8" stroke="rgba(230,215,165,0.65)" strokeWidth="1.8" fill="none" strokeDasharray="2.6 2" />
          <path d="M 10,90 L 82,90 Q 92,90 92,80 L 92,10" stroke="rgba(230,215,165,0.65)" strokeWidth="1.8" fill="none" strokeDasharray="2.6 2" />
          <path d="M 12,86 Q 50,50 88,14" stroke="rgba(230,215,165,0.5)" strokeWidth="1.8" fill="none" strokeDasharray="2.6 2" />
          {BLUE_TOWERS.map((pt, i) => i >= s.objectives.ai.towers && (
            <circle key={'bt' + i} cx={pt.x} cy={pt.y} r="1.9" fill="#3B82F6" fillOpacity="0.85" stroke="#BFDBFE" strokeWidth="0.5" />
          ))}
          {RED_TOWERS.map((pt, i) => i >= s.objectives.user.towers && (
            <circle key={'rt' + i} cx={pt.x} cy={pt.y} r="1.9" fill="#EF4444" fillOpacity="0.85" stroke="#FECACA" strokeWidth="0.5" />
          ))}
          <polygon points="10,89.3 12.3,93 10,96.7 7.7,93" fill="#60CFFF" fillOpacity="0.95" stroke="#DBF3FF" strokeWidth="0.3" />
          <polygon points="90,4.3 92.3,8 90,11.7 87.7,8" fill="#FF6B6B" fillOpacity="0.95" stroke="#FFE1E1" strokeWidth="0.3" />
          <polygon
            points={`${ZONES.topRiver.x * 100},${ZONES.topRiver.y * 100 - 2.6} ${ZONES.topRiver.x * 100 + 2.6},${ZONES.topRiver.y * 100} ${ZONES.topRiver.x * 100},${ZONES.topRiver.y * 100 + 2.6} ${ZONES.topRiver.x * 100 - 2.6},${ZONES.topRiver.y * 100}`}
            fill="#C084FC" fillOpacity="0.85" stroke="#F3E8FF" strokeWidth="0.3" className="animate-pulse"
          />
          <polygon
            points={`${ZONES.botRiver.x * 100},${ZONES.botRiver.y * 100 - 2.6} ${ZONES.botRiver.x * 100 + 2.6},${ZONES.botRiver.y * 100} ${ZONES.botRiver.x * 100},${ZONES.botRiver.y * 100 + 2.6} ${ZONES.botRiver.x * 100 - 2.6},${ZONES.botRiver.y * 100}`}
            fill="#FB923C" fillOpacity="0.85" stroke="#FFEDD5" strokeWidth="0.3" className="animate-pulse"
          />
        </svg>
        {[[0.16, 0.26, 11], [0.32, 0.15, 9], [0.24, 0.36, 8], [0.66, 0.3, 10], [0.8, 0.6, 11], [0.7, 0.4, 8], [0.2, 0.72, 12], [0.6, 0.6, 9], [0.12, 0.58, 8], [0.86, 0.2, 8]].map(([bx, by, sz], bi) => (
          <div key={bi} className="absolute rounded-full" style={{ left: `${bx * 100}%`, top: `${by * 100}%`, width: `${sz}%`, height: `${sz}%`, background: 'radial-gradient(circle, rgba(52,180,100,0.7), rgba(52,180,100,0.15) 65%, transparent 85%)', border: '1px solid rgba(74,222,128,0.35)' }} />
        ))}
        <div className="absolute rounded-full" style={{ left: '16%', top: '58%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: '76%', top: '38%', width: '9%', height: '9%', background: 'radial-gradient(circle, rgba(250,204,21,0.55), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: `${(ZONES.topRiver.x - 0.07) * 100}%`, top: `${(ZONES.topRiver.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(192,132,252,0.5), transparent 75%)' }} />
        <div className="absolute rounded-full" style={{ left: `${(ZONES.botRiver.x - 0.07) * 100}%`, top: `${(ZONES.botRiver.y - 0.07) * 100}%`, width: '14%', height: '14%', background: 'radial-gradient(circle, rgba(251,146,60,0.5), transparent 75%)' }} />
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
          <div className="mb-3">{progressNode}</div>
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
        <div className="mb-6">{progressNode}</div>
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
    const allDamage = [
      ...r.details.map((d) => ({ ...d, team: 'user' })),
      ...r.aiDetails.map((d) => ({ ...d, team: 'ai' })),
    ].sort((a, b) => b.damage - a.damage);
    const maxDamage = Math.max(...allDamage.map((d) => d.damage), 1);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="text-center mb-6">
          <div className="grid grid-cols-3 items-center mb-2">
            <div className="text-left">
              <div className="font-bold truncate">{game.club.name}</div>
              <div className="text-sm font-bold" style={{ color: r.win ? '#2DD4C6' : '#EF4444' }}>{r.win ? '승리' : '패배'}</div>
            </div>
            <div>
              <div className="text-4xl tracking-wide" style={displayFont}>{r.userScore} : {r.aiScore}</div>
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
          <div className="text-sm font-semibold mb-3">선수별 딜량</div>
          <div className="space-y-2">
            {allDamage.map((d) => (
              <div key={d.team + '-' + d.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <PosBadge position={d.position} />
                    <span style={{ color: d.team === 'user' ? '#38BDF8' : '#EF4444' }}>{d.name}</span>
                    <span className="lm-dim">({d.champion})</span>
                  </span>
                  <span className="lm-text-value font-mono">{d.damage.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden lm-track">
                  <div className="h-full rounded-full" style={{ width: `${(d.damage / maxDamage) * 100}%`, backgroundColor: d.team === 'user' ? '#3B82F6' : '#EF4444' }} />
                </div>
              </div>
            ))}
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
      </div>
    );
  }

  function renderLeagueRosterSetup() {
    const canConfirm = POSITIONS.every((pos) => (entryPoolDraft[pos] || []).length > 0);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <button onClick={handleCancelLeagueSetup} className={`${btnGhost} px-4 py-2 text-sm mb-4`}>← 취소</button>
        <Header subtitle={`${game.league ? game.league.roundLabel : ''} · 리그 로스터 등록`} />
        <div className={`${panel} p-4 mb-4`}>
          <div className="text-sm font-semibold mb-1">포지션별 엔트리 최대 2명 선택</div>
          <div className="text-xs lm-muted">여기서 정한 로스터는 이번 리그 전체에 적용돼요. 경기마다 등록된 2명 중 출전 선수를 골라 번갈아 기용할 수 있어요.</div>
        </div>
        <div className="space-y-5">
          {POSITIONS.map((pos) => {
            const candidates = game.players.filter((p) => p.position === pos);
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
    let intlNextOpponent = null, intlChampion = false, intlEliminated = false;

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
        intlNextOpponent = league.roundIndex === 0 ? league.shadow.semiOpponent : league.shadow.finalOpponent;
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
            <div className="text-2xl font-bold mb-1" style={{ color: '#C89B3C' }}>국제전 우승!</div>
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
              <div className="text-xs" style={{ color: '#2DD4C6' }}>국제전 진출 자격을 획득했습니다!</div>
            ) : (
              <div className="text-xs lm-muted">국제전 진출에는 상위 2위 안에 들어야 해요.</div>
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
          {intlNextOpponent && (
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
      {screen === 'matchHistory' && game && renderMatchHistory()}
      {screen === 'rankings' && game && renderRankings()}
      {screen === 'onlineMatch' && game && renderOnlineMatch()}
      {screen === 'recruit' && game && renderRecruit()}
      {screen === 'matchSelect' && game && renderMatchSelect()}
      {screen === 'clubDetail' && game && viewingClub && viewingClubRosters && renderClubDetail()}
      {screen === 'lineup' && game && selectedOpponent && renderLineup()}
      {screen === 'leagueRosterSetup' && game && game.league && renderLeagueRosterSetup()}
      {screen === 'leagueSchedule' && game && game.league && renderLeagueSchedule()}
      {screen === 'draftIntro' && draft && renderDraftIntro()}
      {screen === 'draft' && draft && renderDraft()}
      {screen === 'sim' && sim && renderSim()}
      {screen === 'result' && lastResult && renderResult()}
      {screen === 'gameWait' && lastResult && renderGameWait()}
      {screen === 'seriesResult' && lastResult && game.league && renderSeriesResult()}
    </div>
  );
}
