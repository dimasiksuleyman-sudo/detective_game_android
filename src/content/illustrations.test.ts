import { describe, expect, it } from 'vitest';
import {
  illustrationDimensions,
  isFinishedIllustration,
} from './illustrations';
import manifest from '../../art/pilot/manifest.json';
import pilot from '../../public/cases/case-001-blue-owl/case.json';

describe('готовый арт пилота', () => {
  it('покрывает все иллюстрации дела и шесть эмоций всех шести актёров', () => {
    const required = new Set([
      pilot.cover,
      ...pilot.locations.flatMap((l) => [
        l.image,
        ...l.hotspots.flatMap((h) => ('closeup' in h ? [h.closeup] : [])),
      ]),
      ...pilot.clues.flatMap((c) => ('image' in c ? [c.image] : [])),
      ...pilot.solution.reconstruction.map((r) => r.image),
    ]);
    for (const actor of [
      pilot.victim,
      ...pilot.suspects,
      { actorId: 'a16-chief' },
    ])
      for (const emotion of [
        'neutral',
        'nervous',
        'angry',
        'sad',
        'smug',
        'broken',
      ])
        required.add(`troupe/${actor.actorId}/${emotion}.webp`);
    expect(required.size).toBe(58);
    expect(new Set(manifest.files.map((f) => f.output))).toEqual(required);
    for (const file of required) {
      if (!file) throw new Error('Пустой путь ресурса в деле');
      expect(isFinishedIllustration(file)).toBe(true);
      expect(illustrationDimensions('/' + file)).toEqual(
        illustrationDimensions(file),
      );
    }
    expect(isFinishedIllustration('images/unknown.webp')).toBe(false);
  });
});
