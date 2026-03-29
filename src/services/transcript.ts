import type { TranscriptEntry, TranscriptAnalysis } from "../types/index.js";

/**
 * Parse a conversation transcript to extract structured call data.
 *
 * V1: Simple heuristic extraction.
 * Future: Could use an LLM for richer analysis.
 */
export function analyzeTranscript(
  transcript: TranscriptEntry[]
): TranscriptAnalysis {
  const userMessages = transcript
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.message);

  const fullText = userMessages.join(" ");

  // Placeholder: extract caller name from first user message
  const callerName = extractCallerName(userMessages[0] ?? "");

  // Placeholder: summarize by taking the first ~200 chars of user speech
  const summary =
    fullText.length > 200 ? fullText.slice(0, 200) + "..." : fullText;

  return {
    caller_name: callerName,
    summary: summary || "No message left.",
    urgency: "medium",
    action_requested: null,
  };
}

/** Attempt to extract a name from the caller's first message */
function extractCallerName(firstMessage: string): string | null {
  // Simple pattern: "This is [Name]" or "My name is [Name]"
  const patterns = [
    /(?:this is|my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = firstMessage.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}
