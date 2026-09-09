import diffReportActions, {isDiffEmpty} from '@libs/ReportActionsOrder/diffReportActions';
import type {ReportActionsInput} from '@libs/ReportActionsOrder/toSortRows';

import type {ReportAction} from '@src/types/onyx';

import {getFakeReportAction} from '../../utils/ReportTestUtils';

function buildActions(ids: string[]): ReportActionsInput {
    const actions: ReportActionsInput = {};
    for (const [index, id] of ids.entries()) {
        actions[id] = {...getFakeReportAction(index + 1), reportActionID: id};
    }
    return actions;
}

function withMembers(actions: ReportActionsInput, members: Array<[string, ReportAction | null]>): ReportActionsInput {
    const next: ReportActionsInput = {...actions};
    for (const [id, action] of members) {
        next[id] = action;
    }
    return next;
}

function requireAction(actions: ReportActionsInput, id: string) {
    const action = actions[id];
    if (!action) {
        throw new Error(`Missing fixture action ${id}`);
    }
    return action;
}

describe('diffReportActions', () => {
    it('sends every row and asks for a full replace when there is no previous value', () => {
        const next = buildActions(['1', '2', '3']);

        const diff = diffReportActions(undefined, next);

        expect(diff.full).toBe(true);
        expect(diff.deletes).toEqual([]);
        expect(diff.upserts.map((row) => row.id).sort()).toEqual(['1', '2', '3']);
        expect(diff.upserts.at(0)).toEqual({id: '1', created: requireAction(next, '1').created, actionName: requireAction(next, '1').actionName});
    });

    it('returns an empty diff for the very same object', () => {
        const actions = buildActions(['1', '2']);

        expect(isDiffEmpty(diffReportActions(actions, actions))).toBe(true);
    });

    it('ignores members whose sort keys did not move', () => {
        const previous = buildActions(['1', '2']);
        const next = withMembers(previous, [['1', {...requireAction(previous, '1'), message: [{type: 'COMMENT', html: 'edited', text: 'edited'}]}]]);

        const diff = diffReportActions(previous, next);

        expect(isDiffEmpty(diff)).toBe(true);
        expect(diff.full).toBe(false);
    });

    it('upserts a member whose created changed', () => {
        const previous = buildActions(['1', '2']);
        const next = withMembers(previous, [['2', {...requireAction(previous, '2'), created: '2024-01-01 00:00:00.000'}]]);

        const diff = diffReportActions(previous, next);

        expect(diff.upserts).toEqual([{id: '2', created: '2024-01-01 00:00:00.000', actionName: requireAction(next, '2').actionName}]);
        expect(diff.deletes).toEqual([]);
    });

    it('upserts a member whose actionName changed', () => {
        const previous = buildActions(['1']);
        const next = withMembers({}, [['1', {...requireAction(previous, '1'), actionName: 'CREATED'}]]);

        const diff = diffReportActions(previous, next);

        expect(diff.upserts.at(0)?.actionName).toBe('CREATED');
    });

    it('upserts an added member and deletes a removed one', () => {
        const previous = buildActions(['1', '2']);
        const added = buildActions(['3']);
        const next = withMembers({}, [
            ['1', requireAction(previous, '1')],
            ['3', requireAction(added, '3')],
        ]);

        const diff = diffReportActions(previous, next);

        expect(diff.upserts.map((row) => row.id)).toEqual(['3']);
        expect(diff.deletes).toEqual(['2']);
    });

    it('deletes a member that became nullish without duplicating the delete', () => {
        const previous = buildActions(['1', '2']);
        const next = withMembers({}, [
            ['1', requireAction(previous, '1')],
            ['2', null],
        ]);

        const diff = diffReportActions(previous, next);

        expect(diff.upserts).toEqual([]);
        expect(diff.deletes).toEqual(['2']);
    });
});
