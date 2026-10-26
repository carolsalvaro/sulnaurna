// Sul na Urna — consulta dos 27 arquivos estaduais oficiais do TSE, 2º turno de 2026.
// O endpoint serve somente resultados publicados pela Justiça Eleitoral, sem projeções.
const UFS = "ac al ap am ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split(" ");
const SRC = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/";
function parseResult(uf, json) {
  if (String(json.ele)!=="6258" || String(json.t)!=="2" || json.cdabr!==uf) throw new Error("Identificação da eleição inválida para "+uf);
  const cargo=(json.carg||[]).find(c=>String(c.cd)==="1");
  if(!cargo) throw new Error("Presidente ausente: "+uf);
  const candidates=(cargo.agr||[]).flatMap(g=>(g.par||[]).flatMap(p=>p.cand||[]));
  const a=candidates.find(c=>String(c.n)==="13"),b=candidates.find(c=>String(c.n)==="22");
  if(!a||!b) throw new Error("Candidaturas ausentes: "+uf);
  const lula=Number(a.vap),flavio=Number(b.vap),sections=Number(String(json?.s?.pstn??json?.s?.pst??"0").replace(",","."));
  if(!Number.isSafeInteger(lula)||!Number.isSafeInteger(flavio)||lula<0||flavio<0||lula+flavio===0||!Number.isFinite(sections))throw new Error("Totalização inválida: "+uf);
  return {uf,lula,flavio,sections,updatedAt:(json.dg||json.dt||"")+" "+(json.hg||json.ht||"")};
}
async function getOne(uf) {
 const url=SRC+uf+"/"+uf+"-c0001-e006258-u.json";
 const res=await fetch(url,{headers:{"Accept":"application/json","User-Agent":"SulNaUrna/1.0 (resultados publicos TSE)"},signal:AbortSignal.timeout(8000)});
 if(!res.ok) throw new Error("HTTP "+res.status);
 return parseResult(uf,await res.json());
}
exports.handler=async function(event){
 const uf=(event.queryStringParameters?.uf||"").toLowerCase();
 if(uf && !UFS.includes(uf)) return {statusCode:400,body:JSON.stringify({error:"UF inválida"})};
 const target=uf?[uf]:UFS;
 const out=await Promise.all(target.map(async uf=>{try{return await getOne(uf)}catch(e){return {uf,error:String(e.message||e).slice(0,120)}}}));
 const ufs=Object.fromEntries(out.filter(x=>!x.error).map(x=>[x.uf,x]));
 const missing=out.filter(x=>x.error).map(x=>x.uf);
 return {statusCode:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=120, s-maxage=240","Access-Control-Allow-Origin":"*"},body:JSON.stringify({source:"Tribunal Superior Eleitoral",sourceURL:"https://resultados.tse.jus.br/oficial/ele2026/6258/",year:2026,round:2,ufs,missing,complete:Object.keys(ufs).length===target.length&&Object.values(ufs).every(x=>x.sections>=100)})};
};