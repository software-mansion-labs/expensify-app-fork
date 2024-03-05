import type {OnyxCollection} from 'react-native-onyx';
import Onyx from 'react-native-onyx';
import * as API from '@libs/API';
import type {
    CreateWorkspaceTaxParams,
    DeleteWorkspaceTaxesParams,
    SetWorkspaceForeignCurrencyDefaultParams,
    SetWorkspaceTaxesCurrencyDefaultParams,
    SetWorkspaceTaxesDisabledParams,
} from '@libs/API/parameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import CONST from '@src/CONST';
import * as ErrorUtils from '@src/libs/ErrorUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, TaxRates} from '@src/types/onyx';
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
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const originalDefaultExternalID = policy?.taxRates?.defaultExternalID;
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
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const originalDefaultForeignCurrencyID = policy?.taxRates?.foreignTaxDefault;
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
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const originalTaxes = {...policy?.taxRates?.taxes};
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

function renamePolicyTax(policyID: string, taxID: string, newName: string) {
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const originalTaxRate = {...policy?.taxRates?.taxes[taxID]};
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: {
                            [taxID]: {
                                name: newName,
                                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                                errors: ErrorUtils.getMicroSecondOnyxError('workspace.taxes.genericFailureMessage'),
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
                            [taxID]: {name: newName, pendingAction: null, errors: null},
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
                            [taxID]: {name: originalTaxRate.name, pendingAction: null, errors: ErrorUtils.getMicroSecondOnyxError('workspace.taxes.genericFailureMessage')},
                        },
                    },
                },
            },
        ],
    };

    if (!originalTaxRate.name) {
        throw new Error('Tax rate name not found');
    }

    const parameters = {
        policyID,
        oldName: originalTaxRate.name,
        newName,
    };

    API.write(WRITE_COMMANDS.RENAME_POLICY_TAX, parameters, onyxData);
}

function updatePolicyTaxValue(policyID: string, taxID: string, taxValue: string) {
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const originalTaxRate = {...policy?.taxRates?.taxes[taxID]};
    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: {
                            [taxID]: {
                                value: taxValue,
                                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.UPDATE,
                                errors: ErrorUtils.getMicroSecondOnyxError('workspace.taxes.genericFailureMessage'),
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
                            [taxID]: {value: taxValue, pendingAction: null, errors: null},
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
                            [taxID]: {value: originalTaxRate.value, pendingAction: null, errors: ErrorUtils.getMicroSecondOnyxError('workspace.taxes.genericFailureMessage')},
                        },
                    },
                },
            },
        ],
    };

    if (!originalTaxRate.name) {
        throw new Error('Tax rate name not found');
    }

    const parameters = {
        policyID,
        taxFields: {
            name: originalTaxRate.name,
            value: taxValue,
        },
    };

    API.write(WRITE_COMMANDS.UPDATE_POLICY_TAX_VALUE, parameters, onyxData);
}

function clearTaxRateError(policyID: string, taxID: string) {
    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
        taxRates: {
            taxes: {
                [taxID]: {
                    pendingAction: null,
                    errors: null,
                },
            },
        },
    });
}

function deleteWorkspaceTaxes({policyID, taxesToDelete}: DeleteWorkspaceTaxesParams) {
    const policy = allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];
    const policyTaxRates = policy?.taxRates?.taxes;

    if (!policyTaxRates) {
        throw new Error('Policy or tax rates not found');
    }

    const onyxData: OnyxData = {
        optimisticData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: `${ONYXKEYS.COLLECTION.POLICY}${policyID}`,
                value: {
                    taxRates: {
                        taxes: taxesToDelete.reduce((acc, taxID) => {
                            acc[taxID] = {pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE, error: null};
                            return acc;
                        }, {} as Record<string, {pendingAction: PendingAction; error: null}>),
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
                        taxes: taxesToDelete.reduce((acc, taxID) => {
                            acc[taxID] = null;
                            return acc;
                        }, {} as Record<string, null>),
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
                        taxes: {...policyTaxRates},
                    },
                },
            },
        ],
    };

    const parameters = {
        policyID,
        taxesToDelete,
    };

    API.write(WRITE_COMMANDS.DELETE_WORKSPACE_TAXES, parameters, onyxData);
}

export {
    setWorkspaceCurrencyDefault,
    setWorkspaceTaxesDisabled,
    setForeignCurrencyDefault,
    createWorkspaceTax,
    renamePolicyTax,
    clearTaxRateError,
    updatePolicyTaxValue,
    deleteWorkspaceTaxes,
};
