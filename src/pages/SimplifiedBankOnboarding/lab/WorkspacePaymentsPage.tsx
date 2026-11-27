/**
 * A stand-in for the Payments tab of the workspace workflows, which is the main way into the real flow. The page is not a
 * part of the flow, and it still uses the account key of the flow in both directions: it reads the key to offer "continue"
 * and to show an error, and its own read raises `isLoading` on the key, also when the connection returns while the flow is
 * open above this page. It mirrors what `WorkflowsPaymentsTab` and `WorkspacePageWithSections` do with `reimbursementAccount`.
 */
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import HeaderWithBackButtonAndTitle from '@components/Header/composed/HeaderWithBackButtonAndTitle';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Section from '@components/Section';
import Text from '@components/Text';

import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {isNonUSDCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {hasInProgressSetup} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import React, {useEffect} from 'react';

import getBankAccountSummary from './getBankAccountSummary';
import {openWorkspacePaymentsPage} from './labActions';

type WorkspacePaymentsPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.WORKSPACE_PAYMENTS>;

function WorkspacePaymentsPage({route}: WorkspacePaymentsPageProps) {
    const styles = useThemeStyles();
    const {policyID} = route.params;
    useNetwork({onReconnect: openWorkspacePaymentsPage});

    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const selectWorkspace = (workspaces: OnyxEntry<Workspaces>) => workspaces?.[policyID];
    const [workspace] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspace});

    useEffect(() => {
        openWorkspacePaymentsPage();
    }, []);

    if (!workspace) {
        return (
            <ScreenWrapper testID="SimplifiedBankOnboardingWorkspacePaymentsPage">
                <FullPageNotFoundView
                    shouldShow
                    onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_BANK_ONBOARDING_LAB)}
                />
            </ScreenWrapper>
        );
    }

    const isNonUSDWorkspace = isNonUSDCurrency(workspace.outputCurrency);

    // The account key only describes this workspace when the flow was opened for it last, which this page cannot tell from the summary.
    const hasSetupInProgress = hasInProgressSetup(account?.achData, isNonUSDWorkspace, policyID);
    const hasAccountErrors = !isEmptyObject(account?.errors);

    let setupLabel = 'Connect bank account';
    if (hasSetupInProgress) {
        setupLabel = 'Continue bank account setup';
    } else if (workspace.achAccount) {
        setupLabel = 'View bank account';
    }

    return (
        <ScreenWrapper
            testID="SimplifiedBankOnboardingWorkspacePaymentsPage"
            includeSafeAreaPaddingBottom
        >
            <HeaderWithBackButtonAndTitle
                title="Payments"
                subtitle={workspace.name}
                onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS_BANK_ONBOARDING_LAB)}
            />
            <ScrollView style={styles.flex1}>
                <Section
                    title="Bank account"
                    subtitle="This page stands in for Workflows > Payments. It opens the flow with itself as the return route."
                    subtitleMuted
                    isCentralPane
                >
                    <MenuItemField
                        name={getBankAccountSummary(workspace)}
                        value={setupLabel}
                        onPress={() =>
                            Navigation.navigate(
                                ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({policyID, backTo: ROUTES.SETTINGS_BANK_ONBOARDING_LAB_WORKSPACE_PAYMENTS.getRoute(policyID)}),
                            )
                        }
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.OPEN_SETUP}
                    />
                    {hasAccountErrors && <Text style={[styles.formError, styles.mt3]}>The bank account setup has an error.</Text>}
                </Section>
            </ScrollView>
        </ScreenWrapper>
    );
}

export default WorkspacePaymentsPage;
