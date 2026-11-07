/* Arquivo da cobertura regional de 2026; base editorial original: data/seed-data.js */
(function(){
  'use strict';
  const root=document.getElementById('candidatos-sul');
  if(!root)return;
  const all=Array.isArray(window.SEED_DATA?.candidates)?window.SEED_DATA.candidates.filter(c=>c.active!==false):[];
  const regions=[
    {id:'AMREC',label:'AMREC',sub:'Região Carbonífera',municipios:12},
    {id:'AMESC',label:'AMESC',sub:'Extremo Sul',municipios:15},
    {id:'AMUREL',label:'AMUREL',sub:'Região de Laguna',municipios:18}
  ];
  const regionButtons=[...root.querySelectorAll('[data-sn-region]')];
  const officeButtons=[...root.querySelectorAll('[data-sn-office]')];
  const search=root.querySelector('#sn-candidate-search');
  const grid=root.querySelector('#sn-candidate-grid');
  const context=root.querySelector('#sn-result-context');
  let region='AMREC',office='todos',query='';
  function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
  function inRegion(c,id){return (Array.isArray(c.regions)&&c.regions.length?c.regions:[c.region]).includes(id);}
  function initials(v){return String(v||'?').trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase();}
  function candidateCard(c){
    const img=/^assets\/candidates\/[a-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(c.photo_url||'')?'/'+c.photo_url:'';
    const url=/^https:\/\/divulgacandcontas\.tse\.jus\.br\/divulga\//.test(c.tse_url||'')?c.tse_url:'https://divulgacandcontas.tse.jus.br/';
    const officeLabel=c.office==='federal'?'Deputado federal':'Deputado estadual';
    return `<a class="sn-candidate-card" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="Ver registro oficial no TSE: ${escapeHTML(c.name)}">
      <span class="sn-candidate-image" aria-hidden="true">${img?`<img src="${escapeHTML(img)}" alt="" loading="lazy">`:''}<span class="sn-candidate-fallback${img?'':' is-visible'}">${escapeHTML(initials(c.name))}</span></span>
      <span class="sn-candidate-info"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.party)} · ${escapeHTML(officeLabel)}${c.candidate_number?' · Nº '+escapeHTML(c.candidate_number):''}</small><span class="sn-candidate-link">Consultar registro no TSE ↗</span></span></a>`;
  }
  function render(){
    const selected=regions.find(r=>r.id===region);
    const rows=all.filter(c=>inRegion(c,region)).filter(c=>office==='todos'||c.office===office).filter(c=>!query||normalize(c.name+' '+c.party+' '+c.candidate_number).includes(normalize(query))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    context.innerHTML=`<strong>${rows.length} candidatura${rows.length===1?'':'s'} no filtro</strong><span>${selected.label}: ${selected.sub} · ${selected.municipios} municípios</span>`;
    grid.innerHTML=rows.length?rows.map(candidateCard).join(''):'<p class="sn-empty">Nenhuma candidatura encontrada. Tente outro nome ou filtro.</p>';
    grid.querySelectorAll('img').forEach(img=>{
      img.addEventListener('error',()=>{img.style.display='none';img.nextElementSibling?.classList.add('is-visible');},{once:true});
    });
    regionButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.snRegion===region)));
    officeButtons.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.snOffice===office)));
  }
  regionButtons.forEach(btn=>btn.addEventListener('click',()=>{
    region=btn.dataset.snRegion;
    query=''; if(search)search.value='';
    render();
    if(window.trackEvent)window.trackEvent('sul_na_urna_arquivo_regiao',{regiao:region});
  }));
  officeButtons.forEach(btn=>btn.addEventListener('click',()=>{
    office=btn.dataset.snOffice;
    render();
    if(window.trackEvent)window.trackEvent('sul_na_urna_arquivo_cargo',{cargo:office});
  }));
  if(search)search.addEventListener('input',()=>{query=search.value.trim();render();});
  render();
})();
