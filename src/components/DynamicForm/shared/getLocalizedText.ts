import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {TranslationPaths} from '@src/languages/types';

/** Our translation when the schema names one, otherwise the schema author's wording */
function getLocalizedText(translate: LocalizedTranslate, translationKey: TranslationPaths | undefined, text: string | undefined): string | undefined {
    return translationKey ? translate(translationKey) : text;
}

export default getLocalizedText;
