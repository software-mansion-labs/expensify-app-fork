/**
 * The single precedence rule for the value of an input: the draft, then the account data of the server, then the nested
 * data of the global provider. The draft holds only the edits that are not saved yet, because the success of a confirmed
 * step request removes the fields of the step from it, so a value that the server holds is never copied into the draft.
 */
import type {InputID, OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** The inputs that hold text. File inputs are read by the steps that own them. */
type TextInputID = {[TKey in InputID]: OnboardingForm[TKey] extends string ? TKey : never}[InputID];

/** The inputs that hold a yes or no answer */
type BooleanInputID = {[TKey in InputID]: OnboardingForm[TKey] extends boolean ? TKey : never}[InputID];

/** The draft as the steps read it. The flow pages read only a few of its fields. */
type OnboardingDraft = Partial<OnboardingForm> | undefined;

type ResolvedValues<TKey extends TextInputID> = Record<TKey, string>;

function getTextValue(source: Record<string, unknown> | null | undefined, key: string): string | undefined {
    const value = source?.[key];
    return typeof value === 'string' ? value : undefined;
}

function getBooleanValue(source: Record<string, unknown> | null | undefined, key: string): boolean | undefined {
    const value = source?.[key];
    return typeof value === 'boolean' ? value : undefined;
}

function resolveValue(key: TextInputID, draft: OnboardingDraft, achData: ACHData | undefined): string {
    return getTextValue(draft, key) ?? getTextValue(achData, key) ?? getTextValue(achData?.corpay, key) ?? '';
}

/** Undefined means that neither the user nor the server answered yet, which some steps tell apart from a "no" */
function resolveBooleanValue(key: BooleanInputID, draft: OnboardingDraft, achData: ACHData | undefined): boolean | undefined {
    return getBooleanValue(draft, key) ?? getBooleanValue(achData, key) ?? getBooleanValue(achData?.corpay, key);
}

function resolveValues<TKey extends TextInputID>(inputKeys: Record<string, TKey>, draft: OnboardingDraft, achData: ACHData | undefined): ResolvedValues<TKey> {
    const values: Partial<ResolvedValues<TKey>> = {};
    for (const key of Object.values(inputKeys)) {
        values[key] = resolveValue(key, draft, achData);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- The loop fills every key of `inputKeys`, which TypeScript cannot follow through the iteration
    return values as ResolvedValues<TKey>;
}

export default resolveValue;
export {getTextValue, resolveBooleanValue, resolveValues};
export type {BooleanInputID, OnboardingDraft, ResolvedValues, TextInputID};
