/**
 * Comprehensive Analysis Page Component
 * Integrates all new analysis features
 */
import { useState } from 'react';
import { BloodBiomarkerForm, BloodBiomarkerResults } from './BloodBiomarkerForm';
import { ClinicalDecisionSupportForm, ClinicalDecisionSupportResults } from './ClinicalDecisionSupport';
import { NeuropsychologicalForm, NeuropsychologicalResults } from './NeuropsychologicalAssessment';
import { enhancedAnalysisApi } from '../api/client';

export function ComprehensiveAnalysis() {
  const [activeTab, setActiveTab] = useState('neuropsychological');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const tabs = [
    { id: 'neuropsychological', label: 'Neuropsychological', icon: '🧠' },
    { id: 'biomarkers', label: 'Blood Biomarkers', icon: '🩸' },
    { id: 'clinical', label: 'Clinical CDS', icon: '💊' },
    { id: 'comprehensive', label: 'Full Analysis', icon: '📊' },
  ];

  const handleSubmit = async (data) => {
    setIsLoading(true);
    setResults(null);
    try {
      let response;
      switch (activeTab) {
        case 'neuropsychological':
          response = await enhancedAnalysisApi.runNeuropsychological(data);
          break;
        case 'biomarkers':
          response = await enhancedAnalysisApi.analyzeBloodBiomarkers(data);
          break;
        case 'clinical':
          response = await enhancedAnalysisApi.clinicalDecisionSupport(data);
          break;
        case 'comprehensive':
          response = await enhancedAnalysisApi.runComprehensive({
            patient_info: data,
            mri_results: data.mri_results || {},
            cognitive_results: data.cognitive_results || {},
            biomarkers: data.biomarkers || {},
          });
          break;
        default:
          break;
      }
      setResults(response.data.results);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'neuropsychological':
        return <NeuropsychologicalForm onSubmit={handleSubmit} isLoading={isLoading} />;
      case 'biomarkers':
        return <BloodBiomarkerForm onSubmit={handleSubmit} isLoading={isLoading} />;
      case 'clinical':
        return <ClinicalDecisionSupportForm onSubmit={handleSubmit} isLoading={isLoading} />;
      case 'comprehensive':
        return <ComprehensiveForm onSubmit={handleSubmit} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const renderResults = () => {
    if (!results) return null;

    switch (activeTab) {
      case 'neuropsychological':
        return <NeuropsychologicalResults results={results} />;
      case 'biomarkers':
        return <BloodBiomarkerResults results={results} />;
      case 'clinical':
        return <ClinicalDecisionSupportResults results={results} />;
      case 'comprehensive':
        return <ComprehensiveResults results={results} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comprehensive Alzheimer's Assessment</h1>

      <div className="flex space-x-1 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResults(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          {renderForm()}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : renderResults() || (
            <p className="text-gray-500 text-center h-64 flex items-center justify-center">
              Submit the form to see results
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ComprehensiveForm({ onSubmit, isLoading }) {
  const [patientData, setPatientData] = useState({
    name: '',
    age: 65,
    mri_results: { stage: 'Non Demented', confidence: 85 },
    mmse_score: 24,
    biomarkers: {},
  });

  const handleChange = (field, value) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(patientData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Comprehensive Analysis</h3>
      <p className="text-sm text-gray-600">Run full multimodal analysis including all assessment tools</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient Name</label>
          <input
            type="text"
            value={patientData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Enter patient name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Age</label>
          <input
            type="number"
            value={patientData.age}
            onChange={(e) => handleChange('age', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">MRI Stage</label>
          <select
            value={patientData.mri_results.stage}
            onChange={(e) => handleChange('mri_results', { ...patientData.mri_results, stage: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="Non Demented">Non Demented</option>
            <option value="Very Mild Demented">Very Mild Demented</option>
            <option value="Mild Demented">Mild Demented</option>
            <option value="Moderate Demented">Moderate Demented</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">MMSE Score</label>
          <input
            type="number"
            min="0"
            max="30"
            value={patientData.mmse_score}
            onChange={(e) => handleChange('mmse_score', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {isLoading ? 'Running Analysis...' : 'Run Full Analysis'}
      </button>
    </form>
  );
}

function ComprehensiveResults({ results }) {
  if (!results) return null;

  const { patient_summary, cognitive_assessment, mri_results, biomarkers, clinical_support } = results;

  return (
    <div className="space-y-6 overflow-auto max-h-[600px]">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900">Patient Summary</h4>
        <p>{patient_summary?.name} | Age: {patient_summary?.age}</p>
      </div>

      {cognitive_assessment && (
        <div>
          <h4 className="font-semibold mb-2">Cognitive Assessment</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-gray-50 p-2 rounded">
              MMSE: {cognitive_assessment.mmse?.score}/30
            </div>
            <div className="bg-gray-50 p-2 rounded">
              MoCA: {cognitive_assessment.moca?.score}/30
            </div>
          </div>
        </div>
      )}

      {biomarkers && (
        <div>
          <h4 className="font-semibold mb-2">Blood Biomarkers</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p>Risk Score: {biomarkers.risk_assessment?.blood_biomarker_score}/100</p>
            <p>AD Probability: {biomarkers.risk_assessment?.ad_probability_from_blood}%</p>
          </div>
        </div>
      )}

      {clinical_support && (
        <div>
          <h4 className="font-semibold mb-2">Clinical Recommendations</h4>
          <div className="space-y-2">
            {clinical_support.treatment_plan?.pharmacological?.slice(0, 2).map((tx, i) => (
              <div key={i} className="bg-green-50 p-2 rounded text-sm">
                {tx.treatment}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ComprehensiveAnalysis;
