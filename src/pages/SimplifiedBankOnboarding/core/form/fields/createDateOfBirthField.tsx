/**
 * The date of birth of a person, who must be old enough to make payments.
 */
import DatePicker from '@components/DatePicker';
import InputWrapper from '@components/Form/InputWrapper';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isValidPastDate, meetsMaximumAgeRequirement, meetsMinimumAgeRequirement} from '@libs/ValidationUtils';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';

import CONST from '@src/CONST';

import {subYears} from 'date-fns';
import React, {useState} from 'react';
import {View} from 'react-native';

import type {Field} from './types';

import getInputErrors from './getInputErrors';

type DateOfBirthFieldInputProps = {
    inputID: TextInputID;
    defaultValue: string;
};

/** A date of birth lies in the past and gives an age that the payment rules accept */
function getDateOfBirthError(value: string, translate: LocalizedTranslate): string | undefined {
    if (!isValidPastDate(value) || !meetsMaximumAgeRequirement(value)) {
        return translate('bankAccount.error.dob');
    }
    if (!meetsMinimumAgeRequirement(value)) {
        return translate('bankAccount.error.age');
    }
    return undefined;
}

function DateOfBirthFieldInput({inputID, defaultValue}: DateOfBirthFieldInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    // The age bounds are measured from the day the page opened, so a render never moves them
    const [today] = useState(() => new Date());

    return (
        <View style={styles.mb6}>
            <InputWrapper
                InputComponent={DatePicker}
                inputID={inputID}
                label={translate('common.dob')}
                placeholder={translate('common.dateFormat')}
                defaultValue={defaultValue}
                minDate={subYears(today, CONST.DATE_BIRTH.MAX_AGE)}
                maxDate={subYears(today, CONST.DATE_BIRTH.MIN_AGE_FOR_PAYMENT)}
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
            />
        </View>
    );
}

function createDateOfBirthField(inputID: TextInputID): Field {
    return {
        key: inputID,
        inputIDs: [inputID],
        getErrors: (values, translate) => getInputErrors(inputID, {validate: (value) => getDateOfBirthError(value, translate)}, values, translate),
        getSummaryRows: (values, translate) => [{id: inputID, label: translate('common.dob'), value: values[inputID] ?? ''}],

        render: ({values}) => (
            <DateOfBirthFieldInput
                inputID={inputID}
                defaultValue={values[inputID] ?? ''}
            />
        ),
    };
}

export default createDateOfBirthField;
