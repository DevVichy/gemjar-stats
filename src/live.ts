import { createPublicClient, http, parseAbi, type Address } from "viem";
import { PRIZE_POOL, RPC_URL, SAVINGS_JAR } from "./config";

const prizePoolAbi = parseAbi([
  "function currentRound() view returns (uint256)",
  "function stakeAmount() view returns (uint256)",
  "function savingsRateBps() view returns (uint256)",
  "function stakingToken() view returns (address)",
  "function totalPool(uint256 roundId) view returns (uint256)",
]);

const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export interface LiveStats {
  currentRound: bigint;
  stakeAmount: bigint;
  savingsRateBps: bigint;
  stakingToken: Address;
  currentRoundPool: bigint;
  poolTokenBalance: bigint;
  savingsJarTokenBalance: bigint;
}

/** Reads current on-chain state directly from the contracts. */
export async function readLive(): Promise<LiveStats> {
  const client = createPublicClient({ transport: http(RPC_URL) });

  const [currentRound, stakeAmount, savingsRateBps, stakingToken] = await Promise.all([
    client.readContract({ address: PRIZE_POOL, abi: prizePoolAbi, functionName: "currentRound" }),
    client.readContract({ address: PRIZE_POOL, abi: prizePoolAbi, functionName: "stakeAmount" }),
    client.readContract({ address: PRIZE_POOL, abi: prizePoolAbi, functionName: "savingsRateBps" }),
    client.readContract({ address: PRIZE_POOL, abi: prizePoolAbi, functionName: "stakingToken" }),
  ]);

  const [currentRoundPool, poolTokenBalance, savingsJarTokenBalance] = await Promise.all([
    client.readContract({ address: PRIZE_POOL, abi: prizePoolAbi, functionName: "totalPool", args: [currentRound] }),
    client.readContract({ address: stakingToken, abi: erc20Abi, functionName: "balanceOf", args: [PRIZE_POOL] }),
    client.readContract({ address: stakingToken, abi: erc20Abi, functionName: "balanceOf", args: [SAVINGS_JAR] }),
  ]);

  return { currentRound, stakeAmount, savingsRateBps, stakingToken, currentRoundPool, poolTokenBalance, savingsJarTokenBalance };
}
