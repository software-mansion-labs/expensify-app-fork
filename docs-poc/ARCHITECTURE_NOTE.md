# Notka: zmiany architektoniczne rozważane w POC lazy-Onyx

> Stan na 2026-08-27, branch `lazy-onyx-poc` (App) + `mateuuszzzzz/react-native-onyx#lazy-onyx`
> (fork biblioteki). Szczegółowe werdykty per miejsce: `PRE_READY_AUDIT.md`; decyzje projektowe
> D1–D14: `LAZY_ONYX_IMPLEMENTATION_PLAN.md`.

Wspólny cel wszystkich zmian: **koszt startu proporcjonalny do tego, co ekran faktycznie pokazuje**,
zamiast proporcjonalnego do rozmiaru konta (dziś boot hydratuje całą bazę do RAM).

---

## TL;DR — jakie zmiany architektoniczne muszą zajść

**W bibliotece (Onyx):**

- **Opt-in lazy dla kolekcji** — init czyta tylko key index + singletony; kolekcje dociągane na
  żądanie (member key / query / jawny `hydrate`).
- **Dodać indeksy w SQLite** — expression indexes po `json_extract`, deklarowane w kodzie aplikacji,
  z reconcile (tworzenie brakujących + drop niezadeklarowanych) odpalanym z idle.
- **Dodać query API nad indeksami** — `where` DSL + keyset cursor + dwa silniki (SQLite dla
  niezhydratowanego, overlay JS dla cache) + strumienie zapisów (`registerQueryWatcher`).
- **Dodać API startu na żądanie** — `onFirstSubscription` (silnik derived startuje przy pierwszej
  subskrypcji outputu), `getHydrationStatus`, rehydratacja po `Onyx.clear`.

**W bazie / layoucie kluczy:**

- **`derivedReportAttributes`: pojedynczy blob → kolekcja per raport** (`derivedReportAttributes_<id>`)
  — inaczej LHN nie może czytać wybiórczo ani sortować w SQLite. To jest ta zmiana layoutu.
- **Materializowane pola sortujące/filtrujące w projekcji** — `sortName` (lowercase pod collation),
  `lhnEligibleDefault` / `lhnEligibleFocus` / `requiresAttention` jako 0|1, `lastVisibleActionCreated`,
  `isPinned` — bo indeksy nie liczą predykatów, tylko czytają pola.
- **Nowy klucz meta** `derivedScopedMeta` — stempel wersji materializera → backfill po zmianie logiki.
- (⚑ do decyzji, DUŻE) **layout `reportActions_<reportID>`: jeden rekord z mapą wszystkich akcji
  raportu → klucze per akcja albo per strona** — patrz sekcja „⚑ Layout report actions" niżej.
- (⚑ do decyzji) dodatkowe indeksy: `chatType`, visibility (public roomy), participant→reports
  (odwrotny), collation dla `sortName`.

**W warstwie derived data (liczyć lazy, nie „wszystko po każdym zapisie"):**

- **Start na żądanie** zamiast przy boot (+ post-ready catch-all dla świeżości).
- **Materializacja per-entry z fan-outu zapisów** zamiast subskrypcji całych kolekcji wejściowych:
  delta zapisu → dotknięte entry (targeted ready + indeksowane query) → przelicz tylko je.
- **Likwidacja wartości, które da się zastąpić zapytaniem** (rTAV, outstanding-by-policy).
- **On-demand computes** dla wartości punktowych (nazwa raportu, atrybuty jednego raportu,
  ancestory) — ta sama logika configa, ale nad scoped store z dociąganiem braków.
- **Chunked sweepy + wersjonowanie** — pełny przelicz porcjami z yieldami, nigdy jednym blokiem.

**W aplikacji (zejście z pełnych kolekcji):**

- **Rot kolekcji → klucz członka / member map** wszędzie, gdzie ID jest znane (uwaga: selector NIE
  ratuje — subskrypcja rota hydratuje całość).
- **Listy → query z indeksem i oknem** (LHN: okno 50/200 + pinned + drafts).
- **Odczyt jednorazowy na ścieżce zdarzenia → warm cache** (`tryGetCachedValue` / `getCachedCollection`).
- **Łańcuchowe odczyty → async walk po member ready + watchery inwalidacji** (ancestory).
- **Ratchet w CI** — licznik gołych subskrypcji rotów, tylko w dół (dziś 609).

**W cyklu startu aplikacji:**

- **`deferUntilAppReady`** — nic, co nie jest potrzebne do pierwszej klatki, nie startuje przed
  app-ready (splash ukryty + nawigacja gotowa); priorytety high/medium/low, drain z idle, fallback
  10 s dla headless. Świadomość ograniczenia: **defer przenosi koszt, nie usuwa go**.
- **Zakaz side-effectów w importach** — module-level connecty do rotów rejestrują się z defera
  (docelowo: znikają na rzecz odczytów punktowych).

**Protokół z serwerem (poza POC, wymaga backendu):**

- **OpenApp/ReconnectApp w trybie kursora** (`updateID` watermark) zamiast klienckiej listy
  `policyIDList` — dziś to jedyne miejsce, które MUSI przeczytać całe POLICY/REPORT, żeby zbudować
  parametry żądania.

---

## 1. Lazy hydratacja kolekcji (fundament — fork Onyxa)

- `Onyx.init({lazyCollections})` — kolekcje z allowlisty NIE są ładowane przy starcie; init czyta
  tylko **key index** (kompletną listę kluczy) + eager singletony. W POC lazy są WSZYSTKIE
  persystowane kolekcje.
- Trzy stany hydratacji per kolekcja (`getHydrationStatus`): not-hydrated / hydrating / hydrated.
- Subskrypcja **klucza członka** (`report_123`) hydratuje tylko ten wpis; subskrypcja **rota
  kolekcji** (`report_`) hydratuje całość (selektory tego nie zmieniają!). Stąd cała praca w app:
  zamieniać roty na członków/query.
- `Onyx.hydrate(collectionKey)` — jawna, awaitowalna pełna hydratacja (dedup przez task), dla
  miejsc które świadomie potrzebują całości (openApp).
- Twarde inwarianty biblioteki: key index zawsze kompletny (guard na cross-account leak po
  `Onyx.clear`), subskrybent nigdy nie dostaje wartości nie-załadowanej, rehydratacja
  subskrybowanych kolekcji po clear.

## 2. Indeksy na bazie + query API (punkty 1 i 5)

Mechanizm (fork): `Onyx.init({indexes})` + `Onyx.reconcileIndexes()` — tworzy brakujące indeksy
SQLite (expression indexes po `json_extract`), wykrywa i **dropuje niezadeklarowane** `onyx_idx_*`
(deklaracja w kodzie = jedyne źródło prawdy). Kompozytowe przez `string[]`, `record_key`
doklejany automatycznie, literały zakresu partial indexów inline'owane w DDL i w zapytaniu
(SQLite nie planuje partial indexów przez bound params). Budowa indeksów = O(kolekcji), więc
`reconcileIndexes()` odpalany z idle po app-ready, nigdy na ścieżce boot.

Zadeklarowane dziś (`src/setup/index.ts`):

| Kolekcja | Indeksy | Po co |
|---|---|---|
| `report_` | `policyID`, `lastVisibleActionCreated`, `parentReportID`, `type`, `chatReportID` | fan-out derived (raporty polisy, dzieci czatu), sort po świeżości |
| `transactions_` | `reportID` | transakcje raportu bez pełnego skanu |
| `reportNameValuePairs_` | `private_isArchived` | filtr archiwum (LHN, findLastAccessedReport) |
| `derivedReportAttributes_` | `(lhnEligibleDefault, lastVisibleActionCreated)`, `(lhnEligibleFocus, sortName)`, `isPinned` | SOTA LHN: sort/filtr obu trybów + grupa pinned w całości w SQLite |

Nad indeksami stoi **query API** (fork): `queryCollection` / `useOnyxQuery` /
`useDrainedOnyxQuery` — mini-DSL `where` (eq/neq/in/gt/gte/lt/lte, tylko AND), keyset cursor,
dwa silniki (SQLite po `json_extract` dla niezhydratowanych + overlay JS dla cache — cache
wygrywa per klucz), live przez patch-then-reconcile z ograniczonym oknem (~200);
`registerQueryWatcher` = strumienie zapisów (dostarczają DELTY merge, nie pełne wartości).

Zgłoszone, jeszcze NIE wdrożone (⚑ czekają na decyzje/pomiary): indeks `chatType`; indeks
odwrotny participant→reports; indeks visibility (public roomy); collation dla `sortName`;
dot-path/`exists` w DSL; prymityw `COUNT`; column-projection (czytanie pojedynczych pól — zdjąłby
i openApp `policyIDList`, i agregaty).

## 3. Derived data lazy (punkt 2)

Trzy zmiany, kolejno coraz głębsze:

1. **Demand-driven start silników**: `initOnyxDerivedValues()` tylko rejestruje configi; silnik
   danej wartości (subskrypcje zależności → hydratacja → compute) startuje przy PIERWSZEJ
   subskrypcji do jej klucza wyjściowego (`onFirstSubscription` na forku), z post-ready
   catch-allem dla świeżości persystowanych outputów. Chroni ścieżkę pre-ready.
2. **Retirements**: dwie wartości derived w ogóle zlikwidowane — `reportTransactionsAndViolations`
   i `outstandingReportsByPolicyID` zastąpione zapytaniami on-demand po indeksie `reportID` /
   `policyID` (hooki `useQueriedReportTransactionsAndViolations`, `useOutstandingReportsForPolicy`).
3. **Scoped write-time materializers** (`OnyxDerived/scopedMaterializer.ts`) dla trzech ciężkich
   configów (`reportAttributes`, `visibleReportActions`, `sortedReportActions`): zamiast
   subskrybować całe kolekcje wejściowe, silnik nasłuchuje strumieni zapisów
   (`registerQueryWatcher`), mapuje deltę na dotknięte entry (fan-out przez targeted ready
   i indeksowane query, np. raporty polisy), przelicza per-entry z ograniczoną współbieżnością
   i zapisuje przyrostowo. Do tego: chunked sweepy (pełny przelicz porcjami z yieldami), stempel
   wersji → backfill po zmianie logiki, ponowne uzbrojenie po `Onyx.clear`, outputy RAM-only bez
   stempla (sweep co start). **Efekt: zero subskrypcji do całych kolekcji w warstwie derived.**
4. Uzupełnienie: **on-demand computes** dla wartości potrzebnych punktowo — nazwa raportu, pełne
   atrybuty jednego raportu, łańcuch ancestorów, visible actions per raport. Wzorzec wspólny
   (`OnDemandOnyxStore`): scoped store + tracked Proxy (fixpoint dociągania braków) wokół
   NIEZMIENIONEJ logiki configa, zbiór odwiedzonych kluczy steruje watcherami inwalidacji.
   Konsumenci (~25+ miejsc) delegują bez zmian semantyki.

Świadomie klasyczne (P4): `cards`, `cardFeedErrors`, `loginToAccountIDMap` — wejścia to
singletony/małe kolekcje, scoped nie zwróci kosztu.

## 4. Eliminacja ładowania całych kolekcji (punkt 3)

Metoda: **audyt per miejsce z werdyktem wydajnościowym** (`PRE_READY_AUDIT.md`), nie mechaniczna
zamiana — plus **ratchet** (`scripts/checkBareCollectionSubscriptions.ts` + baseline, tylko w dół;
667 → 609). Główne wzorce zamiany:

- rot + selector tnący po ID → `useMemberMap` / pojedynczy klucz członka (np.
  `useActiveDraftReportAction`, LHN row members);
- łańcuchowe czytanie (ancestory) → asynchroniczny walk po member ready + scoped watchery
  (`useAncestors`: było 3 roty × 4 instancje kompozera = 12 pełnych subskrypcji per czat);
- odczyt jednorazowy na ścieżce zdarzenia → `tryGetCachedValue` / `getCachedCollection` z warm
  cache (openApp params po jawnym hydrate, DeepLinkHandler, WideRHP);
- listy → `useOnyxQuery` z indeksem i oknem.
- **SOTA LHN** (za flagą `LAZY_LHN`, default false): per-report projekcja
  `derivedReportAttributes_<id>` utrzymywana przez materializer + okienkowy provider
  (query 50/200 + pinned + drafts + focused) — sidebar czyta tylko to, co wyświetla. Istotne:
  na mobile LHN montuje się pod ekranem czatu przy KAŻDYM boot, więc ta zmiana gate'uje każdy
  pomiar startu.

Co jeszcze czyta całość: **P2 sekcje Home** (największy klaster pre-ready — plan: bramkowanie za
app-ready), **openApp** (`hydrate(POLICY/REPORT)` pod parametry żądania — KEEP do zmiany
protokołu; rekomendacja: tryb kursora na watermarku `updateID`, `policyIDList` tylko jako fallback
rekonsyliacyjny), P3 (`findLastAccessedReport`, gate 2FA-Xero), oraz ~609 miejsc
interaction-time (poza ścieżką boot; transze T4+).

## 5. deferUntilAppReady (punkt 4)

`src/libs/deferUntilAppReady.ts` — kolejka callbacków odpalana po **app-ready** = splash ukryty +
nawigacja gotowa, z priorytetami `high`/`medium`/`low`, drenowana przez `requestIdleCallback`;
fallback 10 s dla headless (push/background wake), pod jestem SYNCHRONICZNA (testy bez zmian).

Do czego użyty:

- wszystkie **module-level connecty** do rotów kolekcji (17 cache'ów w
  ReportUtils/ReportActionsUtils/IOU + kilkanaście pojedynczych modułów) — boot nie hydratuje już
  nic przez side-effecty importów; cache wypełniają się po starcie („purity step 1"; step 2 =
  całkowita likwidacja tych cache'ów, poza zakresem POC);
- post-ready catch-all silników derived, `reconcileIndexes()`, telemetria;
- hooki `useAppReadyOnyxValue` / `useAppReadyOnyxCollection` — komponent do app-ready czyta
  pasywnie warm cache / dostaje pusty stan, subskrypcja wpina się dopiero po.

Ograniczenie (uczciwie): defer przenosi koszt w czasie, nie usuwa go — pełne I/O modułowych
cache'ów dzieje się nadal, tylko po interaktywności. Usunięcie go to wzorce z pkt 3/4 per miejsce.

---

## ⚑ Layout report actions — granica obecnych mechanizmów

`reportActions_<reportID>` to **jeden rekord Onyxa zawierający mapę WSZYSTKICH akcji raportu**
(`{reportActionID: ReportAction}`). Lazy hydratacja jest więc drobnoziarnista **per raport**, ale
nie per akcja — i tego żaden z mechanizmów opisanych wyżej nie rozwiązuje:

1. **Odczyt jest atomowy na poziomie raportu** — otwarcie długiego czatu czyta i parsuje całą mapę
   akcji tego raportu; paginacja (`reportActionsPages_`) dzieje się w JS **po** odczycie, więc nie
   zmniejsza I/O ani kosztu parsowania.
2. **Nie da się indeksować ani querować wewnątrz raportu** — brak wierszy per akcja, więc „ostatnie
   20 akcji" zawsze wymaga pełnego odczytu rekordu. Indeksy i query API działają tylko między
   raportami (`chatReportID`, `parentReportID`), nie w środku.
3. **Materializer przelicza całą mapę raportu przy zapisie jednej akcji** — granularność zapisu
   (delta na jedną akcję) jest lepsza niż granularność przeliczenia (cały raport).

**Kandydat na zmianę**: rozbicie na klucze per akcja (`reportAction_<reportID>_<actionID>`) albo per
stronę — dopiero to otwiera indeksy po `created`/`actionName`, prawdziwą paginację na poziomie
storage i przeliczanie per akcja. Koszt: dotyka WSZYSTKICH konsumentów akcji, protokołu
paginacji i optimistic writes — projekt większy niż całe dotychczasowe POC.

**Rekomendacja: nie robić tego na wyczucie.** Zmiana nie dotyka boot z Home, tylko **landingu na
czacie** (i płynności długich czatów) — czyli dokładnie tego, co pomiary fazy 4 mierzą osobno.
Decyzja po liczbach: jeśli odczyt+parsowanie mapy akcji jest istotną częścią chat-landingu, layout
staje się priorytetem; jeśli nie — zostaje jako znane ograniczenie.

**Co w POC już zrobione po stronie report actions** (bez zmiany layoutu): dwa derived na scoped
materializerach (`visibleReportActions`, `sortedReportActions` — per raport, fan-out czatu przez
indeks `chatReportID`, sweep na flip online/offline); `useVisibleActionsEntryForReport` (member key)
w 4 konsumentach; `useAncestors` na member ready (–12 subskrypcji rotów na każdy otwarty czat);
`useActiveDraftReportAction` na member mapach; module cache'e w
ReportActionsUtils/ReportUtils/OptionsListUtils/IOU i akcjach za deferem; paginacja i mark-all-read
na warm cache / jawnym hydrate. Zostało ~20 gołych subskrypcji rota w kodzie interaction-time,
z czego `useTodoCounts` i `useTimeSensitiveSignerInfo` należą do P2 (sekcje Home).

---

## Otwarte decyzje przed/po pomiarach

1. **P2**: bramkowanie subskrypcji sekcji Home za app-ready (skeleton przez chwilę) — czeka na go.
2. **P3**: indeks `chatType`; dot-path/`exists` w DSL; async redesign `findLastAccessedReport`;
   transza C4 (expense-variant).
3. Default `LAZY_LHN` (dziś false).
4. Agregaty (liczniki Home): flagi w projekcji + `COUNT` w query API vs licznik przyrostowy —
   po pomiarach.
5. Protokół openApp (kursor zamiast `policyIDList`) — backend, poza POC.
6. **Layout report actions** (klucze per akcja/stronę) — decyzja wyłącznie po pomiarze
   chat-landingu; największy pojedynczy kandydat wśród zmian, które POC świadomie pominął.
