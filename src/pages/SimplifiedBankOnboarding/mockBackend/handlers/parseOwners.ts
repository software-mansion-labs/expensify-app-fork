/**
 * Parsers of the beneficial owners that the client sends as a JSON string. A malformed payload yields undefined.
 */
import type {BeneficialOwner, GlobalBeneficialOwner} from '@pages/SimplifiedBankOnboarding/types/onyx';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function hasStringFields<TField extends string>(value: unknown, fields: readonly TField[]): value is Record<TField, string> {
    return isRecord(value) && fields.every((field) => typeof value[field] === 'string' && value[field] !== '');
}

function parseOwnersWithFields<TField extends string>(json: string, fields: readonly TField[]): Array<Record<TField, string>> | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        return undefined;
    }
    if (!Array.isArray(parsed)) {
        return undefined;
    }
    const owners = parsed.filter((owner): owner is Record<TField, string> => hasStringFields(owner, fields));
    return owners.length === parsed.length ? owners : undefined;
}

function parseBeneficialOwners(json: string): BeneficialOwner[] | undefined {
    return parseOwnersWithFields(json, ['firstName', 'lastName', 'dob']);
}

function parseGlobalBeneficialOwners(json: string): GlobalBeneficialOwner[] | undefined {
    return parseOwnersWithFields(json, ['uid', 'fullName', 'ownershipPercentage']);
}

export {parseBeneficialOwners, parseGlobalBeneficialOwners};
