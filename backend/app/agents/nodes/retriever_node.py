import asyncio
from typing import Optional
from langchain_core.runnables import RunnableLambda
from app.agents.state import AgentState
from app.core.hybrid_rag import HybridRemedyStore
from app.core.knowledge_graph import SafetyKnowledgeGraph
from langchain_core.messages import SystemMessage, HumanMessage

knowledge_graph = SafetyKnowledgeGraph()
_remedy_store: Optional[HybridRemedyStore] = None


def get_remedy_store() -> HybridRemedyStore:
    """Retrieves the preloaded HybridRemedyStore from app.state or lazy-initializes on fallback."""
    global _remedy_store
    if _remedy_store is not None:
        return _remedy_store

    try:
        from app.main import app
        if hasattr(app, "state") and getattr(app.state, "remedy_store", None):
            _remedy_store = app.state.remedy_store
            return _remedy_store
    except Exception:
        pass

    from app.core.hybrid_rag import get_shared_remedy_store
    _remedy_store = get_shared_remedy_store()
    return _remedy_store


def extract_active_symptoms(notes: str, normalized_msg: str, llm=None) -> str:
    """
    Extracts the patient's positive active complaints for accurate vector RAG search.
    Filters out doctor questions, negative patient statements ('nahi', 'nahin', 'no'),
    and irrelevant comorbidities so that remedies accurately match the primary illness.
    """
    if llm and notes:
        try:
            from app.agents.nodes.responder_node import _try_llm
            sys_msg = SystemMessage(
                content=(
                    "You are a clinical query generator for an Ayurvedic remedy database. "
                    "From the consultation notes below, extract ONLY 3-6 space-separated keywords "
                    "describing the patient's ACTIVE symptoms in Hindi and English (ignore negative answers like no/nahi, and ignore questions). "
                    "Example: 'fever bukhar body ache badan dard fatigue thakan'. Output ONLY keywords."
                )
            )
            extracted = _try_llm(llm, [sys_msg, HumanMessage(content=notes)])
            if extracted and len(extracted.split()) <= 10 and not extracted.startswith("Error"):
                return extracted.strip()
        except Exception:
            pass

    # Fallback heuristic: collect positive patient statements
    positive_parts = []
    for line in notes.split("\n"):
        line_clean = line.strip().lower()
        if line_clean.startswith("doctor:"):
            continue
        line_val = line_clean.replace("patient:", "").strip()
        if line_val in ("nahi", "nahin", "nahi pata", "no", "nahi hai", "nahin hai", "नहीं।", "नहीं", "कुछ नहीं"):
            continue
        positive_parts.append(line_val)

    clean_query = " ".join(positive_parts)
    return clean_query if clean_query.strip() else normalized_msg


def retriever_node_sync(state: AgentState) -> AgentState:
    """Synchronous execution of remedy retrieval for synchronous runners."""
    from app.agents.nodes.responder_node import get_llm
    llm = get_llm()
    store = get_remedy_store()
    notes = state.get("consultation_notes", "")
    norm_msg = state.get("normalized_message", "")

    query = extract_active_symptoms(notes, norm_msg, llm)
    patient_conditions = state.get("patient_conditions", [])

    candidates = store.search_remedies(query, limit=4)
    verified_remedies = []

    if state.get("detected_language") == "garhwali":
        garhwali_docs = store.search_garhwali(query, limit=3)
        state["garhwali_context"] = [doc.get("content", "") for doc in garhwali_docs]
    else:
        state["garhwali_context"] = []

    for item in candidates:
        is_safe, reason = knowledge_graph.validate_remedy(
            item.get("remedy_text", ""),
            patient_conditions
        )
        if is_safe:
            verified_item = dict(item)
            verified_item["safety_check"] = reason
            verified_remedies.append(verified_item)
            if len(verified_remedies) >= 2:
                break

    state["retrieved_remedies"] = verified_remedies
    return state


async def retriever_node(state: AgentState) -> AgentState:
    """
    Async LangGraph node for retrieving verified AYUSH remedies.
    Vector search and embedding generation are executed in worker threads via asyncio.to_thread
    to prevent blocking FastAPI's asynchronous event loop.
    """
    from app.agents.nodes.responder_node import get_llm
    llm = get_llm()
    store = get_remedy_store()
    notes = state.get("consultation_notes", "")
    norm_msg = state.get("normalized_message", "")

    query = extract_active_symptoms(notes, norm_msg, llm)
    patient_conditions = state.get("patient_conditions", [])

    # 1. Non-blocking Vector RAG Search using asyncio.to_thread
    candidates = await asyncio.to_thread(store.search_remedies, query, limit=4)
    verified_remedies = []

    # 1.5 Non-blocking Garhwali Context Retrieval using asyncio.to_thread
    if state.get("detected_language") == "garhwali":
        garhwali_docs = await asyncio.to_thread(store.search_garhwali, query, limit=3)
        state["garhwali_context"] = [doc.get("content", "") for doc in garhwali_docs]
    else:
        state["garhwali_context"] = []

    # 2. Safety Knowledge Graph Validation
    for item in candidates:
        is_safe, reason = knowledge_graph.validate_remedy(
            item.get("remedy_text", ""),
            patient_conditions
        )
        if is_safe:
            verified_item = dict(item)
            verified_item["safety_check"] = reason
            verified_remedies.append(verified_item)
            if len(verified_remedies) >= 2:
                break

    state["retrieved_remedies"] = verified_remedies
    return state


# Dual sync/async runnable for LangGraph compatibility
retriever_runnable = RunnableLambda(retriever_node_sync, afunc=retriever_node)