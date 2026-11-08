# gemjar-stats

An onchain stats dashboard for [GemJar](https://github.com/DevVichy/GemJar)'s `PrizePool` and `SavingsJar` contracts on Celo Mainnet.

## What it shows

- **Right now:** read straight from the contracts. Current round, entry cost, savings rate, this round's pool, and the USDm held in each contract.
- **History:** per-round entries, unique players, USDm staked, top score and top player, plus totals paid to players and saved to jars. Built from the contracts' `Staked`, `ScoreSubmitted`, `Claimed`, `Deposited` and `Withdrawn` events.

If nobody has played yet, the history section says so instead of showing made-up numbers.

## How it works

```
Celo RPC --getLogs--> scripts/index.ts --> public/data/stats.json --> static dashboard
        \--readContract--------------------------------------------> live tiles
```

- **Indexer** (`scripts/index.ts`): scans events in 5,000-block chunks, because the public forno RPC rejects wider `eth_getLogs` ranges. It is incremental: each run resumes from `lastBlock` stored in the JSON file.
- **Aggregation** (`src/aggregate.ts`): pure functions that fold events into per-round and savings stats. Amounts are stored as decimal strings so full `uint256` values survive JSON.
- **Dashboard** (`src/main.ts`): a plain Vite + TypeScript page. No framework, and the chart is hand-written SVG.
- **Refresh:** `.github/workflows/refresh-stats.yml` runs the indexer daily and commits changes to the JSON file.

## Run it

```bash
npm install
npm run index   # first run scans from the deployment block (about 4 minutes)
npm run dev
```

```bash
npm test        # aggregation and formatting tests
npm run build   # static output in dist/
```

## Contracts

| Contract | Proxy address (Celo Mainnet) |
| --- | --- |
| PrizePool | `0xf508930cC806936700abfD9bAEb7534558684Ed0` |
| SavingsJar | `0x734c2B09DB7c790d298ad639697b6ab02C452A83` |

## License

MIT
