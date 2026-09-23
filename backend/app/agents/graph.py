import sqlite3
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.emergency_node import emergency_node
from app.agents.nodes.retriever_node import retriever_runnable
from app.agents.nodes.responder_node import doctor_consultation_node

from app.config import settings
from app.core.logger import logger


def get_checkpointer(db_url: str = None):
    """
    Factory function returning the appropriate LangGraph checkpointer.
    - If Postgres URL (starts with postgresql:// or postgres://):
      Attempts to import and initialize PostgresSaver (running .setup() if available).
    - If SQLite / default:
      Initializes SqliteSaver on sessions.db with WAL mode.
    - Falls back to MemorySaver if optional saver dependencies are missing or error out.
    """
    url = (db_url if db_url is not None else getattr(settings, "DATABASE_URL", "")).strip().lower()

    if url.startswith("postgresql://") or url.startswith("postgres://"):
        try:
            import importlib
            pg_mod = importlib.import_module("langgraph.checkpoint.postgres")
            PostgresSaver = getattr(pg_mod, "PostgresSaver")
            conn_string = db_url if db_url is not None else settings.DATABASE_URL
            if conn_string.startswith("postgres://"):
                conn_string = "postgresql://" + conn_string[len("postgres://"):]

            # Use ConnectionPool to prevent connection timeouts/drops on serverless Postgres (Neon)
            try:
                from psycopg_pool import ConnectionPool
                from psycopg.rows import dict_row

                pool = ConnectionPool(
                    conn_string,
                    min_size=1,
                    max_size=10,
                    open=True,
                    kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
                )
                saver = PostgresSaver(pool)
            except Exception as pool_err:
                logger.debug(f"[Graph Checkpoint] ConnectionPool init failed ({pool_err}), falling back to from_conn_string")
                import contextlib
                saver_obj = PostgresSaver.from_conn_string(conn_string)
                if isinstance(saver_obj, contextlib.AbstractContextManager):
                    saver = saver_obj.__enter__()
                else:
                    saver = saver_obj

            if hasattr(saver, "setup"):
                saver.setup()
            logger.info("[Graph Checkpoint] Successfully initialized PostgresSaver.")
            return saver
        except Exception as e:
            logger.warning(f"[Graph Checkpoint] PostgresSaver unavailable or failed: {e}. Falling back to MemorySaver.")
            from langgraph.checkpoint.memory import MemorySaver
            return MemorySaver()

    # SQLite / Default
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        conn = sqlite3.connect("sessions.db", check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        return SqliteSaver(conn)
    except Exception as e:
        logger.warning(f"[Graph Checkpoint] SqliteSaver failed: {e}. Falling back to MemorySaver.")
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()


checkpointer = get_checkpointer()
conn = getattr(checkpointer, "conn", None)
if conn is None:
    try:
        conn = sqlite3.connect("sessions.db", check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        conn = None


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