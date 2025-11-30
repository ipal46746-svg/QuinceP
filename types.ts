export enum AppState {
  IDLE = 'IDLE',
  DRAWING = 'DRAWING',
  REFLECTING = 'REFLECTING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
}

export enum VideoPhase {
  IDLE = 'IDLE',          // Initial state before camera starts
  PREVIEW_1 = 'PREVIEW_1', // Camera on, showing Q1, waiting to start
  RECORDING_1 = 'RECORDING_1',
  INPUT_1 = 'INPUT_1',    // Manual text input after recording 1 (or instead of)
  ANALYZING_1 = 'ANALYZING_1',
  FEEDBACK_1 = 'FEEDBACK_1', // Showing feedback for V1 and Q2
  RECORDING_2 = 'RECORDING_2',
  INPUT_2 = 'INPUT_2',    // Manual text input after recording 2
  ANALYZING_2 = 'ANALYZING_2',
  FINAL_FEEDBACK = 'FINAL_FEEDBACK'
}

export interface WordCard {
  id: number;
  text: string;
}

export interface ImageCard {
  id: number;
  imageUrl: string;
}

export interface DrawResult {
  word: WordCard;
  image: ImageCard;
}

export interface AnalysisResponse {
  summary: string;
  interpretation: string;
  guidance: string;
  followUpQuestion: string;
}

export interface VideoAnalysisResponse {
  transcription: string;
  emotionalFeedback: string;
  nextQuestion?: string; // Present in round 1
  finalClosing?: string; // Present in round 2
}