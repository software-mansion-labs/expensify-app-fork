import React, {useMemo} from 'react';
import {View} from 'react-native';
import type {LocaleContextProps} from '@components/LocaleContextProvider';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import Section from '@components/Section';
import Switch from '@components/Switch';
import Text from '@components/Text';
import TextLink from '@components/TextLink';
import useLocalize from '@hooks/useLocalize';
import usePolicy from '@hooks/usePolicy';
import useThemeStyles from '@hooks/useThemeStyles';
import {openExternalLink} from '@libs/actions/Link';
import {setPolicyAttendeeTrackingEnabled, setWorkspaceEReceiptsEnabled} from '@libs/actions/Policy/Policy';
import {convertToDisplayString} from '@libs/CurrencyUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {ThemeStyles} from '@styles/index';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ROUTES from '@src/ROUTES';
import type {Policy} from '@src/types/onyx';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

type IndividualExpenseRulesSectionProps = {
    policyID: string;
};

type IndividualExpenseRulesSectionSubtitleProps = {
    policy?: Policy;
    translate: LocaleContextProps['translate'];
    styles: ThemeStyles;
};

type IndividualExpenseRulesMenuItem = {
    title: string;
    descriptionTranslationKey: TranslationPaths;
    action: () => void;
    pendingAction?: PendingAction;
};

function IndividualExpenseRulesSectionSubtitle({policy, translate, styles}: IndividualExpenseRulesSectionSubtitleProps) {
    const policyID = policy?.id;

    const handleOnPressCategoriesLink = () => {
        if (policy?.areCategoriesEnabled) {
            Navigation.navigate(ROUTES.WORKSPACE_CATEGORIES.getRoute(policyID));
            return;
        }

        Navigation.navigate(ROUTES.WORKSPACE_MORE_FEATURES.getRoute(policyID));
    };

    const handleOnPressTagsLink = () => {
        if (policy?.areTagsEnabled) {
            Navigation.navigate(ROUTES.WORKSPACE_TAGS.getRoute(policyID));
            return;
        }

        Navigation.navigate(ROUTES.WORKSPACE_MORE_FEATURES.getRoute(policyID));
    };

    return (
        <Text style={[styles.flexRow, styles.alignItemsCenter, styles.w100, styles.mt2]}>
            <Text style={[styles.textNormal, styles.colorMuted]}>{translate('workspace.rules.individualExpenseRules.subtitle')}</Text>{' '}
            <TextLink
                style={styles.link}
                onPress={handleOnPressCategoriesLink}
            >
                {translate('workspace.common.categories').toLowerCase()}
            </TextLink>{' '}
            <Text style={[styles.textNormal, styles.colorMuted]}>{translate('common.and')}</Text>{' '}
            <TextLink
                style={styles.link}
                onPress={handleOnPressTagsLink}
            >
                {translate('workspace.common.tags').toLowerCase()}
            </TextLink>
            .
        </Text>
    );
}

function IndividualExpenseRulesSection({policyID}: IndividualExpenseRulesSectionProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const policy = usePolicy(policyID);

    const policyCurrency = policy?.outputCurrency ?? CONST.CURRENCY.USD;

    const maxExpenseAmountNoReceiptText = useMemo(() => {
        if (policy?.maxExpenseAmountNoReceipt === CONST.DISABLED_MAX_EXPENSE_VALUE) {
            return '';
        }

        return convertToDisplayString(policy?.maxExpenseAmountNoReceipt, policyCurrency);
    }, [policy?.maxExpenseAmountNoReceipt, policyCurrency]);

    const maxExpenseAmountText = useMemo(() => {
        if (policy?.maxExpenseAmount === CONST.DISABLED_MAX_EXPENSE_VALUE) {
            return '';
        }

        return convertToDisplayString(policy?.maxExpenseAmount, policyCurrency);
    }, [policy?.maxExpenseAmount, policyCurrency]);

    const maxExpenseAgeText = useMemo(() => {
        if (policy?.maxExpenseAge === CONST.DISABLED_MAX_EXPENSE_VALUE) {
            return '';
        }

        return translate('workspace.rules.individualExpenseRules.maxExpenseAgeDays', {count: policy?.maxExpenseAge ?? 0});
    }, [policy?.maxExpenseAge, translate]);

    const billableModeText = translate(`workspace.rules.individualExpenseRules.${policy?.defaultBillable ? 'billable' : 'nonBillable'}`);

    const prohibitedExpenses = useMemo(() => {
        // Otherwise return which expenses are prohibited comma separated
        const prohibitedExpensesList = [];
        if (policy?.prohibitedExpenses?.adultEntertainment) {
            prohibitedExpensesList.push(translate('workspace.rules.individualExpenseRules.adultEntertainment'));
        }

        if (policy?.prohibitedExpenses?.alcohol) {
            prohibitedExpensesList.push(translate('workspace.rules.individualExpenseRules.alcohol'));
        }

        if (policy?.prohibitedExpenses?.gambling) {
            prohibitedExpensesList.push(translate('workspace.rules.individualExpenseRules.gambling'));
        }

        if (policy?.prohibitedExpenses?.hotelIncidentals) {
            prohibitedExpensesList.push(translate('workspace.rules.individualExpenseRules.hotelIncidentals'));
        }

        if (policy?.prohibitedExpenses?.tobacco) {
            prohibitedExpensesList.push(translate('workspace.rules.individualExpenseRules.tobacco'));
        }

        // If no expenses are prohibited, return empty string
        if (!prohibitedExpensesList.length) {
            return '';
        }

        return prohibitedExpensesList.join(', ');
    }, [policy?.prohibitedExpenses, translate]);

    const individualExpenseRulesItems: IndividualExpenseRulesMenuItem[] = [
        {
            title: maxExpenseAmountNoReceiptText,
            descriptionTranslationKey: 'workspace.rules.individualExpenseRules.receiptRequiredAmount',
            action: () => Navigation.navigate(ROUTES.RULES_RECEIPT_REQUIRED_AMOUNT.getRoute(policyID)),
            pendingAction: policy?.pendingFields?.maxExpenseAmountNoReceipt,
        },
        {
            title: maxExpenseAmountText,
            descriptionTranslationKey: 'workspace.rules.individualExpenseRules.maxExpenseAmount',
            action: () => Navigation.navigate(ROUTES.RULES_MAX_EXPENSE_AMOUNT.getRoute(policyID)),
            pendingAction: policy?.pendingFields?.maxExpenseAmount,
        },
        {
            title: maxExpenseAgeText,
            descriptionTranslationKey: 'workspace.rules.individualExpenseRules.maxExpenseAge',
            action: () => Navigation.navigate(ROUTES.RULES_MAX_EXPENSE_AGE.getRoute(policyID)),
            pendingAction: policy?.pendingFields?.maxExpenseAge,
        },
        {
            title: billableModeText,
            descriptionTranslationKey: 'workspace.rules.individualExpenseRules.billableDefault',
            action: () => Navigation.navigate(ROUTES.RULES_BILLABLE_DEFAULT.getRoute(policyID)),
            pendingAction: policy?.pendingFields?.defaultBillable,
        },
    ];

    individualExpenseRulesItems.push({
        title: prohibitedExpenses,
        descriptionTranslationKey: 'workspace.rules.individualExpenseRules.prohibitedExpenses',
        action: () => Navigation.navigate(ROUTES.RULES_PROHIBITED_DEFAULT.getRoute(policyID)),
        pendingAction: !isEmptyObject(policy?.prohibitedExpenses?.pendingFields) ? CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE : undefined,
    });

    const areEReceiptsEnabled = policy?.eReceipts ?? false;

    // For backwards compatibility with Expensify Classic, we assume that Attendee Tracking is enabled by default on
    // Control policies if the policy does not contain the attribute
    const isAttendeeTrackingEnabled = policy?.isAttendeeTrackingEnabled ?? true;

    return (
        <Section
            isCentralPane
            title={translate('workspace.rules.individualExpenseRules.title')}
            renderSubtitle={() => (
                <IndividualExpenseRulesSectionSubtitle
                    policy={policy}
                    translate={translate}
                    styles={styles}
                />
            )}
            subtitle={translate('workspace.rules.individualExpenseRules.subtitle')}
            titleStyles={styles.accountSettingsSectionTitle}
        >
            <View style={[styles.mt3, styles.gap3]}>
                {individualExpenseRulesItems.map((item) => (
                    <OfflineWithFeedback
                        pendingAction={item.pendingAction}
                        key={translate(item.descriptionTranslationKey)}
                    >
                        <MenuItemWithTopDescription
                            shouldShowRightIcon
                            title={item.title}
                            description={translate(item.descriptionTranslationKey)}
                            onPress={item.action}
                            wrapperStyle={[styles.sectionMenuItemTopDescription]}
                            numberOfLinesTitle={2}
                        />
                    </OfflineWithFeedback>
                ))}

                <View style={[styles.mt3]}>
                    <OfflineWithFeedback pendingAction={policy?.pendingFields?.eReceipts}>
                        <View style={[styles.flexRow, styles.mb1, styles.mr2, styles.alignItemsCenter, styles.justifyContentBetween]}>
                            <Text style={[styles.flexShrink1, styles.mr2]}>{translate('workspace.rules.individualExpenseRules.eReceipts')}</Text>
                            <Switch
                                isOn={areEReceiptsEnabled}
                                accessibilityLabel={translate('workspace.rules.individualExpenseRules.eReceipts')}
                                onToggle={() => setWorkspaceEReceiptsEnabled(policyID, !areEReceiptsEnabled)}
                                disabled={policyCurrency !== CONST.CURRENCY.USD}
                            />
                        </View>
                    </OfflineWithFeedback>
                    <Text style={[styles.flexRow, styles.alignItemsCenter, styles.w100]}>
                        <Text style={[styles.textLabel, styles.colorMuted]}>{translate('workspace.rules.individualExpenseRules.eReceiptsHint')}</Text>{' '}
                        <TextLink
                            style={[styles.textLabel, styles.link]}
                            onPress={() => openExternalLink(CONST.DEEP_DIVE_ERECEIPTS)}
                        >
                            {translate('workspace.rules.individualExpenseRules.eReceiptsHintLink')}
                        </TextLink>
                        .
                    </Text>
                </View>
                <View style={[styles.mt3]}>
                    <OfflineWithFeedback pendingAction={policy?.pendingFields?.isAttendeeTrackingEnabled}>
                        <View style={[styles.flexRow, styles.mb1, styles.mr2, styles.alignItemsCenter, styles.justifyContentBetween]}>
                            <Text style={[styles.flexShrink1, styles.mr2]}>{translate('workspace.rules.individualExpenseRules.attendeeTracking')}</Text>
                            <Switch
                                isOn={isAttendeeTrackingEnabled}
                                accessibilityLabel={translate('workspace.rules.individualExpenseRules.attendeeTracking')}
                                onToggle={() => setPolicyAttendeeTrackingEnabled(policyID, !isAttendeeTrackingEnabled)}
                            />
                        </View>
                    </OfflineWithFeedback>
                    <Text style={[styles.flexRow, styles.alignItemsCenter, styles.w100]}>
                        <Text style={[styles.textLabel, styles.colorMuted]}>{translate('workspace.rules.individualExpenseRules.attendeeTrackingHint')}</Text>
                    </Text>
                </View>
            </View>
        </Section>
    );
}

export default IndividualExpenseRulesSection;
