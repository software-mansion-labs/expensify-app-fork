import React from 'react';
import {View} from 'react-native';
import NoDropZone from '@components/DragAndDrop/NoDropZone';
import ExplanationModal from '@components/ExplanationModal';
import InteractionManagerLayout from '@libs/Navigation/AppNavigator/Navigators/InteractionManagerLayout';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';
import Animations from '@libs/Navigation/PlatformStackNavigation/navigationOptions/animation';
import type {ExplanationModalNavigatorParamList} from '@libs/Navigation/types';
import SCREENS from '@src/SCREENS';

const Stack = createPlatformStackNavigator<ExplanationModalNavigatorParamList>();

function ExplanationModalNavigator() {
    return (
        <NoDropZone>
            <View>
                <Stack.Navigator
                    screenLayout={(props) => <InteractionManagerLayout {...props} />}
                    screenOptions={{headerShown: false, animation: Animations.SLIDE_FROM_RIGHT}}
                >
                    <Stack.Screen
                        name={SCREENS.EXPLANATION_MODAL.ROOT}
                        component={ExplanationModal}
                    />
                </Stack.Navigator>
            </View>
        </NoDropZone>
    );
}

export default ExplanationModalNavigator;
