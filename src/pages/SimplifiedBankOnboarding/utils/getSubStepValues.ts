/**
 * Collects the default values of a step. Each value comes from the first place that has it: the draft, then the account
 * data of the server, then the nested data of the global provider. It mirrors `getSubStepValues` of the real flow.
 */
import type {InputID, OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The inputs that hold text. Checkboxes and file inputs are read by the steps that own them. */
type TextInputID = {[TKey in InputID]: OnboardingForm[TKey] extends string ? TKey : never}[InputID];

type SubStepValues<TKey extends TextInputID> = Record<TKey, string>;

function getTextValue(source: Record<string, unknown> | null | undefined, key: string): string | undefined {
    const value = source?.[key];
    return typeof value === 'string' ? value : undefined;
}

function getSubStepValue(key: TextInputID, draft: OnyxEntry<OnboardingForm>, account: OnyxEntry<OnboardingAccount>): string {
    return getTextValue(draft, key) ?? getTextValue(account?.achData, key) ?? getTextValue(account?.achData?.corpay, key) ?? '';
}

function getSubStepValues<TKey extends TextInputID>(inputKeys: Record<string, TKey>, draft: OnyxEntry<OnboardingForm>, account: OnyxEntry<OnboardingAccount>): SubStepValues<TKey> {
    const values: Partial<SubStepValues<TKey>> = {};
    for (const key of Object.values(inputKeys)) {
        values[key] = getSubStepValue(key, draft, account);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The loop fills every key of `inputKeys`, which TypeScript cannot follow through the iteration
    return values as SubStepValues<TKey>;
}

export default getSubStepValues;
export {getSubStepValue, getTextValue};
export type {SubStepValues, TextInputID};
