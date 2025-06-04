# Navigation

The navigation in the app is built on top of the `react-navigation` library. To meet all cross-platform requirements and challenges, multiple custom navigators and features were implemented. The following documentation will help you understand how to effectively use them to create new screens and navigate within the application.

## Table of contents

- [Navigation](#navigation)
  - [Table of contents](#table-of-contents)
  - [Guides](#guides)
    - [Moving between screens](#moving-between-screens)
      - [Navigating to a new screen](#navigating-to-a-new-screen)
      - [Going back](#going-back)
      - [Going back with comparing params](#going-back-with-comparing-params)
      - [Going up](#going-up)
      - [Dismissing modals](#dismissing-modals)
      - [Dismissing modals with opening a report](#dismissing-modals-with-opening-a-report)
      - [Summary](#summary)
    - [Adding new screens](#adding-new-screens)
    - [How the state is generated from the path](#how-the-state-is-generated-from-the-path)
    - [When we need to adapt the navigation state (function `adaptStateIfNecessary`)](#when-we-need-to-adapt-the-navigation-state-function-adaptstateifnecessary)
    - [How to use backTo route param](#how-to-use-backto-route-param)
    - [How to set a correct screen below the RHP](#how-to-set-a-correct-screen-below-the-rhp)
    - [Performance solutions](#performance-solutions)
    - [State persistance after page refresh](#state-persistance-after-page-refresh)
      - [How it works](#how-it-works)
      - [Saving last visited paths to session storage](#saving-last-visited-paths-to-session-storage)
      - [Navigating to Accounts](#navigating-to-accounts)
      - [Navigating to workspaces tab](#navigating-to-workspaces-tab)
    - [Debugging](#debugging)
      - [Reading state when it changes](#reading-state-when-it-changes)
      - [Finding the code that calls the navigation function](#finding-the-code-that-calls-the-navigation-function)
  - [Custom navigators](#custom-navigators)
    - [RootStackNavigator](#rootstacknavigator)
    - [FullscreenNavigator / SplitNavigator](#fullscreennavigator--splitnavigator)
      - [`SEARCH_FULLSCREEN_NAVIGATOR` (screen) -\> Reports tab](#search_fullscreen_navigator-screen---reports-tab)
      - [`REPORTS_SPLIT_NAVIGATOR` -\> Inbox tab](#reports_split_navigator---inbox-tab)
      - [`SETTINGS_SPLIT_NAVIGATOR` -\> Account tab](#settings_split_navigator---account-tab)
      - [`WORKSPACE_SPLIT_NAVIGATOR` -\> Workspaces tab](#workspace_split_navigator---workspaces-tab)
    - [Modals](#modals)
      - [`RIGHT_MODAL_NAVIGATOR` (RHP - Right Hand Panel)](#right_modal_navigator-rhp---right-hand-panel)
      - [`NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR`](#navigatorsonboarding_modal_navigator)
  - [API Reference](#api-reference)
    - [Navigation.navigate](#navigationnavigate)
    - [Navigation.goBack](#navigationgoback)
    - [Navigation.dismissModal](#navigationdismissmodal)
    - [Navigation.dismissModalWithReport](#navigationdismissmodalwithreport)
    - [Navigation.popToSidebar](#navigationpoptosidebar)
    - [useRootNavigationState](#userootnavigationstate)

## Guides

### Moving between screens
This section describes the most common cases of moving between screens. Detailed descriptions of the functions and their parameters can be found in the [API Reference](#api-reference) section


#### Navigating to a new screen

```ts
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';

// Basic navigation to a route
Navigation.navigate(ROUTES.HOME);

// Navigation with parameters
Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({
    query: 'type:expense status:all search',
    // additional parameters...
}));

// Navigation with forceReplace - replaces current screen instead of pushing a new one
Navigation.navigate(ROUTES.SEARCH_REPORT.getRoute({reportID: nextReportID, backTo}), {forceReplace: true});

// Navigation with a callback to handle anonymous users
interceptAnonymousUser(() => {
    Navigation.navigate(ROUTES.SETTINGS);
});
```

`Navigation.navigate` is used to go to a specific screen in the app or replace the existing one. This function works based on a custom implementation of the `linkTo` method. Because of this, there are some differences between using our function and `navigate` returned from `useNavigation` hook.

> [!NOTE]
> The most relevant differences between our implementation of `Navigation.navigate` and `navigate` returned from `useNavigation`:
> 1. We pass `route` instead of a screen name, because our implementation of `Navigation.navigate` is based on `linkTo` method which accepts `route` as a parameter
> 2. We import Navigation object from `@libs/Navigation/Navigation` not get it from the hook
> 3. Our method uses `PUSH` not `NAVIGATE` by default!!
> 4. We do not have a separate function `REPLACE`, to use this method you need to pass the `forceReplace` option to `Navigation.navigate`.

#### Going back

```ts
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

// Simple goBack - goes back to the previous screen
Navigation.goBack();
```

To navigate back, we use the `Navigation.goBack` function. We can call this function without any parameters, but the most common case is to call it with `backToRoute`. It is worth remembering that it is possible to deep link to any page in the application, and then we may lose a page to which we should go back from the navigation state. In such a case, we can simply use the mentioned parameter to indicate which page should be opened when going back. You can find more detailed description how to use `backToRoute` in the next paragraph.

> [!NOTE]
> This function should be used mainly with `backToRoute` param. If you want to use it, make sure there is a screen to which you should always go back in a given case and pass its route as a param.

#### Going back with comparing params

```ts
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

Navigation.goBack(ROUTES.REPORT_WITH_ID.getRoute('1'), {compareParams: false});
```

There are cases when the screen has specific route parameters and we want to return to it regardless of their values. To do this, pass options to the `Navigation.goBack` function with the `compareParams` value set to false (this field is optional and is `true` by default). 

Let's consider the case when we have 4 routes on stack, 3 reports with different ids and search on the top. The diagram shows how navigating back works with and without parameter comparison.

```mermaid
flowchart TD
 subgraph subGraph0["compareParams = true"]
        B2["r/1"]
        A2["search"]
        C2["r/2"]
        D2["r/3"]
  end
 subgraph subGraph1["compareParams = false"]
        F2["r/1"]
        E2["search"]
        G2["r/2"]
        H2["r/3"]
  end
    A2 --> B2
    B2 --> C2
    C2 --> D2
    A2 L_A2_D2_0@-. "Navigation.goBack('r/3')" .-> D2
    E2 --> F2
    F2 --> G2
    G2 --> H2
    E2 L_E2_F2_2@-. "Navigation.goBack('r/3', {compareParams:false})" .-> F2


    L_A2_D2_0@{ animation: fast } 
    L_E2_F2_2@{ animation: fast } 
```

#### Going up
```ts
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

// goBack with a specific route - goes back to a specific screen
Navigation.goBack(ROUTES.WORKSPACES_LIST.route);

// goBack with parameters - goes back to a specific screen with parameters
const policyID = 1
Navigation.goBack(ROUTES.WORKSPACE_OVERVIEW.getRoute(policyID));
```

`Navigation.goUp` is a function called by `Navigation.goBack` when we pass `backToRoute` as a param. With this function we can go back to a specific page. This is really useful when we need to keep the order of screens after refreshing the page, then we can simply define which page should be opened after going back. 

It also allows dynamic setting of `backToRoute` which is pretty handy when RHP can be opened from multiple pages. Then we should set `backTo` parameter in the URL, so it is possible to go to the previous page even after refreshing! More information on how to use backTo route param can be found [here](#how-to-use-backto-route-param)

#### Dismissing modals

```ts
import Navigation from '@libs/Navigation/Navigation';

// Simple modal dismissal
Navigation.dismissModal();
```

Many flows in an application are displayed in modals, one of them is RightModalNavigator (RHP) - the most commonly used modal in Expensify. This method is used to close it along with all open pages.

> [!NOTE]
> Why do we need a method other than `Navigation.goBack` to close modals? 
> Let's consider the following case: 
> You are going through a flow which has multiple steps. During this flow you want to close the entire modal, no matter which page you are on. If it was the first screen in this flow, there would be no difference between `Navigation.dismissModal` and `Navigation.goBack`. But after opening several pages in RHP, it is necessary to pop the entire RHP with all the open screens from the navigation state. This is exactly what `Navigation.dismissModal` does.


#### Dismissing modals with opening a report
```ts
import Navigation from '@libs/Navigation/Navigation';

// Dismiss modal with a report only by id
Navigation.dismissModalWithReport({
    reportID: '123',
});

// Dismiss modal with a report by id and other optional params
Navigation.dismissModalWithReport({
    reportID: '123',
    reportActionID: '123',
    referrer: `notification`,
    moneyRequestReportActionID: `123`,
    transactionID: `123`,
    backTo: `r/321`,
});
```


Another common case in Expensify is opening a report from RHP. This happens, for example, after creating a new expense. In this case, you need to close the modal and go to the report. So, as you might expect, you need to call `Navigation.dismissModal` and then `Navigation.navigate` to the report, or even just `Navigation.navigate` will be sufficient if you do not want close the modal and be able to go back to it. And that's basically true, but there are a few additional aspects we need to pay attention to and they are covered in `dismissModalWithReport`.

> [!NOTE]
> Why do we need a separate method to open a report from a modal?
> 1. On a narrow screen we do not want to perform two operations: closing the modal and opening the report, this would cause two actions to be displayed on the screen, which could be confusing for users. Instead of 2 operations we perform replace on the modal, thanks to which there is a smooth transition to the report with simultaneous closing of the modal.
> 2. On a wide screen we need to be sure that the modal has been closed, only then we want to navigate to the report. For this purpose, `navigate` called after `dismissModal` is wrapped in `InteractionManager.runAfterInteractions`.


#### Summary

- `Navigation.navigate` is used to navigate between screens. Remember that it calls the `linkTo` method implemented by us. It accepts the route as a parameter not a screen name.
- `Navigation.goBack` allows you to navigate back to the previous page. You will probably need to pass the `backToRoute` parameter to this method in such cases to preserve the screen order after refreshing the page.
- If you want to go back to the screen regardless of its parameter values, pass `{compareParams: false}` to `Navigation.goBack`.
- If you want to close the entire modal window, regardless of how many pages you have opened, use `Navigation.dismissModal` to do that.
- If you want to open a report from RHP to prevent navigation back to this modal window, use `Navigation.dismissModalWithReport`.

### Adding new screens

To add a new screen you need to:

1. Define constants for screen name and route:
   1. Screen name should be defined in `src/SCREENS.ts`. Find the appropriate place where the new screen name should be added based on where the new screen will be displayed.

   Let's assume we add a new screen to the Account tab.

    ```ts
    // In src/SCREENS.ts
    const SCREENS = {
        // ... existing screens ...
        SETTINGS: {
            // ...
            NEW_SCREEN: 'SETTINGS_NEW_SCREEN'
        },
    } as const;
    ```

    2. Add a new route to `src/ROUTES.ts`. 

    ```ts
     // In src/ROUTES.ts
    const ROUTES = {
        // ... existing routes ...
        NEW_SETTINGS_SCREEN: 'new-settings-screen',
        // OR for a dynamic route:
        NEW_SETTINGS_SCREEN_DYNAMIC: {
            route: 'new-settings-screen/:id',
            getRoute: (id: string) => `new-settings-screen/${id}` as const,
        },
    } as const;
    ```

2. Link screen name to route in `src/libs/Navigation/linkingConfig/config.ts`.

```ts
const config: LinkingOptions<RootNavigatorParamList>['config'] = {
    screens: {
        [NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR]: {
            screens: {
                [SCREENS.SETTINGS.NEW_SCREEN]: {
                    path: ROUTES.NEW_SETTINGS_SCREEN,
                    exact: true,
                },
                // OR for a dynamic route:
                [SCREENS.SETTINGS.NEW_SCREEN]: {
                    path: ROUTES.NEW_SETTINGS_SCREEN_DYNAMIC.route,
                },
            },
        },
    },
};
```

3. Define types for a new screen in `src/libs/Navigation/types.ts`.

```ts
type SettingsSplitNavigatorParamList = {
    ...existing types
    // static 
    [SCREENS.SETTINGS.NEW_SCREEN]: undefined,
    // dynamic
    [SCREENS.SETTINGS.NEW_SCREEN]: {id: number}
};
```

4. Create a new screen component and type props using the newly defined type from the previous step. The new screen component should be placed in the `src/pages` directory

```ts
// src/pages/NewSettingsScreen.tsx
import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import ScreenWrapper from '@components/ScreenWrapper';

type NewSettingsScreenNavigationProps = PlatformStackScreenProps<SettingsSplitNavigatorParamList, typeof SCREENS.SETTINGS.NEW_SCREEN>;

function NewSettingsScreen({route}: NewSettingsScreenNavigationProps) {
    // Your screen component code here
    return (
        <ScreenWrapper>
            {/* Your screen content */}
        </ScreenWrapper>
    );
}

export default NewSettingsScreen;
```

5. Link the component to the screen. To do that you need to find a proper navigator:
   - If you add a central screen, you will probably want to add it to one of the full-screen navigators (SettingsSplitNavgiator, SearchFullScreenNavigator, etc.).

    ```ts
    // src/libs/Navigation/AppNavigator/Navigators/SettingsSplitNavigator.tsx
    type Screens = Partial<Record<keyof SettingsSplitNavigatorParamList, () => React.ComponentType>>;

    const CENTRAL_PANE_SETTINGS_SCREENS = {
        // other account tab screens...
        [SCREENS.SETTINGS.NEW_SCREEN]: () => require<ReactComponentModule>('../../../../pages/NewSettingsScreen').default,
    } satisfies Screens;

    const Split = createSplitNavigator<SettingsSplitNavigatorParamList>();

    function SettingsSplitNavigator() {
        const route = useRoute();
        const splitNavigatorScreenOptions = useSplitNavigatorScreenOptions();

        return (
            <FocusTrapForScreens>
                <Split.Navigator
                    persistentScreens={[SCREENS.SETTINGS.ROOT]}
                    sidebarScreen={SCREENS.SETTINGS.ROOT}
                    defaultCentralScreen={SCREENS.SETTINGS.PROFILE.ROOT}
                    parentRoute={route}
                    screenOptions={splitNavigatorScreenOptions.centralScreen}
                >
                    <Split.Screen
                        name={SCREENS.SETTINGS.ROOT}
                        getComponent={loadInitialSettingsPage}
                        options={splitNavigatorScreenOptions.sidebarScreen}
                    />
                    {Object.entries(CENTRAL_PANE_SETTINGS_SCREENS).map(([screenName, componentGetter]) => {
                        return (
                            <Split.Screen
                                key={screenName}
                                name={screenName as keyof Screens}
                                getComponent={componentGetter}
                            />
                        );
                    })}
                </Split.Navigator>
            </FocusTrapForScreens>
        );
    }

    SettingsSplitNavigator.displayName = 'SettingsSplitNavigator';

    export {CENTRAL_PANE_SETTINGS_SCREENS};
    export default SettingsSplitNavigator;
    ```

   - If you add an RHP screen, you will need to put it to the right navigator in the ModalStackNavigators. In this case, you also need to ensure that the appropriate screen is displayed under the overlay. To cover it, add your screen to a proper mapping file in `src/libs/Navigation/linkingConfig/RELATIONS/index.ts`.

    ```ts
    // src/libs/Navigation/AppNavigator/ModalStackNavigators/index.tsx
    import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
    import type {PlatformStackNavigationOptions} from '@libs/Navigation/PlatformStackNavigation/types';
    import type {SettingsNavigatorParamList} from '@navigation/types';
    import type ReactComponentModule from '@src/types/utils/ReactComponentModule';
    import SCREENS from '@src/SCREENS';

    const SettingsModalStackNavigator = createModalStackNavigator<SettingsNavigatorParamList>({
        // ...existing code
        [SCREENS.SETTINGS.NEW_SCREEN]: () => require<ReactComponentModule>('../../../../pages/NewSettingsScreen').default,
    })
    ```

    Let's assume that we want to have PreferencesPage below our new Settings RHP screen

    ```ts
    // src/libs/Navigation/linkingConfig/RELATIONS/SETTINGS_TO_RHP.ts
    import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
    import SCREENS from '@src/SCREENS';

    // This file is used to define relation between settings split navigator's central screens and RHP screens.
    const SETTINGS_TO_RHP: Partial<Record<keyof SettingsSplitNavigatorParamList, string[]>> = {
        // ...existing code
        [SCREENS.SETTINGS.PREFERENCES.ROOT]: [
            // ...existing code
            SCREENS.SETTINGS.NEW_SCREEN,
        ],
    };

    export default SETTINGS_TO_RHP;
    ```

### How the state is generated from the path

In the following section you will find information on how the navigation state is generated from the path.

`getAdaptedStateFromPath` is a function that parses the passed path into a navigation state. 

In Expenisfy we use a custom implementation of this function because:
- When opening a link leading to an onboarding screen, all previous screens in this flow have to be present in the navigation state.
- In case of opening the RHP, appropriate screens should be pushed to the navigation to be displayed below the overlay. A guide on how to set up a good screen for RHP can be found [here](#how-to-set-a-correct-screen-below-the-rhp).
- When opening the settings of a specific workspace, the workspace list need to be pushed to the state.
- When `backTo` parameter is in the url, we need to build a state also for the screen we want to return to.

Here are examples how the state is generated based on route:

- `settings/workspaces/F0E0A73488F963D3/overview`

```json
{
    "stale": false,
    "type": "stack",
    "key": "stack-Y6ltkyfl0ByRmY80djbVu",
    "index": 1,
    "routeNames": [
        "ReportsSplitNavigator",
        ...,
        "BankConnectionComplete"
    ],
    "routes": [
        {
            "name": "Workspaces_List",
            "key": "Workspaces_List-mWHEpWrZ0zbDPAOy5cDOw"
        },
        {
            "name": "WorkspaceSplitNavigator",
            "state": {
                "stale": false,
                "type": "stack",
                "key": "stack-r0MwxiabAyRaThMcdVRCL",
                "index": 1,
                "routeNames": [
                    "Workspace_Initial",
                    ...,
                    "Policy_Rules"
                ],
                "routes": [
                    {
                        "name": "Workspace_Initial",
                        "params": {
                            "policyID": "F0E0A73488F963D3"
                        },
                        "key": "Workspace_Initial-NrMKkBpUu7xoGwxnJOslU"
                    },
                    {
                        "name": "Workspace_Overview",
                        "params": {
                            "policyID": "1"
                        },
                        "path": "/settings/workspaces/1/overview",
                        "key": "Workspace_Overview-8liYyM7yx2PlF46VoTjfZ"
                    }
                ],
                "history": [
                    "Workspace_Initial-NrMKkBpUu7xoGwxnJOslU",
                    "Workspace_Overview-8liYyM7yx2PlF46VoTjfZ"
                ]
            },
            "key": "WorkspaceSplitNavigator-AsWH0kWn1UmfuUeMcoW4-"
        }
    ],
    "history": [
        "Workspaces_List-mWHEpWrZ0zbDPAOy5cDOw",
        "WorkspaceSplitNavigator-AsWH0kWn1UmfuUeMcoW4-"
    ]
}
```

As you can see after opening the workspace settings of the specific workspace, we need to adapt state to add `WorkspacesListPage` to the state. Thanks to that it is possible to swipe back to the workspaces list when the app is opened from the link.  

- `settings/profile/display-name`

```json
{
    "stale": false,
    "type": "stack",
    "key": "stack-1mnMNRcjspeW2itylSRNS",
    "index": 1,
    "routeNames": [
        "ReportsSplitNavigator",
        ...,
        "BankConnectionComplete"
    ],
    "routes": [
        {
            "name": "SettingsSplitNavigator",
            "state": {
                "stale": false,
                "type": "stack",
                "key": "stack-jgVJmzX3jcSnfk_AW26gq",
                "index": 1,
                "routeNames": [
                    "Settings_Root",
                    "Settings_Preferences",
                    "Settings_Security",
                    "Settings_Profile",
                    "Settings_Wallet",
                    "Settings_About",
                    "Settings_Troubleshoot",
                    "Settings_TeachersUnite",
                    "Settings_Subscription"
                ],
                "routes": [
                    {
                        "name": "Settings_Root",
                        "key": "Settings_Root-tgeJjdm0rIhK6BbeC4sJz"
                    },
                    {
                        "name": "Settings_Profile",
                        "key": "Settings_Profile-w8-9ujEaYbfYFTd5P9fvC"
                    }
                ],
                "history": [
                    "Settings_Root-tgeJjdm0rIhK6BbeC4sJz",
                    "Settings_Profile-w8-9ujEaYbfYFTd5P9fvC"
                ]
            },
            "key": "SettingsSplitNavigator-6GbsGC1MM5YLT6lm3d47I"
        },
        {
            "name": "RightModalNavigator",
            "state": {
                "stale": false,
                "type": "stack",
                "key": "stack-NtlStqLSBYzpsUbgmVOFe",
                "index": 0,
                "routeNames": [
                    "Settings",
                    ...,
                    "ScheduleCall"
                ],
                "routes": [
                    {
                        "name": "Settings",
                        "state": {
                            "stale": false,
                            "type": "stack",
                            "key": "stack-Y5L11fQW5t82MpOEZEUis",
                            "index": 0,
                            "routeNames": [
                                "Settings_Share_Code",
                                ...
                                "Per_Diem_Edit_Currency"
                            ],
                            "routes": [
                                {
                                    "name": "Settings_Display_Name",
                                    "path": "/settings/profile/display-name",
                                    "key": "Settings_Display_Name-G0pJsgF8dTHLlbzVXontn"
                                }
                            ],
                            "history": [
                                "Settings_Display_Name-G0pJsgF8dTHLlbzVXontn"
                            ]
                        },
                        "key": "Settings-cy2uuw6pJmxswxNpRUvl2"
                    }
                ],
                "history": [
                    "Settings-cy2uuw6pJmxswxNpRUvl2"
                ]
            },
            "key": "RightModalNavigator-b1XDwV6vIF23wu4bITfXl"
        }
    ],
    "history": [
        "SettingsSplitNavigator-6GbsGC1MM5YLT6lm3d47I",
        "RightModalNavigator-b1XDwV6vIF23wu4bITfXl"
    ]
}
```

In the above example, we can see that when building a state from a link leading to a screen in RHP, screens that appear below the overlay are also built.

### When we need to adapt the navigation state (function `adaptStateIfNecessary`)

The purpose of `adaptStateIfNecessary` function is to ensure that a given `SplitNavigator` has a sidebar and a central screen when necessary. When is this function used:
- This function is called when the application starts. If we open the application on the central screen, this function will push the sidebar screen.
- When we are on the sidebar on a small screen and we expand it to a wide layout we have to push the central screen to fill the space on the screen.

### How to use backTo route param

Let's consider the following case: 

One screen is accessible from two or more different screens. We need to remember that we can pass `backToRoute` to `Navigation.goBack`, but now it should be set dynamically depending on the screen from which we opened the current page. 

In this case we can use the route parameter `backTo`.

1. Define backTo route param for the target screen in `ROUTES.ts`

   ```ts
    /**
    * Builds a URL with an encoded URI component for the `backTo` param which can be added to the end of URLs
    */
    function getUrlWithBackToParam<TUrl extends string>(url: TUrl, backTo?: string, shouldEncodeURIComponent = true): `${TUrl}` {
        const backToParam = backTo ? (`${url.includes('?') ? '&' : '?'}backTo=${shouldEncodeURIComponent ? encodeURIComponent(backTo) : backTo}` as const) : '';
        return `${url}${backToParam}` as `${TUrl}`;
    }

    const ROUTES = {
        NEW_SETTINGS_SCREEN_WITH_BACK_TO: {
            route: 'new-settings-screen',
            getRoute: (backTo?: string) => getUrlWithBackToParam('new-settings-screen', backTo),
        },
    } as const;
    ```

2. Find the screen to which you want to add `backTo` parameter in `src/libs/Navigation/types.ts` and define it:

```ts
type SettingsSplitNavigatorParamList = {
    ...existing types
    [SCREENS.SETTINGS.NEW_SCREEN_WITH_BACK_TO]: {backTo?: string}
};
```

1. When navigating to this screen from a non-default screen, pass a route to `Navigation.navigation` with `backTo` parameter.

```ts
Navigation.navigate(ROUTES.NEW_SETTINGS_SCREEN_WITH_BACK_TO.getRoute(Navigation.getActiveRoute()))
```

4. In the new screen read `backTo` from `route.params` and pass it to `Navigation.goBack`.

```ts
// src/pages/NewSettingsScreen.tsx
import type {SettingsSplitNavigatorParamList} from '@libs/Navigation/types';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';

type NewSettingsScreenNavigationProps = PlatformStackScreenProps<SettingsSplitNavigatorParamList, typeof SCREENS.SETTINGS.NEW_SCREEN_WITH_BACK_TO>;

const DEFAULT_ROUTE_TO_GO_BACK = ROUTES.SETTINGS;

function NewSettingsScreen({route}: NewSettingsScreenNavigationProps) {
    // Your screen component code here

    return (
        <ScreenWrapper>
          <HeaderWithBackButton
                onBackButtonPress={() => Navigation.goBack(route.params?.backTo ?? DEFAULT_ROUTE_TO_GO_BACK)}
            />
            {/* Your screen content */}
        </ScreenWrapper>
    );
}
```

### How to set a correct screen below the RHP
RHP screens can usually be opened from a specific central screen, of course there are cases where one RHP screen can be used in different tabs (then using `backTo` parameter proves useful), however most often one RHP screen has a specific central screen assigned underneath.

To assign RHP to the appropriate central screen, you need to add it to the proper relation (src/libs/Navigation/linkingConfig/RELATIONS)

For example, if you want to display `SCREENS.SETTINGS.PROFILE.ROOT` in the Account tab under RHP screen, then you need to add the screen to `SETTINGS_TO_RHP`, etc.

```ts
const SETTINGS_TO_RHP: Partial<Record<keyof SettingsSplitNavigatorParamList, string[]>> = {
    [SCREENS.SETTINGS.PROFILE.ROOT]: [
        // ... existing screens ...
        SCREENS.SETTINGS.NEW_RHP_SCREEN,  // Add your new screen here
    ],
    // ... rest of the mapping ...
};
```

> [!NOTE]
> If the RHP screen is not added to any relation, the Inbox tab will be opened underneath by default.

> [!NOTE]
> If a given RHP has a route param `backTo`, the relation of the screen passed as `backTo` will be checked, this allows reusing RHP screens in different tabs.

### Performance solutions

Navigation-related performance improvements have been implemented in the following files:

- `src/libs/Navigation/AppNavigator/createRootStackNavigator/index.tsx`

The optimization is designed to improve performance by limiting the number of mounted screens in the navigation stack.

```ts
function useCustomRootStackNavigatorState({state}: CustomStateHookProps) {
    const lastSplitIndex = state.routes.findLastIndex((route) => isFullScreenName(route.name));
    const routesToRender = state.routes.slice(Math.max(0, lastSplitIndex - 1), state.routes.length);

    return {...state, routes: routesToRender, index: routesToRender.length - 1};
}
```

To optimize the number of routes rendered in `RootStackNavigator` we limit the number of `FullScreenNavigators` rendered to 2.

- `src/libs/Navigation/AppNavigator/createSearchFullscreenNavigator/index.tsx`

```ts
function useCustomEffects(props: CustomEffectsHookProps) {
    useNavigationResetOnLayoutChange(props);
    usePreserveNavigatorState(props.state, props.parentRoute);
}

// This is a custom state hook that is used to render the last two routes in the stack.
// We do this to improve the performance of the search results screen.
function useCustomState({state}: CustomStateHookProps) {
    const routesToRender = [...state.routes.slice(-2)];
    return {...state, routes: routesToRender, index: routesToRender.length - 1};
}
```

To improve performance in `SearchFullScrennNavigator`, only the last 2 routes are rendered.

- `src/libs/Navigation/AppNavigator/createSplitStackNavigator/index.tsx`

```ts
function useCustomEffects(props: CustomEffectsHookProps) {
    useNavigationResetOnLayoutChange(props);
    usePreserveNavigatorState(props.state, props.parentRoute);
}

function useCustomSplitNavigatorState({state}: CustomStateHookProps) {
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const sidebarScreenRoute = state.routes.at(0);

    if (!sidebarScreenRoute) {
        return state;
    }

    const centralScreenRoutes = state.routes.slice(1);
    const routesToRender = shouldUseNarrowLayout ? state.routes.slice(-2) : [sidebarScreenRoute, ...centralScreenRoutes.slice(-2)];

    return {...state, routes: routesToRender, index: routesToRender.length - 1};
}
```
In `SplitNavigators`, only the last 2 routes are rendered in a similar way, but we have to also ensure that the sidebar is on the wide screen at 0 index in the state of this navigator.

> [!NOTE]
> When nested routes are not rendered their state is lost and when returning to these screens it has to be recreated. To do this the state is saved in the `preservedNavigatorStates` object using the `usePreserveNavigatorState` hook.

### State persistance after page refresh

Currently, two of our existing tabs (Account and Workspaces) already save the last visited screen to session storage.
What is also worth mentioning is that we only want to restore the central screen on wide layout, on narrow layout we want the sidebar screen to be the last visited one.

#### How it works

To be able to persist last visited screen in desired tab, we need to have custom session storage keys in `CONST.ts`:
```ts
// src/CONST.TS
import CONST from '@src/CONST';

const SESSION_STORAGE_KEYS = {
    INITIAL_URL: 'INITIAL_URL',
    ACTIVE_WORKSPACE_ID: 'ACTIVE_WORKSPACE_ID',
    RETRY_LAZY_REFRESHED: 'RETRY_LAZY_REFRESHED',
    LAST_REFRESH_TIMESTAMP: 'LAST_REFRESH_TIMESTAMP',
    LAST_VISITED_TAB_PATH: {
        WORKSPACES: 'LAST_VISITED_WORKSPACES_TAB_PATH', // <--
        SETTINGS: 'LAST_VISITED_SETTINGS_TAB_PATH', // <--
    },
} as const;
```

Functions that read saved paths and build state from them can be found in `src/libs/Navigation/helpers/lastVisitedTabPathUtils/index.ts`.

We have the same functions for native platforms without implementations to avoid errors (session storage is only available in browsers).

#### Saving last visited paths to session storage
    
On navigation state change, we check if the last visited screen belongs to the relevant navigator. If so, we store the path in session storage for future retrieval. 

```ts
// src/libs/Navigation/NavigationRoot.tsx
import {Navigation} from '@libs/Navigation/Navigation';
import {NAVIGATORS} from '@src/NAVIGATORS';
import {isWorkspacesTabScreenName} from '@libs/Navigation/helpers/isNavigatorName';
import {saveWorkspacesTabPathToSessionStorage, saveSettingsTabPathToSessionStorage} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import type {NavigationState} from '@react-navigation/native';

function parseAndLogRoute(state: NavigationState) {
    // ...

    Navigation.setIsNavigationReady();
    if (isWorkspacesTabScreenName(state.routes.at(-1)?.name)) { // <--- checking if it is the desired navigator screen
        saveWorkspacesTabPathToSessionStorage(currentPath); // <--- saving the path to session storage
    } else if (state.routes.at(-1)?.name === NAVIGATORS.SETTINGS_SPLIT_NAVIGATOR) { // <--- checking
        saveSettingsTabPathToSessionStorage(currentPath); // <---- saving
    }

    // .....
}
```
When navigating to the Accounts (Settings) or Workspaces tab, we check whether the last visited screen has already been saved to session storage. 

#### Navigating to Accounts

```ts
// src/components/Navigation/NavigationTabBar/index.tsx
import {useCallback} from 'react';
import {Navigation} from '@libs/Navigation/Navigation';
import {ROUTES} from '@src/ROUTES';
import {NAVIGATION_TABS} from '@src/NAVIGATION_TABS';
import {getSettingsTabStateFromSessionStorage, getLastVisitedTabPath} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import {useResponsiveLayout} from '@hooks/useResponsiveLayout';

const navigateToSettings = useCallback(() => {
    if (selectedTab === NAVIGATION_TABS.SETTINGS) {
        return;
    }
    interceptAnonymousUser(() => {
        const settingsTabState = getSettingsTabStateFromSessionStorage(); // <--- retrieving state from session storage
        if (settingsTabState && !shouldUseNarrowLayout) { // as mentioned above we want to restore the central screen only in wide layout
            const lastVisitedSettingsRoute = getLastVisitedTabPath(settingsTabState); // <--- retrieving route using previously saved data
            if (lastVisitedSettingsRoute) { 
                Navigation.navigate(lastVisitedSettingsRoute); // <--- then simply navigating to that route
                return;
            }
        }
        Navigation.navigate(ROUTES.SETTINGS); // <--- normal navigation when narrow layout or there is no saved route in session storage
    });
}, [selectedTab, shouldUseNarrowLayout]);
```

#### Navigating to workspaces tab 

Navigating here is a bit more tricky, as on first 'click' we navigate to the Workspaces list and then we can navigate to certain `WORKSPACE_SPLIT_NAVIGATOR` — unless a last visited screen has been saved in session storage, in which case we go directly to `WORKSPACE_SPLIT_NAVIGATOR`.

```ts
// src/components/Navigation/NavigationTabBar/index.tsx
import {useCallback} from 'react';
import {Navigation} from '@libs/Navigation/Navigation';
import {ROUTES} from '@src/ROUTES';
import {NAVIGATORS} from '@src/NAVIGATORS';
import {SCREENS} from '@src/SCREENS';
import {CONST} from '@src/CONST';
import {isFullScreenName, isWorkspacesTabScreenName} from '@libs/Navigation/helpers/isNavigatorName';
import {getWorkspacesTabStateFromSessionStorage, getLastVisitedWorkspaceTabScreen} from '@libs/Navigation/helpers/lastVisitedTabPathUtils';
import {getPreservedNavigatorState} from '@libs/Navigation/helpers/preserveNavigatorState';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import {useResponsiveLayout} from '@hooks/useResponsiveLayout';
import type {WorkspaceSplitNavigatorParamList} from '@libs/Navigation/types';
import {navigationRef} from '@libs/Navigation/Navigation';

const showWorkspaces = useCallback(() => {
    const rootState = navigationRef.getRootState();
    const topmostFullScreenRoute = rootState.routes.findLast((route) => isFullScreenName(route.name));
    if (!topmostFullScreenRoute) {
        return;
    }

    if (topmostFullScreenRoute.name === NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR) {
        Navigation.goBack(ROUTES.WORKSPACES_LIST.route);
        return;
    }

    interceptAnonymousUser(() => { // this is where magic begins 🪄
        const state = getWorkspacesTabStateFromSessionStorage() ?? rootState; // <--- retrieving state from session storage
        const lastWorkspacesTabNavigatorRoute = state.routes.findLast((route) => isWorkspacesTabScreenName(route.name)); // getting last visited route in workspace split

        // If there is no workspace navigator route, then we should open the workspaces list.
        if (!lastWorkspacesTabNavigatorRoute) {
            Navigation.navigate(ROUTES.WORKSPACES_LIST.route);
            return;
        }

        let workspacesTabState = lastWorkspacesTabNavigatorRoute.state;
        if (!workspacesTabState && lastWorkspacesTabNavigatorRoute.key) {
            workspacesTabState = getPreservedNavigatorState(lastWorkspacesTabNavigatorRoute.key);
        }

        // If there is a workspace navigator route, then we should open the workspace initial screen as it should be "remembered".
        if (lastWorkspacesTabNavigatorRoute.name === NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR) {
            const params = workspacesTabState?.routes.at(0)?.params as WorkspaceSplitNavigatorParamList[typeof SCREENS.WORKSPACE.INITIAL];
            // Screens of this navigator should always have policyID
            if (params.policyID) {
                const workspaceScreenName = !shouldUseNarrowLayout ? getLastVisitedWorkspaceTabScreen() : SCREENS.WORKSPACE.INITIAL;
                // This action will put workspaces list under the workspace split to make sure that we can swipe back to workspaces list.
                navigationRef.dispatch({
                    type: CONST.NAVIGATION.ACTION_TYPE.OPEN_WORKSPACE_SPLIT,
                    payload: {
                        policyID: params.policyID,
                        screenName: workspaceScreenName,
                    },
                });
            }
            return;
        }

        Navigation.navigate(ROUTES.WORKSPACES_LIST.route);
    });
}, [shouldUseNarrowLayout]);
```

### Debugging

#### Reading state when it changes

Often, to find the cause of a bug, it is worth checking how the state changes. To do that quickly, add `console.log` to the `handleStateChange` method in `NavigationRoot.tsx`

```ts
// src/libs/Navigation/NavigationRoot.tsx

    const handleStateChange = (state: NavigationState | undefined) => {
        //...existing code
        // Add console.log here to read the updated state
        console.log("state", state);
    };
```

#### Finding the code that calls the navigation function

The easiest way to find the piece of code from which the navigation method was called is to use a debugger and breakpoints. You should attach a breakpoint in the navigation method and check the call stack, this way you can easily find the navigation method that caused the problem.

## Custom navigators

`react-navigation` provides a few fundamental navigators: `StackNavigator`, `DrawerNavigator` etc.

To handle unique application requirements, custom navigators were created to help extend the functionality of the basic `StackNavigator`: `RootStackNavigator`, `SplitNavigator` and `SearchFullscreenNavigator`.

### RootStackNavigator

This type of navigator is used only once in the app and it is in the root of navigation. It extends the basic functionality of `StackNavigator`. 
Custom functionalities handled by this navigator:
- dismissing modals
- animating central screens on a narrow layout
- preventing users from going back in history during onboarding

### FullscreenNavigator / SplitNavigator

These navigators cover the entire screen and do not have transparent overlay. Each of them has a navigation tab bar icon that is highlighted when that screen is at the top of the navigation stack or visible under the mdal navigator overlay.

It is worth noting that despite the navigation tab is displayed, the application does not use `BottomTabNavigator`. When one of the navigation tab bar buttons is pressed, a new full screen is pushed onto the root stack. `StackNavigator` was used to implement this groups of screens as it has more flexibility and preserves navigation history in the browser.

A subset of `FullScreenNavigators` are `SplitNavigators`:

This type of navigator is also based on `StackNavigator`. It has two types of screens.

-   Sidebar screen -> There is only one screen of this type on the stack and it is always the first one in the SplitNavigator stack (it is present at 0 index in SplitNavigator's routes).
-   Central screen -> All other screens

On a narrow layout it behaves as a normal `StackNavigator`.

On a wide layout, a sidebar screen is translated to the left to make it visible. This way, the user will see both a sidebar screen and a central screen.

Thanks to this navigator, there is always at least one side screen and one center screen in a wide layout.

> [!NOTE]
> To check if a route belongs to a specific group, it is worth using the functions available in `@libs/Navigation/helpers/isNavigatorName`. For example, to check if a route is a `FullScreenNavigator` you can use the `isFullScreenName` function


`FullScreenNavigators` in the app:

#### `SEARCH_FULLSCREEN_NAVIGATOR` (screen) -> Reports tab

Something worth noticing is even though the Search pages may visually look like a split navigator, it is `FullScreenNavigator` with additional `ExtraContent` which displays `<SearchSidebar />`. It is implemented this way to meet the requirement that the sidebar and the central screen of the Search page have the same URL. 

#### `REPORTS_SPLIT_NAVIGATOR` -> Inbox tab

It includes the `HOME` screen (`<BaseSidebarScreen />` component) with a list of reports as a sidebar screen and the `REPORT` screen displayed as a central one. There can be multiple report screens in the stack with different report IDs.

#### `SETTINGS_SPLIT_NAVIGATOR` -> Account tab

`SettingsSplitNavigator` is responsible for displaying user profile settings screens. The URLs of these pages start with `/settings` and the sidebar component is `<InitialSettingsPage />`. 

#### `WORKSPACE_SPLIT_NAVIGATOR` -> Workspaces tab

`WorkspaceSplitNavigator` displays the settings of the selected workspace (the URLs start with `/settings/workspaces`). `<WorkspaceInitialPage />` is the sidebar screen component of this navigator.

> [!NOTE]
> The Workspaces tab is also selected when the workspace list is displayed (`SCREENS.WORKSPACES_LIST`) which is a separate screen displayed in `AuthScreens` next to the other navigators!

### Modals

These screens / navigators have a transparent overlay underneath.

On wide layout we have functionality that ensures that there is at least one full screen under the modal on the stack that will be visible under overlay.

#### `RIGHT_MODAL_NAVIGATOR` (RHP - Right Hand Panel)

It is a side modal navigator displayed on the right side of the screen.

On narrow layout it works as normal `StackNavigator` but on wide layout it is displayed on the right side of the screen with transparent overlay underneath.

#### `NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR`
The screens of this navigator are displayed immediately after creating a new account.
It is worth mentioning that during refresh on any screen, the `OnboardingModalNavigator` state will be rebuilt

> [!NOTE]
> There are more modal navigators in the application, this section only describes those that contain many screens and are displayed quite often.


## API Reference

The Navigation API provides several methods for handling navigation within the application. Each method serves a specific purpose and has its own set of parameters and use cases.

### Navigation.navigate

Navigates to a given page and adds a new entry to the navigation state or replaces the last one.

```ts
import {Navigation} from '@libs/Navigation/Navigation';
import {ROUTES} from '@src/ROUTES';
import type {Route} from '@libs/Navigation/types';
import type {LinkToOptions} from '@libs/Navigation/types';

navigate(path: Route, options?: LinkToOptions)
```

- `path` (required): A string representing one of the routes defined in `ROUTES.ts`
- `options` (optional): An object containing:
  - `forceReplace` (boolean): If set to `true`, the action type will be set to `REPLACE` instead of `PUSH`. Default: `false`

This is the primary function for forward navigation in the app. It differs from the standard `react-navigation` navigate by:
- Handling cross-platform differences and deep linking
- Creating and dispatching `minimalAction` with type `PUSH` by default
- Automatically handling RHP screen navigation by pushing matching screens underneath when needed

### Navigation.goBack

Navigates back to the previous screen or a specified route.

```ts
import {Navigation} from '@libs/Navigation/Navigation';
import {ROUTES} from '@src/ROUTES';
import type {Route} from '@libs/Navigation/types';
import type {GoBackOptions} from '@libs/Navigation/types';

goBack(backToRoute?: Route, options?: GoBackOptions)
```

- `backToRoute` (optional): A route to navigate to back. If the passed screen is not in the navigation state, the current screen will be replaced with the given one.
- `options` (optional): An object containing:
  - `compareParams` (boolean): 
Determines whether a parameter comparison should be performed when navigating back to the path containing the route parameters. If so, we will return to the path with the exact parameters passed to `goBack`, if not, then to the first screen with a matching route regardless of the value of its parameters. Default: `true`

Use this method for backward navigation, especially when:
- You need to return to the previous screen.
- You want to provide a route to go back for cases where there is no history.

Example:
```ts
import {Navigation} from '@libs/Navigation/Navigation';
import {ROUTES} from '@src/ROUTES';

// Simple back navigation
Navigation.goBack();

// Back navigation with fallback
Navigation.goBack(ROUTES.HOME);

const reportID = 123;
// Back navigation to a route with specific params
Navigation.goBack(ROUTES.REPORT_WITH_ID.getRoute(reportID));

// Back navigation to a route without comparing params
Navigation.goBack(ROUTES.REPORT_WITH_ID.getRoute(reportID), {compareParams: false});
```


### Navigation.dismissModal

Closes the currently opened modal.

```ts
import {Navigation} from '@libs/Navigation/Navigation';

Navigation.dismissModal()
```

Use this method when you need to close a modal after completing a flow, such as:
- After submitting the RHP flow (e.g. creating expenses, reports etc.)
- When canceling a modal operation
- When explicitly closing a modal from within its content

Example:
```ts
import {Navigation} from '@libs/Navigation/Navigation';

// Close modal after saving settings
Navigation.dismissModal();
```

### Navigation.dismissModalWithReport

Closes the currently opened side modal and navigates to a report using a report object.

```ts
import {Navigation} from '@libs/Navigation/Navigation';

Navigation.dismissModalWithReport({
    reportID: string,
    reportActionID?: string,
    referrer?: string,
    moneyRequestReportActionID?: string,
    transactionID?: string,
    backTo?: string,
})
```

- `reportID` (required): A string representing the ID of the report to navigate to
- `reportActionID` (optional): A string representing the specific report action to focus on
- `referrer` (optional): A string indicating where the navigation was triggered from (e.g., 'notification')
- `moneyRequestReportActionID` (optional): A string representing the ID of a money request report action
- `transactionID` (optional): A string representing the ID of a transaction
- `backTo` (optional): A string representing the route to return to (e.g., 'r/321')

Use this method when you need to:
- Navigate to a report after completing a modal flow
- Open a specific report action or transaction from modals

Example:
```ts
import {Navigation} from '@libs/Navigation/Navigation';

// Navigate to report with basic parameters
Navigation.dismissModalWithReport({
    reportID: '123',
});

// Navigate to report with full context
Navigation.dismissModalWithReport({
    reportID: '123',
    reportActionID: '456',
    referrer: 'notification',
    moneyRequestReportActionID: '789',
    transactionID: '101112',
    backTo: 'r/321',
});
```

### Navigation.popToSidebar

Navigates back to the sidebar screen in SplitNavigator and pops all central screens at the same time. This function is especially useful after visiting many central screens and changing the screen width from wide to narrow, we can then pop all visited central screens.

```ts
import {Navigation} from '@libs/Navigation/Navigation';

Navigation.popToSidebar()
```

Use this method when you need to:
- Return to the sidebar screen from any central screen in a split navigator
- Pop all visited central screens after resizing the layout from wide to narrow when navigating back to the SplitNavigator sidebar screen.

> [!NOTE]
> This method can be used only within SplitNavigators

### useRootNavigationState

This hook allows you to read the entire navigation state in any component, while using the base `useNavigationState` allows you to read only the current state of the navigator.

```ts
import useRootNavigationState from '@hooks/useRootNavigationState';
import {isFullScreenName} from '@libs/Navigation/helpers/isNavigatorName';
import type {NavigationState} from '@react-navigation/native';

// Example usage of useRootNavigationState
const topmostFullScreenRoute = useRootNavigationState((state: NavigationState) => 
    state.routes.findLast((route) => isFullScreenName(route.name))
);
```