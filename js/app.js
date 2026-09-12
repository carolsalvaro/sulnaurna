const OFFICE_LABEL={federal:'Deputado Federal',estadual:'Deputado Estadual'};const REGIONS=[{id:'AMREC',label:'AMREC',sub:'Criciúma, Içara, Forquilhinha, Siderópolis, Urussanga e demais municípios da região.'},{id:'AMESC',label:'AMESC',sub:'Araranguá, Turvo, Maracajá, Sombrio e demais municípios da região.'},{id:'AMUREL',label:'AMUREL',sub:'Tubarão, Laguna, Imbituba, Braço do Norte e demais municípios da região.'}];let CANDIDATOS=[],HISTORIAS=[],BANNERS=[],currentOffice='todos',currentRegion='todos';
function fmt(n){return Number(n||0).toLocaleString('pt-BR')}function pct(v,d=2){return (Number(v||0)*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%'}function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function initials(n){const p=n.trim().split(/\s+/).filter(Boolean);return p.length<2?(p[0]||'?').slice(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase()}const COLORS=['#1C5FD6','#2E9E52','#123B7A','#4E8FF5','#0B1E3D'];function avatarColor(n){let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return COLORS[Math.abs(h)%COLORS.length]}
function montarRegioes(){const toggle=document.getElementById('regionToggle'),wrap=document.getElementById('regionsWrap');toggle.innerHTML='<button type="button" class="active" data-region="todos">Todas as regiões</button>'+REGIONS.map(r=>`<button type="button" data-region="${r.id}">${r.label}</button>`).join('');wrap.innerHTML=REGIONS.map(r=>`<div class="region-col" id="col${r.id}"><h3>${r.label} <span class="count" id="count${r.id}"></span></h3><p class="region-sub">${r.sub}</p><ul class="candidate-list" id="list${r.id}"></ul></div>`).join('');toggle.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{toggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentRegion=btn.dataset.region;renderCandidates()}))}
function candidateRegions(c){if(c.name==='Delegado Ulisses Gabriel')return ['AMREC'];if(Array.isArray(c.regions)&&c.regions.length)return c.regions;return c.region?[c.region]:[]}
function renderCandidates(){
  const byOffice=CANDIDATOS.filter(c=>currentOffice==='todos'||c.office===currentOffice);
  let visibleCards=0;
  const visibleUnique=new Set();
  REGIONS.forEach(r=>{
    const list=document.getElementById('list'+r.id),col=document.getElementById('col'+r.id);
    const arr=byOffice.filter(c=>candidateRegions(c).includes(r.id)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    list.innerHTML=arr.length?arr.map(c=>{
      const photo=c.photo_url?`<img class="cand-avatar" src="${esc(c.photo_url)}" alt="Foto de ${esc(c.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:'',
        fallback=`<span class="cand-avatar-fallback" style="${c.photo_url?'display:none;':''}background:${avatarColor(c.name)}">${initials(c.name)}</span>`,
        city=c.city?` · ${esc(c.city)}`:'',
        number=c.candidate_number?` · <span class="cand-number">Nº ${esc(c.candidate_number)}</span>`:'';
      return `<li><a href="${esc(c.tse_url)}" target="_blank" rel="noopener noreferrer" data-candidate="${esc(c.name)}"><span class="cand-left">${photo}${fallback}<span class="cand-main"><span class="cand-name">${esc(c.name)}</span><span class="cand-meta">${esc(c.party)}${number} · ${OFFICE_LABEL[c.office]||c.office}${city}</span></span></span><span class="cand-arrow">↗</span></a></li>`;
    }).join(''):'<li class="empty-msg">Nenhum candidato nesse filtro ainda.</li>';
    document.getElementById('count'+r.id).textContent=`(${arr.length})`;
    const visible=currentRegion==='todos'||currentRegion===r.id;
    col.style.display=visible?'':'none';
    if(visible){visibleCards+=arr.length;arr.forEach(c=>visibleUnique.add(c.tse_url||c.name))}
  });
  document.getElementById('regionsWrap').classList.toggle('only-one',currentRegion!=='todos');
  const unique=visibleUnique.size;
  document.getElementById('resultCount').textContent=visibleCards===unique?`${unique} candidato${unique===1?'':'s'} nesse filtro`:`${unique} candidatos únicos · ${visibleCards} vínculos regionais`;
  document.getElementById('statTotal').textContent=new Set(CANDIDATOS.map(c=>c.tse_url||c.name)).size;
  document.querySelectorAll('[data-candidate]').forEach(a=>a.addEventListener('click',()=>trackEvent('clique_candidato',{candidato_nome:a.dataset.candidate})));
}

function placeholderImage(i){const colors=[['#1C5FD6','#0B1E3D'],['#2E9E52','#123B7A'],['#4E8FF5','#0B1E3D']][i%3];const svg=`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${colors[0]}'/><stop offset='1' stop-color='${colors[1]}'/></linearGradient></defs><rect width='400' height='250' fill='url(#g)'/><text x='200' y='128' fill='white' opacity='.8' text-anchor='middle' font-family='Arial' font-size='20'>HN Notícias</text></svg>`;return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg)}
function renderStories(){const grid=document.getElementById('storyGrid');grid.innerHTML=HISTORIAS.map((h,i)=>`<a class="story-card" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer" data-story="${i}"><img class="story-photo" src="${esc(h.image_url||placeholderImage(i))}" alt="" loading="lazy"><span class="story-title">${esc(h.title)}</span></a>`).join('');grid.querySelectorAll('[data-story]').forEach(a=>a.addEventListener('click',()=>trackEvent('clique_materia',{materia_titulo:HISTORIAS[Number(a.dataset.story)].title,materia_posicao:Number(a.dataset.story)+1})))}
const bannerRotations = new Map();

function bannerAnalyticsParams(banner, slot) {
  const name = banner?.name || '';
  return {
    banner_id: String(banner?.id || ''),
    banner_nome: name,
    banner_posicao: slot,
    // Mantidos por compatibilidade com os eventos que já estavam sendo coletados.
    nome: name,
    posicao: slot
  };
}

function renderBanners() {
  const slots = {
    topo: 'sponsorBanner',
    meio: 'sponsorBannerMeio'
  };

  Object.entries(slots).forEach(([slot, elementId]) => {
    const box = document.getElementById(elementId);
    if (!box) return;

    const wrapper = box.closest('.sponsor-banner-wrap');
    const previousState = bannerRotations.get(slot);
    if (previousState?.destroy) previousState.destroy();
    bannerRotations.delete(slot);

    const banners = BANNERS
      .filter(banner => banner.slot === slot && banner.active !== false && banner.image_url)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    if (!banners.length) {
      box.innerHTML = '';
      box.classList.remove('has-image', 'has-rotation', 'banner-ready', 'is-loading');
      wrapper?.classList.add('is-empty');
      return;
    }

    wrapper?.classList.remove('is-empty');
    box.classList.add('has-image', 'is-loading');
    box.classList.remove('banner-ready');
    box.classList.toggle('has-rotation', banners.length > 1);

    box.innerHTML = banners.map((banner, index) => {
      const href = banner.link_url || '#';
      const target = banner.link_url ? 'target="_blank" rel="noopener noreferrer"' : '';
      const label = banner.alt_text || banner.name || 'Patrocinador';

      return `
        <a
          class="banner-slide${index === 0 ? ' active' : ''}"
          href="${esc(href)}"
          ${target}
          data-banner-slot="${esc(slot)}"
          data-banner-id="${esc(banner.id || '')}"
          data-banner-name="${esc(banner.name || '')}"
          data-banner-index="${index}"
        >
          <img src="${esc(banner.image_url)}" alt="${esc(label)}" decoding="async">
        </a>
      `;
    }).join('');

    const slides = [...box.querySelectorAll('.banner-slide')];
    let currentIndex = 0;
    let exposureSerial = 0;
    let countedExposure = -1;
    let impressionTimer = null;
    let visibilityRatio = 0;
    let rotationTimer = null;

    const cancelImpressionTimer = () => {
      if (!impressionTimer) return;
      clearTimeout(impressionTimer);
      impressionTimer = null;
    };

    const tryTrackImpression = () => {
      if (
        countedExposure === exposureSerial ||
        impressionTimer ||
        visibilityRatio < 0.5 ||
        document.visibilityState === 'hidden' ||
        !box.classList.contains('banner-ready')
      ) return;

      const serialAtStart = exposureSerial;
      impressionTimer = setTimeout(() => {
        impressionTimer = null;

        if (
          serialAtStart !== exposureSerial ||
          countedExposure === serialAtStart ||
          visibilityRatio < 0.5 ||
          document.visibilityState === 'hidden' ||
          !box.classList.contains('banner-ready')
        ) return;

        countedExposure = serialAtStart;
        trackEvent(
          'impressao_banner_patrocinador',
          bannerAnalyticsParams(banners[currentIndex], slot)
        );
      }, 1000);
    };

    const visibilityObserver = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
          const entry = entries[0];
          visibilityRatio = entry?.intersectionRatio || 0;
          if (visibilityRatio >= 0.5) tryTrackImpression();
          else cancelImpressionTimer();
        }, { threshold: [0, 0.5, 1] })
      : null;

    if (visibilityObserver) {
      visibilityObserver.observe(box);
    } else {
      // Fallback para navegadores antigos: considera o slot elegível após o carregamento.
      visibilityRatio = 1;
    }

    const markBannerReady = () => {
      box.classList.remove('is-loading');
      box.classList.add('banner-ready');
      tryTrackImpression();
    };

    const firstImage = slides[0]?.querySelector('img');
    if (firstImage?.complete && firstImage.naturalWidth > 0) {
      markBannerReady();
    } else if (firstImage) {
      firstImage.addEventListener('load', markBannerReady, { once: true });
      firstImage.addEventListener('error', markBannerReady, { once: true });
    } else {
      markBannerReady();
    }

    slides.forEach(slide => {
      slide.addEventListener('click', event => {
        const banner = banners[Number(slide.dataset.bannerIndex)];
        if (!banner?.link_url) {
          event.preventDefault();
          return;
        }

        trackEvent(
          'clique_banner_patrocinador',
          bannerAnalyticsParams(banner, slot)
        );
      });
    });

    const showSlide = nextIndex => {
      cancelImpressionTimer();
      slides[currentIndex].classList.remove('active');
      currentIndex = nextIndex;
      exposureSerial += 1;
      slides[currentIndex].classList.add('active');
      tryTrackImpression();
    };

    const startRotation = () => {
      if (rotationTimer || slides.length < 2) return;
      rotationTimer = setInterval(() => {
        showSlide((currentIndex + 1) % slides.length);
      }, 6000);
    };

    const stopRotation = () => {
      if (!rotationTimer) return;
      clearInterval(rotationTimer);
      rotationTimer = null;
    };

    const onMouseEnter = () => stopRotation();
    const onMouseLeave = () => startRotation();
    const onFocusIn = () => stopRotation();
    const onFocusOut = () => startRotation();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cancelImpressionTimer();
      else tryTrackImpression();
    };

    if (slides.length > 1) {
      startRotation();
      box.addEventListener('mouseenter', onMouseEnter);
      box.addEventListener('mouseleave', onMouseLeave);
      box.addEventListener('focusin', onFocusIn);
      box.addEventListener('focusout', onFocusOut);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    const state = {
      destroy() {
        stopRotation();
        cancelImpressionTimer();
        visibilityObserver?.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        box.removeEventListener('mouseenter', onMouseEnter);
        box.removeEventListener('mouseleave', onMouseLeave);
        box.removeEventListener('focusin', onFocusIn);
        box.removeEventListener('focusout', onFocusOut);
      }
    };

    bannerRotations.set(slot, state);
  });
}

const PROFILE_LABELS={'Gênero':'Gênero','Faixa etária':'Faixa etária','Escolaridade':'Escolaridade','Estado civil':'Estado civil','Raça-cor':'Raça/cor','Identidade gênero':'Identidade de gênero','Quilombola':'Identificação quilombola','Libras':'Intérprete de Libras'};const COVERAGE_MAP={'Raça-cor':'Raça/cor','Identidade gênero':'Identidade de gênero','Quilombola':'Quilombola','Libras':'Intérprete de Libras'};
function regionTotal(region){return (window.PROFILE_DATA.region_totals[region]||{}).total||window.PROFILE_DATA.indicators?.[region]?.total||0}
function profileHeader(title,region,subtitle=''){return `<div class="profile-title-row"><div><h3>${esc(title)}</h3><p>${esc(subtitle||('Dados para '+(region==='3 REGIÕES'?'AMREC + AMUREL + AMESC':region)))}</p></div><div class="profile-total"><strong>${fmt(regionTotal(region))}</strong><span>eleitores na base selecionada</span></div></div>`}
function renderOverview(region){const o=window.PROFILE_DATA.overview;const cards=Object.entries(o).map(([label,vals])=>{const v=vals[region]||0,sc=vals.SC||0;return `<div class="overview-card"><strong>${pct(v)}</strong><span>${esc(label)}</span>${region!=='SC'?`<small>SC: ${pct(sc)}</small>`:''}</div>`}).join('');return profileHeader('Visão geral',region,'Principais características do eleitorado selecionado.')+`<div class="overview-grid">${cards}</div>`}
function renderMunicipalities(region){const data=window.PROFILE_DATA.municipalities;if(region==='SC')return profileHeader('Eleitorado por município',region,'A planilha deste especial detalha municípios somente das três regiões.')+'<div class="profile-note">Para Santa Catarina, esta base traz o total estadual para comparação, mas não a lista dos 295 municípios.</div>';let rows=[];if(region==='3 REGIÕES'){['AMREC','AMUREL','AMESC'].forEach(r=>rows.push(...data[r].map(x=>({...x,region:r}))));rows.sort((a,b)=>b.total-a.total)}else rows=(data[region]||[]).map(x=>({...x,region}));const cards=rows.map(x=>`<div class="municipality-card"><span>${esc(x.name)}${region==='3 REGIÕES'?` <small>· ${x.region}</small>`:''}</span><span>${fmt(x.total)}</span></div>`).join('');return profileHeader('Eleitorado por município',region,region==='3 REGIÕES'?'45 municípios das três regiões, ordenados pelo número de eleitores.':`Municípios da ${region}, ordenados pela planilha.`)+`<div class="municipality-grid">${cards}</div>`}
function renderProfileBars(metric,region){const rows=window.PROFILE_DATA.profiles[metric]||[];const max=Math.max(...rows.map(r=>r[region]?.pct||0),.01);const bars=rows.map(r=>{const v=r[region]||{count:0,pct:0},sc=r.SC||{pct:0};return `<div class="bar-row"><div class="bar-label">${esc(r.category)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,(v.pct/max)*100)}%"></div></div><div class="bar-value"><strong>${pct(v.pct)}</strong>${fmt(v.count)}${region!=='SC'?`<div class="compare">SC: ${pct(sc.pct)}</div>`:''}</div></div>`}).join('');let note='';if(COVERAGE_MAP[metric]){const cov=window.PROFILE_DATA.coverage[COVERAGE_MAP[metric]]?.[region];if(cov)note=`<div class="profile-note warn"><strong>Atenção à cobertura do cadastro:</strong> apenas ${pct(cov.pct_informed)} dos registros desta base têm esse campo informado. O TSE mantém “NÃO INFORMADO” no total e ele aparece no gráfico para evitar distorção.</div>`}if(metric==='Escolaridade')note+=`<div class="profile-note">${esc(window.PROFILE_DATA.meta.notes.escolaridade)}</div>`;if(metric==='Estado civil')note+=`<div class="profile-note">${esc(window.PROFILE_DATA.meta.notes.estado_civil)}</div>`;return profileHeader(PROFILE_LABELS[metric]||metric,region,'Barras proporcionais à maior categoria da seleção. Percentuais usam todo o eleitorado da região como denominador.')+`<div class="bars">${bars}</div>${note}`}
function renderIndicators(region){const d=window.PROFILE_DATA.indicators[region];if(!d)return '';const rows=[['Com biometria',d.biometria],['Sem biometria',d.sem_biometria],['Deficiência / mobilidade reduzida',d.deficiencia],['Nome social',d.nome_social]],max=Math.max(...rows.map(x=>x[1].pct));const bars=rows.map(([label,v])=>`<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${(v.pct/max)*100}%"></div></div><div class="bar-value"><strong>${pct(v.pct)}</strong>${fmt(v.count)}</div></div>`).join('');return profileHeader('Biometria e outros indicadores',region,'Indicadores cadastrais disponíveis na base do TSE.')+`<div class="bars">${bars}</div><div class="profile-note">${esc(window.PROFILE_DATA.meta.notes.deficiencia)}</div>`}
function renderProfile(){const region=document.getElementById('profileRegion').value,metric=document.getElementById('profileMetric').value,box=document.getElementById('profileContent');box.innerHTML=metric==='overview'?renderOverview(region):metric==='municipalities'?renderMunicipalities(region):metric==='indicators'?renderIndicators(region):renderProfileBars(metric,region);trackEvent('filtro_perfil_eleitor',{regiao:region,indicador:metric})}
function ensurePublicEnhancements(){
  if(!document.getElementById('snuEnhancementsStyle')){
    const style=document.createElement('style');
    style.id='snuEnhancementsStyle';
    style.textContent=`
      .topbar .wrap{justify-content:center!important;flex-direction:column!important;gap:12px!important;padding-top:16px!important;padding-bottom:14px!important}
      .brand{justify-content:center!important;width:100%!important;gap:18px!important}.brand img.hn{height:58px!important}.brand img.vert{height:64px!important;border-radius:6px!important}
      .topnav{justify-content:center!important;gap:24px!important;flex-wrap:wrap!important}
      .correction-callout{margin-top:34px;padding:18px 20px;border:1px solid var(--line);border-radius:12px;background:#F8FAFD;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}.correction-callout strong{display:block;font-size:14px;margin-bottom:4px}.correction-callout span{font-size:12.5px;color:var(--muted);line-height:1.45}.feedback-btn{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:8px;padding:10px 15px;font:700 13px 'Inter';cursor:pointer;white-space:nowrap}.feedback-btn:hover{border-color:var(--blue);color:var(--blue)}
      .feedback-modal{position:fixed;inset:0;background:rgba(11,30,61,.55);display:none;align-items:center;justify-content:center;padding:20px;z-index:100}.feedback-modal.open{display:flex}.feedback-card{width:min(540px,100%);background:#fff;border-radius:14px;padding:24px;box-shadow:0 22px 70px rgba(11,30,61,.22)}.feedback-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.feedback-head h3{font-family:'Fraunces',serif;font-size:24px;margin:0 0 6px}.feedback-head p{font-size:13px;color:var(--muted);line-height:1.5;margin:0}.feedback-close{border:0;background:transparent;color:var(--muted);font-size:24px;line-height:1;cursor:pointer;padding:0 2px}.feedback-field{margin-bottom:14px}.feedback-field label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}.feedback-field input,.feedback-field textarea{width:100%;border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:14px 'Inter';color:var(--ink);background:#fff}.feedback-field textarea{min-height:120px;resize:vertical}.feedback-field input:focus,.feedback-field textarea:focus{border-color:var(--blue);outline:0;box-shadow:0 0 0 3px rgba(28,95,214,.10)}.feedback-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.feedback-actions button{border-radius:8px;padding:10px 15px;font-weight:700;cursor:pointer}.feedback-actions .cancel{background:#fff;color:var(--ink);border:1px solid var(--line)}.feedback-actions .send{background:var(--ink);color:#fff;border:0}.feedback-actions .send:disabled{opacity:.55;cursor:wait}.feedback-status{display:block;min-height:18px;font-size:12px;color:var(--muted);margin-top:10px}.feedback-status.success{color:var(--green)}.feedback-status.error{color:var(--danger)}.feedback-hp{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
      @media(max-width:600px){.brand{gap:12px!important}.brand img.hn{height:38px!important}.brand img.vert{height:44px!important}.topbar .wrap{row-gap:9px!important}}
    `;
    document.head.appendChild(style);
  }
  if(!document.getElementById('openFeedback')){
    const regions=document.getElementById('regionsWrap');
    if(regions){
      const callout=document.createElement('div');
      callout.className='correction-callout';
      callout.innerHTML='<div><strong>Encontrou alguma informação incorreta ou desatualizada?</strong><span>Avise a equipe do Sul na Urna para que possamos conferir e, se necessário, corrigir.</span></div><button type="button" class="feedback-btn" id="openFeedback">Informar uma correção</button>';
      regions.insertAdjacentElement('afterend',callout);
    }
  }
  if(!document.getElementById('feedbackModal')){
    document.body.insertAdjacentHTML('beforeend',`<div class="feedback-modal" id="feedbackModal" aria-hidden="true"><div class="feedback-card" role="dialog" aria-modal="true" aria-labelledby="feedbackTitle"><div class="feedback-head"><div><h3 id="feedbackTitle">Informar uma correção</h3><p>Se encontrou alguma informação que precisa ser conferida, envie os detalhes para nossa equipe.</p></div><button type="button" class="feedback-close" id="closeFeedback" aria-label="Fechar">×</button></div><form id="feedbackForm"><div class="feedback-field"><label for="feedbackName">Nome</label><input id="feedbackName" name="name" type="text" maxlength="120" required></div><div class="feedback-field"><label for="feedbackContact">Contato</label><input id="feedbackContact" name="contact" type="text" maxlength="180" placeholder="E-mail, telefone ou WhatsApp" required></div><div class="feedback-field"><label for="feedbackMessage">Mensagem</label><textarea id="feedbackMessage" name="message" maxlength="2000" placeholder="Conte o que encontrou e, se possível, informe o nome do candidato ou a seção da página." required></textarea></div><div class="feedback-hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><span class="feedback-status" id="feedbackStatus" aria-live="polite"></span><div class="feedback-actions"><button type="button" class="cancel" id="cancelFeedback">Cancelar</button><button type="submit" class="send">Enviar para a equipe</button></div></form></div></div>`);
  }
}

function setupFeedback(){
  const modal=document.getElementById('feedbackModal');
  const open=document.getElementById('openFeedback');
  const close=document.getElementById('closeFeedback');
  const cancel=document.getElementById('cancelFeedback');
  const form=document.getElementById('feedbackForm');
  const status=document.getElementById('feedbackStatus');
  if(!modal||!open||!form)return;
  const hide=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')};
  const show=()=>{modal.classList.add('open');modal.setAttribute('aria-hidden','false');setTimeout(()=>document.getElementById('feedbackName')?.focus(),50);trackEvent('abrir_form_correcao')};
  open.addEventListener('click',show);
  close?.addEventListener('click',hide);
  cancel?.addEventListener('click',hide);
  modal.addEventListener('click',e=>{if(e.target===modal)hide()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))hide()});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const honeypot=String(fd.get('website')||'').trim();
    if(honeypot)return;
    const payload={name:fd.get('name'),contact:fd.get('contact'),message:fd.get('message')};
    const btn=form.querySelector('button[type=submit]');
    status.textContent='Enviando…';status.className='feedback-status';btn.disabled=true;
    try{
      const result=await SNU_DATA.submitFeedback(payload);
      if(result.error)throw result.error;
      form.reset();
      status.textContent='Obrigado. Sua mensagem foi enviada para a equipe do Sul na Urna.';
      status.className='feedback-status success';
      trackEvent('enviar_correcao');
      setTimeout(hide,1800);
    }catch(err){
      status.textContent=SNU_DATA.configured?'Não foi possível enviar agora. Tente novamente em instantes.':'O canal de correções será ativado assim que o painel administrativo for conectado ao banco de dados.';
      status.className='feedback-status error';
    }finally{btn.disabled=false}
  });
}

async function init(){
  montarRegioes();
  ensurePublicEnhancements();

  // Os banners começam a carregar imediatamente e não esperam candidatos/matérias.
  const bannersTask = SNU_DATA.listBanners(true)
    .then(data => {
      BANNERS = Array.isArray(data) ? data : [];
      renderBanners();
    })
    .catch(error => {
      console.warn('Não foi possível carregar os banners:', error);
      BANNERS = [];
      renderBanners();
    });

  [CANDIDATOS,HISTORIAS] = await Promise.all([
    SNU_DATA.listCandidates(true),
    SNU_DATA.listArticles(true)
  ]);

  renderCandidates();
  renderStories();
  renderProfile();

  document.querySelectorAll('.toggle[aria-label="Filtrar por cargo"] button').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.toggle[aria-label="Filtrar por cargo"] button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentOffice=btn.dataset.office;
    renderCandidates();
  }));

  document.getElementById('profileRegion').addEventListener('change',renderProfile);
  document.getElementById('profileMetric').addEventListener('change',renderProfile);
  ['ctaHeader','ctaFooter'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>trackEvent('clique_central_eleicoes',{local:id})));
  setupFeedback();

  // Mantém referência à Promise apenas para evitar rejeição não tratada; a UI não depende dela.
  await bannersTask;
}
init();