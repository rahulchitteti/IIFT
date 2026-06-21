import { describe, it, expect } from 'vitest';
import { migrate, importJSON, exportJSON } from './storage';
import { buildSeed, CURRENT_VERSION } from './seed';

describe('migration', () => {
  it('returns seed for empty/garbage input', () => {
    expect(migrate(null).terms.length).toBeGreaterThan(0);
    expect(migrate('nonsense' as unknown).version).toBe(CURRENT_VERSION);
  });

  it('preserves logged classes and fills new fields with defaults', () => {
    const legacy = {
      terms: [
        {
          name: 'Old Term',
          subjects: [
            {
              name: 'Math',
              classes: [
                { status: 'P', faculty: 'X' },
                { status: 'A' },
              ],
              // missing credits, totalPlanned, color, threshold, etc.
            },
          ],
        },
      ],
    };
    const out = migrate(legacy);
    expect(out.version).toBe(CURRENT_VERSION);
    const subj = out.terms[0].subjects[0];
    expect(subj.classes).toHaveLength(2); // classes preserved
    expect(subj.classes[0].status).toBe('P');
    expect(subj.classes[0].note).toBe(''); // default filled
    expect(subj.credits).toBe(0); // default filled
    expect(subj.threshold).toBeNull();
    expect(Array.isArray(subj.schedule)).toBe(true);
    expect(typeof subj.color).toBe('string');
  });

  it('round-trips export/import without losing data', () => {
    const seed = buildSeed();
    const json = exportJSON(seed);
    const back = importJSON(json);
    expect(back.terms.length).toBe(seed.terms.length);
    const ifm = back.terms[0].subjects.find((s) => s.name === 'IFM');
    expect(ifm?.classes.length).toBe(13);
  });

  it('keeps a valid activeTermId pointing at a non-archived term', () => {
    const out = migrate({
      activeTermId: 'does-not-exist',
      terms: [{ name: 'A', archived: false, subjects: [] }],
    });
    expect(out.terms.some((t) => t.id === out.activeTermId)).toBe(true);
  });
});
