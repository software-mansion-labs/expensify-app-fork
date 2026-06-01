import React, {useRef} from 'react';
// eslint-disable-next-line no-restricted-imports
import type {GestureResponderEvent, Role, Text, View as ViewType} from 'react-native';
import {View} from 'react-native';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import * as API from '@libs/API';
import type ExpenseCreateParams from '@libs/API/parameters/ExpenseCreateParams';
import {WRITE_COMMANDS} from '@libs/API/types';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import DistanceRequestUtils from '@libs/DistanceRequestUtils';
import {getDistanceRateCustomUnit} from '@libs/PolicyUtils';
import variables from '@styles/variables';
import ONYXKEYS from '@src/ONYXKEYS';
import Icon from './Icon';
import {PressableWithoutFeedback} from './Pressable';

type FloatingOldDotGPSTestButtonProps = {
    accessibilityLabel: string;
    role: Role;
};

function FloatingOldDotGPSTestButton({accessibilityLabel, role}: FloatingOldDotGPSTestButtonProps) {
    const {buttonDefaultBG, textLight} = useTheme();
    const styles = useThemeStyles();
    const borderRadius = styles.floatingActionButton.borderRadius;
    const fabPressable = useRef<HTMLDivElement | ViewType | Text | null>(null);
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['Car'] as const);
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [activePolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`);

    const handlePress = (event: GestureResponderEvent | KeyboardEvent | undefined) => {
        fabPressable.current?.blur();

        const distanceUnit = getDistanceRateCustomUnit(activePolicy);
        const defaultRate = DistanceRequestUtils.getDefaultMileageRate(activePolicy);

        // OldDot GPS points use {lat, long} (not lng)
        const gpsPoints = [
            {lat: 39.416921669617295, long: 68.93618253059685},
            {lat: 39.41697263158858, long: 68.93611857667565},
            {lat: 39.41702309064567, long: 68.93600994721055},
            {lat: 39.417067263275385, long: 68.93594289198518},
            {lat: 39.41713037900627, long: 68.93582856282592},
            {lat: 39.4171872921288, long: 68.93571875989437},
            {lat: 39.41729728132486, long: 68.93558029085398},
            {lat: 39.41742519289255, long: 68.93543745577335},
            {lat: 39.41756012365222, long: 68.93530671298504},
            {lat: 39.41772337257862, long: 68.93518786504865},
            {lat: 39.41790773794055, long: 68.93507730588317},
            {lat: 39.41810558736324, long: 68.93496238067746},
            {lat: 39.41830301769078, long: 68.93484778074786},
            {lat: 39.418542355746034, long: 68.93476052880287},
            {lat: 39.418824937939644, long: 68.9346993342042},
            {lat: 39.41912067495286, long: 68.93462793156505},
            {lat: 39.41940936818719, long: 68.93453128635883},
            {lat: 39.4197051127106, long: 68.93441014364362},
            {lat: 39.42001688480377, long: 68.93429970368743},
            {lat: 39.4203554317355, long: 68.9342054054141},
            {lat: 39.42070406675338, long: 68.93412314355373},
            {lat: 39.42107386141968, long: 68.93404893577099},
            {lat: 39.42144064605236, long: 68.93396938592195},
            {lat: 39.4217923283577, long: 68.93387541174888},
            {lat: 39.4221390299499, long: 68.93375695124268},
            {lat: 39.42248573154209, long: 68.93363849073648},
            {lat: 39.42284551821649, long: 68.93353045940399},
            {lat: 39.42322435975075, long: 68.93344819754362},
            {lat: 39.42361629009247, long: 68.93339203298092},
            {lat: 39.42401123046875, long: 68.93335196375847},
            {lat: 39.42440316081047, long: 68.93329579919577},
            {lat: 39.42476898804307, long: 68.93319413810968},
            {lat: 39.42509844340384, long: 68.93302977457643},
            {lat: 39.42538753338158, long: 68.93280368298292},
            {lat: 39.4256369292736, long: 68.93252452090382},
            {lat: 39.42585311457515, long: 68.93220326304436},
            {lat: 39.42604509368539, long: 68.93185492858291},
            {lat: 39.42622699588537, long: 68.93149387463927},
            {lat: 39.42640889808535, long: 68.93113282069564},
            {lat: 39.43170960992575, long: 68.93116562627256},
        ];

        const localID = `olddot-gps-test-${Date.now()}`;
        const rateCents = defaultRate?.rate ?? 6700;
        const unit = defaultRate?.unit ?? 'mi';
        const quantity = 10.0;
        const amountCents = Math.round((rateCents / 100) * quantity);
        const rateFormatted = (rateCents / 100).toFixed(2);
        const currency = defaultRate?.currency ?? activePolicy?.outputCurrency ?? 'USD';

        const transaction = {
            amount: -amountCents,
            merchant: `${quantity.toFixed(2)} ${unit} @ $${rateFormatted}/${unit}`,
            category: '',
            comment: 'From: New York 21, NY To: New York 29, NY',
            currency,
            reportID: -3,
            created: new Date().toISOString().split('T')[0],
            billable: false,
            reimbursable: true,
            tag: '',
            nameValuePairs: {
                type: 'customUnit',
                customUnit: {
                    customUnitID: distanceUnit?.customUnitID ?? '',
                    customUnitRateID: defaultRate?.customUnitRateID ?? '',
                    quantity,
                    name: 'Distance',
                },
                units: {
                    rate: rateFormatted,
                    unit,
                },
                mobileClientID: localID,
            },
        };

        const transactionList = JSON.stringify([
            {
                localID,
                transaction,
            },
        ]);

        const parameters: ExpenseCreateParams = {
            transactionList,
            gpsPoints: JSON.stringify(gpsPoints),
        };

        API.write(WRITE_COMMANDS.EXPENSE_CREATE, parameters);
    };

    return (
        <PressableWithoutFeedback
            ref={(el) => {
                fabPressable.current = el ?? null;
            }}
            style={[styles.navigationTabBarFABItem, canUseTouchScreen() && styles.userSelectNone]}
            accessibilityLabel={accessibilityLabel}
            onPress={handlePress}
            role={role}
            shouldUseHapticsOnLongPress
            testID="floating-olddot-gps-test-button"
        >
            {({hovered}) => (
                <View
                    style={[styles.floatingActionButton, {borderRadius}, styles.floatingActionButtonSmall, hovered && {backgroundColor: buttonDefaultBG}]}
                    testID="floating-olddot-gps-test-button-container"
                >
                    <Icon
                        fill={textLight}
                        src={expensifyIcons.Car}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                    />
                </View>
            )}
        </PressableWithoutFeedback>
    );
}

FloatingOldDotGPSTestButton.displayName = 'FloatingOldDotGPSTestButton';

export default FloatingOldDotGPSTestButton;
