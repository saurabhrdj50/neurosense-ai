/**
 * Neuropsychological Assessment Component
 */
import { useState } from 'react';

export function NeuropsychologicalForm({ onSubmit, isLoading }) {
  const [cognitiveData, setCognitiveData] = useState({
    mmse: {
      orientation: 10,
      registration: 3,
      attention: 5,
      recall: 3,
      language: 8,
    },
    moca: {
      visuospatial: 4,
      executive: 4,
      attention: 6,
      language: 5,
      abstract: 2,
      delayed_recall: 5,
      orientation: 6,
    },
    cdr: {
      memory: 0,
      orientation: 0,
      judgment: 0,
      community_affairs: 0,
      home_hobbies: 0,
      personal_care: 0,
    },
  });

  const handleChange = (test, domain, value) => {
    setCognitiveData(prev => ({
      ...prev,
      [test]: { ...prev[test], [domain]: parseInt(value) || 0 }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(cognitiveData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h3 className="text-lg font-semibold text-gray-900">Neuropsychological Assessment Battery</h3>
      <p className="text-sm text-gray-600">Complete cognitive testing including MMSE, MoCA, and CDR</p>

      {/* MMSE Section */}
      <div className="bg-blue-50 border rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-4">MMSE (Mini-Mental State Examination)</h4>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Orientation (max 10)</label>
            <input
              type="number"
              min="0"
              max="10"
              value={cognitiveData.mmse.orientation}
              onChange={(e) => handleChange('mmse', 'orientation', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Registration (max 3)</label>
            <input
              type="number"
              min="0"
              max="3"
              value={cognitiveData.mmse.registration}
              onChange={(e) => handleChange('mmse', 'registration', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Attention (max 5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={cognitiveData.mmse.attention}
              onChange={(e) => handleChange('mmse', 'attention', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Recall (max 3)</label>
            <input
              type="number"
              min="0"
              max="3"
              value={cognitiveData.mmse.recall}
              onChange={(e) => handleChange('mmse', 'recall', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Language (max 8)</label>
            <input
              type="number"
              min="0"
              max="8"
              value={cognitiveData.mmse.language}
              onChange={(e) => handleChange('mmse', 'language', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-blue-700">
          MMSE Total: {Object.values(cognitiveData.mmse).reduce((a, b) => a + b, 0)}/30
        </p>
      </div>

      {/* MoCA Section */}
      <div className="bg-green-50 border rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-4">MoCA (Montreal Cognitive Assessment)</h4>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Visuospatial (max 4)</label>
            <input
              type="number"
              min="0"
              max="4"
              value={cognitiveData.moca.visuospatial}
              onChange={(e) => handleChange('moca', 'visuospatial', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Executive (max 4)</label>
            <input
              type="number"
              min="0"
              max="4"
              value={cognitiveData.moca.executive}
              onChange={(e) => handleChange('moca', 'executive', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Attention (max 6)</label>
            <input
              type="number"
              min="0"
              max="6"
              value={cognitiveData.moca.attention}
              onChange={(e) => handleChange('moca', 'attention', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Language (max 5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={cognitiveData.moca.language}
              onChange={(e) => handleChange('moca', 'language', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Abstract (max 2)</label>
            <input
              type="number"
              min="0"
              max="2"
              value={cognitiveData.moca.abstract}
              onChange={(e) => handleChange('moca', 'abstract', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Delayed Recall (max 5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={cognitiveData.moca.delayed_recall}
              onChange={(e) => handleChange('moca', 'delayed_recall', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Orientation (max 6)</label>
            <input
              type="number"
              min="0"
              max="6"
              value={cognitiveData.moca.orientation}
              onChange={(e) => handleChange('moca', 'orientation', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-green-700">
          MoCA Total: {Object.values(cognitiveData.moca).reduce((a, b) => a + b, 0)}/30
        </p>
      </div>

      {/* CDR Section */}
      <div className="bg-purple-50 border rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-4">CDR (Clinical Dementia Rating)</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Memory (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.memory}
              onChange={(e) => handleChange('cdr', 'memory', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Orientation (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.orientation}
              onChange={(e) => handleChange('cdr', 'orientation', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Judgment (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.judgment}
              onChange={(e) => handleChange('cdr', 'judgment', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Community Affairs (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.community_affairs}
              onChange={(e) => handleChange('cdr', 'community_affairs', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Home Hobbies (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.home_hobbies}
              onChange={(e) => handleChange('cdr', 'home_hobbies', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Personal Care (0-3)</label>
            <input
              type="number"
              min="0"
              max="3"
              step="0.5"
              value={cognitiveData.cdr.personal_care}
              onChange={(e) => handleChange('cdr', 'personal_care', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {isLoading ? 'Processing...' : 'Run Assessment'}
      </button>
    </form>
  );
}

export function NeuropsychologicalResults({ results }) {
  if (!results) return null;

  const { mmse, moca, cdr, battery_summary } = results;

  const getScoreColor = (score, max) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {/* MMSE Result */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-blue-900">MMSE</h4>
          <div className={`text-3xl font-bold mt-2 ${getScoreColor(mmse?.adjusted_score || 0, 30)}`}>
            {mmse?.adjusted_score || 0}/30
          </div>
          <p className="text-sm text-gray-600 mt-1">{mmse?.classification}</p>
          <p className="text-xs text-gray-500 mt-2">Percentile: {mmse?.percentile}</p>
        </div>

        {/* MoCA Result */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-green-900">MoCA</h4>
          <div className={`text-3xl font-bold mt-2 ${getScoreColor(moca?.total_score || 0, 30)}`}>
            {moca?.total_score || 0}/30
          </div>
          <p className="text-sm text-gray-600 mt-1">{moca?.classification}</p>
          <p className="text-xs text-gray-500 mt-2">Percentile: {moca?.percentile}</p>
        </div>

        {/* CDR Result */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-purple-900">CDR</h4>
          <div className={`text-3xl font-bold mt-2 ${getScoreColor(cdr?.score || 0, 3)}`}>
            {cdr?.score || 0}
          </div>
          <p className="text-sm text-gray-600 mt-1">{cdr?.stage}</p>
          <p className="text-xs text-gray-500 mt-2">Functional: {cdr?.functional_assessment?.driving}</p>
        </div>
      </div>

      {/* Battery Summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-semibold">Assessment Summary</h4>
        <p className="text-sm mt-1">{battery_summary?.overall_impression}</p>
        <div className="mt-2">
          <span className={`inline-block px-2 py-1 rounded text-sm ${
            battery_summary?.cognitive_index >= 80 ? 'bg-green-100 text-green-800' :
            battery_summary?.cognitive_index >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            Cognitive Index: {battery_summary?.cognitive_index}
          </span>
        </div>
        {battery_summary?.domain_patterns?.length > 0 && (
          <div className="mt-3 text-sm">
            <strong>Domain Patterns:</strong>
            <ul className="list-disc list-inside text-gray-600">
              {battery_summary.domain_patterns.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Test Consistency */}
      <div className={`p-4 rounded-lg ${
        battery_summary?.test_consistency?.consistent ? 'bg-green-50' : 'bg-yellow-50'
      }`}>
        <h4 className="font-semibold">Test Consistency</h4>
        <p className="text-sm">{battery_summary?.test_consistency?.note}</p>
      </div>

      {/* Clinical Impression */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900">Clinical Impression</h4>
        <p className="text-sm mt-1">{battery_summary?.testing_impression}</p>
      </div>
    </div>
  );
}
