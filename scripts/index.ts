/**
 * Incremental indexer. Scans PrizePool and SavingsJar events in 5,000-block
 * chunks (forno's eth_getLogs limit), folds them into stats, and writes
 * public/data/stats.json. Re-running resumes from the last scanned block.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { prizePoolEvents, savingsJarEvents } from "../src/abi";
import { applyEvents, emptyState } from "../src/aggregate";
import { CHAIN_ID, MAX_BLOCK_RANGE, PRIZE_POOL, RPC_URL, SAVINGS_JAR, START_BLOCK } from "../src/config";
import type { GemJarEvent, StatsState } from "../src/types";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/stats.json");
const CONCURRENCY = 8;
const RETRIES = 4;

const client = createPublicClient({ transport: http(RPC_URL, { retryCount: 0 }) });

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
}

async function loadState(): Promise<StatsState> {
  try {
    return JSON.parse(await readFile(OUT, "utf8")) as StatsState;
  } catch {
    return emptyState(CHAIN_ID, Number(START_BLOCK));
  }
}

async function fetchRange(fromBlock: bigint, toBlock: bigint): Promise<GemJarEvent[]> {
  const [pool, jar] = await Promise.all([
    withRetry(() => client.getLogs({ address: PRIZE_POOL, events: prizePoolEvents, fromBlock, toBlock })),
    withRetry(() => client.getLogs({ address: SAVINGS_JAR, events: savingsJarEvents, fromBlock, toBlock })),
  ]);
  const logs = [...pool, ...jar].sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1,
  );
  return logs.map((log) => ({ name: log.eventName, ...log.args }) as GemJarEvent);
}

async function main() {
  const state = await loadState();
  const latest = await client.getBlockNumber();
  let next = BigInt(state.lastBlock) + 1n;

  if (next > latest) {
    console.log("Already up to date.");
    return;
  }

  const total = Number((latest - next) / MAX_BLOCK_RANGE) + 1;
  console.log(`Scanning blocks ${next}..${latest} (${total} chunks)`);

  let done = 0;
  while (next <= latest) {
    const ranges: Array<[bigint, bigint]> = [];
    for (let i = 0; i < CONCURRENCY && next <= latest; i++) {
      const to = next + MAX_BLOCK_RANGE - 1n > latest ? latest : next + MAX_BLOCK_RANGE - 1n;
      ranges.push([next, to]);
      next = to + 1n;
    }

    const results = await Promise.all(ranges.map(([from, to]) => fetchRange(from, to)));
    for (const events of results) applyEvents(state, events);

    state.lastBlock = Number(ranges[ranges.length - 1]![1]);
    state.updatedAt = new Date().toISOString();
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify(state, null, 2) + "\n");

    done += ranges.length;
    if (done % 100 < CONCURRENCY) console.log(`  ${done}/${total} chunks, block ${state.lastBlock}`);
  }

  console.log(`Done. ${Object.keys(state.rounds).length} rounds indexed through block ${state.lastBlock}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
