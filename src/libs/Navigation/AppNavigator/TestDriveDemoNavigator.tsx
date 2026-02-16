import React from 'react';
import {View} from 'react-native';
import NoDropZone from '@components/DragAndDrop/NoDropZone';
import TestDriveDemo from '@components/TestDrive/TestDriveDemo';
import InteractionManagerLayout from '@libs/Navigation/AppNavigator/Navigators/InteractionManagerLayout';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {TestDriveDemoNavigatorParamList} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';

const Stack = createPlatformStackNavigator<TestDriveDemoNavigatorParamList>();

function TestDriveDemoNavigator() {
    return (
        <NoDropZone>
            <View>
                <Stack.Navigator
                    screenLayout={(props) => <InteractionManagerLayout {...props} />}
                    screenOptions={{headerShown: false, animation: Animations.SLIDE_FROM_RIGHT}}
                >
                    <Stack.Screen
                        name={SCREENS.TEST_DRIVE_DEMO.ROOT}
                        component={TestDriveDemo}
                    />
                </Stack.Navigator>
            </View>
        </NoDropZone>
    );
}

export default TestDriveDemoNavigator;
