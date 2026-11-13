import { hideLaunchSplash } from '../platform/launchSplash';
import { TurnTimer } from '../components/TurnTimer';
import { TALK_LIMIT, TURN_SECONDS, turnBudget } from '../game/rules/turn';
import {
  accusationOutcome,
  evidenceLimit,
  judgeAccusation,
  type AccusationOutcome,
} from '../game/rules/accusation';
import { playEffect } from '../platform/soundscape';
import { SafePuzzle } from '../components/SafePuzzle';
import { Soundscape } from '../components/Soundscape';
import { AudioSettings } from '../components/AudioSettings';
import { DocumentRender } from '../components/DocumentRender';
import { watchBackButton, exitApp } from '../platform/backButton';
import { ClueInspection } from '../components/ClueInspection';
import { NarrationPlayer } from '../components/NarrationPlayer';
import { narrationFor, hintNarration } from '../content/narration';
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
import { listCases, loadCase } from '../content/loader';
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
function Art({
  src,
  label,
  caseId,
}: {
  src: string;
  label: string;
  caseId: string;
}) {
  const dimensions = illustrationDimensions(caseId, src);
  return (
    <figure
      className={
        isFinishedIllustration(caseId, src) ? styles.finishedArt : undefined
      }
    >
      <img
        width={dimensions?.width}
        height={dimensions?.height}
        src={src.startsWith('/troupe') ? src : `/cases/${caseId}/${src}`}
        alt=""
      />
      <figcaption>
        {!isFinishedIllustration(caseId, src) && t.placeholder + ': '}
        {label}
      </figcaption>
    </figure>
  );
}
export default function GameApp() {
  const { game: g, ready, busy, error, init, dispatch, reset } = useGame(),
    nav = useNavigate(),
    path = useLocation().pathname;
  const [setupAllowed, setSetupAllowed] = useState(false);
  // Нераскрытое дело не показывает разгадку без спроса: игроки могут захотеть сыграть ещё раз.
  const [revealed, setRevealed] = useState(false);
  const [turnSeconds, setTurnSeconds] =
    useState<(typeof TURN_SECONDS)[number]>(0);
  const [verdict, setVerdict] = useState<AccusationOutcome | null>(null);
  const [verdictMissing, setVerdictMissing] = useState<string[]>([]);
  const [timeUp, setTimeUp] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const first = listCases()[0];
    if (!first) throw new Error('No built-in cases');
    return first.id;
  });
  const selecting = ['/s03', '/s04'].includes(path) && setupAllowed;
  const c = loadCase(
    selecting ? selectedCaseId : (g?.caseId ?? selectedCaseId),
  );
  const briefing = c.briefing;
  const budget = g ? turnBudget(c, g) : ({ kind: 'none' } as const);
  const budgetText =
    budget.kind === 'search'
      ? ru.turn.budgetSearch(
          c.locations.find((l) => l.id === budget.target)?.name ?? '',
          budget.used,
        )
      : budget.kind === 'talk'
        ? ru.turn.budgetTalk(
            c.suspects.find((x) => x.id === budget.target)?.name ?? '',
            budget.used,
            budget.limit,
          )
        : ru.turn.budgetNone;
  const initSettings = useSettings((s) => s.init);
  const ai = useAi(),
    settings = useSettings();
  const [online, setOnline] = useState(false);
  useEffect(() => {
    setOnline(g?.mode === 'ai');
  }, [g?.mode]);
  const [clueReturn, setClueReturn] = useState<'s08' | 's11' | 'safe'>('s08');
  const [safeId, setSafeId] = useState('');
  const safeHotspot = c.locations
    .flatMap((l) => l.hotspots)
    .find((h) => h.id === safeId);
  const briefcase = safeHotspot?.label.toLocaleLowerCase('ru') === 'портфель';
  const containerInside = briefcase ? ru.safe.insideBriefcase : ru.safe.inside;
  const containerBack = briefcase ? ru.safe.backBriefcase : ru.safe.back;
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
    // Зона обыска, с которой пришли на экран находки: её название и описание подписывают кадр.
    [spot, setSpot] = useState(''),
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
  useEffect(() => {
    if (ready) void hideLaunchSplash();
  }, [ready]);
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

  // Допрос: после вопроса, предъявления улики и прихода ответа экран возвращается к портрету.
  // Сразу под портретом — последний ответ, поэтому видны и мимика, и реплика.
  const interrogationRef = useRef<HTMLElement | null>(null);
  const repliesWithSuspect = suspect
    ? (p?.history.filter((h) => h.suspect === suspect).length ?? 0)
    : 0;
  const showSuspect = () =>
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      interrogationRef.current?.scrollIntoView({
        block: 'start',
        behavior: reduce ? 'auto' : 'smooth',
      });
    });
  const seenReplies = useRef({ suspect, count: repliesWithSuspect });
  useEffect(() => {
    const seen = seenReplies.current;
    seenReplies.current = { suspect, count: repliesWithSuspect };
    // Только новый ответ того же подозреваемого, не вход на экран и не смена собеседника.
    if (seen.suspect === suspect && repliesWithSuspect > seen.count)
      showSuspect();
  }, [suspect, repliesWithSuspect]);

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
  const foundSpot = spot
    ? c.locations.flatMap((l) => l.hotspots).find((h) => h.id === spot)
    : undefined;
  // В одиночной партии передачи нет: после конца хода возвращаемся в хаб, а не остаёмся на экране действия.
  const endTurn = () => {
    setLocation('');
    setSuspect('');
    act({ type: 'END_TURN' });
    go('s07');
  };
  if (!ready) return <p role="status">{ru.loading}</p>;
  return (
    <div className={styles.game} data-screen={effective}>
      <Soundscape
        screen={effective}
        solved={!!g?.winners.length}
        paper={!(safeId && !clue)}
      />
      <header>
        <h1>{ru.appName}</h1>
        {p && g && effective !== 's06' && effective !== 's14' && personal && (
          <p style={{ color: p.color }}>
            {p.name} · {t.round} {g.round}/{g.roundLimit}
            {g.turnSeconds > 0 && !g.finalMode && g.phase === 'turn' && (
              <>
                {' · '}
                <TurnTimer
                  turnKey={`${g.round}-${g.current}-${p.turns}`}
                  seconds={g.turnSeconds}
                  running={!busy && !ai.busy && !timeUp && !verdict}
                  onExpire={() => setTimeUp(true)}
                />
              </>
            )}
          </p>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {verdict && verdict !== 'win' && (
        <div
          className={styles.dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="verdict-title"
        >
          <section>
            <h2 id="verdict-title">{ru.turn.verdict[verdict].title}</h2>
            <p>
              {verdict === 'grace' && verdictMissing.length
                ? ru.turn.verdict.grace.missing(verdictMissing.join(', '))
                : ru.turn.verdict[verdict].text}
            </p>
            <button autoFocus onClick={() => setVerdict(null)}>
              {ru.turn.verdict.ok}
            </button>
          </section>
        </div>
      )}
      {timeUp && (
        <div
          className={styles.dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="timeup-title"
        >
          <section>
            <h2 id="timeup-title">{ru.turn.timeUpTitle}</h2>
            <p>{ru.turn.timeUpText}</p>
            <button
              autoFocus
              onClick={() => {
                setTimeUp(false);
                endTurn();
              }}
            >
              {ru.turn.passTurn}
            </button>
          </section>
        </div>
      )}
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
              <HotspotEditor key={c.id} c={c} />
            </Suspense>
          )}
          {effective === 's03' && (
            <>
              <h2>{t.choose}</h2>
              {listCases().map((item) => (
                <article key={item.id}>
                  <Art caseId={item.id} src={item.cover} label={item.title} />
                  <p>{item.tagline}</p>
                  <p>
                    {t.difficulty}: {item.difficulty} · {item.estimatedMinutes}{' '}
                    {t.minutes}
                  </p>
                  {button(item.title, () => {
                    setSelectedCaseId(item.id);
                    setCount(
                      Math.max(
                        item.players.min,
                        Math.min(count, item.players.max),
                      ),
                    );
                    setLocation('');
                    setSuspect('');
                    setClue('');
                    setSafeId('');
                    setCloseup('');
                    go('s04');
                  })}
                </article>
              ))}
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
                  {Array.from(
                    { length: c.players.max - c.players.min + 1 },
                    (_, i) => c.players.min + i,
                  ).map((n) => (
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
              <label>
                {ru.turn.timer}
                <select
                  value={turnSeconds}
                  onChange={(e) =>
                    setTurnSeconds(
                      TURN_SECONDS.find((n) => n === +e.target.value) ?? 0,
                    )
                  }
                >
                  {TURN_SECONDS.map((n) => (
                    <option key={n} value={n}>
                      {n ? ru.turn.timerOption(n) : ru.turn.timerOff}
                    </option>
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
                  setRevealed(false);
                  void dispatch({
                    type: 'START_GAME',
                    caseId: c.id,
                    overwrite: !!g,
                    mode: settings.hasKey ? mode : 'classic',
                    names: names.slice(0, count),
                    roundLimit: rounds,
                    turnSeconds,
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
              <p>{briefing}</p>
              <p>
                {t.rounds}: {g.roundLimit}
              </p>
              <NarrationPlayer
                clip={narrationFor(c.id, 'briefing', briefing)}
              />
              <Art
                caseId={c.id}
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
                  <NarrationPlayer clip={hintNarration(c.id, g.hint)} />
                </aside>
              )}
              <p role="status">{budgetText}</p>
              {button(
                t.search,
                () => {
                  setLocation('');
                  go('s08');
                },
                g.action?.kind === 'talk',
              )}
              {g.action?.kind === 'talk' && <small>{ru.turn.busyTalk}</small>}
              {button(
                t.talk,
                () => {
                  setSuspect('');
                  go('s10');
                },
                g.action?.kind === 'search',
              )}
              {g.action?.kind === 'search' && (
                <small>{ru.turn.busySearch}</small>
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
                                !p.openedLocks.includes(h.id) &&
                                p.visited.includes(h.id)
                              }
                              onClick={() => {
                                if (h.lock) {
                                  setSafeId(h.id);
                                  setClue('');
                                  setCloseup('');
                                  setSpot('');
                                  setClueReturn('s08');
                                  go('s09');
                                  return;
                                }
                                setSafeId('');
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
                                  setSpot(h.id);
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
              {!location && g.action?.kind === 'search' && (
                <p role="status">
                  {ru.turn.oneLocation(
                    c.locations.find((l) => l.id === g.action?.target)?.name ??
                      '',
                  )}
                </p>
              )}
              {g.message && <p role="status">{g.message}</p>}
              {budget.kind === 'search' &&
                budget.target === location &&
                budget.exhausted && (
                  <aside role="alert">
                    {ru.turn.searchDone}
                    {button(t.end, endTurn)}
                  </aside>
                )}
              {button(t.back, () => (location ? chooseLocation('') : back()))}
            </>
          )}
          {effective === 's09' && g && p && (
            <>
              <h2>
                {safeId && !clue
                  ? p.openedLocks.includes(safeId)
                    ? containerInside
                    : ru.safe.title
                  : foundSpot && !clue
                    ? foundSpot.label
                    : t.found}
              </h2>
              {safeHotspot && !clue && (
                <SafePuzzle
                  key={c.id + safeId}
                  caseId={c.id}
                  hotspot={safeHotspot}
                  opened={p.openedLocks.includes(safeId)}
                  collected={p.clues}
                  enabled={
                    g.phase === 'turn' &&
                    !g.finalMode &&
                    !p.eliminated &&
                    (p.openedLocks.includes(safeId) ||
                      !g.action ||
                      (g.action.kind === 'search' &&
                        g.action.target === location))
                  }
                  submit={async (code) => {
                    await dispatch({
                      type: 'OPEN_LOCK',
                      locationId: location,
                      hotspotId: safeId,
                      code,
                    });
                    return !!useGame
                      .getState()
                      .game?.players[g.current]?.openedLocks.includes(safeId);
                  }}
                  take={(id) => {
                    playEffect('paper');
                    if (!p.clues.includes(id))
                      act({
                        type: 'TAKE_CONTAINER_ITEM',
                        hotspotId: safeId,
                        clueId: id,
                      });
                    setClue(id);
                    setClueReturn('safe');
                  }}
                />
              )}
              {closeup && !selectedClue?.inspection && (
                <Art caseId={c.id} src={closeup} label="" />
              )}
              {foundSpot && !safeId && (
                <section aria-label={foundSpot.label}>
                  {!selectedClue?.inspection && <p>{foundSpot.text}</p>}
                  {!!foundSpot.revealsFactIds?.length && (
                    <>
                      <p>{ru.search.addedToNotebook}</p>
                      <ul>
                        {foundSpot.revealsFactIds
                          .filter((id) => p.facts.includes(id))
                          .map((id) => (
                            <li key={id}>
                              {c.facts.find((f) => f.id === id)?.text}
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                </section>
              )}
              {c.clues
                .filter((x) => x.id === clue && p.clues.includes(x.id))
                .map((cl) => (
                  <article key={cl.id}>
                    <h3>{cl.name}</h3>
                    {cl.image && !cl.inspection && (
                      <Art caseId={c.id} src={cl.image} label="" />
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
              {button(clueReturn === 'safe' ? containerBack : t.back, () => {
                if (clueReturn === 'safe') {
                  setClue('');
                  setClueReturn('s08');
                } else go(clueReturn);
              })}
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
                      <section
                        key={s.id}
                        className={styles.interrogation}
                        ref={interrogationRef}
                      >
                        <h3>{s.name}</h3>
                        <Art
                          caseId={c.id}
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
                          {p.history.filter((h) => h.suspect === s.id).length >
                            1 && (
                            <details className="earlierReplies">
                              <summary>{ru.dialogue.earlier}</summary>
                              {p.history
                                .filter((h) => h.suspect === s.id)
                                .slice(0, -1)
                                .map((h, i) => (
                                  <article key={i}>
                                    <p>{h.question}</p>
                                    <blockquote>{h.answer}</blockquote>
                                  </article>
                                ))}
                            </details>
                          )}
                          {p.history
                            .filter((h) => h.suspect === s.id)
                            .slice(-1)
                            .map((h, i) => (
                              <article className="latestReply" key={i}>
                                <p>{h.question}</p>
                                <blockquote>{h.answer}</blockquote>
                              </article>
                            ))}
                          {ai.busy && (
                            <p role="status" className="typing">
                              {ru.ai.typing}
                            </p>
                          )}
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
                                    showSuspect();
                                  },
                                  !freeQuestion.trim() ||
                                    (g.action?.used ?? 0) >= TALK_LIMIT ||
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
                                (g.action?.used ?? 0) >= TALK_LIMIT ||
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
                                ) {
                                  void askAi(s.id, '', tone, cl.id);
                                  showSuspect();
                                } else
                                  act({
                                    type: 'PRESENT_CLUE',
                                    suspectId: s.id,
                                    clueId: cl.id,
                                    tone,
                                  });
                              },
                              (g.action?.used ?? 0) >= TALK_LIMIT ||
                                p.blocked[s.id] !== undefined,
                            ),
                          )}
                      </section>
                    ))}
              {!suspect && g.action?.kind === 'talk' && (
                <p role="status">
                  {ru.turn.oneSuspect(
                    c.suspects.find((x) => x.id === g.action?.target)?.name ??
                      '',
                  )}
                </p>
              )}
              {budget.kind === 'talk' &&
                budget.target === suspect &&
                budget.exhausted && (
                  <aside role="alert">
                    {p.blocked[suspect] !== undefined
                      ? ru.turn.lawyerDone
                      : ru.turn.talkDone}
                    {button(t.end, endTurn)}
                  </aside>
                )}
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
                          setSafeId('');
                          setCloseup('');
                          setSpot('');
                          setClueReturn('s11');
                          setClue(cl.id);
                          go('s09');
                        }}
                      >
                        {cl.image && isFinishedIllustration(c.id, cl.image) && (
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
                  <p>{t.evidence(evidenceLimit(c))}</p>
                  {c.solution.proofChain && (
                    <p>
                      {t.chain(
                        c.solution.proofChain.map((l) => l.label).join(' · '),
                      )}
                    </p>
                  )}
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
                          acc.evidence.length >= evidenceLimit(c)
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
                : button(t.submit, async () => {
                    const outcome = accusationOutcome(c, g, p, acc);
                    setVerdictMissing(judgeAccusation(c, acc).missing);
                    await dispatch({ type: 'ACCUSE', ...acc });
                    if (
                      outcome !== 'win' &&
                      useGame.getState().game?.phase !== 'finished'
                    )
                      setVerdict(outcome);
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
          {effective === 's14' &&
            g?.phase === 'finished' &&
            !g.winners.length &&
            !revealed && (
              <section aria-label={t.unsolved}>
                <h2>{t.unsolved}</h2>
                <p>{t.spoilerQuestion}</p>
                {button(t.revealYes, () => setRevealed(true))}
                {button(t.revealNo, () => {
                  if (confirm(t.overwrite)) {
                    setSelectedCaseId(c.id);
                    setSetupAllowed(true);
                    go('s04');
                  }
                })}
              </section>
            )}
          {effective === 's14' &&
            g?.phase === 'finished' &&
            (g.winners.length > 0 || revealed) && (
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
                    c.id,
                    'solution-explanation',
                    c.solution.explanation,
                  )}
                />
                {c.solution.reconstruction.map((r, index) => (
                  <div key={r.image}>
                    <Art caseId={c.id} src={r.image} label={r.caption} />
                    <NarrationPlayer
                      clip={narrationFor(
                        c.id,
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
                <section>
                  <h3>{ru.safe.explanations}</h3>
                  {c.clues
                    .filter((cl) => cl.explanationFactIds?.length)
                    .map((cl) => (
                      <article key={cl.id}>
                        <h4>{cl.name}</h4>
                        {cl.explanationFactIds?.map((id) => (
                          <p key={id}>
                            {c.facts.find((f) => f.id === id)?.text}
                          </p>
                        ))}
                      </article>
                    ))}
                </section>
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
              <AudioSettings />
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
