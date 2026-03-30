/** Structured data extracted from a call transcript */
export interface CallRecord {
  id?: number;
  conversation_id: string;
  caller_number: string;
  caller_name: string | null;
  summary: string;
  urgency: "low" | "medium" | "high";
  action_requested: string | null;
  transcript: string;
  duration_seconds: number;
  notification_sent?: number;
  created_at?: string;
}

// ── ElevenLabs Webhook Types ──

/** Top-level webhook envelope from ElevenLabs */
export interface ElevenLabsWebhookEnvelope {
  type: "post_call_transcription";
  event_timestamp?: number;
  data: ElevenLabsWebhookData;
}

/** The data object inside the webhook envelope. Supports both legacy and current formats. */
export interface ElevenLabsWebhookData {
  // Current format (post Aug 2025, matches GET Conversation API)
  id?: string;
  status: string;
  duration?: number;
  start_time?: string;
  end_time?: string;
  has_audio?: boolean;
  has_user_audio?: boolean;
  has_response_audio?: boolean;

  // Legacy format fields
  agent_id?: string;
  conversation_id?: string;
  user_id?: string;

  transcript: ElevenLabsTranscriptEntry[];

  metadata?: ElevenLabsMetadata;
  analysis?: ElevenLabsAnalysis;
  conversation_initiation_client_data?: {
    conversation_config_override?: Record<string, unknown>;
    custom_llm_extra_body?: Record<string, unknown>;
    dynamic_variables?: Record<string, string>;
  };
}

/** Transcript entry — handles both legacy (role/message) and current (speaker/text) formats */
export interface ElevenLabsTranscriptEntry {
  // Current format
  speaker?: string;
  text?: string;
  start?: number;
  end?: number;

  // Legacy format
  role?: string;
  message?: string;
  time_in_call_secs?: number;
  tool_calls?: unknown[] | null;
  tool_results?: unknown[] | null;
  feedback?: unknown | null;
  conversation_turn_metrics?: Record<string, unknown> | null;
}

export interface ElevenLabsMetadata {
  start_time_unix_secs?: number;
  call_duration_secs?: number;
  cost?: number;
  termination_reason?: string;
  authorization_method?: string;
  deletion_settings?: Record<string, unknown>;
  feedback?: { overall_score: number | null; likes: number; dislikes: number };
  charging?: Record<string, unknown>;
}

export interface ElevenLabsAnalysis {
  transcript_summary?: string;
  call_successful?: string;
  evaluation_criteria_results?: Record<string, unknown>;
  data_collection_results?: Record<string, unknown>;
  // Current format fields
  sentiment?: string;
  topics?: string[];
}

// ── Internal Types ──

/** Normalized transcript entry for internal processing */
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

/** Notification payload sent to SMS */
export interface NotificationPayload {
  caller_name: string | null;
  caller_number: string;
  summary: string;
  urgency: "low" | "medium" | "high";
  action_requested: string | null;
  timestamp: string;
}
