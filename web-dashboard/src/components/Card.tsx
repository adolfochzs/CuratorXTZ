import { useState } from 'react';

export default function Card({ data }: { data: any }) {
  const [sealHovered, setSealHovered] = useState(false);

  // Resolve IPFS URL for image display
  const resolveIpfs = (url: string) => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
    }
    return url;
  };

  // Use local image if available, fall back to IPFS
  const imgUrl = data.display_uri_local
    ? data.display_uri_local
    : resolveIpfs(data.display_uri || data.artifact_uri);

  // Build Objkt link from nft_ref "KT1xxx:token_id"
  const objktUrl = data.nft_ref
    ? `https://objkt.com/tokens/${data.nft_ref.replace(':', '/')}`
    : null;

  const tzktUrl = data.op_hash
    ? `https://mainnet.tzkt.io/${data.op_hash}`
    : null;

  // Format date
  const curatedDate = data.onchain_at
    ? new Date(data.onchain_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  // Short contract address for the seal
  const CONTRACT = 'KT1Fryv35Bfi38iFjawidq3G1BbUP8XVjJn5';
  const shortContract = `${CONTRACT.slice(0, 8)}…${CONTRACT.slice(-4)}`;

  return (
    <div className="glass-panel overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-2xl border border-white/10 relative">

      {/* Image */}
      <div className="h-52 overflow-hidden relative bg-black/50">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={data.name}
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-gray-600">
            NO IMAGE DATA
          </div>
        )}
        {/* Score badge */}
        <div className="absolute top-3 right-3 glass-panel px-2 py-1 text-xs font-bold font-mono">
          {data.f2_score}/10
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-1 truncate">{data.name}</h3>
        <p className="text-sm text-gray-400 font-mono mb-3 truncate">{data.creator}</p>

        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-white/5 rounded text-xs font-mono text-accent border border-accent/20">
            {data.f2_category || data.category}
          </span>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed flex-1">
          {data.f2_verdict}
        </p>

        {/* ── Curatorial Seal ─────────────────────────────── */}
        {data.op_hash && (
          <div
            className="mt-4 relative"
            onMouseEnter={() => setSealHovered(true)}
            onMouseLeave={() => setSealHovered(false)}
          >
            {/* Verdict tooltip — appears above on hover */}
            <div
              className={`absolute bottom-full left-0 right-0 mb-2 p-4 rounded-lg border border-accent/40 bg-black/95 backdrop-blur-sm z-10 transition-all duration-200 ${
                sealHovered ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <div className="text-xs font-mono text-accent tracking-widest uppercase mb-2 flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                On-Chain Curatorial Verdict
              </div>
              <p className="text-xs text-gray-200 leading-relaxed italic">
                "{data.f2_verdict}"
              </p>
              <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs font-mono text-gray-500">Score: {data.f2_score}/10</span>
                <a
                  href={tzktUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-accent hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Verify on-chain ↗
                </a>
              </div>
            </div>

            {/* The seal itself */}
            <a
              href={tzktUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors group"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-accent/60 flex items-center justify-center bg-black/40 group-hover:border-accent transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-accent tracking-widest uppercase leading-tight">
                  Curated by CuratorXTZ
                </div>
                <div className="text-xs font-mono text-gray-500 truncate mt-0.5">
                  {shortContract} · {curatedDate}
                </div>
              </div>
              <div className="text-xs font-mono text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0">
                hover ↑
              </div>
            </a>
          </div>
        )}

        {/* Objkt link */}
        {objktUrl && (
          <div className="mt-3">
            <a
              href={objktUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full block text-center text-xs font-mono px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-gray-300 hover:text-white transition-colors"
            >
              Ver en Objkt ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
