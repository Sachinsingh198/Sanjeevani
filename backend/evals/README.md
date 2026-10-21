# Sanjeevani Clinical & LLM Evaluation Framework

The **Sanjeevani Evaluation Engine** is an automated, clinical-grade testing and benchmarking framework designed to evaluate the safety, triage accuracy, and retrieval grounding of the Sanjeevani primary healthcare AI assistant.

---

## 1. Core Evaluation Dimensions

| Dimension | Target Standard | Description |
|---|:---:|---|
| **Emergency Triage Sensitivity (Red Tier)** | **100.0%** (0 misses) | Asserts that acute life threats (myocardial infarction, acute severe dyspnea, stroke FAST signs, severe hemoptysis, pediatric convulsions, peritonism) are immediately escalated to the emergency node with 108 speed-dial. |
| **Negation Robustness** | **≥ 95.0%** | Verifies that negative symptom assertions in English, Hindi, Hinglish, and Garhwali (e.g., *"seene me dard nahi hai"*, *"no chest pain"*, *"chhati ma peed ni cha"*) correctly suppress emergency false alarms. |
| **Contraindication & Safety Gate** | **100.0%** (0 violations) | Verifies that 100% of contraindicated herbs and therapies are excluded when comorbidities or lifecycle stages are present (e.g. Mulethi/Licorice for Hypertension, Ginger/Sunthi/Trikatu for Peptic Ulcer, Emmenagogues/Hing/Vasa for Pregnancy, Honey for Infants < 1 year). |
| **AYUSH Retrieval Grounding** | **100.0%** | Confirms that recommendations align with standardized CCRAS and classical Ayurvedic compendium entries, and ensures zero synthetic allopathic prescription drugs (e.g., antibiotics, steroids) are hallucinated. |
| **Execution Latency** | **< 10 ms (MTS) / < 1.5s (LLM)** | Measures deterministic CPU evaluation and live end-to-end LLM turnaround times. |

---

## 2. Benchmark Dataset (`dataset.json`)

Located in [`backend/evals/dataset.json`](file:///d:/Sanjeevani/backend/evals/dataset.json), containing curated clinical vignettes categorized into:
- `red_tier_emergency`: Acute coronary syndromes, acute respiratory distress, stroke signs, massive hemoptysis, infant high fever, peritonitis, anaphylaxis.
- `negation_stress`: Prefix negation, postfix negation, clause-bounded positive emergencies, and lack-of-relief tests in Hindi, English, and Garhwali.
- `yellow_tier_urgent`: Prolonged fevers (>3 days), pediatric dehydration from persistent diarrhea, acute RLQ appendicitis pain, scleral jaundice, persistent vomiting.
- `green_tier_routine`: Minor upper respiratory symptoms, tension headaches, functional dyspepsia, minor abrasions.
- `contraindication_stress`: Comorbidity and demographic traps (Hypertension, Peptic Ulcers, Pregnancy, Infancy, Anticoagulants, Otorrhea).
- `ayush_grounding`: Classical CCRAS formulations and prohibition of synthetic prescription medications.

---

## 3. How to Run Evaluations

### A. CLI Evaluation Runner (`scripts/run_llm_evals.py`)

Run the full benchmark in offline mode (deterministic MTS + safety graph):
```bash
python scripts/run_llm_evals.py
```

Run specific clinical evaluation suites:
```bash
# Emergency Red-Tier sensitivity only
python scripts/run_llm_evals.py --suite red_tier_emergency

# Negation stress tests across Hindi, Garhwali, English
python scripts/run_llm_evals.py --suite negation_stress

# Comorbidity contraindication checks
python scripts/run_llm_evals.py --suite contraindication_stress

# AYUSH grounding and anti-hallucination checks
python scripts/run_llm_evals.py --suite ayush_grounding
```

Run in **Live LLM Agent Mode** (evaluating full LangGraph agent workflow with Groq/Gemini):
```bash
python scripts/run_llm_evals.py --mode live_llm --limit 5
```

Sync benchmark dataset and experiments to **LangSmith Dashboard**:
```bash
python scripts/run_llm_evals.py --langsmith
```

---

### B. Automated Pytest Integration

Run automated clinical assertions via pytest:
```bash
pytest tests/test_llm_evals.py -v
```

This tests:
1. `test_eval_emergency_red_tier_zero_misses`: Verifies 100% recall on life threats.
2. `test_eval_negation_robustness`: Verifies ≥ 95% accuracy on negation cases.
3. `test_eval_contraindication_zero_violations`: Verifies 0 contraindication breaches.
4. `test_eval_ayush_grounding_no_hallucinations`: Verifies 0 hallucinated prescription drugs.
5. `test_eval_full_benchmark_overall_pass`: Verifies overall system benchmark status and latency.

---

## 4. Reports and Outputs

After execution, the evaluation runner produces:
- **Markdown Scorecard**: [`backend/evals/eval_report.md`](file:///d:/Sanjeevani/backend/evals/eval_report.md) containing the summary badge, clinical metrics table, latency percentiles (P50/P90/P99), and confusion matrix.
- **Machine-Readable JSON**: [`backend/evals/eval_results.json`](file:///d:/Sanjeevani/backend/evals/eval_results.json) containing all individual vignette traces, clinical flags, and timing data.
