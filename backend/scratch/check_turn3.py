import sys
sys.path.insert(0, ".")
from app.core.dialogue_manager import has_symptom_mention
from app.agents.nodes.responder_node import _has_sufficient_info, get_symptom_data

notes = """Patient: mujhe naak band hota hai akshar
Doctor: Kab se aapko naak band hona shuru hua?
Patient: pichle 2-3 saalon se
Doctor: Kya aapko koi bukhar ya thakan mehsoos hoti hai?
Patient: bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai"""

print("has_symptom_mention(notes):", has_symptom_mention(notes))
print("_has_sufficient_info(notes):", _has_sufficient_info(notes))
sym = get_symptom_data(notes)
print("sym_data:", sym.get("diagnosis_hin"))

turn_count = 3
has_actual_symptoms = has_symptom_mention(notes)
has_sufficient = _has_sufficient_info(notes)
can_conclude = ((turn_count >= 2) or has_sufficient) and has_actual_symptoms
force_conclude = ((turn_count >= 3) or has_sufficient) and has_actual_symptoms
print("can_conclude:", can_conclude)
print("force_conclude:", force_conclude)
