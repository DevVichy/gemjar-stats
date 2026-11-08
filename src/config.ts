import type { Address } from "viem";

export const CHAIN_ID = 42220;
export const RPC_URL = "https://forno.celo.org";

/** GemJar UUPS proxies on Celo Mainnet (see github.com/DevVichy/GemJar). */
export const PRIZE_POOL: Address = "0xf508930cC806936700abfD9bAEb7534558684Ed0";
export const SAVINGS_JAR: Address = "0x734c2B09DB7c790d298ad639697b6ab02C452A83";

/** First block worth scanning: just before the proxies were deployed. */
export const START_BLOCK = 69_623_380n;

/** forno rejects eth_getLogs queries wider than 5,000 blocks. */
export const MAX_BLOCK_RANGE = 5_000n;

export const TOKEN_DECIMALS = 18;
