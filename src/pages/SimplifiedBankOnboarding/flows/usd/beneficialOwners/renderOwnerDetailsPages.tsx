/**
 * The details pages of one USD owner: the legal name, the date of birth and the confirmation that puts the owner into
 * the list. The pages edit the owner buffer, and the confirmation sends nothing: the list page sends every owner.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {ConfirmationSubPage, DateOfBirthSubPage, FullNameSubPage, PageLoadingIndicator, SubPage} from '@pages/SimplifiedBankOnboarding/core';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerLimits';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';
import type {OwnerLoop} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/useOwnerLoop';

import React from 'react';

const {BENEFICIAL_OWNERS_SUB_PAGES: PAGES} = SBO_CONST.USD;

type USDOwnerDetailsPagesOptions = {
    loop: OwnerLoop<USDOwnerDraft>;
    isUserOwner: boolean;
};

/**
 * An owner opened from the list goes back to the list. A new owner goes back to the question that opened it: "are there
 * more" once others are listed, else "anyone else" (USD-78, BC-09).
 */
function getNamePageBack(loop: OwnerLoop<USDOwnerDraft>) {
    if (loop.isEditingListedOwner) {
        return PAGES.UBOS_LIST;
    }
    return loop.owners.length > 0 ? PAGES.ARE_THERE_MORE_UBOS : PAGES.IS_ANYONE_ELSE_UBO;
}

function renderOwnerDetailsPages(translate: LocalizedTranslate, {loop, isUserOwner}: USDOwnerDetailsPagesOptions): React.ReactElement[] {
    const namePageBack = getNamePageBack(loop);

    if (!loop.ownerBeingModifiedID) {
        return [PAGES.LEGAL_NAME, PAGES.DATE_OF_BIRTH, PAGES.CONFIRMATION].map((name) => (
            <SubPage
                key={name}
                name={name}
                back={name === PAGES.LEGAL_NAME ? namePageBack : undefined}
            >
                <PageLoadingIndicator />
            </SubPage>
        ));
    }

    const {buffer} = loop;
    const hasRoomAfterThisOwner = canAddMoreUSDOwners(loop.ownersAfterCommit, isUserOwner);

    return [
        <FullNameSubPage
            key={PAGES.LEGAL_NAME}
            name={PAGES.LEGAL_NAME}
            back={namePageBack}
            title={translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName')}
            subtitle={translate('beneficialOwnerInfoStep.legalNameSubtitle')}
            firstNameInputID={INPUT_IDS.OWNER_FIRST_NAME}
            lastNameInputID={INPUT_IDS.OWNER_LAST_NAME}
            defaultValues={{
                firstName: buffer.ownerFirstName,
                lastName: buffer.ownerLastName,
            }}
        />,
        <DateOfBirthSubPage
            key={PAGES.DATE_OF_BIRTH}
            name={PAGES.DATE_OF_BIRTH}
            title={translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner')}
            inputID={INPUT_IDS.OWNER_DOB}
            defaultValue={buffer.ownerDob}
        />,
        <ConfirmationSubPage
            key={PAGES.CONFIRMATION}
            name={PAGES.CONFIRMATION}
            title={translate('beneficialOwnerInfoStep.letsDoubleCheck')}
            rows={[
                {
                    label: translate('beneficialOwnerInfoStep.legalName'),
                    value: getOwnerFullName({
                        firstName: buffer.ownerFirstName,
                        lastName: buffer.ownerLastName,
                    }),
                    page: PAGES.LEGAL_NAME,
                },
                {
                    label: translate('common.dob'),
                    value: buffer.ownerDob,
                    page: PAGES.DATE_OF_BIRTH,
                },
            ]}
            getDraftUpdate={loop.getCommitUpdate}
            next={loop.isEditingListedOwner || !hasRoomAfterThisOwner ? PAGES.UBOS_LIST : PAGES.ARE_THERE_MORE_UBOS}
        />,
    ];
}

export default renderOwnerDetailsPages;
