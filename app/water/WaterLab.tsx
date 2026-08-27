'use client'

import {
  SALT_CONTRIBUTION,
  SCA_ACCEPTABLE,
  SCA_TARGET,
  type SaltName,
  asConcentrate,
  blendFraction,
  dosesForTarget,
  profileWarnings,
} from '@/lib/calc/water'
import Link from 'next/link'
import { useMemo, useState } from 'react'

/**
 * Water Lab — PRD F7.
 *
 * The single largest uncontrolled variable in home brewing, and the one most
 * apps treat as a footnote. Three tools: build water from salts, blend a hard
 * source down, and read what your tap water is doing to your coffee.
 */

type Mode = 'build' | 'blend' | 'diagnose'

const PRESETS: { name: string; gh: number; kh: number; note: string }[] = [
  { name: 'SCA target', gh: 68, kh: 40, note: 'The reference. Balanced across roast levels.' },
  {
    name: 'Bright / light roast',
    gh: 90,
    kh: 15,
    note: 'High extraction, low buffering. Acidity forward.',
  },
  {
    name: 'Everyday balanced',
    gh: 70,
    kh: 40,
    note: 'Forgiving. A good default if you are unsure.',
  },
  { name: 'Dark roast friendly', gh: 60, kh: 60, note: 'Buffers harshness and rounds bitterness.' },
]

const SALT_LABELS: Record<SaltName, string> = {
  epsom: 'Epsom salt',
  calciumChloride: 'Calcium chloride',
  gypsum: 'Gypsum',
  sodiumBicarb: 'Baking soda',
  potassiumBicarb: 'Potassium bicarbonate',
}

const ION_ROLES = [
  {
    ion: 'Magnesium',
    role: 'Binds flavour compounds strongly. This is where brightness and fruit come from.',
    tooLittle: 'Thin, hollow',
    tooMuch: 'Harsh, sharp',
  },
  {
    ion: 'Calcium',
    role: 'Extracts the heavier, creamier compounds. This is where body comes from.',
    tooLittle: 'Lacks body',
    tooMuch: 'Chalky, and limescale in your kettle',
  },
  {
    ion: 'Alkalinity',
    role: 'Buffers acids. Think of it as the volume knob on perceived acidity.',
    tooLittle: 'Sharp, aggressive, sour',
    tooMuch: 'Flat, dull, muted',
  },
]

export function WaterLab() {
  const [mode, setMode] = useState<Mode>('build')

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← Extraction
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Water</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Your cup is about 98.5 % water. It is the biggest variable most people never touch.
      </p>

      <div
        role="tablist"
        aria-label="Water tools"
        className="mt-6 flex gap-2 rounded-full border border-[var(--color-line)] p-1"
      >
        {(
          [
            ['build', 'Build'],
            ['blend', 'Blend'],
            ['diagnose', 'My tap'],
          ] as [Mode, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`compact flex-1 rounded-full text-sm ${
              mode === id
                ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'build' && <Build />}
      {mode === 'blend' && <Blend />}
      {mode === 'diagnose' && <Diagnose />}

      <section className="mt-12">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          What each mineral actually does
        </h2>
        <ul className="mt-3 space-y-2">
          {ION_ROLES.map((r) => (
            <li
              key={r.ion}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
            >
              <p className="font-medium">{r.ion}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{r.role}</p>
              <p className="mt-2 text-sm">
                <span className="text-[var(--color-faint)]">Too little: </span>
                {r.tooLittle}
                <span className="text-[var(--color-faint)]"> · Too much: </span>
                {r.tooMuch}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function Build() {
  const [gh, setGh] = useState(String(SCA_TARGET.ghPpmCaCO3))
  const [kh, setKh] = useState(String(SCA_TARGET.khPpmCaCO3))
  const [mgFraction, setMgFraction] = useState(1)
  const [bicarbSalt, setBicarbSalt] = useState<'sodiumBicarb' | 'potassiumBicarb'>('sodiumBicarb')
  const [strength, setStrength] = useState(100)
  const [batchL, setBatchL] = useState('1')

  const result = useMemo(() => {
    const targetGh = Number(gh)
    const targetKh = Number(kh)
    if (!Number.isFinite(targetGh) || !Number.isFinite(targetKh)) return null
    if (targetGh < 0 || targetKh < 0) return null
    try {
      return dosesForTarget({
        targetGhPpm: targetGh,
        targetKhPpm: targetKh,
        magnesiumFraction: mgFraction,
        bicarbSalt,
      })
    } catch {
      return null
    }
  }, [gh, kh, mgFraction, bicarbSalt])

  const concentrate = useMemo(
    () => (result ? asConcentrate(result.doses, strength) : null),
    [result, strength],
  )

  const litres = Number(batchL) || 1

  return (
    <div className="mt-6">
      <p className="text-sm text-[var(--color-muted)]">
        Start from distilled or reverse-osmosis water and add minerals back. Each salt feeds exactly
        one of the two numbers, so this is arithmetic, not guesswork.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => {
              setGh(String(p.gh))
              setKh(String(p.kh))
            }}
            className={`compact rounded-full border px-4 text-sm ${
              Number(gh) === p.gh && Number(kh) === p.kh
                ? 'border-[var(--color-accent)] bg-[var(--color-raised)]'
                : 'border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-[var(--color-faint)]">
        {PRESETS.find((p) => Number(gh) === p.gh && Number(kh) === p.kh)?.note ?? 'Custom target.'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Hardness (GH)" unit="ppm" value={gh} onChange={setGh} />
        <Field label="Alkalinity (KH)" unit="ppm" value={kh} onChange={setKh} />
      </div>

      <label className="mt-5 block">
        <span className="text-sm">
          Hardness from magnesium ·{' '}
          <span className="tabular-nums text-[var(--color-accent)]">
            {Math.round(mgFraction * 100)} %
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={mgFraction * 100}
          onChange={(e) => setMgFraction(Number(e.target.value) / 100)}
          className="mt-2 w-full"
        />
        <span className="mt-1 block text-xs text-[var(--color-faint)]">
          All magnesium is bright and fruit-forward. Shifting some to calcium adds body.
        </span>
      </label>

      <fieldset className="mt-5">
        <legend className="text-sm">Alkalinity from</legend>
        <div className="mt-2 flex gap-2">
          {(
            [
              ['sodiumBicarb', 'Baking soda'],
              ['potassiumBicarb', 'Potassium bicarbonate'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBicarbSalt(id)}
              className={`compact flex-1 rounded-xl border px-3 text-sm ${
                bicarbSalt === id
                  ? 'border-[var(--color-accent)] bg-[var(--color-raised)]'
                  : 'border-[var(--color-line)] text-[var(--color-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--color-faint)]">
          Baking soda is in every kitchen but adds sodium. Potassium bicarbonate avoids that.
        </p>
      </fieldset>

      {result && (
        <>
          <h2 className="mt-8 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Concentrate
          </h2>
          <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <label className="block">
              <span className="text-sm">
                Strength ·{' '}
                <span className="tabular-nums text-[var(--color-accent)]">{strength}×</span>
              </span>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <div className="mt-3 border-t border-[var(--color-line)] pt-3">
              <Field label="Concentrate batch" unit="L" value={batchL} onChange={setBatchL} />
            </div>

            <ul className="mt-4 space-y-2">
              {(Object.entries(concentrate?.perLitreOfConcentrate ?? {}) as [SaltName, number][])
                .filter(([, g]) => g > 0)
                .map(([salt, gPerL]) => (
                  <li key={salt} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm">{SALT_LABELS[salt]}</span>
                      <span className="block text-xs text-[var(--color-faint)]">
                        {SALT_CONTRIBUTION[salt].label}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block font-semibold">{(gPerL * litres).toFixed(2)} g</span>
                      <span className="block text-xs text-[var(--color-faint)]">in {litres} L</span>
                    </span>
                  </li>
                ))}
            </ul>

            <p className="mt-4 rounded-xl bg-[var(--color-raised)] p-3 text-sm">
              Then add{' '}
              <span className="font-semibold text-[var(--color-accent)]">
                {concentrate?.mlPerLitreOfBrewWater.toFixed(0)} mL
              </span>{' '}
              of this concentrate per litre of distilled water.
            </p>
          </div>

          <h2 className="mt-8 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            What you get
          </h2>
          <ProfileReadout
            gh={result.profile.ghPpmCaCO3}
            kh={result.profile.khPpmCaCO3}
            tds={result.profile.tdsMgLApprox}
            sodium={result.profile.sodiumMgL}
            warnings={result.warnings}
          />

          <details className="mt-4 rounded-2xl border border-[var(--color-line)] p-4">
            <summary className="cursor-pointer text-sm text-[var(--color-muted)]">
              Safety and handling
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
              <li>
                Weigh the salts on a 0.01 g scale. These are small masses and errors compound.
              </li>
              <li>
                Concentrate is far too strong to drink. Label the bottle and keep it away from
                anyone who might mistake it for water.
              </li>
              <li>
                Distilled or RO water on its own extracts poorly and tastes flat. It is a base, not
                a brewing water.
              </li>
              <li>
                Mixed brewing water keeps a few days refrigerated. Concentrate keeps far longer.
              </li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}

function Blend() {
  const [sourceGh, setSourceGh] = useState('200')
  const [targetGh, setTargetGh] = useState('68')
  const [volumeL, setVolumeL] = useState('1')

  const result = useMemo(() => {
    const source = Number(sourceGh)
    const target = Number(targetGh)
    if (!Number.isFinite(source) || !Number.isFinite(target)) return null
    try {
      const fraction = blendFraction(source, target)
      const litres = Number(volumeL) || 1
      return {
        fraction,
        sourceMl: Math.round(fraction * litres * 1000),
        distilledMl: Math.round((1 - fraction) * litres * 1000),
      }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [sourceGh, targetGh, volumeL])

  return (
    <div className="mt-6">
      <p className="text-sm text-[var(--color-muted)]">
        Already have hard water, bottled water, or a mineral packet mixed too strong? Cut it with
        distilled instead of starting over.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Source hardness" unit="ppm" value={sourceGh} onChange={setSourceGh} />
        <Field label="Target hardness" unit="ppm" value={targetGh} onChange={setTargetGh} />
      </div>
      <div className="mt-3">
        <Field label="How much to make" unit="L" value={volumeL} onChange={setVolumeL} />
      </div>

      {result && 'error' in result ? (
        <p className="mt-6 rounded-2xl border border-[var(--color-warn)] p-4 text-sm text-[var(--color-warn)]">
          {result.error}. Dilution can only lower hardness — to raise it, use the Build tab.
        </p>
      ) : (
        result && (
          <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">Mix</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{result.sourceMl} mL source</p>
            <p className="text-2xl font-semibold tabular-nums text-[var(--color-accent)]">
              + {result.distilledMl} mL distilled
            </p>
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              That is {Math.round(result.fraction * 100)} % source water. Alkalinity dilutes by the
              same proportion, so both numbers come down together.
            </p>
          </div>
        )
      )}
    </div>
  )
}

function Diagnose() {
  const [gh, setGh] = useState('')
  const [kh, setKh] = useState('')
  const [tds, setTds] = useState('')

  const profile = useMemo(() => {
    const g = Number(gh)
    const k = Number(kh)
    if (!gh || !kh || !Number.isFinite(g) || !Number.isFinite(k)) return null
    return {
      ghPpmCaCO3: g,
      khPpmCaCO3: k,
      sodiumMgL: 0,
      potassiumMgL: 0,
      tdsMgLApprox: Number(tds) || g + k,
    }
  }, [gh, kh, tds])

  const warnings = profile ? profileWarnings(profile) : []

  return (
    <div className="mt-6">
      <p className="text-sm text-[var(--color-muted)]">
        Enter what your water utility publishes, or what a test kit told you. A TDS meter alone
        cannot tell you this — it reads total dissolved solids, not which ones.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Field label="GH" unit="ppm" value={gh} onChange={setGh} placeholder="150" />
        <Field label="KH" unit="ppm" value={kh} onChange={setKh} placeholder="120" />
        <Field label="TDS" unit="mg/L" value={tds} onChange={setTds} placeholder="optional" />
      </div>

      {profile ? (
        <>
          <div className="mt-6">
            <ProfileReadout
              gh={profile.ghPpmCaCO3}
              kh={profile.khPpmCaCO3}
              tds={profile.tdsMgLApprox}
              warnings={warnings}
            />
          </div>
          {warnings.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <p className="text-sm font-medium">What to do about it</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {profile.khPpmCaCO3 > 70
                  ? 'Your alkalinity is buffering the acidity flat. Cut this water with distilled — the Blend tab works out the ratio — or build from distilled instead.'
                  : profile.ghPpmCaCO3 > SCA_ACCEPTABLE.ghPpmCaCO3.max
                    ? 'Hardness is high. Blending with distilled brings it down and protects your kettle from scale.'
                    : 'Add minerals rather than diluting. The Build tab will work out the doses.'}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--color-faint)]">
          Enter hardness and alkalinity to get a reading.
        </p>
      )}
    </div>
  )
}

function ProfileReadout({
  gh,
  kh,
  tds,
  sodium,
  warnings,
}: {
  gh: number
  kh: number
  tds: number
  sodium?: number
  warnings: string[]
}) {
  const inRange = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Readout
          label="Hardness"
          value={`${Math.round(gh)}`}
          unit="ppm"
          ok={inRange(gh, SCA_ACCEPTABLE.ghPpmCaCO3)}
        />
        <Readout label="Alkalinity" value={`${Math.round(kh)}`} unit="ppm" ok={kh <= 70} />
        <Readout
          label="TDS"
          value={`${Math.round(tds)}`}
          unit="mg/L"
          ok={inRange(tds, SCA_ACCEPTABLE.tdsMgL)}
        />
        {sodium !== undefined && (
          <Readout label="Sodium" value={sodium.toFixed(0)} unit="mg/L" ok={sodium < 30} />
        )}
      </dl>

      <p className="mt-3 text-xs text-[var(--color-faint)]">
        SCA target: {SCA_TARGET.ghPpmCaCO3} ppm hardness, {SCA_TARGET.khPpmCaCO3} ppm alkalinity,{' '}
        {SCA_TARGET.tdsMgL} mg/L TDS. TDS here is estimated from the salts added, so a meter will
        not match it exactly.
      </p>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-2">
          {warnings.map((w) => (
            <li key={w} className="text-sm text-[var(--color-warn)]">
              {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Readout({
  label,
  value,
  unit,
  ok,
}: {
  label: string
  value: string
  unit: string
  ok: boolean
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</dt>
      <dd
        className={`text-lg font-semibold tabular-nums ${
          ok ? 'text-[var(--color-ink)]' : 'text-[var(--color-warn)]'
        }`}
      >
        {value}
        <span className="ml-1 text-xs font-normal text-[var(--color-faint)]">{unit}</span>
      </dd>
    </div>
  )
}

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm">
        {label} <span className="text-[var(--color-faint)]">({unit})</span>
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 tabular-nums"
      />
    </label>
  )
}
