import sys
sys.path.insert(0, ".")
from app.agents.graph import checkpointer
import json

config = {"configurable": {"thread_id": "conv_1774542247596_59388a18"}}
state_tuple = checkpointer.get_tuple(config)
if state_tuple:
    print("Checkpoint exists!")
    channel_values = state_tuple.checkpoint.get("channel_values", {})
    print("dialogue_phase:", channel_values.get("dialogue_phase"))
    print("turn_count:", channel_values.get("turn_count"))
    print("consultation_notes:\n", channel_values.get("consultation_notes"))
    print("final_reply_text:\n", channel_values.get("final_reply_text"))
else:
    print("No checkpoint found for this conversation ID!")
