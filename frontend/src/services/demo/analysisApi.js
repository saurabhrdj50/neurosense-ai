import demoDb from './database';

export const analysisApi = {
  runFullAnalysis: async (formData) => {
    // Simulate pipeline processing delay (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));

    let patientId = 'PAT-0101';
    let name = 'Eleanor Vance';
    let age = 72;
    let sex = 'Female';
    let educationYears = 16;
    let mmse = 24;
    let moca = 22;
    let patientText = '';
    let speechText = '';
    let riskFactors = {};

    if (formData instanceof FormData) {
      patientId = formData.get('patient_id') || patientId;
      name = formData.get('name') || name;
      if (formData.get('age')) age = Number(formData.get('age'));
      if (formData.get('sex')) sex = formData.get('sex');
      if (formData.get('education_years')) educationYears = Number(formData.get('education_years'));
      if (formData.get('patient_text')) patientText = formData.get('patient_text');
      if (formData.get('audio_text')) speechText = formData.get('audio_text');

      const cognStr = formData.get('cognitive_tests');
      if (cognStr) {
        try {
          const c = JSON.parse(cognStr);
          if (c.mmse) mmse = Number(c.mmse);
          if (c.moca) moca = Number(c.moca);
        } catch (e) {}
      }

      const riskStr = formData.get('risk_factors');
      if (riskStr) {
        try {
          riskFactors = JSON.parse(riskStr);
        } catch (e) {}
      }
    }

    // Dynamic diagnosis determination based on cognitive battery and risk burden
    let stage = 'Mild Cognitive Impairment (MCI)';
    let confidence = 87.5;
    if (mmse < 18 || moca < 16) {
      stage = 'Alzheimer\'s Disease (AD)';
      confidence = 92.1;
    } else if (mmse >= 27 && moca >= 26) {
      stage = 'Cognitively Normal (CN)';
      confidence = 94.8;
    }

    const mockResult = {
      status: 'success',
      patient_info: {
        patient_id: patientId,
        name,
        age,
        sex,
        education_years: educationYears,
      },
      final_stage: {
        stage,
        confidence,
        summary: `Multimodal diagnostic analysis established ${stage} with ${confidence.toFixed(1)}% AI confidence for ${name} (${patientId}). Findings reflect submitted cognitive tests (MMSE: ${mmse}, MoCA: ${moca}) and clinical profile.`,
      },
      mri: {
        stage,
        confidence,
        hippocampal_volume: 3.14,
        ventricle_volume: 38.2,
        whole_brain_volume: 1040,
        summary: 'Volumetric structural scan processed successfully.',
      },
      cognitive: {
        mmse,
        moca,
        composite_score: Math.round((mmse / 30) * 100),
        memory_recall: Math.round((mmse / 30) * 5),
        clock_draw: Math.round((moca / 30) * 5),
      },
      sentiment: {
        cognitive_risk_score: mmse < 24 ? 0.45 : 0.15,
        sentiment_label: mmse < 24 ? 'Hesitant / Pausing' : 'Fluent / Coherent',
      },
      risk_profile: {
        lancet_score: Object.keys(riskFactors).length * 12 || 35,
        overall_risk_score: Object.keys(riskFactors).length * 12 || 35,
      },
      created_at: new Date().toISOString(),
    };

    demoDb.saveSession({
      patient_id: patientId,
      patient_info: mockResult.patient_info,
      results: mockResult,
    });

    return mockResult;
  },

  analyzeMRI: async (file, gradcam = true) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      stage: 'Mild Cognitive Impairment (MCI)',
      confidence: 91.2,
      gradcam_available: gradcam,
    };
  },

  analyzeSentiment: async (text) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      dominant_emotion: 'calm',
      sentiment_score: 0.75,
      analyzed_text_length: text ? text.length : 0,
    };
  },

  evaluateCognitive: async (answers) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      composite_score: 82,
      evaluation: 'Mild hesitancy noted on delayed recall test.',
      answers_evaluated: Object.keys(answers || {}).length,
    };
  },

  assessRisk: async (factors) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      overall_risk_score: 42,
      risk_category: 'Moderate',
      factors_received: factors,
    };
  },

  transcribeAudio: async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      transcript: 'The patient answered the orientation and memory recall questions clearly with slight pauses.',
      vocal_tremor: false,
      speech_rate_wpm: 135,
    };
  },

  getPastAnalyses: async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sessions = demoDb.getSessions();
    return sessions.map((s) => ({
      session_id: s.session_id,
      patient_id: s.patient_id || s.patient_info?.patient_id || 'PAT-0101',
      patient_name: s.patient_info?.name || 'Unknown Patient',
      patient_info: s.patient_info,
      timestamp: s.timestamp || s.created_at || new Date().toISOString(),
      stage: s.results?.final_stage?.stage || 'Mild Cognitive Impairment (MCI)',
      confidence: s.results?.final_stage?.confidence || 88.4,
      results: s.results,
    }));
  },

  downloadPdfReport: async (results) => {
    const patientId = results?.patient_info?.patient_id || 'PAT-0101';
    const patientName = results?.patient_info?.name || 'Demo Patient';
    const stage = results?.final_stage?.stage || 'MCI';

    const mockPdfText = `%PDF-1.4
1 0 obj
<< /Title (NeuroSense AI Clinical Assessment Report - ${patientName}) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Count 1 /Kids [4 0 R] >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /Contents 5 0 R >>
endobj
5 0 obj
<< /Length 120 >>
stream
BT
/F1 12 Tf
50 700 TD
(NeuroSense AI Diagnostic Report) Tj
0 -20 TD
(Patient: ${patientName} [${patientId}]) Tj
0 -20 TD
(Classification Stage: ${stage}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 2 0 R >>
startxref
300
%%EOF`;

    const blob = new Blob([mockPdfText], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurosense_report_${patientId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
