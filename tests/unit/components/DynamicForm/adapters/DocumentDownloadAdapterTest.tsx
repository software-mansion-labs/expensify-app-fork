import {fireEvent, render, screen} from '@testing-library/react-native';

import DocumentDownloadAdapter from '@components/DynamicForm/adapters/DocumentDownloadAdapter';
import isSupportedField from '@components/DynamicForm/utils/isSupportedField';

import {openExternalLink} from '@userActions/Link';

import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';

jest.mock('@userActions/Link', () => ({openExternalLink: jest.fn()}));
jest.mock('@hooks/useEnvironment', () => jest.fn(() => ({environmentURL: 'https://new.expensify.com'})));
jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@components/DynamicForm/utils/logSchemaProblem', () => jest.fn());

describe('DocumentDownloadAdapter', () => {
    it('opens the document from the App and answers the field', () => {
        // Given a field that asks the user to download the terms
        const onInputChange = jest.fn();
        render(
            <DocumentDownloadAdapter
                onInputChange={onInputChange}
                documentPath="/pdfs/terms.pdf"
                accessibilityLabel="Terms"
            />,
        );

        // When the user taps the download button
        fireEvent.press(screen.getByLabelText('Terms'));

        // Then the document opens from the App's own address and the answer turns on
        expect(openExternalLink).toHaveBeenCalledWith('https://new.expensify.com/pdfs/terms.pdf');
        expect(onInputChange).toHaveBeenCalledWith(true);
    });

    it('leaves out a download whose path does not point into the App', () => {
        // Given a schema download with a path that would change the host of the App's address
        const field: DynamicFormField = {key: 'terms', type: 'boolean', required: true, presentation: 'download', documentPath: '@evil.example/terms.pdf'};

        // When the form checks whether it can show the field
        const isSupported = isSupportedField(field);

        // Then the field is left out, so it neither opens nor blocks submission
        expect(isSupported).toBe(false);
    });
});
