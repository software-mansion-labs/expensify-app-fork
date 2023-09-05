import _ from 'underscore';
import removeInvisible from '../../src/libs/removeInvisible';
import enEmojis from '../../assets/emojis/en';

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
    it('remove invisible characters (Cs)', () => {
        expect(removeInvisible('test\uD800')).toBe('test');
        expect(removeInvisible('test\uD801')).toBe('test');
        expect(removeInvisible('test\uD802')).toBe('test');
    });
    it('remove invisible characters (Co)', () => {
        expect(removeInvisible('test\uE000')).toBe('test');
        expect(removeInvisible('test\uE001')).toBe('test');
        expect(removeInvisible('test\uE002')).toBe('test');
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
            // expect(removeInvisible(key)).toBe(key);
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
});
