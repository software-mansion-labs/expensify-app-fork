/**
 * The business type sub page: a picklist whose values come from the server. Like the real one it takes its default value
 * from the server data only, and it shows a loader until the picklists of the country arrive.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import PushRowFieldsStep from '@components/SubStepForms/PushRowFieldsStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';
import useThemeStyles from '@hooks/useThemeStyles';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.BUSINESS_TYPE];

function BusinessType({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [onboardingPicklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);

    const businessTypeOptions = Object.fromEntries((onboardingPicklists?.picklists?.businessType ?? []).map((option) => [option.id, option.name]));

    const pushRowFields = [
        {
            inputID: INPUT_IDS.BUSINESS_TYPE,
            defaultValue: account?.achData?.corpay?.businessType ?? '',
            options: businessTypeOptions,
            description: translate('businessInfoStep.businessType'),
            modalHeaderTitle: translate('businessInfoStep.selectBusinessType'),
            searchInputTitle: translate('businessInfoStep.findBusinessType'),
        },
    ];

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    if (onboardingPicklists?.isLoading) {
        return (
            <ActivityIndicator
                size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                style={styles.flexGrow1}
            />
        );
    }

    return (
        <PushRowFieldsStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('businessInfoStep.whatTypeOfBusinessIsIt')}
            onSubmit={handleSubmit}
            pushRowFields={pushRowFields}
        />
    );
}

export default BusinessType;
