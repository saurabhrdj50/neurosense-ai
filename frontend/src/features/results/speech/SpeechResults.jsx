import React from 'react'
import { Section, DataRow } from '../ResultSection'
import { Activity } from 'lucide-react'

/* Token tags produced by the backend linguistic analysis
   (app/ml/speech/transcriber.py → annotated_tokens). */
const TOKEN_STYLES = {
  filler: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 underline decoration-amber-500/60 decoration-wavy underline-offset-2',
  pronoun: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 underline decoration-indigo-500/50 underline-offset-2',
  pause: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 font-mono',
}

const TOKEN_LABELS = {
  filler: 'Filler words — hesitation markers ("um", "like")',
  pronoun: 'Pronoun overuse — vague references instead of naming things',
  pause: 'Pauses and trailing-off speech',
}

function AnnotatedTranscript({ transcription }) {
  const tokens = transcription?.linguistic_biomarkers?.annotated_tokens
  if (!Array.isArray(tokens) || tokens.length === 0) return null

  const presentTags = Object.keys(TOKEN_LABELS).filter(
    (tag) => tokens.some((t) => t.tag === tag),
  )
  const shown = tokens.slice(0, 400)

  return (
    <div className="p-3.5 rounded-xl bg-background border border-border space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
          Annotated transcript
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {presentTags.map((tag) => (
            <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border border-border ${TOKEN_STYLES[tag]}`}>
              {TOKEN_LABELS[tag].split(' — ')[0]}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm leading-loose text-foreground select-text">
        {shown.map((t, i) => {
          const cls = TOKEN_STYLES[t.tag]
          return cls
            ? <span key={i} className={`px-0.5 rounded ${cls}`} title={TOKEN_LABELS[t.tag]}>{t.word}{' '}</span>
            : <span key={i}>{t.word}{' '}</span>
        })}
        {tokens.length > shown.length && (
          <span className="text-foreground-muted text-xs"> … ({tokens.length - shown.length} more words)</span>
        )}
      </p>

      {presentTags.length > 0 && (
        <p className="text-[11px] text-foreground-muted leading-relaxed">
          {presentTags.map((tag) => TOKEN_LABELS[tag].split(' — ')[1]).join(' · ')}.
          These language patterns are observed heuristics, not diagnoses.
        </p>
      )}
    </div>
  )
}

function AcousticBiomarkersPanel({ sentiment, transcription }) {
  const acoustic = transcription?.acoustic_features || {}
  const jitter = sentiment.jitter_percent ?? acoustic.jitter_percent
  const shimmer = sentiment.shimmer_percent ?? acoustic.shimmer_percent
  const hnr = sentiment.hnr_db ?? acoustic.hnr_db
  const f0Mean = acoustic.f0_mean_hz
  const f0Std = acoustic.f0_std_hz
  const f1 = sentiment.formant_f1_hz ?? acoustic.formant_f1_hz
  const f2 = sentiment.formant_f2_hz ?? acoustic.formant_f2_hz
  const pauseRatio = acoustic.pause_ratio
  const pauseCount = acoustic.pause_count
  const articulationRate = acoustic.articulation_rate_syl_per_sec
  const riskScore = sentiment.vocal_risk_score ?? acoustic.vocal_risk_score
  const impression = sentiment.vocal_impression ?? acoustic.clinical_impression

  const hasAcoustics = jitter != null || shimmer != null || hnr != null || riskScore != null
  if (!hasAcoustics) return null

  // Risk styling
  const riskPct = riskScore != null ? Math.round(Number(riskScore) * 100) : null
  const riskColor = riskPct == null || riskPct < 30 ? 'text-emerald-500' : riskPct < 60 ? 'text-amber-500' : 'text-rose-500'
  const riskBg = riskPct == null || riskPct < 30 ? 'bg-emerald-500' : riskPct < 60 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="p-4 rounded-xl bg-background border border-purple-500/30 space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
            Acoustic Biomarkers (Vocal DSP & Micro-Perturbation)
          </span>
        </div>
        {riskPct != null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-foreground-muted font-medium">Vocal Risk Index:</span>
            <span className={`text-xs font-mono font-bold ${riskColor}`}>{riskPct}%</span>
          </div>
        )}
      </div>

      {riskPct != null && (
        <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border">
          <div
            className={`h-full ${riskBg} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(Math.max(riskPct, 4), 100)}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {jitter != null && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">Jitter (Local %)</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-mono font-bold text-foreground">
                {Number(jitter).toFixed(2)}%
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                Number(jitter) <= 1.04
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                {Number(jitter) <= 1.04 ? 'Norm <1.04%' : 'Elevated'}
              </span>
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">Pitch micro-perturbation</div>
          </div>
        )}

        {shimmer != null && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">Shimmer (Local %)</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-mono font-bold text-foreground">
                {Number(shimmer).toFixed(2)}%
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                Number(shimmer) <= 3.81
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                {Number(shimmer) <= 3.81 ? 'Norm <3.81%' : 'Elevated'}
              </span>
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">Amplitude instability</div>
          </div>
        )}

        {hnr != null && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">HNR (Harmonics/Noise)</div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-mono font-bold text-foreground">
                {Number(hnr).toFixed(1)} dB
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                Number(hnr) >= 20
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : Number(hnr) >= 15
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                {Number(hnr) >= 20 ? 'Norm >20dB' : 'Breathiness'}
              </span>
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">Vocal tract periodicity</div>
          </div>
        )}

        {f0Mean != null && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">Pitch F0 (Mean ± Std)</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1">
              {Math.round(Number(f0Mean))} Hz
              {f0Std != null && (
                <span className="text-xs font-normal text-foreground-muted"> ± {Math.round(Number(f0Std))} Hz</span>
              )}
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">Fundamental frequency</div>
          </div>
        )}

        {(f1 != null || f2 != null) && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">Formants (F1 / F2)</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1">
              {f1 != null ? Math.round(Number(f1)) : '—'} / {f2 != null ? Math.round(Number(f2)) : '—'} Hz
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">Vocal tract resonances</div>
          </div>
        )}

        {(pauseRatio != null || articulationRate != null || pauseCount != null) && (
          <div className="p-2.5 rounded-lg bg-surface/50 border border-border">
            <div className="text-[10px] text-foreground-muted uppercase font-bold">Speech Rhythm & Pauses</div>
            <div className="text-sm font-mono font-bold text-foreground mt-1">
              {pauseRatio != null ? `${Math.round(Number(pauseRatio) * 100)}% silence` : ''}
              {articulationRate != null ? ` · ${Number(articulationRate).toFixed(1)} syl/s` : ''}
            </div>
            <div className="text-[9px] text-foreground-muted mt-0.5">
              {pauseCount != null ? `${pauseCount} hesitation pauses detected` : 'Temporal rhythm analysis'}
            </div>
          </div>
        )}
      </div>

      {impression && (
        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-foreground-muted leading-relaxed">
          <span className="font-semibold text-foreground">Clinical Impression: </span>
          {impression}
        </div>
      )}
    </div>
  )
}

export function SpeechResults({ sentiment, transcription }) {
  if (!sentiment || Object.keys(sentiment).length === 0) return null

  const probability = transcription?.dementia_probability
  const prediction = transcription?.dementia_prediction

  return (
    <Section icon={Activity} title="Speech and Text Summary" color="#a855f7" defaultOpen={true}>
      <div className="space-y-4">
        <AnnotatedTranscript transcription={transcription} />

        <AcousticBiomarkersPanel sentiment={sentiment} transcription={transcription} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <DataRow label="Detected tone" value={sentiment.dominant_emotion || 'Not assessed'} />
          <DataRow label="Lexical density (heuristic)" value={sentiment.lexical_density || 'Not available'} />
          <DataRow label="Filler words (transcript count)" value={sentiment.filler_word_count ?? 'Not available'} />
          <DataRow label="Pause category" value={sentiment.pause_frequency || 'Not available'} />
          <DataRow label="Pitch variation category" value={sentiment.pitch_variation || 'Not available'} />
        </div>
        {probability != null && (
          <div className="p-3.5 rounded-xl bg-background border border-purple-300/60 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                Speech NLP screening signal (research model)
              </span>
              <span className="font-mono font-bold text-foreground text-sm shrink-0">
                {(probability * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {prediction === 'dementia'
                ? 'Model leans toward dementia-associated language patterns.'
                : 'Model leans toward control (non-dementia) language patterns.'}
              {' '}Included in the fusion calculation as a research-grade signal only.
            </p>
          </div>
        )}
        <p className="text-xs text-foreground-muted leading-relaxed">
          {sentiment.clinical_summary || 'Speech summaries are unavailable.'}{' '}
          {probability != null
            ? 'The speech NLP model output is a screening signal, not a diagnosis or a calibrated probability.'
            : 'Speech is not an input to the active fusion calculation.'}
        </p>
      </div>
    </Section>
  )
}
