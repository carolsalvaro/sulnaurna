(function(){
  'use strict';

  const root=document.getElementById('snuSimulator');
  if(!root)return;

  const steps=[
    {key:'federal',office:'federal',label:'Deputado Federal',short:'Federal',digits:4,proportional:true},
    {key:'estadual',office:'estadual',label:'Deputado Estadual',short:'Estadual',digits:5,proportional:true},
    {key:'senador1',office:'senador',label:'Senador — 1ª vaga',short:'Senador 1',digits:3},
    {key:'senador2',office:'senador',label:'Senador — 2ª vaga',short:'Senador 2',digits:3},
    {key:'governador',office:'governador',label:'Governador',short:'Governador',digits:2},
    {key:'presidente',office:'presidente',label:'Presidente',short:'Presidente',digits:2}
  ];

  const candidates=Array.isArray(window.SIMULATOR_CANDIDATES)?window.SIMULATOR_CANDIDATES:[];
  let current=0, typed='', blank=false, selections=[], transitioning=false, finished=false;
  let confirmUnlocked=false, confirmTimer=null, readyKey='', runStarted=false;

  const $=sel=>root.querySelector(sel);
  const progress=$('[data-sim-progress]');
  const office=$('[data-sim-office]');
  const digits=$('[data-sim-digits]');
  const candidate=$('[data-sim-candidate]');
  const message=$('[data-sim-message]');
  const confirmBtn=$('[data-sim-confirm]');
  const machine=$('[data-sim-machine]');
  const resetBtn=$('[data-sim-reset]');
  const skipBtn=$('[data-sim-skip]');
  const keypadButtons=[...root.querySelectorAll('[data-key], [data-sim-branco], [data-sim-corrige], [data-sim-confirm]')];
  if(skipBtn)skipBtn.remove();

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function emit(name,params){
    try{
      if(typeof window.trackEvent==='function')window.trackEvent(name,params||{});
      else if(typeof window.gtag==='function')window.gtag('event',name,params||{});
    }catch(e){}
  }
  function record(event,payload={}){
    try{
      if(window.SNU_DATA&&typeof window.SNU_DATA.recordSimulatorEvent==='function'){
        window.SNU_DATA.recordSimulatorEvent({event,...payload});
      }
    }catch(e){}
  }
  function startRunOnce(){
    if(runStarted)return;
    runStarted=true;
    record('start');
    emit('simulador_urna_iniciado');
  }

  function step(){return steps[current]}
  function officeCandidates(s=step()){return candidates.filter(c=>c.office===s.office)}
  function visibleCandidate(){
    const s=step();
    if(!s||typed.length!==s.digits)return null;
    return officeCandidates(s).find(c=>String(c.number||'')===typed)||null;
  }
  function partyFromTyped(){
    const s=step();
    if(!s?.proportional||typed.length<2)return null;
    const p=typed.slice(0,2);
    const found=officeCandidates(s).find(c=>String(c.party_number||'').padStart(2,'0')===p);
    return found?{number:p,party:found.party,party_name:found.party_name}:null;
  }
  function sameSenatorAsFirst(){
    if(step()?.key!=='senador2'||typed.length!==3)return false;
    const first=selections.find(x=>x.key==='senador1'&&x.kind==='candidate');
    return !!first&&first.number===typed;
  }

  function clearConfirmTimer(){if(confirmTimer){clearTimeout(confirmTimer);confirmTimer=null;}}
  function resetConfirmDelay(){clearConfirmTimer();confirmUnlocked=false;readyKey='';}
  function unlockAfterDelay(kind){
    const key=`${current}:${typed}:${blank}:${kind}`;
    if(readyKey!==key){
      clearConfirmTimer(); readyKey=key; confirmUnlocked=false; confirmBtn.disabled=true;
      confirmTimer=setTimeout(()=>{confirmUnlocked=true;confirmTimer=null;if(!transitioning&&!finished)renderCandidate();},850);
      return false;
    }
    return confirmUnlocked;
  }

  function renderProgress(){
    progress.innerHTML=steps.map((s,i)=>`<div class="sim-progress-step ${finished||i<current?'done':i===current?'active':''}"><span class="n">${finished||i<current?'✓':i+1}</span>${escapeHtml(s.short)}</div>`).join('');
  }
  function renderDigits(){
    const s=step();
    digits.innerHTML=Array.from({length:s.digits},(_,i)=>`<span class="sim-digit">${escapeHtml(typed[i]||'')}</span>`).join('');
  }
  function initials(name){
    const p=String(name||'').trim().split(/\s+/).filter(Boolean);
    return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():(p[0]||'?').slice(0,2).toUpperCase();
  }
  function photoHtml(p,cls='sim-candidate-photo'){
    return p?.photo_url?`<img class="${cls}" src="${escapeHtml(p.photo_url)}" alt="Foto de ${escapeHtml(p.name)}">`:`<div class="sim-candidate-placeholder">${escapeHtml(initials(p?.name))}</div>`;
  }
  function companionsHtml(found){
    const comps=Array.isArray(found.companions)?found.companions:[];
    if(!comps.length)return '';
    return `<div class="sim-companions">${comps.map(c=>`<div class="sim-companion">${photoHtml(c,'sim-companion-photo')}<div><span>${escapeHtml(c.role||'')}</span><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.party||'')}</small></div></div>`).join('')}</div>`;
  }
  function setControlsDisabled(disabled){keypadButtons.forEach(btn=>btn.disabled=disabled);}

  function showReady(text,kind){
    const unlocked=unlockAfterDelay(kind);
    message.className='sim-message '+(unlocked?'ready':'check');
    message.textContent=unlocked?text:'Confira seu voto';
    confirmBtn.disabled=!unlocked;
  }

  function renderCandidate(){
    const s=step();
    candidate.innerHTML='';
    message.className='sim-message';

    if(!candidates.length){
      candidate.innerHTML='<div class="sim-candidate-placeholder">!</div><div class="sim-candidate-info"><div class="label">Base</div><p class="sim-candidate-name">Dados da simulação não carregados</p></div>';
      message.className='sim-message error'; message.textContent='Atualize a página e tente novamente.'; confirmBtn.disabled=true; return;
    }

    if(blank){
      candidate.innerHTML=`<div class="sim-candidate-placeholder">VOTO<br>EM BRANCO</div><div class="sim-candidate-info"><div class="label">${escapeHtml(s.label)}</div><p class="sim-candidate-name">BRANCO</p></div>`;
      showReady('Pressione CONFIRMA para avançar ou CORRIGE para voltar à digitação.','blank');
      return;
    }

    const found=visibleCandidate();
    if(found){
      candidate.innerHTML=`${photoHtml(found)}<div class="sim-candidate-info"><div class="label">Nome</div><p class="sim-candidate-name">${escapeHtml(found.name)}</p><div class="label">Partido</div><p class="sim-candidate-party">${escapeHtml(found.party)} — ${escapeHtml(found.party_name||'')}</p>${companionsHtml(found)}</div>`;
      showReady('Confira os dados e pressione CONFIRMA para seguir.','candidate');
      return;
    }

    if(sameSenatorAsFirst()){
      candidate.innerHTML=`<div class="sim-candidate-placeholder">VOTO<br>NULO</div><div class="sim-candidate-info"><div class="label">${escapeHtml(s.label)}</div><p class="sim-candidate-name">MESMO CANDIDATO DA 1ª VAGA</p><p class="sim-candidate-party">Se confirmado, o segundo voto para o Senado será nulo.</p></div>`;
      showReady('Pressione CONFIRMA para registrar voto nulo ou CORRIGE para alterar.','null-same-senator');
      return;
    }

    const party=partyFromTyped();
    if(s.proportional&&party&&(typed.length===2||typed.length===s.digits)){
      candidate.innerHTML=`<div class="sim-candidate-placeholder">${escapeHtml(party.number)}</div><div class="sim-candidate-info"><div class="label">Voto de legenda</div><p class="sim-candidate-name">${escapeHtml(party.party)}</p><p class="sim-candidate-party">${escapeHtml(party.party_name||'')}</p></div>`;
      showReady('Se confirmado, o voto será registrado para a legenda.','legend');
      return;
    }

    if(typed.length===s.digits){
      candidate.innerHTML=`<div class="sim-candidate-placeholder">VOTO<br>NULO</div><div class="sim-candidate-info"><div class="label">${escapeHtml(s.label)}</div><p class="sim-candidate-name">NÚMERO NÃO CORRESPONDE A CANDIDATURA</p></div>`;
      showReady('Se confirmado, o voto será computado como nulo.','null');
      return;
    }

    resetConfirmDelay();
    candidate.innerHTML=`<div class="sim-candidate-placeholder">${typed.length?escapeHtml(typed):'—'}</div><div class="sim-candidate-info"><div class="label">${escapeHtml(s.label)}</div><p class="sim-candidate-name">Digite o número</p></div>`;
    message.textContent=s.proportional?'Digite o número do candidato ou os 2 dígitos do partido para voto de legenda.':`Digite ${s.digits} números.`;
    confirmBtn.disabled=true;
  }

  function render(){
    if(finished){renderFinal();return;}
    machine.hidden=false; office.textContent=step().label; renderProgress(); renderDigits(); renderCandidate();
  }
  function resetEntry(){typed='';blank=false;resetConfirmDelay();render();}
  function addDigit(n){
    const s=step();
    if(transitioning||finished||blank||typed.length>=s.digits)return;
    startRunOnce(); typed+=String(n); resetConfirmDelay(); render();
  }
  function showAdvance(nextLabel,callback){
    transitioning=true;resetConfirmDelay();setControlsDisabled(true);
    office.textContent='Voto confirmado';digits.innerHTML='';
    candidate.innerHTML='<div class="sim-transition-check" aria-hidden="true">✓</div><div class="sim-candidate-info"><div class="label">Simulação</div><p class="sim-candidate-name">VOTO CONFIRMADO</p></div>';
    message.className='sim-message ready';message.textContent=nextLabel?`Próximo cargo: ${nextLabel}`:'Finalizando a simulação…';
    setTimeout(()=>{transitioning=false;setControlsDisabled(false);callback();},850);
  }
  function currentVote(){
    const s=step(), found=visibleCandidate(), party=partyFromTyped();
    if(blank)return {kind:'blank',name:'BRANCO',number:'',party:''};
    if(found)return {kind:'candidate',name:found.name,number:typed,party:found.party,candidate_id:found.sq_candidate||'',candidate_number:typed,candidate_name:found.name};
    if(sameSenatorAsFirst())return {kind:'null',name:'NULO',number:typed,party:''};
    if(s.proportional&&party&&(typed.length===2||typed.length===s.digits))return {kind:'legend',name:`LEGENDA ${party.party}`,number:typed,party:party.party};
    if(typed.length===s.digits)return {kind:'null',name:'NULO',number:typed,party:''};
    return null;
  }
  function confirm(){
    const s=step(), vote=currentVote();
    if(transitioning||finished||!vote||!confirmUnlocked)return;
    startRunOnce();
    selections.push({key:s.key,label:s.label,...vote});
    emit('simulador_urna_confirmar',{cargo:s.key,tipo:vote.kind});
    record('confirm',{step:s.key,kind:vote.kind,candidate_id:vote.candidate_id||null,candidate_number:vote.candidate_number||null,candidate_name:vote.candidate_name||null,party:vote.party||null});
    const isLast=current===steps.length-1, nextLabel=isLast?'':steps[current+1].label;
    showAdvance(nextLabel,()=>{current+=1;typed='';blank=false;resetConfirmDelay();if(current>=steps.length){finished=true;renderFinal();}else render();});
  }
  function voteBlank(){if(transitioning||finished)return;startRunOnce();typed='';blank=true;resetConfirmDelay();render();}
  function correct(){
    if(transitioning||finished)return;
    startRunOnce();
    if(blank)blank=false; else typed=typed.slice(0,-1);
    record('correct');
    resetConfirmDelay();render();
  }
  function renderFinal(){
    finished=true;renderProgress();setControlsDisabled(true);office.textContent='Simulação concluída';digits.innerHTML='';
    candidate.innerHTML='<div class="sim-fim" role="status"><strong>FIM</strong><span>Você chegou ao final da sequência de votação.</span></div>';
    message.className='sim-message final';message.textContent='Esta foi apenas uma simulação educativa. Nenhum voto oficial foi registrado.';
    resetBtn.textContent='Simular novamente';emit('simulador_urna_concluido');record('complete');
  }
  function restart(){
    clearConfirmTimer();record('restart');current=0;typed='';blank=false;selections=[];transitioning=false;finished=false;confirmUnlocked=false;readyKey='';runStarted=false;
    setControlsDisabled(false);resetBtn.textContent='Recomeçar simulação';machine.hidden=false;render();emit('simulador_urna_reiniciar');
  }

  root.addEventListener('click',e=>{const key=e.target.closest('[data-key]');if(key){addDigit(key.dataset.key);return;}});
  $('[data-sim-branco]').addEventListener('click',voteBlank);
  $('[data-sim-corrige]').addEventListener('click',correct);
  confirmBtn.addEventListener('click',confirm);
  resetBtn.addEventListener('click',restart);
  render();emit('simulador_urna_visualizado');record('view');
})();
