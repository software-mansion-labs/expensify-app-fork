import {getOnboardingInitialPath, getRequired2FAOnboardingResumePath, startOnboardingFlow} from '@libs/actions/Welcome/OnboardingFlow';
import type {GetOnboardingInitialPathParamsType} from '@libs/actions/Welcome/OnboardingFlow';
import navigationRef from '@libs/Navigation/navigationRef';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';

import type {NavigationState} from '@react-navigation/native';

// Only the three methods startOnboardingFlow uses. getAdaptedStateFromPath is deliberately NOT mocked:
// the guard's correctness depends on the shape that helper really produces, so the test uses the real one.
jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {
        getRootState: jest.fn(),
        resetRoot: jest.fn(),
        isReady: jest.fn(() => true),
    },
}));

describe('OnboardingFlow', () => {
    describe('getOnboardingInitialPath', () => {
        it('should return the onboarding fallback path when the last visited path is null', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: false,
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.PERSONAL_SPEND,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: null,
                onboardingValues: undefined,
            };

            let path = '';
            expect(() => {
                path = getOnboardingInitialPath(params);
            }).not.toThrow();
            expect(path).toBe('/onboarding');
        });

        it('should return the correct path for personal spend', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.INDIVIDUAL,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.PERSONAL_SPEND,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '',
                onboardingValues: undefined,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/personal-details');
        });

        it('should return the correct path for SMB', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.SMB,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.EMPLOYER,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/',
                onboardingValues: undefined,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/work-email');
        });

        it('should return the correct path for VSB', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: false,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.VSB,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.EMPLOYER,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/',
                onboardingValues: undefined,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/employees');
        });

        it('should return the correct path for SMB and is not from public domain', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: false,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.SMB,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.SUBMIT,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/',
                onboardingValues: undefined,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/employees');
        });

        it('should skip the work email step when the account is already validated', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.SMB,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.EMPLOYER,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/',
                onboardingValues: undefined,
                isAccountValidated: true,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).not.toBe('/onboarding/work-email');
            expect(path).toBe('/onboarding/employees');
        });

        it('should still route to the work email step when the account is not validated', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: false,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.SMB,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.EMPLOYER,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/',
                onboardingValues: undefined,
                isAccountValidated: false,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/work-email');
        });

        it('should skip a private-domain URL for a public-domain validated user', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: true,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.INDIVIDUAL,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.PERSONAL_SPEND,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/onboarding/private-domain',
                onboardingValues: undefined,
                isAccountValidated: true,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).toBe('/onboarding/purpose');
        });

        it('should not redirect away from a private-domain URL for a public-domain unvalidated user', () => {
            // Mirrors the BaseOnboardingPrivateDomain screen-level guard: an unvalidated public-domain user who just
            // submitted a work email may land here while isFromPublicDomain is stale. They must keep the private-domain step.
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: false,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: true,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.INDIVIDUAL,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.PERSONAL_SPEND,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/onboarding/private-domain',
                onboardingValues: undefined,
                isAccountValidated: false,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).not.toBe('/onboarding/purpose');
        });

        it('should not redirect away from a work-email-validation URL for a public-domain user', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: true,
                onboardingValuesParam: {
                    hasCompletedGuidedSetupFlow: false,
                    shouldRedirectToClassicAfterMerge: false,
                    shouldValidate: true,
                    isMergingAccountBlocked: false,
                    isMergeAccountStepCompleted: true,
                    signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.INDIVIDUAL,
                },
                currentOnboardingPurposeSelected: CONST.ONBOARDING_CHOICES.PERSONAL_SPEND,
                currentOnboardingCompanySize: CONST.ONBOARDING_COMPANY_SIZE.SMALL,
                onboardingInitialPath: '/onboarding/work-email/validation',
                onboardingValues: undefined,
                isAccountValidated: true,
            };
            const path = getOnboardingInitialPath(params);
            expect(path).not.toBe('/onboarding/purpose');
        });
    });

    describe('getRequired2FAOnboardingResumePath', () => {
        it('returns personal-details for private domain users with accessible policies and no saved path', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: true,
                currentOnboardingPurposeSelected: undefined,
                currentOnboardingCompanySize: undefined,
                onboardingInitialPath: null,
                onboardingValues: undefined,
            };

            expect(getRequired2FAOnboardingResumePath(params)).toBe('/onboarding/personal-details');
        });

        it('returns work-email for public domain users with no saved path', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: true,
                hasAccessiblePolicies: false,
                currentOnboardingPurposeSelected: undefined,
                currentOnboardingCompanySize: undefined,
                onboardingInitialPath: '',
                onboardingValues: undefined,
            };

            expect(getRequired2FAOnboardingResumePath(params)).toBe('/onboarding/work-email');
        });

        it('preserves a saved work-email path', () => {
            const params: GetOnboardingInitialPathParamsType = {
                isUserFromPublicDomain: false,
                hasAccessiblePolicies: true,
                currentOnboardingPurposeSelected: undefined,
                currentOnboardingCompanySize: undefined,
                onboardingInitialPath: '/onboarding/work-email/validation',
                onboardingValues: undefined,
            };

            expect(getRequired2FAOnboardingResumePath(params)).toBe('/onboarding/work-email/validation');
        });
    });
    describe('startOnboardingFlow', () => {
        /* eslint-disable @typescript-eslint/unbound-method -- jest.fn() mocks do not rely on `this` binding */
        const mockedGetRootState = jest.mocked(navigationRef.getRootState);
        const mockedResetRoot = jest.mocked(navigationRef.resetRoot);
        /* eslint-enable @typescript-eslint/unbound-method */

        // A VSB user resolves /onboarding/purpose to /onboarding/employees, so the target screen always
        // differs from the current one. That is the APP-HT5 shape: the guard on the resolved route name can
        // never short-circuit it.
        const vsbParams: GetOnboardingInitialPathParamsType = {
            isUserFromPublicDomain: false,
            hasAccessiblePolicies: false,
            currentOnboardingPurposeSelected: undefined,
            currentOnboardingCompanySize: undefined,
            onboardingValues: undefined,
            onboardingValuesParam: {signupQualifier: CONST.ONBOARDING_SIGNUP_QUALIFIERS.VSB, hasCompletedGuidedSetupFlow: false},
            onboardingInitialPath: '/onboarding/purpose',
        };

        // getRootState is typed as returning a full NavigationState, so build a complete one.
        const buildRootState = (routeNames: string[]): NavigationState =>
            ({
                key: 'root',
                index: Math.max(routeNames.length - 1, 0),
                routeNames,
                type: 'stack',
                stale: false,
                routes: routeNames.map((name) => ({key: `${name}-key`, name})),
            }) as NavigationState;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should not reset the root when the onboarding navigator is already mounted', () => {
            // Real root state while the user sits on an onboarding screen. The resolved target
            // (/onboarding/employees) differs from where they are, yet resetRoot cannot move them: the merge
            // appends by top-level name, so the adapted onboarding route is dropped. Resetting anyway only
            // re-emits a state change, which is the history.replaceState that trips Safari's cap.
            mockedGetRootState.mockReturnValue(buildRootState([NAVIGATORS.TAB_NAVIGATOR, NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR]));

            startOnboardingFlow(vsbParams);

            expect(mockedResetRoot).not.toHaveBeenCalled();
        });

        it('should not reset the root when the onboarding navigator is mounted but not focused', () => {
            // An RHP over onboarding still means the navigator is mounted, so there is nothing to mount.
            mockedGetRootState.mockReturnValue(buildRootState([NAVIGATORS.TAB_NAVIGATOR, NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR, NAVIGATORS.RIGHT_MODAL_NAVIGATOR]));

            startOnboardingFlow(vsbParams);

            expect(mockedResetRoot).not.toHaveBeenCalled();
        });

        it('should reset the root to mount the onboarding navigator when it is absent', () => {
            mockedGetRootState.mockReturnValue(buildRootState([NAVIGATORS.TAB_NAVIGATOR]));

            startOnboardingFlow(vsbParams);

            expect(mockedResetRoot).toHaveBeenCalledTimes(1);
        });

        it('should mount the onboarding navigator with the preceding steps in its stack', () => {
            mockedGetRootState.mockReturnValue(buildRootState([NAVIGATORS.TAB_NAVIGATOR]));

            startOnboardingFlow(vsbParams);

            // Assert the payload, not just the call: the whole bug lives in the state passed to resetRoot.
            // getOnboardingAdaptedState puts the earlier onboarding steps in the stack so Back keeps working.
            const payload = mockedResetRoot.mock.calls.at(0)?.at(0);
            expect(payload?.stale).toBe(true);
            expect(payload?.routes.map((route) => route.name)).toEqual([NAVIGATORS.TAB_NAVIGATOR, NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR]);

            const onboardingRoute = payload?.routes.find((route) => route.name === NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR);
            expect(onboardingRoute?.state?.routes?.map((route) => route.name)).toEqual([SCREENS.ONBOARDING.PURPOSE, SCREENS.ONBOARDING.EMPLOYEES]);
        });

        it('should honour an explicit resumePath when the onboarding navigator is absent', () => {
            mockedGetRootState.mockReturnValue(buildRootState([NAVIGATORS.TAB_NAVIGATOR]));

            startOnboardingFlow({...vsbParams, resumePath: '/onboarding/personal-details'});

            const payload = mockedResetRoot.mock.calls.at(0)?.at(0);
            const onboardingRoute = payload?.routes.find((route) => route.name === NAVIGATORS.ONBOARDING_MODAL_NAVIGATOR);
            expect(onboardingRoute?.state?.routes?.at(-1)?.name).toBe(SCREENS.ONBOARDING.PERSONAL_DETAILS);
        });
    });
});
