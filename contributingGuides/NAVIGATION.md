# Overview

The navigation in the app is built on top of the `react-navigation` library. To meet all cross-platform requirements and challenges, multiple custom navigators and features have been implemented. The following documentation will help you understand how to effectively use them to create new screens and navigate within the application.

## Terminology

`RHP` - Right hand panel that shows content inside a dismissible modal that takes up a partial portion of the screen on large format devices e.g. desktop/web/tablets. On smaller screens, the content shown in the RHP fills the entire screen.

`LHP` - Left hand pane. Same as RHP, but displayed on the left side of the screen.

`Full screen` - A screen or navigator occupying the entire available screen space (sidebar and central part). 

Navigation Actions - User actions correspond to resulting navigation actions that we will define now. The navigation actions are: `Back`, `Up`, `Dismiss`, `Forward` and `Push`.

- `Back` - Moves the user “back” in the history stack by popping the screen or stack of screens. Note: This can potentially make the user exit the app itself (native) or display a previous app (not Expensify), or just the empty state of the browser.

- `Up` - Pops the current screen off the current stack. This action is very easy to confuse with `Back`. Unless you’ve navigated from one screen to a nested screen in a stack of screens, these actions will almost always be the same. Unlike a “back” action, “up” should never result in the user exiting the app and should only be an option if there is somewhere to go “up” to.

- `Dismiss` - Closes any modals (outside the navigation hierarchy) or pops a nested stack of screens off returning the user to the previous screen in the main stack.

- `Forward` - This will take you forward in the history stack. Can only be invoked after you have gone `Back` at least once. Note: Only possible on web.

- `Push` - Either adds a new individual screen to the main stack or a nested stack of screens to the main stack with the user pointed at the last index of the pushed stack.

- `Replace` - Replaces the current screen/navigator with a new one. 

- `Switch policy ID` - changes the currently selected workspace in the application. This action can only be called from 2 tabs: Inbox (`ReportsSplitNavigator`) and Reports (`Search`). Calling this action results in pushing a new `ReportsSplitNavigator` or `Search` with a changed workspace to the navigation stack.

## Custom navigators

`react-navigation` provides a few fundamental navigators: `StackNavigator`, `DrawerNavigator` etc.

To handle unique application requirements, two custom navigators were created to help extend the functionality of the basic `StackNavigator`: `RootStackNavigator` and `SplitNavigator`.

### RootStackNavigator

This type of navigator is used only once in the app and it is in the root of navigation. It extends the basic functionality of `StackNavigator`. 
Custom functionalities handled by this navigator:
- handling policy id in workspace switcher
- passing the currently selected policy id between tabs
- preventing users from going back in history during onboarding

### SplitNavigator

This type of navigator is also based on `StackNavigator`. It has two types of screens.

-   Sidebar screens -> There is only one screen of this type on the stack and it is always the first one in the SplitNavigator stack.
-   Central screens -> All other screens

On narrow layout it behaves as a normal `StackNavigator`.

On wide layout, a sidebar screen is translated to the left to make it visible. This way, the user will see both a sidebar screen and a central screen.

Thanks to this navigator, there is always at least one side screen and one center screen in a wide layout.

`react-navigation` provides a few fundamental navigators: `StackNavigator`, `DrawerNavigator` etc.

To handle unique application requirements, two custom navigators were created to help extend the functionality of the basic `StackNavigator`: `RootStackNavigator` and `SplitNavigator`.

## Screens and navigators of the app

The main navigator has multiple screens, some of which have nested navigators. Screens containing nested navigators are divided into two groups.

### Full screens

These screens / navigators cover the entire screen and do not have transparent overlay. Each of them has a bottom tab bar icon that is highlighted when that screen is at the top of the navigation stack or visible under the modal navigator overlay.

It is worth noting that despite the bottom tab being displayed, the application does not use `BottomTabNavigator`. When one of the bottom tab bar buttons is pressed, a new full screen is pushed onto the root stack. `StackNavigator` was used to implement this groups of screens as it has more flexibility and preserves navigation history in the browser.

#### `REPORTS_SPLIT_NAVIGATOR` -> Inbox icon

It includes the `HOME` screen (`<BaseSidebarScreen />` component) with a list of reports as a sidebar screen and the `REPORT` screen displayed as a central one. There can be multiple report screens in the stack with different report IDs.

<!-- change the name in code -->

#### `SEARCH` (screen) -> Search icon

Something worth noticing is even though the Search Page may visually look like a split navigator, it is a single screen. It is implemented this way to meet the requirement that the sidebar and the central screen of the Search page have the same URL. 

#### `SETTINGS_SPLIT_NAVIGATOR` -> Settings icon

`SettingsSplitNavigator` is responsible for displaying user profile settings screens. The URLs of these pages start with `/settings` and the sidebar component is `<InitialSettingsPage />`. 

#### `WORKSPACE_SPLIT_NAVIGATOR` -> Settings icon

`WorkspaceSplitNavigator` displays the settings of the selected workspace (the URLs start with `/settings/workspaces/:policyID`). `<WorkspaceInitialPage />` is the sidebar screen component of this navigator.

## Modals

These screens / navigators have a transparent overlay underneath.

On a wide layout, there is functionality to ensure that there is at least one full screen below the modal on the stack that is visible under the overlay.

### `RIGHT_MODAL_NAVIGATOR` (RHP - Right Hand Panel)

One of the two side modal navigators.

On narrow layout it will work as normal `StackNavigator`

On wide layout it will be displayed on the right with transparent overlay underneath.

<!-- Add links -->

It contains many flows that are stack navigators. You can find them here

### `LEFT_MODAL_NAVIGATOR` (LHP - Left Hand Panel)

One of the two side modal navigators.

This is the mirror image of RHP. Currently it contains only one screen which is `WORKSPACE_SWITCHER`.

## Adding RHP flows

Most of the time, if you want to add some of the flows concerning one of your reports, e.g. `Money Request` from a user, you will most probably use `RightModalNavigator.tsx` and `ModalStackNavigators.tsx` file:

- Since each of those flows is kind of a modal stack, if you want to add a page to the existing flow, you should just add a page to the correct stack in `ModalStackNavigators.tsx`.

- If you want to create new flow, add a `Screen` in `RightModalNavigator.tsx` and make new modal in `ModalStackNavigators.tsx` with chosen pages.

When creating RHP flows, you have to remember a couple of things:

- Since you can deeplink to different pages inside the RHP navigator, it is important to provide the possibility for the user to properly navigate back from any page with UP press (`HeaderWithBackButton` component).

- An example can be deeplinking to `/settings/profile/timezone/select`. From there, when pressing the UP button, you should navigate to `/settings/profile/timezone`, so in order for it to work, you should provide the correct route in `onBackButtonPress` prop of `HeaderWithBackButton` (`Navigation.goBack(ROUTES.SETTINGS_PROFILE)` in this example). 

- We use a custom `goBack` function to handle the browser and the `react-navigation` history stack. Under the hood, it resolves to either replacing the current screen with the one we navigate to (deeplinking scenario) or just going back if we reached the current page by navigating in App (pops the screen). It ensures the requested behaviors on web, which is navigating back to the place from where you deeplinked when going into the RHP flow by it.

- If you want to navigate to a certain report after completing a flow related to it, e.g. `RequestMoney` flow with a certain group/user, you should use `Navigation.dismissModal` with this `reportID` as an argument. If, in the future, we would like to navigate to something different than the report after such flows, the API should be rather easy to change. We do it like that in order to replace the RHP flow with the new report instead of pushing it, so pressing the back button does not navigate back to the ending page of the flow. If we were to navigate to the same report, we just pop the RHP modal.

### Example of usage

An example of adding `Settings_Workspaces` page:

1. Add the page name to `SCREENS.ts` which will be reused throughout the app (linkingConfig, navigators, etc.):
    
```ts
const SCREENS = {
    SETTINGS: {
        WORKSPACES: 'Settings_Workspaces',
    },
} as const;
```

2. Add path to `ROUTES.ts`: https://github.com/Expensify/App/blob/main/src/ROUTES.ts

```ts
export const ROUTES = {
    // static route
    SETTINGS_WORKSPACES: 'settings/workspaces',
    // dynamic route
    SETTINGS_WORKSPACES: {
        route: 'settings/:accountID',
        getRoute: (accountID: number) => `settings/${accountID}` as const,
    },
};

```

3. Add `Settings_Workspaces` page to proper RHP flow in `linkingConfig.ts`: https://github.com/Expensify/App/blob/fbc11ca729ffa4676fb3bc8cd110ac3890debff6/src/libs/Navigation/linkingConfig.ts#L47-L50

4. Add your page to proper navigator (it should be aligned with where you've put it in the previous step) https://github.com/Expensify/App/blob/fbc11ca729ffa4676fb3bc8cd110ac3890debff6/src/libs/Navigation/AppNavigator/ModalStackNavigators.js#L141

5. Make sure `HeaderWithBackButton` leads to the previous page in navigation flow of your page: https://github.com/Expensify/App/blob/3531af22dcadaa94ed11eccf370517dca0b8c305/src/pages/workspace/WorkspacesListPage.js#L186

## Performance solutions

Using [react-freeze](https://github.com/software-mansion/react-freeze) allows us to increase performance by avoiding unnecessary re-renders of screens that aren’t visible to the user anyway.

- To ensure that the user doesn't ever see frozen report content, we are freezing the screens from 2 levels down the `RootStack` (which contains a `Screen` for each report), so when dismissing with a swipe, the user always sees the content of the previous report.

- We want to freeze as high in the view hierarchy as we can, so we do it in a `Screen` of `RootStack`, being `CentralPaneNavigator` and `SidebarScreen`.

- We want the report content visible as fast as possible, and at the same time we want the navigation animation to trigger instantly. To do so, we do a hack with `firstRenderRef` which renders `ReportActionsSkeletonView` instead of the messages at the first render, and the proper content afterward. It works since there are always more renders of `ReportScreen` before the content shows up (hopefully).

## Handling wide and narrow layouts

- The wide and narrow layouts are conditionally rendered with different components in `createResponsiveNavigator` depending on screen size (`isSmallScreen` prop from the `withWindowDimension.js`).

- The wide layout is rendered with our custom `ThreePaneView.js` and the narrow layout is rendered with `StackView` from `@react-navigation/stack`

- To make sure that we have the correct navigation state after changing the layout, we need to force react to create new instance of the `NavigationContainer`. Without this, the navigation state could be broken after changing the type of layout.

- We are getting the new instance by changing the `key` prop of `NavigationContainer` that depends on the `isSmallScreenWidth`.

- To keep the navigation state that was present before changing the layout, we save the state on every change and use it for the `initialState` prop.
Changing the layout means that every component inside `NavigationContainer` is mounted anew.

## Why we need to use minimal action in the `linkTo` function

### The problem 
Let's assume that the user wants to navigate like this:

```
1. Settings_root - navigate > Profile
2. Profile - UP > Settings_root
3. Settings_root - navigate > About 
4. About - browser back button > Settings_root
```

Without minimal action, expected behavior won't be achieved and the final screen will be `Profile`.

Broken behavior is the outcome of two things:
1. Back button in the browser resets the navigation state with the state saved in step two.
   
2. `Navigation.navigate` creates action with `getActionFromState` dispatched at the top level of the navigation hierarchy. 

The reason why `getActionFromState` provided by `react-navigation` is dispatched at the top level of the navigation hierarchy is that it doesn't know about current navigation state, only about desired one.

In this example, it doesn't know if the `RightModalNavigator` and `Settings` are already mounted.


The action for the first step looks like that:

```json
{
    "type": "NAVIGATE",
    "payload": {
        "name": "RightModalNavigator",
        "params": {
            "initial": true,
            "screen": "Settings",
            "params": {
                "initial": true,
                "screen": "Profile",
            }
        }
    }
}
```


That means, the params for the `RightModalNavigator` and `Settings` (also a navigator) will be filled with the information that we want to have the `Profile` screen in the state.

```json
{
    "index": 2,
    "routes": [
        { "name": "Home", },
        {
            "name": "RightModalNavigator",
            // here you can see that the params are filled with the information about structure that should be in the state.
            "params": {
                "initial": true,
                "screen": "Settings",
                "params": {
                    "initial": true,
                    "screen": "Settings_Profile",
                    "path": "/settings/profile"
                }
            },
            "state": {
                "index": 0,
                "routes": [
                    {
                        "name": "Settings",
                        // Same here
                        "params": {
                            "initial": true,
                            "screen": "Settings_Profile",
                            "path": "/settings/profile"
                        },
                        "state": {
                            "index": 0,
                            "routes": [
                                {
                                    "name": "Settings_Profile"
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ]
}
```

This information will stay here even if we pop the `Profile` screen and navigate to `About` screen. 

Later on, when the user presses the browser back button expecting that the `Settings_root` screen will appear, the navigation state will be reset with information about the `Profile` screen in the params and this will be used as a source of truth for the navigation. 

### The solution

If we can create simple action that will only push one screen to the existing navigator, we won't fill any params of the navigators. 

The `getMinimalAction` compares action generated by the `getActionFromState` with the current navigation state and tries to find the smallest action possible.

The action for the first step created with `getMinimalAction` looks like this:

```json
{
    "type": "NAVIGATE",
    "payload": {
        "name": "Settings_Profile"
    },
    "target": "Settings-stack-key-xyz"
}
```

### Deeplinking 
There is no minimal action for deeplinking directly to the `Profile` screen. But because the `Settings_root` is not on the stack, pressing UP will reset the params for navigators to the correct ones.