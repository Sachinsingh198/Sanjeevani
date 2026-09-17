from app.agents.state import AgentState
from app.core.hybrid_rag import HybridRemedyStore
from app.core.knowledge_graph import SafetyKnowledgeGraph
from langchain_core.messages import SystemMessage, HumanMessage

remedy_store = HybridRemedyStore()
knowledge_graph = SafetyKnowledgeGraph()


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


def retriever_node(state: AgentState) -> AgentState:
    from app.agents.nodes.responder_node import get_llm
    llm = get_llm()
    notes = state.get("consultation_notes", "")
    norm_msg = state.get("normalized_message", "")

    query = extract_active_symptoms(notes, norm_msg, llm)
    patient_conditions = state.get("patient_conditions", [])

    # 1. Vector RAG Search with targeted active symptoms
    candidates = remedy_store.search_remedies(query, limit=2)
    verified_remedies = []

    # 1.5 Garhwali Context Retrieval
    if state.get("detected_language") == "garhwali":
        garhwali_docs = remedy_store.search_garhwali(query, limit=3)
        state["garhwali_context"] = [doc.get("content", "") for doc in garhwali_docs]
    else:
        state["garhwali_context"] = []

    # 2. Safety Knowledge Graph Validation
    for item in candidates:
        is_safe, reason = knowledge_graph.validate_remedy(
            item.get("remedy_text", ""),
            patient_conditions
        )
        verified_item = dict(item)
        verified_item["safety_check"] = reason

        # Only retain if verified safe against patient comorbidities
        if is_safe:
            verified_remedies.append(verified_item)

    state["retrieved_remedies"] = verified_remedies
    return state