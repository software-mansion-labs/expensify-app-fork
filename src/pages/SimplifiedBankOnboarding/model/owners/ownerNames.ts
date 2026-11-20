type NamedOwner = {firstName: string; lastName: string};

type SplitName = {firstName: string; lastName: string};

/**
 * The global provider stores one full name, so the client splits it back into its two inputs: the first word is the first
 * name and the last word is the last name. Middle names are lost, the same way as in the real flow.
 */
function splitFullName(fullName: string): SplitName {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return {firstName: '', lastName: ''};
    }
    if (words.length === 1) {
        return {firstName: words.at(0) ?? '', lastName: ''};
    }
    return {firstName: words.at(0) ?? '', lastName: words.at(-1) ?? ''};
}

function getOwnerFullName(owner: NamedOwner): string {
    return `${owner.firstName} ${owner.lastName}`.trim();
}

export {getOwnerFullName, splitFullName};
