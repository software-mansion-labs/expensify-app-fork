/**
 * The beneficial owners step of the USD flow: whether the user owns 25%, whether anyone else does, the loop of other
 * owners, and the list whose Confirm sends every owner in one request. "Nobody else" from a user who owns nothing sends
 * the request at once. At most three people own 25%, the user included. On a resume the step opens the list once owners
 * are known, else the second question once the step was saved, else the first question.
 */
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import {NEXT_STEP, OnboardingStep, SubPage, YesNoSubPage, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/OwnersListPage';
import OwnersListPage from '@pages/SimplifiedBankOnboarding/flows/shared/owners/OwnersListPage';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';
import useOwnerLoop from '@pages/SimplifiedBankOnboarding/flows/shared/owners/useOwnerLoop';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/businessInfo/getBusinessInfoAnswers';
import getPersonalInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/personalInfo/getPersonalInfoAnswers';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import getOwnersAnswers from './getOwnersAnswers';
import PAGES from './ownersPages';
import renderOwnerDetailsPages from './renderOwnerDetailsPages';
import usdOwnersRequest from './usdOwnersRequest';

/** The user is listed with the details of the personal info step, which this step does not edit */
const USER_ROW_ID = 'requestor';

function BeneficialOwnersStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const answers = getOwnersAnswers(data);
    const user = getPersonalInfoAnswers(data);
    const {companyName} = getBusinessInfoAnswers(data);
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const loop = useOwnerLoop({
        kind: 'usd',
        owners: answers.owners,
        isUserOwner,
    });
    const [hasSavedStep = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        selector: (account) => account?.achData?.ownsMoreThan25Percent !== undefined,
    });

    const hasOtherOwners = answers.hasOtherBeneficialOwners ?? false;
    const areOwnersKnown = isUserOwner || (hasOtherOwners && loop.owners.length > 0);
    const description = translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity');

    const userRows: OwnerRow[] = isUserOwner
        ? [
              {
                  id: USER_ROW_ID,
                  title: getOwnerFullName(user),
                  description: user.dob,
                  isReadOnly: true,
              },
          ]
        : [];
    const otherOwnerRows = (hasOtherOwners ? loop.owners : []).map(
        (owner): OwnerRow => ({
            id: owner.id,
            title: getOwnerFullName(owner),
            description: owner.dob,
        }),
    );

    const getAnyoneElseNext = (hasOthers: boolean): PageTarget => {
        if (hasOthers && loop.canAddMore) {
            return PAGES.LEGAL_NAME;
        }
        return !hasOthers && !isUserOwner ? NEXT_STEP : PAGES.UBOS_LIST;
    };

    return (
        <OnboardingStep
            title={translate('beneficialOwnerInfoStep.companyOwner')}
            wrapperID="SimplifiedBankOnboardingBeneficialOwners"
            shouldEnableMaxHeight
            shouldEnablePickerAvoiding={false}
        >
            <YesNoSubPage
                name={PAGES.IS_USER_UBO}
                isAnswered={areOwnersKnown || hasSavedStep}
                inputID={INPUT_IDS.OWNS_MORE_THAN_25_PERCENT}
                title={translate('beneficialOwnerInfoStep.doYouOwn25percent', companyName)}
                description={description}
                defaultValue={isUserOwner}
                // The user takes one of the places, so the last owner who no longer fits leaves the list
                getDraftUpdate={(isOwner) => (isOwner ? loop.getMakeRoomForUserUpdate() : {})}
            />
            <YesNoSubPage
                name={PAGES.IS_ANYONE_ELSE_UBO}
                isAnswered={areOwnersKnown}
                inputID={INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS}
                title={translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', companyName)}
                description={description}
                defaultValue={hasOtherOwners}
                getDraftUpdate={(hasOthers) => (hasOthers && loop.canAddMore ? loop.getStartUpdate() : {})}
                getNext={getAnyoneElseNext}
                request={usdOwnersRequest}
            />
            <YesNoSubPage
                name={PAGES.ARE_THERE_MORE_UBOS}
                isAnswered={areOwnersKnown}
                title={translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', companyName)}
                description={description}
                defaultValue={false}
                getDraftUpdate={(hasMore) => (hasMore ? loop.getStartUpdate() : {})}
                getNext={(hasMore) => (hasMore ? PAGES.LEGAL_NAME : PAGES.UBOS_LIST)}
            />
            <SubPage
                name={PAGES.UBOS_LIST}
                back={loop.canAddMore && hasOtherOwners ? PAGES.ARE_THERE_MORE_UBOS : PAGES.IS_ANYONE_ELSE_UBO}
                next={NEXT_STEP}
            >
                <OwnersListPage
                    rows={[...userRows, ...otherOwnerRows]}
                    request={usdOwnersRequest}
                    detailsStartPage={PAGES.LEGAL_NAME}
                    getEditUpdate={loop.getEditUpdate}
                />
            </SubPage>
            {renderOwnerDetailsPages(translate, {loop, isUserOwner})}
        </OnboardingStep>
    );
}

export default BeneficialOwnersStep;
