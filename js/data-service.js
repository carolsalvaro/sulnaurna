(function(){
  const cfg=window.SUL_NA_URNA_CONFIG||{};
  const configured=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&window.supabase);
  const client=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  const clone=v=>JSON.parse(JSON.stringify(v));

  function demoRead(key){
    try{const v=localStorage.getItem('snu_20260910_'+key);if(v)return JSON.parse(v);}catch(e){}
    return clone((window.SEED_DATA||{})[key]||[]);
  }
  function demoWrite(key,rows){localStorage.setItem('snu_20260910_'+key,JSON.stringify(rows));}

  async function list(table,seedKey,onlyActive=true){
    if(!client)return demoRead(seedKey).filter(x=>!onlyActive||x.active!==false);
    let q=client.from(table).select('*').order('sort_order',{ascending:true});
    if(onlyActive)q=q.eq('active',true);
    const {data,error}=await q;
    if(error){console.warn(error);return demoRead(seedKey).filter(x=>!onlyActive||x.active!==false);}
    return data&&data.length?data:demoRead(seedKey).filter(x=>!onlyActive||x.active!==false);
  }

  async function submitFeedback(payload){
    if(!client)return {data:null,error:new Error('Canal de correções ainda não está conectado ao banco de dados.'),configured:false};
    const clean={name:String(payload.name||'').trim().slice(0,120),contact:String(payload.contact||'').trim().slice(0,180),message:String(payload.message||'').trim().slice(0,2000),page_url:String(location.href||'').slice(0,500)};
    const {data,error}=await client.from('feedback').insert(clean).select('id').single();
    return {data,error,configured:true};
  }

  async function recordSimulatorEvent(payload={}){
    if(!client)return {error:null,configured:false};
    const args={
      p_event:String(payload.event||'').slice(0,20),
      p_step:payload.step?String(payload.step).slice(0,20):null,
      p_kind:payload.kind?String(payload.kind).slice(0,20):null,
      p_candidate_id:payload.candidate_id?String(payload.candidate_id).slice(0,80):null,
      p_candidate_number:payload.candidate_number?String(payload.candidate_number).slice(0,10):null,
      p_candidate_name:payload.candidate_name?String(payload.candidate_name).slice(0,160):null,
      p_party:payload.party?String(payload.party).slice(0,40):null
    };
    const {error}=await client.rpc('record_simulator_event',args);
    if(error)console.warn('Urna simulada: métrica não registrada.',error.message||error);
    return {error,configured:true};
  }

  window.SNU_DATA={
    configured,client,
    listCandidates:(a=true)=>list('candidates','candidates',a),
    listArticles:(a=true)=>list('articles','articles',a),
    listBanners:(a=true)=>list('banners','banners',a),
    submitFeedback,recordSimulatorEvent,demoRead,demoWrite
  };
})();
