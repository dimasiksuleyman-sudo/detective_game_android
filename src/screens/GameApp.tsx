import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pilot as c } from '../content/loader';
import { useGame } from '../store/gameStore';
import { ru } from '../i18n/ru';
import { HoldButton } from '../components/HoldButton';
import { watchLifecycle } from '../platform/appLifecycle';
import type { Tone } from '../game/engine';
const t = ru.game;
function Art({ src, label }: { src: string; label: string }) {
  return (
    <figure>
      <img
        src={src.startsWith('/troupe') ? src : `/cases/${c.id}/${src}`}
        alt=""
      />
      <figcaption>
        {t.placeholder}: {label}
      </figcaption>
    </figure>
  );
}
export default function GameApp() {
  const { game: g, ready, busy, error, init, dispatch, reset } = useGame(),
    nav = useNavigate(),
    path = useLocation().pathname;
  const [privacy, setPrivacy] = useState(false);
  const [count, setCount] = useState(1),
    [names, setNames] = useState(
      [1, 2, 3, 4].map((n) => t.defaultName + ' ' + n),
    ),
    [rounds, setRounds] = useState(8),
    [location, setLocation] = useState(''),
    [suspect, setSuspect] = useState(''),
    [clue, setClue] = useState(''),
    [closeup, setCloseup] = useState(''),
    [tab, setTab] = useState('clues'),
    [note, setNote] = useState(''),
    [tone, setTone] = useState<Tone>('neutral'),
    [step, setStep] = useState(0),
    [acc, setAcc] = useState({
      suspectId: '',
      motiveId: '',
      methodId: '',
      evidence: [] as string[],
    });
  const p = g?.players[g.current];
  useEffect(() => {
    void init();
  }, [init]);
  useEffect(
    () =>
      watchLifecycle(() => {
        if (['turn', 'final'].includes(useGame.getState().game?.phase ?? '')) {
          setPrivacy(true);
          void dispatch({ type: 'LOCK' });
        }
      }),
    [dispatch],
  );
  const screen = path.split('/')[1] || 's02';
  const personal = ['s07', 's08', 's09', 's10', 's11', 's12', 's13'].includes(
    screen,
  );
  // Даже прямой hash и кнопка браузера «Назад» не обходят экран передачи.
  const effective = !ready
    ? 's01'
    : (g?.phase === 'handover' || privacy) && personal
      ? 's06'
      : personal && (!g || g.phase === 'briefing')
        ? 's02'
        : g?.phase === 'finished' && personal
          ? 's14'
          : g?.phase === 'final' && personal
            ? 's13'
            : screen;
  const go = (s: string) => nav('/' + s);
  const button = (label: string, fn: () => void, disabled = false) => (
    <button type="button" disabled={disabled || busy} onClick={fn}>
      {label}
    </button>
  );
  const act = (a: Parameters<typeof dispatch>[0]) => {
    void dispatch(a);
  };
  const back = () => go('s07');
  if (!ready) return <p role="status">{ru.loading}</p>;
  return (
    <div className="game">
      <header>
        <h1>{ru.appName}</h1>
        {p && g && effective !== 's06' && personal && (
          <p style={{ color: p.color }}>
            {p.name} · {t.round} {g.round}/{g.roundLimit}
          </p>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <main>
          {effective === 's01' && <>{button(t.menu, () => go('s02'))}</>}
          {effective === 's02' && (
            <>
              <h2>{ru.screens.S02.title}</h2>
              {button(t.newGame, () => {
                if (!g || confirm(t.overwrite)) go('s03');
              })}
              {button(
                t.continue,
                () => {
                  if (g) {
                    act({ type: 'LOCK' });
                    go(
                      g.phase === 'briefing'
                        ? 's05'
                        : g.phase === 'finished'
                          ? 's14'
                          : 's07',
                    );
                  }
                },
                !g,
              )}
              {button(t.settings, () => go('s15'))}
              {button(t.help, () => go('s16'))}
            </>
          )}
          {effective === 's03' && (
            <>
              <h2>{t.choose}</h2>
              <Art src={c.cover} label={c.title} />
              <p>{c.tagline}</p>
              <p>
                {c.estimatedMinutes} · {t.classic}
              </p>
              {button(c.title, () => go('s04'))}
            </>
          )}
          {effective === 's04' && (
            <>
              <h2>{ru.screens.S04.title}</h2>
              <label>
                {t.players}
                <select
                  value={count}
                  onChange={(e) => setCount(+e.target.value)}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {names.slice(0, count).map((n, i) => (
                <label key={i}>
                  {t.name} {i + 1}
                  <input
                    maxLength={30}
                    value={n}
                    onChange={(e) =>
                      setNames(
                        names.map((v, j) => (i === j ? e.target.value : v)),
                      )
                    }
                  />
                </label>
              ))}
              <label>
                {t.rounds}
                <select
                  value={rounds}
                  onChange={(e) => setRounds(+e.target.value)}
                >
                  {[6, 8, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <p>{t.classic}</p>
              {button(
                t.brief,
                () => {
                  void dispatch({
                    type: 'START_GAME',
                    names: names.slice(0, count),
                    roundLimit: rounds,
                  }).then(() => go('s05'));
                },
                names.slice(0, count).some((n) => !n.trim()),
              )}
            </>
          )}
          {effective === 's05' && g && (
            <>
              <h2>{ru.screens.S05.title}</h2>
              <p>{c.briefing}</p>
              <Art
                src={'/troupe/' + c.victim.actorId + '/neutral.webp'}
                label={c.victim.name}
              />
              {c.suspects.map((s) => (
                <article key={s.id}>
                  <h3>
                    {s.name}, {s.age}
                  </h3>
                  <p>{s.publicProfile}</p>
                </article>
              ))}
              {button(t.start, () => {
                act({ type: 'BEGIN_TURN' });
                go('s07');
              })}
            </>
          )}
          {effective === 's06' && p && (
            <section className="handover" style={{ borderColor: p.color }}>
              <h2>
                {t.handover}: {p.name}
              </h2>
              <p>{t.hold}</p>
              <HoldButton
                onConfirm={() => {
                  setPrivacy(false);
                  act({ type: 'BEGIN_TURN' });
                  go('s07');
                }}
              >
                {p.name}
              </HoldButton>
            </section>
          )}
          {effective === 's07' && g && p && (
            <>
              <h2>{t.hub}</h2>
              {g.hint && (
                <aside>
                  {t.hint}: {g.hint}
                </aside>
              )}
              <p>
                {t.usage}: {g.action?.used ?? 0}
              </p>
              {button(
                t.search,
                () => {
                  setLocation('');
                  go('s08');
                },
                g.action?.kind === 'talk',
              )}
              {button(
                t.talk,
                () => {
                  setSuspect('');
                  go('s10');
                },
                g.action?.kind === 'search',
              )}
              {button(t.notebook, () => {
                setNote(p.notes);
                go('s11');
              })}
              {button(t.board, () => go('s12'))}
              {button(t.accuse, () => {
                setStep(0);
                setAcc({
                  suspectId: '',
                  motiveId: '',
                  methodId: '',
                  evidence: [],
                });
                go('s13');
              })}
              {button(t.end, () => act({ type: 'END_TURN' }))}
            </>
          )}
          {effective === 's08' && g && p && (
            <>
              <h2>{t.search}</h2>
              {!location
                ? c.locations.map((l) =>
                    button(
                      l.name,
                      () => setLocation(l.id),
                      !!g.action && g.action.target !== l.id,
                    ),
                  )
                : c.locations
                    .filter((l) => l.id === location)
                    .map((l) => (
                      <section key={l.id}>
                        <h3>{l.name}</h3>
                        <p>{l.description}</p>
                        <div className="location">
                          <img src={`/cases/${c.id}/${l.image}`} alt={l.name} />
                          {l.hotspots.map((h) => (
                            <button
                              key={h.id}
                              style={{
                                position: 'absolute',
                                left: h.rect.x * 100 + '%',
                                top: h.rect.y * 100 + '%',
                                width: h.rect.w * 100 + '%',
                                height: h.rect.h * 100 + '%',
                              }}
                              disabled={
                                p.visited.includes(h.id) ||
                                (g.action?.used ?? 0) >= 2
                              }
                              onClick={() => {
                                act({
                                  type: 'SEARCH_HOTSPOT',
                                  locationId: l.id,
                                  hotspotId: h.id,
                                });
                                if (
                                  !h.requiresFactId ||
                                  p.facts.includes(h.requiresFactId)
                                ) {
                                  setClue(h.clueId ?? '');
                                  setCloseup(h.closeup ?? '');
                                  go('s09');
                                }
                              }}
                            >
                              {h.label}
                              {p.visited.includes(h.id) ? ' ✓' : ''}
                              {h.requiresFactId &&
                              !p.facts.includes(h.requiresFactId)
                                ? ' · ' + t.locked
                                : ''}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
              {button(t.back, back)}
            </>
          )}
          {effective === 's09' && g && p && (
            <>
              <h2>{t.found}</h2>
              {closeup && <Art src={closeup} label={g.message} />}
              {c.clues
                .filter((x) => x.id === clue && p.clues.includes(x.id))
                .map((cl) => (
                  <article key={cl.id}>
                    <h3>{cl.name}</h3>
                    {cl.image && <Art src={cl.image} label={cl.name} />}
                    <p>{cl.description}</p>
                    {cl.document && (
                      <section className={'document ' + cl.document.template}>
                        {Object.entries(cl.document.fields).map(([k, v]) => (
                          <p key={k}>{Array.isArray(v) ? v.join('\n') : v}</p>
                        ))}
                      </section>
                    )}
                  </article>
                ))}
              {button(t.back, () => go('s08'))}
            </>
          )}
          {effective === 's10' && g && p && (
            <>
              <h2>{t.talk}</h2>
              {!suspect
                ? c.suspects.map((s) =>
                    button(
                      s.name,
                      () => setSuspect(s.id),
                      (!!g.action && g.action.target !== s.id) ||
                        p.blocked[s.id] !== undefined,
                    ),
                  )
                : c.suspects
                    .filter((s) => s.id === suspect)
                    .map((s) => (
                      <section key={s.id}>
                        <h3>{s.name}</h3>
                        <Art
                          src={
                            '/troupe/' +
                            s.actorId +
                            '/' +
                            (p.broken.includes(s.id)
                              ? 'broken'
                              : (p.stress[s.id] ?? 0) >= 6
                                ? 'nervous'
                                : 'neutral') +
                            '.webp'
                          }
                          label={p.broken.includes(s.id) ? t.broken : s.name}
                        />
                        <label>
                          {t.stress} {p.stress[s.id] ?? 0}/10
                          <progress value={p.stress[s.id] ?? 0} max={10} />
                        </label>
                        <label>
                          {t.tone}
                          <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value as Tone)}
                          >
                            {(['neutral', 'pressure', 'empathy'] as const).map(
                              (v) => (
                                <option key={v} value={v}>
                                  {t[v]}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        {p.blocked[s.id] !== undefined && <p>{t.blocked}</p>}
                        {p.history
                          .filter((h) => h.suspect === s.id)
                          .map((h, i) => (
                            <article key={i}>
                              <p>{h.question}</p>
                              <blockquote>{h.answer}</blockquote>
                            </article>
                          ))}
                        {s.offlineQA
                          .filter(
                            (q) =>
                              !p.asked.includes(q.id) &&
                              (!q.requiresClueId ||
                                p.clues.includes(q.requiresClueId)) &&
                              (!q.requiresFactId ||
                                p.facts.includes(q.requiresFactId)),
                          )
                          .map((q) =>
                            button(
                              q.question,
                              () =>
                                act({
                                  type: 'ASK_OFFLINE_QUESTION',
                                  suspectId: s.id,
                                  questionId: q.id,
                                  tone,
                                }),
                              (g.action?.used ?? 0) >= 3 ||
                                p.blocked[s.id] !== undefined,
                            ),
                          )}
                        <h3>{t.present}</h3>
                        {c.clues
                          .filter((cl) => p.clues.includes(cl.id))
                          .map((cl) =>
                            button(
                              cl.name,
                              () =>
                                act({
                                  type: 'PRESENT_CLUE',
                                  suspectId: s.id,
                                  clueId: cl.id,
                                  tone,
                                }),
                              (g.action?.used ?? 0) >= 3 ||
                                p.blocked[s.id] !== undefined,
                            ),
                          )}
                      </section>
                    ))}
              {button(t.back, back)}
            </>
          )}
          {effective === 's11' && g && p && (
            <>
              <h2>{t.notebook}</h2>
              <nav>
                {(['clues', 'facts', 'notes', 'timeline'] as const).map((k) =>
                  button(t[k], () => setTab(k)),
                )}
              </nav>
              {tab === 'clues' &&
                c.clues
                  .filter((cl) => p.clues.includes(cl.id))
                  .map((cl) => (
                    <article key={cl.id}>
                      {button(cl.name, () => {
                        setClue(cl.id);
                        go('s09');
                      })}
                      {button(
                        t.publish,
                        () => act({ type: 'PUBLISH_TO_BOARD', id: cl.id }),
                        g.board.some((x) => x.id === cl.id),
                      )}
                    </article>
                  ))}
              {(tab === 'facts' || tab === 'timeline') &&
                c.facts
                  .filter(
                    (f) =>
                      p.facts.includes(f.id) && (tab !== 'timeline' || f.time),
                  )
                  .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
                  .map((f) => (
                    <article key={f.id}>
                      <p>
                        {f.time} {f.text}
                      </p>
                      {button(
                        t.publish,
                        () => act({ type: 'PUBLISH_TO_BOARD', id: f.id }),
                        g.board.some((x) => x.id === f.id),
                      )}
                    </article>
                  ))}
              {tab === 'notes' && (
                <>
                  <textarea
                    aria-label={t.notes}
                    value={note}
                    maxLength={5000}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {button(t.save, () => act({ type: 'ADD_NOTE', text: note }))}
                </>
              )}
              {button(t.back, back)}
            </>
          )}
          {effective === 's12' && g && (
            <>
              <h2>{t.board}</h2>
              {g.board.map((x) => (
                <article key={x.id}>
                  <p>
                    {c.clues.find((cl) => cl.id === x.id)?.name ??
                      c.facts.find((f) => f.id === x.id)?.text}
                  </p>
                  <small>{g.players[x.by]?.name}</small>
                </article>
              ))}
              {button(t.back, back)}
            </>
          )}
          {effective === 's13' && g && p && (
            <>
              <h2>{g.finalMode ? t.final : t.accuse}</h2>
              <p>{step + 1}/4</p>
              {step === 0 && (
                <label>
                  {t.culprit}
                  <select
                    value={acc.suspectId}
                    onChange={(e) =>
                      setAcc({ ...acc, suspectId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {c.suspects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {step === 1 && (
                <label>
                  {t.motive}
                  <select
                    value={acc.motiveId}
                    onChange={(e) =>
                      setAcc({ ...acc, motiveId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {c.motives.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {step === 2 && (
                <label>
                  {t.method}
                  <select
                    value={acc.methodId}
                    onChange={(e) =>
                      setAcc({ ...acc, methodId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {c.methods.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {step === 3 && (
                <>
                  <p>{t.evidence}</p>
                  {[
                    ...c.clues
                      .filter((cl) => p.clues.includes(cl.id))
                      .map((cl) => ({ id: cl.id, text: cl.name })),
                    ...c.facts.filter((f) => p.facts.includes(f.id)),
                  ].map((f) => (
                    <label key={f.id}>
                      <input
                        type="checkbox"
                        checked={acc.evidence.includes(f.id)}
                        disabled={
                          !acc.evidence.includes(f.id) &&
                          acc.evidence.length >= 3
                        }
                        onChange={(e) =>
                          setAcc({
                            ...acc,
                            evidence: e.target.checked
                              ? [...acc.evidence, f.id]
                              : acc.evidence.filter((id) => id !== f.id),
                          })
                        }
                      />
                      {f.text}
                    </label>
                  ))}
                </>
              )}
              {step < 3
                ? button(
                    t.next,
                    () => setStep(step + 1),
                    ![acc.suspectId, acc.motiveId, acc.methodId][step],
                  )
                : button(t.submit, () => {
                    act({ type: 'ACCUSE', ...acc });
                    setStep(0);
                    setAcc({
                      suspectId: '',
                      motiveId: '',
                      methodId: '',
                      evidence: [],
                    });
                    go('s07');
                  })}
              {step > 0 && button(t.back, () => setStep(step - 1))}
              {!g.finalMode && button(t.hub, back)}
            </>
          )}
          {effective === 's14' && g?.phase === 'finished' && (
            <>
              <h2>{t.ending}</h2>
              <p>
                {g.winners.length
                  ? t.winners +
                    ': ' +
                    g.winners.map((i) => g.players[i]?.name).join(', ')
                  : t.unsolved}
              </p>
              <p>{c.solution.explanation}</p>
              {c.solution.reconstruction.map((r) => (
                <Art key={r.image} src={r.image} label={r.caption} />
              ))}
              {c.timelineTruth.map((e, i) => (
                <p key={i}>
                  {e.time} — {e.event}
                </p>
              ))}
              {g.players.map((v, i) => (
                <article key={i}>
                  {v.name}: {t.score} {v.score}
                  <p>
                    {c.clues
                      .filter((cl) => cl.isKey && v.clues.includes(cl.id))
                      .map((cl) => cl.name)
                      .join(', ')}
                  </p>
                </article>
              ))}
            </>
          )}
          {effective === 's15' && (
            <>
              <h2>{t.settings}</h2>
              <p>{t.settingsText}</p>
              {button(t.reset, () => {
                if (confirm(t.resetConfirm)) void reset().then(() => go('s02'));
              })}
            </>
          )}
          {effective === 's16' && (
            <>
              <h2>{t.help}</h2>
              <p>{t.helpText}</p>
            </>
          )}
        </main>
      </fieldset>
      {g?.message && ['s08', 's09', 's10', 's13'].includes(effective) && (
        <p role="status">{g.message}</p>
      )}
      {effective !== 's06' &&
        button(t.menu, () => {
          if (!personal || confirm(t.exit)) {
            act({ type: 'LOCK' });
            go('s02');
          }
        })}
      {!busy && g && <small>{t.saved}</small>}
    </div>
  );
}
