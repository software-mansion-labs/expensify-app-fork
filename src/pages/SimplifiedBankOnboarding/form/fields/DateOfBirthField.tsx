import DatePicker from '@components/DatePicker';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import {subYears} from 'date-fns';
import React, {useState} from 'react';
import {View} from 'react-native';

type DateOfBirthFieldProps = {
    inputID: TextInputID;
    defaultValue: string;
};

/** The date of birth of a person, who must be old enough to make payments */
function DateOfBirthField({inputID, defaultValue}: DateOfBirthFieldProps) {
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

export default DateOfBirthField;
