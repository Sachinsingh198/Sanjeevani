import sqlite3
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.emergency_node import emergency_node
from app.agents.nodes.retriever_node import retriever_node
from app.agents.nodes.responder_node import doctor_consultation_node

try:
    from langgraph.checkpoint.sqlite import SqliteSaver
    conn = sqlite3.connect("sessions.db", check_same_thread=False)
    checkpointer = SqliteSaver(conn)
except (ImportError, ModuleNotFoundError):
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()


def route_clinical_flow(state: AgentState) -> str:
    """
    Routes after triage_node runs.

    - Red tier → emergency immediately
    - dialogue_phase == CONCLUDED → fetch remedy from Qdrant, then deliver
    - Everything else → go to doctor_consultation_node for clinical dialogue
    """
    tier      = state.get("detected_tier", "Green")
    new_phase = state.get("dialogue_phase", "GREETING")

    if tier == "Red":
        return "emergency_node"

    # dialogue_phase is set to CONCLUDED either by:
    #   (a) triage_node (CONCLUDED on restart), or
    #   (b) responder_node (LLM signalled ##CONCLUDE## in previous turn)
    # In case (b) it was already set BEFORE triage_node ran this turn,
    # so triage_node left it as CONCLUDED (via the pass branch).
    # We check the resulting new_phase to decide routing.
    if new_phase == "CONCLUDED":
        return "retriever_node"

    return "doctor_consultation_node"


builder = StateGraph(AgentState)

builder.add_node("triage_node", triage_node)
builder.add_node("emergency_node", emergency_node)
builder.add_node("retriever_node", retriever_node)
builder.add_node("doctor_consultation_node", doctor_consultation_node)

builder.set_entry_point("triage_node")

builder.add_conditional_edges(
    "triage_node",
    route_clinical_flow,
    {
        "emergency_node": "emergency_node",
        "retriever_node": "retriever_node",
        "doctor_consultation_node": "doctor_consultation_node"
    }
)

builder.add_edge("retriever_node", "doctor_consultation_node")
builder.add_edge("emergency_node", END)
builder.add_edge("doctor_consultation_node", END)

sanjeevani_workflow = builder.compile(checkpointer=checkpointer)