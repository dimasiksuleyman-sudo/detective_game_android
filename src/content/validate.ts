/** Семантика ссылок и монотонная симуляция достижимости без LLM. */
import { mentionsConcealedTerm } from './inspectionKnowledge';
import type { CaseFile } from './schema';
export function validateCase(c: CaseFile) {
  const errors: string[] = [],
    graph: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) errors.push(msg);
  };
  const punctuation = (value: unknown, at: string) => {
    if (typeof value === 'string') {
      if (/; [А-ЯЁA-Z]|\?\.(?!\.)/u.test(value))
        errors.push('punctuation ' + at);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value))
        punctuation(child, at + '.' + key);
    }
  };
  punctuation(c, 'case');
  const all = [
    ...c.facts,
    ...c.clues,
    ...c.clues.flatMap((cl) => cl.inspection?.details ?? []),
    ...c.suspects,
    ...c.locations,
    ...c.motives,
    ...c.methods,
    ...c.locations.flatMap((l) => l.hotspots),
    ...c.suspects.flatMap((s) => [...s.offlineQA, ...s.hiddenTruths]),
  ].map((x) => x.id);
  check(new Set(all).size === all.length, 'duplicate ids');
  const facts = new Set(c.facts.map((x) => x.id)),
    clues = new Set(c.clues.map((x) => x.id)),
    suspects = new Set(c.suspects.map((x) => x.id));
  const refs = (ids: string[], set: Set<string>) =>
    ids.forEach((id) => check(set.has(id), 'missing reference ' + id));
  refs([c.solution.culpritId], suspects);
  refs([c.solution.motiveId], new Set(c.motives.map((x) => x.id)));
  refs([c.solution.methodId], new Set(c.methods.map((x) => x.id)));
  refs(c.solution.keyEvidence, new Set([...facts, ...clues]));
  check(
    c.suspects.filter((s) => s.isCulprit).length === 1 &&
      c.suspects.some((s) => s.id === c.solution.culpritId && s.isCulprit),
    'culprit mismatch',
  );
  for (const f of c.facts) refs(f.aboutSuspectIds ?? [], suspects);
  for (const cl of c.clues) {
    refs(cl.revealsFactIds, facts);
    check(!!cl.image || !!cl.document, 'clue has no rendering');
  }
  for (const l of c.locations)
    for (const h of l.hotspots) {
      refs(h.revealsFactIds ?? [], facts);
      refs(h.clueId ? [h.clueId] : [], clues);
      refs(h.requiresFactId ? [h.requiresFactId] : [], facts);
      check(
        h.rect.x + h.rect.w <= 1 && h.rect.y + h.rect.h <= 1,
        'hotspot outside image',
      );
    }
  const details = c.clues.flatMap((cl) => cl.inspection?.details ?? []);
  const gated = details.flatMap((d) => d.revealsFactIds);
  check(
    new Set(gated).size === gated.length,
    'inspection fact has multiple owners',
  );
  const immediate = [
    ...c.clues.flatMap((cl) => cl.revealsFactIds),
    ...c.locations.flatMap((l) =>
      l.hotspots.flatMap((h) => h.revealsFactIds ?? []),
    ),
    ...c.suspects.flatMap((s) => [
      ...s.shareableFactIds,
      ...s.offlineQA.flatMap((q) => q.revealsFactIds),
      ...s.breakpoints.flatMap((b) => b.revealsFactIds),
    ]),
  ];
  for (const id of gated)
    check(!immediate.includes(id), 'inspection fact opens early ' + id);
  for (const d of details) {
    refs(d.revealsFactIds, facts);
    check(
      d.rect.x + d.rect.w <= 1 && d.rect.y + d.rect.h <= 1,
      'inspection outside image',
    );
    for (const t of [
      ...c.clues.map((cl) => cl.description),
      ...c.locations.flatMap((l) => [
        l.description,
        ...l.hotspots.map((h) => h.text),
      ]),
      ...c.suspects.flatMap((s) => [
        s.coverStory,
        s.publicProfile,
        ...s.clueReactions.map((r) => r.reaction),
        ...s.offlineQA.map((q) => q.answer),
      ]),
    ])
      check(
        !mentionsConcealedTerm(t, d.concealedTerms),
        'inspection text leak ' + d.id,
      );
  }
  const culprit = c.suspects.find((s) => s.isCulprit)?.name.split(' ')[0] ?? '';
  for (const s of c.suspects) {
    refs(s.shareableFactIds, facts);
    for (const q of s.offlineQA) {
      refs(q.revealsFactIds, facts);
      refs(q.requiresClueId ? [q.requiresClueId] : [], clues);
      refs(q.requiresFactId ? [q.requiresFactId] : [], facts);
    }
    for (const b of s.breakpoints) {
      refs([b.clueId], clues);
      refs(b.requiresFactIds ?? [], facts);
      refs(b.revealsFactIds, facts);
      refs(b.unlocksTruthIds, new Set(s.hiddenTruths.map((t) => t.id)));
    }
    refs(
      s.clueReactions.map((r) => r.clueId),
      clues,
    );
    for (const t of [
      s.coverStory,
      s.personality,
      ...s.sensitiveTopics,
      ...s.hiddenTruths.map((t) => t.lie),
      ...c.facts
        .filter((f) => s.shareableFactIds.includes(f.id))
        .map((f) => f.text),
    ])
      check(
        !new RegExp(
          culprit +
            '.{0,25}(убил|убийца|виновен)|(убил|убийца|виновен).{0,25}' +
            culprit,
          'iu',
        ).test(t),
        'prompt leak',
      );
  }
  const reached = new Set<string>();
  let changed = true;
  const add = (from: string, ids: string[]) => {
    for (const id of ids) {
      graph.push(from + ' -> ' + id);
      if (!reached.has(id)) {
        reached.add(id);
        changed = true;
      }
    }
  };
  while (changed) {
    changed = false;
    for (const l of c.locations)
      for (const h of l.hotspots)
        if (!h.requiresFactId || reached.has(h.requiresFactId))
          add(h.id, [
            ...(h.clueId ? [h.clueId] : []),
            ...(h.revealsFactIds ?? []),
          ]);
    for (const cl of c.clues)
      if (reached.has(cl.id)) {
        add(cl.id, cl.revealsFactIds);
        for (const d of cl.inspection?.details ?? []) {
          add(cl.id, [d.id]);
          add(d.id, d.revealsFactIds);
        }
      }
    for (const s of c.suspects) {
      for (const q of s.offlineQA)
        if (
          (!q.requiresFactId || reached.has(q.requiresFactId)) &&
          (!q.requiresClueId || reached.has(q.requiresClueId))
        )
          add(q.id, q.revealsFactIds);
      for (const b of s.breakpoints)
        if (
          reached.has(b.clueId) &&
          (b.requiresFactIds ?? []).every((id) => reached.has(id))
        )
          add(b.clueId, b.revealsFactIds);
    }
  }
  for (const id of [
    ...c.facts.filter((f) => f.importance === 'key').map((f) => f.id),
    ...c.solution.keyEvidence,
  ])
    check(reached.has(id), 'unreachable ' + id);
  for (const s of c.suspects.filter((s) => !s.isCulprit))
    check(
      c.facts.some(
        (f) =>
          f.aboutSuspectIds?.includes(s.id) &&
          (f.importance === 'supporting' || f.importance === 'key') &&
          reached.has(f.id),
      ),
      'innocent lacks explanation ' + s.id,
    );
  check(
    c.suspects.filter(
      (s) =>
        !s.isCulprit &&
        c.facts.some(
          (f) =>
            f.importance === 'red_herring' && f.aboutSuspectIds?.includes(s.id),
        ),
    ).length >= 2,
    'red herrings',
  );
  refs(
    c.hints.map((h) => h.unlessAnyPlayerHas),
    new Set([...facts, ...clues]),
  );
  check(c.briefing.split(/\s+/).length <= 150, 'briefing too long');
  for (const proof of ['motive', 'method', 'opportunity'] as const)
    check(
      c.facts.some(
        (f) =>
          f.importance === 'key' &&
          f.proves?.includes(proof) &&
          reached.has(f.id),
      ),
      'missing proof ' + proof,
    );
  const sentences = (text: string) =>
    [...new Intl.Segmenter('ru', { granularity: 'sentence' }).segment(text)]
      .length;
  for (const s of c.suspects)
    for (const line of [...s.offlineQA.map((q) => q.answer)])
      check(sentences(line) <= 3, 'reply too long ' + s.id);
  for (const s of c.suspects)
    for (const b of s.breakpoints)
      check(sentences(b.confession) <= 4, 'confession too long ' + s.id);
  return { errors, graph: [...new Set(graph)], reached: [...reached] };
}
