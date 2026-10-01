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
  let finalSoundPlayed=false, finalSoundUnlocked=false;
  const finalSound=new Audio('assets/audio/fim-urna.mp3');
  finalSound.preload='auto';

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
  let finalPanel=null;
  const keypadButtons=[...root.querySelectorAll('[data-key], [data-sim-branco], [data-sim-corrige], [data-sim-confirm]')];
  if(skipBtn)skipBtn.remove();

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function unlockFinalSound(){
    if(finalSoundUnlocked)return;
    finalSoundUnlocked=true;
    try{
      const previousMuted=finalSound.muted;
      finalSound.muted=true;
      const attempt=finalSound.play();
      if(attempt&&typeof attempt.then==='function'){
        attempt.then(()=>{
          finalSound.pause();
          finalSound.currentTime=0;
          finalSound.muted=previousMuted;
        }).catch(()=>{ finalSound.muted=previousMuted; });
      }else{
        finalSound.pause();
        finalSound.currentTime=0;
        finalSound.muted=previousMuted;
      }
    }catch(e){}
  }
  function playFinalSound(){
    if(finalSoundPlayed)return;
    finalSoundPlayed=true;
    try{
      finalSound.muted=false;
      finalSound.currentTime=0;
      const attempt=finalSound.play();
      if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{});
    }catch(e){}
  }

  function emit(name,params){
    try{
      if(typeof window.trackEvent==='function')window.trackEvent(name,params||{});
      else if(typeof window.gtag==='function')window.gtag('event',name,params||{});
    }catch(e){}
  }
  function record(event,payload={}){
    try{
      if(window.SNU_DATA&&typeof window.SNU_DATA.recordSimulatorEvent==='function'){
        return window.SNU_DATA.recordSimulatorEvent({event,...payload});
      }
    }catch(e){}
    return Promise.resolve({error:null,configured:false});
  }
  function startRunOnce(){
    if(runStarted)return;
    runStarted=true;
    record('start');
    emit('simulador_urna_iniciado');
  }

  function ensureFinalPanel(){
    if(finalPanel)return finalPanel;
    finalPanel=document.createElement('div');
    finalPanel.className='sim-final-card';
    finalPanel.hidden=true;
    finalPanel.innerHTML=`
      <div class="sim-final-brand">
        <img src="assets/brand/hn.png" alt="HN Notícias">
        <span>+</span>
        <img src="assets/brand/vertical.jpg" alt="Rádio Vertical FM">
      </div>
      <p class="sim-final-kicker">Sua colinha da simulação</p>
      <h3>Leve seus números com você</h3>
      <p class="sim-final-count" data-sim-final-count>Simulação concluída.</p>
      <div class="sim-colinha" data-sim-colinha></div>
      <div class="sim-final-actions">
        <button type="button" class="sim-final-btn secondary" data-sim-print>Imprimir colinha</button>
        <button type="button" class="sim-final-btn" data-sim-share>Compartilhar colinha</button>
      </div>
      <p class="sim-final-note">Esta colinha reproduz somente as escolhas feitas nesta simulação. Ela não registra voto oficial.</p>
    `;
    machine.insertAdjacentElement('afterend',finalPanel);
    finalPanel.querySelector('[data-sim-print]').addEventListener('click',printColinha);
    finalPanel.querySelector('[data-sim-share]').addEventListener('click',shareColinha);
    return finalPanel;
  }
  function choiceText(sel){
    if(sel.kind==='blank')return 'BRANCO';
    if(sel.kind==='null')return `NULO — ${sel.number||''}`.trim();
    if(sel.kind==='legend')return `${sel.number||''} — ${sel.name||'LEGENDA'}`.trim();
    return `${sel.number||''} — ${sel.name||''}`.trim();
  }
  function renderColinhaRows(){
    const panel=ensureFinalPanel();
    const wrap=panel.querySelector('[data-sim-colinha]');
    wrap.innerHTML=selections.map(sel=>`
      <div class="sim-colinha-row">
        <span>${escapeHtml(sel.label)}</span>
        <strong>${escapeHtml(choiceText(sel))}</strong>
      </div>
    `).join('');
  }
  async function updateCompletionCount(){
    const panel=ensureFinalPanel(),el=panel.querySelector('[data-sim-final-count]');
    try{
      if(window.SNU_DATA&&typeof window.SNU_DATA.getSimulatorPublicStats==='function'){
        const {data,error}=await window.SNU_DATA.getSimulatorPublicStats();
        if(!error&&data){
          const total=Number(data.completions||0);
          el.textContent=total===1?'Você faz parte da primeira simulação concluída no Sul na Urna.':`Você faz parte de ${total.toLocaleString('pt-BR')} simulações concluídas no Sul na Urna.`;
          return;
        }
      }
    }catch(e){}
    el.textContent='Simulação concluída no Sul na Urna.';
  }
  function printableRows(){
    return selections.map(sel=>`<tr><td>${escapeHtml(sel.label)}</td><td><strong>${escapeHtml(choiceText(sel))}</strong></td></tr>`).join('');
  }
  function printColinha(){
    const w=window.open('','_blank','width=760,height=900');
    if(!w)return;
    const hn=new URL('assets/brand/hn.png',location.href).href;
    const vertical=new URL('assets/brand/vertical.jpg',location.href).href;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Minha colinha — Sul na Urna</title><style>
      body{font-family:Arial,sans-serif;color:#0B1E3D;margin:0;padding:32px;background:#fff}
      .brand{display:flex;align-items:center;gap:12px;border-bottom:3px solid #1C5FD6;padding-bottom:16px;margin-bottom:22px}.brand img{max-height:42px;max-width:150px}.brand span{font-weight:800;color:#5B6780}
      h1{font-size:28px;margin:0 0 6px}.sub{color:#5B6780;margin:0 0 20px}table{width:100%;border-collapse:collapse}td{padding:13px 10px;border-bottom:1px solid #DEE3EE;font-size:15px}td:first-child{width:40%;font-weight:700;color:#5B6780}
      .note{margin-top:22px;font-size:12px;color:#5B6780;line-height:1.5}.url{font-weight:700;color:#1C5FD6}
      @media print{body{padding:18px}}
    </style></head><body><div class="brand"><img src="${hn}" alt="HN Notícias"><span>+</span><img src="${vertical}" alt="Rádio Vertical FM"></div><h1>Minha colinha — Eleições 2026</h1><p class="sub">Sul na Urna · HN Notícias + Rádio Vertical FM</p><table>${printableRows()}</table><p class="note">Gerada a partir de uma simulação educativa. Não é voto oficial. <span class="url">sulnaurna.hnnoticias.com.br</span></p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
    emit('simulador_colinha_imprimir');
  }
  function loadCanvasImage(src){
    return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
  }
  function fitText(ctx,text,maxWidth,maxSize,minSize){
    let size=maxSize;ctx.font=`700 ${size}px Arial`;
    while(size>minSize&&ctx.measureText(text).width>maxWidth){size-=2;ctx.font=`700 ${size}px Arial`;}
    return size;
  }
  async function buildColinhaImage(){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#F3F5FA';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#0B1E3D';ctx.fillRect(0,0,canvas.width,170);
    try{
      const [hn,vert]=await Promise.all([loadCanvasImage('assets/brand/hn.png'),loadCanvasImage('assets/brand/vertical.jpg')]);
      const drawContain=(img,x,y,w,h)=>{const scale=Math.min(w/img.width,h/img.height);const dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);};
      ctx.fillStyle='#fff';ctx.fillRect(55,35,250,100);drawContain(hn,65,45,230,80);
      ctx.fillStyle='#fff';ctx.fillRect(775,35,250,100);drawContain(vert,785,45,230,80);
      ctx.fillStyle='#fff';ctx.font='700 34px Arial';ctx.textAlign='center';ctx.fillText('+',540,96);
    }catch(e){
      ctx.fillStyle='#fff';ctx.font='700 34px Arial';ctx.textAlign='center';ctx.fillText('HN NOTÍCIAS  +  RÁDIO VERTICAL',540,100);
    }
    ctx.textAlign='left';ctx.fillStyle='#0B1E3D';ctx.font='800 54px Arial';ctx.fillText('MINHA COLINHA',70,245);
    ctx.fillStyle='#5B6780';ctx.font='400 28px Arial';ctx.fillText('Simulação Sul na Urna · Eleições 2026',70,292);
    let y=345;
    selections.forEach(sel=>{
      ctx.fillStyle='#fff';ctx.strokeStyle='#DEE3EE';ctx.lineWidth=2;ctx.beginPath();
      if(typeof ctx.roundRect==='function')ctx.roundRect(70,y,940,135,18);else ctx.rect(70,y,940,135);
      ctx.fill();ctx.stroke();
      ctx.fillStyle='#5B6780';ctx.font='700 22px Arial';ctx.fillText(sel.label.toUpperCase(),100,y+40);
      const value=choiceText(sel);const size=fitText(ctx,value,850,34,22);ctx.fillStyle='#0B1E3D';ctx.font=`700 ${size}px Arial`;ctx.fillText(value,100,y+92);
      y+=148;
    });
    ctx.fillStyle='#1C5FD6';ctx.fillRect(70,1245,940,3);
    ctx.fillStyle='#5B6780';ctx.font='400 20px Arial';ctx.fillText('Simulação educativa — não registra voto oficial.',70,1295);
    ctx.textAlign='right';ctx.font='700 20px Arial';ctx.fillStyle='#1C5FD6';ctx.fillText('sulnaurna.hnnoticias.com.br',1010,1295);
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao gerar imagem.')),'image/png',1));
  }
  async function shareColinha(){
    const btn=ensureFinalPanel().querySelector('[data-sim-share]');const old=btn.textContent;btn.disabled=true;btn.textContent='Preparando…';
    try{
      const blob=await buildColinhaImage();
      const file=new File([blob],'minha-colinha-sul-na-urna.png',{type:'image/png'});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({title:'Minha colinha — Sul na Urna',text:'Minha colinha da simulação de votação no Sul na Urna.',files:[file]});
      }else{
        const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
      }
      emit('simulador_colinha_compartilhar');
    }catch(err){
      if(err&&err.name!=='AbortError')alert('Não foi possível compartilhar a colinha neste aparelho. Tente imprimir ou salvar novamente.');
    }finally{btn.disabled=false;btn.textContent=old;}
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
    playFinalSound();
    message.className='sim-message final';message.textContent='Esta foi apenas uma simulação educativa. Nenhum voto oficial foi registrado.';
    resetBtn.textContent='Simular novamente';emit('simulador_urna_concluido');
    renderColinhaRows();const panel=ensureFinalPanel();panel.hidden=false;
    Promise.resolve(record('complete')).finally(updateCompletionCount);
  }
  function restart(){
    clearConfirmTimer();record('restart');current=0;typed='';blank=false;selections=[];transitioning=false;finished=false;confirmUnlocked=false;readyKey='';runStarted=false;finalSoundPlayed=false;
    if(finalPanel)finalPanel.hidden=true;
    setControlsDisabled(false);resetBtn.textContent='Recomeçar simulação';machine.hidden=false;render();emit('simulador_urna_reiniciar');
  }

  root.addEventListener('pointerdown',unlockFinalSound,{once:true});
  root.addEventListener('click',e=>{const key=e.target.closest('[data-key]');if(key){addDigit(key.dataset.key);return;}});
  $('[data-sim-branco]').addEventListener('click',voteBlank);
  $('[data-sim-corrige]').addEventListener('click',correct);
  confirmBtn.addEventListener('click',confirm);
  resetBtn.addEventListener('click',restart);
  render();emit('simulador_urna_visualizado');record('view');
})();
