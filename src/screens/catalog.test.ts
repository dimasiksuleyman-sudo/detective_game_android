import { describe, expect, it } from 'vitest';
import { screens } from './catalog';
import { ru } from '../i18n/ru';

describe('M0: каталог навигации', () => {
  it('содержит все экраны S01–S16 по одному разу', () => {
    expect(screens.map(({ id }) => id)).toEqual(
      Array.from(
        { length: 16 },
        (_, i) => `S${String(i + 1).padStart(2, '0')}`,
      ),
    );
    expect(new Set(screens.map(({ path }) => path)).size).toBe(16);
  });
  it('для каждого экрана есть русское название и описание', () => {
    for (const { id } of screens) {
      expect(ru.screens[id].title).toMatch(/[А-Яа-яЁё]/);
      expect(ru.screens[id].description).toMatch(/[А-Яа-яЁё]/);
    }
  });
});
