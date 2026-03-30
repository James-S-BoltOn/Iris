import type { TranscriptEntry, TranscriptAnalysis } from "../types/index.js";

/**
 * Analyze a conversation transcript to extract structured call data.
 *
 * If ElevenLabs provides a transcript_summary (via their analysis), we use
 * that directly. Otherwise, we fall back to heuristic extraction.
 */
export function analyzeTranscript(
  transcript: TranscriptEntry[],
  elevenLabsSummary?: string
): TranscriptAnalysis {
  const userMessages = transcript
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.message);

  const fullText = userMessages.join(" ");

  const callerName = extractCallerName(userMessages[0] ?? "");

  // Prefer ElevenLabs' AI summary, fall back to truncated user speech
  const fallbackSummary =
    fullText.length > 200 ? fullText.slice(0, 200) + "..." : fullText;
  const summary = elevenLabsSummary ?? (fallbackSummary || "No message left.");

  const urgency = inferUrgency(fullText);
  const actionRequested = extractActionRequested(fullText);

  return {
    caller_name: callerName,
    summary,
    urgency,
    action_requested: actionRequested,
  };
}

/** Attempt to extract a name from the caller's first message */
function extractCallerName(firstMessage: string): string | null {
  // Stop words that indicate end of name (not part of the name itself)
  const stopWords = new Set([
    "from",
    "at",
    "with",
    "and",
    "the",
    "calling",
    "about",
    "regarding",
    "here",
    "over",
    "in",
    "for",
    "to",
  ]);

  const patterns = [
    /(?:this is|my name is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /^(?:hi|hey|hello),?\s+(?:this is\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = firstMessage.match(pattern);
    if (match?.[1]) {
      // Filter out stop words from the end of the captured name
      const words = match[1].split(/\s+/);
      const nameWords: string[] = [];
      for (const word of words) {
        if (stopWords.has(word.toLowerCase())) break;
        nameWords.push(word);
      }
      if (nameWords.length > 0) {
        return nameWords.join(" ");
      }
    }
  }

  return null;
}

/** Infer urgency from the caller's language */
function inferUrgency(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();

  const highIndicators = [
    "urgent",
    "emergency",
    "asap",
    "immediately",
    "right away",
    "critical",
    "time sensitive",
    "can't wait",
    "very important",
  ];

  const lowIndicators = [
    "no rush",
    "whenever",
    "no hurry",
    "when he gets a chance",
    "not urgent",
    "just wanted to",
    "just calling to",
  ];

  if (highIndicators.some((indicator) => lower.includes(indicator))) {
    return "high";
  }

  if (lowIndicators.some((indicator) => lower.includes(indicator))) {
    return "low";
  }

  return "medium";
}

/** Extract any explicit callback or action requests */
function extractActionRequested(text: string): string | null {
  const lower = text.toLowerCase();

  const patterns = [
    /(?:please\s+)?(?:have him|ask him to|tell him to|need him to)\s+(.+?)(?:\.|$)/i,
    /(?:can he|could he|would he)\s+(.+?)(?:\?|$)/i,
    /(?:call me back|call back|return my call)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] ? match[1].trim() : match[0].trim();
    }
  }

  if (lower.includes("call me back") || lower.includes("return my call")) {
    return "Requested callback";
  }

  return null;
}
