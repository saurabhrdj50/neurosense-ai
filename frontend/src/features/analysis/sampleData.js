/**
 * Sample-data mode — lets a first-time user run a complete analysis without
 * any real patient material. Everything here is fictional demo content: the
 * MRI is a bundled illustrative image, the "speech sample" is a written
 * transcript (the pipeline accepts text-only speech input), and the
 * cognitive breakdown mirrors the derivation in CognitiveStep so the
 * step's own summary recomputes consistently when the user opens it.
 */

export const SAMPLE_PATIENT = {
  name: 'Eleanor Sample',
  age: 71,
  sex: 'F',
  patient_id: 'DEMO-001',
  education_years: 12,
  notes: 'Demo profile bundled with NeuroSense for exploring the full workflow. Not a real patient.',
}

export const SAMPLE_PATIENT_TEXT =
  'Patient is a 71-year-old retired teacher brought in by her daughter, who reports ' +
  'increasing word-finding difficulty and repetition of questions over the past year. ' +
  'No vascular events; hypertension managed with diet. Family history: mother had ' +
  '"memory problems" in her late 70s. Sleep unremarkable. Referred for multimodal screening.'

/* Written speech-sample with the language patterns the transcriber tags:
   hesitation fillers, vague pronoun references, and "..." pauses. */
export const SAMPLE_SPEECH_TEXT =
  'Um ... so in the morning I usually get up, you know, around seven or ... eight, ' +
  'and I make the coffee and, uh, I take my pills. Then my daughter, she comes by, ' +
  'like, most days, and we, um ... we talk about the thing, the grocery things. ' +
  'I like to do the crossword but lately it is ... it is harder, you know, to find ' +
  'the words. In the afternoon I watch my shows and then she makes dinner, and, uh ... ' +
  'we play cards. I have lived here since, hmm, since my husband passed ... it has ' +
  'been some years now.'

const SAMPLE_BREAKDOWN = {
  orient_date: 4, orient_place: 4, register_3words: 3, delay_recall: 2,
  digit_span_fwd: 3, serial_7: 3, animal_fluency: 3, object_naming: 4,
  sentence_compreh: 4, multi_step_cmd: 3, logical_reason: 3, abstraction: 3,
  months_reverse: 2, problem_solve: 3, auto_memory: 3,
}

const SAMPLE_DOMAINS = {
  orientation: ['orient_date', 'orient_place'],
  immediate_memory: ['register_3words'],
  delayed_memory: ['delay_recall'],
  working_memory: ['digit_span_fwd'],
  attention: ['serial_7'],
  verbal_fluency: ['animal_fluency'],
  language: ['object_naming', 'sentence_compreh'],
  executive_function: ['multi_step_cmd', 'months_reverse'],
  reasoning: ['logical_reason', 'abstraction'],
  problem_solving: ['problem_solve'],
  episodic_memory: ['auto_memory'],
}

/* Mirrors CognitiveStep's derivation (composite = earned/possible*100). */
export function buildSampleCognitive() {
  const domains = {}
  Object.entries(SAMPLE_DOMAINS).forEach(([domain, ids]) => {
    const score = ids.reduce((s, id) => s + SAMPLE_BREAKDOWN[id], 0)
    domains[domain] = { score, max: ids.length * 4, pct: Math.round((score / (ids.length * 4)) * 100) }
  })
  const earned = Object.values(SAMPLE_BREAKDOWN).reduce((s, v) => s + v, 0)
  const possible = Object.keys(SAMPLE_BREAKDOWN).length * 4
  const composite = Math.round((earned / possible) * 100)

  return {
    screening_breakdown: SAMPLE_BREAKDOWN,
    domains,
    composite_score: composite,
    questions_completed: Object.keys(SAMPLE_BREAKDOWN).length,
    nia_aa_stage: composite >= 80 ? 'Normal Cognition' : composite >= 70 ? 'Subtle Decline' : 'Screening In Progress',
    // No fabricated mmse/moca — matches CognitiveStep's payload (see the
    // comment in its derived-state effect).
  }
}

/** Fetch the bundled illustrative MRI image as a File the wizard can submit. */
export async function loadSampleMriFile() {
  const res = await fetch('/images/mri_3d_brain_scan.png')
  if (!res.ok) throw new Error('Sample MRI image unavailable')
  const blob = await res.blob()
  return new File([blob], 'sample_mri_scan.png', { type: 'image/png' })
}
