/** Единая строгая Zod-схема формата дела v1/v2/v3. */
import { z } from 'zod';
const text = z.string().min(1);
const identifier = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
const rect = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().positive().max(1),
    h: z.number().positive().max(1),
  })
  .refine(
    (r) => r.x + r.w <= 1 && r.y + r.h <= 1,
    'Область за пределами изображения',
  );
const ids = z.array(identifier);
const option = z.object({ id: identifier, label: text });
const fact = z.object({
  id: identifier,
  text,
  time: text.optional(),
  importance: z.enum(['key', 'supporting', 'red_herring', 'flavor']),
  aboutSuspectIds: ids.optional(),
  proves: z.array(z.enum(['motive', 'method', 'opportunity'])).optional(),
});
const document = z.object({
  template: z.enum([
    'receipt',
    'ticket',
    'note',
    'ledger',
    'diary',
    'chat',
    'photo-back',
    'poster',
    'official',
  ]),
  fields: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});
const question = z.object({
  id: identifier,
  question: text,
  answer: text,
  afterBreak: z.object({ truthId: identifier, answer: text }).optional(),
  revealsFactIds: ids,
  requiresClueId: identifier.optional(),
  requiresFactId: identifier.optional(),
  stressDelta: z.number().int().min(-1).max(2).optional(),
});
const breakpoint = z.object({
  clueId: identifier,
  requiresFactIds: ids.optional(),
  ignoreStress: z.boolean().optional(),
  unlocksTruthIds: ids,
  revealsFactIds: ids,
  confession: text,
});
export const caseSchema = z
  .object({
    schemaVersion: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    id: identifier,
    version: z.number().int().positive(),
    minAppVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: text,
    tagline: text,
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    estimatedMinutes: z.number().positive(),
    players: z.object({
      min: z.number().int().min(1).max(5),
      max: z.number().int().min(1).max(5),
    }),
    cover: text,
    setting: z.object({
      city: text,
      place: text,
      dateLabel: text,
      weather: text,
    }),
    briefing: text,
    victim: z.object({
      name: text,
      age: z.number().int().positive(),
      occupation: text,
      actorId: identifier,
      bio: text,
      causeOfDeath: text,
      foundAt: text,
      timeOfDeathWindow: text,
    }),
    motives: z.array(option).min(4).max(6),
    methods: z.array(option).min(3).max(5),
    solution: z.object({
      culpritId: identifier,
      motiveId: identifier,
      methodId: identifier,
      keyEvidence: ids.min(1),
      /**
       * v4, ADR-035: цепочка доказательств. Обвинение побеждает, только если в каждом
       * звене есть хотя бы одна приложенная улика/факт. Без цепочки (v1–v3) хватает
       * одной улики из keyEvidence.
       */
      proofChain: z
        .array(
          z.object({ id: identifier, label: text, evidenceIds: ids.min(1) }),
        )
        .min(2)
        .max(4)
        .optional(),
      explanation: text,
      reconstruction: z
        .array(z.object({ image: text, caption: text }))
        .min(2)
        .max(4),
    }),
    timelineTruth: z.array(z.object({ time: text, event: text })),
    facts: z.array(fact),
    suspects: z.array(
      z.object({
        id: identifier,
        actorId: identifier,
        name: text,
        age: z.number().int().positive(),
        occupation: text,
        relationToVictim: text,
        publicProfile: text,
        personality: text,
        speechStyle: text,
        coverStory: text,
        sensitiveTopics: z.array(text),
        shareableFactIds: ids,
        hiddenTruths: z.array(
          z.object({ id: identifier, topic: text, lie: text, truth: text }),
        ),
        breakThreshold: z.number().int().min(0).max(10),
        // Три ступени — для цепочки признания виновного (ADR-035): деньги → встреча → сознание.
        breakpoints: z.array(breakpoint).min(1).max(3),
        clueReactions: z.array(
          z.object({ clueId: identifier, reaction: text }),
        ),
        offlineQA: z.array(question).min(6).max(10),
        isCulprit: z.boolean(),
      }),
    ),
    locations: z.array(
      z.object({
        id: identifier,
        name: text,
        description: text,
        image: text,
        hotspots: z
          .array(
            z.object({
              id: identifier,
              label: text,
              rect: z.object({
                x: z.number().min(0).max(1),
                y: z.number().min(0).max(1),
                w: z.number().positive().max(1),
                h: z.number().positive().max(1),
              }),
              closeup: text.optional(),
              lock: z
                .object({
                  type: z.literal('combination'),
                  digits: z.number().int().min(1).max(8),
                  code: z.string().regex(/^\d+$/),
                  deductionFactIds: ids.min(2),
                })
                .refine(
                  (l) => l.code.length === l.digits,
                  'Длина кода не совпадает с замком',
                )
                .optional(),
              container: z
                .object({
                  image: text,
                  items: z.array(z.object({ clueId: identifier, rect })).min(1),
                })
                .optional(),
              text,
              clueId: identifier.optional(),
              revealsFactIds: ids.optional(),
              requiresFactId: identifier.optional(),
              lockedText: text.optional(),
              minigame: z.enum(['dust', 'uv', 'tilt', 'blow']).optional(),
            }),
          )
          .min(3)
          .max(7),
      }),
    ),
    clues: z.array(
      z.object({
        id: identifier,
        name: text,
        kind: z.enum(['object', 'document', 'photo', 'message']),
        image: text.optional(),
        document: document.optional(),
        description: text,
        revealsFactIds: ids,
        isKey: z.boolean(),
        explanationFactIds: ids.optional(),
        inspection: z
          .object({
            image: text,
            overlays: z
              .array(
                z.object({ text, rect, handwritten: z.boolean().optional() }),
              )
              .optional(),
            details: z
              .array(
                z.object({
                  id: identifier,
                  rect,
                  text,
                  revealsFactIds: ids.min(1),
                  concealedTerms: z.array(text).min(1),
                }),
              )
              .min(1)
              .max(8),
          })
          .optional(),
      }),
    ),
    hints: z.array(
      z.object({
        afterRound: z.number().int().positive(),
        unlessAnyPlayerHas: identifier,
        text,
      }),
    ),
  })
  .refine(
    (c) =>
      c.schemaVersion >= 2 ||
      (!c.clues.some((cl) => cl.inspection) && c.players.max <= 4),
    'Осмотр деталей и пять игроков требуют schemaVersion>=2',
  )
  .refine(
    (c) =>
      c.schemaVersion >= 3 ||
      (!c.locations.some((l) =>
        l.hotspots.some((h) => h.lock || h.container),
      ) &&
        !c.clues.some(
          (cl) => cl.inspection?.overlays || cl.explanationFactIds,
        )),
    'Замки, надписи и объяснения требуют schemaVersion=3',
  )
  .refine(
    (c) => c.schemaVersion >= 4 === !!c.solution.proofChain,
    'Цепочка доказательств — ровно в schemaVersion=4',
  )
  .refine(
    (c) => c.players.min <= c.players.max,
    'Некорректный диапазон игроков',
  );
export type CaseFile = z.infer<typeof caseSchema>;
