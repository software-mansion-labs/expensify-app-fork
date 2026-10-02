import {render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import LegacyAmountLayout from '@components/NumberWithSymbolForm/LegacyAmountLayout';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';

import findAncestorWithStyle from '../utils/findAncestorWithStyle';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const PORTRAIT_PHONE = {windowWidth: 390, windowHeight: 844};
const LANDSCAPE_PHONE = {windowWidth: 844, windowHeight: 390};

// The real useIsInLandscapeMode runs on top of these dimensions, and the device info mock reports a phone (not a tablet)
const mockWindowDimensions = jest.fn(() => PORTRAIT_PHONE);

jest.mock('@hooks/useWindowDimensions', () => () => mockWindowDimensions());

jest.mock('@libs/DeviceCapabilities', () => ({
    ...jest.requireActual<typeof DeviceCapabilities>('@libs/DeviceCapabilities'),
    canUseTouchScreen: () => false,
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    })),
}));

const INPUT_TEST_ID = 'numeric-text-input';
const FOOTER_TEST_ID = 'numeric-footer-button';

/** Width of the left landscape column (`numberWithSymbolFormInputContainerLandscape`), which exists only in landscape */
const LANDSCAPE_COLUMN_WIDTH = 400;

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumberWithSymbolForm legacy amount layout without touch screen', () => {
    beforeEach(() => {
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders portrait non-touch layout without number pad and keeps footer at bottom', async () => {
        // Given an input composed in portrait mode on a non-touch device
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
                errorText="Non-touch error"
            >
                <LegacyAmountLayout
                    actions={
                        <NumericInput.Actions>
                            <NumericInput.CurrencyButton
                                currency="USD"
                                onPress={jest.fn()}
                            />
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
                    pad={<NumericInput.BigNumberPad />}
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Next
                        </Button>
                    }
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                    </NumericInput.Container>
                    <NumericInput.Error />
                </LegacyAmountLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen elements
        // Then the text input, currency button, error, and footer are displayed, while touch-only elements like FlipButton and BigNumberPad are hidden
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        // FlipButton and BigNumberPad are touch-only, so they should not render
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();
        expect(screen.getByText('Non-touch error')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders landscape non-touch layout with left column and no right column pad', async () => {
        // Given an input composed in landscape mode on a non-touch device
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);

        renderWithProviders(
            <NumericInput
                value="200"
                allowNegative
            >
                <LegacyAmountLayout
                    actions={
                        <NumericInput.Actions>
                            <NumericInput.CurrencyButton
                                currency="USD"
                                onPress={jest.fn()}
                            />
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
                    pad={<NumericInput.BigNumberPad />}
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Save
                        </Button>
                    }
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                    </NumericInput.Container>
                </LegacyAmountLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen elements
        // Then the text input, currency button, and footer are visible, while touch-only elements are not rendered
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();

        // Then the amount and the currency button sit in the centred left landscape column, and the footer is below it, outside
        const leftColumn = findAncestorWithStyle(screen.getByTestId(INPUT_TEST_ID), 'width', LANDSCAPE_COLUMN_WIDTH);
        expect(leftColumn).toHaveStyle({alignSelf: 'center'});
        expect(leftColumn).toContainElement(screen.getByText('USD'));
        expect(leftColumn).not.toContainElement(screen.getByTestId(FOOTER_TEST_ID));
        expect(findAncestorWithStyle(screen.getByTestId(FOOTER_TEST_ID), 'width', '100%')).toHaveProp('id', 'numPadFooterView');
    });
});
