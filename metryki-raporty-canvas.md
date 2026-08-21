# Weekly performance reports — 13–20 Aug 2026

One format for every metric on the scoreboard, read on the whole population: no release filter on the headline number, release comparisons underneath and always inside a single platform slice.

**How to read it.** The headline carries the target. The platform table says which platform the headline is actually about. The release table answers whether a version changed anything, and its verdict says whether that version is rolled out far enough to be worth calling. `native share` plus the mix flag say whether this week may be compared with the previous one at all.

**Fixed rules.** p95 everywhere, `n` always shown, release rows are the two newest releases with at least 500 measurements on that platform, a release is mature at 15% of that platform's volume in the window, and a week is flagged as not comparable when the native share moves by more than 5 points.

---

## 🔴 Bottom tab switch to Inbox — target 400 ms (p95)

`ManualNavigateToInboxTab` · **All p95 628 ms** (n 124K) · native share 40% · 🔴 mix shifted −12 pp, week not comparable

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 303 ms | 40K | −2% | ✅ |
| Android | 542 ms | 10K | +13% | 🔴 |
| Windows | 769 ms | 47K | flat | 🔴 |
| macOS | 555 ms | 26K | +2% | 🔴 |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 314 ms (n 7,090) | 9.4.52-11 · 349 ms (n 4,655) | −10% | mature (18% of volume) → comparable |
| Android | 9.4.54-4 · 445 ms (n 646) | 9.4.53-10 · 561 ms (n 897) | −21% | rolling out (6% of volume) → no verdict yet |

> web rows moved after the #98051 relabelling; native share dropped 12 pp w/w, so the All row is not comparable to last week

---

## 🟢 Bottom tab switch to Reports — target 400 ms (p95)

`ManualNavigateToReports` · **All p95 327 ms** (n 130K) · native share 32% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 274 ms | 32K | −4% | ✅ |
| Android | 594 ms | 9,134 | +6% | 🔴 |
| Windows | 350 ms | 60K | flat | ✅ |
| macOS | 193 ms | 28K | −1% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 259 ms (n 5,714) | 9.4.52-11 · 256 ms (n 3,682) | +1% | mature (18% of volume) → comparable |
| Android | 9.4.54-4 · 540 ms (n 582) | 9.4.53-10 · 556 ms (n 747) | −3% | rolling out (6% of volume) → no verdict yet |

---

## 🔴 Manual App start up time — target 5000 ms (p95)

`ManualAppStartup` · **All p95 5162 ms** (n 173K) · native share 11% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 5968 ms | 14K | −3% | 🔴 |
| Android | 6191 ms | 4,747 | +11% | 🔴 |
| Windows | 5614 ms | 83K | +4% | 🔴 |
| macOS | 2710 ms | 51K | +2% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.55-4 · 4848 ms (n 568) | 9.4.54-4 · 4520 ms (n 555) | +7% | rolling out (4% of volume) → no verdict yet |
| Android | 9.4.53-10 · 6311 ms (n 584) | 9.4.52-11 · 10274 ms (n 637) | −39% | rolling out (12% of volume) → no verdict yet |

> 10.8% of spans carry no os.name and are excluded from the platform rows but included in All

---

## 🔴 Opening Report — target 1000 ms (p95)

`ManualOpenReport` · **All p95 1158 ms** (n 1.05M) · native share 39% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 1166 ms | 320K | −5% | 🔴 |
| Android | 1595 ms | 88K | −1% | 🔴 |
| Windows | 1195 ms | 418K | flat | 🔴 |
| macOS | 742 ms | 223K | flat | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 969 ms (n 48K) | 9.4.52-11 · 1150 ms (n 31K) | −16% | rolling out (15% of volume) → no verdict yet |
| Android | 9.4.54-4 · 1317 ms (n 5,235) | 9.4.53-10 · 1472 ms (n 6,569) | −10% | rolling out (6% of volume) → no verdict yet |

---

## 🔴 Scan Capture to Confirmation Screen — target 400 ms (p95)

`ManualShutterToConfirmation` · **All p95 463 ms** (n 122K) · native share 100% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 376 ms | 86K | −2% | ✅ |
| Android | 705 ms | 36K | −10% | 🔴 |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 374 ms (n 12K) | 9.4.52-11 · 360 ms (n 9,086) | +4% | rolling out (14% of volume) → no verdict yet |
| Android | 9.4.54-4 · 574 ms (n 2,411) | 9.4.53-10 · 938 ms (n 2,780) | −39% | rolling out (7% of volume) → no verdict yet |

> native-only path, so All equals the two platform rows; the All move is driven by iOS volume falling 35% w/w

---

## 🔴 Opening Search bar — target 400 ms (p95)

`ManualOpenSearchRouter` · **All p95 575 ms** (n 5,642) · native share 48% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 476 ms | 1,766 | −3% | 🔴 |
| Android | 1218 ms | 956 | +21% | 🔴 |
| Windows | 378 ms | 1,886 | +2% | ✅ |
| macOS | 244 ms | 1,019 | +22% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 483 ms (n 286) | 9.4.52-11 · 428 ms (n 181) | +13% | mature (16% of volume) → comparable · below 500-sample floor |
| Android | 9.4.52-11 · 1391 ms (n 301) | 9.4.51-1 · 1078 ms (n 166) | +29% | mature (31% of volume) → comparable · below 500-sample floor |

> smallest sample on the board; release rows fall below the 500-sample floor, so they are indicative only

---

## 🔴 Sending message — target 300 ms (p95)

`ManualSendMessage` · **All p95 371 ms** (n 27K) · native share 28% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 629 ms | 5,754 | +10% | 🔴 |
| Android | 1188 ms | 1,945 | +79% | 🔴 |
| Windows | 274 ms | 12K | −8% | ✅ |
| macOS | 176 ms | 7,591 | −1% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 637 ms (n 1,244) | 9.4.52-11 · 519 ms (n 610) | +23% | mature (22% of volume) → comparable |
| Android | 9.4.54-4 · 475 ms (n 142) | 9.4.54-1 · 686 ms (n 124) | −31% | rolling out (7% of volume) → no verdict yet · below 500-sample floor |

> old timer, stops before the message is visible; see the next report for the visible-timer version of the same action

---

## 🔴 Sending message (visible timer) — target 300 ms (p95)

`ManualSendMessageVisible` · **All p95 477 ms** (n 15K) · native share 16% · 🔴 mix shifted −84 pp, week not comparable

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 760 ms | 1,690 | +102% | 🔴 |
| Android | 1199 ms | 605 | flat | 🔴 |
| Windows | 445 ms | 7,491 | — | 🔴 |
| macOS | 289 ms | 4,740 | — | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.54-1 · 413 ms (n 127) | 9.4.53-10 · 830 ms (n 1,244) | −50% | rolling out (8% of volume) → no verdict yet · below 500-sample floor |
| Android | 9.4.54-4 · 651 ms (n 142) | 9.4.54-1 · 1110 ms (n 124) | −41% | mature (23% of volume) → comparable · below 500-sample floor |

> timer is one week old, so w/w on All compares 14.6K measurements against 154; target 300 ms is inherited from the old timer and not yet agreed for this one

---

## 🟢 Time from submitting an expense to landing on the next screen — target 400 ms (p95)

`ManualSubmitToDestinationVisible` · **All p95 170 ms** (n 243K) · native share 60% · 🔴 mix shifted −5 pp, week not comparable

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 116 ms | 104K | flat | ✅ |
| Android | 153 ms | 42K | flat | ✅ |
| Windows | 285 ms | 57K | +6% | ✅ |
| macOS | 207 ms | 40K | +18% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 113 ms (n 12K) | 9.4.52-11 · 113 ms (n 9,084) | flat | rolling out (11% of volume) → no verdict yet |
| Android | 9.4.53-10 · 144 ms (n 3,069) | 9.4.52-11 · 147 ms (n 15K) | −2% | rolling out (7% of volume) → no verdict yet |

> one span covers four follow-up actions; every platform row is far inside target while the reported sub-metrics are not, which is the scenario-mixing case

---

## 🟡 Starting Create expense flow — target 400 ms (p95)

`ManualOpenCreateExpense` · **All p95 341 ms** (n 262K) · native share 63% · 🔴 mix shifted −5 pp, week not comparable

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 358 ms | 121K | −2% | ✅ |
| Android | 514 ms | 45K | +3% | 🔴 |
| Windows | 107 ms | 58K | flat | ✅ |
| macOS | 80 ms | 38K | −1% | ✅ |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.53-10 · 342 ms (n 16K) | 9.4.52-11 · 321 ms (n 11K) | +6% | rolling out (13% of volume) → no verdict yet |
| Android | 9.4.54-4 · 457 ms (n 2,978) | 9.4.53-10 · 484 ms (n 3,347) | −6% | rolling out (7% of volume) → no verdict yet |

> reported as 315 to 280 ms with the weekly release filter; without it the All row is flat at 343 to 341 ms

---

## ⚪ iOS Native Share Extension performance — target none set (p95)

`ShareExtensionOpenSubmitFlow` · **All p95 334 ms** (n 3,273) · native share 100% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 290 ms | 2,742 | −18% | — |
| Android | 468 ms | 531 | −40% | — |

| Slice | Newer release | Older release | Δ | Verdict |
|---|---|---|---|---|
| iOS | 9.4.51-1 · 271 ms (n 649) | 9.4.50-3 · 281 ms (n 1,007) | −3% | mature (24% of volume) → comparable |
| Android | 9.4.52-11 · 469 ms (n 169) | 9.4.51-1 · 591 ms (n 140) | −21% | mature (32% of volume) → comparable · below 500-sample floor |

> no agreed target yet, 300 ms proposed; the span also fires on Android despite the metric name
