const state={tab:'candidates',rows:[],editing:null,demo:!SNU_DATA.configured};

const defs={
  candidates:{
    title:'Candidatos',table:'candidates',seed:'candidates',
    cols:[['foto','Foto'],['name','Nome de urna'],['candidate_number','Número'],['party','Partido'],['office','Cargo'],['regions','Regiões'],['active','Ativo']],
    fields:[
      ['name','Nome de urna','text',true],
      ['candidate_number','Número do candidato','text',false],
      ['full_name','Nome completo (uso interno)','text',false],
      ['party','Partido','text',true],
      ['office','Cargo','select',true,['federal','estadual']],
      ['regions','Regiões','multiregion',true,['AMREC','AMESC','AMUREL']],
      ['city','Cidade / referência regional','text',false],
      ['tse_url','Link oficial do TSE','url',true],
      ['photo_url','Foto (URL ou caminho)','text',false],
      ['photo_file','Ou enviar nova foto','file',false],
      ['review_note','Observação interna','text',false],
      ['sort_order','Ordem','number',false],
      ['active','Ativo','checkbox',false]
    ]
  },
  articles:{
    title:'Matérias',table:'articles',seed:'articles',
    cols:[['foto','Imagem'],['title','Título'],['active','Ativa'],['sort_order','Ordem']],
    fields:[
      ['title','Título','text',true],['url','Link da matéria no HN','url',true],
      ['image_url','Imagem (URL ou caminho)','text',false],['image_file','Ou enviar nova imagem','file',false],
      ['sort_order','Ordem','number',false],['active','Ativa','checkbox',false]
    ]
  },
  banners:{
    title:'Banners',table:'banners',seed:'banners',
    cols:[['foto','Banner'],['name','Nome'],['slot','Posição'],['active','Ativo']],
    fields:[
      ['name','Nome interno','text',true],['slot','Posição','select',true,['topo','meio']],
      ['link_url','Link de destino','url',false],['image_url','Imagem (URL ou caminho)','text',false],
      ['image_file','Ou enviar novo banner','file',false],['alt_text','Texto alternativo','text',false],
      ['sort_order','Ordem','number',false],['active','Ativo','checkbox',false]
    ]
  },
  feedback:{
    title:'Correções recebidas',table:'feedback',seed:'feedback',
    cols:[['created_at','Recebida em'],['name','Nome'],['contact','Contato'],['message','Mensagem'],['status','Status']],
    fields:[['status','Status','select',true,['nova','em_analise','resolvida']]]
  }
};

function e(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function mediaSrc(u){if(!u)return '';return /^https?:|^data:|^blob:/.test(u)?u:'../'+u.replace(/^\.\//,'')}
function notice(msg,kind=''){return `<div class="notice ${kind}">${msg}</div>`}
function uuid(){return crypto.randomUUID?crypto.randomUUID():'demo-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
function statusLabel(v){return ({nova:'Nova',em_analise:'Em análise',resolvida:'Resolvida'})[v]||v||'Nova'}
function formatDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('pt-BR')}
function singular(tab){return ({candidates:'candidato',articles:'matéria',banners:'banner',feedback:'correção'})[tab]||'item'}

async function sessionInit(){
  const mode=document.getElementById('modeNotice');
  if(state.demo){
    mode.innerHTML=notice('<strong>Modo demonstração:</strong> Supabase ainda não foi configurado. Você pode testar candidatos, matérias e banners, mas as alterações ficam somente neste navegador. O recebimento de correções será ativado quando o banco estiver conectado.','demo');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('demoEnter').classList.remove('hidden');
    return;
  }
  const {data:{session}}=await SNU_DATA.client.auth.getSession();
  if(session)showApp();else mode.innerHTML=notice('Entre com o usuário administrador cadastrado no Supabase.');
}

async function showApp(){
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');
  document.getElementById('appNotice').innerHTML=state.demo
    ?notice('Modo demonstração local: as mudanças não são publicadas para outros usuários.','demo')
    :notice('Conectado ao Supabase. Alterações salvas aqui alimentam a página pública e as correções enviadas pelos leitores aparecem na aba “Correções”.');
  await loadRows();
}

async function loadRows(){
  const d=defs[state.tab];
  if(state.demo){
    state.rows=SNU_DATA.demoRead(d.seed);
  }else{
    let q=SNU_DATA.client.from(d.table).select('*');
    q=state.tab==='feedback'?q.order('created_at',{ascending:false}):q.order('sort_order',{ascending:true});
    const {data,error}=await q;
    if(error){alert(error.message);return}
    state.rows=data||[];
  }
  renderTable();
}

function cellHtml(r,k){
  if(k==='foto'){
    const u=r.photo_url||r.image_url||'';
    return `<td>${u?`<img class="${state.tab==='candidates'?'avatar':'thumb'}" src="${e(mediaSrc(u))}" alt="">`:'—'}</td>`;
  }
  if(k==='active')return `<td>${r.active!==false?'Sim':'Não'}</td>`;
  if(k==='office')return `<td>${r[k]==='federal'?'Federal':'Estadual'}</td>`;
  if(k==='regions')return `<td>${e((Array.isArray(r.regions)&&r.regions.length?r.regions:(r.region?[r.region]:[])).join(' + '))}</td>`;
  if(k==='created_at')return `<td>${e(formatDate(r[k]))}</td>`;
  if(k==='status')return `<td><span class="feedback-pill ${e(r[k]||'nova')}">${e(statusLabel(r[k]))}</span></td>`;
  if(k==='message')return `<td class="message-cell">${e(r[k]??'')}</td>`;
  return `<td>${e(r[k]??'')}</td>`;
}

function renderTable(){
  const d=defs[state.tab];
  document.getElementById('sectionTitle').textContent=d.title;
  const newItem=document.getElementById('newItem');
  newItem.classList.toggle('hidden',state.tab==='feedback');
  document.getElementById('tableHead').innerHTML='<tr>'+d.cols.map(x=>`<th>${x[1]}</th>`).join('')+'<th>Ações</th></tr>';
  document.getElementById('tableBody').innerHTML=state.rows.length?state.rows.map((r,i)=>
    '<tr>'+d.cols.map(([k])=>cellHtml(r,k)).join('')+`<td><div class="actions"><button class="btn secondary small" onclick="editRow(${i})">${state.tab==='feedback'?'Status':'Editar'}</button><button class="btn danger small" onclick="deleteRow(${i})">Excluir</button></div></td></tr>`
  ).join(''):`<tr><td colspan="${d.cols.length+1}" style="padding:24px;color:var(--muted)">${state.tab==='feedback'?'Nenhuma correção recebida ainda.':'Nenhum item cadastrado.'}</td></tr>`;
}

function buildFields(row={}){
  const d=defs[state.tab];
  document.getElementById('formFields').innerHTML=d.fields.map(([key,label,type,required,options])=>{
    if(type==='select')return `<div class="field"><label>${label}</label><select name="${key}" ${required?'required':''}>${options.map(o=>`<option value="${o}" ${row[key]===o?'selected':''}>${state.tab==='feedback'?statusLabel(o):o}</option>`).join('')}</select></div>`;
    if(type==='multiregion'){
      const selected=Array.isArray(row.regions)&&row.regions.length?row.regions:(row.region?[row.region]:[]);
      return `<div class="field full"><label>${label}</label><div style="display:flex;gap:14px;flex-wrap:wrap;padding:10px 0">${options.map(o=>`<label style="display:flex;gap:6px;align-items:center;color:var(--ink);text-transform:none;letter-spacing:0"><input type="checkbox" name="${key}" value="${o}" ${selected.includes(o)?'checked':''}> ${o}</label>`).join('')}</div></div>`;
    }
    if(type==='checkbox')return `<div class="field"><label><input type="checkbox" name="${key}" ${row[key]!==false?'checked':''}> ${label}</label></div>`;
    if(type==='file')return `<div class="field full"><label>${label}</label><input type="file" name="${key}" accept="image/*"></div>`;
    return `<div class="field ${key.includes('url')?'full':''}"><label>${label}</label><input type="${type}" name="${key}" value="${e(row[key]??(type==='number'?state.rows.length+1:''))}" ${required?'required':''}></div>`;
  }).join('');
}

window.editRow=i=>{
  state.editing=i;
  document.getElementById('modalTitle').textContent='Editar '+singular(state.tab);
  buildFields(state.rows[i]);
  document.getElementById('modal').classList.add('open');
};

window.deleteRow=async i=>{
  if(!confirm(state.tab==='feedback'?'Excluir esta correção recebida?':'Excluir este item?'))return;
  const d=defs[state.tab],row=state.rows[i];
  if(state.demo){
    state.rows.splice(i,1);SNU_DATA.demoWrite(d.seed,state.rows);
  }else{
    const {error}=await SNU_DATA.client.from(d.table).delete().eq('id',row.id);
    if(error){alert(error.message);return}
  }
  await loadRows();
};

async function uploadImage(file,folder){
  if(!file)return '';
  if(state.demo){
    return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));r.readAsDataURL(file)});
  }
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket=(window.SUL_NA_URNA_CONFIG||{}).mediaBucket||'sul-na-urna-media';
  const {error}=await SNU_DATA.client.storage.from(bucket).upload(path,file,{upsert:false});
  if(error)throw error;
  return SNU_DATA.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function ensureAdminEnhancements(){
  const tabs=document.querySelector('.tabs');
  if(tabs&&!tabs.querySelector('[data-tab="feedback"]')){
    const b=document.createElement('button');
    b.type='button';b.dataset.tab='feedback';b.textContent='Correções';tabs.appendChild(b);
  }
  if(!document.getElementById('snuAdminEnhancements')){
    const style=document.createElement('style');style.id='snuAdminEnhancements';style.textContent='.message-cell{min-width:300px;max-width:460px;white-space:normal;line-height:1.45}.feedback-pill{display:inline-block;padding:4px 7px;border-radius:999px;font-size:11px;font-weight:700;background:#EEF4FF;color:#214B91}.feedback-pill.em_analise{background:#FFF8E7;color:#805A11}.feedback-pill.resolvida{background:#EAF7EE;color:var(--green)}';document.head.appendChild(style);
  }
}

ensureAdminEnhancements();

document.getElementById('loginForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const s=document.getElementById('loginStatus');s.textContent=' Entrando…';
  const {error}=await SNU_DATA.client.auth.signInWithPassword({email:document.getElementById('email').value,password:document.getElementById('password').value});
  if(error){s.textContent=' '+error.message;return}showApp();
});
document.getElementById('demoEnter').addEventListener('click',showApp);
document.getElementById('logout').addEventListener('click',async()=>{if(!state.demo)await SNU_DATA.client.auth.signOut();location.reload()});
document.getElementById('openSite').addEventListener('click',()=>window.open('../index.html','_blank'));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',async()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.tab=b.dataset.tab;state.editing=null;await loadRows();
}));
document.getElementById('newItem').addEventListener('click',()=>{
  if(state.tab==='feedback')return;
  state.editing=null;document.getElementById('modalTitle').textContent='Adicionar '+singular(state.tab);buildFields({active:true});document.getElementById('modal').classList.add('open');
});
document.getElementById('cancelModal').addEventListener('click',()=>document.getElementById('modal').classList.remove('open'));
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')e.currentTarget.classList.remove('open')});
document.getElementById('editForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const d=defs[state.tab],fd=new FormData(ev.currentTarget),obj={};
  d.fields.forEach(([key,,type])=>{
    if(type==='file')return;
    if(type==='checkbox')obj[key]=fd.has(key);
    else if(type==='multiregion')obj[key]=fd.getAll(key).map(String);
    else if(type==='number')obj[key]=Number(fd.get(key)||0);
    else obj[key]=String(fd.get(key)||'').trim();
  });
  try{
    if(state.tab==='candidates'){
      if(!obj.regions||!obj.regions.length)throw new Error('Selecione ao menos uma região.');
      obj.region=obj.regions[0];
    }
    const file=fd.get('photo_file')||fd.get('image_file');
    if(file&&file.size){const url=await uploadImage(file,state.tab);if(state.tab==='candidates')obj.photo_url=url;else obj.image_url=url}
    if(state.demo){
      if(state.editing===null)obj.id=uuid(),state.rows.push(obj);else state.rows[state.editing]={...state.rows[state.editing],...obj};
      SNU_DATA.demoWrite(d.seed,state.rows);
    }else{
      if(state.editing===null){const {error}=await SNU_DATA.client.from(d.table).insert(obj);if(error)throw error}
      else{const {error}=await SNU_DATA.client.from(d.table).update(obj).eq('id',state.rows[state.editing].id);if(error)throw error}
    }
    document.getElementById('modal').classList.remove('open');await loadRows();
  }catch(err){alert(err.message||err)}
});

sessionInit();
