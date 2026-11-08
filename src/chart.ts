import type { RoundStats } from "./types";
import { roundDate } from "./aggregate";
import { formatUnits } from "./format";
import { TOKEN_DECIMALS } from "./config";

const SVG = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Bar chart of USDm staked per round. Returns a labelled SVG for the most recent `limit` rounds. */
export function stakedChart(rounds: RoundStats[], limit = 30): SVGSVGElement {
  const data = rounds.slice(-limit);
  const W = 800, H = 220, padL = 44, padB = 28, padT = 8;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "USDm staked per round" });

  const max = data.reduce((m, r) => (BigInt(r.staked) > m ? BigInt(r.staked) : m), 0n);
  const plotW = W - padL - 8;
  const plotH = H - padB - padT;
  const slot = plotW / Math.max(data.length, 1);

  svg.append(el("line", { class: "axis", x1: padL, y1: padT + plotH, x2: W - 8, y2: padT + plotH }));

  const top = el("text", { x: padL - 6, y: padT + 10, "text-anchor": "end" });
  top.textContent = formatUnits(max, TOKEN_DECIMALS, 0);
  const zero = el("text", { x: padL - 6, y: padT + plotH, "text-anchor": "end" });
  zero.textContent = "0";
  svg.append(top, zero);

  data.forEach((r, i) => {
    const value = BigInt(r.staked);
    const h = max === 0n ? 0 : Number((value * 1000n) / max) / 1000 * plotH;
    const x = padL + i * slot + slot * 0.15;
    const bar = el("rect", { class: "bar", x, y: padT + plotH - h, width: slot * 0.7, height: Math.max(h, value > 0n ? 1 : 0), rx: 2 });
    const title = el("title", {});
    title.textContent = `${roundDate(r.roundId)}: ${formatUnits(value, TOKEN_DECIMALS)} USDm, ${r.entries} entries`;
    bar.append(title);
    svg.append(bar);

    if (i === 0 || i === data.length - 1) {
      const label = el("text", { x: x + slot * 0.35, y: H - 8, "text-anchor": i === 0 ? "start" : "end" });
      label.textContent = roundDate(r.roundId).slice(5);
      svg.append(label);
    }
  });

  return svg;
}
