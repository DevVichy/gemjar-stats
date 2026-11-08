import type { Address } from "viem";

/** Amounts are stored as decimal strings so the JSON file can hold full uint256 values. */
export interface RoundStats {
  roundId: number;
  entries: number;
  staked: string;
  players: Address[];
  scoreSubmissions: number;
  topScore: string;
  topPlayer: Address | null;
  claims: number;
  paidToPlayers: string;
  paidToSavings: string;
}

export interface SavingsStats {
  deposits: number;
  deposited: string;
  withdrawals: number;
  withdrawn: string;
  savers: Address[];
  longestStreak: number;
}

export interface StatsState {
  version: 1;
  chainId: number;
  /** Highest block fully scanned. The next run resumes from lastBlock + 1. */
  lastBlock: number;
  updatedAt: string;
  rounds: Record<string, RoundStats>;
  savings: SavingsStats;
}

export type GemJarEvent =
  | { name: "Staked"; player: Address; roundId: bigint; amount: bigint }
  | { name: "ScoreSubmitted"; player: Address; roundId: bigint; score: bigint }
  | { name: "Claimed"; player: Address; roundId: bigint; toPlayer: bigint; toSavings: bigint }
  | { name: "Deposited"; account: Address; amount: bigint; streak: bigint }
  | { name: "Withdrawn"; account: Address; amount: bigint };
