import type {InputElementDefinition} from '@components/DynamicForm/content/elements/types';
import getLocalizedText from '@components/DynamicForm/shared/getLocalizedText';

import type {DynamicFormExpensifyInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

import getConfirmationRows from './getConfirmationRows';
import {getFieldAnswers} from './getSubmittedAnswers';
import {isSupportedFieldType} from './isSupportedField';
import getAnswerKeys from './model/getAnswerKeys';
import getFieldLabel from './model/getFieldLabel';
import isSensitiveField from './model/isSensitiveField';
import needsOwnPage from './needsOwnPage';
import {getFieldErrors} from './validation/getDynamicFieldErrors';

function isExpensifyInputElement(element: DynamicFormSchemaElement): element is DynamicFormExpensifyInputElement {
    return element.elementType === 'ExpensifyInput' && 'type' in element && typeof element.type === 'string' && isSupportedFieldType(element.type, element.key);
}

/** A field in the App's own format */
const expensifyInputDefinition: InputElementDefinition<'ExpensifyInput'> = {
    parse: (element) => (isExpensifyInputElement(element) ? element : undefined),
    getCondition: (field) => field.showWhen,
    getErrors: getFieldErrors,
    getAnswers: getFieldAnswers,
    getSensitiveKeys: (field) => (isSensitiveField(field) ? getAnswerKeys(field) : []),
    getConfirmationRows,
    needsOwnPage,
    getHeadline: (field, translate) => ({question: getLocalizedText(translate, field.questionKey, field.question), label: getFieldLabel(field, translate)}),
};

export default expensifyInputDefinition;
