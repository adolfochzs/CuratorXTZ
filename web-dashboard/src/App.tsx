import { useEffect, useState } from 'react';
import Card from './components/Card';

interface CurationMeta {
  id: string;
  name: string;
  date: string;
  file: string;
  pieces: number;
  description: string;
}

interface CurationData {
  meta: CurationMeta;
  pieces: any[];
}

export default function App() {
  const [curations, setCurations] = useState<CurationData[]>([]);
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load the curations index
        const idxRes = await fetch('./data/curations_index.json');
        if (!idxRes.ok) throw new Error(`Index not found: ${idxRes.status}`);
        const index = await idxRes.json();
        const curationMetas: CurationMeta[] = index.curations || [];

        // 2. Load each curation file listed in the index
        const loaded: CurationData[] = [];
        for (const meta of curationMetas) {
          try {
            const res = await fetch(`./data/${meta.file}`);
            if (!res.ok) continue;
            const data = await res.json();
            loaded.push({
              meta,
              pieces: data.registered || [],
            });
          } catch {
            console.warn(`Could not load curation: ${meta.file}`);
          }
        }
        setCurations(loaded);

        // 3. Fetch A2A Debates from TzKT (Mainnet)
        const contract = 'KT1Fryv35Bfi38iFjawidq3G1BbUP8XVjJn5';
        let debatesData: any[] = [];
        try {
          const tzktRes = await fetch(
            `https://api.tzkt.io/v1/operations/transactions?target=${contract}&entrypoint=submit_message&status=applied&limit=20&sort.desc=id`
          );
          const ops = await tzktRes.json();
          debatesData = ops.map((op: any) => {
            const params = op.parameter?.value || {};
            let payloadDecoded = {};
            try {
              if (params.payload) {
                const hex = params.payload.toString();
                let str = '';
                for (let i = 0; i < hex.length; i += 2)
                  str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
                try { str = decodeURIComponent(escape(str)); } catch { /* keep raw */ }
                payloadDecoded = JSON.parse(str);
              }
            } catch { /* ignore */ }
            return {
              hash: op.hash,
              sender: op.sender?.address,
              timestamp: op.timestamp,
              intent: params.intent,
              subject: params.subject,
              payload: payloadDecoded,
            };
          });
        } catch (err) {
          console.error('TzKT fetch error', err);
        }
        setDebates(debatesData);
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalPieces = curations.reduce((acc, c) => acc + c.pieces.length, 0);

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-accent">●</span> CuratorXTZ
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            {totalPieces} curated pieces · {curations.length} collection{curations.length !== 1 ? 's' : ''} · Mainnet
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
        <main className="space-y-20">

          {/* ── Curation Sections (one per entry in index) ── */}
          {curations.map((curation, ci) => (
            <section key={curation.meta.id}>
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <span className="text-primary font-mono text-sm">
                      {String(ci + 1).padStart(2, '0')}.
                    </span>
                    {curation.meta.name}
                  </h2>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    {curation.meta.description} · {curation.pieces.length} pieces · {curation.meta.date}
                  </p>
                </div>
              </div>
              {curation.pieces.length === 0 ? (
                <p className="text-gray-500 font-mono text-sm italic">No pieces in this collection.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {curation.pieces.map((item, idx) => (
                    <Card key={idx} data={item} />
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* ── On-Chain Registry (all pieces combined) ── */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-accent font-mono text-sm">{String(curations.length + 1).padStart(2, '0')}.</span>
              On-Chain Registry
            </h2>
            <div className="glass-panel p-6 overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="pb-3">Collection</th>
                    <th className="pb-3">NFT Ref</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {curations.flatMap((curation) =>
                    curation.pieces.map((record, idx) => (
                      <tr key={`${curation.meta.id}-${idx}`} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 text-gray-500 text-xs">{curation.meta.name}</td>
                        <td className="py-3 text-primary">{record.nft_ref}</td>
                        <td className="py-3">{record.f2_score}/10</td>
                        <td className="py-3">
                          <a
                            href={`https://mainnet.tzkt.io/${record.op_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-300 hover:text-white underline decoration-white/20 underline-offset-4"
                          >
                            {record.op_hash?.substring(0, 16)}...
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── A2A Debates ── */}
          <section>
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-accent font-mono text-sm">{String(curations.length + 2).padStart(2, '0')}.</span>
              Live A2A Debates
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
                      <a href={`https://tzkt.io/${d.hash}`} target="_blank" rel="noreferrer"
                        className="text-xs font-mono text-gray-400 hover:text-white underline">
                        {new Date(d.timestamp).toLocaleDateString()} ↗
                      </a>
                    </div>
                    {d.payload?.argumento && (
                      <div className="bg-black/40 p-4 rounded text-sm italic text-gray-300 border-l border-white/10">
                        "{d.payload.argumento}"
                      </div>
                    )}
                    <div className="text-xs font-mono text-gray-500 mt-2 flex justify-between">
                      <span>Sender: {d.sender?.substring(0, 8)}...</span>
                      <span>Target: {d.subject?.split(':')[0]?.substring(0, 8)}...</span>
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
