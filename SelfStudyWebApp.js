// ============================================
// PREMIUM SELF STUDY GS - SINGLE FILE
// AI MCQ Generator (Gemini → OpenRouter → Groq)
// ============================================

const SELF_HISTORY_SHEET = 'SELF_STUDY_HISTORY';

// ================== WEB APP ENTRY POINT ==================
function doGet(e) {
  if (e && e.parameter.page === 'selfstudy') {
    return HtmlService.createHtmlOutput(getPremiumHtml())
      .setTitle('🧠 AI Self Study Pro')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  // Default redirect
  return HtmlService.createHtmlOutput('<script>window.location.href = "?page=selfstudy";</script>');
}

// ================== PREMIUM HTML & CSS ==================
function getPremiumHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<base target="_top">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Self Study MCQ Generator</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  :root {
    --bg-dark: #0f172a;
    --bg-card: rgba(30, 41, 59, 0.7);
    --primary: #38bdf8;
    --primary-hover: #0ea5e9;
    --text-main: #f1f5f9;
    --text-muted: #94a3b8;
    --border: rgba(255, 255, 255, 0.1);
    --success: #22c55e;
    --error: #ef4444;
    --glass: blur(20px);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
  
  body {
    background: radial-gradient(circle at top left, #1e293b, #0f172a);
    color: var(--text-main);
    min-height: 100vh;
    padding: 20px;
    display: flex;
    justify-content: center;
  }

  .app-container { width: 100%; max-width: 650px; }

  /* HEADER */
  .header { text-align: center; margin-bottom: 32px; animation: fadeIn 0.8s ease; }
  .header h1 { 
    font-size: 32px; font-weight: 800; 
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .header p { color: var(--text-muted); margin-top: 8px; font-size: 15px; font-weight: 500; }

  /* TABS */
  .tabs {
    display: flex; background: rgba(15, 23, 42, 0.6);
    padding: 5px; border-radius: 16px; border: 1px solid var(--border);
    margin-bottom: 24px; backdrop-filter: blur(10px);
  }
  .tab-btn {
    flex: 1; padding: 12px; border: none; background: transparent;
    color: var(--text-muted); font-weight: 600; font-size: 14px;
    border-radius: 12px; cursor: pointer; transition: all 0.3s ease;
  }
  .tab-btn.active {
    background: var(--primary); color: #0f172a;
    box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
  }

  /* CARDS */
  .card {
    background: var(--bg-card); backdrop-filter: var(--glass);
    border: 1px solid var(--border); border-radius: 24px;
    padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.5s ease;
  }

  /* FORMS */
  .form-group { margin-bottom: 20px; }
  label { display: block; font-size: 13px; font-weight: 600; color: #cbd5e1; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  
  input, select, textarea {
    width: 100%; background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px 16px; color: white; font-size: 16px;
    transition: all 0.3s; outline: none;
  }
  textarea { min-height: 160px; resize: vertical; line-height: 1.5; }
  
  input:focus, select:focus, textarea:focus {
    border-color: var(--primary); box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1);
    background: rgba(0, 0, 0, 0.4);
  }

  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* BUTTONS */
  .btn-main {
    width: 100%; padding: 16px; background: linear-gradient(135deg, #38bdf8, #3b82f6);
    color: white; border: none; border-radius: 14px; font-size: 16px; font-weight: 700;
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .btn-main:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(56, 189, 248, 0.4); }
  .btn-main:active { transform: translateY(0); }

  /* HISTORY ITEMS */
  .history-list { display: flex; flex-direction: column; gap: 16px; }
  .history-card {
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: 16px; padding: 20px; transition: all 0.3s;
    position: relative; overflow: hidden;
  }
  .history-card:hover { background: rgba(255,255,255,0.06); transform: translateY(-2px); }
  .history-card::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
    background: linear-gradient(to bottom, #38bdf8, #818cf8);
  }
  .h-title { font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #f8fafc; padding-right: 20px;}
  .h-meta { font-size: 13px; color: var(--text-muted); display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
  .badge { 
    background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; 
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .btn-reattempt {
    width: 100%; padding: 12px; background: rgba(56, 189, 248, 0.1); color: var(--primary);
    border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px;
    font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .btn-reattempt:hover { background: rgba(56, 189, 248, 0.2); }

  /* UTILS */
  .hidden { display: none !important; }
  .fade-in { animation: fadeIn 0.4s ease; }

  /* TOAST */
  #toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
  .toast {
    background: #1e293b; border: 1px solid var(--border); color: white;
    padding: 16px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    display: flex; align-items: center; gap: 12px; min-width: 300px;
    animation: slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-size: 14px; font-weight: 500;
  }
  .toast.success { border-left: 4px solid var(--success); }
  .toast.error { border-left: 4px solid var(--error); }

  /* LOADER OVERLAY */
  .loader-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  .loader-overlay.active { opacity: 1; pointer-events: all; }
  
  .spinner {
    width: 50px; height: 50px; border: 4px solid rgba(56, 189, 248, 0.2);
    border-top-color: var(--primary); border-radius: 50%;
    animation: spin 1s linear infinite; margin-bottom: 20px;
  }
  .loader-text { font-size: 18px; font-weight: 600; color: var(--primary); }
  .loader-sub { font-size: 14px; color: var(--text-muted); margin-top: 8px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* Mobile tweaks */
  @media(max-width: 480px) {
    .row { grid-template-columns: 1fr; }
    .card { padding: 20px; }
    .header h1 { font-size: 24px; }
  }
</style>
</head>
<body>

<div class="app-container">
  <div class="header">
    <h1>AI Self Study Pro</h1>
    <p>Generate MCQs from any text using Gemini & Groq AI</p>
  </div>

  <div class="tabs">
    <button class="tab-btn active" id="tabCreate" onclick="switchTab('create')">New Test</button>
    <button class="tab-btn" id="tabHistory" onclick="switchTab('history')">My Library</button>
  </div>

  <!-- CREATE TAB -->
  <div id="createTab" class="fade-in">
    <div class="card">
      <div class="form-group">
        <label>Student Name</label>
        <input type="text" id="studentName" placeholder="E.g. Rahul Sharma">
      </div>

      <div class="form-group">
        <label>Mobile Number (Required for History)</label>
        <input type="tel" id="mobile" placeholder="9000123456">
      </div>

      <div class="form-group">
        <label>Study Material / Syllabus Text</label>
        <textarea id="studyText" placeholder="Paste your chapter notes, article, or syllabus here... (Minimum 50 characters)"></textarea>
      </div>

      <div class="row">
        <div class="form-group">
          <label>Questions</label>
          <select id="numQ">
            <option value="5">5 Questions</option>
            <option value="10" selected>10 Questions</option>
            <option value="15">15 Questions</option>
            <option value="20">20 Questions</option>
          </select>
        </div>
        <div class="form-group">
          <label>Difficulty</label>
          <select id="difficulty">
            <option value="easy">Easy</option>
            <option value="medium" selected>Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Bilingual Support (Optional)</label>
        <select id="bilingual">
          <option value="">English Only</option>
          <option value="Hindi">Hindi</option>
          <option value="Marathi">Marathi</option>
          <option value="Gujarati">Gujarati</option>
          <option value="Tamil">Tamil</option>
        </select>
      </div>

      <button class="btn-main" onclick="generateTest()">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Generate MCQ Test
      </button>
    </div>
  </div>

  <!-- HISTORY TAB -->
  <div id="historyTab" class="hidden fade-in">
    <div id="historyList" class="history-list"></div>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div id="toast-container"></div>

<!-- LOADER -->
<div class="loader-overlay" id="loader">
  <div class="spinner"></div>
  <div class="loader-text">AI is creating your test...</div>
  <div class="loader-sub" id="loaderSub">Connecting to Gemini/Groq</div>
</div>

<script>
let currentBaseUrl = window.location.href.split('?')[0];

// --- UI FUNCTIONS ---

function switchTab(tab) {
  document.getElementById('createTab').classList.toggle('hidden', tab !== 'create');
  document.getElementById('historyTab').classList.toggle('hidden', tab !== 'history');
  
  document.getElementById('tabCreate').classList.toggle('active', tab === 'create');
  document.getElementById('tabHistory').classList.toggle('active', tab === 'history');

  if (tab === 'history') loadHistory();
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = \`toast \${type}\`;
  
  const icon = type === 'success' ? '✓' : '✕';
  toast.innerHTML = \`<span style="font-weight:700; font-size:18px;">\${icon}</span> <span>\${message}</span>\`;
  
  container.appendChild(toast);
  
  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function toggleLoader(show, subText = "") {
  const loader = document.getElementById('loader');
  const sub = document.getElementById('loaderSub');
  if (show) {
    if(subText) sub.innerText = subText;
    loader.classList.add('active');
  } else {
    loader.classList.remove('active');
  }
}

// --- CORE LOGIC ---

function generateTest() {
  const name = document.getElementById('studentName').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const text = document.getElementById('studyText').value.trim();

  if (!name || !mobile || !text) {
    showToast("Please fill in Name, Mobile, and Text", "error");
    return;
  }
  if (text.length < 50) {
    showToast("Text is too short. Add more details.", "error");
    return;
  }

  toggleLoader(true, "Analyzing text & generating questions...");

  google.script.run
    .withSuccessHandler(function(res) {
      toggleLoader(false);
      if (res.success) {
        showToast("Test Generated Successfully!", "success");
        setTimeout(() => {
          // Use the server returned URL, fallback to current window logic
          const url = res.studentUrl || (currentBaseUrl + "?testId=" + res.testId);
          window.open(url, '_blank');
        }, 1000);
      } else {
        showToast(res.message || "Generation failed", "error");
      }
    })
    .withFailureHandler(function(err) {
      toggleLoader(false);
      showToast("Server Error: " + err.message, "error");
    })
    .createSelfStudyTest({
      studentName: name,
      mobile: mobile,
      text: text,
      numQuestions: document.getElementById('numQ').value,
      difficulty: document.getElementById('difficulty').value,
      bilingualLang: document.getElementById('bilingual').value
    });
}

function loadHistory() {
  const mobile = document.getElementById('mobile').value.trim();
  const listEl = document.getElementById('historyList');
  
  if (!mobile) {
    listEl.innerHTML = \`<div style="text-align:center; padding:40px; color:var(--text-muted);">
      Please enter your mobile number in the "New Test" tab to view your history.
    </div>\`;
    return;
  }

  toggleLoader(true, "Fetching your library...");
  
  google.script.run
    .withSuccessHandler(function(data) {
      toggleLoader(false);
      if (data.length === 0) {
        listEl.innerHTML = \`<div style="text-align:center; padding:40px; color:var(--text-muted);">
          No tests found. Create your first one!
        </div>\`;
        return;
      }

      let html = '';
      data.forEach(item => {
        const dateStr = new Date(item.generatedAt).toLocaleDateString();
        html += \`
          <div class="history-card">
            <div class="h-title">\${item.title}</div>
            <div class="h-meta">
              <span class="badge">\${item.questions} Qs</span>
              <span class="badge">\${item.difficulty}</span>
              <span class="badge">\${dateStr}</span>
            </div>
            <button onclick="reattempt('\${item.testId}')" class="btn-reattempt">
              Re-attempt Test →
            </button>
          </div>
        \`;
      });
      listEl.innerHTML = html;
    })
    .withFailureHandler(function(err) {
      toggleLoader(false);
      showToast("Failed to load history", "error");
    })
    .getSelfStudyHistory(mobile);
}

function reattempt(testId) {
  // Construct URL relative to current deployment
  const url = currentBaseUrl + "?testId=" + testId;
  window.open(url, "_blank");
}

// Initialize
switchTab('create');

</script>
</body>
</html>`;
}

// ================== BACKEND LOGIC ==================

/**
 * Generates MCQs using a fallback chain: Gemini -> OpenRouter -> Groq
 * Includes robust JSON cleaning.
 */
function generateMCQsFromText(text, numQuestions, difficulty, bilingualLang) {
  if (!text || text.length < 50) throw new Error('Text too short.');

  numQuestions = parseInt(numQuestions) || 10;
  
  // Construct strict prompt
  const prompt = `You are an expert exam creator. Create exactly ${numQuestions} Multiple Choice Questions based on the text below.
Text: """${text}"""
Rules:
1. Difficulty: ${difficulty}.
2. Format: STRICTLY a JSON array of objects. No markdown, no conversational text.
3. Each object must have: question, optA, optB, optC, optD, answer (A/B/C/D), explanation, difficulty, points (1), negativeMarks (0.25).
${bilingualLang ? `4. Bilingual: Add fields questionTr, optATr, optBTr, optCTr, optDTr for ${bilingualLang}.` : ''}
Example: [{"question":"...", "optA":"...", "optB":"...", "optC":"...", "optD":"...", "answer":"A", "explanation":"...", "difficulty":"medium", "points":1, "negativeMarks":0.25 ${bilingualLang ? ', "questionTr":"..."...' : ''}}]`;

  let content = '';
  const keys = getAIKeys();
  let providerUsed = '';

  // 1. Try Gemini
  if (keys.gemini) {
    try { 
      content = callGemini(prompt); 
      providerUsed = 'Gemini';
    } catch(e) { console.warn('Gemini failed: ' + e.message); }
  }
  
  // 2. Try OpenRouter
  if (!content && keys.openrouter) {
    try { 
      content = callOpenRouter(prompt); 
      providerUsed = 'OpenRouter';
    } catch(e) { console.warn('OpenRouter failed: ' + e.message); }
  }
  
  // 3. Try Groq
  if (!content && keys.groq) {
    try { 
      content = callGroq(prompt); 
      providerUsed = 'Groq';
    } catch(e) { console.warn('Groq failed: ' + e.message); }
  }

  if (!content) throw new Error('All AI providers failed. Check API Keys in CONFIG sheet.');

  // ROBUST JSON CLEANING
  try {
    // Remove markdown code blocks
    content = content.replace(/```json/g, '').replace(/```/g, '');
    
    // Find first [ and last ]
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      content = content.substring(firstBracket, lastBracket + 1);
    }
    
    let questions = JSON.parse(content);

    // Sanitize and add defaults
    questions = questions.map(q => ({
      questionImage: '', optAImage: '', optBImage: '', optCImage: '', optDImage: '',
      explanationImage: '',
      chapter: 'Self Study',
      points: 1, negativeMarks: 0.25,
      ...q, // Ensure AI fields override defaults
      // Ensure bilingual fields exist even if empty
      questionTr: q.questionTr || '', optATr: q.optATr || '', optBTr: q.optBTr || '', 
      optCTr: q.optCTr || '', optDTr: q.optDTr || ''
    }));

    return questions;
  } catch (e) {
    console.error('JSON Parse Error: ' + e.message);
    console.error('Content was: ' + content.substring(0, 200));
    throw new Error('AI returned invalid data. Please try again.');
  }
}

function getAIKeys() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('CONFIG');
  if (!configSheet) return { gemini: '', openrouter: '', groq: '' };
  const data = configSheet.getDataRange().getValues();
  let keys = { gemini: '', openrouter: '', groq: '' };
  data.forEach(row => {
    const k = (row[0] || '').toString().trim().toLowerCase();
    const v = (row[1] || '').toString().trim();
    if (k === 'geminiapikey') keys.gemini = v;
    if (k === 'openrouterapikey') keys.openrouter = v;
    if (k === 'groqapikey') keys.groq = v;
  });
  return keys;
}

// --- API CALLS ---

function callGemini(prompt) {
  const keys = getAIKeys();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keys.gemini}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, responseMimeType: "application/json" } };
  
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  
  if (res.getResponseCode() !== 200) throw new Error('Gemini Error: ' + JSON.stringify(json));
  return json.candidates[0].content.parts[0].text;
}

function callOpenRouter(prompt) {
  const keys = getAIKeys();
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const payload = { model: 'google/gemini-flash-1.5', messages: [{ role: 'user', content: prompt }], temperature: 0.7 };
  
  const res = UrlFetchApp.fetch(url, { 
    method: 'post', contentType: 'application/json', 
    headers: { 'Authorization': `Bearer ${keys.openrouter}` }, 
    payload: JSON.stringify(payload), muteHttpExceptions: true 
  });
  const json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error('OpenRouter Error: ' + JSON.stringify(json));
  return json.choices[0].message.content;
}

function callGroq(prompt) {
  const keys = getAIKeys();
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, response_format: { type: "json_object" } };
  
  const res = UrlFetchApp.fetch(url, { 
    method: 'post', contentType: 'application/json', 
    headers: { 'Authorization': `Bearer ${keys.groq}` }, 
    payload: JSON.stringify(payload), muteHttpExceptions: true 
  });
  const json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error('Groq Error: ' + JSON.stringify(json));
  
  // Groq with json_object wraps the array in an object usually (e.g., { "questions": [...] })
  // We try to parse it, if it's an object, look for an array key.
  const content = json.choices[0].message.content;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
    if (parsed.questions && Array.isArray(parsed.questions)) return JSON.stringify(parsed.questions);
    if (parsed.mcqs && Array.isArray(parsed.mcqs)) return JSON.stringify(parsed.mcqs);
    return content; // Fallback
  } catch(e) { return content; }
}

// --- DATA HANDLERS ---

function createSelfStudyTest(params) {
  try {
    const questions = generateMCQsFromText(params.text, params.numQuestions, params.difficulty, params.bilingualLang);
    const testId = 'SELF_' + Utilities.getUuid();

    const testData = {
      testId: testId,
      title: 'Self-Study: ' + params.text.substring(0, 40).replace(/\n/g, ' ') + '...',
      teacher: 'AI Self Study',
      tradeClass: 'General',
      instituteName: 'Self Study',
      duration: 30, // Default 30 mins
      passingMarks: 40,
      shuffle: true,
      shuffleOpts: true,
      instructions: ["AI Generated Test.", "Read questions carefully."],
      questions: questions,
      createdAt: new Date().toISOString(),
      status: 'active',
      isSelfStudy: true,
      mobile: params.mobile,
      studentName: params.studentName
    };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Save to TEST_DATA
    let dataSheet = ss.getSheetByName('TEST_DATA');
    if (!dataSheet) dataSheet = ss.insertSheet('TEST_DATA');
    dataSheet.appendRow([testId, JSON.stringify(testData), new Date().toISOString()]);

    // Save to History
    let histSheet = ss.getSheetByName(SELF_HISTORY_SHEET);
    if (!histSheet) {
      histSheet = ss.insertSheet(SELF_HISTORY_SHEET);
      histSheet.appendRow(['Mobile', 'Test ID', 'Title', 'Generated At', 'Questions', 'TextSnippet', 'Difficulty', 'BilingualLang', 'StudentName']);
    }
    histSheet.appendRow([
      params.mobile, testId, testData.title, new Date().toISOString(), 
      questions.length, params.text.substring(0, 100).replace(/\n/g, ' '), 
      params.difficulty, params.bilingualLang || 'English', params.studentName
    ]);

    const webAppUrl = ScriptApp.getService().getUrl();
    const studentUrl = webAppUrl.replace(/\/$/, '') + '?testId=' + testId;

    return { success: true, studentUrl: studentUrl, testId: testId };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getSelfStudyHistory(mobile) {
  if (!mobile) return [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SELF_HISTORY_SHEET);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const history = [];
  // Start from 1 to skip header
  for (let i = 1; i < data.length; i++) {
    // Match mobile exactly (assuming column 0)
    if (data[i][0] && data[i][0].toString() === mobile) {
      history.push({
        testId: data[i][1],
        title: data[i][2],
        generatedAt: data[i][3],
        questions: data[i][4],
        difficulty: data[i][6],
        bilingual: data[i][7]
      });
    }
  }
  // Sort by newest first (approx based on row order or parse date)
  return history.reverse();
}

// --- SETUP ---

function setupSelfStudyWebApp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('CONFIG')) {
    const sh = ss.insertSheet('CONFIG');
    sh.appendRow(['Key Name', 'Value', 'Notes']);
    sh.appendRow(['geminiApiKey', '', 'Get from Google AI Studio']);
    sh.appendRow(['openrouterApiKey', '', 'Get from OpenRouter.ai']);
    sh.appendRow(['groqApiKey', '', 'Get from console.groq.com']);
  }
  SpreadsheetApp.getUi().alert('Setup Complete!\n\n1. Add API Keys in CONFIG sheet.\n2. Deploy as Web App.\n3. Access via ?page=selfstudy');
}