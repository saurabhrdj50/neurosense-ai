/**
 * NeuroSense AI - Clinical & System Data Type Definitions
 */

export type Role = 'doctor' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  licenseNumber?: string;
  specialty?: string;
  hospitalAffiliation?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mrn: string; // Medical Record Number
  riskLevel: 'Low' | 'Moderate' | 'High';
  lastScanDate: string;
  condition: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  category: string;
}

export interface DiagnosticResult {
  analysisId: string;
  patientId: string;
  timestamp: string;
  riskScore: number;
  confidenceScore: number;
  primaryDiagnosis: string;
  shapFeatures: FeatureImportance[];
  recommendations: string[];
  findingsSummary: string;
}

export interface ClinicalNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'info' | 'system';
  patientId?: string;
}
