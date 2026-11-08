import type { Address } from "viem";
import type { GemJarEvent, RoundStats, SavingsStats, StatsState } from "./types";

export function emptyState(chainId: number, startBlock: number): StatsState {
  return {
    version: 1,
    chainId,
    lastBlock: startBlock - 1,
    updatedAt: new Date(0).toISOString(),
    rounds: {},
    savings: { deposits: 0, deposited: "0", withdrawals: 0, withdrawn: "0", savers: [], longestStreak: 0 },
  };
}

function emptyRound(roundId: number): RoundStats {
  return {
    roundId,
    entries: 0,
    staked: "0",
    players: [],
    scoreSubmissions: 0,
    topScore: "0",
    topPlayer: null,
    claims: 0,
    paidToPlayers: "0",
    paidToSavings: "0",
  };
}

const add = (a: string, b: bigint) => (BigInt(a) + b).toString();

function addUnique(list: Address[], address: Address) {
  const lower = address.toLowerCase();
  if (!list.some((a) => a.toLowerCase() === lower)) list.push(address);
}

function round(state: StatsState, roundId: bigint): RoundStats {
  const key = roundId.toString();
  return (state.rounds[key] ??= emptyRound(Number(roundId)));
}

/**
 * Folds decoded events into `state` and returns it. Events must be passed in
 * chain order. Mutates and returns the same object.
 */
export function applyEvents(state: StatsState, events: readonly GemJarEvent[]): StatsState {
  for (const e of events) {
    switch (e.name) {
      case "Staked": {
        const r = round(state, e.roundId);
        r.entries += 1;
        r.staked = add(r.staked, e.amount);
        addUnique(r.players, e.player);
        break;
      }
      case "ScoreSubmitted": {
        const r = round(state, e.roundId);
        r.scoreSubmissions += 1;
        if (e.score > BigInt(r.topScore)) {
          r.topScore = e.score.toString();
          r.topPlayer = e.player;
        }
        break;
      }
      case "Claimed": {
        const r = round(state, e.roundId);
        r.claims += 1;
        r.paidToPlayers = add(r.paidToPlayers, e.toPlayer);
        r.paidToSavings = add(r.paidToSavings, e.toSavings);
        break;
      }
      case "Deposited": {
        const s: SavingsStats = state.savings;
        s.deposits += 1;
        s.deposited = add(s.deposited, e.amount);
        addUnique(s.savers, e.account);
        s.longestStreak = Math.max(s.longestStreak, Number(e.streak));
        break;
      }
      case "Withdrawn": {
        state.savings.withdrawals += 1;
        state.savings.withdrawn = add(state.savings.withdrawn, e.amount);
        break;
      }
    }
  }
  return state;
}

export interface Totals {
  rounds: number;
  entries: number;
  staked: bigint;
  uniquePlayers: number;
  paidToPlayers: bigint;
  paidToSavings: bigint;
  savingsBalance: bigint;
  savers: number;
}

export function totals(state: StatsState): Totals {
  const players = new Set<string>();
  let entries = 0;
  let staked = 0n;
  let paidToPlayers = 0n;
  let paidToSavings = 0n;
  const rounds = Object.values(state.rounds);
  for (const r of rounds) {
    entries += r.entries;
    staked += BigInt(r.staked);
    paidToPlayers += BigInt(r.paidToPlayers);
    paidToSavings += BigInt(r.paidToSavings);
    for (const p of r.players) players.add(p.toLowerCase());
  }
  return {
    rounds: rounds.length,
    entries,
    staked,
    uniquePlayers: players.size,
    paidToPlayers,
    paidToSavings,
    savingsBalance: BigInt(state.savings.deposited) - BigInt(state.savings.withdrawn),
    savers: state.savings.savers.length,
  };
}

/** Rounds sorted by id ascending. */
export function sortedRounds(state: StatsState): RoundStats[] {
  return Object.values(state.rounds).sort((a, b) => a.roundId - b.roundId);
}

/** Converts a round id to the UTC date it started (rounds are `timestamp / 86400`). */
export function roundDate(roundId: number): string {
  return new Date(roundId * 86_400_000).toISOString().slice(0, 10);
}
