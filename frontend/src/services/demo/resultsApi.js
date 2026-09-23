export const resultsApi = {
  generateReport: async (results, patientInfo = null) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const reportText = `NEUROSENSE AI CLINICAL SUMMARY REPORT
Patient: ${patientInfo?.name || 'Demo Patient'} (${patientInfo?.patient_id || 'PAT-0101'})
Diagnosis Stage: ${results?.final_stage?.stage || 'Mild Cognitive Impairment (MCI)'}
Diagnostic Confidence: ${results?.final_stage?.confidence || 89.4}%
Assessment Timestamp: ${new Date().toLocaleString()}
    `;
    return new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  },

  getMusicRecommendation: async (stage = 'Mild Cognitive Impairment (MCI)', emotion = 'neutral') => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      playlist_name: 'Cognitive Harmony & Neuro-Calm Symphony',
      stage,
      emotion,
      recommendations: [
        { title: 'Mozart Sonata for Two Pianos in D Major (K. 448)', artist: 'Wolfgang Amadeus Mozart', duration: '8:24', therapeutic_focus: 'Spatial-Temporal Neuro-Stimulation' },
        { title: 'Weightless', artist: 'Marconi Union', duration: '8:08', therapeutic_focus: 'Autonomic Heart Rate Regulation & Anxiety Reduction' },
        { title: 'Clair de Lune', artist: 'Claude Debussy', duration: '5:02', therapeutic_focus: 'Parasympathetic Calming & Emotion Stabilization' },
        { title: 'Gymnopédie No.1', artist: 'Erik Satie', duration: '3:25', therapeutic_focus: 'Rhythmic Cognitive Synchronization' },
      ],
    };
  },

  chatWithAI: async (query) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      response: `[NeuroSense AI Clinical Assistant — Demo Mode]

Thank you for your inquiry: "${query}".

Based on clinical biomarkers for this patient cohort:
1. **Volumetric Imaging**: Hippocampal structures show mild medial temporal lobe atrophy consistent with MCI baseline.
2. **Fluid Biomarkers**: CSF Aβ42 levels indicate early plaque clearance changes.
3. **Clinical Recommendation**: Regular 6-month longitudinal MMSE and PET scan evaluation is advised.`,
      sources: ['ADNI-3 Clinical Benchmark Dataset', 'NeuroSense Multi-Modal Diagnostic Matrix'],
    };
  },
};
