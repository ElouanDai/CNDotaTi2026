"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import currentScheduleData from "@/data/current_schedule.json";
import teamProfilesData from "@/data/team_profiles.json";

type RiskLevel = "conservative" | "standard" | "active";
type MatchStatus = "scheduled" | "settled" | "void";
type BetStatus = "open" | "won" | "lost" | "void";
type BetSide = "A" | "B";
type BetStrategy = "hedge-cn" | "cn-derby" | "foreign-edge" | "manual";

type Team = { id: string; name: string; region: string; china: boolean; strength: number; seed: "Invite" | "Qualifier" | "Custom" };
type Match = { id: string; date: string; time: string; stage: string; teamA: string; teamB: string; oddsA: number; oddsB: number; status: MatchStatus; winner?: BetSide; note?: string };
type Bet = { id: string; matchId: string; side: BetSide; team: string; odds: number; stake: number; status: BetStatus; strategy: BetStrategy; createdAt: string; note?: string };
type AppState = { initialBankroll: number; risk: RiskLevel; selectedDate: string; teams: Team[]; matches: Match[]; bets: Bet[] };
type Recommendation = { action: "bet" | "skip"; priority: "高" | "中" | "低" | "跳过"; side?: BetSide; team?: string; odds?: number; stake: number; rationale: string; modelProbability?: number; marketProbability?: number; edge?: number; strategy?: BetStrategy };
type MatchDraft = { date: string; time: string; stage: string; teamA: string; teamB: string; oddsA: string; oddsB: string; note: string };
type ManualDraft = { side: BetSide; stake: string };
type ScheduleMatchInput = { id: string; date: string; time: string; stage: string; format?: string; team_a: string; team_b: string; odds_a: number | null; odds_b: number | null; status?: string; notes?: string };
type TeamProfile = {
  team_id: string;
  team_name: string;
  short_name: string;
  region: string;
  is_chinese_team: boolean;
  logo_path: string;
  style_tags: string[];
  bp_identity: string;
  hero_pool: string;
  laning: string;
  tempo: string;
  teamfight: string;
  pressure_points: string;
  hedge_note: string;
  confidence: "low" | "medium" | "high";
};

const STORAGE_KEY = "ti2026-betting-assistant-v1";
const EVENT_START_DATE = "2026-08-13";
const LEGACY_PRE_EVENT_DATE = "2026-08-12";
const INITIAL_BANKROLL = 981.42;
const SINGLE_MATCH_CAP = 0.055;
const RISK_CONFIG: Record<RiskLevel, { label: string; multiplier: number; dailyCap: number; description: string }> = {
  conservative: { label: "保守", multiplier: 0.72, dailyCap: 0.1, description: "保留资金，单日建议不超过 10%" },
  standard: { label: "标准", multiplier: 1, dailyCap: 0.15, description: "按对冲计划，单日建议不超过 15%" },
  active: { label: "积极", multiplier: 1.32, dailyCap: 0.2, description: "加大强队对冲，单日建议不超过 20%" },
};
const TOURNAMENT_DAYS = [
  { date: "2026-08-13", label: "瑞士轮 D1", stage: "小组赛" },
  { date: "2026-08-14", label: "瑞士轮 D2", stage: "小组赛" },
  { date: "2026-08-15", label: "瑞士轮 D3", stage: "小组赛" },
  { date: "2026-08-16", label: "瑞士轮 D4", stage: "小组赛" },
  { date: "2026-08-20", label: "主赛事 D1", stage: "双败淘汰" },
  { date: "2026-08-21", label: "主赛事 D2", stage: "双败淘汰" },
  { date: "2026-08-22", label: "主赛事 D3", stage: "双败淘汰" },
  { date: "2026-08-23", label: "总决赛日", stage: "双败淘汰" },
];
const DEFAULT_TEAMS: Team[] = [
  { id: "team-yandex", name: "Team Yandex", region: "EEU", china: false, strength: 92, seed: "Invite" },
  { id: "onew-team", name: "Iron Wing", region: "EEU", china: false, strength: 91, seed: "Invite" },
  { id: "boomboys", name: "BoomBoys", region: "EEU", china: false, strength: 90, seed: "Invite" },
  { id: "team-falcons", name: "Team Falcons", region: "MESWA", china: false, strength: 89, seed: "Invite" },
  { id: "team-liquid", name: "Team Liquid", region: "WEU", china: false, strength: 88, seed: "Invite" },
  { id: "xtreme-gaming", name: "Xtreme Gaming", region: "China", china: true, strength: 88, seed: "Invite" },
  { id: "team-vision", name: "TEAM VISION", region: "Europe", china: false, strength: 87, seed: "Qualifier" },
  { id: "team-spirit", name: "Team Spirit", region: "Europe", china: false, strength: 86, seed: "Qualifier" },
  { id: "aurora-gaming", name: "Aurora Gaming", region: "EEU", china: false, strength: 85, seed: "Invite" },
  { id: "vici-gaming", name: "Vici Gaming", region: "China", china: true, strength: 79, seed: "Qualifier" },
  { id: "nigma-galaxy", name: "Nigma Galaxy", region: "Europe/MENA", china: false, strength: 78, seed: "Qualifier" },
  { id: "team-resilience", name: "Team Resilience", region: "China", china: true, strength: 76, seed: "Qualifier" },
  { id: "og", name: "OG", region: "SEA", china: false, strength: 74, seed: "Qualifier" },
  { id: "lgd-gaming", name: "LGD Gaming", region: "South America", china: false, strength: 73, seed: "Qualifier" },
  { id: "gamerlegion", name: "GamerLegion", region: "North America", china: false, strength: 72, seed: "Qualifier" },
  { id: "huligani", name: "HULIGANI", region: "Europe", china: false, strength: 70, seed: "Qualifier" },
];
const TEAM_PROFILES = teamProfilesData.profiles as TeamProfile[];
const DEFAULT_MATCHES: Match[] = ((currentScheduleData.matches ?? []) as ScheduleMatchInput[]).map((match) => ({
  id: match.id,
  date: match.date,
  time: match.time,
  stage: match.stage,
  teamA: canonicalTeamName(match.team_a),
  teamB: canonicalTeamName(match.team_b),
  oddsA: coercePositiveNumber(match.odds_a ?? 0),
  oddsB: coercePositiveNumber(match.odds_b ?? 0),
  status: coerceMatchStatus(match.status),
  note: match.notes ?? match.format ?? "",
}));
const DEFAULT_STATE: AppState = { initialBankroll: INITIAL_BANKROLL, risk: "standard", selectedDate: EVENT_START_DATE, teams: DEFAULT_TEAMS, matches: DEFAULT_MATCHES, bets: [] };
const EMPTY_MATCH: MatchDraft = { date: EVENT_START_DATE, time: "10:00", stage: "瑞士轮 R1", teamA: "Xtreme Gaming", teamB: "Team Spirit", oddsA: "", oddsB: "", note: "" };

function canonicalTeamName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (["1w team", "1win team", "iron wing"].includes(normalized)) return "Iron Wing";
  if (["betboom team", "bb team", "bb", "boomboys"].includes(normalized)) return "BoomBoys";
  return name.trim();
}
function coerceMatchStatus(status?: string): MatchStatus { return status === "settled" || status === "void" ? status : "scheduled"; }
function roundMoney(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }
function money(value: number) { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 2 }).format(roundMoney(value)); }
function pct(value?: number) { return value === undefined || !Number.isFinite(value) ? "-" : `${Math.round(value * 100)}%`; }
function makeId(prefix: string) { const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); return `${prefix}-${randomPart}`; }
function normalizeName(name: string) { return name.trim().toLowerCase(); }
function normalizeDateInput(value: string) { const trimmed = value.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed; const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})$/); if (!match) return trimmed; return `2026-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`; }
function coercePositiveNumber(value: string | number) { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
function matchScheduleKey(match: Pick<Match, "date" | "time" | "teamA" | "teamB">) { return [match.date, match.time, canonicalTeamName(match.teamA), canonicalTeamName(match.teamB)].map(normalizeName).join("|"); }
function normalizeTeamRecord(team: Team): Team {
  if (team.id === "onew-team" || ["1w team", "1win team"].includes(normalizeName(team.name))) return { ...team, name: "Iron Wing" };
  if (team.id === "boomboys" || ["betboom team", "bb team", "bb"].includes(normalizeName(team.name))) return { ...team, name: "BoomBoys" };
  return team;
}
function normalizeMatchRecord(match: Match): Match { return { ...match, teamA: canonicalTeamName(match.teamA), teamB: canonicalTeamName(match.teamB), status: coerceMatchStatus(match.status) }; }
function mergeDefaultOdds(match: Match) {
  const baseline = DEFAULT_MATCHES.find((defaultMatch) => matchScheduleKey(defaultMatch) === matchScheduleKey(match));
  if (!baseline) return match;
  return {
    ...match,
    stage: match.stage || baseline.stage,
    note: match.note || baseline.note,
    oddsA: match.oddsA > 1 ? match.oddsA : baseline.oddsA,
    oddsB: match.oddsB > 1 ? match.oddsB : baseline.oddsB,
  };
}
function mergeDefaultMatches(savedMatches: Match[]) {
  const normalized = savedMatches.filter((match) => match.date !== LEGACY_PRE_EVENT_DATE).map(normalizeMatchRecord).map(mergeDefaultOdds);
  const existingKeys = new Set(normalized.map(matchScheduleKey));
  const missingDefaults = DEFAULT_MATCHES.filter((match) => !existingKeys.has(matchScheduleKey(match)));
  return [...missingDefaults, ...normalized].sort(sortMatches);
}
function hydrateState(input?: Partial<AppState>): AppState {
  const teams = Array.isArray(input?.teams) && input.teams.length > 0 ? input.teams.map(normalizeTeamRecord) : DEFAULT_TEAMS;
  const matches = mergeDefaultMatches(Array.isArray(input?.matches) ? input.matches : []);
  const selectedDate = input?.selectedDate && input.selectedDate !== LEGACY_PRE_EVENT_DATE ? input.selectedDate : EVENT_START_DATE;
  return { ...DEFAULT_STATE, ...input, selectedDate, teams, matches, bets: Array.isArray(input?.bets) ? input.bets : [] };
}
function getTeam(state: AppState, name: string): Team { const canonicalName = canonicalTeamName(name); const existing = state.teams.find((team) => normalizeName(team.name) === normalizeName(canonicalName)); if (existing) return existing; const china = ["xtreme", "vici", "resilience"].some((keyword) => normalizeName(canonicalName).includes(keyword)); return { id: `custom-${normalizeName(canonicalName).replace(/[^a-z0-9]+/g, "-")}`, name: canonicalName.trim() || "未命名战队", region: china ? "China" : "Unknown", china, strength: china ? 72 : 70, seed: "Custom" }; }
function logisticProbability(diff: number) { const raw = 1 / (1 + Math.exp(-diff / 10)); return Math.min(0.92, Math.max(0.08, raw)); }
function impliedProbability(oddsA: number, oddsB: number) { if (oddsA <= 1 || oddsB <= 1) return { A: 0.5, B: 0.5 }; const invA = 1 / oddsA; const invB = 1 / oddsB; const total = invA + invB; return { A: invA / total, B: invB / total }; }
function calculateMetrics(state: AppState) { const settled = state.bets.reduce((sum, bet) => { if (bet.status === "won") return sum + bet.stake * (bet.odds - 1); if (bet.status === "lost") return sum - bet.stake; return sum; }, 0); const pending = state.bets.reduce((sum, bet) => (bet.status === "open" ? sum + bet.stake : sum), 0); const bankroll = roundMoney(state.initialBankroll + settled); return { bankroll, available: roundMoney(bankroll - pending), pending: roundMoney(pending), settled: roundMoney(settled), won: state.bets.filter((bet) => bet.status === "won").length, lost: state.bets.filter((bet) => bet.status === "lost").length }; }
function makeSkip(rationale: string): Recommendation { return { action: "skip", priority: "跳过", stake: 0, rationale }; }
function capStake(value: number, baseBalance: number) { return roundMoney(Math.min(value, baseBalance * SINGLE_MATCH_CAP)); }

function recommendForMatch(match: Match, state: AppState, baseBalance: number): Recommendation {
  const oddsA = coercePositiveNumber(match.oddsA);
  const oddsB = coercePositiveNumber(match.oddsB);
  if (match.status !== "scheduled") return makeSkip("比赛已结算");
  if (normalizeName(match.teamA) === normalizeName(match.teamB)) return makeSkip("队名重复，先修正赛程");
  if (oddsA <= 1 || oddsB <= 1) return makeSkip("等待录入有效赔率");
  if (baseBalance <= 0) return makeSkip("可用资金不足");
  const teamA = getTeam(state, match.teamA);
  const teamB = getTeam(state, match.teamB);
  const pA = logisticProbability(teamA.strength - teamB.strength);
  const pB = 1 - pA;
  const market = impliedProbability(oddsA, oddsB);
  const risk = RISK_CONFIG[state.risk];
  const oneChinese = teamA.china !== teamB.china;
  const bothChinese = teamA.china && teamB.china;

  if (oneChinese) {
    const chineseSide: BetSide = teamA.china ? "A" : "B";
    const opponentSide: BetSide = chineseSide === "A" ? "B" : "A";
    const chineseTeam = chineseSide === "A" ? teamA : teamB;
    const opponentTeam = opponentSide === "A" ? teamA : teamB;
    const opponentOdds = opponentSide === "A" ? oddsA : oddsB;
    if (opponentOdds < 1.12) return makeSkip("对手胜赔过低，对冲收益不足，保留资金");
    const strengthGap = opponentTeam.strength - chineseTeam.strength;
    let basePct = 0;
    let priority: Recommendation["priority"] = "低";
    let rationale = "中国队明显占优，对手胜率不足，建议暂不下注";
    if (strengthGap >= 8) { basePct = 0.045; priority = "高"; rationale = "中国队对手属于强队，对冲优先级高"; }
    else if (strengthGap >= 0) { basePct = 0.032; priority = "中"; rationale = "双方接近或对手略强，适合标准对冲"; }
    else if (strengthGap >= -8) { basePct = 0.018; priority = "低"; rationale = "中国队略强，只做小额情绪对冲"; }
    else if ((opponentSide === "A" ? oddsA : oddsB) >= 3.2) { basePct = 0.008; priority = "低"; rationale = "中国队优势大，仅在高赔率下保留极小对冲"; }
    else return makeSkip(rationale);
    if (opponentOdds < 1.22) { basePct *= 0.5; rationale = `${rationale}，但赔率偏低，金额折半`; }
    const stake = capStake(baseBalance * basePct * risk.multiplier, baseBalance);
    const modelProbability = opponentSide === "A" ? pA : pB;
    const marketProbability = opponentSide === "A" ? market.A : market.B;
    return { action: stake > 0 ? "bet" : "skip", priority, side: opponentSide, team: opponentTeam.name, odds: opponentSide === "A" ? oddsA : oddsB, stake, rationale, modelProbability, marketProbability, edge: modelProbability - marketProbability, strategy: "hedge-cn" };
  }

  if (bothChinese) {
    const favoriteSide: BetSide = teamA.strength >= teamB.strength ? "A" : "B";
    const favorite = favoriteSide === "A" ? teamA : teamB;
    const diff = Math.abs(teamA.strength - teamB.strength);
    if (diff < 12) return makeSkip("中国队内战，不主动扩大风险");
    const stake = capStake(baseBalance * 0.01 * risk.multiplier, baseBalance);
    const modelProbability = favoriteSide === "A" ? pA : pB;
    const marketProbability = favoriteSide === "A" ? market.A : market.B;
    return { action: stake > 0 ? "bet" : "skip", priority: "低", side: favoriteSide, team: favorite.name, odds: favoriteSide === "A" ? oddsA : oddsB, stake, rationale: "中国队内战只小额押明显优势方", modelProbability, marketProbability, edge: modelProbability - marketProbability, strategy: "cn-derby" };
  }

  const edgeA = pA - market.A;
  const edgeB = pB - market.B;
  const side: BetSide = edgeA >= edgeB ? "A" : "B";
  const modelProbability = side === "A" ? pA : pB;
  const marketProbability = side === "A" ? market.A : market.B;
  const edge = modelProbability - marketProbability;
  if (modelProbability < 0.62 || edge < 0.09) return makeSkip("外战把握不足，资金留给中国队对冲");
  const basePct = edge >= 0.16 ? 0.022 : edge >= 0.12 ? 0.017 : 0.012;
  const stake = capStake(baseBalance * basePct * risk.multiplier, baseBalance);
  return { action: stake > 0 ? "bet" : "skip", priority: edge >= 0.16 ? "中" : "低", side, team: side === "A" ? teamA.name : teamB.name, odds: side === "A" ? oddsA : oddsB, stake, rationale: "外战模型优势明显，可小额回补资金", modelProbability, marketProbability, edge, strategy: "foreign-edge" };
}

function buildDayRecommendations(state: AppState, date: string, baseBalance: number) {
  const openMatchIds = new Set(state.bets.filter((bet) => bet.status === "open").map((bet) => bet.matchId));
  const raw = state.matches.filter((match) => match.date === date).map((match) => {
    if (openMatchIds.has(match.id)) return [match.id, makeSkip("本场已有未结算投注")] as const;
    return [match.id, recommendForMatch(match, state, baseBalance)] as const;
  });
  const rawTotal = raw.reduce((sum, [, rec]) => sum + (rec.action === "bet" ? rec.stake : 0), 0);
  const capAmount = calculateMetrics(state).bankroll * RISK_CONFIG[state.risk].dailyCap;
  const scale = rawTotal > capAmount && rawTotal > 0 ? capAmount / rawTotal : 1;
  return new Map(raw.map(([matchId, rec]) => [matchId, rec.action === "bet" ? { ...rec, stake: roundMoney(rec.stake * scale) } : rec]));
}

function parseImportLine(line: string, selectedDate: string): MatchDraft | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const pipeParts = trimmed.split(/[|\t，]/).map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 7) return { date: normalizeDateInput(pipeParts[0]), time: pipeParts[1], stage: pipeParts[2], teamA: pipeParts[3], teamB: pipeParts[4], oddsA: pipeParts[5], oddsB: pipeParts[6], note: pipeParts.slice(7).join(" ") };
  if (pipeParts.length >= 5) return { date: normalizeDateInput(pipeParts[0]), time: pipeParts[1], stage: pipeParts[2], teamA: pipeParts[3], teamB: pipeParts[4], oddsA: "", oddsB: "", note: pipeParts.slice(5).join(" ") };
  const regex = /^(?:(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2})\s+)?(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+(?:vs|VS|对阵)\s+(.+?)\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)$/;
  const match = trimmed.match(regex);
  if (!match) return null;
  return { date: normalizeDateInput(match[1] ?? selectedDate), time: match[2] ?? "待定", stage: "瑞士轮", teamA: match[3].trim(), teamB: match[4].trim(), oddsA: match[5], oddsB: match[6], note: "" };
}
function sortMatches(a: Match, b: Match) { return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`, "zh-CN"); }
function strategyLabel(strategy: BetStrategy) { return { "hedge-cn": "中国队对冲", "cn-derby": "中国内战", "foreign-edge": "外战回补", manual: "手动" }[strategy]; }
function statusLabel(status: BetStatus) { return { open: "未结算", won: "赢", lost: "输", void: "走水" }[status]; }
function teamInitials(name: string) {
  const normalized = normalizeName(name);
  if (normalized.includes("xtreme")) return "XG";
  if (normalized.includes("vici")) return "VG";
  if (normalized.includes("resilience")) return "TR";
  if (normalized.includes("liquid")) return "TL";
  if (normalized.includes("falcons")) return "FLC";
  if (normalized.includes("betboom") || normalized.includes("boomboys")) return "BB";
  const initials = name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("");
  return (initials || name.slice(0, 2)).slice(0, 3).toUpperCase();
}
function getTeamProfile(team: Team): TeamProfile {
  const profile = TEAM_PROFILES.find((item) => item.team_id === team.id || normalizeName(item.team_name) === normalizeName(team.name));
  if (profile) return profile;
  return {
    team_id: team.id,
    team_name: team.name,
    short_name: teamInitials(team.name),
    region: team.region,
    is_chinese_team: team.china,
    logo_path: "",
    style_tags: ["待更新", team.china ? "中国队" : "自定义"],
    bp_identity: "暂无稳定样本，后续需要根据最新 BP 和比赛录像补充。",
    hero_pool: "待从近期比赛和公开统计中更新。",
    laning: "待观察对线强度、分路和前 10 分钟经济差。",
    tempo: "待观察中期控图、肉山和推进节奏。",
    teamfight: "待观察正面团、反手和买活处理。",
    pressure_points: "资料不足时降低投注权重。",
    hedge_note: team.china ? "按中国队规则处理，但建议先补充资料。" : "资料不足，不作为外战主动下注依据。",
    confidence: "low",
  };
}
function confidenceLabel(confidence: TeamProfile["confidence"]) { return { low: "低样本", medium: "中等", high: "高" }[confidence]; }

export default function Home() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [matchDraft, setMatchDraft] = useState<MatchDraft>(EMPTY_MATCH);
  const [bulkText, setBulkText] = useState("");
  const [manualDrafts, setManualDrafts] = useState<Record<string, ManualDraft>>({});

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as AppState;
          setState(hydrateState(parsed));
        } catch {
          setState(DEFAULT_STATE);
        }
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [loaded, state]);

  const metrics = useMemo(() => calculateMetrics(state), [state]);
  const dayMatches = useMemo(() => state.matches.filter((match) => match.date === state.selectedDate).sort(sortMatches), [state.matches, state.selectedDate]);
  const recommendations = useMemo(() => buildDayRecommendations(state, state.selectedDate, Math.max(0, metrics.available)), [metrics.available, state]);
  const dayRecommendedTotal = dayMatches.reduce((sum, match) => { const rec = recommendations.get(match.id); return sum + (rec?.action === "bet" ? rec.stake : 0); }, 0);
  const openBets = state.bets.filter((bet) => bet.status === "open");
  const settledBets = state.bets.filter((bet) => bet.status !== "open");
  const chinaTeams = state.teams.filter((team) => team.china);
  const xgTeam = state.teams.find((team) => normalizeName(team.name).includes("xtreme"));
  const selectedDay = TOURNAMENT_DAYS.find((day) => day.date === state.selectedDate);
  const chinaOpenBets = openBets.filter((bet) => chinaTeams.some((team) => normalizeName(team.name) === normalizeName(bet.team)));
  const hedgeOpenBets = openBets.filter((bet) => bet.strategy === "hedge-cn");
  const xgInPlay = dayMatches.some((match) => [match.teamA, match.teamB].some((team) => normalizeName(team).includes("xtreme")));

  function updateState(updater: (current: AppState) => AppState) { setState((current) => updater(current)); }
  function addMatchFromDraft(draft: MatchDraft) { const oddsA = coercePositiveNumber(draft.oddsA); const oddsB = coercePositiveNumber(draft.oddsB); if (!draft.teamA.trim() || !draft.teamB.trim()) return false; const match: Match = { id: makeId("match"), date: normalizeDateInput(draft.date || state.selectedDate), time: draft.time.trim() || "待定", stage: draft.stage.trim() || "赛程", teamA: canonicalTeamName(draft.teamA), teamB: canonicalTeamName(draft.teamB), oddsA, oddsB, status: "scheduled", note: draft.note.trim() }; updateState((current) => ({ ...current, selectedDate: match.date, matches: [...current.matches, match].sort(sortMatches) })); return true; }
  function handleAddMatch() { if (addMatchFromDraft(matchDraft)) setMatchDraft({ ...EMPTY_MATCH, date: normalizeDateInput(matchDraft.date || state.selectedDate) }); }
  function handleBulkImport() { const drafts = bulkText.split(/\r?\n/).map((line) => parseImportLine(line, state.selectedDate)).filter((draft): draft is MatchDraft => Boolean(draft)); const matches: Match[] = drafts.map((draft) => ({ id: makeId("match"), date: normalizeDateInput(draft.date || state.selectedDate), time: draft.time.trim() || "待定", stage: draft.stage.trim() || "赛程", teamA: canonicalTeamName(draft.teamA), teamB: canonicalTeamName(draft.teamB), oddsA: coercePositiveNumber(draft.oddsA), oddsB: coercePositiveNumber(draft.oddsB), status: "scheduled" as MatchStatus, note: draft.note.trim() })).filter((match) => match.teamA && match.teamB); if (matches.length === 0) return; updateState((current) => ({ ...current, selectedDate: matches[0]?.date ?? current.selectedDate, matches: [...current.matches, ...matches].sort(sortMatches) })); setBulkText(""); }
  function updateMatch(matchId: string, patch: Partial<Match>) { updateState((current) => ({ ...current, matches: current.matches.map((match) => match.id === matchId ? { ...match, ...patch } : match) })); }
  function removeMatch(matchId: string) { if (!confirm("删除这场比赛和关联投注？")) return; updateState((current) => ({ ...current, matches: current.matches.filter((match) => match.id !== matchId), bets: current.bets.filter((bet) => bet.matchId !== matchId) })); }
  function addBet(match: Match, side: BetSide, stake: number, strategy: BetStrategy, note = "") { const odds = side === "A" ? match.oddsA : match.oddsB; const team = side === "A" ? match.teamA : match.teamB; if (stake <= 0 || odds <= 1 || metrics.available < stake) return; const bet: Bet = { id: makeId("bet"), matchId: match.id, side, team, odds, stake: roundMoney(stake), status: "open", strategy, createdAt: new Date().toISOString(), note }; updateState((current) => ({ ...current, bets: [bet, ...current.bets] })); }
  function applyRecommendation(match: Match) { const rec = recommendations.get(match.id); if (!rec || rec.action !== "bet" || !rec.side || !rec.strategy) return; addBet(match, rec.side, rec.stake, rec.strategy, rec.rationale); }
  function applyManualBet(match: Match) { const draft = manualDrafts[match.id] ?? { side: "A", stake: "" }; addBet(match, draft.side, coercePositiveNumber(draft.stake), "manual", "手动录入"); setManualDrafts((current) => ({ ...current, [match.id]: { ...draft, stake: "" } })); }
  function settleMatch(matchId: string, winner: BetSide | "void") { updateState((current) => ({ ...current, matches: current.matches.map((match) => match.id === matchId ? winner === "void" ? { ...match, status: "void", winner: undefined } : { ...match, status: "settled", winner } : match), bets: current.bets.map((bet) => { if (bet.matchId !== matchId || bet.status !== "open") return bet; if (winner === "void") return { ...bet, status: "void" }; return { ...bet, status: bet.side === winner ? "won" : "lost" }; }) })); }
  function reopenMatch(matchId: string) { updateState((current) => ({ ...current, matches: current.matches.map((match) => match.id === matchId ? { ...match, status: "scheduled", winner: undefined } : match), bets: current.bets.map((bet) => bet.matchId === matchId ? { ...bet, status: "open" } : bet) })); }
  function removeBet(betId: string) { if (!confirm("删除这笔投注？")) return; updateState((current) => ({ ...current, bets: current.bets.filter((bet) => bet.id !== betId) })); }
  function updateTeam(teamId: string, patch: Partial<Team>) { updateState((current) => ({ ...current, teams: current.teams.map((team) => team.id === teamId ? { ...team, ...patch } : team) })); }
  function exportBackup() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ti2026-betting-backup-${state.selectedDate}.json`; anchor.click(); URL.revokeObjectURL(url); }
  function importBackup(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(String(reader.result)) as AppState; if (!Array.isArray(imported.teams) || !Array.isArray(imported.matches) || !Array.isArray(imported.bets)) return; setState(hydrateState(imported)); } catch { return; } }; reader.readAsText(file); event.target.value = ""; }
  function resetAll() { if (!confirm("清空本地数据并恢复初始资金？")) return; setState(DEFAULT_STATE); setMatchDraft(EMPTY_MATCH); setBulkText(""); setManualDrafts({}); }

  return (
    <main className="app-shell">
      <section className="top-band">
        <div className="stage-atmosphere" aria-hidden="true" />
        <div className="top-inner hero-grid">
          <div className="hero-copy">
            <div className="event-kicker"><span className="rune-dot">◆</span> DOTA 2 · THE INTERNATIONAL 2026 · SHANGHAI</div>
            <h1>CN Aegis Hedge Room</h1>
            <p className="hero-subtitle">围绕 Xtreme Gaming 与中国赛区目标管理情绪对冲：赛程、赔率、建议和结算集中在一个本地战情台。</p>
            <div className="hero-badges" aria-label="重点战队">
              <div className="xg-crest" title="Xtreme Gaming focus"><span>XG</span><small>CN CORE</small></div>
              <div className="cn-crest"><span>CN</span><small>{chinaTeams.length} TEAMS</small></div>
              <div className="ti-crest"><span>TI</span><small>{selectedDay?.stage ?? "本地策略"}</small></div>
            </div>
          </div>
          <div className="aegis-showcase" aria-label="TI2026 官方神盾视觉">
            <div className="aegis-art" role="img" aria-label="TI2026 Aegis official visual" />
            <div className="showcase-overlay">
              <span>THE AEGIS IN SHANGHAI</span>
              <strong>{xgInPlay ? "XG 今日出战" : "等待当日赛程"}</strong>
            </div>
          </div>
          <div className="command-panel" aria-label="资金总览">
            <div className="panel-title"><span>COMMAND STACK</span><strong>{state.selectedDate}</strong></div>
            <div className="stats-grid compact-stats">
              <div className="stat-tile emphasis"><span>当前资金</span><strong>{money(metrics.bankroll)}</strong></div>
              <div className="stat-tile"><span>可用余额</span><strong>{money(metrics.available)}</strong></div>
              <div className="stat-tile"><span>未结算敞口</span><strong>{money(metrics.pending)}</strong></div>
              <div className="stat-tile"><span>今日建议</span><strong>{money(dayRecommendedTotal)}</strong></div>
              <div className="stat-tile"><span>已结算盈亏</span><strong className={metrics.settled >= 0 ? "positive" : "negative"}>{money(metrics.settled)}</strong></div>
              <div className="stat-tile"><span>战绩</span><strong>{metrics.won}-{metrics.lost}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="control-band">
        <div className="control-frame">
          <div className="control-grid">
            <label className="field compact"><span>初始资金</span><input type="number" min="0" step="0.01" value={state.initialBankroll} onChange={(event) => updateState((current) => ({ ...current, initialBankroll: coercePositiveNumber(event.target.value) }))} /></label>
            <label className="field compact"><span>操作日期</span><input type="date" value={state.selectedDate} onChange={(event) => updateState((current) => ({ ...current, selectedDate: event.target.value }))} /></label>
            <div className="segmented" aria-label="风险档位">
              {(Object.keys(RISK_CONFIG) as RiskLevel[]).map((risk) => <button key={risk} type="button" className={state.risk === risk ? "active" : ""} onClick={() => updateState((current) => ({ ...current, risk }))}>{RISK_CONFIG[risk].label}</button>)}
            </div>
            <div className="backup-actions">
              <button type="button" className="secondary" onClick={exportBackup}>导出备份</button>
              <label className="file-button">导入备份<input type="file" accept="application/json" onChange={importBackup} /></label>
              <button type="button" className="danger ghost" onClick={resetAll}>清空</button>
            </div>
          </div>
          <div className="day-strip">
            {TOURNAMENT_DAYS.map((day) => <button key={day.date} type="button" className={state.selectedDate === day.date ? "selected" : ""} onClick={() => updateState((current) => ({ ...current, selectedDate: day.date }))}><span>{day.label}</span><small>{day.date.slice(5)}</small></button>)}
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="main-column">
          <section className="tool-panel">
            <div className="section-heading">
              <div><p className="eyebrow">{state.selectedDate}</p><h2>赛程录入</h2></div>
              <div className="heading-metric"><span>今日建议下注</span><strong>{money(dayRecommendedTotal)}</strong></div>
            </div>
            <div className="match-form">
              <label className="field"><span>日期</span><input type="date" value={matchDraft.date} onChange={(event) => setMatchDraft((draft) => ({ ...draft, date: event.target.value }))} /></label>
              <label className="field narrow"><span>时间</span><input value={matchDraft.time} onChange={(event) => setMatchDraft((draft) => ({ ...draft, time: event.target.value }))} /></label>
              <label className="field"><span>阶段</span><select value={matchDraft.stage} onChange={(event) => setMatchDraft((draft) => ({ ...draft, stage: event.target.value }))}><option>瑞士轮</option><option>淘汰赛胜者组</option><option>淘汰赛败者组</option><option>总决赛</option><option>其他</option></select></label>
              <label className="field team-input"><span>A 队</span><input list="team-options" value={matchDraft.teamA} onChange={(event) => setMatchDraft((draft) => ({ ...draft, teamA: event.target.value }))} /></label>
              <label className="field team-input"><span>B 队</span><input list="team-options" value={matchDraft.teamB} onChange={(event) => setMatchDraft((draft) => ({ ...draft, teamB: event.target.value }))} /></label>
              <label className="field narrow"><span>A 赔率</span><input type="number" min="1.01" step="0.01" value={matchDraft.oddsA} onChange={(event) => setMatchDraft((draft) => ({ ...draft, oddsA: event.target.value }))} /></label>
              <label className="field narrow"><span>B 赔率</span><input type="number" min="1.01" step="0.01" value={matchDraft.oddsB} onChange={(event) => setMatchDraft((draft) => ({ ...draft, oddsB: event.target.value }))} /></label>
              <label className="field note-input"><span>备注</span><input value={matchDraft.note} onChange={(event) => setMatchDraft((draft) => ({ ...draft, note: event.target.value }))} /></label>
              <button type="button" className="primary add-match" onClick={handleAddMatch}>添加比赛</button>
            </div>
            <div className="bulk-import">
              <label className="field"><span>批量导入</span><textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder="2026-08-13 | 12:00 | 瑞士轮 | Xtreme Gaming | Team Falcons | 1.72 | 2.10" /></label>
              <button type="button" className="secondary" onClick={handleBulkImport}>导入赛程</button>
            </div>
            <datalist id="team-options">{state.teams.map((team) => <option value={team.name} key={team.id} />)}</datalist>
          </section>

          <section className="match-list" aria-label="今日比赛">
            {dayMatches.length === 0 ? (
              <div className="empty-state"><h3>当天暂无比赛</h3><p>录入赛程和赔率后，这里会自动计算建议下注方向和金额。</p></div>
            ) : dayMatches.map((match) => {
              const rec = recommendations.get(match.id) ?? makeSkip("等待计算");
              const matchBets = state.bets.filter((bet) => bet.matchId === match.id);
              const draft = manualDrafts[match.id] ?? { side: "A", stake: "" };
              const teamA = getTeam(state, match.teamA);
              const teamB = getTeam(state, match.teamB);
              const profileA = getTeamProfile(teamA);
              const profileB = getTeamProfile(teamB);
              return (
                <article className={`match-card ${teamA.china || teamB.china ? "cn-match" : ""} ${[match.teamA, match.teamB].some((team) => normalizeName(team).includes("xtreme")) ? "xg-match" : ""}`} key={match.id}>
                  <div className="match-main">
                    <div className="match-meta"><span>{match.time}</span><span>{match.stage}</span><span className={match.status === "scheduled" ? "status open" : "status closed"}>{match.status === "scheduled" ? "未结算" : match.status === "void" ? "走水" : "已结算"}</span></div>
                    <div className="teams-row">
                      <div className={`team-block ${teamA.china ? "china-side" : ""}`}>
                        <div className="team-title-line"><span className={`mini-crest match-crest ${profileA.logo_path ? "has-team-logo" : ""}`}>{profileA.logo_path ? <span className="match-logo-image" style={{ backgroundImage: `url(${profileA.logo_path})` }} aria-label={`${match.teamA} logo`} role="img" /> : teamInitials(match.teamA)}</span><strong>{match.teamA}</strong></div>
                        <span>{teamA.china ? "中国队" : teamA.region} · 强度 {teamA.strength}</span>
                      </div>
                      <div className="versus"><span>VS</span><small>BO3</small></div>
                      <div className={`team-block align-right ${teamB.china ? "china-side" : ""}`}>
                        <div className="team-title-line right"><strong>{match.teamB}</strong><span className={`mini-crest match-crest ${profileB.logo_path ? "has-team-logo" : ""}`}>{profileB.logo_path ? <span className="match-logo-image" style={{ backgroundImage: `url(${profileB.logo_path})` }} aria-label={`${match.teamB} logo`} role="img" /> : teamInitials(match.teamB)}</span></div>
                        <span>{teamB.china ? "中国队" : teamB.region} · 强度 {teamB.strength}</span>
                      </div>
                    </div>
                    {match.note ? <p className="match-note">{match.note}</p> : null}
                    <div className="odds-grid">
                      <label><span>A 赔率</span><input type="number" min="1.01" step="0.01" value={match.oddsA > 0 ? match.oddsA : ""} onChange={(event) => updateMatch(match.id, { oddsA: coercePositiveNumber(event.target.value) })} /></label>
                      <label><span>B 赔率</span><input type="number" min="1.01" step="0.01" value={match.oddsB > 0 ? match.oddsB : ""} onChange={(event) => updateMatch(match.id, { oddsB: coercePositiveNumber(event.target.value) })} /></label>
                    </div>
                  </div>
                  <div className="recommendation-box">
                    <div className="rec-topline"><span className={`priority p-${rec.priority}`}>{rec.priority}</span><strong>{rec.action === "bet" ? `押 ${rec.team}` : "不下注"}</strong></div>
                    <p>{rec.rationale}</p>
                    {rec.action === "bet" ? <div className="rec-numbers"><span>建议 {money(rec.stake)}</span><span>赔率 {rec.odds?.toFixed(2)}</span><span>模型 {pct(rec.modelProbability)}</span><span>盘面 {pct(rec.marketProbability)}</span></div> : null}
                    <button type="button" className="primary full" disabled={rec.action !== "bet" || rec.stake <= 0 || match.status !== "scheduled"} onClick={() => applyRecommendation(match)}>采用建议</button>
                  </div>
                  <div className="manual-box">
                    <div className="manual-controls">
                      <select value={draft.side} onChange={(event) => setManualDrafts((current) => ({ ...current, [match.id]: { ...draft, side: event.target.value as BetSide } }))}><option value="A">押 {match.teamA}</option><option value="B">押 {match.teamB}</option></select>
                      <input type="number" min="0" step="0.01" placeholder="金额" value={draft.stake} onChange={(event) => setManualDrafts((current) => ({ ...current, [match.id]: { ...draft, stake: event.target.value } }))} />
                      <button type="button" className="secondary" onClick={() => applyManualBet(match)}>手动下注</button>
                    </div>
                    <div className="settle-row"><button type="button" onClick={() => settleMatch(match.id, "A")}>A 胜</button><button type="button" onClick={() => settleMatch(match.id, "B")}>B 胜</button><button type="button" onClick={() => settleMatch(match.id, "void")}>走水</button>{match.status !== "scheduled" ? <button type="button" onClick={() => reopenMatch(match.id)}>撤销结算</button> : null}<button type="button" className="danger ghost" onClick={() => removeMatch(match.id)}>删除</button></div>
                    {matchBets.length > 0 ? <div className="bet-lines">{matchBets.map((bet) => <div className="bet-line" key={bet.id}><span>{strategyLabel(bet.strategy)}</span><strong>{bet.team}</strong><span>{money(bet.stake)} @ {bet.odds.toFixed(2)}</span><span className={`bet-status ${bet.status}`}>{statusLabel(bet.status)}</span><button type="button" className="text-button" onClick={() => removeBet(bet.id)}>撤单</button></div>)}</div> : null}
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        <aside className="side-column">
          <section className="tool-panel compact-panel xg-focus-panel">
            <div className="xg-panel-head">
              <div className="xg-crest large"><span>XG</span><small>XTREME</small></div>
              <div>
                <p className="eyebrow">CN PRIORITY</p>
                <h2>Xtreme Gaming</h2>
                <span>{xgTeam ? `模型强度 ${xgTeam.strength}` : "等待队伍资料"}</span>
              </div>
            </div>
            <div className="focus-meter"><span style={{ width: `${xgTeam ? xgTeam.strength : 88}%` }} /></div>
            <div className="focus-grid">
              <div><span>今日状态</span><strong>{xgInPlay ? "出战" : "未排入"}</strong></div>
              <div><span>CN 队伍</span><strong>{chinaTeams.length}</strong></div>
              <div><span>对冲单</span><strong>{hedgeOpenBets.length}</strong></div>
              <div><span>误押 CN</span><strong>{chinaOpenBets.length}</strong></div>
            </div>
          </section>

          <section className="tool-panel compact-panel">
            <div className="section-heading small"><h2>资金纪律</h2></div>
            <div className="discipline-list"><div><span>风险档位</span><strong>{RISK_CONFIG[state.risk].description}</strong></div><div><span>今日上限</span><strong>{money(metrics.bankroll * RISK_CONFIG[state.risk].dailyCap)}</strong></div><div><span>剩余可用</span><strong>{money(metrics.available)}</strong></div><div><span>中国队识别</span><strong>{chinaTeams.map((team) => team.name).join("、")}</strong></div></div>
          </section>
          <section className="tool-panel compact-panel rune-panel">
            <div className="section-heading small"><h2>未结算投注</h2><span>{openBets.length} 笔</span></div>
            <div className="side-list">{openBets.length === 0 ? <p className="muted">暂无未结算投注。</p> : openBets.map((bet) => <div className={`side-item ${bet.strategy === "hedge-cn" ? "hedge-item" : ""}`} key={bet.id}><strong>{bet.team}</strong><span>{strategyLabel(bet.strategy)} · {money(bet.stake)} @ {bet.odds.toFixed(2)}</span></div>)}</div>
          </section>
          <section className="tool-panel compact-panel">
            <div className="section-heading small"><h2>结算记录</h2><span>{settledBets.length} 笔</span></div>
            <div className="side-list history">{settledBets.length === 0 ? <p className="muted">暂无结算记录。</p> : settledBets.slice(0, 12).map((bet) => <div className="side-item" key={bet.id}><strong>{bet.team}</strong><span>{statusLabel(bet.status)} · {money(bet.status === "won" ? bet.stake * (bet.odds - 1) : bet.status === "lost" ? -bet.stake : 0)}</span></div>)}</div>
          </section>
        </aside>
      </section>

      <section className="team-section team-database">
        <div className="section-heading team-heading">
          <div><p className="eyebrow">Realtime team intelligence</p><h2>战队风格资料库</h2></div>
          <p className="muted">资料来自本地 `data/team_profiles.json`，后续可按 BP、对线、运营、团战样本持续更新。</p>
        </div>
        <div className="profile-grid">
          {state.teams.map((team) => {
            const profile = getTeamProfile(team);
            const isXgProfile = normalizeName(team.name).includes("xtreme");
            return (
              <article className={`profile-card ${team.china ? "china-profile" : ""} ${isXgProfile ? "xg-profile" : ""}`} key={team.id}>
                <div className="profile-header">
                  <div className="profile-logo-frame">{profile.logo_path ? <span className="profile-logo-image" style={{ backgroundImage: `url(${profile.logo_path})` }} aria-label={`${team.name} logo`} role="img" /> : <span>{profile.short_name}</span>}</div>
                  <div className="profile-title">
                    <p className="eyebrow">{team.china ? "CN TEAM" : profile.region}</p>
                    <h3>{team.name}</h3>
                    <span>{team.region} · {team.seed} · 模型 {team.strength}</span>
                  </div>
                  <span className={`confidence-pill confidence-${profile.confidence}`}>{confidenceLabel(profile.confidence)}</span>
                </div>
                <div className="style-tags">{profile.style_tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <div className="profile-axis">
                  <div><span>BP</span><p>{profile.bp_identity}</p></div>
                  <div><span>英雄池</span><p>{profile.hero_pool}</p></div>
                  <div><span>对线</span><p>{profile.laning}</p></div>
                  <div><span>运营</span><p>{profile.tempo}</p></div>
                  <div><span>团战</span><p>{profile.teamfight}</p></div>
                  <div><span>风险点</span><p>{profile.pressure_points}</p></div>
                </div>
                <div className="profile-hedge"><span>对冲备注</span><p>{profile.hedge_note}</p></div>
                <div className="profile-controls">
                  <label className="toggle-line"><input type="checkbox" checked={team.china} onChange={(event) => updateTeam(team.id, { china: event.target.checked })} />中国队</label>
                  <label className="strength-line profile-strength"><span>{team.strength}</span><input type="range" min="45" max="95" value={team.strength} onChange={(event) => updateTeam(team.id, { strength: Number(event.target.value) })} /></label>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}










