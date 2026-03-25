/**
 * Clinical Decision Support Component
 */
import { useState } from 'react';

export function ClinicalDecisionSupportForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    stage: 1,
    age: 65,
    mmse_score: 24,
    comorbidities: [],
    current_medications: [],
  });

  const [comorbidityInput, setComorbidityInput] = useState('');

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addComorbidity = () => {
    if (comorbidityInput && !formData.comorbidities.includes(comorbidityInput)) {
      setFormData(prev => ({
        ...prev,
        comorbidities: [...prev.comorbidities, comorbidityInput]
      }));
      setComorbidityInput('');
    }
  };

  const removeComorbidity = (item) => {
    setFormData(prev => ({
      ...prev,
      comorbidities: prev.comorbidities.filter(c => c !== item)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Clinical Decision Support</h3>
      <p className="text-sm text-gray-600">Generate treatment recommendations and prognosis</p>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Disease Stage (0-5)</label>
          <select
            value={formData.stage}
            onChange={(e) => handleChange('stage', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value={0}>Normal Cognition</option>
            <option value={1}>Very Mild Dementia</option>
            <option value={2}>Mild Dementia</option>
            <option value={3}>Moderate Dementia</option>
            <option value={4}>Moderately Severe</option>
            <option value={5}>Severe Dementia</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Patient Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleChange('age', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">MMSE Score</label>
          <input
            type="number"
            min="0"
            max="30"
            value={formData.mmse_score}
            onChange={(e) => handleChange('mmse_score', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Comorbidities</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={comorbidityInput}
            onChange={(e) => setComorbidityInput(e.target.value)}
            placeholder="e.g., diabetes, hypertension"
            className="flex-1 block rounded-md border-gray-300 shadow-sm"
          />
          <button
            type="button"
            onClick={addComorbidity}
            className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.comorbidities.map((c, i) => (
            <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm">
              {c}
              <button
                type="button"
                onClick={() => removeComorbidity(c)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
      >
        {isLoading ? 'Generating...' : 'Generate Recommendations'}
      </button>
    </form>
  );
}

export function ClinicalDecisionSupportResults({ results }) {
  if (!results) return null;

  const { treatment_plan, prognosis, clinical_trials, patient_summary } = results;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900">Patient Summary</h4>
        <p>Stage: {patient_summary?.stage_name} | Age: {patient_summary?.age} | MMSE: {patient_summary?.mmse_score}</p>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3">Pharmacological Treatments</h4>
        <div className="space-y-3">
          {treatment_plan?.pharmacological?.map((tx, i) => (
            <div key={i} className="bg-white border rounded-lg p-4">
              <h5 className="font-medium">{tx.treatment}</h5>
              <p className="text-sm text-gray-600 mt-1">{tx.reason}</p>
              {tx.expected_benefit && (
                <p className="text-sm text-green-600 mt-1">Expected: {tx.expected_benefit}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3">Non-Pharmacological Interventions</h4>
        <div className="grid grid-cols-2 gap-3">
          {treatment_plan?.non_pharmacological?.map((npx, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-sm">{npx.category}</h5>
              <p className="text-xs text-gray-600">{npx.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-lg mb-3">Prognosis</h4>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm">
            Adjusted progression rate: {prognosis?.adjusted_rate} 
            <span className="ml-4">Survival from diagnosis: {prognosis?.survival?.median_survival_from_diagnosis_years} years</span>
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
            {Object.entries(prognosis?.timeline || {}).map(([key, value]) => (
              <div key={key} className="bg-white rounded p-2 text-center">
                <div className="font-medium">{key.replace('_', ' ')}</div>
                <div className="text-gray-600">{value?.stage_name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {clinical_trials?.matching_trials?.length > 0 && (
        <div>
          <h4 className="font-semibold text-lg mb-3">Matching Clinical Trials</h4>
          <div className="space-y-3">
            {clinical_trials.matching_trials.slice(0, 3).map((trial, i) => (
              <div key={i} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="font-medium">{trial.name}</h5>
                <p className="text-sm text-purple-700">{trial.phase} - {trial.status}</p>
                <p className="text-xs mt-1">Drug: {trial.drug}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-600">
        <p><strong>Disclaimer:</strong> {results.disclaimer}</p>
      </div>
    </div>
  );
}
