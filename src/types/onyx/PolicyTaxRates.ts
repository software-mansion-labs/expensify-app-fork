type PolicyTaxRateWithDefault = {
    name: string;
    defaultExternalID: string;
    defaultValue: string;
    foreignTaxDefault: string;
    taxes: PolicyTaxRates;
};

type PolicyTaxRate = {
    /** The name of the tax rate. */
    name: string;

    /** The value of the tax rate. */
    value: string;

    /** The code associated with the tax rate. */
    code: string;

    /** This contains the tax name and tax value as one name */
    modifiedName: string;

    /** Indicates if the tax rate is disabled. */
    isDisabled?: boolean;
};

type PolicyTaxRates = Record<string, PolicyTaxRate>;

type PolicyTaxRatesWithDefault = Record<string, PolicyTaxRateWithDefault>;

export type {PolicyTaxRates, PolicyTaxRate, PolicyTaxRateWithDefault, PolicyTaxRatesWithDefault};
