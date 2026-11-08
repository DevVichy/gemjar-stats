import { parseAbi } from "viem";

export const prizePoolEvents = parseAbi([
  "event Staked(address indexed player, uint256 indexed roundId, uint256 amount)",
  "event ScoreSubmitted(address indexed player, uint256 indexed roundId, uint256 score)",
  "event Claimed(address indexed player, uint256 indexed roundId, uint256 toPlayer, uint256 toSavings)",
]);

export const savingsJarEvents = parseAbi([
  "event Deposited(address indexed account, uint256 amount, uint256 streak)",
  "event Withdrawn(address indexed account, uint256 amount)",
]);
