# Iris — AI Executive Assistant (ElevenLabs Conversational AI)

## Project Overview

Iris is a voice-based AI executive assistant that replaces traditional voicemail.
She answers unanswered calls via AT&T conditional call forwarding (`*004*`),
engages callers conversationally, captures structured information, and delivers
concise push notifications to James.

---

## Architecture

```yaml
platform: elevenlabs-conversational-ai
voice_provider: elevenlabs
phone_provider: elevenlabs # ElevenLabs provides phone numbers natively
notification_layer: tbd # SMS via Twilio, or push via Slack/ntfy/Pushover
runtime: serverless # webhook receiver for post-call processing

stack:
  voice_agent: ElevenLabs Conversational AI (phone-callable agent)
  webhook_receiver: Node.js on Fly.io # matches existing Gizmo pattern
  notification: TBD # options below
  persistence: SQLite or Turso # call log / contact recognition
```

---

## Phone Routing

```yaml
routing:
  method: AT&T conditional call forwarding
  activation: "*004*[iris_phone_number]*11#"
  deactivation: "*73"
  conditions:
    - no_answer
    - busy
    - unreachable
  prerequisite: Disable Android Live Voicemail (Settings > Apps > Phone > Live Voicemail)
  iris_number: TBD # ElevenLabs-provisioned phone number
```

---

## Voice Agent Configuration

```yaml
agent:
  name: Iris
  role: Executive assistant to James Stephenson

  voice:
    provider: elevenlabs
    # Pick a female voice with warm, professional tone
    # Candidates: Rachel, Domi, Bella — audition in ElevenLabs console
    voice_id: TBD
    stability: 0.6        # slight variation = more natural
    similarity_boost: 0.8  # stay close to base voice
    style: 0.3             # subtle expressiveness

  personality:
    tone: Professional, warm, unhurried
    register: Slight formality — "May I ask who's calling?" not "Who dis?"
    rapport_tactics:
      - Use caller's name naturally once obtained
      - Mirror politeness level
      - Never sound robotic or scripted
    boundaries:
      - Never confirm James's location or schedule to unknown callers
      - Never provide personal information
      - Never transfer calls (v1 — take messages only)

  first_message: >
    Hello, you've reached the office of James Stephenson.
    This is his executive assistant Iris speaking.
    May I ask who's calling?
```

---

## Conversation Design

```yaml
conversation:
  # Iris's job is to extract these fields naturally, not interrogation-style
  capture_fields:
    - caller_name        # "May I ask who's calling?"
    - caller_company     # Only if volunteered or contextually appropriate
    - reason_for_call    # "What would you like me to let James know?"
    - urgency            # Inferred from tone/language, not asked directly
    - callback_number    # Only ask if not captured via caller ID
    - preferred_time     # "Is there a good time for him to reach you?"

  response_tiers:
    unknown_caller:
      behavior: Polite gatekeeping. Take message. No scheduling.
      example: >
        I'd be happy to let James know you called.
        Is there anything specific you'd like me to pass along?

    # Future tiers (v2+):
    # known_contact:
    #   behavior: Warmer. Can confirm general availability.
    # vip_contact:
    #   behavior: Can check calendar. Can schedule. Can interrupt.

  closing:
    pattern: >
      Summarize back to caller what you captured:
      "Got it — [name] calling about [reason]. I'll make sure James knows.
      Thank you, [name]."
    always_thank_by_name: true

  edge_cases:
    robocall_detected: >
      If the caller is clearly automated (no response to greeting,
      pre-recorded message), hang up gracefully after 5 seconds of silence
      or upon detecting a recording. Do not log as a real call.
    abusive_caller: >
      Remain professional. "I understand. I'll pass your message along
      to James. Is there anything else?" Do not engage with hostility.
    caller_demands_james: >
      "I understand this is important. James isn't available right now,
      but I'll make sure he gets your message as soon as possible.
      What's the best number for him to reach you?"
```

---

## Notification System

```yaml
notifications:
  # Iris sends James a summary after each call
  primary_channel: TBD # Pick one:
    # - Slack DM (consistent with Gizmo ecosystem)
    # - Pushover (dedicated push notifications, very clean)
    # - SMS via Twilio (simplest, always works)
    # - ntfy.sh (self-hostable, free)

  format:
    sender: "Iris"
    template: |
      **[Iris]** New call summary:
      • Caller: {caller_name} {caller_company}
      • Reason: {reason_for_call}
      • Urgency: {urgency_level}
      • Callback: {callback_number}
      • Time: {call_timestamp}
      {additional_notes}

  urgency_levels:
    low: Standard notification (spam, sales, general inquiries)
    medium: Prompt notification (business-related, known contacts)
    high: Immediate alert (urgent language detected, VIP caller)

  # v2+: urgency routing
  # high → SMS + Slack
  # medium → Slack
  # low → logged only, batch summary at EOD
```

---

## Webhook / Backend

```yaml
backend:
  host: fly.io  # matches Gizmo deployment pattern
  runtime: node
  framework: Express or Hono (lightweight)

  endpoints:
    POST /webhook/call-complete:
      description: >
        ElevenLabs posts conversation data here after each call ends.
        Parse transcript, extract structured fields, determine urgency,
        send notification.
      payload:
        - conversation_id
        - transcript
        - caller_phone (if available via caller ID)
        - duration
        - agent_id

    GET /calls:
      description: Simple call log viewer (stretch goal)

  persistence:
    engine: SQLite  # or Turso for edge-distributed
    tables:
      calls:
        - id
        - timestamp
        - caller_name
        - caller_phone
        - caller_company
        - reason
        - urgency
        - transcript_summary
        - raw_transcript
        - notification_sent (bool)
      known_contacts:  # v2
        - id
        - name
        - phone
        - company
        - relationship  # vip / known / unknown
        - notes
```

---

## Phased Rollout

```yaml
phases:
  v1_mvp:
    goal: "Iris answers, takes messages, notifies James"
    scope:
      - ElevenLabs agent configured with persona + first message
      - Phone number provisioned
      - Conditional call forwarding active
      - Post-call webhook → parse transcript → send notification
      - Single notification channel (probably Slack DM)
    done_when: "Greg calls about an extended warranty and James gets a clean summary"

  v2_recognition:
    goal: "Iris knows who's calling"
    scope:
      - known_contacts table populated
      - Caller ID lookup against known contacts
      - Tiered response behavior based on contact relationship
      - Urgency-based notification routing

  v3_scheduling:
    goal: "Iris can check availability and book time"
    scope:
      - Google Calendar integration (read)
      - Can offer general availability windows to known contacts
      - Can create calendar holds for VIP contacts

  v4_outbound:
    goal: "Iris can make calls on James's behalf"
    scope:
      - "Iris, call Casey and confirm Thursday" via Slack command
      - Outbound calling via ElevenLabs
      - Pre-scripted outbound conversation templates
```

---

## Open Questions

```yaml
decisions_needed:
  - notification_channel: Slack DM vs Pushover vs SMS? (Slack fits ecosystem but SMS is most reliable)
  - voice_selection: Need to audition ElevenLabs voices for Iris persona
  - caller_id_access: Does ElevenLabs surface caller ID in webhook payload? Verify in docs.
  - robocall_handling: Log these at all, or silently discard?
  - latency_tuning: ElevenLabs conversational AI latency settings — test and tune
  - cost: ElevenLabs phone agent pricing per minute — verify current rates
```

---

## Reference

```yaml
related_projects:
  gizmo: Slack bot on Fly.io (same deployment pattern)
  spark: MILES agent (same agent design philosophy — briefs over specs)

naming_origin: >
  Iris — Greek goddess, messenger of the gods, female counterpart to Hermes.
  Her name means both "rainbow" and "messenger."
  She linked gods and mortals, carried news from Olympus and even Hades.
  Perfect name for a voice that bridges caller and recipient.
```