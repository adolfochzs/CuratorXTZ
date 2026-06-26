export default function Card({ data }: { data: any }) {
  const isRecommended = data.f2_recommend_sidecar;
  
  // Resolve IPFS URL for image display
  const resolveIpfs = (url: string) => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
    }
    return url;
  };

  const imgUrl = resolveIpfs(data.display_uri || data.artifact_uri);

  return (
    <div className={`glass-panel overflow-hidden flex flex-col transition-transform hover:-translate-y-1 hover:shadow-2xl ${isRecommended ? 'border-primary/30' : 'border-white/5'}`}>
      <div className="h-48 overflow-hidden relative bg-black/50">
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
        <div className="absolute top-3 right-3 glass-panel px-2 py-1 text-xs font-bold font-mono">
          {data.f2_score}/10
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-1 truncate">{data.name}</h3>
        <p className="text-sm text-gray-400 font-mono mb-4 truncate">{data.creator}</p>
        
        <div className="mb-4">
          <span className="inline-block px-2 py-1 bg-white/5 rounded text-xs font-mono text-accent border border-accent/20">
            {data.f2_category}
          </span>
        </div>
        
        <p className="text-sm text-gray-300 leading-relaxed flex-1">
          {data.f2_verdict}
        </p>
      </div>
    </div>
  );
}
