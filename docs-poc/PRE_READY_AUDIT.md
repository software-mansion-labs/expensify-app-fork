# Audyt: odczyty całych kolekcji przed app-ready (2026-08-21)

Enumeracja: pełny import-graph bootu + provider stack (App/Expensify/AuthScreens) + drzewa obu
landing screenów (Home, Report we wszystkich wariantach) + kod nie-komponentowy. Werdykty per case;
NIC z tego dokumentu nie jest zaimplementowane bez akceptacji (wyjątki oznaczone).

Legenda werdyktów:
- **DEFER** — przesunięcie subskrypcji za app-ready (`deferUntilAppReady`/`useAppReadyOnyxValue`);
  te same odczyty, później; zero ryzyka wydajnościowego, jedynie opóźniona świeżość.
- **MEMBER** — zamiana na odczyty memberów o znanych ID (useOnyx member / useMemberMap); wygrana
  zawsze, gdy liczba ID ≪ rozmiar kolekcji.
- **QUERY** — zamiana na indeksowane zapytanie; wymaga (czasem nowego) indeksu.
- **CACHE** — punktowy `tryGetCachedValue` w callbacku (wartość ciepła w momencie użycia).
- **SIGNAL** — subskrypcja służyła tylko jako sygnał gotowości → tańszy sygnał.
- **INTERACTION** — dane liczone dopiero przy interakcji (long-press, wpisanie „#", otwarcie menu).
- **KEEP** — zostawić; zamiana pogorszyłaby wydajność/semantykę (uzasadnienie przy wpisie).
- **⚑NOWY-MECHANIZM / ⚑NOWY-INDEKS** — wymaga decyzji użytkownika (zasada: zgłaszać).

---

## P0 — wymagane PRZED wypchnięciem sweepa deferrali (commit 79af5436542, lokalny)

1. **`actions/App.ts` — openApp/reconnect czyta odroczone module-vars.** `openApp()` woła się
   PRZED ready i buduje parametry z `allPolicies` (`getNonOptimisticPolicyIDs`) i `allReports`
   (skan `isPublicRoom`); po odroczeniu connectów te vary są `undefined` przy pierwszym openApp →
   parametry pominięte (poprawne dane, ale cięższa odpowiedź serwera / inna ścieżka backendu).
   openApp już jawnie robi `Onyx.hydrate(POLICY/REPORT)` (faza 3) — **fix: czytać wprost z cache po
   własnym hydrate (OnyxUtils), nie przez module-vars**. Werdykt: wymagana poprawka, potem push.
2. **`SubmitPlanWelcomeModalGuard`** — odroczone POLICY/SECURITY_GROUP karmią decyzję boot-time
   (ewaluacja przy HAS_LOADED_APP) → modal może nie pokazać się w tym boocie. Opcje: (a) ewaluacja
   asynchroniczna z targeted readami przy strzale, (b) revert deferrala dla tego pliku (guard jest
   jedynym takim przypadkiem w sweepie). Rekomendacja: (a). **Decyzja użytkownika.**

## P1 — czyste wygrane istniejącymi prymitywami (bez ryzyka wydajnościowego)

3. **A2 `crashDiagnostics` (web): cała REPORT → 1 liczba.** Werdykt: SIGNAL — licznik z indeksu
   kluczy (jak już zrobiono w TelemetrySynchronizer dla reports-count). Zero hydratacji.
4. **A1 `TelemetrySynchronizer`: cała POLICY → 2 skalary (tagi Sentry).** Werdykt: DEFER 'low'
   (bliźniaczy licznik już tak działa).
5. **B1 `DeepLinkHandler`: cała REPORT używana WYŁĄCZNIE jako gate „załadowane".** Werdykt: SIGNAL —
   czekać na tańszy sygnał (`HAS_LOADED_APP`/`IS_LOADING_REPORT_DATA`), deep-link i tak otwiera
   raport member-readem.
6. **C3.7 `MentionReportRenderer`: cała REPORT per węzeł `<mention-report>` → nazwa 1 raportu po ID.**
   Werdykt: MEMBER (`useOnyx(report_<id>)`).
7. **C3.2 `useAncestors`: 3 roty (REPORT, REPORT_DRAFT, REPORT_ACTIONS) × 4 instancje na composerze
   = 12 root-subskrypcji na każdym chacie.** `getAncestors` robi wyłącznie keyed lookupy po łańcuchu
   0–2 hopów. Werdykt: SCOPED (istniejąca maszyneria: walk łańcucha + watchery na odwiedzone klucze)
   **+ dedup: jeden provider per ReportScreen zamiast 4 instancji**. Odczyt ≤6 memberów vs 3 pełne
   kolekcje — jednoznaczna wygrana.
8. **C3.1 `useActiveDraftReportAction`: REPORT_ACTIONS + REPORT_ACTIONS_DRAFTS roty; selektory i tak
   tną do widocznego raportu+wątku+ancestorów.** Werdykt: MEMBER (klucze znane z ekranu + ancestors).
9. **A3 `registerPaginationConfig`: REPORT+RNVP roty dla sortItems (1 member każdej per wywołanie).**
   Sort odpala się po odpowiedzi OpenReport/GetOlderActions — ten raport jest z definicji ciepły.
   Werdykt: CACHE (keyed `tryGetCachedValue`).
10. **B3 `FullstoryUserContextHandler` / B4 `ProductTrainingContext` / B8 `ProductMarketingWindow`:
    cała POLICY → tożsamość analityki / 3 booleany / lista adminów.** Werdykt: DEFER
    (`useAppReadyOnyxValue`) — treści nie-krytyczne przed interaktywnością.
11. **B5 `MarkAllMessagesAsReadHandler`: cała RNVP trzymana pod skrót klawiszowy.** Werdykt:
    INTERACTION — hydrate/odczyt przy naciśnięciu skrótu.
12. **B2 `PriorityModeHandler`: REPORT_DRAFT_COMMENT (mała kolekcja, użycie raz na zmianę trybu).**
    Werdykt: DEFER (niski priorytet; koszt mały).
13. **[ZROBIONE, niezacommitowane — do przeglądu] `WideRHPContextProvider`: cała REPORT → lookup
    `type` 1 raportu w callbacku otwarcia RHP.** Zamienione na CACHE (`tryGetCachedValue`); zimny
    miss pomija tylko wykluczenie invoice/task, które koryguje wyrenderowany ekran.

## P2 — Home landing: sekcje strony głównej (największy klaster)

14. **C1 `useTodoCounts` (6 rotów → 4 liczby!), `useReviewFlaggedExpenses` (4 roty → 1 liczba),
    TimeSensitive/YourSpend(SNAPSHOT)/RecentlyAdded(TRANSACTION)/Insights/UpcomingTravel(REPORT)/
    FreeTrial/GettingStarted, QuickCreationActionsBar (wide).** Flagi `enabled` mrożą tylko wynik —
    subskrypcje są bezwarunkowe. Werdykt dwustopniowy:
    - **Teraz: DEFER-UI** — bramkowanie subskrypcji sekcji za app-ready (sekcje wchodzą ze
      skeletonem chwilę po interaktywności). Zachowuje dzisiejszą wydajność liczenia (jedna paczka
      danych zamiast N zapytań), zdejmuje wszystko z TTI.
    - **⚑NOWY-MECHANIZM (decyzja):** docelowo liczniki/flagi to agregaty — kandydat na **projekcje
      agregujące** w scoped materializerze (mały singleton `DERIVED.TODO_COUNTS` utrzymywany
      przyrostowo przy zapisie) i/lub **COUNT w query API**. Bez tego każda „liczba na Home" zawsze
      będzie czytać szeroko.

## P3 — przypadki wymagające decyzji (⚑ nowe indeksy / mechanizmy / semantyka)

15. **⚑NOWY-INDEKS `chatType` na REPORT** — odblokowuje: listę mention „#" (C3.5 SuggestionMention —
    dziś cała REPORT pod pisanie „#"; werdykt INTERACTION+QUERY), workspace-chaty FAB-a (C2.1
    `useScanActions` — INTERACTION+QUERY), trip roomy (C1.7). Koszt: jeden partial index.
16. **⚑Dot-path/exists w where** — B6 `RequireTwoFactorAuthenticationOverlay` (POLICY → boolean
    „Xero wymaga 2FA"; pole zagnieżdżone w `connections`) i trip-roomy (`tripData` exists). Jeśli
    `getFieldValue` nie wspiera ścieżek — mała zmiana w DSL; alternatywnie B6 = KEEP (gate
    bezpieczeństwa, świadomie pełna subskrypcja) albo DEFER z akceptacją okna pre-ready bez gate'u.
    **Decyzja semantyczna użytkownika.**
17. **`findLastAccessedReport` (C0.1 ReportsSplitNavigator RNVP-rota, C3.4 ReportRouteParamHandler
    RNVP+REPORT-selector)** — jednorazowe wyliczenie przy starcie nawigatora; dziś sync w useState
    initializerze. Fine-grained wymaga asynchronicznego initu (query po `private_isArchived` — indeks
    JUŻ JEST — + REPORT_LAST_VISIT_TIMES singleton) albo małej projekcji „lastAccessedReportID".
    Werdykt: QUERY z przeprojektowaniem na async — **do decyzji, bo dotyka wyboru raportu
    startowego** (zły fallback = inny ekran po deep linku).
18. **C4 wariant expense-report** (MoneyReportHeaderSecondaryActions + hooki, TransactionList
    VIOLATIONS-rota, per-row RNVP, MRHSA) — werdykt: MEMBER/INTERACTION istniejącymi prymitywami
    (dropdowny liczone przy otwarciu; violations per-report już mamy) — rozmiar transzy T4;
    proponuję osobny przebieg po akceptacji audytu.

## KEEP (świadomie zostawić)

- **B7 klasyczny sidebar provider** — flag-gated (`LAZY_LHN`); UWAGA: default flagi = false, więc
  build bez env bierze klasyka (6 rotów przy boot). Decyzja: czy default przełączyć na true po
  pomiarach.
- **REPORT_DRAFT_COMMENT roty** (lazy provider LHN, PriorityModeHandler) — kolekcja malutka;
  zamiana nie zwróci kosztu.
- **C5 context menu** — już za `requestIdleCallback`; po fixie `useAncestors` znika reszta.
- **openApp hydrate(POLICY/REPORT)** — świadoma decyzja fazy 3 (parametry żądania wymagają pełnego
  obrazu); pozostaje do czasu zmiany protokołu backendu.

  **Rekomendacja protokołowa (poza POC, backend):** OpenApp/ReconnectApp powinny móc działać w
  trybie kursora — klient wysyła tylko `updateIDFrom` (mechanizm reliable updates /
  `ONYX_UPDATES_LAST_UPDATE_ID_APPLIED_TO_CLIENT` już istnieje), a serwer odtwarza deltę z logu
  zdarzeń per konto (łącznie ze zmianami uprawnień — odebranie dostępu do polisy). `policyIDList`
  zostaje wyłącznie w ścieżce awaryjnej pełnej rekonsyliacji (kursor za stary / luka w logu).
  To jedyny wariant, który USUWA lokalny odczyt: digest/hash zbioru ID nadal wymaga znajomości
  zbioru lokalnie (ten sam I/O), wersja-per-domena wymaga stanu per konto na serwerze. Po stronie
  klienta granica opłacalności bez zmiany protokołu = odczyt samych ID+flagi optimistic
  (mini-projekcja albo column-projection w query API — patrz P3).

## Czyste (zweryfikowane)

setup/index, index.js, ścieżka push (keyed), guardy poza SubmitPlan, ActiveClientManager, cały
provider stack App.tsx, wymienione w raporcie drzewa LHN/Report poza pozycjami wyżej, wszystkie
wcześniej odroczone moduły. Brak dynamicznych connectów do rotów poza silnikiem derived.
