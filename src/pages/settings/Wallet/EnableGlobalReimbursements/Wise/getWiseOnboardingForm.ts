import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAnswerKeys from '@components/DynamicForm/utils/getAnswerKeys';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import isSupportedField from '@components/DynamicForm/utils/isSupportedField';
import {getPages} from '@components/DynamicForm/utils/paginate';

import CONST from '@src/CONST';
import type {DynamicFormPage} from '@src/types/onyx';
import type {WiseKYCRequirement} from '@src/types/onyx/WiseKYCReview';

import US from './forms/US';
import {getKYCRequirementPage} from './kycRequirementLayouts';

type WiseOnboardingForm = {pages: DynamicFormPage[]};

/** The US profile pages, then a page for each requirement Expensify asks for before Submit, such as enhanced due diligence for a high-risk industry */
function getWiseOnboardingForm(kycRequirements: WiseKYCRequirement[] | undefined): WiseOnboardingForm {
    const requirementPages = (kycRequirements ?? [])
        .filter((requirement) => requirement.requestedBy === CONST.WISE.KYC_REQUIREMENT_REQUESTED_BY.EXPENSIFY)
        .map(getKYCRequirementPage)
        .filter((page): page is DynamicFormPage => !!page);
    return {pages: [...US.pages, ...requirementPages]};
}

/** The flow renames pages to URL-safe keys, so a requirement page is mapped back to Wise's requirement type, which is the step the server saves it under */
function getOnboardingStep(form: WiseOnboardingForm, pageKey: string): string {
    const pageIndex = getPages(form).findIndex((page) => page.key === pageKey);
    return pageIndex === -1 ? pageKey : (form.pages.at(pageIndex)?.key ?? pageKey);
}

/** The first requirement page without a single answer yet, under its URL-safe key */
function getFirstUnansweredRequirementPage(form: WiseOnboardingForm, answers: DynamicFormValues): DynamicFormPage | undefined {
    return getPages(form)
        .slice(US.pages.length)
        .find((page) =>
            getContentFields(page.content)
                .filter(isSupportedField)
                .flatMap(getAnswerKeys)
                .every((key) => {
                    const answer = answers[key];
                    return !answer || (Array.isArray(answer) && answer.length === 0);
                }),
        );
}

export default getWiseOnboardingForm;
export {getFirstUnansweredRequirementPage, getOnboardingStep};
export type {WiseOnboardingForm};
