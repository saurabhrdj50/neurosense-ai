/**
 * @fileoverview Synthetic 30-patient clinical dataset for the NeuroSense AI demo mode.
 *
 * Deliberately designed to cover the full Alzheimer's disease spectrum:
 * - 6 Healthy Controls
 * - 8 Mild Cognitive Impairment (MCI)
 * - 8 Early AD
 * - 5 Moderate AD
 * - 3 Advanced AD
 *
 * All patient names, MRN numbers, and clinical values are **entirely fictional**
 * and generated programmatically. No real patient data is used.
 * Values are derived from medically plausible ranges to produce a realistic
 * demonstration without compromising any individual's privacy.
 */

/**
 * Array of 30 synthetic demo patients ordered by disease severity.
 * Each patient record contains demographics, MRI metrics, SHAP feature
 * importance values, CSF/blood biomarkers, a longitudinal timeline, and
 * AI clinical insights.
 *
 * @type {Array<object>}
 */
export const DEMO_PATIENTS = Array.from({ length: 30 }, (_, index) => {
  const id = `PAT-${String(index + 101).padStart(4, '0')}`
  const ages = [62, 65, 68, 71, 74, 77, 80, 83, 69, 73, 76, 79, 82, 85, 64, 67, 70, 72, 75, 78, 81, 84, 66, 73, 77, 80, 83, 86, 63, 68]
  const names = [
    "Eleanor Vance", "Robert Chen", "Margaret Miller", "Arthur Pendelton", "Sylvia Thorne",
    "James Sterling", "Beatrice Montgomery", "Harold Finch", "Dorothy Gale", "William Harrison",
    "Clara Oswald", "George Banks", "Florence Nightingale", "Charles Darwin", "Evelyn Reed",
    "Walter White", "Grace Hopper", "Thomas Edison", "Alice Smith", "Benjamin Franklin",
    "Catherine Hayes", "David Ross", "Emma Watson", "Frank Castle", "Georgia O'Keeffe",
    "Henry Higgins", "Irene Adler", "John Watson", "Karen Page", "Louis Pasteur"
  ]
  const genders = ["Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male"]
  
  // Categorize diagnosis: 6 Healthy, 8 MCI, 8 Early AD, 5 Moderate AD, 3 Advanced AD
  let stage = "Healthy Control"
  let riskScore = 0.12 + (index % 5) * 0.03
  let mmse = 29 - (index % 2)
  let hippVol = 4.1 - (index % 3) * 0.1
  let abeta = 920 - (index % 4) * 20

  if (index >= 6 && index < 14) {
    stage = "Mild Cognitive Impairment (MCI)"
    riskScore = 0.42 + (index % 5) * 0.05
    mmse = 25 - (index % 3)
    hippVol = 3.3 - (index % 4) * 0.1
    abeta = 610 - (index % 5) * 25
  } else if (index >= 14 && index < 22) {
    stage = "Early AD"
    riskScore = 0.68 + (index % 5) * 0.04
    mmse = 21 - (index % 4)
    hippVol = 2.7 - (index % 3) * 0.1
    abeta = 480 - (index % 4) * 20
  } else if (index >= 22 && index < 27) {
    stage = "Moderate AD"
    riskScore = 0.84 + (index % 4) * 0.03
    mmse = 16 - (index % 4)
    hippVol = 2.1 - (index % 3) * 0.12
    abeta = 360 - (index % 4) * 18
  } else if (index >= 27) {
    stage = "Advanced AD"
    riskScore = 0.94 + (index % 3) * 0.02
    mmse = 10 - (index % 3)
    hippVol = 1.6 - (index % 2) * 0.1
    abeta = 270 - (index % 3) * 15
  }

  const roundedRisk = Number(Math.min(0.99, Math.max(0.05, riskScore)).toFixed(2))

  return {
    id,
    name: names[index],
    age: ages[index],
    gender: genders[index],
    mrn: `MRN-${982100 + index * 47}`,
    stage,
    riskScore: roundedRisk,
    confidence: Number((0.88 + (index % 7) * 0.015).toFixed(2)),
    scanDate: new Date(Date.now() - (index * 86400000 * 3)).toISOString().split('T')[0],
    attendingPhysician: index % 2 === 0 ? "Dr. Sarah Jenkins, MD" : "Dr. Michael Vance, PhD, MD",
    mmse,
    mriMetrics: {
      brainVolume: Number((1150 - (1 - mmse / 30) * 220).toFixed(1)),
      brainVolumeNormal: "1050 - 1250 cm³",
      brainVolumeStatus: mmse > 24 ? "Normal" : mmse > 18 ? "Mild Atrophy" : "Severe Atrophy",
      hippocampalVolume: Number(hippVol.toFixed(2)),
      hippocampalNormal: "3.5 - 4.5 cm³",
      hippocampalStatus: hippVol > 3.4 ? "Normal" : hippVol > 2.6 ? "Moderate Atrophy" : "Severe Atrophy",
      corticalThickness: Number((2.8 - (30 - mmse) * 0.035).toFixed(2)),
      corticalThicknessNormal: "2.4 - 2.9 mm",
      corticalThicknessStatus: mmse > 23 ? "Normal" : "Thinning",
      ventricleSize: Number((24 + (30 - mmse) * 1.6).toFixed(1)),
      ventricleSizeNormal: "15 - 35 cm³",
      ventricleSizeStatus: mmse < 20 ? "Enlarged" : "Normal",
      whiteMatterLoss: Number((2.1 + (30 - mmse) * 0.45).toFixed(1)),
      whiteMatterLossNormal: "< 4.0 %",
      whiteMatterLossStatus: mmse < 22 ? "Elevated" : "Normal"
    },
    shapFeatures: [
      { name: "Hippocampal Atrophy", contribution: Number(((30 - mmse) * 1.8).toFixed(1)), confidence: "94%", type: "positive", interpretation: "Significant volumetric reduction in medial temporal lobe" },
      { name: "Speech Pause Duration", contribution: Number(((30 - mmse) * 1.1).toFixed(1)), confidence: "89%", type: "positive", interpretation: "Increased hesitancy and hesitation pauses during speech test" },
      { name: "CSF Aβ42 Ratio", contribution: Number(((abeta < 550 ? (550 - abeta) * 0.08 : -(abeta - 550) * 0.05)).toFixed(1)), confidence: "96%", type: abeta < 550 ? "positive" : "negative", interpretation: abeta < 550 ? "Decreased CSF Aβ42 indicates plaque deposition" : "Normal CSF amyloid clearance" },
      { name: "MMSE Cognitive Score", contribution: Number((-(mmse - 18) * 1.2).toFixed(1)), confidence: "92%", type: mmse >= 24 ? "negative" : "positive", interpretation: mmse >= 24 ? "High cognitive baseline serves as protective factor" : "Marked deficit in orientation & memory recall" },
      { name: "Handwriting Tremor Amplitude", contribution: Number(((30 - mmse) * 0.6).toFixed(1)), confidence: "83%", type: "positive", interpretation: "Micro-tremors observed in spiral drawing trajectory" }
    ],
    biomarkers: {
      abeta42: Math.round(abeta),
      abetaNormal: "> 650 pg/mL",
      tau: Math.round(210 + (30 - mmse) * 18),
      tauNormal: "< 300 pg/mL",
      ptau181: Number((18 + (30 - mmse) * 2.2).toFixed(1)),
      ptau181Normal: "< 27 pg/mL",
      nfl: Number((12 + (30 - mmse) * 1.4).toFixed(1)),
      nflNormal: "< 20 pg/mL"
    },
    timeline: [
      { date: "2024-03-15", mmse: Math.min(30, mmse + 3), risk: Math.max(0.05, roundedRisk - 0.18), brainVol: Number((hippVol + 0.5).toFixed(2)), speechScore: 92, event: "Baseline Screening" },
      { date: "2024-09-10", mmse: Math.min(30, mmse + 2), risk: Math.max(0.05, roundedRisk - 0.10), brainVol: Number((hippVol + 0.3).toFixed(2)), speechScore: 86, event: "6-Month Follow-Up" },
      { date: "2025-03-20", mmse: Math.min(30, mmse + 1), risk: Math.max(0.05, roundedRisk - 0.04), brainVol: Number((hippVol + 0.1).toFixed(2)), speechScore: 78, event: "1-Year Clinical Evaluation" },
      { date: "2026-03-18", mmse, risk: roundedRisk, brainVol: hippVol, speechScore: Math.max(45, 90 - (30 - mmse) * 2.5), event: "Latest NeuroSense Scan" }
    ],
    clinicalInsights: {
      keyFindings: [
        `Patient exhibits markers consistent with ${stage}.`,
        `Hippocampal volume is currently ${hippVol} cm³ (${hippVol < 3.0 ? 'Bilateral reduction' : 'Within baseline'}).`,
        `MMSE score evaluated at ${mmse}/30.`
      ],
      riskFactors: [
        "Elevated CSF p-tau181 levels indicating neurofibrillary tangle progression.",
        "Increased speech hesitation rates in sentence formulation.",
        "Age above 65 baseline."
      ],
      protectiveFactors: [
        "Active social engagement and high educational background.",
        "Controlled blood pressure & normal cardiac profile."
      ],
      recommendations: [
        { test: "PET Amyloid Imaging Scan", confidence: 0.95, category: "Imaging" },
        { test: "Repeat Neuropsychological Battery in 6 months", confidence: 0.91, category: "Cognitive" },
        { test: "Plasma ApoE ε4 Genotyping", confidence: 0.88, category: "Laboratory" },
        { test: "Acetylcholinesterase Inhibitor Protocol Evaluation", confidence: 0.84, category: "Treatment" }
      ]
    }
  }
})

/**
 * Retrieves a demo patient by their PAT-XXXX identifier.
 * Falls back to the first patient if the ID is not found.
 *
 * @param {string} id  Patient ID in the format `PAT-XXXX`.
 * @returns {object}   The matching demo patient record.
 */
export function getDemoPatientById(id) {
  return DEMO_PATIENTS.find(p => p.id === id) || DEMO_PATIENTS[0]
}
