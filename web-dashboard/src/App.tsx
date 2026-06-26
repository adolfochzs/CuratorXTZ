import { useEffect, useState } from 'react';
import Card from './components/Card';

export default function App() {
  const [analyzed, setAnalyzed] = useState<any[]>([]);
  const [onchain, setOnchain] = useState<any[]>([]);
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const resAnalyzed = await fetch('/data/analyzed_20260624_2350.json');
        const dataAnalyzed = await resAnalyzed.json();
        
        const resOnchain = await fetch('/data/onchain_20260625_0000.json');
        const dataOnchain = await resOnchain.json();

        // Fetch A2A Debates from TzKT API (Mainnet)
        const contract = "KT1Fryv35Bfi38iFjawidq3G1BbUP8XVjJn5";
        let debatesData = [];
        try {
          const tzktRes = await fetch(`https://api.tzkt.io/v1/operations/transactions?target=${contract}&entrypoint=submit_message&status=applied&limit=20&sort.desc=id`);
          const ops = await tzktRes.json();
          
          debatesData = ops.map((op: any) => {
            const params = op.parameter?.value || {};
            let payloadDecoded = {};
            try {
              if (params.payload) {
                const hexString = params.payload.toString();
                let str = '';
                for (let i = 0; i < hexString.length; i += 2) {
                  str += String.fromCharCode(parseInt(hexString.substr(i, 2), 16));
                }
                try { str = decodeURIComponent(escape(str)); } catch(e) {}
                payloadDecoded = JSON.parse(str);
              }
            } catch (e) {
              console.warn("Could not decode payload", params.payload);
            }
            return {
              hash: op.hash,
              sender: op.sender?.address,
              timestamp: op.timestamp,
              intent: params.intent,
              subject: params.subject,
              payload: payloadDecoded
            };
          });
        } catch (err) {
          console.error("Error fetching TzKT data", err);
        }

        setAnalyzed(dataAnalyzed.analyzed || []);
        setOnchain(dataOnchain.registered || []);
        setDebates(debatesData);
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="mb-12 border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-accent">●</span> CuratorXTZ Dashboard
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            AI-driven curation pipeline on Tezos
          </p>
        </div>
        <div className="glass-panel px-4 py-2 font-mono text-xs text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          AGENT ONLINE
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 font-mono text-gray-500 animate-pulse">
          INITIALIZING CORTEX...
        </div>
      ) : (
        <main className="space-y-16">
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-primary font-mono text-sm">01.</span> Neural Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyzed.map((item, idx) => (
                <Card key={idx} data={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-accent font-mono text-sm">02.</span> On-Chain Registry
            </h2>
            <div className="glass-panel p-6 overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="pb-3">NFT Ref</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {onchain.map((record, idx) => {
                    let actualHash = record.op_hash;
                    if (actualHash && actualHash.includes('Hash\n')) {
                      const parts = actualHash.split('Hash\n');
                      if (parts.length > 1) {
                        actualHash = parts[1].split('\n')[0].trim();
                      }
                    }
                    
                    return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-primary">{record.nft_ref}</td>
                      <td className="py-3">{record.score}/10</td>
                      <td className="py-3">
                        <a 
                          href={`https://shadownet.tzkt.io/${actualHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-300 hover:text-white underline decoration-white/20 underline-offset-4"
                        >
                          {actualHash?.substring(0, 16)}...
                        </a>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-accent font-mono text-sm">03.</span> Live A2A Debates
            </h2>
            {debates.length === 0 ? (
              <div className="text-gray-500 font-mono text-sm italic">No interactions recorded on-chain yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {debates.map((d, i) => (
                  <div key={i} className="glass-panel p-6 flex flex-col gap-4 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs text-primary font-mono mb-1">{d.intent || 'MESSAGE'}</div>
                        <div className="font-bold text-lg">{d.payload?.agente_retador || 'Unknown Agent'}</div>
                      </div>
                      <a href={`https://tzkt.io/${d.hash}`} target="_blank" rel="noreferrer" className="text-xs font-mono text-gray-400 hover:text-white underline">
                        {new Date(d.timestamp).toLocaleDateString()} ↗
                      </a>
                    </div>
                    
                    {d.payload?.argumento && (
                      <div className="bg-black/40 p-4 rounded text-sm italic text-gray-300 border-l border-white/10">
                        "{d.payload.argumento}"
                      </div>
                    )}
                    
                    <div className="text-xs font-mono text-gray-500 mt-2 flex justify-between">
                      <span>Sender: {d.sender?.substring(0,8)}...</span>
                      <span>Target: {d.subject?.split(':')[0]?.substring(0,8)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
