/* Sul na Urna — arquivo regional e resultado eleitoral 2026 (SC) */
(function(){
 'use strict';
 const root=document.getElementById('candidatos-sul');
 if(!root)return;
 const all=Array.isArray(window.SEED_DATA?.candidates)?window.SEED_DATA.candidates.filter(c=>c.active!==false):[];
 const record=window.SUL_REGIONAL_RESULTS_2026 || {results:{}};
 const results=record.results||{};
 const regions=[
   {id:'AMREC',label:'AMREC',sub:'Região Carbonífera',municipios:12},
   {id:'AMESC',label:'AMESC',sub:'Extremo Sul',municipios:15},
   {id:'AMUREL',label:'AMUREL',sub:'Região de Laguna',municipios:18}
 ];
 const regionButtons=[...root.querySelectorAll('[data-sn-region]')];
 const officeButtons=[...root.querySelectorAll('[data-sn-office]')];
 const statusButtons=[...root.querySelectorAll('[data-sn-status]')];
 const search=root.querySelector('#sn-candidate-search');
 const grid=root.querySelector('#sn-candidate-grid');
 const context=root.querySelector('#sn-result-context');
 let region='AMREC',office='todos',statusFilter='todos',query='';
 const fmt=new Intl.NumberFormat('pt-BR');
 function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
 function inRegion(c,id){return (Array.isArray(c.regions)&&c.regions.length?c.regions:[c.region]).includes(id);}
 function initials(v){return String(v||'?').trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase();}
 function result(c){return results[c.office+':'+c.candidate_number]||null;}
 function situation(rec){
   if(!rec)return {label:'A conferir',cls:'pending',title:'Resultado ainda não disponível na base local'};
   if(rec.status==='ELEITO POR QP')return {label:'Eleito',cls:'elected',title:'Eleito por quociente partidário'};
   if(rec.status==='ELEITO POR MÉDIA')return {label:'Eleito',cls:'elected',title:'Eleito por média'};
   if(rec.status==='SUPLENTE')return {label:'Suplente',cls:'alternate',title:'Suplente, segundo a totalização do TSE'};
   return {label:'Não eleito',cls:'not-elected',title:'Não eleito, segundo a totalização do TSE'};
 }
 function situationGroup(rec){
   if(!rec)return 'pendente';
   if(rec.status?.startsWith('ELEITO'))return 'eleitos';
   if(rec.status==='SUPLENTE')return 'suplentes';
   return 'nao-eleitos';
 }
 function candidateCard(c){
   const rec=result(c),sit=situation(rec);
   const img=/^assets\/candidates\/[a-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(c.photo_url||'')?'/'+c.photo_url:'';
   const url=/^https:\/\/divulgacandcontas\.tse\.jus\.br\/divulga\//.test(c.tse_url||'')?c.tse_url:'https://divulgacandcontas.tse.jus.br/';
   const officeLabel=c.office==='federal'?'Deputado federal':'Deputado estadual';
   const votes=Number.isInteger(rec?.votes)?fmt.format(rec.votes):'—';
   const cancelled=rec?.annulled===true;
   return `<a class="sn-candidate-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver registro oficial no TSE: ${esc(c.name)}">
      <span class="sn-candidate-image" aria-hidden="true">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:''}<span class="sn-candidate-fallback${img?'':' is-visible'}">${esc(initials(c.name))}</span></span>
      <span class="sn-candidate-info">
        <span class="sn-candidate-head"><strong>${esc(c.name)}</strong><span class="sn-situation sn-situation-${sit.cls}" title="${esc(sit.title)}">${sit.label}</span></span>
        <small>${esc(c.party)} · ${esc(officeLabel)}${c.candidate_number?' · Nº '+esc(c.candidate_number):''}</small>
        <span class="sn-candidate-bottom"><span class="sn-vote-result"><b>${votes}</b> votos em SC</span>${cancelled?'<span class="sn-annulled" title="Votos lançados na urna, mas anulados e não computados entre os votos válidos">Votos anulados</span>':''}</span>
        <span class="sn-candidate-link">Consultar ficha no TSE ↗</span>
      </span></a>`;
 }
 function render(){
   const selected=regions.find(r=>r.id===region);
   const allRegional=all.filter(c=>inRegion(c,region));
   const regionElected=allRegional.filter(c=>situationGroup(result(c))==='eleitos').length;
   let rows=allRegional.filter(c=>office==='todos'||c.office===office)
     .filter(c=>statusFilter==='todos'||situationGroup(result(c))===statusFilter)
     .filter(c=>!query||normalize(c.name+' '+c.party+' '+c.candidate_number).includes(normalize(query)));
   rows=rows.sort((a,b)=> (Number(result(b)?.votes)||0)-(Number(result(a)?.votes)||0)||a.name.localeCompare(b.name,'pt-BR'));
   context.innerHTML=`<strong>${rows.length} candidatura${rows.length===1?'':'s'} no filtro · ${regionElected} eleito${regionElected===1?'':'s'} na região</strong><span>${selected.label} · ${selected.sub} · ${selected.municipios} municípios</span>`;
   grid.innerHTML=rows.length?rows.map(candidateCard).join(''):'<p class="sn-empty">Nenhum candidato encontrado com estes filtros. Experimente outra situação, cargo ou nome.</p>';
   grid.querySelectorAll('img').forEach(img=>{
     img.addEventListener('error',()=>{img.style.display='none';img.nextElementSibling?.classList.add('is-visible');},{once:true});
   });
   regionButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.snRegion===region)));
   officeButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.snOffice===office)));
   statusButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.snStatus===statusFilter)));
 }
 regionButtons.forEach(btn=>btn.addEventListener('click',()=>{
   region=btn.dataset.snRegion;query='';if(search)search.value='';render();
   if(window.trackEvent)window.trackEvent('sul_na_urna_arquivo_regiao',{regiao:region});
 }));
 officeButtons.forEach(btn=>btn.addEventListener('click',()=>{
   office=btn.dataset.snOffice;render();
   if(window.trackEvent)window.trackEvent('sul_na_urna_arquivo_cargo',{cargo:office});
 }));
 statusButtons.forEach(btn=>btn.addEventListener('click',()=>{
   statusFilter=btn.dataset.snStatus;render();
   if(window.trackEvent)window.trackEvent('sul_na_urna_arquivo_resultado',{situacao:statusFilter});
 }));
 if(search)search.addEventListener('input',()=>{query=search.value.trim();render();});
 render();
})();
