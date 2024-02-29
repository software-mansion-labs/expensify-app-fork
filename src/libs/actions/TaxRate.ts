import type {OnyxCollection} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {CreateWorkspaceTaxParams, SetWorkspaceForeignCurrencyDefaultParams, SetWorkspaceTaxesCurrencyDefaultParams, SetWorkspaceTaxesDisabledParams} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import CONST from '@src/CONST';
import * as ErrorUtils from '@src/libs/ErrorUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';
import type {PendingAction} from '@src/types/onyx/OnyxCommon';
import type {OnyxData} from '@src/types/onyx/Request';

let allPolicies: OnyxCollection<Policy>;
Onyx.connect({
    key: ONYXKEYS.COLLECTION.POLICY,
    waitForCollectionCallback: true,
    callback: (value) => (allPolicies = value),
});

function createWorkspaceTax({policyID, taxRate}: CreateWorkspaceTaxParams) {
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: {
                            [taxRate.code]: {
                                ...taxRate,
                                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD,
                                errors: null,
                            },
                        },
                    },
                },
            },
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: {
                            [taxRate.code]: {
                                pendingAction: null,
                                errors: null,
                            },
                        },
                    },
                },
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: {
                            [taxRate.code]: {
                                errors: ErrorUtils.getMicroSecondOnyxError('workspace.taxes.genericFailureMessage'),
                            },
                        },
                    },
                },
            },
        ],
    };

    const parameters = {
        policyID,
        taxRate,
    };

    API.write(WRITE_COMMANDS.CREATE_WORKSPACE_TAX, parameters, onyxData);
}

function setWorkspaceCurrencyDefault({policyID, defaultExternalID}: SetWorkspaceTaxesCurrencyDefaultParams) {
    const originalDefaultExternalID = allPolicies?.policyID?.taxRates?.defaultExternalID;
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        defaultExternalID,
                    },
                },
            },
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        defaultExternalID,
                    },
                },
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        defaultExternalID: originalDefaultExternalID,
                    },
                },
            },
        ],
    };

    const parameters = {
        policyID,
        defaultExternalID,
    };

    API.write(WRITE_COMMANDS.SET_WORKSPACE_TAXES_CURRENCY_DEFAULT, parameters, onyxData);
}

function setForeignCurrencyDefault({policyID, foreignTaxDefault}: SetWorkspaceForeignCurrencyDefaultParams) {
    const originalDefaultForeignCurrencyID = allPolicies?.policyID?.taxRates?.foreignTaxDefault;
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        foreignTaxDefault,
                    },
                },
            },
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        foreignTaxDefault,
                    },
                },
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        foreignTaxDefault: originalDefaultForeignCurrencyID,
                    },
                },
            },
        ],
    };

    const parameters = {
        policyID,
        foreignTaxDefault,
    };

    API.write(WRITE_COMMANDS.SET_WORKSPACE_TAXES_FOREIGN_CURRENCY_DEFAULT, parameters, onyxData);
}

function setWorkspaceTaxesDisabled({policyID, taxesToUpdate}: SetWorkspaceTaxesDisabledParams) {
    const originalTaxes = {...allPolicies?.policyID?.taxRates?.taxes};
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: Object.keys(taxesToUpdate).reduce((acc, taxID) => {
                            acc[taxID] = {isDisabled: taxesToUpdate[taxID].isDisabled, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE};
                            return acc;
                        }, {} as Record<string, {isDisabled: boolean; pendingAction: PendingAction}>),
                    },
                },
            },
        ],
        successData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: Object.keys(taxesToUpdate).reduce((acc, taxID) => {
                            acc[taxID] = {isDisabled: taxesToUpdate[taxID].isDisabled, pendingAction: null};
                            return acc;
                        }, {} as Record<string, {isDisabled: boolean; pendingAction: PendingAction}>),
                    },
                },
            },
        ],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: Object.keys(originalTaxes).reduce((acc, taxID) => {
                            if (taxesToUpdate[taxID]) {
                                acc[taxID] = {isDisabled: !!originalTaxes[taxID].isDisabled, pendingAction: null};
                            }
                            return acc;
                        }, {} as Record<string, {isDisabled: boolean; pendingAction: PendingAction}>),
                    },
                },
            },
        ],
    };

    const parameters = {
        policyID,
        taxesToUpdate,
    };

    API.write(WRITE_COMMANDS.SET_WORKSPACE_TAXES_DISABLED, parameters, onyxData);
}

export {setWorkspaceCurrencyDefault, setWorkspaceTaxesDisabled, setForeignCurrencyDefault, createWorkspaceTax};
