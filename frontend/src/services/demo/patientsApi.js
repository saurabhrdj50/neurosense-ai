import demoDb from './database';

export const patientsApi = {
  getAll: async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { patients: demoDb.getPatients() };
  },

  getById: async (patientId) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const patient = demoDb.getPatientById(patientId);
    if (!patient) {
      throw new Error(`Patient ${patientId} not found in Demo Database`);
    }
    return patient;
  },

  create: async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return demoDb.savePatient(data);
  },

  update: async (patientId, data) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return demoDb.updatePatient(patientId, data);
  },

  delete: async (patientId) => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    demoDb.deletePatient(patientId);
    return { success: true, id: patientId };
  },

  export: (patientId) => {
    const patient = demoDb.getPatientById(patientId);
    const csvContent = [
      'Patient ID,Name,Age,Sex,Stage,Risk Score,MMSE,Attending Physician',
      `"${patient?.patient_id || patientId}","${patient?.name || 'Demo Patient'}",${patient?.age || 70},"${patient?.sex || 'Unknown'}","${patient?.stage || 'MCI'}",${patient?.risk_score || 0.45},${patient?.mmse || 24},"${patient?.attending_physician || 'Dr. Jenkins'}"`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `neurosense_patient_${patientId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportAll: () => {
    const patients = demoDb.getPatients();
    const headers = 'Patient ID,Name,Age,Sex,Stage,Risk Level,Education Years,Notes\n';
    const rows = patients.map(p =>
      `"${p.patient_id || ''}","${p.name || ''}",${p.age || 0},"${p.sex || ''}","${p.stage || 'Unassessed'}","${p.risk || 'Normal'}",${p.education_years || 0},"${(p.notes || '').replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'neurosense_patient_registry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
