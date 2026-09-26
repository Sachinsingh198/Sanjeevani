"""
Sanjeevani Voice Engine Benchmarking & Comparison Tool
Test different Bhashini ULCA models and compare against Sarvam AI and Neural Indic Edge-TTS.

Usage:
    python scripts/test_tts_models.py
    python scripts/test_tts_models.py --model bhashini/bodhan/indic-tts
    python scripts/test_tts_models.py --text "नमस्ते! आप कैसे महसूस कर रहे हैं?"
"""

import os
import sys
import time
import argparse
import asyncio
from typing import Optional
from dotenv import load_dotenv

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from app.core.bhashini_client import bhashini_client
from app.core.tts_engine import get_shared_tts_engine

KNOWN_BHASHINI_MODELS = [
    {
        "id": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
        "name": "AI4Bharat Coqui Indo-Aryan (FastPitch / GPU-T4)",
        "org": "AI4Bharat / IIT Madras",
        "languages": "hi, bn, gu, mr, pa, or",
        "description": "Government standard open-source TTS pipeline. High accuracy, slightly formal cadence."
    },
    {
        "id": "ai4bharat/indic-tts-coqui-dravidian-gpu--t4",
        "name": "AI4Bharat Coqui Dravidian (GPU-T4)",
        "org": "AI4Bharat / IIT Madras",
        "languages": "ta, te, kn, ml",
        "description": "Standard Dravidian national pipeline."
    },
    {
        "id": "bhashini/bodhan/indic-tts",
        "name": "Bodhan AI Indic TTS",
        "org": "Bodhan AI Community",
        "languages": "hi",
        "description": "Orpheus-based Indic TTS community model hosted on Bhashini."
    }
]

async def test_bhashini_model(service_id: str, text: str, gender: str = "female") -> Optional[bytes]:
    callback_url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": "hi"},
                    "serviceId": service_id,
                    "gender": gender
                }
            }
        ],
        "inputData": {
            "input": [{"source": text[:380]}]
        }
    }
    headers = {
        "Authorization": bhashini_client.inference_api_key,
        "Content-Type": "application/json"
    }

    t0 = time.time()
    client = bhashini_client._get_client()
    resp = await client.post(callback_url, json=payload, headers=headers)
    latency = int((time.time() - t0) * 1000)

    if resp.status_code == 200:
        import base64
        data = resp.json()
        audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
        raw = base64.b64decode(audio_b64)
        print(f"  [SUCCESS] Latency: {latency}ms | Audio Size: {len(raw)} bytes")
        return raw
    else:
        print(f"  [FAILED] HTTP {resp.status_code}: {resp.text[:200]}")
        return None

async def main():
    parser = argparse.ArgumentParser(description="Test and compare TTS models for Sanjeevani")
    parser.add_argument("--model", type=str, default=None, help="Custom Bhashini serviceId to test")
    parser.add_argument("--text", type=str, default="Aapke bataye lakshano ke aadhar par mausami bukhar lag raha hai. Kripya garam paani piyein aur aaram karein.", help="Text to speak")
    parser.add_argument("--gender", type=str, default="female", help="Voice gender (female/male)")
    args = parser.parse_args()

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test_audio_outputs")
    os.makedirs(out_dir, exist_ok=True)

    print("=================================================================")
    print("      SANJEEVANI VOICE ENGINE BENCHMARK & MODEL TESTER           ")
    print("=================================================================")
    print(f"Sample Text: \"{args.text}\"")
    print(f"Output Directory: {out_dir}\n")

    # 1. Test Bhashini Model(s)
    models_to_test = [args.model] if args.model else [m["id"] for m in KNOWN_BHASHINI_MODELS]

    for model_id in models_to_test:
        print(f"\n--> Testing Bhashini Model: {model_id}")
        audio = await test_bhashini_model(model_id, args.text, gender=args.gender)
        if audio:
            safe_name = model_id.replace("/", "_").replace("-", "_")
            out_path = os.path.join(out_dir, f"bhashini_{safe_name}.wav")
            with open(out_path, "wb") as f:
                f.write(audio)
            print(f"    Saved to: {out_path}")

    # 2. Test Sarvam AI (bulbul:v3)
    print("\n--> Testing Sarvam AI (bulbul:v3 - Primary Natural Engine)")
    tts_engine = get_shared_tts_engine()
    t0 = time.time()
    sarvam_res = await tts_engine._synthesize_sarvam(args.text, language="hi", gender=args.gender)
    latency_sarvam = int((time.time() - t0) * 1000)
    if sarvam_res:
        audio, mime = sarvam_res
        out_path = os.path.join(out_dir, "sarvam_bulbul_v3.wav")
        with open(out_path, "wb") as f:
            f.write(audio)
        print(f"  [SUCCESS] Latency: {latency_sarvam}ms | Audio Size: {len(audio)} bytes")
        print(f"    Saved to: {out_path}")
    else:
        print("  [SKIPPED] Sarvam AI key missing or request failed.")

    # 3. Test Edge-TTS (Neural Indic - Microsoft Swara)
    print("\n--> Testing Neural Indic Edge-TTS (hi-IN-SwaraNeural)")
    t0 = time.time()
    edge_res = await tts_engine._synthesize_neural_indic(args.text, language="hi", gender=args.gender)
    latency_edge = int((time.time() - t0) * 1000)
    if edge_res:
        out_path = os.path.join(out_dir, "neural_indic_swara.mp3")
        with open(out_path, "wb") as f:
            f.write(edge_res)
        print(f"  [SUCCESS] Latency: {latency_edge}ms | Audio Size: {len(edge_res)} bytes")
        print(f"    Saved to: {out_path}")

    print("\n=================================================================")
    print("HOW TO CHANGE THE DEFAULT MODEL IN SANJEEVANI:")
    print("In backend/.env, set:")
    print("  BHASHINI_TTS_SERVICE_ID=ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4")
    print("  (or any other serviceId from https://meity-origin.ulcacontrib.org)")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(main())
