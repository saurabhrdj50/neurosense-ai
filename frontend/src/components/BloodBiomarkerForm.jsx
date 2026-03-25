/**
 * Blood Biomarker Analysis Component
 */
import { useState } from 'react';

export function BloodBiomarkerForm({ onSubmit, isLoading }) {
  const [biomarkers, setBiomarkers] = useState({
    amyloid_beta_42: '',
    total_tau: '',
    phosphorylated_tau_181: '',
    neurofilament_light: '',
    gfap: '',
    homocysteine: '',
    vitamin_b12: '',
    folate: '',
  });

  const handleChange = (name, value) => {
    setBiomarkers(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const results = {};
    Object.entries(biomarkers).forEach(([key, value]) => {
      if (value) results[key] = parseFloat(value);
    });
    onSubmit({ results });
  };

  const biomarkerInfo = {
    amyloid_beta_42: { name: 'Amyloid Beta 42', unit: 'pg/mL', normal: '500-1000' },
    total_tau: { name: 'Total Tau', unit: 'pg/mL', normal: '0-300' },
    phosphorylated_tau_181: { name: 'Phosphorylated Tau 181', unit: 'pg/mL', normal: '0-60' },
    neurofilament_light: { name: 'Neurofilament Light', unit: 'pg/mL', normal: '0-200' },
    gfap: { name: 'GFAP', unit: 'ng/mL', normal: '0-120' },
    homocysteine: { name: 'Homocysteine', unit: 'μmol/L', normal: '5-15' },
    vitamin_b12: { name: 'Vitamin B12', unit: 'pmol/L', normal: '150-600' },
    folate: { name: 'Folate', unit: 'nmol/L', normal: '7-45' },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Blood Biomarker Analysis</h3>
      <p className="text-sm text-gray-600">Enter biomarker values to analyze AD risk</p>
      
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(biomarkerInfo).map(([key, info]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700">
              {info.name}
              <span className="text-gray-500 text-xs ml-2">(Normal: {info.normal} {info.unit})</span>
            </label>
            <input
              type="number"
              step="any"
              value={biomarkers[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="Enter value"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isLoading || Object.values(biomarkers).every(v => !v)}
        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50"
      >
        {isLoading ? 'Analyzing...' : 'Analyze Biomarkers'}
      </button>
    </form>
  );
}

export function BloodBiomarkerResults({ results }) {
  if (!results) return null;

  const { biomarkers, risk_assessment } = results;

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${risk_assessment?.ad_probability_from_blood > 50 ? 'bg-red-50' : 'bg-green-50'}`}>
        <h4 className="font-semibold text-lg">Risk Assessment</h4>
        <p className="text-2xl font-bold">
          {risk_assessment?.blood_biomarker_score}/100
        </p>
        <p className="text-sm text-gray-600">
          AD Probability from Blood: {risk_assessment?.ad_probability_from_blood}%
        </p>
        <p className="mt-2">{risk_assessment?.interpretation}</p>
      </div>

      {biomarkers?.critical?.length > 0 && (
        <div className="bg-red-100 border border-red-400 rounded-lg p-4">
          <h4 className="font-semibold text-red-800">Critical Findings</h4>
          <ul className="mt-2 space-y-1">
            {biomarkers.critical.map((finding, i) => (
              <li key={i} className="text-sm text-red-700">
                {finding.name}: {finding.value} {finding.unit}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Biomarker</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {biomarkers?.analyzed?.map((marker, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-sm">{marker.name}</td>
                <td className="px-4 py-2 text-sm">{marker.value} {marker.unit}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    marker.status === 'normal' ? 'bg-green-100 text-green-800' :
                    marker.status === 'abnormal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {marker.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
