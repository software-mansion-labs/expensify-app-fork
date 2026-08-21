# Weekly per-platform reports, window 13-20 Aug 2026

Generated from Sentry (`spans`, `environment:production`), one format for every metric on the scoreboard. No release filter on the headline: the All row is the whole population, release comparisons sit underneath and are read inside a single platform slice.

Rules applied identically to every report: p95 everywhere, `n` always shown, platform rows for iOS / Android / Windows / macOS, release rows are the two newest releases with at least 500 measurements on that platform, a release counts as mature when it holds at least 15% of that platform's volume in the window, and a week is flagged as not comparable when the native share moves by more than 5 points.

> Bottom tab switch to Inbox -- target 400 ms (p95), window 13-20 Aug
> span: ManualNavigateToInboxTab
>
> All        p95 628 ms    (n  124K)  native share 40%   mix shifted -12 pp, week not comparable  ! above target
>   iOS      p95 303 ms    (n   40K)  -2% w/w
>   Android  p95 542 ms    (n   10K)  +13% w/w  ! above target
>   Windows  p95 769 ms    (n   47K)  flat w/w  ! above target
>   macOS    p95 555 ms    (n   26K)  +2% w/w  ! above target
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 314 ms    (n 7,090) vs 9.4.52-11  p95 349 ms    (n 4,655)  -10%
>   Android  9.4.54-4   p95 445 ms    (n   646) vs 9.4.53-10  p95 561 ms    (n   897)  -21%
>
> Verdicts
>   9.4.53-10  (iOS) -- mature (18% of iOS volume) -> comparable
>   9.4.52-11  (iOS) -- still rolling out (12% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (6% of Android volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (9% of Android volume) -> no verdict this week
>
> Notes: web rows moved after the #98051 relabelling; native share dropped 12 pp w/w, so the All row is not comparable to last week

> Bottom tab switch to Reports -- target 400 ms (p95), window 13-20 Aug
> span: ManualNavigateToReports
>
> All        p95 327 ms    (n  130K)  native share 32%   mix within 5 pp of last week
>   iOS      p95 274 ms    (n   32K)  -4% w/w
>   Android  p95 594 ms    (n 9,134)  +6% w/w  ! above target
>   Windows  p95 350 ms    (n   60K)  flat w/w
>   macOS    p95 193 ms    (n   28K)  -1% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 259 ms    (n 5,714) vs 9.4.52-11  p95 256 ms    (n 3,682)  +1%
>   Android  9.4.54-4   p95 540 ms    (n   582) vs 9.4.53-10  p95 556 ms    (n   747)  -3%
>
> Verdicts
>   9.4.53-10  (iOS) -- mature (18% of iOS volume) -> comparable
>   9.4.52-11  (iOS) -- still rolling out (11% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (6% of Android volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (8% of Android volume) -> no verdict this week
>
> Notes: none

> Manual App start up time -- target 5000 ms (p95), window 13-20 Aug
> span: ManualAppStartup
>
> All        p95 5162 ms   (n  173K)  native share 11%   mix within 5 pp of last week  ! above target
>   iOS      p95 5968 ms   (n   14K)  -3% w/w  ! above target
>   Android  p95 6191 ms   (n 4,747)  +11% w/w  ! above target
>   Windows  p95 5614 ms   (n   83K)  +4% w/w  ! above target
>   macOS    p95 2710 ms   (n   51K)  +2% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.55-4   p95 4848 ms   (n   568) vs 9.4.54-4   p95 4520 ms   (n   555)  +7%
>   Android  9.4.53-10  p95 6311 ms   (n   584) vs 9.4.52-11  p95 10274 ms  (n   637)  -39%
>
> Verdicts
>   9.4.55-4   (iOS) -- still rolling out (4% of iOS volume) -> no verdict this week
>   9.4.54-4   (iOS) -- still rolling out (4% of iOS volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (12% of Android volume) -> no verdict this week
>   9.4.52-11  (Android) -- still rolling out (13% of Android volume) -> no verdict this week
>
> Notes: 10.8% of spans carry no os.name and are excluded from the platform rows but included in All

> Opening Report -- target 1000 ms (p95), window 13-20 Aug
> span: ManualOpenReport
>
> All        p95 1158 ms   (n 1.05M)  native share 39%   mix within 5 pp of last week  ! above target
>   iOS      p95 1166 ms   (n  320K)  -5% w/w  ! above target
>   Android  p95 1595 ms   (n   88K)  -1% w/w  ! above target
>   Windows  p95 1195 ms   (n  418K)  flat w/w  ! above target
>   macOS    p95 742 ms    (n  223K)  flat w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 969 ms    (n   48K) vs 9.4.52-11  p95 1150 ms   (n   31K)  -16%
>   Android  9.4.54-4   p95 1317 ms   (n 5,235) vs 9.4.53-10  p95 1472 ms   (n 6,569)  -10%
>
> Verdicts
>   9.4.53-10  (iOS) -- still rolling out (15% of iOS volume) -> no verdict this week
>   9.4.52-11  (iOS) -- still rolling out (10% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (6% of Android volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>
> Notes: none

> Scan Capture to Confirmation Screen -- target 400 ms (p95), window 13-20 Aug
> span: ManualShutterToConfirmation
>
> All        p95 463 ms    (n  122K)  native share 100%   mix within 5 pp of last week  ! above target
>   iOS      p95 376 ms    (n   86K)  -2% w/w
>   Android  p95 705 ms    (n   36K)  -10% w/w  ! above target
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 374 ms    (n   12K) vs 9.4.52-11  p95 360 ms    (n 9,086)  +4%
>   Android  9.4.54-4   p95 574 ms    (n 2,411) vs 9.4.53-10  p95 938 ms    (n 2,780)  -39%
>
> Verdicts
>   9.4.53-10  (iOS) -- still rolling out (14% of iOS volume) -> no verdict this week
>   9.4.52-11  (iOS) -- still rolling out (11% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (8% of Android volume) -> no verdict this week
>
> Notes: native-only path, so All equals the two platform rows; the All move is driven by iOS volume falling 35% w/w

> Opening Search bar -- target 400 ms (p95), window 13-20 Aug
> span: ManualOpenSearchRouter
>
> All        p95 575 ms    (n 5,642)  native share 48%   mix within 5 pp of last week  ! above target
>   iOS      p95 476 ms    (n 1,766)  -3% w/w  ! above target
>   Android  p95 1218 ms   (n   956)  +21% w/w  ! above target
>   Windows  p95 378 ms    (n 1,886)  +2% w/w
>   macOS    p95 244 ms    (n 1,019)  +22% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 483 ms    (n   286) vs 9.4.52-11  p95 428 ms    (n   181)  +13%  [below 500-sample floor]
>   Android  9.4.52-11  p95 1391 ms   (n   301) vs 9.4.51-1   p95 1078 ms   (n   166)  +29%  [below 500-sample floor]
>
> Verdicts
>   9.4.53-10  (iOS) -- mature (16% of iOS volume) -> comparable
>   9.4.52-11  (iOS) -- still rolling out (10% of iOS volume) -> no verdict this week
>   9.4.52-11  (Android) -- mature (31% of Android volume) -> comparable
>   9.4.51-1   (Android) -- mature (17% of Android volume) -> comparable
>
> Notes: smallest sample on the board; release rows fall below the 500-sample floor, so they are indicative only

> Sending message -- target 300 ms (p95), window 13-20 Aug
> span: ManualSendMessage
>
> All        p95 371 ms    (n   27K)  native share 28%   mix within 5 pp of last week  ! above target
>   iOS      p95 629 ms    (n 5,754)  +10% w/w  ! above target
>   Android  p95 1188 ms   (n 1,945)  +79% w/w  ! above target
>   Windows  p95 274 ms    (n   12K)  -8% w/w
>   macOS    p95 176 ms    (n 7,591)  -1% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 637 ms    (n 1,244) vs 9.4.52-11  p95 519 ms    (n   610)  +23%
>   Android  9.4.54-4   p95 475 ms    (n   142) vs 9.4.54-1   p95 686 ms    (n   124)  -31%  [below 500-sample floor]
>
> Verdicts
>   9.4.53-10  (iOS) -- mature (22% of iOS volume) -> comparable
>   9.4.52-11  (iOS) -- still rolling out (11% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>   9.4.54-1   (Android) -- still rolling out (6% of Android volume) -> no verdict this week
>
> Notes: old timer, stops before the message is visible; see the next report for the visible-timer version of the same action

> Sending message (visible timer) -- target 300 ms (p95), window 13-20 Aug
> span: ManualSendMessageVisible
>
> All        p95 477 ms    (n   15K)  native share 16%   mix shifted -84 pp, week not comparable  ! above target
>   iOS      p95 760 ms    (n 1,690)  +102% w/w  ! above target
>   Android  p95 1199 ms   (n   605)  flat w/w  ! above target
>   Windows  p95 445 ms    (n 7,491)  n/a w/w  ! above target
>   macOS    p95 289 ms    (n 4,740)  n/a w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.54-1   p95 413 ms    (n   127) vs 9.4.53-10  p95 830 ms    (n 1,244)  -50%  [below 500-sample floor]
>   Android  9.4.54-4   p95 651 ms    (n   142) vs 9.4.54-1   p95 1110 ms   (n   124)  -41%  [below 500-sample floor]
>
> Verdicts
>   9.4.54-1   (iOS) -- still rolling out (8% of iOS volume) -> no verdict this week
>   9.4.53-10  (iOS) -- mature (74% of iOS volume) -> comparable
>   9.4.54-4   (Android) -- mature (23% of Android volume) -> comparable
>   9.4.54-1   (Android) -- mature (20% of Android volume) -> comparable
>
> Notes: timer is one week old, so w/w on All compares 14.6K measurements against 154; target 300 ms is inherited from the old timer and not yet agreed for this one

> Time from submitting an expense to landing on the next screen -- target 400 ms (p95), window 13-20 Aug
> span: ManualSubmitToDestinationVisible
>
> All        p95 170 ms    (n  243K)  native share 60%   mix shifted -5 pp, week not comparable
>   iOS      p95 116 ms    (n  104K)  flat w/w
>   Android  p95 153 ms    (n   42K)  flat w/w
>   Windows  p95 285 ms    (n   57K)  +6% w/w
>   macOS    p95 207 ms    (n   40K)  +18% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 113 ms    (n   12K) vs 9.4.52-11  p95 113 ms    (n 9,084)  flat
>   Android  9.4.53-10  p95 144 ms    (n 3,069) vs 9.4.52-11  p95 147 ms    (n   15K)  -2%
>
> Verdicts
>   9.4.53-10  (iOS) -- still rolling out (11% of iOS volume) -> no verdict this week
>   9.4.52-11  (iOS) -- still rolling out (9% of iOS volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>   9.4.52-11  (Android) -- mature (37% of Android volume) -> comparable
>
> Notes: one span covers four follow-up actions; every platform row is far inside target while the reported sub-metrics are not, which is the scenario-mixing case

> Starting Create expense flow -- target 400 ms (p95), window 13-20 Aug
> span: ManualOpenCreateExpense
>
> All        p95 341 ms    (n  262K)  native share 63%   mix shifted -5 pp, week not comparable
>   iOS      p95 358 ms    (n  121K)  -2% w/w
>   Android  p95 514 ms    (n   45K)  +3% w/w  ! above target
>   Windows  p95 107 ms    (n   58K)  flat w/w
>   macOS    p95 80 ms     (n   38K)  -1% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.53-10  p95 342 ms    (n   16K) vs 9.4.52-11  p95 321 ms    (n   11K)  +6%
>   Android  9.4.54-4   p95 457 ms    (n 2,978) vs 9.4.53-10  p95 484 ms    (n 3,347)  -6%
>
> Verdicts
>   9.4.53-10  (iOS) -- still rolling out (13% of iOS volume) -> no verdict this week
>   9.4.52-11  (iOS) -- still rolling out (9% of iOS volume) -> no verdict this week
>   9.4.54-4   (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>   9.4.53-10  (Android) -- still rolling out (7% of Android volume) -> no verdict this week
>
> Notes: reported as 315 to 280 ms with the weekly release filter; without it the All row is flat at 343 to 341 ms

> iOS Native Share Extension performance -- target none set (p95), window 13-20 Aug
> span: ShareExtensionOpenSubmitFlow
>
> All        p95 334 ms    (n 3,273)  native share 100%   mix within 5 pp of last week
>   iOS      p95 290 ms    (n 2,742)  -18% w/w
>   Android  p95 468 ms    (n   531)  -40% w/w
>
> Releases in window (same platform slice)
>   iOS      9.4.51-1   p95 271 ms    (n   649) vs 9.4.50-3   p95 281 ms    (n 1,007)  -3%
>   Android  9.4.52-11  p95 469 ms    (n   169) vs 9.4.51-1   p95 591 ms    (n   140)  -21%  [below 500-sample floor]
>
> Verdicts
>   9.4.51-1   (iOS) -- mature (24% of iOS volume) -> comparable
>   9.4.50-3   (iOS) -- mature (37% of iOS volume) -> comparable
>   9.4.52-11  (Android) -- mature (32% of Android volume) -> comparable
>   9.4.51-1   (Android) -- mature (26% of Android volume) -> comparable
>
> Notes: no agreed target yet, 300 ms proposed; the span also fires on Android despite the metric name
