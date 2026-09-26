import sys
sys.path.insert(0, ".")
from app.core.dialogue_manager import has_symptom_mention

t1 = "Patient: mujhe naak band hota hai akshar"
print("t1:", has_symptom_mention(t1))

t2 = "Patient: pichle 2-3 saalon se"
print("t2:", has_symptom_mention(t2))

t3 = "Patient: bukhar yar thakan to nahi pr naak aur aankhon main khujli hoti hai aur aanshu hoti hai"
print("t3:", has_symptom_mention(t3))
