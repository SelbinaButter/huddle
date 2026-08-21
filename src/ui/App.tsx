import { useEffect, useMemo, useRef, useState } from 'react'
import { CONCEPTS, decodeShell, filterCandidates, outcomeFor, RECEIVERS, SHELL_BY_ID, type ConceptId, type LookupTables, type PlayedSnap, type Puzzle, type ReceiverId } from '../core'
import { MAX_SNAPS } from '../game/constants'
import { localDate, previousDate } from '../game/date'
import { shareText, type ShareMode } from '../game/share'
import { hasSeenOnboarding, loadRound, loadStats, markOnboardingSeen, recordResult, saveRound } from '../game/storage'
import type { PlayerStats } from '../game/types'
import { FieldCanvas } from './FieldCanvas'

type GameMode = 'daily' | 'archive' | 'practice'
interface PuzzleIndex { dates: string[] }
interface Animation { observation: PlayedSnap['observation']; outcome: PlayedSnap['outcome']; concept: ConceptId; target: ReceiverId; progress: number }

const OUTCOME_COPY = {
  touchdown: ['Touchdown', 'You found grass and finished the play.'],
  short: ['Tackled short', 'The catch was made, but pursuit arrived before the goal line.'],
  breakup: ['Broken up', 'A defender arrived at the catch point.'],
  interception: ['Picked', 'A defender was sitting in the throwing lane.'],
} as const

function randomIndex(length: number): number {
  const value = new Uint32Array(1); crypto.getRandomValues(value)
  return length ? value[0] % length : 0
}

export default function App() {
  const [today, setToday] = useState(() => localDate())
  const [tables, setTables] = useState<LookupTables>()
  const [availableDates, setAvailableDates] = useState<string[]>([today])
  const [mode, setMode] = useState<GameMode>('daily')
  const [selectedDate, setSelectedDate] = useState(today)
  const [practiceRun, setPracticeRun] = useState(0)
  const [puzzle, setPuzzle] = useState<Puzzle>()
  const [snaps, setSnaps] = useState<PlayedSnap[]>([])
  const [concept, setConcept] = useState<ConceptId>('four-verts')
  const [target, setTarget] = useState<ReceiverId>('X')
  const [animation, setAnimation] = useState<Animation>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [showResult, setShowResult] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding())
  const [stats, setStats] = useState<PlayerStats>(() => loadStats())
  const [copied, setCopied] = useState(false)
  const frame = useRef<number>()

  useEffect(() => {
    let timer: number
    const syncDate = () => {
      const date = localDate()
      setToday(date)
      if (mode === 'daily') setSelectedDate(date)
    }
    const scheduleMidnight = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = window.setTimeout(() => { syncDate(); scheduleMidnight() }, midnight.getTime() - now.getTime() + 100)
    }
    scheduleMidnight()
    window.addEventListener('focus', syncDate)
    document.addEventListener('visibilitychange', syncDate)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', syncDate)
      document.removeEventListener('visibilitychange', syncDate)
    }
  }, [mode])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}tables.json`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Coverage tables are unavailable.'); return response.json() as Promise<LookupTables> }),
      fetch(`${import.meta.env.BASE_URL}puzzles/index.json`, { signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<PuzzleIndex> : { dates: [today] }),
    ]).then(([nextTables, index]) => {
      setTables(nextTables)
      const dates = [...new Set(index.dates)].filter((date) => date <= today).sort()
      if (dates.length) setAvailableDates(dates)
    }).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Could not load the playbook.')
    })
    return () => controller.abort()
  }, [today])

  useEffect(() => {
    if (!tables) return
    const controller = new AbortController()
    setLoading(true); setError(undefined)
    fetch(`${import.meta.env.BASE_URL}puzzles/${selectedDate}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(`That game is not in the archive yet (${response.status}).`); return response.json() as Promise<Puzzle> })
      .then((nextPuzzle) => {
        setPuzzle(nextPuzzle)
        setSnaps(mode === 'practice' ? [] : loadRound(nextPuzzle.date).snaps)
        setConcept(nextPuzzle.concepts[0]); setTarget('X'); setAnimation(undefined); setShowResult(false); setCopied(false); setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) { setError(reason instanceof Error ? reason.message : 'Could not load that game.'); setLoading(false) }
      })
    return () => controller.abort()
  }, [mode, practiceRun, selectedDate, tables])

  useEffect(() => { if (puzzle && mode !== 'practice') saveRound({ date: puzzle.date, snaps }) }, [mode, puzzle, snaps])
  useEffect(() => () => { if (frame.current !== undefined) cancelAnimationFrame(frame.current) }, [])

  const won = snaps.at(-1)?.outcome.kind === 'touchdown'
  const failed = !won && snaps.length >= MAX_SNAPS
  const finished = won || failed
  const shellId = puzzle ? decodeShell(puzzle.shell, puzzle.date) : undefined
  const shell = shellId ? SHELL_BY_ID.get(shellId) : undefined
  const candidates = useMemo(() => {
    if (!tables) return []
    return snaps.reduce((current, snap) => filterCandidates(tables, current, snap.concept, snap.target, { observationSignature: snap.observation.signature, outcome: snap.outcome.kind }), [...tables.shells])
  }, [snaps, tables])

  const choosePracticePuzzle = () => {
    const pool = availableDates.filter((date) => date < today)
    const alternatives = pool.filter((date) => date !== selectedDate)
    setMode('practice'); setSelectedDate((alternatives.length ? alternatives : pool)[randomIndex((alternatives.length ? alternatives : pool).length)] ?? today); setPracticeRun((value) => value + 1)
  }

  const changeMode = (nextMode: GameMode) => {
    if (nextMode === 'practice') return choosePracticePuzzle()
    setMode(nextMode)
    setSelectedDate(nextMode === 'daily' ? today : availableDates.filter((date) => date < today).at(-1) ?? previousDate(today))
  }

  const runSnap = () => {
    if (!tables || !puzzle || !shellId || animation || finished) return
    const observation = tables.observations[shellId][concept]
    const outcome = outcomeFor(tables, shellId, concept, target)
    const started = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 1450)
      setAnimation({ observation, outcome, concept, target, progress })
      if (progress < 1) { frame.current = requestAnimationFrame(tick); return }
      const played: PlayedSnap = { concept, target, outcome, observation }
      setSnaps((current) => {
        const next = [...current, played]
        if (outcome.kind === 'touchdown' || next.length >= MAX_SNAPS) {
          setShowResult(true)
          if (mode === 'daily') setStats(recordResult(puzzle.date, puzzle.number, outcome.kind === 'touchdown' ? next.length : null))
        }
        return next
      })
      setAnimation(undefined)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const copyResult = async () => {
    if (!puzzle) return
    const url = ['localhost', '127.0.0.1'].includes(location.hostname) ? undefined : new URL(import.meta.env.BASE_URL, location.href).href.replace(/\/$/, '')
    const text = shareText(puzzle, snaps, { mode: mode as ShareMode, url })
    if (navigator.share) { try { await navigator.share({ text }); return } catch (reason) { if (reason instanceof DOMException && reason.name === 'AbortError') return } }
    await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1500)
  }

  const scoring = puzzle && tables && shellId ? puzzle.concepts.flatMap((conceptId) => RECEIVERS.map((receiver) => ({ concept: conceptId, receiver, outcome: outcomeFor(tables, shellId, conceptId, receiver) }))).filter(({ outcome }) => outcome.kind === 'touchdown') : []
  const archiveIndex = availableDates.indexOf(selectedDate)
  const lastSnap = snaps.at(-1)

  const closeOnboarding = () => { markOnboardingSeen(); setShowOnboarding(false) }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">{mode === 'daily' ? 'Daily red-zone read' : mode === 'archive' ? 'Archive game' : 'Practice rep'}{puzzle ? ` · #${puzzle.number}` : ''}</span><h1>Huddle<span>.</span></h1></div>
        <button className="help-button" type="button" onClick={() => setShowOnboarding(true)} aria-label="How to play">?</button>
      </header>

      <nav className="mode-tabs" aria-label="Game mode">
        {(['daily', 'archive', 'practice'] as const).map((tab) => <button type="button" className={mode === tab ? 'active' : ''} aria-pressed={mode === tab} onClick={() => changeMode(tab)} key={tab}>{tab === 'daily' ? 'Today' : tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </nav>

      {mode === 'archive' && <div className="mode-panel archive-picker"><button type="button" aria-label="Previous archived game" disabled={archiveIndex <= 0} onClick={() => setSelectedDate(availableDates[Math.max(0, archiveIndex - 1)])}>←</button><label><span>Archived game</span><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>{availableDates.filter((date) => date < today).map((date) => <option value={date} key={date}>{date}</option>)}</select></label><button type="button" aria-label="Next archived game" disabled={archiveIndex < 0 || archiveIndex >= availableDates.length - 2} onClick={() => setSelectedDate(availableDates[archiveIndex + 1])}>→</button></div>}
      {mode === 'practice' && <div className="mode-panel practice-panel"><span>Random archive rep · daily streak stays untouched</span><button type="button" onClick={choosePracticePuzzle}>New defense</button></div>}

      {error ? <section className="message-card"><span className="eyebrow">Delay of game</span><h2>The play sheet didn’t arrive.</h2><p>{error}</p><button type="button" onClick={() => changeMode('daily')}>Return to today</button></section>
        : loading || !puzzle || !tables ? <div className="loader">Breaking the huddle…</div>
          : <section className="game-layout">
            <div className="field-panel">
              <div className="score-strip"><span><i /> 1st & goal · {puzzle.spot}</span><span>{puzzle.personnel} personnel</span><strong>{finished ? (won ? `${snaps.length}/${MAX_SNAPS}` : `X/${MAX_SNAPS}`) : `Snap ${snaps.length + 1}/${MAX_SNAPS}`}</strong></div>
              <div className="field-wrap">
                <FieldCanvas concept={concept} target={target} snaps={snaps} active={animation ? { observation: animation.observation, outcome: animation.outcome, progress: animation.progress } : undefined} revealedShellId={finished ? shellId : undefined} />
                {animation && <div className="live-badge">BALL OUT</div>}
                {finished && showResult && <div className="result-modal" role="dialog" aria-label="Puzzle result"><button className="close" type="button" aria-label="Close result" onClick={() => setShowResult(false)}>×</button><span className="eyebrow">{won ? snaps.length < puzzle.par ? 'Beat par' : 'Drive complete' : 'Turnover on downs'}</span><strong>{won ? `${snaps.length}/${MAX_SNAPS}` : `X/${MAX_SNAPS}`}</strong><p>{won ? `You found the end zone against ${shell?.base.replace('-', ' ')}.` : `It was ${shell?.base.replace('-', ' ')}. Watch the full assignments, then try the archive.`}</p><button type="button" onClick={() => void copyResult()}>{copied ? 'Copied!' : 'Share result'}</button><button className="text-button" type="button" onClick={() => setShowResult(false)}>Watch the film</button></div>}
              </div>
              {lastSnap && <div className={`feedback ${lastSnap.outcome.kind}`} role="status"><b>{OUTCOME_COPY[lastSnap.outcome.kind][0]}{lastSnap.outcome.kind === 'short' ? ` · ${lastSnap.outcome.yards} yards` : ''}</b><span>{lastSnap.outcome.yardsAfterCatch > 0 ? `Caught at ${lastSnap.outcome.airYards}, then gained ${lastSnap.outcome.yardsAfterCatch} after the catch. ${OUTCOME_COPY[lastSnap.outcome.kind][1]}` : OUTCOME_COPY[lastSnap.outcome.kind][1]}</span></div>}
              {!snaps.length && <div className="first-read"><b>Your first snap is the read.</b> Choose a concept to stress part of the field, then commit to one target. Blue patches are zones, gold tethers are man, and a red rusher is a blitz.</div>}
            </div>

            <aside className="call-sheet">
              {!finished ? <>
                <div className="section-heading"><span className="eyebrow">1 · Call a concept</span><span>{CONCEPTS[concept].prompt}</span></div>
                <div className="concept-grid">{puzzle.concepts.map((id) => <button type="button" className={concept === id ? 'selected' : ''} aria-pressed={concept === id} onClick={() => setConcept(id)} disabled={Boolean(animation)} key={id}><b>{CONCEPTS[id].name}</b><small>{CONCEPTS[id].routes.map((route) => route.name).join(' · ')}</small></button>)}</div>
                <div className="section-heading target-heading"><span className="eyebrow">2 · Pick the throw</span><span>Only this receiver can score.</span></div>
                <div className="target-grid">{RECEIVERS.map((receiver) => <button type="button" className={target === receiver ? 'selected' : ''} aria-pressed={target === receiver} onClick={() => setTarget(receiver)} disabled={Boolean(animation)} key={receiver}><b>{receiver}</b><small>{CONCEPTS[concept].routes.find((route) => route.receiver === receiver)?.name}</small></button>)}</div>
                <button className="snap-button" type="button" onClick={runSnap} disabled={Boolean(animation)}>{animation ? 'Play unfolding…' : `Snap it · throw to ${target}`}</button>
                <div className="snap-dots" aria-label={`${snaps.length} of ${MAX_SNAPS} snaps used`}>{Array.from({ length: MAX_SNAPS }, (_, index) => <span className={snaps[index]?.outcome.kind ?? (index === snaps.length ? 'next' : '')} key={index}>{index + 1}</span>)}</div>
              </> : <div className="film-room">
                <span className="eyebrow">Film room · defense revealed</span><h2>{shell?.base.replace('-', ' ')}</h2><p>The accumulated trails are now labeled. These throws would have scored:</p><div className="scoring-list">{scoring.map((play) => <span key={`${play.concept}:${play.receiver}`}><b>{CONCEPTS[play.concept].name}</b> · {play.receiver} {CONCEPTS[play.concept].routes.find((route) => route.receiver === play.receiver)?.name}</span>)}</div><small>Your snaps narrowed the film to {candidates.length} scoring-equivalent look{candidates.length === 1 ? '' : 's'}.</small><div className="result-actions"><button type="button" onClick={() => setShowResult(true)}>View result</button>{mode === 'practice' && <button className="secondary" type="button" onClick={choosePracticePuzzle}>New defense</button>}</div>
              </div>}
            </aside>
          </section>}

      <footer><span>Local date · {puzzle?.date ?? today}</span><span>{stats.currentStreak} streak · {stats.history.length} played · best {stats.bestStreak}</span></footer>

      {showOnboarding && <div className="overlay" role="dialog" aria-modal="true" aria-label="How to play Huddle"><div className="onboarding"><span className="eyebrow">Welcome to Huddle</span><h2>Find the throw that scores.</h2><ol><li><b>Call a concept.</b> Its five routes stress a different part of the defense.</li><li><b>Pick one target.</b> Only that receiver’s result counts.</li><li><b>Read the film.</b> Zone patches, man tethers, blitzes, and old trails accumulate.</li><li><b>Score in four snaps.</b> The defense and ball position never change.</li></ol><div className="legend"><span><i className="zone-key" /> Zone</span><span><i className="man-key" /> Man</span><span><i className="blitz-key" /> Blitz</span></div><button type="button" onClick={closeOnboarding}>Call the first play</button><small>No football vocabulary required—the overlay does the labeling.</small></div></div>}
    </main>
  )
}
