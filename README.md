# btc-race-24h-20261123-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/giiordi/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/giiordi/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A patient trend-rider bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain bars: it only buys a confirmed uptrend (close 1% above its 120-bar average), then holds to the end, and if no trend ever confirms it takes one small late probe so the run still trades. Backtested on the published dev window: +$19.88 net PnL with a single trade (buy-and-hold on the same window: +$32.17, but -$38.68 on the mirrored falling window, where this bot stays flat at $0.00 and, with its probe, -$1.24).

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout (one JSON line per minute bar, one reply per batch). Grade it locally with the competition kit:

```sh
node cli/makefun.mjs grade-local --kit . --bot <repository> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=v0wjehd6&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
