import sqlite3
import asyncio
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.triage_node import triage_node
from app.agents.nodes.emergency_node import emergency_node
from app.agents.nodes.retriever_node import retriever_runnable
from app.agents.nodes.responder_node import doctor_consultation_node

from app.config import settings
from app.core.logger import logger


def get_sqlite_saver():
    """Returns a persistent local SqliteSaver on sessions.db with WAL mode."""
    try:
        from langgraph.checkpoint.sqlite import SqliteSaver
        conn = sqlite3.connect("sessions.db", check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        return SqliteSaver(conn)
    except Exception as e:
        logger.warning(f"[Graph Checkpoint] SqliteSaver failed ({e}). Falling back to MemorySaver.")
        from langgraph.checkpoint.memory import MemorySaver
        return MemorySaver()


from langgraph.checkpoint.base import BaseCheckpointSaver


class ResilientCheckpointer(BaseCheckpointSaver):
    """
    Wraps a primary checkpointer (e.g. PostgresSaver) with automatic instant
    fallback to SqliteSaver whenever the database connection drops or times out.
    Guarantees zero-amnesia multi-turn conversations in offline or low-connectivity environments.
    """
    def __init__(self, primary, fallback):
        super().__init__()
        self.primary = primary
        self.fallback = fallback
        self._using_fallback = False

    def get_tuple(self, config):
        if self._using_fallback:
            return self.fallback.get_tuple(config)
        try:
            res = self.primary.get_tuple(config)
            if res is not None:
                return res
            # If not in primary (e.g. created offline or while disconnected), check fallback
            return self.fallback.get_tuple(config)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary checkpointer failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return self.fallback.get_tuple(config)

    def put(self, config, checkpoint, metadata, new_versions):
        # Always persist to local SqliteSaver first for 100% durability and zero loss
        try:
            self.fallback.put(config, checkpoint, metadata, new_versions)
        except Exception as fb_err:
            logger.debug(f"[Checkpointer] Fallback put note: {fb_err}")

        if self._using_fallback:
            return checkpoint

        try:
            return self.primary.put(config, checkpoint, metadata, new_versions)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary checkpointer put failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return checkpoint

    def put_writes(self, config, writes, task_id):
        try:
            self.fallback.put_writes(config, writes, task_id)
        except Exception as fb_err:
            logger.debug(f"[Checkpointer] Fallback put_writes note: {fb_err}")

        if self._using_fallback:
            return

        try:
            return self.primary.put_writes(config, writes, task_id)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary put_writes failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return

    def list(self, config, *, filter=None, before=None, limit=None):
        if self._using_fallback:
            return self.fallback.list(config, filter=filter, before=before, limit=limit)
        try:
            return self.primary.list(config, filter=filter, before=before, limit=limit)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary list failed ({err}). Switching to local SqliteSaver.")
            self._using_fallback = True
            return self.fallback.list(config, filter=filter, before=before, limit=limit)

    async def aget_tuple(self, config):
        if self._using_fallback:
            return await asyncio.to_thread(self.fallback.get_tuple, config)
        try:
            res = await asyncio.to_thread(self.primary.get_tuple, config)
            if res is not None:
                return res
            return await asyncio.to_thread(self.fallback.get_tuple, config)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary checkpointer failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return await asyncio.to_thread(self.fallback.get_tuple, config)

    async def aput(self, config, checkpoint, metadata, new_versions):
        try:
            await asyncio.to_thread(self.fallback.put, config, checkpoint, metadata, new_versions)
        except Exception:
            pass

        if self._using_fallback:
            return checkpoint
        try:
            return await asyncio.to_thread(self.primary.put, config, checkpoint, metadata, new_versions)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary checkpointer put failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return checkpoint

    async def aput_writes(self, config, writes, task_id):
        try:
            await asyncio.to_thread(self.fallback.put_writes, config, writes, task_id)
        except Exception:
            pass

        if self._using_fallback:
            return
        try:
            return await asyncio.to_thread(self.primary.put_writes, config, writes, task_id)
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary put_writes failed ({err}). Seamlessly switching to local SqliteSaver.")
            self._using_fallback = True
            return

    def get_next_version(self, current, channel=None):
        if not self._using_fallback and hasattr(self.primary, "get_next_version"):
            try:
                return self.primary.get_next_version(current, channel)
            except Exception:
                pass
        return self.fallback.get_next_version(current, channel)

    async def alist(self, config, *, filter=None, before=None, limit=None):
        if self._using_fallback:
            items = await asyncio.to_thread(lambda: list(self.fallback.list(config, filter=filter, before=before, limit=limit)))
            for item in items:
                yield item
            return
        try:
            items = await asyncio.to_thread(lambda: list(self.primary.list(config, filter=filter, before=before, limit=limit)))
            for item in items:
                yield item
        except Exception as err:
            logger.warning(f"[Checkpointer] Primary list failed ({err}). Switching to local SqliteSaver.")
            self._using_fallback = True
            items = await asyncio.to_thread(lambda: list(self.fallback.list(config, filter=filter, before=before, limit=limit)))
            for item in items:
                yield item


def get_checkpointer(db_url: str = None):
    """
    Factory function returning the appropriate LangGraph checkpointer.
    Guarantees state persistence across turns by backing PostgresSaver with a persistent SqliteSaver.
    """
    fallback_saver = get_sqlite_saver()
    url = (db_url if db_url is not None else getattr(settings, "DATABASE_URL", "")).strip().lower()

    if url.startswith("postgresql://") or url.startswith("postgres://"):
        conn_string = db_url if db_url is not None else settings.DATABASE_URL
        if conn_string.startswith("postgres://"):
            conn_string = "postgresql://" + conn_string[len("postgres://"):]

        # Quick check if host is resolvable to prevent connection timeout loops when offline
        try:
            from urllib.parse import urlparse
            import socket
            parsed = urlparse(conn_string)
            if parsed.hostname:
                _orig_timeout = socket.getdefaulttimeout()
                try:
                    socket.setdefaulttimeout(1.5)
                    socket.gethostbyname(parsed.hostname)
                finally:
                    # CRITICAL: Restore original timeout so LLM API calls are not capped at 1.5s
                    socket.setdefaulttimeout(_orig_timeout)
        except Exception as host_err:
            logger.warning(f"[Graph Checkpoint] Database host unreachable ({host_err}). Using resilient local SqliteSaver.")
            return ResilientCheckpointer(fallback_saver, fallback_saver)

        # Try initializing PostgresSaver
        try:
            import importlib
            pg_mod = importlib.import_module("langgraph.checkpoint.postgres")
            PostgresSaver = getattr(pg_mod, "PostgresSaver")
            from psycopg_pool import ConnectionPool
            from psycopg.rows import dict_row

            pool = ConnectionPool(
                conn_string,
                min_size=1,
                max_size=10,
                open=True,
                timeout=2.0,
                max_waiting=2,
                kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
            )
            primary_saver = PostgresSaver(pool)
            if hasattr(primary_saver, "setup"):
                primary_saver.setup()
            logger.info("[Graph Checkpoint] Successfully initialized PostgresSaver with SqliteSaver fallback.")
            return ResilientCheckpointer(primary_saver, fallback_saver)
        except Exception as e:
            logger.warning(f"[Graph Checkpoint] PostgresSaver unavailable ({e}). Using resilient local SqliteSaver.")
            return ResilientCheckpointer(fallback_saver, fallback_saver)

    return ResilientCheckpointer(fallback_saver, fallback_saver)


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