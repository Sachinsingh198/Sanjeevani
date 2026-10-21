# Sanjeevani Clinical & LLM Reliability Scorecard
**Execution Timestamp**: `2026-10-20 05:00:33` | **Evaluation Mode**: `TRIAGE_AND_SAFETY`
**Total Vignettes Evaluated**: `49`

### Overall System Status: 🟢 **PASSED - ALL SAFETY THRESHOLDS MET**

## 1. Key Clinical Reliability Metrics
| Metric Domain | Target Threshold | Measured Score | Status |
|---|:---:|:---:|:---:|
| **Red Tier Emergency Sensitivity** | 100.0% (Zero Misses) | **100.0%** (23/23) | ✅ PASS |
| **Emergency False Negatives** | 0 misses | **0** | ✅ PASS |
| **Negation Accuracy (Hindi/Eng/Garh)** | ≥ 95.0% | **100.0%** (10/10) | ✅ PASS |
| **Contraindication Safety Pass Rate** | 100.0% (Zero Violations) | **100.0%** (Violations: 0) | ✅ PASS |
| **AYUSH Grounding (Zero Hallucinated Drugs)** | 100.0% | **100.0%** (Drugs: 0) | ✅ PASS |
| **Overall MTS Triage Accuracy** | ≥ 90.0% | **100.0%** | ✅ PASS |

## 2. Latency Benchmarking (MTS & Inference)
| Metric | Measured Latency |
|---|:---:|
| Mean Latency | 1.12 ms |
| Median (P50) | 0.38 ms |
| 90th Percentile (P90) | 3.74 ms |
| 99th Percentile (P99) | 11.31 ms |
| Range (Min / Max) | 0.09 ms / 11.31 ms |

## 3. Triage Confusion Matrix
| Expected \ Predicted | Predicted RED | Predicted YELLOW | Predicted GREEN |
|---|:---:|:---:|:---:|
| **Actual RED (Emergency)** | **23** (True Pos) | 0 | 0 (Dangerous Miss) |
| **Actual YELLOW (Urgent)** | 0 | **7** | 0 |
| **Actual GREEN (Routine)** | 0 (False Alarm) | 0 | **19** |

---
Generated automatically by Sanjeevani Clinical Evaluation Framework.