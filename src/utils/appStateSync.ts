import {
  loadSavedExams,
  loadSavedKopConfig,
  loadSavedSchoolProfiles,
  STORAGE_KEY_EXAMS,
  STORAGE_KEY_KOP,
  STORAGE_KEY_PROFILES,
} from './storage';
import {
  type AiGatewayConfig,
  loadAiGatewayConfig,
  parseApiResponse,
  STORAGE_KEY_AI_GATEWAY,
} from './apiHelper';
import type { ExamPackage, SchoolKopConfig, SchoolKopProfile } from '../types/exam';

export interface AppStateSnapshot {
  exams: ExamPackage[];
  kopConfig: SchoolKopConfig;
  schoolProfiles: SchoolKopProfile[];
  aiGatewayConfig: AiGatewayConfig | null;
}

function readLocalAppState(): AppStateSnapshot {
  return {
    exams: loadSavedExams(),
    kopConfig: loadSavedKopConfig(),
    schoolProfiles: loadSavedSchoolProfiles(),
    aiGatewayConfig: loadAiGatewayConfig(),
  };
}

function applyAppState(state: AppStateSnapshot): void {
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(state.exams));
  localStorage.setItem(STORAGE_KEY_KOP, JSON.stringify(state.kopConfig));
  localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(state.schoolProfiles));
  if (state.aiGatewayConfig) {
    localStorage.setItem(STORAGE_KEY_AI_GATEWAY, JSON.stringify(state.aiGatewayConfig));
  } else {
    localStorage.removeItem(STORAGE_KEY_AI_GATEWAY);
  }
}

async function requestServerState(method: 'GET' | 'PUT', state?: AppStateSnapshot) {
  const response = await fetch('/api/app-state', {
    method,
    headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
    body: state ? JSON.stringify(state) : undefined,
  });
  return parseApiResponse<{ success: boolean; state: AppStateSnapshot | null }>(response);
}

export async function initializeAppState(): Promise<void> {
  const result = await requestServerState('GET');
  if (result.state) {
    applyAppState(result.state);
    return;
  }

  const localState = readLocalAppState();
  await requestServerState('PUT', localState);
  applyAppState(localState);
}

export async function syncAppState(): Promise<void> {
  await requestServerState('PUT', readLocalAppState());
}
