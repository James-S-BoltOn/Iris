import { describe, it, expect } from "vitest";
import { analyzeTranscript } from "../services/transcript.js";
import type { TranscriptEntry } from "../types/index.js";

describe("analyzeTranscript", () => {
  const makeTranscript = (...userMessages: string[]): TranscriptEntry[] => {
    const entries: TranscriptEntry[] = [];
    entries.push({
      role: "agent",
      message:
        "Hello, you've reached the office of James Stephenson. This is his executive assistant Iris speaking. May I ask who's calling?",
    });
    for (const msg of userMessages) {
      entries.push({ role: "user", message: msg });
      entries.push({ role: "agent", message: "Thank you." });
    }
    return entries;
  };

  describe("caller name extraction", () => {
    it("extracts name from 'this is [Name]'", () => {
      const result = analyzeTranscript(
        makeTranscript("Hi, this is Greg from Acme Corp")
      );
      expect(result.caller_name).toBe("Greg");
    });

    it("extracts name from 'my name is [Name]'", () => {
      const result = analyzeTranscript(
        makeTranscript("My name is Sarah Johnson")
      );
      expect(result.caller_name).toBe("Sarah Johnson");
    });

    it("extracts name from 'I'm [Name]'", () => {
      const result = analyzeTranscript(makeTranscript("I'm Dave"));
      expect(result.caller_name).toBe("Dave");
    });

    it("returns null when no name pattern matches", () => {
      const result = analyzeTranscript(
        makeTranscript("Yeah I need to talk to James about the project")
      );
      expect(result.caller_name).toBeNull();
    });
  });

  describe("urgency inference", () => {
    it("flags high urgency for 'urgent' language", () => {
      const result = analyzeTranscript(
        makeTranscript("This is urgent, I need James to call me immediately")
      );
      expect(result.urgency).toBe("high");
    });

    it("flags high urgency for 'asap'", () => {
      const result = analyzeTranscript(
        makeTranscript("I need a callback asap please")
      );
      expect(result.urgency).toBe("high");
    });

    it("flags low urgency for 'no rush'", () => {
      const result = analyzeTranscript(
        makeTranscript("No rush, just wanted to check in")
      );
      expect(result.urgency).toBe("low");
    });

    it("defaults to medium urgency for neutral language", () => {
      const result = analyzeTranscript(
        makeTranscript("I'm calling about the contract we discussed")
      );
      expect(result.urgency).toBe("medium");
    });
  });

  describe("action requested extraction", () => {
    it("detects 'call me back' requests", () => {
      const result = analyzeTranscript(
        makeTranscript("Can you have him call me back?")
      );
      expect(result.action_requested).not.toBeNull();
    });

    it("extracts 'have him [action]' requests", () => {
      const result = analyzeTranscript(
        makeTranscript("Please have him review the proposal.")
      );
      expect(result.action_requested).toBe("review the proposal");
    });

    it("returns null when no action is requested", () => {
      const result = analyzeTranscript(
        makeTranscript("Just letting him know the delivery arrived")
      );
      expect(result.action_requested).toBeNull();
    });
  });

  describe("summary generation", () => {
    it("uses ElevenLabs summary when provided", () => {
      const elevenLabsSummary = "Caller Greg asked about project timeline.";
      const result = analyzeTranscript(
        makeTranscript("What's the project timeline?"),
        elevenLabsSummary
      );
      expect(result.summary).toBe(elevenLabsSummary);
    });

    it("falls back to user speech when no ElevenLabs summary", () => {
      const result = analyzeTranscript(
        makeTranscript("I wanted to discuss the invoice")
      );
      expect(result.summary).toContain("invoice");
    });

    it("returns fallback message for empty transcript", () => {
      const result = analyzeTranscript([]);
      expect(result.summary).toBe("No message left.");
    });
  });
});
