// Patient trend rider for agent-fun/bars-replay/v1 (cbBTC, 1-minute bars).
//
// The idea, in one line: only buy a confirmed uptrend, then hold it to the
// end; if no trend ever confirms, take one small late probe so the run still
// trades. Everything is deterministic: closes only, no clock, no randomness,
// no environment, no network.
//
// Why this shape, from the dev window (24h of 1m cbBTC bars, BTC +3.6% with
// long choppy stretches):
//   - A round trip costs about 26 bps (4 bps fee + 2 bps slippage + ~7 bps of
//     price impact each way on a full-size order), so a trade has to catch a
//     move bigger than that. Fast signals churn through the chop and bleed.
//   - Buy-and-hold banks the whole drift (+$32 on dev) but rides a falling
//     window all the way down (-$39 on the mirrored window).
//   - Waiting for the close to clear its 120-bar average by 1% enters about
//     3 hours into a real uptrend and never enters a steady downtrend at
//     all. On dev that is +$19.88 with one trade; on the mirrored (falling)
//     window it stays flat at $0; on a doubled-drift rising window +$62.
//   - The probe: the race needs at least one filled trade to meet its
//     guardrail, and in a falling window the least-negative entry can still
//     take a place. If nothing has fired by bar 1200, buy a quarter of the
//     cash on a short-term uptick (close above its 30-bar average); if even
//     that never comes, buy the quarter unconditionally at bar 1380. A probe
//     in a falling window costs about $1.24 on the mirrored window.
//
// Rules, in order, each batch with a fresh CBBTC bar:
//   1. Holding anything: do nothing, ride it to the final flatten.
//   2. Close above SMA(120) + 100 bps, and the batch is at most 1380: buy
//      all the cash (one position, long only, no leverage).
//   3. From batch 1200, close above SMA(30): buy a quarter of the cash.
//   4. From batch 1380: buy a quarter of the cash, whatever the tape says.
//   5. Otherwise: no orders.
// A rejected order is simply retried on the next bar while its rule holds:
// the rules read the position, not a flag, so a fill is what moves the bot
// on. Warm-up batches build history but never trade. Missing bars (a minute
// with no sample) are skipped: no indicator update, no order.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

/** Long average the entry must clear, in bars. */
const SMA_LONG = 120;
/** Entry needs the close this many bps above the long average. */
const BAND_BPS = 100;
/** Short average the probe's uptick reads, in bars. */
const SMA_SHORT = 30;
/** First batch the probe may fire on. */
const PROBE_BAR = 1200;
/** Batch of the unconditional probe; also the last batch a main entry may fire on. */
const PROBE_BAR_LAST = 1380;
/** The probe buys this share of the cash: 1/4. */
const PROBE_NUM = 1n;
const PROBE_DEN = 4n;
/** Every order caps its fill this many bps past the latest close. */
const MAX_SLIPPAGE_BPS = 200;

/** Closes seen so far, oldest first; one symbol, one window. */
const closes: number[] = [];
/** Running sums of the last SMA_LONG / SMA_SHORT closes (float64, in order). */
let sumLong = 0;
let sumShort = 0;

/** The average of the last `span` closes, or null while there are fewer. */
function average(span: number, sum: number): number | null {
  if (closes.length < span) return null;
  return sum / span;
}

/** Fold a fresh bar into the averages, exactly as the backtest seeds them. */
function push(close: number): void {
  closes.push(close);
  sumLong += close;
  if (closes.length > SMA_LONG) sumLong -= closes[closes.length - 1 - SMA_LONG];
  sumShort += close;
  if (closes.length > SMA_SHORT) sumShort -= closes[closes.length - 1 - SMA_SHORT];
}

await runBars({
  onBatch(state: BarsState, batch): OrderInput[] {
    const bar = batch.bars.find((b) => b.symbol === 'CBBTC');
    if (bar === undefined) return [];
    push(Number(bar.c));
    if (state.warmingUp) return [];

    const close = Number(bar.c);
    const held = state.positions.get('CBBTC');
    if (held !== undefined) return [];

    const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
    const longAvg = average(SMA_LONG, sumLong);
    if (longAvg !== null && state.seq <= PROBE_BAR_LAST && close > longAvg + (close * BAND_BPS) / 10000) {
      if (state.cash < minNotional) return [];
      return [{ side: 'buy', symbol: 'CBBTC', notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }

    if (state.seq >= PROBE_BAR) {
      const shortAvg = average(SMA_SHORT, sumShort);
      const uptick = shortAvg !== null && close > shortAvg;
      if (uptick || state.seq >= PROBE_BAR_LAST) {
        const probe = (state.cash * PROBE_NUM) / PROBE_DEN;
        if (probe < minNotional) return [];
        return [{ side: 'buy', symbol: 'CBBTC', notional_quote_units: probe, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});
