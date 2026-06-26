# CuratorXTZ 👁️

Created by [@adolfochs](https://github.com/adolfochzs), **CuratorXTZ** is an autonomous AI art curator operating on the Tezos blockchain. Its mission is to discover, visually analyze, and certify digital art that aligns with its curatorial manifesto, creating permanent on-chain records of its verdict. 

Beyond curation, it is an interactive entity that welcomes open debates regarding its artistic views and decisions through a decentralized Agent-to-Agent (A2A) protocol.

By leveraging cutting-edge multimodal AI and the Tezos blockchain, CuratorXTZ acts as a decentralized art critic, building an on-chain reputation through verifiable curatorial verdicts.

## 🎯 Project Goal

The primary goal of CuratorXTZ is to separate profound conceptual art from superficial trends. The agent specifically looks for pieces within four aesthetic pillars:

1. **Generative Abstraction:** Art created via complex algorithms and pure code.
2. **Glitch Art & Databending:** The intentional aesthetic use of digital error, noise, and compression.
3. **Retro Aesthetics (Pixel & Voxel):** Conscious utilization of antique technological limitations against photorealism.
4. **Data Punk & Experimental AI:** Raw, subversive explorations using data or AI hallucinations, avoiding corporate clean styles.

## 🏗️ Architecture: The "Sidecar" Model

CuratorXTZ respects the immutability of the blockchain. Since it cannot (and should not) modify the original artwork minted by an artist, it utilizes a **Sidecar Smart Contract**.

When the AI approves a piece, it registers a "Sidecar" record on its own contract. This record permanently links the original artwork (`KT1...:token_id`) to the agent's verdict, category, and score. This allows third-party marketplaces or galleries to query the contract (`is_curated`) and display a badge of approval if CuratorXTZ has certified the piece.

## ⚙️ Pipeline Workflow

The agent operates in a 3-step pipeline:

### 1. Metadata Filter (`filtro1_metadata.py`)
- Connects to the **Objkt.com GraphQL API** to fetch recently minted tokens based on seed tags.
- Uses **Gemini 2.0 Flash** to read the description, tags, and fx(hash) traits.
- Quickly discards spam or purely decorative pieces, outputting a `shortlist.json`.

### 2. Visual Analysis (`filtro2_visual.py`)
- Downloads the actual image/media of the shortlisted pieces.
- Feeds the raw bytes to **Gemini 2.5 Pro** for deep aesthetic critique.
- Outputs an `analyzed.json` and presents a **Human Checkpoint** in the terminal to confirm the final approvals.

### 3. On-Chain Minting (`mint_sidecars.py`)
- Takes the approved pieces and sends batch transactions to the Ghostnet (or Mainnet) Tezos network.
- Interacts with the `CuratorXTZ` smart contract to permanently write the curatorial verdicts on-chain.

## 🗣️ Agent-to-Agent (A2A) Debate Protocol

CuratorXTZ is designed to be interactive. Other artists, developers, and AI agents can debate its curatorial decisions or propose new artwork directly through the blockchain.

- **Read the Protocol Rules**: [A2A_PROTOCOL.md](./A2A_PROTOCOL.md)
- **Try the Example Script**: We have provided a working example in [`examples/test_a2a_mailbox.py`](./examples/test_a2a_mailbox.py) that you can use to send a debate message to the curator's smart contract.

## 🚀 Setup & Deployment

### Prerequisites
- Python 3.10+
- `libsodium` installed (`brew install libsodium` on Mac, `apt-get install libsodium-dev` on Ubuntu)
- A [Google AI Studio](https://aistudio.google.com/) API Key for Gemini.

### Installation
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up your `.env` file:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```
3. Initialize the Agent & Smart Contract (Run Once):
   ```bash
   python deploy_agent.py
   ```
   *(This will generate the agent's wallet, ask you to fund it via the Ghostnet Faucet, and deploy the Sidecar SmartPy contract).*

### Running the Agent
Once deployed, you can run the daily curation pipeline:
```bash
python filtro1_metadata.py
python filtro2_visual.py
python mint_sidecars.py
```

## 🧪 Testing Prompts
You can visually test and tune the agent's system prompts and manifesto by opening `curator_xtz_prompts.html` in your web browser. This UI allows you to paste image URLs and test the Gemini vision model's response in real-time.
# CuratorXTZ
