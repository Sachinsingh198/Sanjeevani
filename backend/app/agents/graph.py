import sqlite3
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.emergency_node import emergency_node
from app.agents.nodes.retriever_node import retriever_runnable
from app.agents.nodes.responder_node import doctor_consultation_node

try:
    from langgraph.checkpoint.sqlite import SqliteSaver
    conn = sqlite3.connect("sessions.db", check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
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

    if new_phase == "CONCLUDED":
        return "retriever_node"

    return "doctor_consultation_node"


def route_after_consultation(state: AgentState) -> str:
    """
    Routes after doctor_consultation_node runs:
    If the consultation concluded during this node and remedies have not been fetched yet,
    route to retriever_node via graph edge (which feeds into doctor_consultation_node for delivery).
    Otherwise, complete the turn.
    """
    phase = state.get("dialogue_phase")
    remedies = state.get("retrieved_remedies")
    if phase == "CONCLUDED" and not remedies:
        return "retriever_node"
    return END


builder = StateGraph(AgentState)

builder.add_node("triage_node", triage_node)
builder.add_node("emergency_node", emergency_node)
builder.add_node("retriever_node", retriever_runnable)
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

builder.add_conditional_edges(
    "doctor_consultation_node",
    route_after_consultation,
    {
        "retriever_node": "retriever_node",
        END: END
    }
)

sanjeevani_workflow = builder.compile(checkpointer=checkpointer)