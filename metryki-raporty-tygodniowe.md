# Weekly performance reports, plain text — 13-20 Aug 2026

Same data and same rules as `metryki-raporty-canvas.md`, rendered as fixed-width blocks. Read from Sentry (`spans`, `environment:production`) on 21 Aug; w/w compares against 6-13 Aug.

> Bottom tab switch to Inbox -- target 400 ms (p95), window 13-20 Aug
> span: ManualNavigateToInboxTab
>
> All        p95 626 ms    (n   126K)  native share 41%   mix shifted -11 pp, read the platform rows  ! above target
>   iOS      p95 301 ms    (n    42K)  -3% w/w
>   Android  p95 541 ms    (n    10K)  +13% w/w  ! above target
>   Windows  p95 769 ms    (n    47K)  flat w/w  ! above target
>   macOS    p95 555 ms    (n    26K)  +2% w/w  ! above target
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 303 ms    (n  8,302)  20% of that platform
>   iOS      9.4.52-11  p95 349 ms    (n  4,656)  11% of that platform
>   iOS      9.4.51-1   p95 285 ms    (n  9,156)  22% of that platform
>   iOS      9.4.50-3   p95 289 ms    (n    12K)  29% of that platform
>   iOS      9.4.49-3   p95 282 ms    (n  2,179)   5% of that platform
>   iOS      9.4.47-7   p95 302 ms    (n  1,116)   3% of that platform
>   Android  9.4.54-4   p95 445 ms    (n    646)   6% of that platform
>   Android  9.4.53-10  p95 561 ms    (n    897)   9% of that platform
>   Android  9.4.52-11  p95 537 ms    (n  3,571)  35% of that platform
>   Android  9.4.51-1   p95 495 ms    (n  2,275)  22% of that platform
>   Android  9.4.50-3   p95 429 ms    (n    929)   9% of that platform
>
> Notes: web rows moved after the #98051 relabelling; the native share dropped 11 pp w/w, so the All row is not comparable to last week

> Bottom tab switch to Reports -- target 400 ms (p95), window 13-20 Aug
> span: ManualNavigateToReports
>
> All        p95 326 ms    (n   131K)  native share 32%   mix within 5 pp of last week
>   iOS      p95 274 ms    (n    33K)  -4% w/w
>   Android  p95 594 ms    (n  9,134)  +6% w/w  ! above target
>   Windows  p95 350 ms    (n    60K)  flat w/w
>   macOS    p95 193 ms    (n    28K)  -1% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 260 ms    (n  6,616)  20% of that platform
>   iOS      9.4.52-11  p95 256 ms    (n  3,682)  11% of that platform
>   iOS      9.4.51-1   p95 274 ms    (n  7,478)  22% of that platform
>   iOS      9.4.50-3   p95 285 ms    (n  9,956)  30% of that platform
>   iOS      9.4.49-3   p95 281 ms    (n  1,830)   5% of that platform
>   iOS      9.4.47-7   p95 285 ms    (n    889)   3% of that platform
>   Android  9.4.54-4   p95 540 ms    (n    582)   6% of that platform
>   Android  9.4.53-10  p95 556 ms    (n    747)   8% of that platform
>   Android  9.4.52-11  p95 613 ms    (n  3,298)  36% of that platform
>   Android  9.4.51-1   p95 543 ms    (n  2,136)  23% of that platform
>   Android  9.4.50-3   p95 527 ms    (n  1,026)  11% of that platform
>   Android  9.4.49-3   p95 598 ms    (n    526)   6% of that platform
>
> Notes: none

> Manual App start up time -- target 5000 ms (p95), window 13-20 Aug
> span: ManualAppStartup
>
> All        p95 5160 ms   (n   173K)  native share 11%   mix within 5 pp of last week  ! above target
>   iOS      p95 5969 ms   (n    14K)  -3% w/w  ! above target
>   Android  p95 6191 ms   (n  4,750)  +11% w/w  ! above target
>   Windows  p95 5614 ms   (n    83K)  +4% w/w  ! above target
>   macOS    p95 2711 ms   (n    51K)  +2% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.55-4   p95 4847 ms   (n    570)   4% of that platform
>   iOS      9.4.54-4   p95 4520 ms   (n    555)   4% of that platform
>   iOS      9.4.53-10  p95 4886 ms   (n  1,760)  13% of that platform
>   iOS      9.4.52-11  p95 5236 ms   (n  1,892)  14% of that platform
>   iOS      9.4.51-1   p95 6672 ms   (n  1,498)  11% of that platform
>   iOS      9.4.50-3   p95 5735 ms   (n  2,016)  15% of that platform
>   iOS      9.4.43-1   p95 6132 ms   (n    909)   7% of that platform
>   iOS      9.4.35-6   p95 5813 ms   (n  1,323)  10% of that platform
>   Android  9.4.53-10  p95 6311 ms   (n    584)  12% of that platform
>   Android  9.4.52-11  p95 10274 ms  (n    637)  13% of that platform
>
> Notes: 10.8% of spans carry no os.name and are excluded from the platform rows but included in All

> Opening Report -- target 1000 ms (p95), window 13-20 Aug
> span: ManualOpenReport
>
> All        p95 1155 ms   (n  1.07M)  native share 40%   mix within 5 pp of last week  ! above target
>   iOS      p95 1156 ms   (n   334K)  -6% w/w  ! above target
>   Android  p95 1596 ms   (n    88K)  -1% w/w  ! above target
>   Windows  p95 1195 ms   (n   418K)  flat w/w  ! above target
>   macOS    p95 742 ms    (n   223K)  flat w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 973 ms    (n    58K)  17% of that platform
>   iOS      9.4.52-11  p95 1151 ms   (n    31K)   9% of that platform
>   iOS      9.4.51-1   p95 1167 ms   (n    79K)  24% of that platform
>   iOS      9.4.50-3   p95 1235 ms   (n   106K)  32% of that platform
>   iOS      9.4.49-3   p95 1242 ms   (n    20K)   6% of that platform
>   iOS      9.4.47-7   p95 1232 ms   (n    10K)   3% of that platform
>   iOS      9.4.35-6   p95 1268 ms   (n  6,920)   2% of that platform
>   Android  9.4.54-4   p95 1318 ms   (n  5,240)   6% of that platform
>   Android  9.4.53-10  p95 1472 ms   (n  6,571)   7% of that platform
>   Android  9.4.52-11  p95 1568 ms   (n    32K)  37% of that platform
>   Android  9.4.51-1   p95 1533 ms   (n    20K)  23% of that platform
>   Android  9.4.50-3   p95 1720 ms   (n  9,356)  11% of that platform
>   Android  9.4.49-3   p95 1749 ms   (n  4,944)   6% of that platform
>
> Notes: none

> Scan Capture to Confirmation Screen -- target 400 ms (p95), window 13-20 Aug
> span: ManualShutterToConfirmation
>
> All        p95 460 ms    (n   125K)  native share 100%   mix within 5 pp of last week  ! above target
>   iOS      p95 376 ms    (n    89K)  -2% w/w
>   Android  p95 706 ms    (n    36K)  -10% w/w  ! above target
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 375 ms    (n    14K)  16% of that platform
>   iOS      9.4.52-11  p95 360 ms    (n  9,086)  10% of that platform
>   iOS      9.4.51-1   p95 378 ms    (n    21K)  23% of that platform
>   iOS      9.4.50-3   p95 384 ms    (n    29K)  32% of that platform
>   iOS      9.4.49-3   p95 352 ms    (n  6,164)   7% of that platform
>   iOS      9.4.47-7   p95 367 ms    (n  2,728)   3% of that platform
>   iOS      9.4.35-6   p95 317 ms    (n  2,061)   2% of that platform
>   Android  9.4.54-4   p95 574 ms    (n  2,413)   7% of that platform
>   Android  9.4.53-10  p95 931 ms    (n  2,784)   8% of that platform
>   Android  9.4.52-11  p95 707 ms    (n    14K)  38% of that platform
>   Android  9.4.51-1   p95 713 ms    (n  8,564)  24% of that platform
>   Android  9.4.50-3   p95 715 ms    (n  3,643)  10% of that platform
>   Android  9.4.49-3   p95 662 ms    (n  2,131)   6% of that platform
>
> Notes: native-only path, so All equals the two platform rows; the All move is driven by iOS volume falling 32% w/w

> Opening Search bar -- target 400 ms (p95), window 13-20 Aug
> span: ManualOpenSearchRouter
>
> All        p95 571 ms    (n  5,725)  native share 49%   mix within 5 pp of last week  ! above target
>   iOS      p95 472 ms    (n  1,848)  -3% w/w  ! above target
>   Android  p95 1218 ms   (n    956)  +21% w/w  ! above target
>   Windows  p95 378 ms    (n  1,886)  +2% w/w
>   macOS    p95 244 ms    (n  1,020)  +22% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.50-3   p95 476 ms    (n    548)  30% of that platform
>
> Notes: smallest sample on the board; only one version clears the 500-measurement floor, Android clears none

> Sending message -- target 300 ms (p95), window 13-20 Aug
> span: ManualSendMessage
>
> All        p95 373 ms    (n    28K)  native share 29%   mix within 5 pp of last week  ! above target
>   iOS      p95 616 ms    (n  6,099)  +8% w/w  ! above target
>   Android  p95 1188 ms   (n  1,945)  +79% w/w  ! above target
>   Windows  p95 274 ms    (n    12K)  -8% w/w
>   macOS    p95 176 ms    (n  7,591)  -2% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 625 ms    (n  1,428)  23% of that platform
>   iOS      9.4.52-11  p95 519 ms    (n    610)  10% of that platform
>   iOS      9.4.51-1   p95 603 ms    (n  1,148)  19% of that platform
>   iOS      9.4.50-3   p95 705 ms    (n  1,601)  26% of that platform
>   Android  9.4.52-11  p95 1952 ms   (n    668)  34% of that platform
>
> Notes: old timer, stops before the message is visible; see the next report for the visible-timer version of the same action

> Sending message (visible timer) -- target 300 ms (p95), window 13-20 Aug
> span: ManualSendMessageVisible
>
> All        p95 483 ms    (n    15K)  native share 18%   mix shifted -82 pp, read the platform rows  ! above target
>   iOS      p95 753 ms    (n  2,036)  +100% w/w  ! above target
>   Android  p95 1199 ms   (n    605)  flat w/w  ! above target
>   Windows  p95 445 ms    (n  7,491)  — w/w  ! above target
>   macOS    p95 289 ms    (n  4,740)  — w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 822 ms    (n  1,428)  70% of that platform
>
> Notes: timer is one week old, so w/w on All compares 14.9K measurements against 154; target 300 ms is inherited from the old timer and not yet agreed for this one

> Time from submitting an expense to landing on the next screen -- target 400 ms (p95), window 13-20 Aug
> span: ManualSubmitToDestinationVisible
>
> All        p95 169 ms    (n   246K)  native share 60%   mix within 5 pp of last week
>   iOS      p95 116 ms    (n   107K)  flat w/w
>   Android  p95 153 ms    (n    42K)  flat w/w
>   Windows  p95 286 ms    (n    57K)  +6% w/w
>   macOS    p95 207 ms    (n    40K)  +18% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 113 ms    (n    14K)  13% of that platform
>   iOS      9.4.52-11  p95 113 ms    (n  9,085)   8% of that platform
>   iOS      9.4.51-1   p95 115 ms    (n    26K)  25% of that platform
>   iOS      9.4.50-3   p95 117 ms    (n    37K)  35% of that platform
>   iOS      9.4.49-3   p95 119 ms    (n  7,867)   7% of that platform
>   iOS      9.4.47-7   p95 124 ms    (n  3,505)   3% of that platform
>   iOS      9.4.35-6   p95 110 ms    (n  2,711)   3% of that platform
>   Android  9.4.54-4   p95 149 ms    (n  2,634)   6% of that platform
>   Android  9.4.53-10  p95 144 ms    (n  3,071)   7% of that platform
>   Android  9.4.52-11  p95 147 ms    (n    15K)  37% of that platform
>   Android  9.4.51-1   p95 159 ms    (n    10K)  24% of that platform
>   Android  9.4.50-3   p95 159 ms    (n  4,166)  10% of that platform
>   Android  9.4.49-3   p95 138 ms    (n  2,738)   7% of that platform
>
> Notes: one span covers four follow-up actions; every platform row is far inside target while the reported sub-metrics are not, which is the scenario-mixing case

> Starting Create expense flow -- target 400 ms (p95), window 13-20 Aug
> span: ManualOpenCreateExpense
>
> All        p95 341 ms    (n   266K)  native share 64%   mix within 5 pp of last week
>   iOS      p95 358 ms    (n   125K)  -2% w/w
>   Android  p95 514 ms    (n    45K)  +3% w/w  ! above target
>   Windows  p95 107 ms    (n    58K)  flat w/w
>   macOS    p95 80 ms     (n    38K)  -1% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 344 ms    (n    19K)  16% of that platform
>   iOS      9.4.52-11  p95 322 ms    (n    11K)   9% of that platform
>   iOS      9.4.51-1   p95 354 ms    (n    30K)  24% of that platform
>   iOS      9.4.50-3   p95 377 ms    (n    42K)  33% of that platform
>   iOS      9.4.49-3   p95 365 ms    (n  8,696)   7% of that platform
>   iOS      9.4.47-7   p95 360 ms    (n  3,906)   3% of that platform
>   iOS      9.4.35-6   p95 344 ms    (n  2,892)   2% of that platform
>   Android  9.4.54-4   p95 456 ms    (n  2,981)   7% of that platform
>   Android  9.4.53-10  p95 484 ms    (n  3,349)   7% of that platform
>   Android  9.4.52-11  p95 503 ms    (n    17K)  37% of that platform
>   Android  9.4.51-1   p95 527 ms    (n    11K)  24% of that platform
>   Android  9.4.50-3   p95 542 ms    (n  4,438)  10% of that platform
>   Android  9.4.49-3   p95 520 ms    (n  2,985)   7% of that platform
>
> Notes: reported as 315 to 280 ms with the weekly release filter; without it the All row is flat at 343 to 341 ms

> iOS Native Share Extension performance -- target none set (p95), window 13-20 Aug
> span: ShareExtensionOpenSubmitFlow
>
> All        p95 330 ms    (n  3,443)  native share 100%   mix within 5 pp of last week
>   iOS      p95 287 ms    (n  2,912)  -19% w/w
>   Android  p95 468 ms    (n    531)  -40% w/w
>
> Releases with 500+ measurements and 2%+ of that platform, newest first
> (shares are per platform, so each platform adds up to at most 100%)
>   iOS      9.4.53-10  p95 271 ms    (n    551)  19% of that platform
>   iOS      9.4.51-1   p95 271 ms    (n    649)  22% of that platform
>   iOS      9.4.50-3   p95 281 ms    (n  1,007)  35% of that platform
>
> Notes: no agreed target yet, 300 ms proposed; the span also fires on Android despite the metric name, and Android clears no version floor
