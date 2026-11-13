import { test, expect } from '@playwright/test';
import roomSeven from '../../art/case-002-room-seven/manifest.json' with { type: 'json' };
import coldRoom from '../../art/case-003-cold-room/manifest.json' with { type: 'json' };
import manifest from '../../art/pilot/manifest.json' with { type: 'json' };

for (const art of [manifest, roomSeven, coldRoom]) {
  test(
    art.caseId +
      ': все игровые иллюстрации декодируются браузером в нужном размере',
    async ({ page }) => {
      await page.goto('/');
      const failures = await page.evaluate(async (art) => {
        return (
          await Promise.all(
            art.files.map(async (file) => {
              const image = new Image();
              image.src = file.output.startsWith('troupe/')
                ? '/' + file.output
                : `/cases/${art.caseId}/${file.output}`;
              try {
                await image.decode();
                return image.naturalWidth === file.width &&
                  image.naturalHeight === file.height
                  ? null
                  : file.output + ': wrong dimensions';
              } catch {
                return file.output + ': could not decode';
              }
            }),
          )
        ).filter(Boolean);
      }, art);
      expect(failures).toEqual([]);
    },
  );
}
