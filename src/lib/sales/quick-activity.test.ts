import { describe, expect, it } from 'vitest';
import {
  buildContactActivityUpdate,
  followUpPreset,
  formatFollowUpAction,
  nextBusinessDay,
  phoneContains,
  phoneSearchStrength,
  requiresExplicitDealChoice,
  suggestedRetryAt,
} from './quick-activity';
describe('quick activity helpers', () => {
  it('starts suggestions at three digits and strengthens at six', () => {
    expect(phoneSearchStrength('12')).toBe('none');
    expect(phoneSearchStrength('123')).toBe('suggest');
    expect(phoneSearchStrength('+48 123-456')).toBe('strong');
  });
  it('matches formatted phone numbers by digits', () => {
    expect(phoneContains('+48 508 202 166', '202166')).toBe(true);
    expect(phoneContains('+48 508 202 166', '999')).toBe(false);
  });
  it('moves Friday to the next business day', () => {
    expect(nextBusinessDay(new Date('2026-08-28T12:00:00')).getDay()).toBe(1);
  });
  it('stops automatic retries after the third missed attempt', () => {
    expect(suggestedRetryAt(3, new Date('2026-08-31T12:00:00'))).toBeNull();
  });
  it('maps every mobile follow-up to the existing activity model', () => {
    expect(followUpPreset('TELEFON')).toEqual({
      type: 'FOLLOW_UP',
      label: 'Oddzwonić',
      channel: 'telefon',
    });
    expect(followUpPreset('SPOTKANIE').type).toBe('SPOTKANIE');
    expect(followUpPreset('INNY').channel).toBe('follow_up');
  });
  it('never guesses a Deal when a Contact has active sales cases', () => {
    expect(requiresExplicitDealChoice(0)).toBe(false);
    expect(requiresExplicitDealChoice(1)).toBe(true);
    expect(requiresExplicitDealChoice(3)).toBe(true);
  });
  it('keeps the chosen follow-up kind in the single next-action field', () => {
    expect(formatFollowUpAction('TELEFON', 'zadzwonić w poniedziałek')).toBe(
      'TELEFON: zadzwonić w poniedziałek'
    );
    expect(formatFollowUpAction('SPOTKANIE', '')).toBe('SPOTKANIE');
  });
  it('does not erase an earlier follow-up when a later note has no date', () => {
    expect(
      buildContactActivityUpdate({
        contactResult: 'WYKONANE',
        nextAction: 'Sprawdzić dokumenty',
        nextActionAt: null,
      })
    ).toEqual({
      contact_result: 'WYKONANE',
      next_step: 'Sprawdzić dokumenty',
    });
  });
});

