from app.agents.state import AgentState
from app.core.hybrid_rag import HybridRemedyStore
from app.core.knowledge_graph import SafetyKnowledgeGraph

remedy_store = HybridRemedyStore()
knowledge_graph = SafetyKnowledgeGraph()

def retriever_node(state: AgentState) -> AgentState:
    query = state.get("consultation_notes") or state.get("normalized_message", "")
    patient_conditions = state.get("patient_conditions", [])

    # 1. Vector RAG Search
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