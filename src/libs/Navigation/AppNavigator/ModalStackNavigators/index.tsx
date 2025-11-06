import {useRoute} from '@react-navigation/native';
import type {ParamListBase} from '@react-navigation/routers';
import React, {useCallback, useContext} from 'react';
import {View} from 'react-native';
import {WideRHPContext} from '@components/WideRHPContextProvider';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Overlay from '@libs/Navigation/AppNavigator/Navigators/Overlay';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {PlatformStackNavigationOptions} from '@libs/Navigation/PlatformStackNavigation/types';
import type {
    AddPersonalBankAccountNavigatorParamList,
    AddUnreportedExpensesParamList,
    ConsoleNavigatorParamList,
    DebugParamList,
    EditRequestNavigatorParamList,
    EnablePaymentsNavigatorParamList,
    FlagCommentNavigatorParamList,
    MergeTransactionNavigatorParamList,
    MissingPersonalDetailsParamList,
    MoneyRequestNavigatorParamList,
    NewChatNavigatorParamList,
    NewReportWorkspaceSelectionNavigatorParamList,
    NewTaskNavigatorParamList,
    ParticipantsNavigatorParamList,
    PrivateNotesNavigatorParamList,
    ProfileNavigatorParamList,
    ReferralDetailsNavigatorParamList,
    ReportChangeApproverParamList,
    ReportChangeWorkspaceNavigatorParamList,
    ReportDescriptionNavigatorParamList,
    ReportDetailsNavigatorParamList,
    ReportSettingsNavigatorParamList,
    ReportVerifyAccountNavigatorParamList,
    RoomMembersNavigatorParamList,
    ScheduleCallParamList,
    SearchAdvancedFiltersParamList,
    SearchReportParamList,
    SearchSavedSearchParamList,
    SettingsNavigatorParamList,
    ShareNavigatorParamList,
    SignInNavigatorParamList,
    SplitDetailsNavigatorParamList,
    TaskDetailsNavigatorParamList,
    TeachersUniteNavigatorParamList,
    TransactionDuplicateNavigatorParamList,
    TravelNavigatorParamList,
    WalletStatementNavigatorParamList,
    WorkspaceConfirmationNavigatorParamList,
    WorkspaceDuplicateNavigatorParamList,
} from '@navigation/types';
import type {Screen} from '@src/SCREENS';
import SCREENS from '@src/SCREENS';
import useModalStackScreenOptions from './useModalStackScreenOptions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScreenComponent = React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;

type Screens = Partial<Record<Screen, ScreenComponent>>;

const OPTIONS_PER_SCREEN: Partial<Record<Screen, PlatformStackNavigationOptions>> = {
    [SCREENS.SETTINGS.MERGE_ACCOUNTS.MERGE_RESULT]: {
        animationTypeForReplace: 'push',
    },
    [SCREENS.SEARCH.REPORT_RHP]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.MONEY_REQUEST_REPORT_HOLD_TRANSACTIONS]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.TRANSACTION_HOLD_REASON_RHP]: {
        animation: Animations.NONE,
    },
    [SCREENS.SEARCH.TRANSACTIONS_CHANGE_REPORT_SEARCH_RHP]: {
        animation: Animations.NONE,
    },
    [SCREENS.TRAVEL.VERIFY_ACCOUNT]: {
        animationTypeForReplace: 'push',
    },
    [SCREENS.TRAVEL.WORKSPACE_ADDRESS]: {
        animationTypeForReplace: 'push',
    },
};

/**
 * Create a modal stack navigator with an array of sub-screens.
 *
 * @param screens key/value pairs where the key is the name of the screen and the value is a lazy-loaded component
 */
function createModalStackNavigator<ParamList extends ParamListBase>(screens: Screens): React.ComponentType {
    const ModalStackNavigator = createPlatformStackNavigator<ParamList>();

    function ModalStack() {
        const styles = useThemeStyles();
        const screenOptions = useModalStackScreenOptions();
        const {secondOverlayProgress, shouldRenderSecondaryOverlay} = useContext(WideRHPContext);
        const route = useRoute();

        // We have to use the isSmallScreenWidth instead of shouldUseNarrow layout, because we want to have information about screen width without the context of side modal.
        // eslint-disable-next-line rulesdir/prefer-shouldUseNarrowLayout-instead-of-isSmallScreenWidth
        const {isSmallScreenWidth} = useResponsiveLayout();

        const getScreenOptions = useCallback<typeof screenOptions>(
            ({route: optionRoute}) => {
                // Extend common options if they are defined for the screen.
                if (OPTIONS_PER_SCREEN[optionRoute.name as Screen]) {
                    return {...screenOptions({route: optionRoute}), ...OPTIONS_PER_SCREEN[optionRoute.name as Screen]};
                }
                return screenOptions({route: optionRoute});
            },
            [screenOptions],
        );

        return (
            // This container is necessary to hide card translation during transition. Without it the user would see un-clipped cards.
            <View style={[styles.modalStackNavigatorContainer, styles.modalStackNavigatorContainerWidth(isSmallScreenWidth)]}>
                <ModalStackNavigator.Navigator>
                    {Object.keys(screens as Required<Screens>).map((name) => (
                        <ModalStackNavigator.Screen
                            key={name}
                            name={name}
                            component={(screens as Required<Screens>)[name as Screen] as React.ComponentType<any>}
                            // For some reason, screenOptions is not working with function as options so we have to pass it to every screen.
                            options={getScreenOptions}
                        />
                    ))}
                </ModalStackNavigator.Navigator>
                {!isSmallScreenWidth && shouldRenderSecondaryOverlay && route.name === SCREENS.RIGHT_MODAL.SEARCH_REPORT ? (
                    // This overlay is necessary to cover the gap under the narrow format RHP screen
                    <Overlay
                        progress={secondOverlayProgress}
                        hasMarginLeft
                    />
                ) : null}
            </View>
        );
    }

    ModalStack.displayName = 'ModalStack';

    return ModalStack;
}

const MoneyRequestModalStackNavigator = createModalStackNavigator<MoneyRequestNavigatorParamList>({
    [SCREENS.MONEY_REQUEST.START]: React.lazy(() => import('../../../../pages/iou/request/IOURequestRedirectToStartPage')),
    [SCREENS.MONEY_REQUEST.CREATE]: React.lazy(() => import('../../../../pages/iou/request/IOURequestStartPage')),
    [SCREENS.MONEY_REQUEST.STEP_CONFIRMATION]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepConfirmation')),
    [SCREENS.MONEY_REQUEST.STEP_CONFIRMATION_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/iou/request/step/MoneyRequestStepConfirmationVerifyAccountPage')),
    [SCREENS.MONEY_REQUEST.STEP_AMOUNT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepAmount')),
    [SCREENS.MONEY_REQUEST.STEP_TAX_AMOUNT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepTaxAmountPage')),
    [SCREENS.MONEY_REQUEST.STEP_TAX_RATE]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepTaxRatePage')),
    [SCREENS.MONEY_REQUEST.STEP_CATEGORY]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepCategory')),
    [SCREENS.MONEY_REQUEST.STEP_CURRENCY]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepCurrency')),
    [SCREENS.MONEY_REQUEST.STEP_DATE]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDate')),
    [SCREENS.MONEY_REQUEST.STEP_DESCRIPTION]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDescription')),
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDistance')),
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_RATE]: React.lazy(() => import('@pages/iou/request/step/IOURequestStepDistanceRate')),
    [SCREENS.MONEY_REQUEST.STEP_MERCHANT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepMerchant')),
    [SCREENS.MONEY_REQUEST.STEP_PARTICIPANTS]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepParticipants')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_ROOT]: React.lazy(() => import('../../../../pages/workspace/categories/WorkspaceCategoriesPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAGS_ROOT]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceTagsPage')),
    [SCREENS.MONEY_REQUEST.EDIT_REPORT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestEditReport')),
    [SCREENS.MONEY_REQUEST.STEP_SCAN]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepScan')),
    [SCREENS.MONEY_REQUEST.STEP_TAG]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepTag')),
    [SCREENS.MONEY_REQUEST.STEP_WAYPOINT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepWaypoint')),
    [SCREENS.MONEY_REQUEST.STEP_SEND_FROM]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepSendFrom')),
    [SCREENS.MONEY_REQUEST.STEP_REPORT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepReport')),
    [SCREENS.MONEY_REQUEST.STEP_COMPANY_INFO]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepCompanyInfo')),
    [SCREENS.MONEY_REQUEST.HOLD]: React.lazy(() => import('../../../../pages/iou/HoldReasonPage')),
    [SCREENS.MONEY_REQUEST.REJECT]: React.lazy(() => import('../../../../pages/iou/RejectReasonPage')),
    [SCREENS.IOU_SEND.ADD_BANK_ACCOUNT]: React.lazy(() => import('../../../../pages/AddPersonalBankAccountPage')),
    [SCREENS.IOU_SEND.ADD_DEBIT_CARD]: React.lazy(() => import('../../../../pages/settings/Wallet/AddDebitCardPage')),
    [SCREENS.IOU_SEND.ENABLE_PAYMENTS]: React.lazy(() => import('../../../../pages/EnablePayments/EnablePaymentsPage')),
    [SCREENS.MONEY_REQUEST.STATE_SELECTOR]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/StateSelectionPage')),
    [SCREENS.MONEY_REQUEST.STEP_ATTENDEES]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepAttendees')),
    [SCREENS.MONEY_REQUEST.STEP_ACCOUNTANT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepAccountant')),
    [SCREENS.MONEY_REQUEST.STEP_UPGRADE]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepUpgrade')),
    [SCREENS.MONEY_REQUEST.STEP_DESTINATION]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDestination')),
    [SCREENS.MONEY_REQUEST.STEP_TIME]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepTime')),
    [SCREENS.MONEY_REQUEST.STEP_SUBRATE]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepSubrate')),
    [SCREENS.MONEY_REQUEST.STEP_DESTINATION_EDIT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDestination')),
    [SCREENS.MONEY_REQUEST.STEP_TIME_EDIT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepTime')),
    [SCREENS.MONEY_REQUEST.STEP_SUBRATE_EDIT]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepSubrate')),
    [SCREENS.MONEY_REQUEST.RECEIPT_VIEW]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepScan/ReceiptView')),
    [SCREENS.MONEY_REQUEST.SPLIT_EXPENSE]: React.lazy(() => import('../../../../pages/iou/SplitExpensePage')),
    [SCREENS.MONEY_REQUEST.SPLIT_EXPENSE_EDIT]: React.lazy(() => import('../../../../pages/iou/SplitExpenseEditPage')),
    [SCREENS.MONEY_REQUEST.DISTANCE_CREATE]: React.lazy(() => import('../../../../pages/iou/request/DistanceRequestStartPage')),
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_MAP]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDistanceMap')),
    [SCREENS.MONEY_REQUEST.STEP_DISTANCE_MANUAL]: React.lazy(() => import('../../../../pages/iou/request/step/IOURequestStepDistanceManual')),
    [SCREENS.SET_DEFAULT_WORKSPACE]: React.lazy(() => import('../../../../pages/SetDefaultWorkspacePage')),
});

const TravelModalStackNavigator = createModalStackNavigator<TravelNavigatorParamList>({
    [SCREENS.TRAVEL.MY_TRIPS]: React.lazy(() => import('../../../../pages/Travel/MyTripsPage')),
    [SCREENS.TRAVEL.TRAVEL_DOT_LINK_WEB_VIEW]: React.lazy(() => import('../../../../pages/Travel/TravelDotLinkWebview')),
    [SCREENS.TRAVEL.TCS]: React.lazy(() => import('../../../../pages/Travel/TravelTerms')),
    [SCREENS.TRAVEL.UPGRADE]: React.lazy(() => import('../../../../pages/Travel/TravelUpgrade')),
    [SCREENS.TRAVEL.TRIP_SUMMARY]: React.lazy(() => import('../../../../pages/Travel/TripSummaryPage')),
    [SCREENS.TRAVEL.TRIP_DETAILS]: React.lazy(() => import('../../../../pages/Travel/TripDetailsPage')),
    [SCREENS.TRAVEL.DOMAIN_SELECTOR]: React.lazy(() => import('../../../../pages/Travel/DomainSelectorPage')),
    [SCREENS.TRAVEL.DOMAIN_PERMISSION_INFO]: React.lazy(() => import('../../../../pages/Travel/DomainPermissionInfoPage')),
    [SCREENS.TRAVEL.PUBLIC_DOMAIN_ERROR]: React.lazy(() => import('../../../../pages/Travel/PublicDomainErrorPage')),
    [SCREENS.TRAVEL.WORKSPACE_ADDRESS]: React.lazy(() => import('../../../../pages/Travel/WorkspaceAddressForTravelPage')),
    [SCREENS.TRAVEL.VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/Travel/VerifyAccountPage')),
});

const SplitDetailsModalStackNavigator = createModalStackNavigator<SplitDetailsNavigatorParamList>({
    [SCREENS.SPLIT_DETAILS.ROOT]: React.lazy(() => import('../../../../pages/iou/SplitBillDetailsPage')),
});

const ProfileModalStackNavigator = createModalStackNavigator<ProfileNavigatorParamList>({
    [SCREENS.PROFILE_ROOT]: React.lazy(() => import('../../../../pages/ProfilePage')),
});

const NewReportWorkspaceSelectionModalStackNavigator = createModalStackNavigator<NewReportWorkspaceSelectionNavigatorParamList>({
    [SCREENS.NEW_REPORT_WORKSPACE_SELECTION.ROOT]: React.lazy(() => import('../../../../pages/NewReportWorkspaceSelectionPage')),
});

const ReportDetailsModalStackNavigator = createModalStackNavigator<ReportDetailsNavigatorParamList>({
    [SCREENS.REPORT_DETAILS.ROOT]: React.lazy(() => import('../../../../pages/ReportDetailsPage')),
    [SCREENS.REPORT_DETAILS.SHARE_CODE]: React.lazy(() => import('../../../../pages/home/report/ReportDetailsShareCodePage')),
    [SCREENS.REPORT_DETAILS.EXPORT]: React.lazy(() => import('../../../../pages/home/report/ReportDetailsExportPage')),
});

const ReportChangeWorkspaceModalStackNavigator = createModalStackNavigator<ReportChangeWorkspaceNavigatorParamList>({
    [SCREENS.REPORT_CHANGE_WORKSPACE.ROOT]: React.lazy(() => import('../../../../pages/ReportChangeWorkspacePage')),
});

const ReportChangeApproverModalStackNavigator = createModalStackNavigator<ReportChangeApproverParamList>({
    [SCREENS.REPORT_CHANGE_APPROVER.ROOT]: React.lazy(() => import('../../../../pages/ReportChangeApproverPage')),
    [SCREENS.REPORT_CHANGE_APPROVER.ADD_APPROVER]: React.lazy(() => import('../../../../pages/ReportAddApproverPage')),
});

const ReportSettingsModalStackNavigator = createModalStackNavigator<ReportSettingsNavigatorParamList>({
    [SCREENS.REPORT_SETTINGS.ROOT]: React.lazy(() => import('../../../../pages/settings/Report/ReportSettingsPage')),
    [SCREENS.REPORT_SETTINGS.NAME]: React.lazy(() => import('../../../../pages/settings/Report/NamePage')),
    [SCREENS.REPORT_SETTINGS.NOTIFICATION_PREFERENCES]: React.lazy(() => import('../../../../pages/settings/Report/NotificationPreferencePage')),
    [SCREENS.REPORT_SETTINGS.WRITE_CAPABILITY]: React.lazy(() => import('../../../../pages/settings/Report/WriteCapabilityPage')),
    [SCREENS.REPORT_SETTINGS.VISIBILITY]: React.lazy(() => import('../../../../pages/settings/Report/VisibilityPage')),
});

const WorkspaceConfirmationModalStackNavigator = createModalStackNavigator<WorkspaceConfirmationNavigatorParamList>({
    [SCREENS.WORKSPACE_CONFIRMATION.ROOT]: React.lazy(() => import('../../../../pages/workspace/WorkspaceConfirmationPage')),
    [SCREENS.CURRENCY.SELECTION]: React.lazy(() => import('../../../../pages/CurrencySelectionPage')),
});

const WorkspaceDuplicateModalStackNavigator = createModalStackNavigator<WorkspaceDuplicateNavigatorParamList>({
    [SCREENS.WORKSPACE_DUPLICATE.ROOT]: React.lazy(() => import('../../../../pages/workspace/duplicate/WorkspaceDuplicatePage')),
    [SCREENS.WORKSPACE_DUPLICATE.SELECT_FEATURES]: React.lazy(() => import('../../../../pages/workspace/duplicate/WorkspaceDuplicateSelectFeaturesPage')),
});

const TaskModalStackNavigator = createModalStackNavigator<TaskDetailsNavigatorParamList>({
    [SCREENS.TASK.TITLE]: React.lazy(() => import('../../../../pages/tasks/TaskTitlePage')),
    [SCREENS.TASK.ASSIGNEE]: React.lazy(() => import('../../../../pages/tasks/TaskAssigneeSelectorModal')),
});

const ReportVerifyAccountModalStackNavigator = createModalStackNavigator<ReportVerifyAccountNavigatorParamList>({
    [SCREENS.REPORT_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/home/report/ReportVerifyAccountPage')),
    [SCREENS.SEARCH.REPORT_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/Search/SearchReportVerifyAccountPage')),
});

const ReportDescriptionModalStackNavigator = createModalStackNavigator<ReportDescriptionNavigatorParamList>({
    [SCREENS.REPORT_DESCRIPTION_ROOT]: React.lazy(() => import('../../../../pages/ReportDescriptionPage')),
});

const CategoriesModalStackNavigator = createModalStackNavigator({
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/categories/WorkspaceCategoriesSettingsPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_CREATE]: React.lazy(() => import('../../../../pages/workspace/categories/CreateCategoryPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_EDIT]: React.lazy(() => import('../../../../pages/workspace/categories/EditCategoryPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/categories/CategorySettingsPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_IMPORT]: React.lazy(() => import('../../../../pages/workspace/categories/ImportCategoriesPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORIES_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/categories/ImportedCategoriesPage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_PAYROLL_CODE]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryPayrollCodePage')),
    [SCREENS.SETTINGS_CATEGORIES.SETTINGS_CATEGORY_GL_CODE]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryGLCodePage')),
});

const TagsModalStackNavigator = createModalStackNavigator({
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAGS_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceTagsSettingsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAGS_EDIT]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceEditTagsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAGS_IMPORT]: React.lazy(() => import('../../../../pages/workspace/tags/ImportTagsPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORT_OPTIONS]: React.lazy(() => import('../../../../pages/workspace/tags/ImportTagsOptionsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAGS_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/tags/ImportedTagsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/tags/TagSettingsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_LIST_VIEW]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceViewTagsPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_CREATE]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceCreateTagPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_EDIT]: React.lazy(() => import('../../../../pages/workspace/tags/EditTagPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_APPROVER]: React.lazy(() => import('../../../../pages/workspace/tags/TagApproverPage')),
    [SCREENS.SETTINGS_TAGS.SETTINGS_TAG_GL_CODE]: React.lazy(() => import('../../../../pages/workspace/tags/TagGLCodePage')),
});

const ExpensifyCardModalStackNavigator = createModalStackNavigator({
    [SCREENS.EXPENSIFY_CARD.EXPENSIFY_CARD_DETAILS]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceExpensifyCardDetailsPage')),
    [SCREENS.EXPENSIFY_CARD.EXPENSIFY_CARD_NAME]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardNamePage')),
    [SCREENS.EXPENSIFY_CARD.EXPENSIFY_CARD_LIMIT]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardLimitPage')),
    [SCREENS.EXPENSIFY_CARD.EXPENSIFY_CARD_LIMIT_TYPE]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardLimitTypePage')),
});

const DomainCardModalStackNavigator = createModalStackNavigator({
    [SCREENS.DOMAIN_CARD.DOMAIN_CARD_DETAIL]: React.lazy(() => import('../../../../pages/settings/Wallet/ExpensifyCardPage/index')),
    [SCREENS.DOMAIN_CARD.DOMAIN_CARD_REPORT_FRAUD]: React.lazy(() => import('../../../../pages/settings/Wallet/ReportVirtualCardFraudPage')),
    [SCREENS.DOMAIN_CARD.DOMAIN_CARD_UPDATE_ADDRESS]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/PersonalAddressPage')),
    [SCREENS.DOMAIN_CARD.DOMAIN_CARD_CONFIRM_MAGIC_CODE]: React.lazy(() => import('../../../../pages/settings/Wallet/ExpensifyCardPage/ExpensifyCardVerifyAccountPage')),
});

const ReportParticipantsModalStackNavigator = createModalStackNavigator<ParticipantsNavigatorParamList>({
    [SCREENS.REPORT_PARTICIPANTS.ROOT]: React.lazy(() => import('../../../../pages/ReportParticipantsPage')),
    [SCREENS.REPORT_PARTICIPANTS.INVITE]: React.lazy(() => import('../../../../pages/InviteReportParticipantsPage')),
    [SCREENS.REPORT_PARTICIPANTS.DETAILS]: React.lazy(() => import('../../../../pages/ReportParticipantDetailsPage')),
    [SCREENS.REPORT_PARTICIPANTS.ROLE]: React.lazy(() => import('../../../../pages/ReportParticipantRoleSelectionPage')),
});

const RoomMembersModalStackNavigator = createModalStackNavigator<RoomMembersNavigatorParamList>({
    [SCREENS.ROOM_MEMBERS.ROOT]: React.lazy(() => import('../../../../pages/RoomMembersPage')),
    [SCREENS.ROOM_MEMBERS.INVITE]: React.lazy(() => import('../../../../pages/RoomInvitePage')),
    [SCREENS.ROOM_MEMBERS.DETAILS]: React.lazy(() => import('../../../../pages/RoomMemberDetailsPage')),
});

const NewChatModalStackNavigator = createModalStackNavigator<NewChatNavigatorParamList>({
    [SCREENS.NEW_CHAT.ROOT]: React.lazy(() => import('../../../../pages/NewChatSelectorPage')),
    [SCREENS.NEW_CHAT.NEW_CHAT_CONFIRM]: React.lazy(() => import('../../../../pages/NewChatConfirmPage')),
    [SCREENS.NEW_CHAT.NEW_CHAT_EDIT_NAME]: React.lazy(() => import('../../../../pages/GroupChatNameEditPage')),
});

const NewTaskModalStackNavigator = createModalStackNavigator<NewTaskNavigatorParamList>({
    [SCREENS.NEW_TASK.ROOT]: React.lazy(() => import('../../../../pages/tasks/NewTaskPage')),
    [SCREENS.NEW_TASK.TASK_ASSIGNEE_SELECTOR]: React.lazy(() => import('../../../../pages/tasks/TaskAssigneeSelectorModal')),
    [SCREENS.NEW_TASK.TASK_SHARE_DESTINATION_SELECTOR]: React.lazy(() => import('../../../../pages/tasks/TaskShareDestinationSelectorModal')),
    [SCREENS.NEW_TASK.DETAILS]: React.lazy(() => import('../../../../pages/tasks/NewTaskDetailsPage')),
    [SCREENS.NEW_TASK.TITLE]: React.lazy(() => import('../../../../pages/tasks/NewTaskTitlePage')),
    [SCREENS.NEW_TASK.DESCRIPTION]: React.lazy(() => import('../../../../pages/tasks/NewTaskDescriptionPage')),
});

const NewTeachersUniteNavigator = createModalStackNavigator<TeachersUniteNavigatorParamList>({
    [SCREENS.SAVE_THE_WORLD.ROOT]: React.lazy(() => import('../../../../pages/TeachersUnite/SaveTheWorldPage')),
    [SCREENS.I_KNOW_A_TEACHER]: React.lazy(() => import('../../../../pages/TeachersUnite/KnowATeacherPage')),
    [SCREENS.INTRO_SCHOOL_PRINCIPAL]: React.lazy(() => import('../../../../pages/TeachersUnite/ImTeacherPage')),
    [SCREENS.I_AM_A_TEACHER]: React.lazy(() => import('../../../../pages/TeachersUnite/ImTeacherPage')),
});

const ConsoleModalStackNavigator = createModalStackNavigator<ConsoleNavigatorParamList>({
    [SCREENS.PUBLIC_CONSOLE_DEBUG]: React.lazy(() => import('../../../../pages/settings/AboutPage/ConsolePage')),
});

const SettingsModalStackNavigator = createModalStackNavigator<SettingsNavigatorParamList>({
    [SCREENS.SETTINGS.SHARE_CODE]: React.lazy(() => import('../../../../pages/ShareCodePage')),
    [SCREENS.SETTINGS.PROFILE.PRONOUNS]: React.lazy(() => import('../../../../pages/settings/Profile/PronounsPage')),
    [SCREENS.SETTINGS.PROFILE.DISPLAY_NAME]: React.lazy(() => import('../../../../pages/settings/Profile/DisplayNamePage')),
    [SCREENS.SETTINGS.PROFILE.TIMEZONE]: React.lazy(() => import('../../../../pages/settings/Profile/TimezoneInitialPage')),
    [SCREENS.SETTINGS.PROFILE.TIMEZONE_SELECT]: React.lazy(() => import('../../../../pages/settings/Profile/TimezoneSelectPage')),
    [SCREENS.SETTINGS.PROFILE.LEGAL_NAME]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/LegalNamePage')),
    [SCREENS.SETTINGS.PROFILE.DATE_OF_BIRTH]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/DateOfBirthPage')),
    [SCREENS.SETTINGS.PROFILE.PHONE_NUMBER]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/PhoneNumberPage')),
    [SCREENS.SETTINGS.PROFILE.ADDRESS]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/PersonalAddressPage')),
    [SCREENS.SETTINGS.PROFILE.ADDRESS_COUNTRY]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/CountrySelectionPage')),
    [SCREENS.SETTINGS.PROFILE.ADDRESS_STATE]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/StateSelectionPage')),
    [SCREENS.SETTINGS.PROFILE.AVATAR]: React.lazy(() => import('../../../../pages/settings/Profile/Avatar/AvatarPage')),
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHODS]: React.lazy(() => import('../../../../pages/settings/Profile/Contacts/ContactMethodsPage')),
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHOD_DETAILS]: React.lazy(() => import('../../../../pages/settings/Profile/Contacts/ContactMethodDetailsPage')),
    [SCREENS.SETTINGS.PROFILE.NEW_CONTACT_METHOD]: React.lazy(() => import('../../../../pages/settings/Profile/Contacts/NewContactMethodPage')),
    [SCREENS.SETTINGS.PROFILE.NEW_CONTACT_METHOD_CONFIRM_MAGIC_CODE]: React.lazy(() => import('../../../../pages/settings/Profile/Contacts/NewContactMethodConfirmMagicCodePage')),
    [SCREENS.SETTINGS.PROFILE.CONTACT_METHOD_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Profile/Contacts/VerifyAccountPage')),
    [SCREENS.SETTINGS.PREFERENCES.PRIORITY_MODE]: React.lazy(() => import('../../../../pages/settings/Preferences/PriorityModePage')),
    [SCREENS.WORKSPACE.ACCOUNTING.ROOT]: React.lazy(() => import('../../../../pages/workspace/accounting/PolicyAccountingPage')),
    [SCREENS.SETTINGS.PREFERENCES.LANGUAGE]: React.lazy(() => import('../../../../pages/settings/Preferences/LanguagePage')),
    [SCREENS.SETTINGS.PREFERENCES.THEME]: React.lazy(() => import('../../../../pages/settings/Preferences/ThemePage')),
    [SCREENS.SETTINGS.PREFERENCES.PAYMENT_CURRENCY]: React.lazy(() => import('../../../../pages/settings/Preferences/PaymentCurrencyPage')),
    [SCREENS.SETTINGS.CLOSE]: React.lazy(() => import('../../../../pages/settings/Security/CloseAccountPage')),
    [SCREENS.SETTINGS.APP_DOWNLOAD_LINKS]: React.lazy(() => import('../../../../pages/settings/AppDownloadLinks')),
    [SCREENS.SETTINGS.CONSOLE]: React.lazy(() => import('../../../../pages/settings/AboutPage/ConsolePage')),
    [SCREENS.SETTINGS.SHARE_LOG]: React.lazy(() => import('../../../../pages/settings/AboutPage/ShareLogPage')),
    [SCREENS.SETTINGS.WALLET.CARDS_DIGITAL_DETAILS_UPDATE_ADDRESS]: React.lazy(() => import('../../../../pages/settings/Profile/PersonalDetails/PersonalAddressPage')),
    [SCREENS.SETTINGS.WALLET.VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Wallet/VerifyAccountPage')),
    [SCREENS.SETTINGS.WALLET.DOMAIN_CARD]: React.lazy(() => import('../../../../pages/settings/Wallet/ExpensifyCardPage/index')),
    [SCREENS.SETTINGS.WALLET.DOMAIN_CARD_CONFIRM_MAGIC_CODE]: React.lazy(() => import('../../../../pages/settings/Wallet/ExpensifyCardPage/ExpensifyCardVerifyAccountPage')),
    [SCREENS.SETTINGS.WALLET.REPORT_VIRTUAL_CARD_FRAUD]: React.lazy(() => import('../../../../pages/settings/Wallet/ReportVirtualCardFraudPage')),
    [SCREENS.SETTINGS.WALLET.REPORT_VIRTUAL_CARD_FRAUD_CONFIRM_MAGIC_CODE]: React.lazy(() => import('../../../../pages/settings/Wallet/ReportVirtualCardFraudVerifyAccountPage')),
    [SCREENS.SETTINGS.WALLET.REPORT_VIRTUAL_CARD_FRAUD_CONFIRMATION]: React.lazy(() => import('../../../../pages/settings/Wallet/ReportVirtualCardFraudConfirmationPage')),
    [SCREENS.SETTINGS.WALLET.CARD_ACTIVATE]: React.lazy(() => import('../../../../pages/settings/Wallet/ActivatePhysicalCardPage')),
    [SCREENS.SETTINGS.WALLET.TRANSFER_BALANCE]: React.lazy(() => import('../../../../pages/settings/Wallet/TransferBalancePage')),
    [SCREENS.SETTINGS.WALLET.CHOOSE_TRANSFER_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Wallet/ChooseTransferAccountPage')),
    [SCREENS.SETTINGS.WALLET.ENABLE_PAYMENTS]: React.lazy(() => import('../../../../pages/EnablePayments/EnablePayments')),
    [SCREENS.SETTINGS.WALLET.ENABLE_GLOBAL_REIMBURSEMENTS]: React.lazy(() => import('../../../../pages/settings/Wallet/EnableGlobalReimbursements')),
    [SCREENS.SETTINGS.ADD_DEBIT_CARD]: React.lazy(() => import('../../../../pages/settings/Wallet/AddDebitCardPage')),
    [SCREENS.SETTINGS.ADD_BANK_ACCOUNT_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Wallet/NewBankAccountVerifyAccountPage')),
    [SCREENS.SETTINGS.ADD_BANK_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Wallet/InternationalDepositAccount')),
    [SCREENS.SETTINGS.ADD_US_BANK_ACCOUNT]: React.lazy(() => import('../../../../pages/AddPersonalBankAccountPage')),
    [SCREENS.SETTINGS.ADD_BANK_ACCOUNT_SELECT_COUNTRY_VERIFY_ACCOUNT]: React.lazy(
        () => import('../../../../pages/settings/Wallet/InternationalDepositAccount/CountrySelectionVerifyAccountPage'),
    ),
    [SCREENS.SETTINGS.PROFILE.STATUS]: React.lazy(() => import('../../../../pages/settings/Profile/CustomStatus/StatusPage')),
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER]: React.lazy(() => import('../../../../pages/settings/Profile/CustomStatus/StatusClearAfterPage')),
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER_DATE]: React.lazy(() => import('../../../../pages/settings/Profile/CustomStatus/SetDatePage')),
    [SCREENS.SETTINGS.PROFILE.STATUS_CLEAR_AFTER_TIME]: React.lazy(() => import('../../../../pages/settings/Profile/CustomStatus/SetTimePage')),
    [SCREENS.SETTINGS.PROFILE.VACATION_DELEGATE]: React.lazy(() => import('../../../../pages/settings/Profile/CustomStatus/VacationDelegatePage')),
    [SCREENS.SETTINGS.SUBSCRIPTION.SIZE]: React.lazy(() => import('../../../../pages/settings/Subscription/SubscriptionSize')),
    [SCREENS.SETTINGS.SUBSCRIPTION.SETTINGS_DETAILS]: React.lazy(() => import('../../../../pages/settings/Subscription/SubscriptionSettings')),
    [SCREENS.SETTINGS.SUBSCRIPTION.DISABLE_AUTO_RENEW_SURVEY]: React.lazy(() => import('../../../../pages/settings/Subscription/DisableAutoRenewSurveyPage')),
    [SCREENS.SETTINGS.SUBSCRIPTION.REQUEST_EARLY_CANCELLATION]: React.lazy(() => import('../../../../pages/settings/Subscription/RequestEarlyCancellationPage')),
    [SCREENS.SETTINGS.SUBSCRIPTION.SUBSCRIPTION_DOWNGRADE_BLOCKED]: React.lazy(() => import('../../../../pages/settings/Subscription/SubscriptionPlan/SubscriptionPlanDowngradeBlockedPage')),
    [SCREENS.WORKSPACE.INVITE]: React.lazy(() => import('../../../../pages/workspace/WorkspaceInvitePage')),
    [SCREENS.WORKSPACE.MEMBERS_IMPORT]: React.lazy(() => import('../../../../pages/workspace/members/ImportMembersPage')),
    [SCREENS.WORKSPACE.MEMBERS_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/members/ImportedMembersPage')),
    [SCREENS.WORKSPACE.MEMBERS_IMPORTED_CONFIRMATION]: React.lazy(() => import('../../../../pages/workspace/members/ImportedMembersConfirmationPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_NEW]: React.lazy(() => import('../../../../pages/workspace/workflows/approvals/WorkspaceWorkflowsApprovalsCreatePage')),
    [SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_EDIT]: React.lazy(() => import('../../../../pages/workspace/workflows/approvals/WorkspaceWorkflowsApprovalsEditPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_EXPENSES_FROM]: React.lazy(() => import('../../../../pages/workspace/workflows/approvals/WorkspaceWorkflowsApprovalsExpensesFromPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_APPROVALS_APPROVER]: React.lazy(() => import('../../../../pages/workspace/workflows/approvals/WorkspaceWorkflowsApprovalsApproverPage')),
    [SCREENS.WORKSPACE.INVITE_MESSAGE]: React.lazy(() => import('../../../../pages/workspace/WorkspaceInviteMessagePage')),
    [SCREENS.WORKSPACE.INVITE_MESSAGE_ROLE]: React.lazy(() => import('../../../../pages/workspace/WorkspaceInviteMessageRolePage')),
    [SCREENS.WORKSPACE.WORKFLOWS_PAYER]: React.lazy(() => import('../../../../pages/workspace/workflows/WorkspaceWorkflowsPayerPage')),
    [SCREENS.WORKSPACE.NAME]: React.lazy(() => import('../../../../pages/workspace/WorkspaceNamePage')),
    [SCREENS.WORKSPACE.DESCRIPTION]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewDescriptionPage')),
    [SCREENS.WORKSPACE.SHARE]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewSharePage')),
    [SCREENS.WORKSPACE.CURRENCY]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewCurrencyPage')),
    [SCREENS.WORKSPACE.CATEGORY_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/categories/CategorySettingsPage')),
    [SCREENS.WORKSPACE.ADDRESS]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewAddressPage')),
    [SCREENS.WORKSPACE.PLAN]: React.lazy(() => import('../../../../pages/workspace/WorkspaceOverviewPlanTypePage')),
    [SCREENS.WORKSPACE.CATEGORIES_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/categories/WorkspaceCategoriesSettingsPage')),
    [SCREENS.WORKSPACE.CATEGORIES_IMPORT]: React.lazy(() => import('../../../../pages/workspace/categories/ImportCategoriesPage')),
    [SCREENS.WORKSPACE.CATEGORIES_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/categories/ImportedCategoriesPage')),
    [SCREENS.WORKSPACE.UPGRADE]: React.lazy(() => import('../../../../pages/workspace/upgrade/WorkspaceUpgradePage')),
    [SCREENS.WORKSPACE.DOWNGRADE]: React.lazy(() => import('../../../../pages/workspace/downgrade/WorkspaceDowngradePage')),
    [SCREENS.WORKSPACE.PAY_AND_DOWNGRADE]: React.lazy(() => import('../../../../pages/workspace/downgrade/PayAndDowngradePage')),
    [SCREENS.WORKSPACE.MEMBER_DETAILS]: React.lazy(() => import('../../../../pages/workspace/members/WorkspaceMemberDetailsPage')),
    [SCREENS.WORKSPACE.MEMBER_CUSTOM_FIELD]: React.lazy(() => import('../../../../pages/workspace/members/WorkspaceMemberCustomFieldPage')),
    [SCREENS.WORKSPACE.MEMBER_NEW_CARD]: React.lazy(() => import('../../../../pages/workspace/members/WorkspaceMemberNewCardPage')),
    [SCREENS.WORKSPACE.OWNER_CHANGE_CHECK]: React.lazy(() => import('@pages/workspace/members/WorkspaceOwnerChangeWrapperPage')),
    [SCREENS.WORKSPACE.OWNER_CHANGE_SUCCESS]: React.lazy(() => import('../../../../pages/workspace/members/WorkspaceOwnerChangeSuccessPage')),
    [SCREENS.WORKSPACE.OWNER_CHANGE_ERROR]: React.lazy(() => import('../../../../pages/workspace/members/WorkspaceOwnerChangeErrorPage')),
    [SCREENS.WORKSPACE.CATEGORY_CREATE]: React.lazy(() => import('../../../../pages/workspace/categories/CreateCategoryPage')),
    [SCREENS.WORKSPACE.CATEGORY_EDIT]: React.lazy(() => import('../../../../pages/workspace/categories/EditCategoryPage')),
    [SCREENS.WORKSPACE.CATEGORY_PAYROLL_CODE]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryPayrollCodePage')),
    [SCREENS.WORKSPACE.CATEGORY_GL_CODE]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryGLCodePage')),
    [SCREENS.WORKSPACE.CATEGORY_DEFAULT_TAX_RATE]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryDefaultTaxRatePage')),
    [SCREENS.WORKSPACE.CATEGORY_FLAG_AMOUNTS_OVER]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryFlagAmountsOverPage')),
    [SCREENS.WORKSPACE.CATEGORY_DESCRIPTION_HINT]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryDescriptionHintPage')),
    [SCREENS.WORKSPACE.CATEGORY_REQUIRE_RECEIPTS_OVER]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryRequireReceiptsOverPage')),
    [SCREENS.WORKSPACE.CATEGORY_APPROVER]: React.lazy(() => import('../../../../pages/workspace/categories/CategoryApproverPage')),
    [SCREENS.WORKSPACE.CREATE_DISTANCE_RATE]: React.lazy(() => import('../../../../pages/workspace/distanceRates/CreateDistanceRatePage')),
    [SCREENS.WORKSPACE.DISTANCE_RATES_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRatesSettingsPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATE_DETAILS]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRateDetailsPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATE_EDIT]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRateEditPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATE_NAME_EDIT]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRateNameEditPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATE_TAX_RECLAIMABLE_ON_EDIT]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRateTaxReclaimableEditPage')),
    [SCREENS.WORKSPACE.DISTANCE_RATE_TAX_RATE_EDIT]: React.lazy(() => import('../../../../pages/workspace/distanceRates/PolicyDistanceRateTaxRateEditPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORT]: React.lazy(() => import('../../../../pages/workspace/tags/ImportTagsPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORT_OPTIONS]: React.lazy(() => import('../../../../pages/workspace/tags/ImportTagsOptionsPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORT_MULTI_LEVEL_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/tags/ImportMultiLevelTagsSettingsPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/tags/ImportedTagsPage')),
    [SCREENS.WORKSPACE.TAGS_IMPORTED_MULTI_LEVEL]: React.lazy(() => import('../../../../pages/workspace/tags/ImportedMultiLevelTagsPage')),
    [SCREENS.WORKSPACE.TAGS_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceTagsSettingsPage')),
    [SCREENS.WORKSPACE.TAG_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/tags/TagSettingsPage')),
    [SCREENS.WORKSPACE.TAG_LIST_VIEW]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceViewTagsPage')),
    [SCREENS.WORKSPACE.TAGS_EDIT]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceEditTagsPage')),
    [SCREENS.WORKSPACE.TAG_CREATE]: React.lazy(() => import('../../../../pages/workspace/tags/WorkspaceCreateTagPage')),
    [SCREENS.WORKSPACE.TAG_EDIT]: React.lazy(() => import('../../../../pages/workspace/tags/EditTagPage')),
    [SCREENS.WORKSPACE.TAG_APPROVER]: React.lazy(() => import('../../../../pages/workspace/tags/TagApproverPage')),
    [SCREENS.WORKSPACE.TAG_GL_CODE]: React.lazy(() => import('../../../../pages/workspace/tags/TagGLCodePage')),
    [SCREENS.WORKSPACE.TAXES_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxesSettingsPage')),
    [SCREENS.WORKSPACE.TAXES_SETTINGS_CUSTOM_TAX_NAME]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxesSettingsCustomTaxName')),
    [SCREENS.WORKSPACE.TAXES_SETTINGS_FOREIGN_CURRENCY_DEFAULT]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxesSettingsForeignCurrency')),
    [SCREENS.WORKSPACE.TAXES_SETTINGS_WORKSPACE_CURRENCY_DEFAULT]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxesSettingsWorkspaceCurrency')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksExportConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_DATE_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksExportDateSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_INVOICE_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksExportInvoiceAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_OUT_OF_POCKET_EXPENSES_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksOutOfPocketExpenseAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_OUT_OF_POCKET_EXPENSES]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksOutOfPocketExpenseConfigurationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_OUT_OF_POCKET_EXPENSES_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksOutOfPocketExpenseEntitySelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_NON_REIMBURSABLE_DEFAULT_VENDOR_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksNonReimbursableDefaultVendorSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_COMPANY_CARD_EXPENSE_ACCOUNT_SELECT]: React.lazy(
        () => import('@pages/workspace/accounting/qbo/export/QuickbooksCompanyCardExpenseAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_COMPANY_CARD_EXPENSE_ACCOUNT_COMPANY_CARD_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksCompanyCardExpenseAccountSelectCardPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_AUTO_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/advanced/QuickbooksAutoSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_ACCOUNTING_METHOD]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/advanced/QuickbooksAccountingMethodPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_COMPANY_CARD_EXPENSE_ACCOUNT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksCompanyCardExpenseAccountPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_EXPORT_PREFERRED_EXPORTER]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/export/QuickbooksPreferredExporterConfigurationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT_COMPANY_CARD_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountSelectCardPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_NON_REIMBURSABLE_DEFAULT_VENDOR_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopNonReimbursableDefaultVendorSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_COMPANY_CARD_EXPENSE_ACCOUNT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopCompanyCardExpenseAccountPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_DATE_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopExportDateSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_PREFERRED_EXPORTER]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopPreferredExporterConfigurationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseConfigurationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT_OUT_OF_POCKET_EXPENSES_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopOutOfPocketExpenseEntitySelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_EXPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/export/QuickbooksDesktopExportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_ADVANCED]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/advanced/QuickbooksDesktopAdvancedPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_AUTO_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/advanced/QuickbooksDesktopAutoSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_ACCOUNTING_METHOD]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/advanced/QuickbooksDesktopAccountingMethodPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_SETUP_MODAL]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/QuickBooksDesktopSetupPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_SETUP_REQUIRED_DEVICE_MODAL]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/RequireQuickBooksDesktopPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_TRIGGER_FIRST_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/QuickBooksDesktopSetupFlowSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_IMPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopImportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CHART_OF_ACCOUNTS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopChartOfAccountsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CLASSES]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopClassesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CLASSES_DISPLAYED_AS]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopClassesDisplayedAsPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CUSTOMERS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopCustomersPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_CUSTOMERS_DISPLAYED_AS]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopCustomersDisplayedAsPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_DESKTOP_ITEMS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbd/import/QuickbooksDesktopItemsPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_CONNECT_EXISTING_BANK_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/workflows/WorkspaceWorkflowsConnectExistingBankAccountPage')),
    [SCREENS.REIMBURSEMENT_ACCOUNT]: React.lazy(() => import('../../../../pages/ReimbursementAccount/ReimbursementAccountPage')),
    [SCREENS.REIMBURSEMENT_ACCOUNT_ENTER_SIGNER_INFO]: React.lazy(() => import('../../../../pages/ReimbursementAccount/EnterSignerInfo')),
    [SCREENS.SETTINGS.REPORT_CARD_LOST_OR_DAMAGED]: React.lazy(() => import('../../../../pages/settings/Wallet/ReportCardLostPage')),
    [SCREENS.KEYBOARD_SHORTCUTS]: React.lazy(() => import('../../../../pages/KeyboardShortcutsPage')),
    [SCREENS.SETTINGS.EXIT_SURVEY.REASON]: React.lazy(() => import('../../../../pages/settings/ExitSurvey/ExitSurveyReasonPage')),
    [SCREENS.SETTINGS.EXIT_SURVEY.RESPONSE]: React.lazy(() => import('../../../../pages/settings/ExitSurvey/ExitSurveyResponsePage')),
    [SCREENS.SETTINGS.EXIT_SURVEY.CONFIRM]: React.lazy(() => import('../../../../pages/settings/ExitSurvey/ExitSurveyConfirmPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_IMPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksImportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_CHART_OF_ACCOUNTS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksChartOfAccountsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_CUSTOMERS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksCustomersPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_TAXES]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksTaxesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_LOCATIONS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksLocationsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_CLASSES]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksClassesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_CLASSES_DISPLAYED_AS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksClassesDisplayedAsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_CUSTOMERS_DISPLAYED_AS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksCustomersDisplayedAsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_LOCATIONS_DISPLAYED_AS]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/import/QuickbooksLocationsDisplayedAsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_ADVANCED]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/advanced/QuickbooksAdvancedPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_ACCOUNT_SELECTOR]: React.lazy(() => import('../../../../pages/workspace/accounting/qbo/advanced/QuickbooksAccountSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.QUICKBOOKS_ONLINE_INVOICE_ACCOUNT_SELECTOR]: React.lazy(
        () => import('../../../../pages/workspace/accounting/qbo/advanced/QuickbooksInvoiceAccountSelectPage'),
    ),

    [SCREENS.WORKSPACE.ACCOUNTING.XERO_IMPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/XeroImportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ORGANIZATION]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/XeroOrganizationConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_CHART_OF_ACCOUNTS]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/import/XeroChartOfAccountsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_CUSTOMER]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/import/XeroCustomerConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_TAXES]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/XeroTaxesConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_TRACKING_CATEGORIES]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/XeroTrackingCategoryConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_MAP_TRACKING_CATEGORY]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/XeroMapTrackingCategoryConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/export/XeroExportConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_PURCHASE_BILL_DATE_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/export/XeroPurchaseBillDateSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_BANK_ACCOUNT_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/export/XeroBankAccountSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ADVANCED]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/advanced/XeroAdvancedPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_AUTO_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/advanced/XeroAutoSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_ACCOUNTING_METHOD]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/advanced/XeroAccountingMethodPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_BILL_STATUS_SELECTOR]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/export/XeroPurchaseBillStatusSelectorPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_INVOICE_ACCOUNT_SELECTOR]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/advanced/XeroInvoiceAccountSelectorPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_EXPORT_PREFERRED_EXPORTER_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/export/XeroPreferredExporterSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.XERO_BILL_PAYMENT_ACCOUNT_SELECTOR]: React.lazy(() => import('../../../../pages/workspace/accounting/xero/advanced/XeroBillPaymentAccountSelectorPage')),

    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_SUBSIDIARY_SELECTOR]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/NetSuiteSubsidiarySelector')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_REUSE_EXISTING_CONNECTIONS]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/NetSuiteTokenInput/NetSuiteExistingConnectionsPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_TOKEN_INPUT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/NetSuiteTokenInput/NetSuiteTokenInputPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_MAPPING]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportMappingPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOM_FIELD]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomFieldPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOM_FIELD_VIEW]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomFieldView')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOM_FIELD_EDIT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomFieldEdit')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOM_LIST_ADD]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomFieldNew/NetSuiteImportAddCustomListPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOM_SEGMENT_ADD]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomFieldNew/NetSuiteImportAddCustomSegmentPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOMERS_OR_PROJECTS]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomersOrProjectsPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_IMPORT_CUSTOMERS_OR_PROJECTS_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/import/NetSuiteImportCustomersOrProjectSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportConfigurationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_PREFERRED_EXPORTER_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuitePreferredExporterSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_DATE_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteDateSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportExpensesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES_DESTINATION_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportExpensesDestinationSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES_VENDOR_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportExpensesVendorSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES_PAYABLE_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportExpensesPayableAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPORT_EXPENSES_JOURNAL_POSTING_PREFERENCE_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteExportExpensesJournalPostingPreferenceSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_RECEIVABLE_ACCOUNT_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteReceivableAccountSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_INVOICE_ITEM_PREFERENCE_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteInvoiceItemPreferenceSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_INVOICE_ITEM_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteInvoiceItemSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_TAX_POSTING_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteTaxPostingAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_PROVINCIAL_TAX_POSTING_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/export/NetSuiteProvincialTaxPostingAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_ADVANCED]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteAdvancedPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_REIMBURSEMENT_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteReimbursementAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_COLLECTION_ACCOUNT_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteCollectionAccountSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_EXPENSE_REPORT_APPROVAL_LEVEL_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteExpenseReportApprovalLevelSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_VENDOR_BILL_APPROVAL_LEVEL_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteVendorBillApprovalLevelSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_JOURNAL_ENTRY_APPROVAL_LEVEL_SELECT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteJournalEntryApprovalLevelSelectPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_APPROVAL_ACCOUNT_SELECT]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteApprovalAccountSelectPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_CUSTOM_FORM_ID]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteCustomFormIDPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_AUTO_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteAutoSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.NETSUITE_ACCOUNTING_METHOD]: React.lazy(() => import('../../../../pages/workspace/accounting/netsuite/advanced/NetSuiteAccountingMethodPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PREREQUISITES]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/SageIntacctPrerequisitesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.ENTER_SAGE_INTACCT_CREDENTIALS]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/EnterSageIntacctCredentialsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.EXISTING_SAGE_INTACCT_CONNECTIONS]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/ExistingConnectionsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ENTITY]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/SageIntacctEntityPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EXPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctExportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PREFERRED_EXPORTER]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctPreferredExporterPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EXPORT_DATE]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctDatePage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_REIMBURSABLE_EXPENSES]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctReimbursableExpensesPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_EXPENSES]: React.lazy(
        () => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableExpensesPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_REIMBURSABLE_DESTINATION]: React.lazy(
        () => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctReimbursableExpensesDestinationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_DESTINATION]: React.lazy(
        () => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableExpensesDestinationPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_DEFAULT_VENDOR]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctDefaultVendorPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_NON_REIMBURSABLE_CREDIT_CARD_ACCOUNT]: React.lazy(
        () => import('../../../../pages/workspace/accounting/intacct/export/SageIntacctNonReimbursableCreditCardAccountPage'),
    ),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ADVANCED]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAdvancedPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_AUTO_SYNC]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAutoSyncPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ACCOUNTING_METHOD]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctAccountingMethodPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_PAYMENT_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/advanced/SageIntacctPaymentAccountPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.CARD_RECONCILIATION]: React.lazy(() => import('../../../../pages/workspace/accounting/reconciliation/CardReconciliationPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.RECONCILIATION_ACCOUNT_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/accounting/reconciliation/ReconciliationAccountSettingsPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_AUTO_REPORTING_FREQUENCY]: React.lazy(() => import('../../../../pages/workspace/workflows/WorkspaceAutoReportingFrequencyPage')),
    [SCREENS.WORKSPACE.WORKFLOWS_AUTO_REPORTING_MONTHLY_OFFSET]: React.lazy(() => import('../../../../pages/workspace/workflows/WorkspaceAutoReportingMonthlyOffsetPage')),
    [SCREENS.WORKSPACE.TAX_EDIT]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceEditTaxPage')),
    [SCREENS.WORKSPACE.TAX_NAME]: React.lazy(() => import('../../../../pages/workspace/taxes/NamePage')),
    [SCREENS.WORKSPACE.TAX_VALUE]: React.lazy(() => import('../../../../pages/workspace/taxes/ValuePage')),
    [SCREENS.WORKSPACE.TAX_CREATE]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceCreateTaxPage')),
    [SCREENS.WORKSPACE.TAX_CODE]: React.lazy(() => import('../../../../pages/workspace/taxes/WorkspaceTaxCodePage')),
    [SCREENS.WORKSPACE.INVOICES_COMPANY_NAME]: React.lazy(() => import('../../../../pages/workspace/invoices/WorkspaceInvoicingDetailsName')),
    [SCREENS.WORKSPACE.INVOICES_COMPANY_WEBSITE]: React.lazy(() => import('../../../../pages/workspace/invoices/WorkspaceInvoicingDetailsWebsite')),
    [SCREENS.WORKSPACE.INVOICES_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/invoices/WorkspaceInvoicesVerifyAccountPage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_ASSIGN_CARD]: React.lazy(() => import('../../../../pages/workspace/companyCards/assignCard/AssignCardFeedPage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_SELECT_FEED]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardFeedSelectorPage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_BANK_CONNECTION]: React.lazy(() => import('../../../../pages/workspace/companyCards/BankConnection')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_ADD_NEW]: React.lazy(() => import('../../../../pages/workspace/companyCards/addNew/AddNewCardPage')),
    [SCREENS.WORKSPACE.COMPANY_CARD_DETAILS]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardDetailsPage')),
    [SCREENS.WORKSPACE.COMPANY_CARD_NAME]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardEditCardNamePage')),
    [SCREENS.WORKSPACE.COMPANY_CARD_EXPORT]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardAccountSelectCardPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_ISSUE_NEW]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/issueNew/IssueNewCardPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceCardSettingsPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_SETTINGS_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceSettlementAccountPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_SETTINGS_FREQUENCY]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceSettlementFrequencyPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_SELECT_FEED]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceExpensifyCardSelectorPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_BANK_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceExpensifyCardBankAccounts')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_DETAILS]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceExpensifyCardDetailsPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_NAME]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardNamePage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_LIMIT]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardLimitPage')),
    [SCREENS.WORKSPACE.EXPENSIFY_CARD_LIMIT_TYPE]: React.lazy(() => import('../../../../pages/workspace/expensifyCard/WorkspaceEditCardLimitTypePage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardsSettingsPage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS_FEED_NAME]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardsSettingsFeedNamePage')),
    [SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS_STATEMENT_CLOSE_DATE]: React.lazy(() => import('../../../../pages/workspace/companyCards/WorkspaceCompanyCardStatementCloseDatePage')),
    [SCREENS.SETTINGS.SAVE_THE_WORLD]: React.lazy(() => import('../../../../pages/TeachersUnite/SaveTheWorldPage')),
    [SCREENS.SETTINGS.SUBSCRIPTION.CHANGE_PAYMENT_CURRENCY]: React.lazy(() => import('../../../../pages/settings/PaymentCard/ChangeCurrency')),
    [SCREENS.SETTINGS.SUBSCRIPTION.CHANGE_BILLING_CURRENCY]: React.lazy(() => import('../../../../pages/settings/Subscription/PaymentCard/ChangeBillingCurrency')),
    [SCREENS.SETTINGS.SUBSCRIPTION.ADD_PAYMENT_CARD]: React.lazy(() => import('../../../../pages/settings/Subscription/PaymentCard')),
    [SCREENS.SETTINGS.ADD_PAYMENT_CARD_CHANGE_CURRENCY]: React.lazy(() => import('../../../../pages/settings/PaymentCard/ChangeCurrency')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_CREATE]: React.lazy(() => import('../../../../pages/workspace/reports/CreateReportFieldsPage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsSettingsPage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_LIST_VALUES]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsListValuesPage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_ADD_VALUE]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsAddListValuePage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_VALUE_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsValueSettingsPage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_EDIT_INITIAL_VALUE]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsInitialValuePage')),
    [SCREENS.WORKSPACE.REPORT_FIELDS_EDIT_VALUE]: React.lazy(() => import('../../../../pages/workspace/reports/ReportFieldsEditValuePage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_TOGGLE_MAPPING]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctToggleMappingsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_MAPPING_TYPE]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctMappingsTypePage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT_TAX]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportTaxPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_IMPORT_TAX_MAPPING]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctImportTaxMappingPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_USER_DIMENSIONS]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctUserDimensionsPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_ADD_USER_DIMENSION]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctAddUserDimensionPage')),
    [SCREENS.WORKSPACE.ACCOUNTING.SAGE_INTACCT_EDIT_USER_DIMENSION]: React.lazy(() => import('../../../../pages/workspace/accounting/intacct/import/SageIntacctEditUserDimensionsPage')),
    [SCREENS.SETTINGS.DELEGATE.VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/VerifyAccountPage')),
    [SCREENS.SETTINGS.DELEGATE.ADD_DELEGATE]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/AddDelegatePage')),
    [SCREENS.SETTINGS.DELEGATE.DELEGATE_ROLE]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/SelectDelegateRolePage')),
    [SCREENS.SETTINGS.DELEGATE.UPDATE_DELEGATE_ROLE]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/UpdateDelegateRole/UpdateDelegateRolePage')),
    [SCREENS.SETTINGS.DELEGATE.UPDATE_DELEGATE_ROLE_CONFIRM_MAGIC_CODE]: React.lazy(
        () => import('../../../../pages/settings/Security/AddDelegate/UpdateDelegateRole/UpdateDelegateMagicCodePage'),
    ),
    [SCREENS.SETTINGS.DELEGATE.DELEGATE_CONFIRM]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/ConfirmDelegatePage')),
    [SCREENS.SETTINGS.DELEGATE.DELEGATE_CONFIRM_MAGIC_CODE]: React.lazy(() => import('../../../../pages/settings/Security/AddDelegate/ConfirmDelegateMagicCodePage')),
    [SCREENS.SETTINGS.MERGE_ACCOUNTS.ACCOUNT_DETAILS]: React.lazy(() => import('../../../../pages/settings/Security/MergeAccounts/AccountDetailsPage')),
    [SCREENS.SETTINGS.MERGE_ACCOUNTS.ACCOUNT_VALIDATE]: React.lazy(() => import('../../../../pages/settings/Security/MergeAccounts/AccountValidatePage')),
    [SCREENS.SETTINGS.MERGE_ACCOUNTS.MERGE_RESULT]: React.lazy(() => import('../../../../pages/settings/Security/MergeAccounts/MergeResultPage')),
    [SCREENS.SETTINGS.LOCK.LOCK_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Security/LockAccount/LockAccountPage')),
    [SCREENS.SETTINGS.LOCK.UNLOCK_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Security/LockAccount/UnlockAccountPage')),
    [SCREENS.SETTINGS.LOCK.FAILED_TO_LOCK_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Security/LockAccount/FailedToLockAccountPage')),
    [SCREENS.WORKSPACE.REPORTS_DEFAULT_TITLE]: React.lazy(() => import('../../../../pages/workspace/reports/ReportsDefaultTitle')),
    [SCREENS.WORKSPACE.RULES_AUTO_APPROVE_REPORTS_UNDER]: React.lazy(() => import('../../../../pages/workspace/rules/RulesAutoApproveReportsUnderPage')),
    [SCREENS.WORKSPACE.RULES_RANDOM_REPORT_AUDIT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesRandomReportAuditPage')),
    [SCREENS.WORKSPACE.RULES_AUTO_PAY_REPORTS_UNDER]: React.lazy(() => import('../../../../pages/workspace/rules/RulesAutoPayReportsUnderPage')),
    [SCREENS.WORKSPACE.RULES_RECEIPT_REQUIRED_AMOUNT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesReceiptRequiredAmountPage')),
    [SCREENS.WORKSPACE.RULES_MAX_EXPENSE_AMOUNT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesMaxExpenseAmountPage')),
    [SCREENS.WORKSPACE.RULES_MAX_EXPENSE_AGE]: React.lazy(() => import('../../../../pages/workspace/rules/RulesMaxExpenseAgePage')),
    [SCREENS.WORKSPACE.RULES_BILLABLE_DEFAULT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesBillableDefaultPage')),
    [SCREENS.WORKSPACE.RULES_REIMBURSABLE_DEFAULT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesReimbursableDefaultPage')),
    [SCREENS.WORKSPACE.RULES_CUSTOM]: React.lazy(() => import('../../../../pages/workspace/rules/RulesCustomPage')),
    [SCREENS.WORKSPACE.RULES_PROHIBITED_DEFAULT]: React.lazy(() => import('../../../../pages/workspace/rules/RulesProhibitedDefaultPage')),
    [SCREENS.WORKSPACE.PER_DIEM_IMPORT]: React.lazy(() => import('../../../../pages/workspace/perDiem/ImportPerDiemPage')),
    [SCREENS.WORKSPACE.PER_DIEM_IMPORTED]: React.lazy(() => import('../../../../pages/workspace/perDiem/ImportedPerDiemPage')),
    [SCREENS.WORKSPACE.PER_DIEM_SETTINGS]: React.lazy(() => import('../../../../pages/workspace/perDiem/WorkspacePerDiemSettingsPage')),
    [SCREENS.WORKSPACE.PER_DIEM_DETAILS]: React.lazy(() => import('../../../../pages/workspace/perDiem/WorkspacePerDiemDetailsPage')),
    [SCREENS.WORKSPACE.PER_DIEM_EDIT_DESTINATION]: React.lazy(() => import('../../../../pages/workspace/perDiem/EditPerDiemDestinationPage')),
    [SCREENS.WORKSPACE.PER_DIEM_EDIT_SUBRATE]: React.lazy(() => import('../../../../pages/workspace/perDiem/EditPerDiemSubratePage')),
    [SCREENS.WORKSPACE.PER_DIEM_EDIT_AMOUNT]: React.lazy(() => import('../../../../pages/workspace/perDiem/EditPerDiemAmountPage')),
    [SCREENS.WORKSPACE.PER_DIEM_EDIT_CURRENCY]: React.lazy(() => import('../../../../pages/workspace/perDiem/EditPerDiemCurrencyPage')),
    [SCREENS.WORKSPACE.RECEIPT_PARTNERS_INVITE]: React.lazy(() => import('../../../../pages/workspace/receiptPartners/InviteReceiptPartnerPolicyPage')),
    [SCREENS.WORKSPACE.RECEIPT_PARTNERS_INVITE_EDIT]: React.lazy(() => import('../../../../pages/workspace/receiptPartners/EditInviteReceiptPartnerPolicyPage')),
    [SCREENS.WORKSPACE.RECEIPT_PARTNERS_CHANGE_BILLING_ACCOUNT]: React.lazy(() => import('../../../../pages/workspace/receiptPartners/ChangeReceiptBillingAccountPage')),
});

const TwoFactorAuthenticatorStackNavigator = createModalStackNavigator<EnablePaymentsNavigatorParamList>({
    [SCREENS.TWO_FACTOR_AUTH.ROOT]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/TwoFactorAuthPage')),
    [SCREENS.TWO_FACTOR_AUTH.VERIFY]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/VerifyPage')),
    [SCREENS.TWO_FACTOR_AUTH.VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/VerifyAccountPage')),
    [SCREENS.TWO_FACTOR_AUTH.DISABLED]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/DisabledPage')),
    [SCREENS.TWO_FACTOR_AUTH.DISABLE]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/DisablePage')),
    [SCREENS.TWO_FACTOR_AUTH.SUCCESS]: React.lazy(() => import('../../../../pages/settings/Security/TwoFactorAuth/SuccessPage')),
});

const EnablePaymentsStackNavigator = createModalStackNavigator<EnablePaymentsNavigatorParamList>({
    [SCREENS.ENABLE_PAYMENTS_ROOT]: React.lazy(() => import('../../../../pages/EnablePayments/EnablePaymentsPage')),
});

const AddPersonalBankAccountModalStackNavigator = createModalStackNavigator<AddPersonalBankAccountNavigatorParamList>({
    [SCREENS.ADD_PERSONAL_BANK_ACCOUNT_ROOT]: React.lazy(() => import('../../../../pages/AddPersonalBankAccountPage')),
});

const WalletStatementStackNavigator = createModalStackNavigator<WalletStatementNavigatorParamList>({
    [SCREENS.WALLET_STATEMENT_ROOT]: React.lazy(() => import('../../../../pages/wallet/WalletStatementPage')),
});

const FlagCommentStackNavigator = createModalStackNavigator<FlagCommentNavigatorParamList>({
    [SCREENS.FLAG_COMMENT_ROOT]: React.lazy(() => import('../../../../pages/FlagCommentPage')),
});

const EditRequestStackNavigator = createModalStackNavigator<EditRequestNavigatorParamList>({
    [SCREENS.EDIT_REQUEST.REPORT_FIELD]: React.lazy(() => import('../../../../pages/EditReportFieldPage')),
});

const PrivateNotesModalStackNavigator = createModalStackNavigator<PrivateNotesNavigatorParamList>({
    [SCREENS.PRIVATE_NOTES.LIST]: React.lazy(() => import('../../../../pages/PrivateNotes/PrivateNotesListPage')),
    [SCREENS.PRIVATE_NOTES.EDIT]: React.lazy(() => import('../../../../pages/PrivateNotes/PrivateNotesEditPage')),
});

const SignInModalStackNavigator = createModalStackNavigator<SignInNavigatorParamList>({
    [SCREENS.SIGN_IN_ROOT]: React.lazy(() => import('../../../../pages/signin/SignInModal')),
});
const ReferralModalStackNavigator = createModalStackNavigator<ReferralDetailsNavigatorParamList>({
    [SCREENS.REFERRAL_DETAILS]: React.lazy(() => import('../../../../pages/ReferralDetailsPage')),
});

const TransactionDuplicateStackNavigator = createModalStackNavigator<TransactionDuplicateNavigatorParamList>({
    [SCREENS.TRANSACTION_DUPLICATE.REVIEW]: React.lazy(() => import('../../../../pages/TransactionDuplicate/Review')),
    [SCREENS.TRANSACTION_DUPLICATE.MERCHANT]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewMerchant')),
    [SCREENS.TRANSACTION_DUPLICATE.CATEGORY]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewCategory')),
    [SCREENS.TRANSACTION_DUPLICATE.TAG]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewTag')),
    [SCREENS.TRANSACTION_DUPLICATE.DESCRIPTION]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewDescription')),
    [SCREENS.TRANSACTION_DUPLICATE.TAX_CODE]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewTaxCode')),
    [SCREENS.TRANSACTION_DUPLICATE.BILLABLE]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewBillable')),
    [SCREENS.TRANSACTION_DUPLICATE.REIMBURSABLE]: React.lazy(() => import('../../../../pages/TransactionDuplicate/ReviewReimbursable')),
    [SCREENS.TRANSACTION_DUPLICATE.CONFIRMATION]: React.lazy(() => import('../../../../pages/TransactionDuplicate/Confirmation')),
});

const MergeTransactionStackNavigator = createModalStackNavigator<MergeTransactionNavigatorParamList>({
    [SCREENS.MERGE_TRANSACTION.LIST_PAGE]: React.lazy(() => import('../../../../pages/TransactionMerge/MergeTransactionsListPage')),
    [SCREENS.MERGE_TRANSACTION.RECEIPT_PAGE]: React.lazy(() => import('../../../../pages/TransactionMerge/ReceiptReviewPage')),
    [SCREENS.MERGE_TRANSACTION.DETAILS_PAGE]: React.lazy(() => import('../../../../pages/TransactionMerge/DetailsReviewPage')),
    [SCREENS.MERGE_TRANSACTION.CONFIRMATION_PAGE]: React.lazy(() => import('../../../../pages/TransactionMerge/ConfirmationPage')),
});

const SearchReportModalStackNavigator = createModalStackNavigator<SearchReportParamList>({
    [SCREENS.SEARCH.REPORT_RHP]: React.lazy(() => import('../../../../pages/home/ReportScreen')),
    [SCREENS.SEARCH.ROOT_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/Search/SearchRootVerifyAccountPage')),
    [SCREENS.SEARCH.MONEY_REQUEST_REPORT_VERIFY_ACCOUNT]: React.lazy(() => import('../../../../pages/Search/SearchMoneyRequestReportVerifyAccountPage')),
    [SCREENS.SEARCH.MONEY_REQUEST_REPORT_HOLD_TRANSACTIONS]: React.lazy(() => import('../../../../pages/Search/SearchHoldReasonPage')),
    [SCREENS.SEARCH.TRANSACTION_HOLD_REASON_RHP]: React.lazy(() => import('../../../../pages/Search/SearchHoldReasonPage')),
    [SCREENS.SEARCH.TRANSACTIONS_CHANGE_REPORT_SEARCH_RHP]: React.lazy(() => import('../../../../pages/Search/SearchTransactionsChangeReport')),
});

const SearchAdvancedFiltersModalStackNavigator = createModalStackNavigator<SearchAdvancedFiltersParamList>({
    [SCREENS.SEARCH.ADVANCED_FILTERS_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TYPE_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTypePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_GROUP_BY_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersGroupByPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_STATUS_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersStatusPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_DATE_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersDatePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_SUBMITTED_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersSubmittedPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_APPROVED_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersApprovedPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_PAID_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersPaidPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_EXPORTED_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersExportedPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_POSTED_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersPostedPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWN_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawnPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_CURRENCY_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCurrencyPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_GROUP_CURRENCY_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersGroupCurrencyPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_DESCRIPTION_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersDescriptionPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_MERCHANT_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersMerchantPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_REPORT_ID_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersReportIDPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_AMOUNT_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersAmountPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TOTAL_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTotalPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_CATEGORY_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCategoryPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_KEYWORD_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersKeywordPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_CARD_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersCardPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TAX_RATE_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTaxRatePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_EXPENSE_TYPE_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersExpenseTypePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWAL_TYPE_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawalTypePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_IS_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersIsPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TAG_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersTagPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_HAS_RHP]: React.lazy(() => import('../../../../pages/Search/SearchAdvancedFiltersPage/SearchFiltersHasPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_FROM_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersFromPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TO_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersToPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_IN_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersInPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_TITLE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersTitlePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_ASSIGNEE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersAssigneePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_BILLABLE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersBillablePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_REIMBURSABLE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersReimbursablePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_WORKSPACE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersWorkspacePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_PURCHASE_AMOUNT_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersPurchaseAmountPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_PURCHASE_CURRENCY_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersPurchaseCurrencyPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_WITHDRAWAL_ID_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersWithdrawalIDPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_ACTION_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersActionPage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_ATTENDEE_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersAttendeePage')),
    [SCREENS.SEARCH.ADVANCED_FILTERS_REPORT_FIELD_RHP]: React.lazy(() => import('@pages/Search/SearchAdvancedFiltersPage/SearchFiltersReportFieldPage')),
});

const SearchSavedSearchModalStackNavigator = createModalStackNavigator<SearchSavedSearchParamList>({
    [SCREENS.SEARCH.SAVED_SEARCH_RENAME_RHP]: React.lazy(() => import('../../../../pages/Search/SavedSearchRenamePage')),
});

const RestrictedActionModalStackNavigator = createModalStackNavigator<SearchReportParamList>({
    [SCREENS.RESTRICTED_ACTION_ROOT]: React.lazy(() => import('../../../../pages/RestrictedAction/Workspace/WorkspaceRestrictedActionPage')),
});

const ShareModalStackNavigator = createModalStackNavigator<ShareNavigatorParamList>({
    [SCREENS.SHARE.ROOT]: React.lazy(() => import('@pages/Share/ShareRootPage')),
    [SCREENS.SHARE.SHARE_DETAILS]: React.lazy(() => import('@pages/Share/ShareDetailsPage')),
    [SCREENS.SHARE.SUBMIT_DETAILS]: React.lazy(() => import('@pages/Share/SubmitDetailsPage')),
});

const MissingPersonalDetailsModalStackNavigator = createModalStackNavigator<MissingPersonalDetailsParamList>({
    [SCREENS.MISSING_PERSONAL_DETAILS_ROOT]: React.lazy(() => import('../../../../pages/MissingPersonalDetails')),
});

const AddUnreportedExpenseModalStackNavigator = createModalStackNavigator<AddUnreportedExpensesParamList>({
    [SCREENS.ADD_UNREPORTED_EXPENSES_ROOT]: React.lazy(() => import('../../../../pages/AddUnreportedExpense')),
});

const DebugModalStackNavigator = createModalStackNavigator<DebugParamList>({
    [SCREENS.DEBUG.REPORT]: React.lazy(() => import('../../../../pages/Debug/Report/DebugReportPage')),
    [SCREENS.DEBUG.REPORT_ACTION]: React.lazy(() => import('../../../../pages/Debug/ReportAction/DebugReportActionPage')),
    [SCREENS.DEBUG.REPORT_ACTION_CREATE]: React.lazy(() => import('../../../../pages/Debug/ReportAction/DebugReportActionCreatePage')),
    [SCREENS.DEBUG.DETAILS_CONSTANT_PICKER_PAGE]: React.lazy(() => import('../../../../pages/Debug/DebugDetailsConstantPickerPage')),
    [SCREENS.DEBUG.DETAILS_DATE_TIME_PICKER_PAGE]: React.lazy(() => import('../../../../pages/Debug/DebugDetailsDateTimePickerPage')),
    [SCREENS.DEBUG.TRANSACTION]: React.lazy(() => import('../../../../pages/Debug/Transaction/DebugTransactionPage')),
    [SCREENS.DEBUG.TRANSACTION_VIOLATION_CREATE]: React.lazy(() => import('../../../../pages/Debug/TransactionViolation/DebugTransactionViolationCreatePage')),
    [SCREENS.DEBUG.TRANSACTION_VIOLATION]: React.lazy(() => import('../../../../pages/Debug/TransactionViolation/DebugTransactionViolationPage')),
});

const ScheduleCallModalStackNavigator = createModalStackNavigator<ScheduleCallParamList>({
    [SCREENS.SCHEDULE_CALL.BOOK]: React.lazy(() => import('../../../../pages/ScheduleCall/ScheduleCallPage')),
    [SCREENS.SCHEDULE_CALL.CONFIRMATION]: React.lazy(() => import('../../../../pages/ScheduleCall/ScheduleCallConfirmationPage')),
});

export {
    AddPersonalBankAccountModalStackNavigator,
    EditRequestStackNavigator,
    EnablePaymentsStackNavigator,
    FlagCommentStackNavigator,
    MoneyRequestModalStackNavigator,
    NewChatModalStackNavigator,
    NewTaskModalStackNavigator,
    NewTeachersUniteNavigator,
    PrivateNotesModalStackNavigator,
    ProfileModalStackNavigator,
    ReferralModalStackNavigator,
    TravelModalStackNavigator,
    NewReportWorkspaceSelectionModalStackNavigator,
    ReportDescriptionModalStackNavigator,
    ReportDetailsModalStackNavigator,
    ReportChangeWorkspaceModalStackNavigator,
    ReportChangeApproverModalStackNavigator,
    ReportParticipantsModalStackNavigator,
    ReportSettingsModalStackNavigator,
    RoomMembersModalStackNavigator,
    SettingsModalStackNavigator,
    TwoFactorAuthenticatorStackNavigator,
    SignInModalStackNavigator,
    CategoriesModalStackNavigator,
    TagsModalStackNavigator,
    ExpensifyCardModalStackNavigator,
    DomainCardModalStackNavigator,
    SplitDetailsModalStackNavigator,
    TaskModalStackNavigator,
    ReportVerifyAccountModalStackNavigator,
    WalletStatementStackNavigator,
    TransactionDuplicateStackNavigator,
    SearchReportModalStackNavigator,
    RestrictedActionModalStackNavigator,
    SearchAdvancedFiltersModalStackNavigator,
    ShareModalStackNavigator,
    SearchSavedSearchModalStackNavigator,
    MissingPersonalDetailsModalStackNavigator,
    DebugModalStackNavigator,
    WorkspaceConfirmationModalStackNavigator,
    WorkspaceDuplicateModalStackNavigator,
    ConsoleModalStackNavigator,
    AddUnreportedExpenseModalStackNavigator,
    ScheduleCallModalStackNavigator,
    MergeTransactionStackNavigator,
};
