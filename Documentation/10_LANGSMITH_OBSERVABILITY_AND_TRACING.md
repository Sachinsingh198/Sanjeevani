# 10. LangSmith Observability & Tracing

## 1. Why Observability in Clinical AI?

In clinical and safety-critical AI systems, debugging cannot rely on static print logs. Developers and medical auditors need visibility into:
- Exactly which branch of the LangGraph state machine executed.
- Which regex patterns were matched in the triage engine.
- What exact context was passed to the LLM (including system prompts, previous turn notes, and retrieved remedies).
- Model token consumption, TTFT (Time To First Token), and execution latency breakdowns.

Sanjeevani integrates **LangSmith**, LangChain's enterprise observability and evaluation platform.

---

## 2. Configuration & Startup Synchronization

In [`backend/app/config.py`](file:///d:/Sanjeevani/backend/app/config.py), environment variables from `backend/.env` are loaded and synchronized directly into `os.environ` upon server boot:

```python
# Environment Variables required for LangSmith:
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=sanjeevani
```

### Auto-Sync Implementation:
```python
if settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
```
This ensures that all background threads, LangChain model clients (`ChatGroq`, `ChatGoogleGenerativeAI`, `ChatOpenAI`), and LangGraph runtimes automatically stream execution telemetry to the LangSmith cloud without manual callback wrapping.

---

## 3. The Traced Execution Hierarchy

When a user submits a message via `/chat/message`, the invocation is decorated with rich metadata in [`backend/app/api/chat.py`](file:///d:/Sanjeevani/backend/app/api/chat.py):

```python
config = {
    "configurable": {"thread_id": req.conversation_id},
    "run_name": f"Sanjeevani Consultation ({req.conversation_id[:8]})",
    "tags": ["sanjeevani", "clinical-triage", req.language_hint or "auto"],
    "metadata": {
        "conversation_id": req.conversation_id,
        "voice_mode": req.include_audio,
        "language_hint": req.language_hint,
    },
}
```

### Trace Tree Representation:
```
▼ Sanjeevani Consultation (683d7890) [Chain] - 620ms
  ├─▶ triage_node [Chain] - 12ms
  │     - Ingests: raw_user_message
  │     - Outputs: detected_tier="Green", clinical_flags=[]
  ├─▶ route_clinical_flow [Chain] - 1ms
  │     - Decision: "doctor_consultation_node"
  ├─▶ doctor_consultation_node [Chain] - 598ms
  │     ├─▶ ChatGroq (llama-3.1-8b-instant) [LLM] - 420ms
  │     │     - Prompt Tokens: 840
  │     │     - Completion Tokens: 48
  │     │     - Total Tokens: 888
  │     │     - TTFT: 180ms
  │     └─▶ Text Cleaner (BhashiniVoiceEngine) - 2ms
```

---

## 4. Inspected Telemetry Metrics

On the [LangSmith Dashboard](https://smith.langchain.com/):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LANGSMITH TELEMETRY METRICS                     │
├────────────────────────────────────────────────────────────────────────┤
│  Run Status         │  Success / Error (with full stack trace on fail) │
├─────────────────────┼──────────────────────────────────────────────────┤
│  Latency            │  End-to-end graph duration vs. LLM-only time     │
├─────────────────────┼──────────────────────────────────────────────────┤
│  Token Economics    │  Prompt tokens, completion tokens, estimated cost│
├─────────────────────┼──────────────────────────────────────────────────┤
│  Conversational Tags│  sanjeevani, clinical-triage, hi, voice_mode     │
├─────────────────────┼──────────────────────────────────────────────────┤
│  Session Thread     │  Grouped by conversation_id across multi-turns   │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

## 5. Live Verification via LangSmith API

You can verify and query active runs directly from the command line using the LangSmith Python SDK:

```python
from langsmith import Client
client = Client()

# Query latest 5 runs from project "sanjeevani"
runs = client.runs.query(project_name="sanjeevani", limit=5)
for run in runs:
    print(f"Run: {run.name} | Type: {run.run_type} | Status: {run.status}")
```

Expected Output:
```
Run: Sanjeevani Consultation (683d7890) | Type: chain | Status: success
Run: triage_node | Type: chain | Status: success
Run: route_clinical_flow | Type: chain | Status: success
Run: doctor_consultation_node | Type: chain | Status: success
Run: ChatGroq | Type: llm | Status: success
```
