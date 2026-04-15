// ============================================================
// SetupWizard.gs  —  ITI QUIZ SYSTEM  —  ONE-CLICK SETUP
// Add this file to the same Apps Script project as Code.gs
//
// In Code.gs onOpen(), add this line at the TOP of the menu:
//   .addItem('🚀 First-Time Setup / Reset Sheets', 'openSetupWizard')
// ============================================================

function openSetupWizard() {
  var html = HtmlService.createHtmlOutput(buildSetupWizardHtml())
    .setTitle('🚀 ITI Quiz System — Setup Wizard')
    .setWidth(560)
    .setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '🚀 ITI Quiz System — Setup Wizard');
}

// ============ CALLED FROM WIZARD HTML (step by step) ============

function wizard_setupConfig() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('CONFIG');
    if (!s) s = ss.insertSheet('CONFIG');
    s.clearContents();
    s.appendRow(['Key', 'Value', 'Description']);
    s.getRange(1,1,1,3).setBackground('#1a56db').setFontColor('white').setFontWeight('bold');
    [
      ['instituteName',    'Government ITI',              'Name of your institute'],
      ['instituteSubtitle','Industrial Training Institute','City / Address / Subtitle'],
      ['logoUrl',          '',                            'Optional: Public Google Drive image URL for logo'],
      ['defaultDuration',  '60',                          'Default test duration in minutes'],
      ['passingMarks',     '40',                          'Passing percentage (0-100)'],
      ['webAppUrl',        '',                            'PASTE YOUR WEB APP URL HERE after deploying!'],
    ].forEach(function(row){ s.appendRow(row); });
    s.getRange(s.getLastRow(), 1, 1, 3).setBackground('#fff3cd').setFontWeight('bold');
    s.setFrozenRows(1);
    [150, 300, 300].forEach(function(w, i){ s.setColumnWidth(i+1, w); });
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_setupResults() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('RESULTS');
    if (!s) s = ss.insertSheet('RESULTS');
    s.clearContents();
    var h = ['Submission ID','Test ID','Test Title','Student Name','Roll No','Class','Trade',
             'Submitted At','Score','Total Marks','Percentage','Status',
             'FS Violations','Tab Switches','Answers (JSON)'];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#1a56db').setFontColor('white').setFontWeight('bold');
    s.setFrozenRows(1);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_setupActiveTests() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('ACTIVE TESTS');
    if (!s) s = ss.insertSheet('ACTIVE TESTS');
    s.clearContents();
    var h = ['Test ID','Title','Teacher','Trade','Created','Duration','Questions','Student URL','Status'];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#1a56db').setFontColor('white').setFontWeight('bold');
    s.setFrozenRows(1);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_setupQuizLog() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('QUIZ LOG');
    if (!s) s = ss.insertSheet('QUIZ LOG');
    s.clearContents();
    var h = ['Date','Time','Teacher','Test Title','Trade','Chapters','Mode','Difficulty','Questions','Duration','Student URL'];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#1a56db').setFontColor('white').setFontWeight('bold');
    s.setFrozenRows(1);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_setupTestData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('TEST_DATA');
    if (!s) {
      s = ss.insertSheet('TEST_DATA');
      s.hideSheet();
    }
    s.clearContents();
    s.appendRow(['Test ID', 'JSON Data', 'Created At']);
    s.getRange(1,1,1,3).setFontWeight('bold');
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_setupSampleSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('Trade Theory');
    if (!s) s = ss.insertSheet('Trade Theory');
    s.clearContents();
    var h = [
      'Question Text','Question Image URL',
      'Option A Text','Option A Image URL',
      'Option B Text','Option B Image URL',
      'Option C Text','Option C Image URL',
      'Option D Text','Option D Image URL',
      'Answer (A/B/C/D)','Difficulty (easy/medium/hard)',
      'Points','Negative Marks','Explanation'
    ];
    s.appendRow(h);
    s.getRange(1,1,1,h.length).setBackground('#1a56db').setFontColor('white').setFontWeight('bold').setWrap(true);
    s.setFrozenRows(1);
    s.appendRow(['What is the SI unit of electric current?','','Volt','','Ampere','','Ohm','','Watt','','B','easy',1,0,'Electric current is measured in Amperes (A).']);
    s.appendRow(["Ohm's Law states that V = ?",'','I/R','','IR','','I+R','','I×R²','','B','medium',1,0.25,"Ohm's Law: V = IR"]);
    s.appendRow(['Which material is the best conductor of electricity?','','Iron','','Copper','','Aluminium','','Silver','','D','medium',2,0.5,'Silver is the best conductor but copper is most widely used.']);
    [200,150,200,150,200,150,200,150,200,150,120,150,80,100,250].forEach(function(w,i){ s.setColumnWidth(i+1,w); });
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_saveWebAppUrl(url) {
  try {
    if (!url || !url.startsWith('https://script.google.com')) {
      return { ok: false, error: 'Invalid URL. Must start with https://script.google.com/macros/s/...' };
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s  = ss.getSheetByName('CONFIG');
    if (!s) return { ok: false, error: 'CONFIG sheet not found. Run setup first.' };
    var data = s.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === 'webAppUrl') {
        s.getRange(i + 1, 2).setValue(url);
        return { ok: true };
      }
    }
    s.appendRow(['webAppUrl', url, 'Web App deployment URL']);
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
}

function wizard_skipWebAppUrl() {
  return { ok: true };
}

// ============ HTML ============
function buildSetupWizardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Setup Wizard</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --blue:  #1a56db; --green: #059669; --red: #dc2626;
  --bg:    #f0f4f8; --card: #ffffff; --border: #e2e8f0;
  --text:  #1e293b; --muted: #64748b;
  --font:  'Plus Jakarta Sans', sans-serif;
}
body {
  font-family: var(--font); background: var(--bg); color: var(--text);
  font-size: 13px; line-height: 1.5;
  height: 100vh; overflow: hidden;
  display: flex; flex-direction: column;
}
.wiz-header {
  background: linear-gradient(130deg, #0b1437 0%, #1a56db 100%);
  color: white; padding: 20px 24px 18px; flex-shrink: 0;
}
.wiz-title { font-size: 18px; font-weight: 800; }
.wiz-sub   { font-size: 11px; opacity: .75; margin-top: 2px; }
.progress-outer { background: rgba(255,255,255,.2); height: 5px; border-radius: 99px; margin-top: 14px; overflow: hidden; }
.progress-inner { height: 100%; background: #4ade80; border-radius: 99px; transition: width .4s ease; width: 0%; }

.wiz-body { flex: 1; overflow-y: auto; padding: 20px 22px; }
.phase { display: none; }
.phase.active { display: block; }

.steps-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.step-item {
  display: flex; align-items: center; gap: 14px;
  background: white; border: 1.5px solid var(--border);
  border-radius: 12px; padding: 12px 16px; transition: all .2s;
}
.step-item.running { border-color: var(--blue); background: #f0f5ff; }
.step-item.done    { border-color: var(--green); background: #f0fdf4; }
.step-item.error   { border-color: var(--red);   background: #fff1f1; }
.step-icon {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0;
  background: var(--bg); border: 2px solid var(--border); transition: all .2s;
}
.step-item.running .step-icon { background: #dbeafe; border-color: var(--blue); animation: pulse 1s infinite; }
.step-item.done    .step-icon { background: #dcfce7; border-color: var(--green); }
.step-item.error   .step-icon { background: #fee2e2; border-color: var(--red); }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
.step-info { flex: 1; }
.step-name { font-size: 13px; font-weight: 700; }
.step-desc { font-size: 11px; color: var(--muted); margin-top: 1px; }
.step-status { font-size: 11px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.step-item.running .step-status { color: var(--blue); }
.step-item.done    .step-status { color: var(--green); }
.step-item.error   .step-status { color: var(--red); }

.url-card { background: white; border: 1.5px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 14px; }
.url-card h3 { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.url-card p  { font-size: 12px; color: var(--muted); line-height: 1.6; }
.steps-guide { background: #f8faff; border: 1px solid #dbeafe; border-radius: 10px; padding: 14px; margin: 12px 0; }
.steps-guide ol { padding-left: 18px; }
.steps-guide li { font-size: 12px; color: #1e40af; margin-bottom: 5px; line-height: 1.5; }
.steps-guide li strong { color: #1e3a8a; }
.url-input {
  width: 100%; padding: 11px 14px; border: 2px solid var(--border); border-radius: 10px;
  font: 13px var(--font); margin-top: 12px; transition: border .15s;
}
.url-input:focus { border-color: var(--blue); outline: none; }
.url-error { color: var(--red); font-size: 11px; margin-top: 6px; display: none; }

.success-box { text-align: center; padding: 20px 10px; }
.success-icon  { font-size: 56px; margin-bottom: 12px; }
.success-title { font-size: 20px; font-weight: 800; color: var(--green); margin-bottom: 8px; }
.success-sub   { font-size: 13px; color: var(--muted); margin-bottom: 18px; line-height: 1.7; }
.created-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px; }
.chip { background: #dbeafe; color: #1d4ed8; border-radius: 20px; padding: 4px 13px; font-size: 11px; font-weight: 700; }
.chip.hid { background: #fef9c3; color: #92400e; }
.next-steps { text-align: left; }
.next-steps h4 { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.ns { display: flex; gap: 12px; align-items: flex-start; padding: 10px 14px; background: white; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; }
.ns-num { width: 24px; height: 24px; border-radius: 50%; background: var(--blue); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.ns-text { font-size: 12px; line-height: 1.5; }
.ns-text strong { display: block; font-weight: 700; }
.ns-text span   { color: var(--muted); }

.wiz-footer { flex-shrink: 0; background: white; border-top: 1px solid var(--border); padding: 14px 22px; display: flex; gap: 10px; justify-content: flex-end; }
.btn { padding: 10px 22px; border-radius: 10px; font: 700 13px var(--font); border: none; cursor: pointer; transition: all .15s; }
.btn-primary   { background: var(--blue);  color: white; }
.btn-primary:hover   { background: #1348b8; }
.btn-primary:disabled { background: #a0aec0; cursor: not-allowed; }
.btn-secondary { background: var(--bg); color: var(--muted); border: 1.5px solid var(--border); }
.btn-secondary:hover { border-color: var(--blue); color: var(--blue); }

.warn-box { margin-top:14px; padding:12px 14px; background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; font-size:11.5px; color:#92400e; line-height:1.6; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-thumb { background: #c1c9d4; border-radius: 3px; }
</style>
</head>
<body>

<div class="wiz-header">
  <div class="wiz-title">🚀 ITI Quiz System — Setup Wizard</div>
  <div class="wiz-sub">Creates all required sheets in your spreadsheet automatically</div>
  <div class="progress-outer"><div class="progress-inner" id="progressBar"></div></div>
</div>

<div class="wiz-body">

  <!-- PHASE 1: CONFIRM -->
  <div class="phase active" id="phase-confirm">
    <div style="font-size:15px;font-weight:800;margin-bottom:6px;">Welcome! Let's get started.</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:14px;">
      This wizard will create all necessary sheets so the ITI Quiz System works out of the box.<br>
      <strong style="color:var(--text);">Sheets that will be created:</strong>
    </div>
    <div class="steps-list" id="confirmList">
      <div class="step-item" id="si-config">
        <div class="step-icon">⚙️</div>
        <div class="step-info"><div class="step-name">CONFIG</div><div class="step-desc">Institute name, passing marks, Web App URL</div></div>
        <div class="step-status" id="ss-config">Pending</div>
      </div>
      <div class="step-item" id="si-results">
        <div class="step-icon">📊</div>
        <div class="step-info"><div class="step-name">RESULTS</div><div class="step-desc">All student test submissions &amp; scores</div></div>
        <div class="step-status" id="ss-results">Pending</div>
      </div>
      <div class="step-item" id="si-tests">
        <div class="step-icon">📝</div>
        <div class="step-info"><div class="step-name">ACTIVE TESTS</div><div class="step-desc">All tests created by teachers</div></div>
        <div class="step-status" id="ss-tests">Pending</div>
      </div>
      <div class="step-item" id="si-log">
        <div class="step-icon">📋</div>
        <div class="step-info"><div class="step-name">QUIZ LOG</div><div class="step-desc">History of all test creation events</div></div>
        <div class="step-status" id="ss-log">Pending</div>
      </div>
      <div class="step-item" id="si-testdata">
        <div class="step-icon">🗄️</div>
        <div class="step-info"><div class="step-name">TEST_DATA (hidden)</div><div class="step-desc">Stores question JSON per test — hidden sheet</div></div>
        <div class="step-status" id="ss-testdata">Pending</div>
      </div>
      <div class="step-item" id="si-sample">
        <div class="step-icon">📚</div>
        <div class="step-info"><div class="step-name">Trade Theory</div><div class="step-desc">Sample subject sheet with 3 example MCQs</div></div>
        <div class="step-status" id="ss-sample">Pending</div>
      </div>
    </div>
    <div class="warn-box">
      ⚠️ <strong>Note:</strong> Existing system sheets with the same names will be <strong>cleared and reset</strong>. Your custom question sheets (e.g. WCS, Employability Skills) are <strong>never touched</strong>.
    </div>
  </div>

  <!-- PHASE 2: RUNNING -->
  <div class="phase" id="phase-running">
    <div style="font-size:14px;font-weight:700;margin-bottom:14px;">⚙️ Setting up your sheets...</div>
    <div class="steps-list" id="runningList"></div>
  </div>

  <!-- PHASE 3: WEB APP URL -->
  <div class="phase" id="phase-url">
    <div class="url-card">
      <h3>🔗 One last step — Enter your Web App URL</h3>
      <p>For students to open test links, deploy this Apps Script as a Web App and paste the URL here. This is a one-time step.</p>
      <div class="steps-guide">
        <ol>
          <li>Open <strong>Extensions → Apps Script</strong></li>
          <li>Click <strong>Deploy → New Deployment</strong></li>
          <li>Select type: <strong>Web App</strong></li>
          <li>Execute as: <strong>Me</strong> &nbsp;|&nbsp; Who has access: <strong>Anyone</strong></li>
          <li>Click <strong>Deploy</strong> → copy the URL shown</li>
          <li>Paste it below ↓</li>
        </ol>
      </div>
      <input type="text" class="url-input" id="webAppUrlInput"
        placeholder="https://script.google.com/macros/s/AKfyc.../exec" />
      <div class="url-error" id="urlError"></div>
    </div>
    <div style="font-size:11px;color:var(--muted);text-align:center;line-height:1.7;">
      You can skip and set this later from:<br>
      <strong>Magic Quiz Generator → ⚙️ Set Web App URL</strong>
    </div>
  </div>

  <!-- PHASE 4: SUCCESS -->
  <div class="phase" id="phase-success">
    <div class="success-box">
      <div class="success-icon">🎉</div>
      <div class="success-title">All Set!</div>
      <div class="success-sub">Your ITI Quiz System is ready.<br>Here's what was created:</div>
      <div class="created-chips">
        <span class="chip">⚙️ CONFIG</span>
        <span class="chip">📊 RESULTS</span>
        <span class="chip">📝 ACTIVE TESTS</span>
        <span class="chip">📋 QUIZ LOG</span>
        <span class="chip hid">🗄️ TEST_DATA (hidden)</span>
        <span class="chip">📚 Trade Theory</span>
      </div>
      <div class="next-steps">
        <h4>What to do next</h4>
        <div class="ns"><div class="ns-num">1</div><div class="ns-text"><strong>Edit CONFIG sheet</strong><span>Update institute name, city &amp; passing marks.</span></div></div>
        <div class="ns"><div class="ns-num">2</div><div class="ns-text"><strong>Add your questions</strong><span>Fill in "Trade Theory" or add new subject sheets in the same column format.</span></div></div>
        <div class="ns"><div class="ns-num">3</div><div class="ns-text"><strong>Create your first test</strong><span>Magic Quiz Generator → 🎓 Open Quiz Maker</span></div></div>
        <div class="ns"><div class="ns-num">4</div><div class="ns-text"><strong>Share with students</strong><span>Copy the Student URL from ACTIVE TESTS and send via WhatsApp.</span></div></div>
      </div>
    </div>
  </div>

</div><!-- /wiz-body -->

<div class="wiz-footer">
  <button class="btn btn-secondary" id="btnSkip" onclick="skipUrl()" style="display:none;">Skip for now</button>
  <button class="btn btn-primary"   id="btnMain" onclick="handleMain()">🚀 Start Setup</button>
</div>

<script>
var phase = 'confirm';

var STEPS = [
  { id:'config',   fn:'wizard_setupConfig',      icon:'⚙️'  },
  { id:'results',  fn:'wizard_setupResults',     icon:'📊'  },
  { id:'tests',    fn:'wizard_setupActiveTests', icon:'📝'  },
  { id:'log',      fn:'wizard_setupQuizLog',     icon:'📋'  },
  { id:'testdata', fn:'wizard_setupTestData',    icon:'🗄️' },
  { id:'sample',   fn:'wizard_setupSampleSheet', icon:'📚'  },
];

function handleMain() {
  if      (phase === 'confirm') startSetup();
  else if (phase === 'url')     saveUrlAndFinish();
  else if (phase === 'success') google.script.host.close();
}

function skipUrl() {
  google.script.run
    .withSuccessHandler(goSuccess)
    .withFailureHandler(goSuccess)
    .wizard_skipWebAppUrl();
}

function startSetup() {
  phase = 'running';
  setProgress(5);
  showPhase('running');
  setBtn('⏳ Setting up...', true);
  document.getElementById('btnSkip').style.display = 'none';

  // Clone the confirm list into running list
  document.getElementById('runningList').innerHTML =
    document.getElementById('confirmList').innerHTML;

  runSteps(0);
}

function runSteps(idx) {
  if (idx >= STEPS.length) {
    setProgress(80);
    setTimeout(goUrlPhase, 400);
    return;
  }
  var step = STEPS[idx];
  setStepState(step.id, 'running', '⏳ Setting up...');
  setProgress(5 + Math.round((idx / STEPS.length) * 72));

  google.script.run
    .withSuccessHandler(function(result) {
      setStepState(step.id, result && result.ok ? 'done' : 'error',
        result && result.ok ? '✓ Done' : ('✗ ' + (result ? result.error : 'Failed')));
      runSteps(idx + 1);
    })
    .withFailureHandler(function(err) {
      setStepState(step.id, 'error', '✗ ' + err.message);
      runSteps(idx + 1);
    })
    [step.fn]();
}

function setStepState(id, state, statusText) {
  var item   = document.getElementById('si-' + id);
  var status = document.getElementById('ss-' + id);
  if (!item || !status) return;
  item.className   = 'step-item ' + state;
  status.textContent = statusText;
  var emojiMap = { running:'⏳', done:'✅', error:'❌' };
  item.querySelector('.step-icon').textContent = emojiMap[state] || '•';
}

function goUrlPhase() {
  phase = 'url';
  setProgress(85);
  showPhase('url');
  setBtn('💾 Save URL & Finish', false);
  document.getElementById('btnSkip').style.display = 'block';
}

function saveUrlAndFinish() {
  var url   = document.getElementById('webAppUrlInput').value.trim();
  var errEl = document.getElementById('urlError');
  errEl.style.display = 'none';

  if (!url) {
    errEl.textContent = 'Please paste your Web App URL, or click "Skip for now".';
    errEl.style.display = 'block'; return;
  }
  if (!url.startsWith('https://script.google.com')) {
    errEl.textContent = 'Invalid URL. Must start with https://script.google.com/macros/s/...';
    errEl.style.display = 'block'; return;
  }
  setBtn('💾 Saving...', true);
  document.getElementById('btnSkip').style.display = 'none';

  google.script.run
    .withSuccessHandler(function(result) {
      if (result && result.ok) { goSuccess(); }
      else {
        setBtn('💾 Save URL & Finish', false);
        document.getElementById('btnSkip').style.display = 'block';
        errEl.textContent = result ? result.error : 'Failed to save URL.';
        errEl.style.display = 'block';
      }
    })
    .withFailureHandler(function(err) {
      setBtn('💾 Save URL & Finish', false);
      document.getElementById('btnSkip').style.display = 'block';
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    })
    .wizard_saveWebAppUrl(url);
}

function goSuccess() {
  phase = 'success';
  setProgress(100);
  showPhase('success');
  setBtn('✅ Close Wizard', false);
  document.getElementById('btnSkip').style.display = 'none';
}

function showPhase(name) {
  document.querySelectorAll('.phase').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('phase-' + name).classList.add('active');
}
function setProgress(pct) { document.getElementById('progressBar').style.width = pct + '%'; }
function setBtn(label, disabled) {
  var btn = document.getElementById('btnMain');
  btn.textContent = label; btn.disabled = disabled;
}
</script>
</body>
</html>`;
}