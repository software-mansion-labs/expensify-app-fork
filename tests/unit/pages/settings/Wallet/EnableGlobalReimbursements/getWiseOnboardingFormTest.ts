import {getPages} from '@components/DynamicForm/utils/paginate';

import getWiseOnboardingForm, {getFirstUnansweredRequirementPage, getOnboardingStep} from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/getWiseOnboardingForm';
import {getKYCRequirementPage} from '@pages/settings/Wallet/EnableGlobalReimbursements/Wise/kycRequirementLayouts';

import CONST from '@src/CONST';
import type {WiseKYCRequirement} from '@src/types/onyx/WiseKYCReview';

const PROFILE_PAGE_KEYS = ['representative', 'business'];
const INFO_ROUTE_KEY = 'business-source-of-wealth-info';
const PROOF_ROUTE_KEY = 'business-source-of-wealth-proof';

function getRequirement(key: string, overrides: Partial<WiseKYCRequirement> = {}): WiseKYCRequirement {
    return {key, state: CONST.WISE.KYC_REQUIREMENT_STATE.NOT_PROVIDED, isHostedOnly: false, requestedBy: CONST.WISE.KYC_REQUIREMENT_REQUESTED_BY.EXPENSIFY, ...overrides};
}

const ENHANCED_DUE_DILIGENCE = [getRequirement(CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO), getRequirement(CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF)];

describe('getWiseOnboardingForm', () => {
    it('adds a page for each requirement Expensify asks for, after the profile pages and in the server order', () => {
        // Given a high-risk business, for which the business page save returned the two source of wealth requirements
        // When the form is built
        const form = getWiseOnboardingForm(ENHANCED_DUE_DILIGENCE);

        // Then the requirement pages follow the profile pages, keyed by Wise's requirement type, which is the step they save under
        expect(form.pages.map((page) => page.key)).toEqual([
            ...PROFILE_PAGE_KEYS,
            CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO,
            CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF,
        ]);
    });

    it.each([
        ['no requirements', undefined],
        [
            'a requirement Wise asked for after Submit',
            [getRequirement(CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF, {requestedBy: CONST.WISE.KYC_REQUIREMENT_REQUESTED_BY.WISE})],
        ],
        ['a requirement only Wise can collect', [getRequirement(CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO, {isHostedOnly: true})]],
        ['a requirement type the App has no page for', [getRequirement('BUSINESS_ULTIMATE_BENEFICIAL_OWNER_ID')]],
        ['the ID document, which the representative page collects', [getRequirement(CONST.WISE.KYC_REQUIREMENT.ID_DOCUMENT)]],
    ])('keeps only the profile pages for %s', (_label, kycRequirements) => {
        // Given requirements the intake does not draw a page for
        // When the form is built
        const form = getWiseOnboardingForm(kycRequirements);

        // Then the user sees the profile pages alone, since Wise's embedded page or the follow-up list collects the rest
        expect(form.pages.map((page) => page.key)).toEqual(PROFILE_PAGE_KEYS);
    });

    it('offers every source of wealth and document type Wise accepts on the proof page, once each', () => {
        // Given the proof page
        const proofPage = getKYCRequirementPage(getRequirement(CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_PROOF));
        const getOptionKeys = (fieldKey: string) => {
            const field = proofPage?.content.find((item) => 'type' in item && item.key === fieldKey);
            return field && 'values' in field ? (field.values ?? []).map((option) => option.key) : [];
        };

        // Then its pickers list Wise's values, since the server forwards the answers to Wise as they are
        expect(getOptionKeys('sourceOfWealthType')).toEqual(Object.values(CONST.WISE.SOURCE_OF_WEALTH));
        expect(getOptionKeys('documentType')).toEqual(Object.values(CONST.WISE.SOURCE_OF_WEALTH_DOCUMENT_TYPE));
    });
});

describe('getOnboardingStep', () => {
    const form = getWiseOnboardingForm(ENHANCED_DUE_DILIGENCE);

    it.each([
        ['a requirement page, whose route key differs from its type', INFO_ROUTE_KEY, CONST.WISE.KYC_REQUIREMENT.BUSINESS_SOURCE_OF_WEALTH_INFO],
        ['a profile page', 'business', 'business'],
    ])('saves %s under its own key', (_label, routeKey, expectedStep) => {
        // Given the key the flow gave a page in its URL
        // When the step to save the page under is looked up
        // Then it is the key the page was built with, since the server stores the answers under it
        expect(getOnboardingStep(form, routeKey)).toBe(expectedStep);
    });

    it('confirms the flow names requirement pages with URL-safe keys', () => {
        // Given the form with both requirement pages
        // When the flow names its pages
        // Then the requirement pages get keys that differ from their types, which is why the step is looked up
        expect(getPages(form).map((page) => page.key)).toEqual([...PROFILE_PAGE_KEYS, INFO_ROUTE_KEY, PROOF_ROUTE_KEY]);
    });
});

describe('getFirstUnansweredRequirementPage', () => {
    const form = getWiseOnboardingForm(ENHANCED_DUE_DILIGENCE);

    it('finds the first requirement page with no answer', () => {
        // Given the profile pages answered and the source of wealth chosen, but no proof yet
        const answers = {companyRole: CONST.WISE.COMPANY_ROLE.OWNER, businessSourceOfWealthInfo: CONST.WISE.SOURCE_OF_WEALTH.REVENUE, proofFile: []};

        // When the next requirement page to open is looked up
        // Then it is the proof page, under the key the flow uses in its URL
        expect(getFirstUnansweredRequirementPage(form, answers)?.key).toBe(PROOF_ROUTE_KEY);
    });

    it('finds nothing once every requirement page has an answer, or when there are no requirements', () => {
        // Given both requirement pages answered
        const answers = {businessSourceOfWealthInfo: CONST.WISE.SOURCE_OF_WEALTH.GRANTS, sourceOfWealthType: CONST.WISE.SOURCE_OF_WEALTH.GRANTS};

        // When the next requirement page to open is looked up
        // Then there is none, and a form without requirements has none either, even with the profile pages empty
        expect(getFirstUnansweredRequirementPage(form, answers)).toBeUndefined();
        expect(getFirstUnansweredRequirementPage(getWiseOnboardingForm(undefined), {})).toBeUndefined();
    });
});
