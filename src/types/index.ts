/** Structured data extracted from a call transcript */
export interface CallRecord {
  id?: number;
  caller_number: string;
  caller_name: string | null;
  summary: string;
  urgency: "low" | "medium" | "high";
  action_requested: string | null;
  transcript: string;
  duration_seconds: number;
  created_at?: string;
}

/** Payload received from ElevenLabs post-call webhook */
export interface ElevenLabsWebhookPayload {
  agent_id: string;
  conversation_id: string;
  status: "done" | "failed";
  transcript: TranscriptEntry[];
  metadata: Record<string, unknown>;
  call_duration_secs: number;
  caller_id?: string;
}

/** Single turn in the conversation transcript */
export interface TranscriptEntry {
  role: "agent" | "user";
  message: string;
  timestamp?: number;
}

/** Parsed result from transcript analysis */
export interface TranscriptAnalysis {
  caller_name: string | null;
  summary: string;
  urgency: "low" | "medium" | "high";
  action_requested: string | null;
}

/** Notification payload sent to the chosen notification channel */
export interface NotificationPayload {
  caller_name: string | null;
  caller_number: string;
  summary: string;
  urgency: "low" | "medium" | "high";
  action_requested: string | null;
  timestamp: string;
}
