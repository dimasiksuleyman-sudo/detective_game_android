import { DocumentRender } from '../components/DocumentRender';
import { watchBackButton, exitApp } from '../platform/backButton';
import { ClueInspection } from '../components/ClueInspection';
import { NarrationPlayer } from '../components/NarrationPlayer';
import {
  briefingText,
  narrationFor,
  hintNarration,
} from '../content/narration';
import { AiSettings } from '../components/AiSettings';
import { useSettings } from '../store/settingsStore';
import { useAi, askAi, cancelAi, resetAiUsage } from '../ai/coordinator';
import { isAiTestBuild } from '../ai/factory';
import styles from './GameApp.module.css';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  isFinishedIllustration,
  illustrationDimensions,
} from '../content/illustrations';
import { pilot as c } from '../content/loader';
import { useGame } from '../store/gameStore';
import { ru } from '../i18n/ru';
import { HoldButton } from '../components/HoldButton';
import { watchLifecycle } from '../platform/appLifecycle';
import type { Tone } from '../game/engine';
const t = ru.game;
const HotspotEditor =
  import.meta.env.DEV ||
  import.meta.env.MODE === 'debug' ||
  import.meta.env.MODE === 'e2e'
    ? lazy(() => import('../components/HotspotEditor'))
    : null;
function Art({ src, label }: { src: string; label: string }) {
  const dimensions = illustrationDimensions(src);
  return (
    <figure
      className={isFinishedIllustration(src) ? styles.finishedArt : undefined}
    >
      <img
        width={dimensions?.width}
        height={dimensions?.height}
        src={src.startsWith('/troupe') ? src : `/cases/${c.id}/${src}`}
        alt=""
      />
      <figcaption>
        {!isFinishedIllustration(src) && t.placeholder + ': '}
        {label}
      </figcaption>
    </figure>
  );
}
export default function GameApp() {
  const { game: g, ready, busy, error, init, dispatch, reset } = useGame(),
    nav = useNavigate(),
    path = useLocation().pathname;
  const initSettings = useSettings((s) => s.init);
  const ai = useAi(),
    settings = useSettings();
  const [setupAllowed, setSetupAllowed] = useState(false);
  const [online, setOnline] = useState(false);
  useEffect(() => {
    setOnline(g?.mode === 'ai');
  }, [g?.mode]);
  const [clueReturn, setClueReturn] = useState<'s08' | 's11'>('s08');
  const [narrateClues, setNarrateClues] = useState(true);
  const [mode, setMode] = useState<'classic' | 'ai'>('classic'),
    [freeQuestion, setFreeQuestion] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [count, setCount] = useState(1),
    [names, setNames] = useState(
      [1, 2, 3, 4, 5].map((n) => t.defaultName + ' ' + n),
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
  const selectedClue = c.clues.find((cl) => cl.id === clue);
  useEffect(() => {
    void init();
    void initSettings();
  }, [init, initSettings]);
  useEffect(
    () =>
      watchLifecycle(() => {
        if (['turn', 'final'].includes(useGame.getState().game?.phase ?? '')) {
          cancelAi();
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
          : g?.phase === 'final' && personal && !['s07', 's13'].includes(screen)
            ? 's13'
            : ['s03', 's04', 's05'].includes(screen) &&
                g &&
                g.phase !== 'briefing' &&
                !setupAllowed
              ? g.phase === 'handover'
                ? 's06'
                : g.phase === 'finished'
                  ? 's14'
                  : 's07'
              : screen;
  const screenRef = useRef(screen);
  const go = (s: string) => {
    screenRef.current = s;
    useGame.getState().clearMessage();
    nav('/' + s, { replace: true });
  };
  const systemBack = () => {
    cancelAi();
    // popstate может синхронно перерисовать Router до нашего слушателя.
    // Политика исходит из последнего собственного перехода, а не уже изменённого URL.
    let current = screenRef.current;
    const phase = useGame.getState().game?.phase;
    if (['s07', 's08', 's09', 's10', 's11', 's12', 's13'].includes(current)) {
      if (phase === 'handover' || privacy) {
        go('s07');
        return;
      } else if (phase === 'finished') current = 's14';
    }
    if (['s08', 's09', 's10', 's11', 's12', 's13'].includes(current)) go('s07');
    else if (current === 's07' || current === 's06') {
      if (confirm(t.exit)) {
        act({ type: 'LOCK' });
        go('s02');
      } else go(current);
    } else if (current === 's02') {
      go('s02');
      exitApp();
    } else go(current === 's04' ? 's03' : 's02');
  };
  const backRef = useRef(systemBack);
  useEffect(() => {
    backRef.current = systemBack;
  });
  useEffect(
    () =>
      watchBackButton(() => {
        const action = backRef.current;
        // React Router сначала обработает popstate; затем применяем политику игры.
        setTimeout(action, 0);
      }),
    [],
  );
  useEffect(() => {
    useGame.getState().clearMessage();
  }, [path]);

  const button = (label: string, fn: () => void, disabled = false) => (
    <button type="button" disabled={disabled || busy || ai.busy} onClick={fn}>
      {label}
    </button>
  );
  const act = (a: Parameters<typeof dispatch>[0]) => {
    void dispatch(a);
  };
  const chooseLocation = (id: string) => {
    useGame.getState().clearMessage();
    setLocation(id);
  };
  const back = () => go('s07');
  if (!ready) return <p role="status">{ru.loading}</p>;
  return (
    <div className={styles.game} data-screen={effective}>
      <header>
        <h1>{ru.appName}</h1>
        {p && g && effective !== 's06' && effective !== 's14' && personal && (
          <p style={{ color: p.color }}>
            {p.name} · {t.round} {g.round}/{g.roundLimit}
          </p>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy || ai.busy}>
        <main>
          {effective === 's01' && <>{button(t.menu, () => go('s02'))}</>}
          {effective === 's02' && (
            <>
              <h2>{ru.screens.S02.title}</h2>
              {button(t.newGame, () => {
                if (!g || confirm(t.overwrite)) {
                  setSetupAllowed(true);
                  go('s03');
                }
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
          {effective === 's17' && HotspotEditor && (
            <Suspense fallback={<p>{ru.loading}</p>}>
              <HotspotEditor />
            </Suspense>
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
              {button(t.back, () => go('s02'))}
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
                  {[1, 2, 3, 4, 5].map((n) => (
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
              <section aria-label={ru.ai.mode} className="modeSwitch">
                <p>{ru.qa.modeHelp}</p>
                <button
                  aria-pressed={mode === 'classic'}
                  onClick={() => setMode('classic')}
                >
                  {t.classic}
                </button>
                <button
                  disabled={!settings.hasKey}
                  aria-pressed={mode === 'ai'}
                  onClick={() => setMode('ai')}
                >
                  {ru.ai.enabled}
                </button>
                {!settings.hasKey && (
                  <button onClick={() => go('s15')}>{ru.qa.addKey}</button>
                )}
              </section>
              {button(
                t.brief,
                () => {
                  if (g && !setupAllowed && !confirm(t.overwrite)) return;
                  resetAiUsage();
                  void dispatch({
                    type: 'START_GAME',
                    overwrite: !!g,
                    mode: settings.hasKey ? mode : 'classic',
                    names: names.slice(0, count),
                    roundLimit: rounds,
                  }).then(() => {
                    setSetupAllowed(false);
                    go('s05');
                  });
                },
                names.slice(0, count).some((n) => !n.trim()),
              )}
            </>
          )}
          {effective === 's04' && button(t.back, () => go('s03'))}
          {['s15', 's16', 's17'].includes(effective) &&
            button(t.back, () => go('s02'))}
          {effective === 's05' && g && (
            <>
              <h2>{ru.screens.S05.title}</h2>
              <p>{briefingText}</p>
              <p>
                {t.rounds}: {g.roundLimit}
              </p>
              <NarrationPlayer clip={narrationFor('briefing', briefingText)} />
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
            <section
              className={styles.handover}
              style={{ borderColor: p.color }}
            >
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
                  <NarrationPlayer clip={hintNarration(g.hint)} />
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
              <div className="turnControls">
                {button(t.end, () => {
                  if ((g.action?.used ?? 0) > 0 || confirm(ru.qa.unused))
                    act({ type: 'END_TURN' });
                })}
              </div>
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
                        <div className={styles.location}>
                          <img src={`/cases/${c.id}/${l.image}`} alt={l.name} />
                          {l.hotspots.map((h) => (
                            <button
                              key={h.id}
                              className={styles.hotspot}
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
                                  setClueReturn('s08');
                                  setClue(h.clueId ?? '');
                                  setCloseup(h.closeup ?? '');
                                  go('s09');
                                }
                              }}
                            >
                              <span className={styles.hotspotLabel}>
                                {h.label}
                                {p.visited.includes(h.id) ? ' ✓' : ''}
                                {h.requiresFactId &&
                                !p.facts.includes(h.requiresFactId)
                                  ? ' · ' + t.locked
                                  : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
              {g.message && <p role="status">{g.message}</p>}
              {button(t.back, () => (location ? chooseLocation('') : back()))}
            </>
          )}
          {effective === 's09' && g && p && (
            <>
              <h2>{t.found}</h2>
              {closeup && !selectedClue?.inspection && (
                <Art src={closeup} label="" />
              )}
              {c.clues
                .filter((x) => x.id === clue && p.clues.includes(x.id))
                .map((cl) => (
                  <article key={cl.id}>
                    <h3>{cl.name}</h3>
                    {cl.image && !cl.inspection && (
                      <Art src={cl.image} label="" />
                    )}
                    {!cl.document && <p>{cl.description}</p>}
                    {cl.inspection && (
                      <ClueInspection
                        key={cl.id}
                        caseId={c.id}
                        title={cl.name}
                        inspection={cl.inspection}
                        discovered={p.inspectedDetails}
                        enabled={
                          g.phase === 'turn' && !g.finalMode && !p.eliminated
                        }
                        inspect={(x, y) =>
                          act({ type: 'INSPECT_CLUE', clueId: cl.id, x, y })
                        }
                      />
                    )}
                    {cl.document && (
                      <DocumentRender document={cl.document} title={cl.name} />
                    )}
                  </article>
                ))}
              {selectedClue?.inspection && g.message && (
                <p role="status">{g.message}</p>
              )}
              {button(t.back, () => go(clueReturn))}
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
                      <section key={s.id} className={styles.interrogation}>
                        <h3>{s.name}</h3>
                        <Art
                          src={
                            '/troupe/' +
                            s.actorId +
                            '/' +
                            (p.broken.includes(s.id)
                              ? 'broken'
                              : (p.emotions[s.id] ??
                                ((p.stress[s.id] ?? 0) >= 6
                                  ? 'nervous'
                                  : 'neutral'))) +
                            '.webp'
                          }
                          label={p.broken.includes(s.id) ? t.broken : ''}
                        />
                        <div className="chat" role="log">
                          {p.history
                            .filter((h) => h.suspect === s.id)
                            .map((h, i) => (
                              <article key={i}>
                                <p>{h.question}</p>
                                <blockquote>{h.answer}</blockquote>
                              </article>
                            ))}
                        </div>
                        <div className="modeSwitch">
                          <button
                            aria-pressed={online}
                            disabled={!settings.hasKey}
                            onClick={() => {
                              setOnline(true);
                              act({ type: 'SET_INPUT_MODE', mode: 'ai' });
                            }}
                          >
                            {ru.qa.online}
                          </button>
                          <button
                            aria-pressed={!online}
                            onClick={() => setOnline(false)}
                          >
                            {ru.qa.offline}
                          </button>
                        </div>
                        {g.mode === 'ai' && online && (
                          <section className="questionComposer">
                            {!settings.hasKey ? (
                              <p>{ru.ai.noKey}</p>
                            ) : (
                              <>
                                <details>
                                  <summary>
                                    {ru.ai.paidNotice.split('.')[0]}
                                  </summary>
                                  {ru.ai.paidNotice}
                                </details>
                                <label>
                                  {ru.ai.question}
                                  <textarea
                                    value={freeQuestion}
                                    maxLength={1000}
                                    onChange={(e) =>
                                      setFreeQuestion(e.target.value)
                                    }
                                  />
                                </label>
                                {button(
                                  ru.ai.send,
                                  () => {
                                    const question = freeQuestion;
                                    setFreeQuestion('');
                                    void askAi(s.id, question, tone);
                                  },
                                  !freeQuestion.trim() ||
                                    (g.action?.used ?? 0) >= 3 ||
                                    p.blocked[s.id] !== undefined,
                                )}
                              </>
                            )}
                          </section>
                        )}
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
                        <details open={g.mode === 'classic' || !online}>
                          <summary>{ru.ai.offlineQuestions}</summary>
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
                        </details>
                        <h3>{t.present}</h3>
                        {!p.clues.length && <p>{ru.qa.emptyEvidence}</p>}
                        {g.mode === 'ai' && (
                          <label>
                            <input
                              type="checkbox"
                              checked={narrateClues}
                              onChange={(e) =>
                                setNarrateClues(e.target.checked)
                              }
                            />
                            {ru.ai.narrateClues}
                            <p>{ru.ai.offlinePresent}</p>
                          </label>
                        )}
                        {c.clues
                          .filter((cl) => p.clues.includes(cl.id))
                          .map((cl) =>
                            button(
                              cl.name,
                              () => {
                                if (
                                  online &&
                                  g.mode === 'ai' &&
                                  settings.hasKey &&
                                  narrateClues
                                )
                                  void askAi(s.id, '', tone, cl.id);
                                else
                                  act({
                                    type: 'PRESENT_CLUE',
                                    suspectId: s.id,
                                    clueId: cl.id,
                                    tone,
                                  });
                              },
                              (g.action?.used ?? 0) >= 3 ||
                                p.blocked[s.id] !== undefined,
                            ),
                          )}
                      </section>
                    ))}
              {button(t.back, () => (suspect ? setSuspect('') : back()))}
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
                      <button
                        type="button"
                        onClick={() => {
                          setCloseup('');
                          setClueReturn('s11');
                          setClue(cl.id);
                          go('s09');
                        }}
                      >
                        {cl.image && isFinishedIllustration(cl.image) && (
                          <img
                            className={styles.clueThumb}
                            src={`/cases/${c.id}/${cl.image}`}
                            alt=""
                            width={64}
                            height={64}
                          />
                        )}
                        {cl.name}
                      </button>
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
                    onChange={(e) => {
                      setNote(e.target.value);
                      void dispatch({ type: 'ADD_NOTE', text: e.target.value });
                    }}
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
              {!g.board.length && <p>{ru.qa.emptyBoard}</p>}
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
              {g.message && <p role="status">{g.message}</p>}
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
              <NarrationPlayer
                clip={narrationFor(
                  'solution-explanation',
                  c.solution.explanation,
                )}
              />
              {c.solution.reconstruction.map((r, index) => (
                <div key={r.image}>
                  <Art src={r.image} label={r.caption} />
                  <NarrationPlayer
                    clip={narrationFor(
                      'reconstruction-' + (index + 1),
                      r.caption,
                    )}
                  />
                </div>
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
          {effective === 's14' &&
            button(ru.qa.replay, () => {
              if (confirm(t.overwrite)) {
                setSetupAllowed(true);
                go('s03');
              }
            })}
          {effective === 's15' && (
            <>
              <h2>{t.settings}</h2>
              <AiSettings />
              {HotspotEditor && button(ru.qa.editor, () => go('s17'))}
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
      {isAiTestBuild && <p role="note">{ru.ai.testMode}</p>}
      {effective === 's10' && g?.mode === 'ai' && (
        <aside>
          {ai.busy && <p role="status">{ru.ai.typing}</p>}
          {ai.error && (
            <p role="alert">
              {ai.error} {ru.ai.freeFallback}
            </p>
          )}
          <details>
            <summary>{ru.ai.cost}</summary>
            <p>
              {g.aiUsage.lastCostRub === null
                ? ru.ai.unknown
                : g.aiUsage.lastCostRub.toFixed(4) + ' ₽'}
            </p>
            <p>
              {ru.ai.total}: {g.aiUsage.knownCostRub.toFixed(4)} ₽
            </p>
            {g.aiUsage.unknownCost && <p>{ru.ai.unknownCost}</p>}
          </details>
        </aside>
      )}
      {button(t.menu, () => {
        if (!personal || confirm(t.exit)) {
          cancelAi();
          act({ type: 'LOCK' });
          go('s02');
        }
      })}
      {!busy && g && <small>{t.saved}</small>}
    </div>
  );
}
