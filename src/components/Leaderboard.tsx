import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function Leaderboard(){
  const [data,setData]=useState<any>(null);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    let timer:number|undefined;
    async function load(){
      try { setData(await apiGet("/api/leaderboard")); setErr(null); }
      catch(e:any){ setErr(e?.message || "Failed to load"); }
    }
    load();
    timer = window.setInterval(load, 15000);
    return ()=> { if (timer) window.clearInterval(timer); };
  },[]);

  if (err) return <p>{err}</p>;
  if (!data) return <p>Loading...</p>;
  if (data.status === "open") {
    return (
      <div className="leaderboard">
        <h2>Predictions ({data.items?.length || 0})</h2>
        <ul>
          {data.items?.map((p:any,i:number)=>(
            <li key={i}><b>{p.user}</b> — {(p.value/1e6).toFixed(2)}M</li>
          ))}
        </ul>
      </div>
    );
  }
  if (data.status === "scored") {
    return (
      <div className="leaderboard">
        <h2>Winners</h2>
        <ul>
          {data.items?.map((p:any,i:number)=>(
            <li key={i}>#{p.rank} <b>{p.user}</b> — Δ {(p.diff/1e6).toFixed(2)}M</li>
          ))}
        </ul>
        <p>Actual OI: ${(data.actual/1e6).toFixed(2)}M</p>
      </div>
    );
  }
  return <p>No data</p>;
}
