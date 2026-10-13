import buildSortKey from '@libs/LHNOrderIndex/buildSortKey';

describe('buildSortKey', () => {
    it('should sort accented characters by Unicode code point, not locale-aware order', () => {
        // Given names with accented characters
        const cafeAccented = buildSortKey('Café');
        const cafePlain = buildSortKey('Cafe');

        // Then accented "é" sorts after plain "e" by code point
        expect(cafeAccented > cafePlain).toBe(true);
    });

    it('should be case-insensitive', () => {
        // Given names that differ only in case

        // Then they share a sort key
        expect(buildSortKey('Alpha')).toBe(buildSortKey('alpha'));
        expect(buildSortKey('ZEBRA')).toBe(buildSortKey('zebra'));
    });

    it('should zero-pad numeric segments for natural sort order', () => {
        // Given names whose numbers have a different number of digits
        const report2 = buildSortKey('Report 2');
        const report10 = buildSortKey('Report 10');

        // Then "Report 2" sorts before "Report 10"
        expect(report2 < report10).toBe(true);
    });
});
