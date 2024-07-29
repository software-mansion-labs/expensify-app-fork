import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo, useState} from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import InviteMemberListItem from '@components/SelectionList/InviteMemberListItem';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import * as DeviceCapabilities from '@libs/DeviceCapabilities';
import Navigation from '@libs/Navigation/Navigation';
import type {FullScreenNavigatorParamList} from '@libs/Navigation/types';
import * as PolicyUtils from '@libs/PolicyUtils';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import withPolicyAndFullscreenLoading from '@pages/workspace/withPolicyAndFullscreenLoading';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

type WorkspaceWorkflowsApprovalsExpensesFromPageProps = WithPolicyAndFullscreenLoadingProps &
    StackScreenProps<FullScreenNavigatorParamList, typeof SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_EXPENSES_FROM>;

function WorkspaceWorkflowsApprovalsExpensesFromPage({policy, isLoadingReportData = true, route}: WorkspaceWorkflowsApprovalsExpensesFromPageProps) {
    const {translate} = useLocalize();
    const [didScreenTransitionEnd, setDidScreenTransitionEnd] = useState(false);
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');

    // eslint-disable-next-line rulesdir/no-negated-variables
    const shouldShowNotFoundView = (isEmptyObject(policy) && !isLoadingReportData) || !PolicyUtils.isPolicyAdmin(policy) || PolicyUtils.isPendingDeletePolicy(policy);

    const sections = [];

    const nextButton = useMemo(
        () => (
            <FormAlertWithSubmitButton
                // isDisabled={!selectedOptions.length}
                // isAlertVisible={shouldShowAlertPrompt}
                buttonText={translate('common.next')}
                onSubmit={() => {}}
                // message={policy?.alertMessage ?? ''}
                // containerStyles={[styles.flexReset, styles.flexGrow0, styles.flexShrink0, styles.flexBasisAuto]}
                enabledWhenOffline
            />
        ),
        [translate],
    );

    return (
        <AccessOrNotFoundWrapper
            policyID={route.params.policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_WORKFLOWS_ENABLED}
        >
            <ScreenWrapper
                includeSafeAreaPaddingBottom={false}
                testID={WorkspaceWorkflowsApprovalsExpensesFromPage.displayName}
                onEntryTransitionEnd={() => setDidScreenTransitionEnd(true)}
            >
                <FullPageNotFoundView
                    shouldShow={shouldShowNotFoundView}
                    subtitleKey={isEmptyObject(policy) ? undefined : 'workspace.common.notAuthorized'}
                    onBackButtonPress={PolicyUtils.goBackFromInvalidPolicy}
                    onLinkPress={PolicyUtils.goBackFromInvalidPolicy}
                >
                    <HeaderWithBackButton
                        title={translate('workflowsExpensesFromPage.title')}
                        onBackButtonPress={Navigation.goBack}
                    />
                    <SelectionList
                        canSelectMultiple
                        sections={[]}
                        ListItem={InviteMemberListItem}
                        textInputLabel="textInputLabel"
                        textInputValue={searchTerm}
                        onChangeText={setSearchTerm}
                        headerMessage="headerMessage"
                        onSelectRow={() => {}}
                        onConfirm={() => Navigation.navigate(ROUTES.WORKSPACE_WORKFLOWS_APPROVALS_APPROVER.getRoute(route.params.policyID))}
                        showScrollIndicator
                        showLoadingPlaceholder={!didScreenTransitionEnd}
                        shouldPreventDefaultFocusOnSelectRow={!DeviceCapabilities.canUseTouchScreen()}
                        footerContent={nextButton}
                    />
                </FullPageNotFoundView>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceWorkflowsApprovalsExpensesFromPage.displayName = 'WorkspaceWorkflowsApprovalsExpensesFromPage';

export default withPolicyAndFullscreenLoading(WorkspaceWorkflowsApprovalsExpensesFromPage);
