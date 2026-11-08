import "./style.css";
import { roundDate, sortedRounds, totals } from "./aggregate";
import { stakedChart } from "./chart";
import { TOKEN_DECIMALS } from "./config";
import { formatUnits, shortAddress } from "./format";
import { readLive } from "./live";
import type { StatsState } from "./types";

function tile(label: string, value: string, note?: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "tile";
  const l = document.createElement("div");
  l.className = "label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "value";
  v.textContent = value;
  root.append(l, v);
  if (note) {
    const n = document.createElement("div");
    n.className = "note";
    n.textContent = note;
    root.append(n);
  }
  return root;
}

const usdm = (v: bigint, fraction = 2) => `${formatUnits(v, TOKEN_DECIMALS, fraction)} USDm`;

async function renderLive() {
  const target = document.getElementById("live")!;
  try {
    const s = await readLive();
    target.replaceChildren(
      tile("Current round", `#${s.currentRound}`, roundDate(Number(s.currentRound))),
      tile("Entry cost", usdm(s.stakeAmount)),
      tile("Savings rate", `${Number(s.savingsRateBps) / 100}%`, "of each payout goes to the jar"),
      tile("This round's pool", usdm(s.currentRoundPool)),
      tile("Held in PrizePool", usdm(s.poolTokenBalance)),
      tile("Held in SavingsJar", usdm(s.savingsJarTokenBalance)),
    );
  } catch {
    target.textContent = "Could not read the contracts. Try again in a moment.";
  }
}

function renderHistory(state: StatsState) {
  const t = totals(state);
  document.getElementById("totals")!.replaceChildren(
    tile("Rounds with activity", String(t.rounds)),
    tile("Entries", String(t.entries)),
    tile("Unique players", String(t.uniquePlayers)),
    tile("Total staked", usdm(t.staked)),
    tile("Paid to players", usdm(t.paidToPlayers)),
    tile("Saved to jars", usdm(t.paidToSavings)),
  );

  const rounds = sortedRounds(state);
  const chart = document.getElementById("chart")!;
  const table = document.getElementById("rounds")!;

  if (rounds.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No stakes yet. The contracts are live and waiting for the first round of play.";
    chart.replaceChildren(empty);
    table.replaceChildren();
  } else {
    const caption = document.createElement("figcaption");
    caption.textContent = "USDm staked per round (latest 30)";
    chart.replaceChildren(stakedChart(rounds), caption);

    const head = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const h of ["Round", "Entries", "Players", "Staked", "Top score", "Top player"]) {
      const th = document.createElement("th");
      th.textContent = h;
      hr.append(th);
    }
    head.append(hr);
    const body = document.createElement("tbody");
    for (const r of [...rounds].reverse().slice(0, 14)) {
      const tr = document.createElement("tr");
      const cells = [
        `${roundDate(r.roundId)} (#${r.roundId})`,
        String(r.entries),
        String(r.players.length),
        usdm(BigInt(r.staked)),
        r.topScore === "0" ? "-" : r.topScore,
        r.topPlayer ? shortAddress(r.topPlayer) : "-",
      ];
      for (const c of cells) {
        const td = document.createElement("td");
        td.textContent = c;
        tr.append(td);
      }
      body.append(tr);
    }
    table.replaceChildren(head, body);
  }

  document.getElementById("updated")!.textContent =
    `History indexed through block ${state.lastBlock.toLocaleString()} (${state.updatedAt.slice(0, 16).replace("T", " ")} UTC).`;
}

async function renderHistoryFromFile() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/stats.json`);
    if (!res.ok) throw new Error(String(res.status));
    renderHistory((await res.json()) as StatsState);
  } catch {
    document.getElementById("updated")!.textContent = "History is not available yet. Run `npm run index`.";
  }
}

void renderLive();
void renderHistoryFromFile();
setInterval(() => void renderLive(), 30_000);
