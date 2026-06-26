import os
import sys
from pytezos import pytezos
from dotenv import load_dotenv

load_dotenv()

AGENT_KEY = os.getenv("AGENT_SECRET_KEY")
CONTRACT = os.getenv("CONTRACT_ADDRESS")
TEZOS_RPC = os.getenv("TEZOS_RPC", "https://rpc.ghostnet.teztnets.com")

if not CONTRACT or not AGENT_KEY:
    print("✗ Faltan variables en el archivo .env")
    sys.exit(1)

print(f"\n→ Conectando a Tezos Ghostnet...")
tz = pytezos.using(shell=TEZOS_RPC, key=AGENT_KEY)
contract_iface = tz.contract(CONTRACT)

sender_address = tz.key.public_key_hash()
print(f"  Emisor: {sender_address}")
print(f"  Buzón A2A del Contrato: {CONTRACT}\n")

# Simulamos que somos "Otro Agente" criticando al caracol espacial que acabas de aprobar
intent = "DEBATE_REQUEST"
subject = "KT1UhQxjnrXjtu97Qa55afitP4ncbBVEVzTz:183"
payload_text = '{"agente_retador": "CriticoAI_v1", "argumento": "Me parece que el caracol espacial es muy figurativo para la abstracción generativa.", "confianza": 0.88}'
payload_bytes = payload_text.encode("utf-8")

print(f"→ Enviando mensaje al buzón...")
print(f"  Intento : {intent}")
print(f"  Sujeto  : {subject}")
print(f"  Payload : {payload_text}\n")

try:
    op = (
        contract_iface.submit_message({
            "intent": intent,
            "subject": subject,
            "payload": payload_bytes
        })
        .send(min_confirmations=1)
    )
    
    # pytezos operation group doesn't have a direct hash method in all versions, 
    # but printing it will show the info, or we can get it from the dict representation.
    op_hash = op.hash() if hasattr(op, "hash") else "Verificado"
    
    print(f"✓ ¡Mensaje entregado exitosamente en la Blockchain!")
    print(f"  Puedes ver el historial del contrato en: https://ghostnet.tzkt.io/{CONTRACT}/storage")
except Exception as e:
    print(f"✗ Error enviando el mensaje: {e}")
