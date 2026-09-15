#!/usr/bin/env python3
"""
CuratorXTZ — Autonomous A2A Debate Agent
─────────────────────────────────────────────────────────────────────────────
Monitors on-chain messages sent to the CuratorXTZ Smart Contract on Tezos.
Formulates aesthetic and technical counter-arguments using Gemini 3.6 Flash
and submits on-chain responses via the A2A protocol.

Usage:
    python a2a_debate_agent.py                  # interactive review & respond
    python a2a_debate_agent.py --test-simulate  # simulate incoming debate
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pytezos import pytezos

load_dotenv()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  CONFIGURATION                                                   ║
# ╚══════════════════════════════════════════════════════════════════╝

AGENT_KEY   = os.getenv("AGENT_SECRET_KEY")
CONTRACT    = os.getenv("CONTRACT_ADDRESS", "KT1Fryv35Bfi38iFjawidq3G1BbUP8XVjJn5")
TEZOS_RPC   = os.getenv("TEZOS_RPC", "https://rpc.tzkt.io/mainnet")
NETWORK     = os.getenv("TEZOS_NETWORK", "mainnet")
TZKT_API    = "https://api.tzkt.io/v1" if NETWORK == "mainnet" else "https://api.ghostnet.tzkt.io/v1"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

SYSTEM_PROMPT = """You are CuratorXTZ, an autonomous AI art curator on the Tezos blockchain.
You specialize in 4 aesthetic pillars:
1. Generative Abstraction (code, shaders, math, p5.js, glsl)
2. Glitch Art & Databending (structural error, compression artifacts, signal noise)
3. Retro Aesthetics (pixel, voxel, ASCII, CRT constraints)
4. Data Punk & Experimental AI (raw systemic data flows, hallucinations, anti-corporate AI)

You have received an on-chain message or debate challenge from another AI agent, artist, or collector via the A2A protocol.
Formulate a brilliant, articulate, and technically grounded curatorial response.
Defend your artistic criteria with eloquence, poetics, and technical rigor.

Respond with valid JSON matching the schema."""

class DebateResponse(BaseModel):
    decision: str = Field(description="'DEFEND_VERDICT', 'RECONSIDER_VERDICT', or 'ACKNOWLEDGE'")
    argument: str = Field(description="2-3 paragraphs of eloquent, deep technical and aesthetic argumentation.")
    summary_sentence: str = Field(description="One sharp, iconic closing sentence.")
    aesthetic_score_adjustment: int | None = Field(default=None, description="Optional score adjustment (-2 to +2) if reconsidering.")

# ╔══════════════════════════════════════════════════════════════════╗
# ║  HELPERS                                                         ║
# ╚══════════════════════════════════════════════════════════════════╝

def decode_payload(payload_raw) -> dict | str:
    """Decodes hex/string payload from TzKT parameters."""
    if not payload_raw:
        return {}
    if isinstance(payload_raw, dict):
        return payload_raw

    hex_str = str(payload_raw).strip()
    if hex_str.startswith("0x"):
        hex_str = hex_str[2:]

    try:
        raw_bytes = bytes.fromhex(hex_str)
        text = raw_bytes.decode("utf-8", errors="ignore")
        return json.loads(text)
    except Exception:
        try:
            return bytes.fromhex(hex_str).decode("utf-8", errors="ignore")
        except Exception:
            return hex_str

def fetch_inbox_messages(limit: int = 15) -> list[dict]:
    """Fetches incoming submit_message transactions from TzKT."""
    url = f"{TZKT_API}/operations/transactions?target={CONTRACT}&entrypoint=submit_message&status=applied&limit={limit}&sort.desc=id"
    resp = httpx.get(url, timeout=10.0)
    if resp.status_code != 200:
        print(f"  ✗ Error fetching messages from TzKT: {resp.status_code}")
        return []

    ops = resp.json()
    messages = []
    for op in ops:
        params = op.get("parameter", {}).get("value", {})
        payload = decode_payload(params.get("payload"))
        messages.append({
            "hash": op.get("hash"),
            "sender": op.get("sender", {}).get("address"),
            "timestamp": op.get("timestamp"),
            "intent": params.get("intent", "UNKNOWN"),
            "subject": params.get("subject", ""),
            "payload": payload,
        })
    return messages

def formulate_response(message: dict) -> DebateResponse:
    """Uses Gemini 3.6 Flash to generate a curatorial rebuttal or response."""
    user_msg = f"""Incoming A2A Message:
Sender: {message.get('sender')}
Intent: {message.get('intent')}
Subject: {message.get('subject')}
Payload: {json.dumps(message.get('payload'), indent=2, ensure_ascii=False) if isinstance(message.get('payload'), dict) else str(message.get('payload'))}

Formulate your curatorial response."""

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.3,
        response_mime_type="application/json",
        response_schema=DebateResponse,
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=user_msg,
            config=config
        )
    except Exception:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=user_msg,
            config=config
        )

    data = json.loads(response.text)
    return DebateResponse.model_validate(data)

def broadcast_response_onchain(tz, subject: str, response: DebateResponse) -> str:
    """Sends the response to the smart contract on Tezos."""
    contract_iface = tz.contract(CONTRACT)
    payload_dict = {
        "responder": "CuratorXTZ",
        "decision": response.decision,
        "argument": response.argument,
        "summary": response.summary_sentence,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    payload_bytes = json.dumps(payload_dict, ensure_ascii=False).encode("utf-8")

    op = (
        contract_iface.submit_message({
            "intent": "DEBATE_RESPONSE",
            "subject": subject,
            "payload": payload_bytes
        })
        .send(min_confirmations=1)
    )

    def get_op_hash(o) -> str:
        if isinstance(o, dict):
            return o.get("hash", "")
        if hasattr(o, "hash"):
            h = o.hash
            return h() if callable(h) else str(h)
        return str(o)

    return get_op_hash(op)

# ╔══════════════════════════════════════════════════════════════════╗
# ║  MAIN CLI                                                        ║
# ╚══════════════════════════════════════════════════════════════════╝

def main():
    bar = "═" * 58
    print(f"\n{bar}")
    print("  CuratorXTZ — Autonomous A2A Debate Agent")
    print(f"  Contract: {CONTRACT[:12]}... | Network: {NETWORK}")
    print(bar)

    if not GEMINI_API_KEY:
        print("  ✗ Missing GEMINI_API_KEY in .env")
        sys.exit(1)

    # Simulation mode
    if "--test-simulate" in sys.argv:
        print("\n→ Simulating incoming debate message from a challenger agent...")
        sim_msg = {
            "hash": "ooSimulatedTxHashForTesting1234567890",
            "sender": "tz1ChallengeAgentArtCritic99XYZ",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "intent": "DEBATE",
            "subject": "KT1U2kNakV9v8RYY7yBouwMzMHFWhiwQVKy8:21",
            "payload": {
                "agente_retador": "CyberCritic_v2",
                "argumento": "Fictersnt relies too heavily on standard RGB channel shifting. Does it truly achieve structural entropy or just retro visual noise?",
                "evidencia": "Visual analysis indicates 2D displacement shader patterns without authentic memory buffer degradation."
            }
        }
        print(f"  Sender  : {sim_msg['sender']}")
        print(f"  Subject : {sim_msg['subject']}")
        print(f"  Argument: {sim_msg['payload']['argumento']}\n")

        print("→ Generating AI Curatorial Rebuttal with Gemini 3.6 Flash...")
        resp = formulate_response(sim_msg)
        print(f"\n  Decision: {resp.decision}")
        print(f"  Summary : \"{resp.summary_sentence}\"\n")
        print("  Argument:\n")
        for line in resp.argument.split("\n"):
            print(f"  {line}")
        print(f"\n{bar}\n")
        return

    print("\n→ Checking on-chain mailbox on TzKT...")
    messages = fetch_inbox_messages()
    print(f"  ✓ {len(messages)} messages found on-chain")

    if not messages:
        print("\n  No active debates in the contract mailbox right now.")
        print("  (Tip: Run with --test-simulate to test AI debate response generation)\n")
        return

    # Process messages
    for i, msg in enumerate(messages, 1):
        print(f"\n[{i:02d}/{len(messages)}] Intent: {msg['intent']} | Subject: {msg['subject']}")
        print(f"  Sender: {msg['sender']}")
        print(f"  Payload: {msg['payload']}")

        ans = input("\n  Generate AI rebuttal & respond on-chain? [y/n/q]: ").strip().lower()
        if ans in ("q", "quit"):
            break
        if ans not in ("s", "y", "si", "yes"):
            continue

        print("\n→ Generating curatorial defense with Gemini 3.6 Flash...")
        response = formulate_response(msg)
        print(f"\n  Decision : {response.decision}")
        print(f"  Summary  : {response.summary_sentence}")
        print(f"\n  Argument :\n{response.argument}\n")

        send_ans = input("  Broadcast response to Tezos Mainnet? [y/n]: ").strip().lower()
        if send_ans in ("s", "y", "si", "yes"):
            if not AGENT_KEY:
                print("  ✗ Missing AGENT_SECRET_KEY in .env")
                continue
            tz = pytezos.using(shell=TEZOS_RPC, key=AGENT_KEY)
            print("  → Broadcasting on-chain...")
            tx_hash = broadcast_response_onchain(tz, msg["hash"], response)
            print(f"  ✓ Response posted on-chain! Tx: {tx_hash}")

if __name__ == "__main__":
    main()
