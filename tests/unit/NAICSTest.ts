import CONST from '@src/CONST';
import {ALL_NAICS} from '@src/NAICS';

describe('NAICS', () => {
    it('includes six-digit leaf codes in ALL_NAICS so they can be searched and shown as selected', () => {
        // Given the flat NAICS list the industry code options come from
        const ids = ALL_NAICS.map((item) => `${item.id}`);

        // When we look for the codes the industry code form accepts
        const validIndustryCodes = ids.filter((id) => CONST.REGEX.INDUSTRY_CODE.test(id));

        // Then the six-digit leaf codes are present, because only those pass validation and a saved code must be findable
        expect(validIndustryCodes.length).toBeGreaterThan(0);
        expect(ids).toContain('111130');
    });

    it('lists every NAICS code only once', () => {
        // Given the flat NAICS list built by walking the whole tree
        const ids = ALL_NAICS.map((item) => item.id);

        // When we remove duplicates
        const uniqueIds = new Set(ids);

        // Then nothing was removed, so no option shows up twice
        expect(uniqueIds.size).toBe(ids.length);
    });
});
