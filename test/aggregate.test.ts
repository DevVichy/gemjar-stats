import { describe, expect, it } from "vitest";
import { applyEvents, emptyState, roundDate, sortedRounds, totals } from "../src/aggregate";
import { formatUnits, shortAddress } from "../src/format";

const A1 = "0x00000000000000000000000000000000000000a1" as const;
const A2 = "0x00000000000000000000000000000000000000a2" as const;
const E18 = 10n ** 18n;

describe("applyEvents", () => {
  it("counts entries, stake and unique players per round", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Staked", player: A1, roundId: 5n, amount: E18 },
      { name: "Staked", player: A1, roundId: 5n, amount: E18 },
      { name: "Staked", player: A2, roundId: 5n, amount: E18 },
      { name: "Staked", player: A2, roundId: 6n, amount: E18 },
    ]);
    expect(s.rounds["5"]).toMatchObject({ entries: 3, staked: (3n * E18).toString() });
    expect(s.rounds["5"]?.players).toHaveLength(2);
    expect(s.rounds["6"]?.entries).toBe(1);
  });

  it("deduplicates players case-insensitively", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Staked", player: A1, roundId: 1n, amount: 1n },
      { name: "Staked", player: A1.toUpperCase().replace("0X", "0x") as typeof A1, roundId: 1n, amount: 1n },
    ]);
    expect(s.rounds["1"]?.players).toHaveLength(1);
  });

  it("tracks the top score and who set it", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "ScoreSubmitted", player: A1, roundId: 2n, score: 500n },
      { name: "ScoreSubmitted", player: A2, roundId: 2n, score: 900n },
      { name: "ScoreSubmitted", player: A1, roundId: 2n, score: 700n },
    ]);
    expect(s.rounds["2"]).toMatchObject({ scoreSubmissions: 3, topScore: "900", topPlayer: A2 });
  });

  it("sums claim payouts split between player and savings", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Claimed", player: A1, roundId: 3n, toPlayer: 90n, toSavings: 10n },
      { name: "Claimed", player: A2, roundId: 3n, toPlayer: 45n, toSavings: 5n },
    ]);
    expect(s.rounds["3"]).toMatchObject({ claims: 2, paidToPlayers: "135", paidToSavings: "15" });
  });

  it("tracks savings deposits, withdrawals, savers and the longest streak", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Deposited", account: A1, amount: 10n, streak: 1n },
      { name: "Deposited", account: A1, amount: 10n, streak: 2n },
      { name: "Deposited", account: A2, amount: 5n, streak: 1n },
      { name: "Withdrawn", account: A1, amount: 8n },
    ]);
    expect(s.savings).toMatchObject({ deposits: 3, deposited: "25", withdrawals: 1, withdrawn: "8", longestStreak: 2 });
    expect(s.savings.savers).toHaveLength(2);
  });

  it("starts scanning one block before the start block", () => {
    expect(emptyState(42220, 100).lastBlock).toBe(99);
  });
});

describe("totals", () => {
  it("aggregates across rounds and counts players once", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Staked", player: A1, roundId: 1n, amount: E18 },
      { name: "Staked", player: A1, roundId: 2n, amount: E18 },
      { name: "Staked", player: A2, roundId: 2n, amount: E18 },
      { name: "Claimed", player: A1, roundId: 1n, toPlayer: 4n, toSavings: 1n },
      { name: "Deposited", account: A1, amount: 1n, streak: 1n },
      { name: "Withdrawn", account: A1, amount: 1n },
    ]);
    const t = totals(s);
    expect(t).toMatchObject({ rounds: 2, entries: 3, uniquePlayers: 2, paidToPlayers: 4n, paidToSavings: 1n, savingsBalance: 0n, savers: 1 });
    expect(t.staked).toBe(3n * E18);
  });
});

describe("sortedRounds and roundDate", () => {
  it("sorts rounds by id", () => {
    const s = applyEvents(emptyState(42220, 100), [
      { name: "Staked", player: A1, roundId: 9n, amount: 1n },
      { name: "Staked", player: A1, roundId: 3n, amount: 1n },
    ]);
    expect(sortedRounds(s).map((r) => r.roundId)).toEqual([3, 9]);
  });

  it("converts a round id to its UTC start date", () => {
    expect(roundDate(0)).toBe("1970-01-01");
    expect(roundDate(20_000)).toBe("2024-10-04");
  });
});

describe("formatUnits", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatUnits(15n * 10n ** 17n, 18)).toBe("1.5");
    expect(formatUnits(1_234_567n * E18, 18)).toBe("1,234,567");
    expect(formatUnits(0n, 18)).toBe("0");
  });

  it("truncates beyond maxFraction and handles small amounts", () => {
    expect(formatUnits(123456789012345678n, 18, 3)).toBe("0.123");
    expect(formatUnits(1n, 18)).toBe("0");
  });
});

describe("shortAddress", () => {
  it("shortens an address", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
});
