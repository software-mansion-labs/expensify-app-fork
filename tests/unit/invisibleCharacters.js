import _ from 'underscore';
import * as removeInvisibleModule from '../../src/libs/removeInvisible';
import removeInvisible from '../../src/libs/removeInvisible';
import enEmojis from '../../assets/emojis/en';

const {isEmpty} = removeInvisibleModule;

describe('libs/removeInvisible', () => {
    it('basic tests', () => {
        expect(removeInvisible('test')).toBe('test');
        expect(removeInvisible('test test')).toBe('test test');
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
        expect(removeInvisible('test\u202A')).toBe('test');
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
        expect(removeInvisible('⁠')).toBe('');
        expect(removeInvisible('⁠test')).toBe('test');
        expect(removeInvisible('test⁠test')).toBe('testtest');
        expect(removeInvisible('  	 ‎ ‏ ⁠        　 ')).toBe('');
        expect(removeInvisible('te	‎‏⁠st')).toBe('test');
        expect(removeInvisible('\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
    });
});

describe('libs/isEmpty', () => {
    it('basic tests', () => {
        expect(isEmpty('test')).toBe(false);
        expect(isEmpty('test test')).toBe(false);
        expect(isEmpty('test test test')).toBe(false);
        expect(isEmpty(' ')).toBe(true);
    });
    it('trim spaces', () => {
        expect(isEmpty(' test')).toBe(false);
        expect(isEmpty('test ')).toBe(false);
        expect(isEmpty(' test ')).toBe(false);
    });
    it('remove invisible characters', () => {
        expect(isEmpty('\u200B')).toBe(true);
        expect(isEmpty('\u200B')).toBe(true);
        expect(isEmpty('\u200B ')).toBe(true);
        expect(isEmpty('\u200B \u200B')).toBe(true);
        expect(isEmpty('\u200B \u200B ')).toBe(true);
    });
    it('remove invisible characters (Cc)', () => {
        expect(isEmpty('\u0000')).toBe(true);
        expect(isEmpty('\u0001')).toBe(true);
        expect(isEmpty('\u0009')).toBe(true);
    });
    it('remove invisible characters (Cf)', () => {
        expect(isEmpty('\u200E')).toBe(true);
        expect(isEmpty('\u200F')).toBe(true);
        expect(isEmpty('\u2060')).toBe(true);
    });
    it('remove invisible characters (Cs)', () => {
        expect(isEmpty('\uD800')).toBe(true);
        expect(isEmpty('\uD801')).toBe(true);
        expect(isEmpty('\uD802')).toBe(true);
    });
    it('remove invisible characters (Co)', () => {
        expect(isEmpty('\uE000')).toBe(true);
        expect(isEmpty('\uE001')).toBe(true);
        expect(isEmpty('\uE002')).toBe(true);
    });
    it('remove invisible characters (Zl)', () => {
        expect(isEmpty('\u2028')).toBe(true);
        expect(isEmpty('\u2029')).toBe(true);
        expect(isEmpty('\u202A')).toBe(true);
    });
    it('basic check emojis not removed', () => {
        expect(isEmpty('😀')).toBe(false);
    });
    it('all emojis not removed', () => {
        _.keys(enEmojis).forEach((key) => {
            expect(isEmpty(key)).toBe(false);
        });
    });
    it('remove invisible characters (editpad)', () => {
        expect(isEmpty('\u0020')).toBe(true);
        expect(isEmpty('\u00A0')).toBe(true);
        expect(isEmpty('\u2000')).toBe(true);
        expect(isEmpty('\u2001')).toBe(true);
        expect(isEmpty('\u2002')).toBe(true);
        expect(isEmpty('\u2003')).toBe(true);
        expect(isEmpty('\u2004')).toBe(true);
        expect(isEmpty('\u2005')).toBe(true);
        expect(isEmpty('\u2006')).toBe(true);
        expect(isEmpty('\u2007')).toBe(true);
        expect(isEmpty('\u2008')).toBe(true);
        expect(isEmpty('\u2009')).toBe(true);
        expect(isEmpty('\u200A')).toBe(true);
        expect(isEmpty('\u2028')).toBe(true);
        expect(isEmpty('\u205F')).toBe(true);
        expect(isEmpty('\u3000')).toBe(true);
        expect(isEmpty(' ')).toBe(true);
    });
});
