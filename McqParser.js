// McqParser.gs — v3 MULTI-KEY | Fixed: max_completion_tokens + safeJsonParse

var GROQ_KEY_PROP     = 'GROQ_API_KEY';
var MCQ_SYSTEM_SHEETS = ['QUIZ LOG', 'ACTIVE TESTS', 'CONFIG', 'RESULTS', 'TEST_DATA'];
var PROP_GROQ_KEYS    = 'MCQ_GROQ_KEYS';
var PROP_GROQ_MODEL   = 'MCQ_GROQ_MODEL';
var PROP_OR_KEYS      = 'MCQ_OR_KEYS';
var PROP_OR_MODEL     = 'MCQ_OR_MODEL';
var PROP_GEM_KEYS     = 'MCQ_GEM_KEYS';
var PROP_OPENAI_KEY   = 'MCQ_OPENAI_KEY';
var PROP_OPENAI_MODEL = 'MCQ_OPENAI_MODEL';
var PROP_EXHAUSTED    = 'MCQ_EXHAUSTED_LOG';

function promptSaveGroqKey() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt('Save Groq API Key','Paste your Groq API key (starts with gsk_)\nGet free key at: console.groq.com',ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;
  var key = result.getResponseText().trim();
  if (!key.startsWith('gsk_')) { ui.alert('Invalid key. Must start with gsk_'); return; }
  PropertiesService.getScriptProperties().setProperty(GROQ_KEY_PROP, key);
  ui.alert('Saved! Now use: ITI Quiz System > Import MCQs from PDF');
}
function clearGroqKey() { PropertiesService.getScriptProperties().deleteProperty(GROQ_KEY_PROP); SpreadsheetApp.getUi().alert('Groq API Key cleared.'); }
function getSavedGroqKey() { return PropertiesService.getScriptProperties().getProperty(GROQ_KEY_PROP) || ''; }
function testGroqConnection() {
  var key = getSavedGroqKey();
  if (!key) { SpreadsheetApp.getUi().alert('No API key saved.'); return; }
  try {
    var resp = UrlFetchApp.fetch('https://api.groq.com/openai/v1/models',{headers:{'Authorization':'Bearer '+key},muteHttpExceptions:true});
    SpreadsheetApp.getUi().alert(resp.getResponseCode()===200?'SUCCESS! Groq connected.':'Error '+resp.getResponseCode());
  } catch(e) { SpreadsheetApp.getUi().alert('Failed: '+e.message); }
}

function saveProviderConfig(cfg) {
  var p = PropertiesService.getScriptProperties();
  if (cfg.groqKeys    !== undefined) p.setProperty(PROP_GROQ_KEYS,    JSON.stringify(cfg.groqKeys));
  if (cfg.groqModel   !== undefined) p.setProperty(PROP_GROQ_MODEL,   cfg.groqModel);
  if (cfg.orKeys      !== undefined) p.setProperty(PROP_OR_KEYS,      JSON.stringify(cfg.orKeys.map(function(k){return k.trim().charAt(0).toLowerCase()+k.trim().slice(1);})));
  if (cfg.orModel     !== undefined) p.setProperty(PROP_OR_MODEL,     cfg.orModel);
  if (cfg.gemKeys     !== undefined) p.setProperty(PROP_GEM_KEYS,     JSON.stringify(cfg.gemKeys));
  if (cfg.openaiKey   !== undefined) p.setProperty(PROP_OPENAI_KEY,   cfg.openaiKey);
  if (cfg.openaiModel !== undefined) p.setProperty(PROP_OPENAI_MODEL, cfg.openaiModel);
  return {ok:true};
}
function getProviderConfig() {
  var p = PropertiesService.getScriptProperties();
  function arr(k){var r=p.getProperty(k);try{return r?JSON.parse(r):[]}catch(e){return []}}
  var gk=arr(PROP_GROQ_KEYS), leg=getSavedGroqKey();
  if(leg&&gk.indexOf(leg)===-1) gk.unshift(leg);
  return {
    groqKeys:gk, groqModel:p.getProperty(PROP_GROQ_MODEL)||'llama-3.3-70b-versatile',
    orKeys:arr(PROP_OR_KEYS), orModel:p.getProperty(PROP_OR_MODEL)||'meta-llama/llama-3.3-70b-instruct:free',
    gemKeys:arr(PROP_GEM_KEYS),
    openaiKey:p.getProperty(PROP_OPENAI_KEY)||'', openaiModel:p.getProperty(PROP_OPENAI_MODEL)||'gpt-4o-mini',
    exhausted:getExhaustedLog()
  };
}
function getExhaustedLog(){var r=PropertiesService.getScriptProperties().getProperty(PROP_EXHAUSTED);try{return r?JSON.parse(r):{}}catch(e){return {}}}
function hashKey(k){return k.substring(0,8)+'...'+k.slice(-4);}
function markExhausted(h,prov){var l=getExhaustedLog(),m=(prov==='groq')?2:1440;l[h]={provider:prov,when:new Date().toISOString(),resetAt:new Date(Date.now()+m*60000).toISOString()};PropertiesService.getScriptProperties().setProperty(PROP_EXHAUSTED,JSON.stringify(l));}
function isExhausted(h){var l=getExhaustedLog();if(!l[h])return false;if(Date.now()>new Date(l[h].resetAt).getTime()){delete l[h];PropertiesService.getScriptProperties().setProperty(PROP_EXHAUSTED,JSON.stringify(l));return false;}return true;}

function openMcqParser() {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var si=ss.getSheets().map(function(s){return s.getName();}).filter(function(n){return MCQ_SYSTEM_SHEETS.indexOf(n)===-1;}).map(function(n){return{name:n,count:Math.max(0,ss.getSheetByName(n).getLastRow()-1)};});
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(buildMcqHtml(si)).setTitle('📥 MCQ Importer').setWidth(480));
}

function callGroqApi(raw,diff,pts,neg,ukey,explNeeded,explLang,explInst){return callAiApi(raw,diff,pts,neg,ukey,explNeeded,explLang,explInst,'auto');}

function callAiApi(rawText,diff,pts,neg,userApiKey,explNeeded,explLang,explInstruction,preferredProvider){
  var cfg=getProviderConfig(), queue=[];
  cfg.groqKeys.forEach(function(k){if(k)queue.push({provider:'groq',key:k,model:cfg.groqModel});});
  if(userApiKey&&userApiKey.startsWith('gsk_')&&queue.every(function(x){return x.key!==userApiKey;}))queue.unshift({provider:'groq',key:userApiKey,model:cfg.groqModel});
  cfg.orKeys.forEach(function(k){if(k)queue.push({provider:'openrouter',key:k,model:cfg.orModel});});
  cfg.gemKeys.forEach(function(k){if(k)queue.push({provider:'gemini',key:k,model:'gemini-2.5-flash'});});
  if(preferredProvider==='openai'&&cfg.openaiKey)queue.push({provider:'openai',key:cfg.openaiKey,model:cfg.openaiModel});
  if(queue.length===0)throw new Error('No API keys found.\nAdd at least one key in Section 1 and click Save API Keys.');
  var avail=queue.filter(function(p){return !isExhausted(hashKey(p.key));});
  if(avail.length===0){
    var log=getExhaustedLog(),msg='All keys rate-limited.\n\n';
    queue.forEach(function(p){var h=hashKey(p.key);if(log[h])msg+='• '+log[h].provider.toUpperCase()+' ('+h+') resets ~'+new Date(log[h].resetAt).toLocaleString()+'\n';});
    throw new Error(msg+'\nAdd more keys or wait.');
  }
  var lastErr='';
  for(var i=0;i<avail.length;i++){
    var p=avail[i];
    try{return callSingleProvider(p,rawText,diff,pts,neg,explNeeded,explLang,explInstruction);}
    catch(e){
      var em=e.message||'';
      if(em.indexOf('GEMINI_MODEL_ERROR')!==-1){lastErr='gemini model unavailable';continue;}
      if(em.indexOf('429')!==-1||em.toLowerCase().indexOf('rate')!==-1||em.toLowerCase().indexOf('quota')!==-1||em.toLowerCase().indexOf('limit')!==-1){
        markExhausted(hashKey(p.key),p.provider);lastErr=p.provider+' ('+hashKey(p.key)+') exhausted';continue;
      }
      throw e;
    }
  }
  throw new Error('All providers failed. Last: '+lastErr);
}

function callSingleProvider(p,rawText,diff,pts,neg,explNeeded,explLang,explInstruction){
  var sys='You are an expert MCQ parser for Indian ITI/vocational textbooks. Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Raw JSON only.';
  var et='';
  if(explInstruction&&explInstruction.trim()){
    et='- explanation: '+explInstruction.trim()+'\n';
    if(explLang&&explLang!=='en')et+='  Write in '+explLang+'. NEVER translate technical terms.\n';
  } else if(explNeeded){
    if(explLang&&explLang!=='en'){
      et='- explanation: Write a short, clear explanation for the correct answer in '+explLang+' language.\n'+
         '  Rules:\n  1. ITI vocational students — '+explLang+' only to aid understanding, syllabus is English.\n'+
         '  2. NEVER translate technical terms: compressor, motor, terminal, winding, ohm, voltage, current, resistance, capacitor, relay, circuit, battery, piston, valve, bearing, torque, frequency, ampere, watt, electrode, coil, rotor, stator, fuse, contactor.\n'+
         '  3. Avoid rare bookish words. Keep English if '+explLang+' equivalent is uncommon.\n'+
         '  4. Natural sentences e.g. "Jab ohm meter common aur start terminal ke beech infinity read karta hai, to starting winding open circuit ho gayi hai."\n'+
         '  5. Translate meaning, never word-for-word.\n';
    } else {
      et='- explanation: Write a short, clear explanation for the correct answer in English.\n';
    }
  } else {
    et='- explanation: always set to "" (empty string)\n';
  }
  var um='Parse ALL MCQ questions from the text below.\n\nReturn this exact JSON format:\n[{"question":"Full question textas is,dont make it short,dont simplify,dont paraphrase,","optA":"text","optB":"text","optC":"text","optD":"text","answer":"B","difficulty":"'+diff+'","points":'+pts+',"negative":'+neg+',"explanation":""}]\n\nRules:\n- answer must be A, B, C, or D (single uppercase letter only)\n- If answer not found, default to A\n- Options labeled (a)(b)(c)(d) or A) B) or 1.2.3.4 — extract text only, no labels\n- If fewer than 4 options, fill missing ones with empty string ""\n- Clean OCR noise, extra spaces, broken line breaks\n- Preserve technical terms, formulas, numbers exactly\n- Extract EVERY question found\n- For the explanation field: use the full question text, all 4 options, AND the correct answer letter to write a contextually accurate explanation. Mention WHY the correct option is right.\n'+et+'\nTEXT:\n'+rawText;

  if(p.provider==='groq'||p.provider==='openrouter'||p.provider==='openai'){
    var url=p.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':p.provider==='openrouter'?'https://openrouter.ai/api/v1/chat/completions':'https://api.openai.com/v1/chat/completions';
    var hdrs={'Authorization':'Bearer '+p.key,'Content-Type':'application/json'};
    if(p.provider==='openrouter'){hdrs['HTTP-Referer']='https://script.google.com';hdrs['X-Title']='MCQ Parser';}
    var resp=UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',headers:hdrs,payload:JSON.stringify({model:p.model,temperature:0.3,max_completion_tokens:4096,messages:[{role:'system',content:sys},{role:'user',content:um}]}),muteHttpExceptions:true});
    var code=resp.getResponseCode(),body=resp.getContentText();
    if(code===429)throw new Error('429 rate limit');
    if(code!==200){try{var er=JSON.parse(body);throw new Error(er.error?er.error.message:'HTTP '+code);}catch(ex){throw new Error(p.provider+' HTTP '+code);}}
    var out=JSON.parse(body).choices[0].message.content.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
    var qs=safeJsonParse(out);
    if(!Array.isArray(qs)||qs.length===0)throw new Error('No questions parsed. Try pasting cleaner text.');
    qs.forEach(function(q){q._provider=p.provider;q._model=p.model;});
    return qs;
  }
  if(p.provider==='gemini'){
    var gemCombos=[
      {v:'v1beta',m:'gemini-2.5-flash'},{v:'v1beta',m:'gemini-2.5-flash-preview-05-20'},
      {v:'v1beta',m:'gemini-2.0-flash'},{v:'v1beta',m:'gemini-2.0-flash-lite'},
      {v:'v1beta',m:'gemini-1.5-flash'},{v:'v1',m:'gemini-2.5-flash'},
      {v:'v1',m:'gemini-2.0-flash'},{v:'v1',m:'gemini-1.5-flash'}
    ];
    var gpay=JSON.stringify({contents:[{parts:[{text:sys+'\n\n'+um}]}],generationConfig:{temperature:0.3,maxOutputTokens:4096}});
    var lastGemErr='';
    for(var gi=0;gi<gemCombos.length;gi++){
      var gc=gemCombos[gi];
      var gurl='https://generativelanguage.googleapis.com/'+gc.v+'/models/'+gc.m+':generateContent';
      var gr=UrlFetchApp.fetch(gurl,{method:'POST',contentType:'application/json',headers:{'x-goog-api-key':p.key},payload:gpay,muteHttpExceptions:true});
      var gcode=gr.getResponseCode(),gbody=gr.getContentText();
      if(gcode===429)throw new Error('429 rate limit');
      if(gcode===404||gcode===400){lastGemErr=gc.v+'/'+gc.m+' -> '+gcode;continue;}
      if(gcode!==200)throw new Error('Gemini HTTP '+gcode+': '+gbody.substring(0,300));
      var gp=JSON.parse(gbody);
      if(!gp.candidates||!gp.candidates[0]){lastGemErr=gc.v+'/'+gc.m+' -> no candidates';continue;}
      var gt=gp.candidates[0].content.parts[0].text.trim().replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim();
      var gq=safeJsonParse(gt);
      if(!Array.isArray(gq)||gq.length===0)throw new Error('No questions parsed.');
      gq.forEach(function(q){q._provider=p.provider;q._model=gc.v+'/'+gc.m;});
      return gq;
    }
    throw new Error('GEMINI_MODEL_ERROR: all combos failed. Last: '+lastGemErr);
  }
  throw new Error('Unknown provider: '+p.provider);
}

// ── SAFE JSON PARSER ─────────────────────────────────────
function safeJsonParse(raw) {
  // Attempt 1: direct parse
  try { return JSON.parse(raw); } catch(e1) {}

  // Attempt 2: extract JSON array from response
  var m = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch(e2) {} }

  // Attempt 3: sanitize control characters then parse
  try {
    var cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, function(c) {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return '';
    });
    var m2 = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    return JSON.parse(m2 ? m2[0] : cleaned);
  } catch(e3) {}

  throw new Error('JSON parse failed. AI response malformed. Try again or paste cleaner text.');
}

function writeMcqsToSheet(sheetName,questions){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(sheetName);
  if(!sheet){
    sheet=ss.insertSheet(sheetName);
    sheet.appendRow(['Question Text','Question Image URL','Option A Text','Option A Image URL','Option B Text','Option B Image URL','Option C Text','Option C Image URL','Option D Text','Option D Image URL','Answer (A/B/C/D)','Difficulty (easy/medium/hard)','Points','Negative Marks','Explanation']);
    sheet.getRange(1,1,1,15).setBackground('#1a56db').setFontColor('white').setFontWeight('bold').setWrap(true);
    sheet.setFrozenRows(1);
  }
  var startRow=sheet.getLastRow()+1,existingCount=Math.max(0,startRow-2);
  questions.forEach(function(q){sheet.appendRow([q.question||'','',q.optA||'','',q.optB||'','',q.optC||'','',q.optD||'','',(q.answer||'A').toString().trim().toUpperCase(),q.difficulty||'medium',parseFloat(q.points)||1,parseFloat(q.negative)||0,q.explanation||'']);});
  sheet.setColumnWidth(1,300);[3,5,7,9].forEach(function(c){sheet.setColumnWidth(c,180);});sheet.setColumnWidth(11,80);sheet.setColumnWidth(12,90);
  if(questions.length>0)sheet.getRange(startRow,1,questions.length,15).setBackground('#f0fdf4');
  ss.setActiveSheet(sheet);
  return{count:questions.length,sheet:sheetName,startRow:startRow,existing:existingCount};
}

function buildMcqHtml(sheetInfo){
  var sij=JSON.stringify(sheetInfo),cfg=getProviderConfig();
  var log=cfg.exhausted||{},exRows='';
  Object.keys(log).forEach(function(h){var e=log[h];exRows+='<div class="exrow"><span class="extag">'+e.provider.toUpperCase()+'</span><span class="exkey">'+h+'</span><span class="extime">resets ~'+new Date(e.resetAt).toLocaleString()+'</span></div>';});
  var exBlock=exRows?'<div class="exbox"><div class="exhdr">⚠️ Rate-limited Keys</div>'+exRows+'</div>':'';

  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width">'+
'<style>'+
'*{box-sizing:border-box;margin:0;padding:0}'+
'body{font-family:Segoe UI,Arial,sans-serif;font-size:13px;background:#f0f4f8;color:#2d3748}'+
'.hdr{background:linear-gradient(135deg,#f97316,#c2410c);color:white;padding:14px 16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.25)}'+
'.hdr h1{font-size:15px;font-weight:700}.hdr p{font-size:11px;opacity:.85;margin-top:2px}'+
'.card{background:white;margin:10px 8px;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}'+
'.ch{background:#fff7ed;border-bottom:1px solid #fed7aa;padding:9px 14px;display:flex;align-items:center;gap:8px}'+
'.sn{background:#f97316;color:white;border-radius:50%;width:22px;height:22px;min-width:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}'+
'.ct{font-weight:700;font-size:12px;color:#431407;text-transform:uppercase;letter-spacing:.4px}'+
'.cb{padding:12px 14px}'+
'label{font-size:10.5px;color:#6b7280;font-weight:700;display:block;margin-bottom:3px;margin-top:10px;text-transform:uppercase;letter-spacing:.3px}'+
'label:first-child{margin-top:0}'+
'input,textarea,select{width:100%;padding:8px 10px;border:2px solid #e5e7eb;border-radius:7px;font-size:12.5px;font-family:inherit;transition:border .15s;background:#fff}'+
'input:focus,textarea:focus,select:focus{border-color:#f97316;outline:none}'+
'textarea{resize:vertical;line-height:1.5}'+
'.hint{font-size:10px;color:#9ca3af;margin-top:4px;line-height:1.5}'+
'.r3{display:flex;gap:8px}.r3>div{flex:1}'+
'.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:10px}'+
'.bp{background:linear-gradient(135deg,#f97316,#c2410c);color:white}'+
'.bp:hover{box-shadow:0 4px 14px rgba(249,115,22,.5);transform:translateY(-1px)}'+
'.bw{background:linear-gradient(135deg,#059669,#065f46);color:white}'+
'.bw:hover{box-shadow:0 4px 14px rgba(5,150,105,.45);transform:translateY(-1px)}'+
'.btn:disabled{background:#d1d5db!important;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}'+
'.qc{border:1px solid #e5e7eb;border-radius:8px;padding:9px 30px 9px 10px;margin-bottom:7px;background:#fafafa;position:relative}'+
'.qc:hover{border-color:#f97316;background:#fff7ed}'+
'.qn{font-weight:700;color:#c2410c;font-size:12px;margin-bottom:3px}'+
'.qo{font-size:11px;color:#374151;line-height:1.75;margin-top:4px}'+
'.qf{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}'+
'.bg{font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:8px}'+
'.ba{background:#d1fae5;color:#065f46}.bd{background:#fef3c7;color:#92400e}.bpt{background:#dbeafe;color:#1e40af}'+
'.dx{position:absolute;top:7px;right:8px;background:none;border:none;cursor:pointer;color:#d1d5db;font-size:16px;line-height:1}'+
'.dx:hover{color:#ef4444}'+
'.cbar{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:7px 12px;font-size:12px;color:#9a3412;font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}'+
'.cbar .bn{font-size:20px;font-weight:800;color:#f97316}'+
'#status{margin:4px 8px;padding:10px 12px;border-radius:8px;display:none;font-size:12px;line-height:1.6;white-space:pre-line}'+
'.sok{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}'+
'.ser{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}'+
'.sld{background:#fff7ed;color:#c2410c;border:1px solid #fdba74}'+
'.kr{display:flex;gap:6px}.kr input{flex:1}'+
'.ib{padding:8px 10px;border:2px solid #e5e7eb;border-radius:7px;background:white;cursor:pointer;font-size:12px;color:#6b7280;white-space:nowrap}'+
'.ib:hover{border-color:#f97316;color:#c2410c}'+
'.sinfo{font-size:11px;margin-top:6px;padding:6px 10px;border-radius:6px;background:#f0fdf4;color:#065f46;border:1px solid #bbf7d0}'+
'.hidden{display:none!important}.sp{height:20px}'+
'.psec{border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-top:10px;background:#fafafa}'+
'.psec-paid{border-color:#fde68a;background:#fffbeb}'+
'.phdr{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:12px;font-weight:700}'+
'.dot{width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0}'+
'.dg{background:#f97316}.do{background:#6366f1}.dge{background:#10b981}.dai{background:#374151}'+
'.fbadge{font-size:9.5px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:6px;font-weight:700;margin-left:6px}'+
'.pbadge{font-size:9.5px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:6px;font-weight:700;margin-left:6px}'+
'.exbox{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:8px 10px;margin-bottom:8px}'+
'.exhdr{font-size:10.5px;font-weight:700;color:#991b1b;margin-bottom:5px}'+
'.exrow{display:flex;gap:6px;align-items:center;font-size:10px;margin-bottom:3px;flex-wrap:wrap}'+
'.extag{background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:5px;font-weight:700;font-size:9.5px}'+
'.exkey{color:#6b7280;font-family:monospace}.extime{color:#9ca3af}'+
'</style></head><body>'+

'<div class="hdr"><h1>📥 MCQ Importer <span style="font-size:10px;opacity:0.8;font-weight:400">v3 MULTI-KEY</span></h1><p>Paste PDF text → AI → appends to your sheet</p></div>'+

'<div class="card"><div class="ch"><div class="sn">1</div><div class="ct">API Keys &amp; Providers</div></div><div class="cb">'+
exBlock+

'<div class="psec">'+
'<div class="phdr"><span class="dot dg"></span>Groq<span class="fbadge">FREE · Multiple keys</span></div>'+
'<label>One key per line (gsk_...)</label>'+
'<textarea id="groqKeys" rows="3" placeholder="gsk_key1&#10;gsk_key2&#10;gsk_key3...">'+cfg.groqKeys.join('\n')+'</textarea>'+
'<label>Model</label>'+
'<select id="groqModel">'+
'<option value="llama-3.3-70b-versatile"'+(cfg.groqModel==='llama-3.3-70b-versatile'?' selected':'')+'>llama-3.3-70b-versatile (best)</option>'+
'<option value="llama-3.1-70b-versatile"'+(cfg.groqModel==='llama-3.1-70b-versatile'?' selected':'')+'>llama-3.1-70b-versatile</option>'+
'<option value="llama-3.1-8b-instant"'+(cfg.groqModel==='llama-3.1-8b-instant'?' selected':'')+'>llama-3.1-8b-instant (faster)</option>'+
'<option value="mixtral-8x7b-32768"'+(cfg.groqModel==='mixtral-8x7b-32768'?' selected':'')+'>mixtral-8x7b-32768</option>'+
'<option value="gemma2-9b-it"'+(cfg.groqModel==='gemma2-9b-it'?' selected':'')+'>gemma2-9b-it</option>'+
'</select></div>'+

'<div class="psec">'+
'<div class="phdr"><span class="dot do"></span>OpenRouter<span class="fbadge">FREE models · Multiple keys</span></div>'+
'<label>One key per line (sk-or-v1-...)</label>'+
'<textarea id="orKeys" rows="3" placeholder="sk-or-v1-key1&#10;sk-or-v1-key2&#10;sk-or-v1-key3...">'+cfg.orKeys.join('\n')+'</textarea>'+
'<label>Model</label>'+
'<select id="orModel">'+
'<optgroup label="── Free ──">'+
'<option value="meta-llama/llama-3.1-8b-instruct:free"'+(cfg.orModel==='meta-llama/llama-3.1-8b-instruct:free'?' selected':'')+'>Llama 3.1 8B (free)</option>'+
'<option value="meta-llama/llama-3.2-11b-vision-instruct:free"'+(cfg.orModel==='meta-llama/llama-3.2-11b-vision-instruct:free'?' selected':'')+'>Llama 3.2 11B (free)</option>'+
'<option value="google/gemma-2-9b-it:free"'+(cfg.orModel==='google/gemma-2-9b-it:free'?' selected':'')+'>Gemma 2 9B (free)</option>'+
'<option value="mistralai/mistral-7b-instruct:free"'+(cfg.orModel==='mistralai/mistral-7b-instruct:free'?' selected':'')+'>Mistral 7B (free)</option>'+
'<option value="qwen/qwen-2-7b-instruct:free"'+(cfg.orModel==='qwen/qwen-2-7b-instruct:free'?' selected':'')+'>Qwen 2 7B (free)</option>'+
'</optgroup>'+
'<optgroup label="── Paid ──">'+
'<option value="anthropic/claude-3.5-sonnet"'+(cfg.orModel==='anthropic/claude-3.5-sonnet'?' selected':'')+'>Claude 3.5 Sonnet (paid)</option>'+
'<option value="openai/gpt-4o"'+(cfg.orModel==='openai/gpt-4o'?' selected':'')+'>GPT-4o (paid)</option>'+
'<option value="google/gemini-pro-1.5"'+(cfg.orModel==='google/gemini-pro-1.5'?' selected':'')+'>Gemini Pro 1.5 (paid)</option>'+
'</optgroup></select></div>'+

'<div class="psec">'+
'<div class="phdr"><span class="dot dge"></span>Gemini<span class="fbadge">FREE tier · Multiple keys</span></div>'+
'<label>One key per line (AIza...)</label>'+
'<textarea id="gemKeys" rows="3" placeholder="AIzaSy_key1&#10;AIzaSy_key2&#10;AIzaSy_key3...">'+cfg.gemKeys.join('\n')+'</textarea>'+
'</div>'+

'<div class="psec psec-paid">'+
'<div class="phdr"><span class="dot dai"></span>OpenAI<span class="pbadge">PAID — manual only</span></div>'+
'<label>API Key (sk-...)</label>'+
'<div class="kr"><input type="password" id="openaiKey" value="'+cfg.openaiKey+'" placeholder="sk-..." /><button class="ib" onclick="tf(\'openaiKey\',this)">Show</button></div>'+
'<label>Model</label>'+
'<select id="openaiModel">'+
'<option value="gpt-4o-mini"'+(cfg.openaiModel==='gpt-4o-mini'?' selected':'')+'>gpt-4o-mini</option>'+
'<option value="gpt-4o"'+(cfg.openaiModel==='gpt-4o'?' selected':'')+'>gpt-4o</option>'+
'<option value="gpt-3.5-turbo"'+(cfg.openaiModel==='gpt-3.5-turbo'?' selected':'')+'>gpt-3.5-turbo</option>'+
'</select>'+
'<div class="hint">Not used automatically — select below to override.</div>'+
'</div>'+

'<label style="margin-top:10px;">Provider Override</label>'+
'<select id="providerPref">'+
'<option value="auto">🔄 Auto (Groq → OpenRouter → Gemini)</option>'+
'<option value="openai">💳 Force OpenAI (paid)</option>'+
'</select>'+
'<button class="btn" style="background:#6366f1;color:white;margin-top:8px;padding:9px;" onclick="saveKeys()">💾 Save API Keys</button>'+
'<div class="hint">Keys saved to Script Properties. Auto-fallback skips rate-limited keys.</div>'+
'</div></div>'+

'<div class="card"><div class="ch"><div class="sn">2</div><div class="ct">Paste MCQ Text</div></div><div class="cb">'+
'<label>Raw text from PDF / book / WhatsApp</label>'+
'<textarea id="rawText" rows="10" placeholder="Any format:\n\n1. SI unit of current?\n(a) Volt (b) Ampere (c) Ohm (d) Watt\nAns: b"></textarea>'+
'<div class="r3" style="margin-top:10px;">'+
'<div><label>Difficulty</label><select id="dd"><option value="medium">Medium</option><option value="easy">Easy</option><option value="hard">Hard</option></select></div>'+
'<div><label>Points</label><input type="text" id="pts" value="1" /></div>'+
'<div><label>Neg.Marks</label><input type="text" id="neg" value="0" /></div>'+
'</div>'+
'<div style="margin-top:10px;padding:10px 12px;border:2px solid #e5e7eb;border-radius:8px;background:#fafafa;" id="explBox">'+
'<div style="display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="toggleExpl()">'+
'<input type="checkbox" id="explCheck" style="width:16px;height:16px;accent-color:#f97316;cursor:pointer;flex-shrink:0;" onclick="event.stopPropagation();toggleExpl()">'+
'<div>'+
'<div style="font-size:12px;font-weight:700;color:#374151;">Generate Explanation for each answer?</div>'+
'<div style="font-size:10.5px;color:#9ca3af;margin-top:1px;">AI will write a reason why the answer is correct (Column O)</div>'+
'</div></div>'+
'<div id="explLangRow" style="display:none;margin-top:8px;">'+
'<label style="margin-top:0;">Explanation Language</label>'+
'<select id="explLang">'+
'<option value="en">English</option>'+
'<option value="mr">Marathi (मराठी)</option>'+
'<option value="hi">Hindi (हिन्दी)</option>'+
'<option value="gu">Gujarati (ગુજરાતી)</option>'+
'<option value="bn">Bengali (বাংলা)</option>'+
'<option value="ta">Tamil (தமிழ்)</option>'+
'<option value="te">Telugu (తెలుగు)</option>'+
'<option value="kn">Kannada (ಕನ್ನಡ)</option>'+
'<option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>'+
'</select>'+
'<label style="margin-top:8px;">Custom Instruction <span style="font-weight:400;color:#9ca3af;">(optional)</span></label>'+
'<textarea id="explInstruction" rows="3" placeholder="e.g. Keep it 2 lines max. Focus on why wrong options are wrong.&#10;Or: Step-by-step with formula."></textarea>'+
'<div class="hint">Leave blank = default style. AI uses full Q + all options + correct answer as context.</div>'+
'</div></div>'+
'<button class="btn bp" id="parseBtn" onclick="parseNow()">Parse MCQs with AI</button>'+
'</div></div>'+

'<div class="card hidden" id="previewCard">'+
'<div class="ch"><div class="sn">3</div><div class="ct">Review Questions</div></div>'+
'<div class="cb"><div class="cbar"><span><span class="bn" id="qCount">0</span> questions parsed</span><span style="font-size:10px;font-weight:400">X to remove wrong ones</span></div>'+
'<div id="previewList"></div></div></div>'+

'<div class="card hidden" id="writeCard">'+
'<div class="ch"><div class="sn">4</div><div class="ct">Write to Subject Sheet</div></div>'+
'<div class="cb">'+
'<label>Target Sheet</label>'+
'<select id="targetSheet" onchange="onSheetChange()"></select>'+
'<input type="text" id="newSheetName" class="hidden" placeholder="New subject sheet name..." style="margin-top:6px;" />'+
'<div id="sheetInfo" class="sinfo" style="display:none;"></div>'+
'<div id="autoTrBox" style="margin-top:10px;border:2px solid #e2e8f0;border-radius:9px;padding:10px 12px;background:#f8fafc;transition:all .2s;">'+
'<div style="display:flex;align-items:center;gap:9px;cursor:pointer;" onclick="toggleAutoTr()">'+
'<input type="checkbox" id="autoTrCheck" style="width:16px;height:16px;accent-color:#1a56db;cursor:pointer;flex-shrink:0;" onclick="event.stopPropagation();toggleAutoTr()">'+
'<div>'+
'<div style="font-size:12px;font-weight:700;color:#1e293b;">🌐 Auto-translate after import?</div>'+
'<div style="font-size:10.5px;color:#64748b;margin-top:1px;">MCQs write ho jaane ke baad cols P–T automatically translate ho jayenge</div>'+
'</div></div>'+
'<div id="autoTrOpts" style="display:none;margin-top:9px;">'+
'<label style="font-size:10.5px;color:#6b7280;font-weight:700;display:block;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px;">Translate into</label>'+
'<select id="autoTrLang" style="width:100%;padding:7px 10px;border:2px solid #e2e8f0;border-radius:7px;font-size:12.5px;font-family:inherit;background:white;">'+
'<option value="hi">Hindi (हिन्दी)</option>'+
'<option value="mr">Marathi (मराठी)</option>'+
'<option value="gu">Gujarati (ગુજરાતી)</option>'+
'<option value="bn">Bengali (বাংলা)</option>'+
'<option value="ta">Tamil (தமிழ்)</option>'+
'<option value="te">Telugu (తెలుగు)</option>'+
'<option value="kn">Kannada (ಕನ್ನಡ)</option>'+
'<option value="ml">Malayalam (മലയാളം)</option>'+
'<option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>'+
'<option value="ur">Urdu (اردو)</option>'+
'</select>'+
'</div></div>'+
'<button class="btn bw" id="writeBtn" onclick="writeNow()">Add Questions to Sheet</button>'+
'</div></div>'+

'<div id="status"></div><div class="sp"></div>'+

'<script>'+
'var D=[];'+
'var SINFO='+sij+';'+
'(function(){'+
'  var sel=document.getElementById("targetSheet");'+
'  SINFO.forEach(function(s){var o=document.createElement("option");o.value=s.name;o.textContent=s.name+(s.count>0?" ("+s.count+" Qs)":" (empty)");sel.appendChild(o);});'+
'  var on=document.createElement("option");on.value="__new__";on.textContent="+ Create New Sheet...";sel.appendChild(on);'+
'  updateSheetInfo();'+
'})();'+
'function tf(id,btn){var i=document.getElementById(id);if(!i)return;var s=i.type==="password";i.type=s?"text":"password";btn.textContent=s?"Hide":"Show";}'+
'function saveKeys(){'+
'  function lines(id){return document.getElementById(id).value.split("\\n").map(function(k){return k.trim();}).filter(function(k){return k.length>0;});}'+
'  var cfg={groqKeys:lines("groqKeys"),groqModel:document.getElementById("groqModel").value,orKeys:lines("orKeys"),orModel:document.getElementById("orModel").value,gemKeys:lines("gemKeys"),openaiKey:document.getElementById("openaiKey").value.trim(),openaiModel:document.getElementById("openaiModel").value};'+
'  stat("Saving keys...","sld");'+
'  google.script.run.withSuccessHandler(function(){stat("✓ Keys saved! Auto-fallback: Groq → OpenRouter → Gemini","sok");}).withFailureHandler(function(e){stat("Error: "+e.message,"ser");}).saveProviderConfig(cfg);'+
'}'+
'function onSheetChange(){var n=document.getElementById("targetSheet").value==="__new__";var e=document.getElementById("newSheetName");n?e.classList.remove("hidden"):e.classList.add("hidden");if(n)e.focus();updateSheetInfo();}'+
'function updateSheetInfo(){var sel=document.getElementById("targetSheet").value;var el=document.getElementById("sheetInfo");if(sel==="__new__"){el.style.display="none";return;}var s=SINFO.find(function(x){return x.name===sel;});el.style.display="block";if(s&&s.count>0)el.innerHTML="<b>"+s.count+" existing questions</b> — new ones will be safely appended.";else el.textContent="Sheet is empty. Questions will be added from row 2.";}'+
'function toggleExpl(){var chk=document.getElementById("explCheck");chk.checked=!chk.checked;document.getElementById("explLangRow").style.display=chk.checked?"block":"none";document.getElementById("explBox").style.borderColor=chk.checked?"#f97316":"#e5e7eb";document.getElementById("explBox").style.background=chk.checked?"#fff7ed":"#fafafa";}'+
'function parseNow(){'+
'  var raw=document.getElementById("rawText").value.trim();'+
'  if(raw.length<10){stat("Please paste MCQ text first.","ser");return;}'+
'  var diff=document.getElementById("dd").value;'+
'  var pts=parseFloat(document.getElementById("pts").value)||1;'+
'  var neg=parseFloat(document.getElementById("neg").value)||0;'+
'  var explNeeded=document.getElementById("explCheck").checked;'+
'  var explLang=document.getElementById("explLang").value;'+
'  var explInst=document.getElementById("explInstruction").value.trim();'+
'  var pref=document.getElementById("providerPref").value;'+
'  stat("Sending to AI... please wait 10-30 seconds...","sld");'+
'  dis("parseBtn",true);'+
'  google.script.run'+
'    .withSuccessHandler(function(q){D=q;renderPreview();var inf=q.length>0&&q[0]._provider?" ["+q[0]._provider.toUpperCase()+" / "+q[0]._model+"]":"";stat("✓ Done! "+q.length+" questions parsed."+inf+"\\nReview then click Add to Sheet.","sok");dis("parseBtn",false);})'+
'    .withFailureHandler(function(e){stat("Error: "+e.message,"ser");dis("parseBtn",false);})'+
'    .callAiApi(raw,diff,pts,neg,"",explNeeded,explLang,explInst,pref);'+
'}'+
'function renderPreview(){document.getElementById("previewCard").classList.remove("hidden");document.getElementById("writeCard").classList.remove("hidden");document.getElementById("qCount").textContent=D.length;var l=document.getElementById("previewList");l.innerHTML="";D.forEach(function(q,i){var d=document.createElement("div");d.className="qc";d.innerHTML="<button class=\\"dx\\" onclick=\\"rm("+i+")\\">X</button><div class=\\"qn\\">Q"+(i+1)+". "+x(q.question)+"</div><div class=\\"qo\\">A: "+x(q.optA)+"<br>B: "+x(q.optB)+(q.optC?"<br>C: "+x(q.optC):"")+(q.optD?"<br>D: "+x(q.optD):"")+"</div><div class=\\"qf\\"><span class=\\"bg ba\\">Ans: "+x(q.answer||"A")+"</span><span class=\\"bg bd\\">"+(q.difficulty||"medium")+"</span><span class=\\"bg bpt\\">"+(q.points||1)+"pt</span></div>";l.appendChild(d);});}'+
'function rm(i){D.splice(i,1);if(D.length===0){document.getElementById("previewCard").classList.add("hidden");document.getElementById("writeCard").classList.add("hidden");stat("All removed. Paste new text to start again.","sld");}else renderPreview();}'+
'function toggleAutoTr(){var chk=document.getElementById("autoTrCheck");chk.checked=!chk.checked;var opts=document.getElementById("autoTrOpts");opts.style.display=chk.checked?"block":"none";var box=document.getElementById("autoTrBox");box.style.borderColor=chk.checked?"#1a56db":"#e2e8f0";box.style.background=chk.checked?"#eff6ff":"#f8fafc";}'+
'function writeNow(){'+
'  if(D.length===0){stat("No questions to write.","ser");return;}'+
'  var sv=document.getElementById("targetSheet").value;'+
'  var nm=sv==="__new__"?document.getElementById("newSheetName").value.trim():sv;'+
'  if(!nm){stat("Enter a name for the new sheet.","ser");return;}'+
'  var autoTr=document.getElementById("autoTrCheck").checked;'+
'  var autoTrLang=document.getElementById("autoTrLang").value;'+
'  stat("Writing "+D.length+" questions to: "+nm+"...","sld");'+
'  dis("writeBtn",true);'+
'  google.script.run'+
'    .withSuccessHandler(function(r){'+
'      var s=SINFO.find(function(x){return x.name===r.sheet;});'+
'      if(s)s.count+=r.count;else SINFO.push({name:r.sheet,count:r.count});'+
'      updateSheetInfo();'+
'      if(autoTr&&autoTrLang){'+
'        stat("✓ "+r.count+" questions added to: "+r.sheet+(r.existing>0?"\\n(Appended after "+r.existing+" existing questions)":"")+("\\n\\n🌐 Translating into "+autoTrLang+"... please wait..."),"sld");'+
'        google.script.run'+
'          .withSuccessHandler(function(tr){'+
'            stat("✅ All done!\\n\\n"+r.count+" questions added to: "+r.sheet+(r.existing>0?"\\n(Appended after "+r.existing+" existing questions)":"")+("\\n🌐 "+tr.rows+" questions translated → Cols P–T\\n✅ Technical terms preserved."),"sok");'+
'            dis("writeBtn",false);'+
'          })'+
'          .withFailureHandler(function(e){stat("✓ Questions saved, but translation error: "+e.message,"ser");dis("writeBtn",false);})'+
'          .addBilingualColumns(r.sheet,autoTrLang,"en");'+
'      } else {'+
'        var msg="✓ Done! "+r.count+" questions added to: "+r.sheet;'+
'        if(r.existing>0)msg+="\\n(Appended after "+r.existing+" existing questions)";'+
'        msg+="\\n\\nNow open Quiz Maker to create a test!";'+
'        stat(msg,"sok");dis("writeBtn",false);'+
'      }'+
'    })'+
'    .withFailureHandler(function(e){stat("Error: "+e.message,"ser");dis("writeBtn",false);})'+
'    .writeMcqsToSheet(nm,D);'+
'}'+
'function x(s){if(!s)return"<em style=color:#ccc>-</em>";return s.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}'+
'function stat(m,c){var e=document.getElementById("status");e.style.display="block";e.className=c;e.textContent=m;setTimeout(function(){e.scrollIntoView({behavior:"smooth",block:"nearest"});},50);}'+
'function dis(id,v){var e=document.getElementById(id);if(e)e.disabled=v;}'+
'</script></body></html>';
}

// ── HELPERS ──────────────────────────────────────────────
function fixORModel() {
  PropertiesService.getScriptProperties().setProperty('MCQ_OR_MODEL', 'meta-llama/llama-3.3-70b-instruct:free');
  SpreadsheetApp.getUi().alert('Done! OpenRouter model set to openrouter/free');
}

function fixORKey() {
  var raw = PropertiesService.getScriptProperties().getProperty('MCQ_OR_KEYS');
  if (!raw) { SpreadsheetApp.getUi().alert('No OR keys saved.'); return; }
  var keys = JSON.parse(raw);
  var fixed = keys.map(function(k){ return k.trim().charAt(0).toLowerCase() + k.trim().slice(1); });
  PropertiesService.getScriptProperties().setProperty('MCQ_OR_KEYS', JSON.stringify(fixed));
  SpreadsheetApp.getUi().alert('Fixed! Keys: ' + JSON.stringify(fixed));
}

function clearExhaustedKeys() {
  PropertiesService.getScriptProperties().deleteProperty('MCQ_EXHAUSTED_LOG');
  SpreadsheetApp.getUi().alert('All exhausted flags cleared!');
}