/**
 * The owner step of the NonUSD flow: whether the user owns 25% (then the user fills in the details of an owner), whether
 * anyone else does, the loop of other owners, and the list whose Confirm sends every owner in one request. "Nobody else"
 * from a user who owns nothing sends the request at once with no owners. More owners fit while the listed shares add up
 * to 75% at most. On a resume the step opens the list once owners are known, else the first question.
 */
import useLocalize from '@hooks/useLocalize';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import {NEXT_STEP, OnboardingStep, SubPage, YesNoSubPage, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/businessInfo/getBusinessInfoAnswers';
import {CURRENT_USER_OWNER_ID} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import OwnersListPage from '@pages/SimplifiedBankOnboarding/flows/shared/owners/OwnersListPage';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';
import useOwnerLoop from '@pages/SimplifiedBankOnboarding/flows/shared/owners/useOwnerLoop';

import React from 'react';

import getOwnersAnswers from './getOwnersAnswers';
import globalOwnersRequest from './globalOwnersRequest';
import PAGES from './ownersPages';
import renderOwnerDetailsPages from './renderOwnerDetailsPages';

function BeneficialOwnersStep() {
    const {translate} = useLocalize();
    const data = useFlowData();
    const answers = getOwnersAnswers(data);
    const {companyName} = getBusinessInfoAnswers(data);
    const loop = useOwnerLoop({kind: 'global', owners: answers.owners});

    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const areOwnersKnown = loop.owners.length > 0;
    const hasOtherOwners = loop.owners.some((owner) => owner.id !== CURRENT_USER_OWNER_ID);
    const description = translate('ownershipInfoStep.regulationsRequire');

    const getAnyoneElseDraftUpdate = (hasOthers: boolean) => {
        if (!hasOthers) {
            return loop.getRemoveOtherOwnersUpdate();
        }
        return loop.canAddMore ? loop.getStartUpdate() : {};
    };

    const getAnyoneElseNext = (hasOthers: boolean): PageTarget => {
        if (!hasOthers) {
            return isUserOwner ? PAGES.BENEFICIAL_OWNERS_LIST : NEXT_STEP;
        }
        return loop.canAddMore ? PAGES.NAME : PAGES.BENEFICIAL_OWNERS_LIST;
    };

    return (
        <OnboardingStep
            title={translate('ownershipInfoStep.ownerInfo')}
            wrapperID="SimplifiedBankOnboardingBeneficialOwnerInfo"
        >
            <YesNoSubPage
                name={PAGES.IS_USER_BENEFICIAL_OWNER}
                isAnswered={areOwnersKnown}
                inputID={INPUT_IDS.OWNS_MORE_THAN_25_PERCENT}
                title={translate('ownershipInfoStep.doYouOwn', companyName)}
                description={description}
                defaultValue={isUserOwner}
                getDraftUpdate={(isOwner) => (isOwner ? loop.getStartUserUpdate() : loop.getRemoveUpdate(CURRENT_USER_OWNER_ID))}
                getNext={(isOwner) => (isOwner ? PAGES.NAME : PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER)}
            />
            <YesNoSubPage
                name={PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER}
                isAnswered={areOwnersKnown}
                inputID={INPUT_IDS.ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE}
                title={translate('ownershipInfoStep.doesAnyoneOwn', companyName)}
                description={description}
                defaultValue={answers.anyIndividualOwn25PercentOrMore ?? false}
                getDraftUpdate={getAnyoneElseDraftUpdate}
                getNext={getAnyoneElseNext}
                request={globalOwnersRequest}
                shouldSend={(hasOthers) => !hasOthers && !isUserOwner}
            />
            <YesNoSubPage
                name={PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS}
                isAnswered={areOwnersKnown}
                inputID={INPUT_IDS.ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE}
                title={translate('ownershipInfoStep.areThereOther', companyName)}
                description={description}
                defaultValue={false}
                // This question comes only after another owner joined the list, so its "no" must not undo the "yes" of the second question
                getDraftUpdate={(hasMore) => ({
                    [INPUT_IDS.ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE]: true,
                    ...(hasMore && loop.canAddMore ? loop.getStartUpdate() : {}),
                })}
                getNext={(hasMore) => (hasMore && loop.canAddMore ? PAGES.NAME : PAGES.BENEFICIAL_OWNERS_LIST)}
            />
            <SubPage
                name={PAGES.BENEFICIAL_OWNERS_LIST}
                // Not to the confirmation of the last owner as before: that owner is listed now, so its name page would lead back here
                back={loop.canAddMore && hasOtherOwners ? PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS : PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER}
                next={NEXT_STEP}
            >
                <OwnersListPage
                    rows={loop.owners.map((owner) => ({
                        id: owner.id,
                        title: getOwnerFullName(owner),
                        description: `${owner.ownershipPercentage}%`,
                    }))}
                    request={globalOwnersRequest}
                    detailsStartPage={PAGES.NAME}
                    getEditUpdate={loop.getEditUpdate}
                />
            </SubPage>
            {renderOwnerDetailsPages(translate, loop)}
        </OnboardingStep>
    );
}

export default BeneficialOwnersStep;
