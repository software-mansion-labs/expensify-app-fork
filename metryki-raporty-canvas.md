# Weekly performance reports — 13–20 Aug 2026

One format for every metric on the scoreboard, read on the whole population: no release filter on the headline number, version comparisons underneath and always inside a single platform slice. Read from Sentry (`spans`, `environment:production`) on 21 Aug; the week-over-week column compares against 6–13 Aug.

**How to read it.** The headline carries the target. The platform table says which platform the headline is actually about. The version table lists what each release measures in that platform slice, with its sample count and its share of the platform's traffic, so you can see how much of the population a version already represents. `native share` plus the mix note say whether the headline may be compared with the previous week at all.

**Fixed rules.** p95 everywhere, `n` always shown, platform rows for iOS / Android / Windows / macOS, version rows for every release with at least 500 measurements and at least 2% of that platform's traffic in the window, newest first. A week is flagged when the native share moves by more than 5 points. No verdict is attached to a version: the numbers and the sample count are the output.

---

## 🔴 Bottom tab switch to Inbox — target 400 ms (p95)

`ManualNavigateToInboxTab` · **All p95 626 ms** (n 126K) · native share 41% · 🔴 mix shifted −11 pp — read the platform rows, not the headline

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 301 ms | 42K | −3% | ✅ |
| Android | 541 ms | 10K | +13% | 🔴 |
| Windows | 769 ms | 47K | flat | 🔴 |
| macOS | 555 ms | 26K | +2% | 🔴 |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 303 ms | 8,302 | 20% |
| iOS | 9.4.52-11 | 349 ms | 4,656 | 11% |
| iOS | 9.4.51-1 | 285 ms | 9,156 | 22% |
| iOS | 9.4.50-3 | 289 ms | 12K | 29% |
| iOS | 9.4.49-3 | 282 ms | 2,179 | 5% |
| iOS | 9.4.47-7 | 302 ms | 1,116 | 3% |
| Android | 9.4.54-4 | 445 ms | 646 | 6% |
| Android | 9.4.53-10 | 561 ms | 897 | 9% |
| Android | 9.4.52-11 | 537 ms | 3,571 | 35% |
| Android | 9.4.51-1 | 495 ms | 2,275 | 22% |
| Android | 9.4.50-3 | 429 ms | 929 | 9% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (42K measurements) and the Android rows against Android traffic (10K). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** web rows moved after the #98051 relabelling; the native share dropped 11 pp w/w, so the All row is not comparable to last week

---

## 🟢 Bottom tab switch to Reports — target 400 ms (p95)

`ManualNavigateToReports` · **All p95 326 ms** (n 131K) · native share 32% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 274 ms | 33K | −4% | ✅ |
| Android | 594 ms | 9,134 | +6% | 🔴 |
| Windows | 350 ms | 60K | flat | ✅ |
| macOS | 193 ms | 28K | −1% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 260 ms | 6,616 | 20% |
| iOS | 9.4.52-11 | 256 ms | 3,682 | 11% |
| iOS | 9.4.51-1 | 274 ms | 7,478 | 22% |
| iOS | 9.4.50-3 | 285 ms | 9,956 | 30% |
| iOS | 9.4.49-3 | 281 ms | 1,830 | 5% |
| iOS | 9.4.47-7 | 285 ms | 889 | 3% |
| Android | 9.4.54-4 | 540 ms | 582 | 6% |
| Android | 9.4.53-10 | 556 ms | 747 | 8% |
| Android | 9.4.52-11 | 613 ms | 3,298 | 36% |
| Android | 9.4.51-1 | 543 ms | 2,136 | 23% |
| Android | 9.4.50-3 | 527 ms | 1,026 | 11% |
| Android | 9.4.49-3 | 598 ms | 526 | 6% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (33K measurements) and the Android rows against Android traffic (9,134). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** none

---

## 🔴 Manual App start up time — target 5000 ms (p95)

`ManualAppStartup` · **All p95 5160 ms** (n 173K) · native share 11% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 5969 ms | 14K | −3% | 🔴 |
| Android | 6191 ms | 4,750 | +11% | 🔴 |
| Windows | 5614 ms | 83K | +4% | 🔴 |
| macOS | 2711 ms | 51K | +2% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.55-4 | 4847 ms | 570 | 4% |
| iOS | 9.4.54-4 | 4520 ms | 555 | 4% |
| iOS | 9.4.53-10 | 4886 ms | 1,760 | 13% |
| iOS | 9.4.52-11 | 5236 ms | 1,892 | 14% |
| iOS | 9.4.51-1 | 6672 ms | 1,498 | 11% |
| iOS | 9.4.50-3 | 5735 ms | 2,016 | 15% |
| iOS | 9.4.43-1 | 6132 ms | 909 | 7% |
| iOS | 9.4.35-6 | 5813 ms | 1,323 | 10% |
| Android | 9.4.53-10 | 6311 ms | 584 | 12% |
| Android | 9.4.52-11 | 10274 ms | 637 | 13% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (14K measurements) and the Android rows against Android traffic (4,750). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** 10.8% of spans carry no os.name and are excluded from the platform rows but included in All

---

## 🔴 Opening Report — target 1000 ms (p95)

`ManualOpenReport` · **All p95 1155 ms** (n 1.07M) · native share 40% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 1156 ms | 334K | −6% | 🔴 |
| Android | 1596 ms | 88K | −1% | 🔴 |
| Windows | 1195 ms | 418K | flat | 🔴 |
| macOS | 742 ms | 223K | flat | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 973 ms | 58K | 17% |
| iOS | 9.4.52-11 | 1151 ms | 31K | 9% |
| iOS | 9.4.51-1 | 1167 ms | 79K | 24% |
| iOS | 9.4.50-3 | 1235 ms | 106K | 32% |
| iOS | 9.4.49-3 | 1242 ms | 20K | 6% |
| iOS | 9.4.47-7 | 1232 ms | 10K | 3% |
| iOS | 9.4.35-6 | 1268 ms | 6,920 | 2% |
| Android | 9.4.54-4 | 1318 ms | 5,240 | 6% |
| Android | 9.4.53-10 | 1472 ms | 6,571 | 7% |
| Android | 9.4.52-11 | 1568 ms | 32K | 37% |
| Android | 9.4.51-1 | 1533 ms | 20K | 23% |
| Android | 9.4.50-3 | 1720 ms | 9,356 | 11% |
| Android | 9.4.49-3 | 1749 ms | 4,944 | 6% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (334K measurements) and the Android rows against Android traffic (88K). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** none

---

## 🔴 Scan Capture to Confirmation Screen — target 400 ms (p95)

`ManualShutterToConfirmation` · **All p95 460 ms** (n 125K) · native share 100% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 376 ms | 89K | −2% | ✅ |
| Android | 706 ms | 36K | −10% | 🔴 |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 375 ms | 14K | 16% |
| iOS | 9.4.52-11 | 360 ms | 9,086 | 10% |
| iOS | 9.4.51-1 | 378 ms | 21K | 23% |
| iOS | 9.4.50-3 | 384 ms | 29K | 32% |
| iOS | 9.4.49-3 | 352 ms | 6,164 | 7% |
| iOS | 9.4.47-7 | 367 ms | 2,728 | 3% |
| iOS | 9.4.35-6 | 317 ms | 2,061 | 2% |
| Android | 9.4.54-4 | 574 ms | 2,413 | 7% |
| Android | 9.4.53-10 | 931 ms | 2,784 | 8% |
| Android | 9.4.52-11 | 707 ms | 14K | 38% |
| Android | 9.4.51-1 | 713 ms | 8,564 | 24% |
| Android | 9.4.50-3 | 715 ms | 3,643 | 10% |
| Android | 9.4.49-3 | 662 ms | 2,131 | 6% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (89K measurements) and the Android rows against Android traffic (36K). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** native-only path, so All equals the two platform rows; the All move is driven by iOS volume falling 32% w/w

---

## 🔴 Opening Search bar — target 400 ms (p95)

`ManualOpenSearchRouter` · **All p95 571 ms** (n 5,725) · native share 49% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 472 ms | 1,848 | −3% | 🔴 |
| Android | 1218 ms | 956 | +21% | 🔴 |
| Windows | 378 ms | 1,886 | +2% | ✅ |
| macOS | 244 ms | 1,020 | +22% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.50-3 | 476 ms | 548 | 30% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (1,848 measurements) and the Android rows against Android traffic (956). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** smallest sample on the board; only one version clears the 500-measurement floor, Android clears none

---

## 🔴 Sending message — target 300 ms (p95)

`ManualSendMessage` · **All p95 373 ms** (n 28K) · native share 29% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 616 ms | 6,099 | +8% | 🔴 |
| Android | 1188 ms | 1,945 | +79% | 🔴 |
| Windows | 274 ms | 12K | −8% | ✅ |
| macOS | 176 ms | 7,591 | −2% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 625 ms | 1,428 | 23% |
| iOS | 9.4.52-11 | 519 ms | 610 | 10% |
| iOS | 9.4.51-1 | 603 ms | 1,148 | 19% |
| iOS | 9.4.50-3 | 705 ms | 1,601 | 26% |
| Android | 9.4.52-11 | 1952 ms | 668 | 34% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (6,099 measurements) and the Android rows against Android traffic (1,945). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** old timer, stops before the message is visible; see the next report for the visible-timer version of the same action

---

## 🔴 Sending message (visible timer) — target 300 ms (p95)

`ManualSendMessageVisible` · **All p95 483 ms** (n 15K) · native share 18% · 🔴 mix shifted −82 pp — read the platform rows, not the headline

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 753 ms | 2,036 | +100% | 🔴 |
| Android | 1199 ms | 605 | flat | 🔴 |
| Windows | 445 ms | 7,491 | — | 🔴 |
| macOS | 289 ms | 4,740 | — | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 822 ms | 1,428 | 70% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (2,036 measurements) and the Android rows against Android traffic (605). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** timer is one week old, so w/w on All compares 14.9K measurements against 154; target 300 ms is inherited from the old timer and not yet agreed for this one

---

## 🟢 Time from submitting an expense to landing on the next screen — target 400 ms (p95)

`ManualSubmitToDestinationVisible` · **All p95 169 ms** (n 246K) · native share 60% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 116 ms | 107K | flat | ✅ |
| Android | 153 ms | 42K | flat | ✅ |
| Windows | 286 ms | 57K | +6% | ✅ |
| macOS | 207 ms | 40K | +18% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 113 ms | 14K | 13% |
| iOS | 9.4.52-11 | 113 ms | 9,085 | 8% |
| iOS | 9.4.51-1 | 115 ms | 26K | 25% |
| iOS | 9.4.50-3 | 117 ms | 37K | 35% |
| iOS | 9.4.49-3 | 119 ms | 7,867 | 7% |
| iOS | 9.4.47-7 | 124 ms | 3,505 | 3% |
| iOS | 9.4.35-6 | 110 ms | 2,711 | 3% |
| Android | 9.4.54-4 | 149 ms | 2,634 | 6% |
| Android | 9.4.53-10 | 144 ms | 3,071 | 7% |
| Android | 9.4.52-11 | 147 ms | 15K | 37% |
| Android | 9.4.51-1 | 159 ms | 10K | 24% |
| Android | 9.4.50-3 | 159 ms | 4,166 | 10% |
| Android | 9.4.49-3 | 138 ms | 2,738 | 7% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (107K measurements) and the Android rows against Android traffic (42K). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** one span covers four follow-up actions; every platform row is far inside target while the reported sub-metrics are not, which is the scenario-mixing case

---

## 🟡 Starting Create expense flow — target 400 ms (p95)

`ManualOpenCreateExpense` · **All p95 341 ms** (n 266K) · native share 64% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 358 ms | 125K | −2% | ✅ |
| Android | 514 ms | 45K | +3% | 🔴 |
| Windows | 107 ms | 58K | flat | ✅ |
| macOS | 80 ms | 38K | −1% | ✅ |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 344 ms | 19K | 16% |
| iOS | 9.4.52-11 | 322 ms | 11K | 9% |
| iOS | 9.4.51-1 | 354 ms | 30K | 24% |
| iOS | 9.4.50-3 | 377 ms | 42K | 33% |
| iOS | 9.4.49-3 | 365 ms | 8,696 | 7% |
| iOS | 9.4.47-7 | 360 ms | 3,906 | 3% |
| iOS | 9.4.35-6 | 344 ms | 2,892 | 2% |
| Android | 9.4.54-4 | 456 ms | 2,981 | 7% |
| Android | 9.4.53-10 | 484 ms | 3,349 | 7% |
| Android | 9.4.52-11 | 503 ms | 17K | 37% |
| Android | 9.4.51-1 | 527 ms | 11K | 24% |
| Android | 9.4.50-3 | 542 ms | 4,438 | 10% |
| Android | 9.4.49-3 | 520 ms | 2,985 | 7% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (125K measurements) and the Android rows against Android traffic (45K). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** reported as 315 to 280 ms with the weekly release filter; without it the All row is flat at 343 to 341 ms

---

## ⚪ iOS Native Share Extension performance — target none set (p95)

`ShareExtensionOpenSubmitFlow` · **All p95 330 ms** (n 3,443) · native share 100% · mix within 5 pp of last week

| Platform | p95 | n | w/w | vs target |
|---|---|---|---|---|
| iOS | 287 ms | 2,912 | −19% | — |
| Android | 468 ms | 531 | −40% | — |

| Slice | Release | p95 | n | share of that platform |
|---|---|---|---|---|
| iOS | 9.4.53-10 | 271 ms | 551 | 19% |
| iOS | 9.4.51-1 | 271 ms | 649 | 22% |
| iOS | 9.4.50-3 | 281 ms | 1,007 | 35% |

Shares are taken inside one platform slice, so the iOS rows add up against iOS traffic (2,912 measurements) and the Android rows against Android traffic (531). Each slice adds up to at most 100%; the rest is versions below the floor.

> **Notes:** no agreed target yet, 300 ms proposed; the span also fires on Android despite the metric name, and Android clears no version floor

---

## How this format evolved

The first version of this report kept the weekly release filter and published one blended number per metric. Three rounds of feedback changed it into what is above.

**The release filter left the headline.** Rotating it onto the versions shipped in a given week does not select a version of the code, it selects a phase of the rollout, and with it the ratio of native to web traffic. The same build 9.4.50-3 read in two consecutive weeks moved from 16% to 78% native share and from 105 to 279 ms of blended p90 with no commit behind it. The headline is now read over the whole population in a fixed 7-day window.

**Platform rows were added.** The blended p95 already measured mostly native traffic, because web practically never reaches the tail — on create expense the share of opens above 400 ms is 0.16% on Windows and 0.08% on macOS. The rows make that explicit, and they immediately surfaced things the blend hid: the worst row on the Inbox tab is Windows at 769 ms, not mobile.

**The maturity verdict was removed.** The first version marked a release as mature at 15% of its platform's volume and printed `no verdict this week` below that line. On Opening Report that rule discarded a version with 57,928 measurements on iOS. A threshold picked to describe representativeness was being used to decide whether a number may be read at all, which is the wrong job for it. The report now prints the numbers, the sample count and the share, and leaves the conclusion to the reader.

**The two-newest-versions pair was replaced by a list.** Taking the two newest releases above a floor dropped versions: in this window Opening Report on iOS has nine releases above the floor, and the pair skipped the largest one, 9.4.50-3 with 105,855 measurements. Every release with at least 500 measurements and at least 2% of the slice is now listed, newest first, which also makes a trend across versions visible — on create expense iOS it reads 377 → 354 → 344 ms from 9.4.50-3 to 9.4.53-10.

**The query limit was raised.** The first run grouped by release and platform with a limit of 12 rows, which silently truncated the tail of older versions. The lists above come from limits of 20 to 40 rows per metric.

**Wording changed to say what to do.** `not comparable` became a note pointing at the platform rows, because the data is not useless when the mix moves — only the blended comparison is. The notes block is now present in every report and reads `none` when there is nothing to flag.

**Still open.** Comparing releases in two groups, newer against older, with a calendar boundary fixed in advance rather than chosen after seeing the result; filtering out spans marked as production that come only from our own QA; excluding releases that have been in production for less than a week; and one global platform tag, because mobile web currently lands in the iOS bucket and the native share that the mix note stands on is computed from that same sample.
