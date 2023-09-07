import _ from 'underscore';
import removeInvisible from '../../src/libs/removeInvisible';
import enEmojis from '../../assets/emojis/en';

describe('libs/removeInvisible', () => {
    it('basic tests', () => {
        expect(removeInvisible('test')).toBe('test');
        expect(removeInvisible('test test')).toBe('test test');
        expect(removeInvisible('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrstuvwxyz');
        expect(removeInvisible('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        expect(removeInvisible('0123456789')).toBe('0123456789');
        expect(removeInvisible('!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~')).toBe('!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~');
        expect(removeInvisible('')).toBe('');
        expect(removeInvisible(' ')).toBe('');
    });
    it('trim spaces', () => {
        expect(removeInvisible(' test')).toBe('test');
        expect(removeInvisible('test ')).toBe('test');
        expect(removeInvisible(' test ')).toBe('test');
    });
    it('remove invisible characters', () => {
        expect(removeInvisible('test\u200B')).toBe('test');
        expect(removeInvisible('test\u200Btest')).toBe('testtest');
        expect(removeInvisible('test\u200B test')).toBe('test test');
        expect(removeInvisible('test\u200B test\u200B')).toBe('test test');
        expect(removeInvisible('test\u200B test\u200B test')).toBe('test test test');
    });
    it('remove invisible characters (Cc)', () => {
        expect(removeInvisible('test\u0000')).toBe('test');
        expect(removeInvisible('test\u0001')).toBe('test');
        expect(removeInvisible('test\u0009')).toBe('test');
    });
    it('remove invisible characters (Cf)', () => {
        expect(removeInvisible('test\u200E')).toBe('test');
        expect(removeInvisible('test\u200F')).toBe('test');
        expect(removeInvisible('test\u2060')).toBe('test');
    });
    it('check other visible characters (Cs)', () => {
        expect(removeInvisible('test\uD800')).toBe('test\uD800');
        expect(removeInvisible('test\uD801')).toBe('test\uD801');
        expect(removeInvisible('test\uD802')).toBe('test\uD802');
    });
    it('check other visible characters (Co)', () => {
        expect(removeInvisible('test\uE000')).toBe('test\uE000');
        expect(removeInvisible('test\uE001')).toBe('test\uE001');
        expect(removeInvisible('test\uE002')).toBe('test\uE002');
    });
    it('remove invisible characters (Zl)', () => {
        expect(removeInvisible('test\u2028')).toBe('test');
        expect(removeInvisible('test\u2029')).toBe('test');
    });
    it('basic check emojis not removed', () => {
        expect(removeInvisible('test😀')).toBe('test😀');
        expect(removeInvisible('test😀😀')).toBe('test😀😀');
        expect(removeInvisible('test😀😀😀')).toBe('test😀😀😀');
    });
    it('all emojis not removed', () => {
        _.keys(enEmojis).forEach((key) => {
            expect(removeInvisible(key)).toBe(key);
        });
    });
    it('remove invisible characters (editpad)', () => {
        expect(removeInvisible('test\u0020')).toBe('test');
        expect(removeInvisible('test\u00A0')).toBe('test');
        expect(removeInvisible('test\u2000')).toBe('test');
        expect(removeInvisible('test\u2001')).toBe('test');
        expect(removeInvisible('test\u2002')).toBe('test');
        expect(removeInvisible('test\u2003')).toBe('test');
        expect(removeInvisible('test\u2004')).toBe('test');
        expect(removeInvisible('test\u2005')).toBe('test');
        expect(removeInvisible('test\u2006')).toBe('test');
        expect(removeInvisible('test\u2007')).toBe('test');
        expect(removeInvisible('test\u2008')).toBe('test');
        expect(removeInvisible('test\u2009')).toBe('test');
        expect(removeInvisible('test\u200A')).toBe('test');
        expect(removeInvisible('test\u2028')).toBe('test');
        expect(removeInvisible('test\u205F')).toBe('test');
        expect(removeInvisible('test\u3000')).toBe('test');
        expect(removeInvisible('test ')).toBe('test');
    });
    it('other tests', () => {
        expect(removeInvisible('\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F')).toBe('😶‍🌫️');
        expect(removeInvisible('\u200D')).toBe('‍');
        expect(removeInvisible('⁠')).toBe('');
        expect(removeInvisible('⁠test')).toBe('test');
        expect(removeInvisible('test⁠test')).toBe('testtest');
        expect(removeInvisible('  	 ‎ ‏ ⁠        　 ')).toBe('');
        expect(removeInvisible('te	‎‏⁠st')).toBe('test');
        expect(removeInvisible('\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
    });
});
