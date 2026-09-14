from app.agents.state import AgentState

def emergency_node(state: AgentState) -> AgentState:
    state["retrieved_remedies"] = []
    state["final_reply_text"] = (
        "EMERGENCY WARNING: Critical life-threatening symptoms detected. "
        "Do NOT rely on home remedies. Keep the patient in a comfortable position, "
        "ensure their airway is open, and call 108 emergency ambulance immediately."
    )
    return state