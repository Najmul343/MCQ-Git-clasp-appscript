// ============================================================
// geminiPDF.gs — PDF → Drive OCR → Editable Preview → Gemini → MCQs
// v3 | Key Rotation + Model Fallback (4 keys × 5 models = 20 combos)
// ============================================================
// SETUP:
//   1. Enable Drive API: Apps Script editor → Services → Drive API → Add
//   2. Add ALL your Gemini API keys in MCQ Importer (Section 1) — multiple keys supported
//   3. Run openGeminiPdfSidebar() from editor or add to menu
// ============================================================

var PDF_RESULT_SHEET  = 'PDF_MCQ_TEST';
var PDF_TEMP_FOLDER   = 'MCQ_PDF_TEMP';
var PDF_MAX_TOKENS    = 8192;

// ── ENTRY POINT ──────────────────────────────────────────
function openGeminiPdfSidebar() {
  var html = HtmlService
    .createHtmlOutput(buildPdfSidebarHtml())
    .setTitle('📄 PDF → MCQ Importer')
    .setWidth(500);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ── STEP 1: PDF → Drive OCR → extracted text ─────────────
function extractTextOnly(base64Data, fileName) {
  if (!base64Data || base64Data.length < 100) throw new Error('PDF data is empty.');

  var token = ScriptApp.getOAuthToken();
  var docName = 'MCQ_OCR_' + new Date().getTime();
  var metadata = JSON.stringify({
    name: docName,
    mimeType: 'application/vnd.google-apps.document'
  });

  var boundary = 'MCQBoundary1234567890abc';
  var body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    metadata + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data + '\r\n' +
    '--' + boundary + '--';

  var uploadResp = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocrLanguage=en',
    {
      method: 'POST',
      contentType: 'multipart/related; boundary=' + boundary,
      headers: { 'Authorization': 'Bearer ' + token },
      payload: body,
      muteHttpExceptions: true
    }
  );

  var uploadCode = uploadResp.getResponseCode();
  var uploadBody = uploadResp.getContentText();

  if (uploadCode !== 200) {
    throw new Error('Drive upload failed (HTTP ' + uploadCode + '): ' + uploadBody.substring(0, 300));
  }

  var fileId = JSON.parse(uploadBody).id;
  if (!fileId) throw new Error('Drive did not return file ID. Response: ' + uploadBody.substring(0, 200));

  Utilities.sleep(2000);

  var doc = DocumentApp.openById(fileId);
  var text = doc.getBody().getText();

  try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}

  if (!text || text.trim().length < 10) {
    throw new Error('OCR returned empty text. PDF may be too low quality or purely image-based.');
  }

  return { text: text.trim(), chars: text.trim().length };
}

// ── STEP 2: Text → Gemini → MCQs (Key Rotation + Model Fallback) ─────
function parseTextToMcqs(rawText, difficulty, pts, neg) {
  if (!rawText || rawText.trim().length < 10) throw new Error('Text is empty.');

  // ── Get ALL keys ─────────────────────────────────────
  var keys = getAllGeminiKeys();

  // ── Model list (tried in order for each key) ─────────
  var models = [
    {v:'v1beta', m:'gemini-2.5-flash'},
    {v:'v1beta', m:'gemini-2.5-flash-preview-05-20'},
    {v:'v1',     m:'gemini-2.5-flash'},
    {v:'v1beta', m:'gemini-2.0-flash'},
    {v:'v1',     m:'gemini-2.0-flash'}
  ];

  var systemPrompt = 'You are an expert MCQ parser for Indian ITI/vocational textbooks. Return ONLY a valid JSON array. No explanation, no markdown, no backticks. Raw JSON only.';

  var userPrompt =
    'Parse ALL MCQ questions from the text below.\n\n' +
    'The text may come from different PDF formats — handle ALL of these:\n' +
    '  FORMAT 1 — Numbered with options on new lines:\n' +
    '    1. Question text?\n    a) Option1  b) Option2  c) Option3  d) Option4  Ans: b\n' +
    '  FORMAT 2 — Options each on separate lines:\n' +
    '    1. Question?\n    (a) Option1\n    (b) Option2\n    (c) Option3\n    (d) Option4\n' +
    '  FORMAT 3 — Everything on one line:\n' +
    '    Q: Question? A)opt1 B)opt2 C)opt3 D)opt4 Answer:B\n' +
    '  FORMAT 4 — 2-column PDF (text from two columns may be interleaved):\n' +
    '    Reconstruct logically — match each question with its own 4 options\n' +
    '  FORMAT 5 — Options labeled 1.2.3.4 or i.ii.iii.iv:\n' +
    '    Treat as A B C D respectively\n\n' +
    'Return ONLY this JSON format:\n' +
    '[{"question":"EXACT question text word for word — do NOT paraphrase or shorten,DO not simplify,Never alter ","optA":"text","optB":"text","optC":"text","optD":"text","answer":"B","difficulty":"' + difficulty + '","points":' + pts + ',"negative":' + neg + ',"explanation":""}]\n\n' +
    'STRICT RULES:\n' +
    '- Copy question text EXACTLY as written — never reword, shorten, or paraphrase\n' +
    '- answer must be A B C or D (single uppercase letter only)\n' +
    '- If answer not found, choose right option from your knowledge\n' +
    '- Strip option labels — extract text only (no "a)" or "1." prefixes)\n' +
    '- If fewer than 4 options found, fill missing with ""\n' +
    '- Fix OCR noise: broken words, extra spaces, garbled characters\n' +
    '- Preserve technical terms, formulas, numbers, units EXACTLY\n' +
    '- Extract EVERY question — do not skip any\n' +
    '- explanation always ""\n\n' +
    'TEXT:\n' + rawText;

  var payload = JSON.stringify({
    contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: PDF_MAX_TOKENS }
  });

  var lastErr = '';

  // ── KEY × MODEL rotation ──────────────────────────────
  // 429 (rate limit) → skip all models for this key → next key
  // 404/400 (model unavailable) → next model (same key)
  // Total combos tried: keys.length × models.length (e.g. 4×5 = 20)
  for (var ki = 0; ki < keys.length; ki++) {
    var key = keys[ki];
    var keyRateLimited = false;

    for (var mi = 0; mi < models.length; mi++) {
      var gc  = models[mi];
      var url = 'https://generativelanguage.googleapis.com/' + gc.v + '/models/' + gc.m + ':generateContent';

      try {
        var resp = UrlFetchApp.fetch(url, {
          method: 'POST',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': key },
          payload: payload,
          muteHttpExceptions: true
        });

        var code = resp.getResponseCode();
        var body = resp.getContentText();

        if (code === 429) {
          // Rate limited — skip ALL models for this key, move to next key
          lastErr = 'Key ' + (ki + 1) + ' rate limited (429) — trying next key';
          keyRateLimited = true;
          break; // break inner loop (model loop), outer loop continues to next key
        }

        if (code === 404 || code === 400) {
          // Model not available — try next model with same key
          lastErr = 'Key ' + (ki + 1) + ' / ' + gc.m + ' → HTTP ' + code + ' (model unavailable)';
          continue;
        }

        if (code !== 200) {
          lastErr = 'Key ' + (ki + 1) + ' / ' + gc.m + ' → HTTP ' + code + ': ' + body.substring(0, 200);
          continue;
        }

        var parsed = JSON.parse(body);
        if (!parsed.candidates || !parsed.candidates[0]) {
          lastErr = 'Key ' + (ki + 1) + ' / ' + gc.m + ' → No candidates in response';
          continue;
        }

        var rawOut = parsed.candidates[0].content.parts[0].text.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();

        var questions = safeJsonParsePdf(rawOut);
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error('0 questions found in response.');
        }

        // Tag each question with which key+model succeeded (useful for debugging)
        questions.forEach(function(q) {
          q._provider = 'gemini';
          q._model    = gc.v + '/' + gc.m;
          q._keyIndex = ki + 1;
        });

        return {
          questions: questions,
          model:     gc.v + '/' + gc.m,
          keyUsed:   ki + 1,
          count:     questions.length
        };

      } catch(e) {
        lastErr = 'Key ' + (ki + 1) + ' / ' + gc.m + ' → ' + e.message;
        continue;
      }
    }

    // If this key was rate-limited, continue to next key immediately
    if (keyRateLimited) continue;
  }

  throw new Error(
    'All ' + keys.length + ' keys × ' + models.length + ' models failed.\n' +
    'Last error: ' + lastErr + '\n\n' +
    'Tips:\n' +
    '• Add more Gemini API keys in MCQ Importer → Section 1\n' +
    '• Wait a minute and try again (rate limit resets)\n' +
    '• Try with a smaller/shorter PDF'
  );
}

// ── STEP 3: Write to sheet ────────────────────────────────
function writeQuestionsToSheet(questions, sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = sheetName || PDF_RESULT_SHEET;
  var sheet = ss.getSheetByName(targetSheet);

  if (!sheet) {
    sheet = ss.insertSheet(targetSheet);
    sheet.appendRow(['Question Text','Question Image URL','Option A Text','Option A Image URL','Option B Text','Option B Image URL','Option C Text','Option C Image URL','Option D Text','Option D Image URL','Answer (A/B/C/D)','Difficulty','Points','Negative Marks','Explanation']);
    sheet.getRange(1,1,1,15).setBackground('#1a56db').setFontColor('white').setFontWeight('bold').setWrap(true);
    sheet.setFrozenRows(1);
  }

  var startRow = sheet.getLastRow() + 1;
  var existing = Math.max(0, startRow - 2);

  questions.forEach(function(q) {
    sheet.appendRow([
      q.question || '',
      '',
      q.optA || '',
      '',
      q.optB || '',
      '',
      q.optC || '',
      '',
      q.optD || '',
      '',
      (q.answer || 'A').toString().trim().toUpperCase(),
      q.difficulty || 'medium',
      parseFloat(q.points) || 1,
      parseFloat(q.negative) || 0,
      q.explanation || ''
    ]);
  });

  sheet.setColumnWidth(1, 320);
  [3,5,7,9].forEach(function(c) { sheet.setColumnWidth(c, 180); });
  sheet.setColumnWidth(11, 80);
  sheet.setColumnWidth(12, 90);
  if (questions.length > 0) sheet.getRange(startRow, 1, questions.length, 15).setBackground('#f0fdf4');
  ss.setActiveSheet(sheet);

  return { count: questions.length, sheet: targetSheet, startRow: startRow, existing: existing };
}

// ── Sheet list for dropdown ───────────────────────────────
function getPdfSheetList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var SYS = ['QUIZ LOG','ACTIVE TESTS','CONFIG','RESULTS','TEST_DATA'];
  return ss.getSheets()
    .map(function(s) { return { name: s.getName(), count: Math.max(0, s.getLastRow()-1) }; })
    .filter(function(s) { return SYS.indexOf(s.name) === -1; });
}

// ── Get ALL Gemini keys (for rotation) ───────────────────
function getAllGeminiKeys() {
  var raw = PropertiesService.getScriptProperties().getProperty('MCQ_GEM_KEYS');
  var keys = [];
  try { keys = raw ? JSON.parse(raw) : []; } catch(e) { keys = []; }
  keys = keys.filter(function(k) { return k && k.trim().length > 10; });
  if (keys.length === 0) {
    throw new Error('No Gemini keys found.\nGo to MCQ Importer → Section 1 → Add Gemini keys and Save.');
  }
  return keys;
}

// ── (kept for backward compatibility) ────────────────────
function getGeminiKeyForPdf() {
  return getAllGeminiKeys()[0];
}

// ── Save keys from sidebar ────────────────────────────────
// Handles: new keys (plain text) + unchanged keys (__MASKED_i__ placeholders)
function saveGeminiKeys(keysArray) {
  var raw = PropertiesService.getScriptProperties().getProperty('MCQ_GEM_KEYS');
  var existing = [];
  try { existing = raw ? JSON.parse(raw) : []; } catch(e) { existing = []; }

  var final = [];
  keysArray.forEach(function(k) {
    if (!k) return;
    if (typeof k === 'string' && k.indexOf('__MASKED_') === 0) {
      var origIdx = parseInt(k.replace('__MASKED_', ''), 10);
      if (!isNaN(origIdx) && existing[origIdx]) final.push(existing[origIdx]);
    } else if (typeof k === 'string' && k.trim().length > 10) {
      final.push(k.trim());
    }
  });

  PropertiesService.getScriptProperties().setProperty('MCQ_GEM_KEYS', JSON.stringify(final));
  return { saved: final.length };
}

// ── Load keys for sidebar display (masked) ───────────────
function loadGeminiKeys() {
  var raw = PropertiesService.getScriptProperties().getProperty('MCQ_GEM_KEYS');
  var keys = [];
  try { keys = raw ? JSON.parse(raw) : []; } catch(e) { keys = []; }
  // Return masked keys — show first 8 + last 4 chars only
  return keys.map(function(k) {
    if (!k || k.length < 12) return k;
    return k.substring(0, 8) + '••••••••••••' + k.slice(-4);
  });
}

// ── Safe JSON parser ──────────────────────────────────────
function safeJsonParsePdf(raw) {
  try { return JSON.parse(raw); } catch(e1) {}
  var m = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch(e2) {} }
  try {
    var cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, function(c) {
      if (c==='\n') return '\\n';
      if (c==='\r') return '\\r';
      if (c==='\t') return '\\t';
      return '';
    });
    var m2 = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    return JSON.parse(m2 ? m2[0] : cleaned);
  } catch(e3) {}
  throw new Error('JSON parse failed. Try editing the extracted text to clean it up, then parse again.');
}


// ── SIDEBAR HTML ─────────────────────────────────────────
function buildPdfSidebarHtml() {
  var html = [];
  html.push('<!DOCTYPE html>');
  html.push('<html><head>');
  html.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  html.push('<style>');
  html.push('@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap");');
  html.push('*{box-sizing:border-box;margin:0;padding:0}');
  html.push(':root{--ink:#1a1f2e;--muted:#64748b;--faint:#f1f5f9;--border:#e2e8f0;--accent:#6366f1;--green:#10b981;--radius:10px;--shadow:0 1px 3px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04)}');
  html.push('body{font-family:"DM Sans",sans-serif;font-size:13px;background:#f8fafc;color:var(--ink)}');
  html.push('.hdr{background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:white;padding:16px 18px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(79,70,229,.3)}');
  html.push('.hdr-title{font-size:15px;font-weight:700}');
  html.push('.hdr-sub{font-size:11px;opacity:.8;margin-top:3px}');
  html.push('.hdr-steps{display:flex;gap:5px;margin-top:10px}');
  html.push('.hs{flex:1;padding:5px 2px;border-radius:6px;text-align:center;font-size:10px;font-weight:600;background:rgba(255,255,255,.15);color:rgba(255,255,255,.65);transition:all .3s;white-space:nowrap}');
  html.push('.hs.active{background:rgba(255,255,255,.95);color:#4f46e5}');
  html.push('.hs.done{background:rgba(255,255,255,.3);color:white}');
  html.push('.card{background:white;margin:10px 8px;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;border:1px solid var(--border)}');
  html.push('.ch{padding:10px 14px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--faint)}');
  html.push('.sn{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:white;flex-shrink:0}');
  html.push('.ct{font-weight:700;font-size:11.5px;letter-spacing:.4px;text-transform:uppercase;color:var(--ink)}');
  html.push('.cb{padding:13px 14px}');
  html.push('label{font-size:10px;color:var(--muted);font-weight:700;display:block;margin-bottom:4px;margin-top:11px;text-transform:uppercase;letter-spacing:.5px}');
  html.push('label:first-child{margin-top:0}');
  html.push('input[type=text],input[type=number],select,textarea{width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:8px;font-size:12.5px;font-family:"DM Sans",sans-serif;transition:border .15s;background:white;color:var(--ink)}');
  html.push('input:focus,select:focus,textarea:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.1)}');
  html.push('textarea{resize:vertical;line-height:1.6;font-family:"JetBrains Mono",monospace;font-size:11.5px}');
  html.push('#dropzone{border:2px dashed #c7d2fe;border-radius:var(--radius);padding:24px 16px;text-align:center;cursor:pointer;background:linear-gradient(135deg,#f5f3ff,#eff6ff);transition:all .2s}');
  html.push('#dropzone.has-file{border-color:#10b981;border-style:solid;background:linear-gradient(135deg,#ecfdf5,#d1fae5)}');
  html.push('.dz-icon{font-size:30px;margin-bottom:7px}');
  html.push('.dz-txt{font-size:13px;font-weight:700;color:#4f46e5}');
  html.push('#dropzone.has-file .dz-txt{color:#059669}');
  html.push('.dz-sub{font-size:10.5px;color:var(--muted);margin-top:3px}');
  html.push('.btn{width:100%;padding:11px 16px;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:10px;font-family:"DM Sans",sans-serif}');
  html.push('.btn-ocr{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white}');
  html.push('.btn-parse{background:linear-gradient(135deg,#06b6d4,#6366f1);color:white}');
  html.push('.btn-write{background:linear-gradient(135deg,#10b981,#059669);color:white}');
  html.push('.btn-save-keys{background:linear-gradient(135deg,#10b981,#059669);color:white}');
  html.push('.btn:disabled{background:#e2e8f0!important;color:#94a3b8!important;cursor:not-allowed!important}');
  html.push('.btn-sm{width:auto;padding:5px 11px;font-size:11px;margin-top:5px;display:inline-block;border-radius:7px;border:1.5px solid var(--border);background:white;color:var(--muted);cursor:pointer;font-family:"DM Sans",sans-serif;font-weight:600}');
  html.push('.btn-sm:hover{border-color:var(--accent);color:var(--accent)}');
  html.push('.prog{width:100%;height:5px;background:#e2e8f0;border-radius:3px;margin-top:9px;overflow:hidden;display:none}');
  html.push('.progb{height:100%;background:linear-gradient(90deg,#6366f1,#06b6d4,#10b981);border-radius:3px;animation:prg 1.8s ease-in-out infinite}');
  html.push('@keyframes prg{0%{width:5%}60%{width:85%}100%{width:95%}}');
  html.push('#status{margin:4px 8px 0;padding:10px 13px;border-radius:9px;display:none;font-size:12px;line-height:1.65;white-space:pre-line}');
  html.push('.sok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}');
  html.push('.ser{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}');
  html.push('.sld{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}');
  html.push('.char-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#dbeafe;color:#1d4ed8;margin-left:6px}');
  html.push('.r3{display:flex;gap:8px}.r3>div{flex:1}');
  html.push('.qc{border:1px solid var(--border);border-radius:8px;padding:9px 30px 9px 10px;margin-bottom:7px;background:#fafafa;position:relative}');
  html.push('.qn{font-weight:700;color:#4f46e5;font-size:11.5px;margin-bottom:3px;line-height:1.4}');
  html.push('.qo{font-size:11px;color:#374151;line-height:1.8;margin-top:4px}');
  html.push('.qf{display:flex;gap:5px;align-items:center;margin-top:6px;flex-wrap:wrap}');
  html.push('.bg{font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px}');
  html.push('.ba{background:#d1fae5;color:#065f46}.bd{background:#fef3c7;color:#92400e}.bpt{background:#dbeafe;color:#1e40af}');
  html.push('.dx{position:absolute;top:7px;right:8px;background:none;border:none;cursor:pointer;color:#cbd5e1;font-size:15px;line-height:1}');
  html.push('.dx:hover{color:#ef4444}');
  html.push('.cbar{background:#f5f3ff;border:1px solid #c7d2fe;border-radius:8px;padding:8px 12px;font-size:12px;color:#4338ca;font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center}');
  html.push('.bn{font-size:22px;font-weight:800;color:#6366f1}');
  html.push('.hidden{display:none!important}');
  html.push('.hint{font-size:10px;color:var(--muted);margin-top:5px;line-height:1.55}');
  html.push('.sinfo{font-size:11px;margin-top:6px;padding:6px 10px;border-radius:6px;background:#f0fdf4;color:#065f46;border:1px solid #bbf7d0}');
  html.push('.key-row{display:flex;gap:6px;margin-bottom:7px;align-items:center}');
  html.push('.key-row span{font-size:10px;font-weight:700;color:var(--muted);min-width:36px;flex-shrink:0}');
  html.push('.key-row input{flex:1;font-family:monospace;font-size:11px}');
  html.push('.key-del{background:none;border:1.5px solid #fca5a5;color:#ef4444;border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px;flex-shrink:0;line-height:1;padding:0}');
  html.push('.sp{height:24px}');
  html.push('</style></head><body>');

  // Header
  html.push('<div class="hdr">');
  html.push('<div class="hdr-title">PDF to MCQ Importer</div>');
  html.push('<div class="hdr-sub">Drive OCR > Review Text > Gemini (Auto Key Rotation) > Sheet</div>');
  html.push('<div class="hdr-steps">');
  html.push('<div class="hs active" id="hst1">Upload</div>');
  html.push('<div class="hs" id="hst2">Review</div>');
  html.push('<div class="hs" id="hst3">Parse</div>');
  html.push('<div class="hs" id="hst4">Save</div>');
  html.push('</div></div>');

  // Gemini Keys card
  html.push('<div class="card">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#f0fdf4,#eff6ff)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#10b981,#6366f1)">K</div>');
  html.push('<div class="ct">Gemini API Keys</div>');
  html.push('<span id="keyCnt" style="font-size:10px;color:var(--muted);margin-left:auto"></span>');
  html.push('</div>');
  html.push('<div class="cb">');
  html.push('<div class="hint" style="margin-bottom:10px">Keys rotate automatically on rate limit. Paste all your Gemini API keys below.</div>');
  html.push('<div id="keyList"></div>');
  html.push('<button type="button" class="btn-sm" id="addKeyBtn" style="width:100%;text-align:center;border-style:dashed;margin-top:4px">+ Add Key</button>');
  html.push('<button type="button" class="btn btn-save-keys" id="saveKeysBtn" style="margin-top:10px">Save Keys</button>');
  html.push('<div id="keyMsg" style="display:none;margin-top:8px;padding:7px 10px;border-radius:7px;font-size:11px"></div>');
  html.push('</div></div>');

  // Card 1 - Upload PDF
  html.push('<div class="card" id="card1">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#ede9fe,#e0f2fe)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">1</div>');
  html.push('<div class="ct">Upload PDF</div></div>');
  html.push('<div class="cb">');
  html.push('<div id="dropzone" onclick="document.getElementById(\'pdfInp\').click()">');
  html.push('<div class="dz-icon">&#128196;</div>');
  html.push('<div class="dz-txt" id="dzTxt">Click to choose PDF</div>');
  html.push('<div class="dz-sub" id="dzSub">or drag and drop - scanned / normal / mixed OK</div>');
  html.push('</div>');
  html.push('<input type="file" id="pdfInp" accept="application/pdf" style="display:none">');
  html.push('<div class="hint">PDF goes to your Drive temporarily for OCR, then auto-deleted.</div>');
  html.push('<button type="button" class="btn btn-ocr" id="ocrBtn" disabled>Extract Text with Drive OCR</button>');
  html.push('<div class="prog" id="progOcr"><div class="progb"></div></div>');
  html.push('</div></div>');

  // Card 2 - Review text
  html.push('<div class="card hidden" id="card2">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#ecfdf5,#fffbeb)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#10b981,#06b6d4)">2</div>');
  html.push('<div class="ct">Review and Edit Text</div></div>');
  html.push('<div class="cb">');
  html.push('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">');
  html.push('<label style="margin:0">Extracted Text <span id="charBadge" class="char-badge">0 chars</span></label>');
  html.push('<button type="button" class="btn-sm" id="clearBtn">Clear</button>');
  html.push('</div>');
  html.push('<textarea id="rawText" rows="12" placeholder="OCR text will appear here. Edit if needed..."></textarea>');
  html.push('<div class="hint">Fix OCR errors if any. 2-column PDFs may look jumbled - Gemini will reconstruct correctly.</div>');
  html.push('</div></div>');

  // Card 3 - Parse
  html.push('<div class="card hidden" id="card3">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#fef3c7,#fce7f3)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#f59e0b,#f97316)">3</div>');
  html.push('<div class="ct">Parse MCQs with Gemini</div></div>');
  html.push('<div class="cb">');
  html.push('<div class="r3">');
  html.push('<div><label>Difficulty</label><select id="dd"><option value="medium">Medium</option><option value="easy">Easy</option><option value="hard">Hard</option></select></div>');
  html.push('<div><label>Points</label><input type="number" id="pts" value="1" min="0" step="0.5"></div>');
  html.push('<div><label>Neg. Marks</label><input type="number" id="neg" value="0" min="0" step="0.25"></div>');
  html.push('</div>');
  html.push('<button type="button" class="btn btn-parse" id="parseBtn">Parse MCQs with Gemini</button>');
  html.push('<div class="prog" id="progParse"><div class="progb"></div></div>');
  html.push('</div></div>');

  // Preview card
  html.push('<div class="card hidden" id="previewCard">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#fef3c7,#fce7f3)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#f59e0b,#f97316)">&#10003;</div>');
  html.push('<div class="ct">Review Questions</div></div>');
  html.push('<div class="cb">');
  html.push('<div class="cbar"><span><span class="bn" id="qCount">0</span> questions</span><span id="modelBadge" style="font-size:10px;color:var(--muted)">tap X to remove</span></div>');
  html.push('<div id="previewList"></div>');
  html.push('</div></div>');

  // Card 4 - Save
  html.push('<div class="card hidden" id="card4">');
  html.push('<div class="ch" style="background:linear-gradient(135deg,#dbeafe,#ede9fe)">');
  html.push('<div class="sn" style="background:linear-gradient(135deg,#3b82f6,#6366f1)">4</div>');
  html.push('<div class="ct">Save to Sheet</div></div>');
  html.push('<div class="cb">');
  html.push('<label>Target Sheet</label>');
  html.push('<select id="targetSheet" onchange="onSheetChange()"></select>');
  html.push('<input type="text" id="newSheetName" class="hidden" placeholder="New sheet name..." style="margin-top:6px">');
  html.push('<div id="sheetInfo" class="sinfo" style="display:none"></div>');
  html.push('<button type="button" class="btn btn-write" id="writeBtn">Add Questions to Sheet</button>');
  html.push('<div class="prog" id="progWrite"><div class="progb"></div></div>');
  html.push('</div></div>');

  html.push('<div id="status"></div><div class="sp"></div>');

  // ── SCRIPT ──────────────────────────────────────────────
  html.push('<script>');
  html.push('var pdfB64=null,D=[],SINFO=[],maskedKeys=[];');

  // Key management
  html.push('function loadKeys(){');
  html.push('  google.script.run');
  html.push('    .withSuccessHandler(function(arr){');
  html.push('      maskedKeys=arr;');
  html.push('      var list=document.getElementById("keyList");');
  html.push('      list.innerHTML="";');
  html.push('      if(arr.length===0){addKeyRow("",0);}');
  html.push('      else{arr.forEach(function(v,i){addKeyRow(v,i);});}');
  html.push('      updateKeyCnt(arr.length);');
  html.push('    })');
  html.push('    .withFailureHandler(function(){addKeyRow("",0);updateKeyCnt(0);})');
  html.push('    .loadGeminiKeys();');
  html.push('}');

  html.push('function addKeyRow(val,idx){');
  html.push('  var list=document.getElementById("keyList");');
  html.push('  var i=(idx!==undefined)?idx:list.children.length;');
  html.push('  var row=document.createElement("div");');
  html.push('  row.className="key-row";');
  html.push('  var lbl=document.createElement("span");');
  html.push('  lbl.textContent="Key "+(i+1);');
  html.push('  var inp=document.createElement("input");');
  html.push('  inp.type="text";');
  html.push('  inp.placeholder="AIzaSy... paste full key";');
  html.push('  inp.className="key-inp";');
  html.push('  inp.dataset.orig=val||"";');
  html.push('  inp.dataset.idx=String(i);');
  html.push('  if(val){inp.value=val;inp.dataset.masked="1";}');
  html.push('  inp.addEventListener("focus",function(){');
  html.push('    if(this.dataset.masked==="1"){this.value="";this.dataset.masked="0";}');
  html.push('  });');
  html.push('  var del=document.createElement("button");');
  html.push('  del.type="button";');
  html.push('  del.textContent="X";');
  html.push('  del.className="key-del";');
  html.push('  del.onclick=function(){row.remove();renum();}');
  html.push('  row.appendChild(lbl);row.appendChild(inp);row.appendChild(del);');
  html.push('  list.appendChild(row);');
  html.push('}');

  html.push('function renum(){');
  html.push('  document.querySelectorAll(".key-row").forEach(function(r,i){');
  html.push('    r.querySelector("span").textContent="Key "+(i+1);');
  html.push('    r.querySelector("input").dataset.idx=String(i);');
  html.push('  });');
  html.push('}');

  html.push('function saveKeys(){');
  html.push('  var keys=[];');
  html.push('  document.querySelectorAll(".key-inp").forEach(function(inp){');
  html.push('    if(inp.dataset.masked==="1"){');
  html.push('      keys.push("__MASKED_"+inp.dataset.idx);');
  html.push('    } else {');
  html.push('      var v=inp.value.trim();');
  html.push('      if(v.length>10) keys.push(v);');
  html.push('    }');
  html.push('  });');
  html.push('  showKeyMsg("Saving...","sld");');
  html.push('  google.script.run');
  html.push('    .withSuccessHandler(function(r){');
  html.push('      showKeyMsg("Saved "+r.saved+" key(s)! Auto-rotation enabled.","sok");');
  html.push('      updateKeyCnt(r.saved);');
  html.push('      setTimeout(loadKeys,600);');
  html.push('    })');
  html.push('    .withFailureHandler(function(e){showKeyMsg("Error: "+e.message,"ser");})');
  html.push('    .saveGeminiKeys(keys);');
  html.push('}');

  html.push('function updateKeyCnt(n){');
  html.push('  var el=document.getElementById("keyCnt");');
  html.push('  if(!el)return;');
  html.push('  if(n===0) el.textContent="No keys";');
  html.push('  else if(n===1) el.textContent="1 key";');
  html.push('  else el.textContent=n+" keys - rotation ON";');
  html.push('}');

  html.push('function showKeyMsg(m,c){');
  html.push('  var el=document.getElementById("keyMsg");');
  html.push('  el.textContent=m;el.className=c;el.style.display="block";');
  html.push('}');

  // File handling
  html.push('var pdfInp=null;');
  html.push('function initDrop(){');
  html.push('  pdfInp=document.getElementById("pdfInp");');
  html.push('  pdfInp.onchange=function(){if(this.files[0])readFile(this.files[0]);};');
  html.push('  var dz=document.getElementById("dropzone");');
  html.push('  dz.ondragover=function(e){e.preventDefault();};');
  html.push('  dz.ondrop=function(e){e.preventDefault();if(e.dataTransfer.files[0])readFile(e.dataTransfer.files[0]);};');
  html.push('}');

  html.push('function readFile(f){');
  html.push('  if(!f.name.toLowerCase().endsWith(".pdf")){stat("Only PDF files allowed.","ser");return;}');
  html.push('  var r=new FileReader();');
  html.push('  r.onload=function(e){');
  html.push('    pdfB64=e.target.result.split(",")[1];');
  html.push('    document.getElementById("dropzone").classList.add("has-file");');
  html.push('    document.getElementById("dzTxt").textContent=f.name;');
  html.push('    document.getElementById("dzSub").textContent=Math.round(f.size/1024)+" KB - ready";');
  html.push('    document.getElementById("ocrBtn").disabled=false;');
  html.push('    stat("PDF loaded. Click Extract Text.","sok");');
  html.push('  };');
  html.push('  r.onerror=function(){stat("Failed to read file.","ser");};');
  html.push('  r.readAsDataURL(f);');
  html.push('}');

  // OCR
  html.push('function runOcr(){');
  html.push('  if(!pdfB64){stat("Upload a PDF first.","ser");return;}');
  html.push('  stat("Uploading to Drive and running OCR... 10-30 seconds...","sld");');
  html.push('  document.getElementById("ocrBtn").disabled=true;');
  html.push('  document.getElementById("progOcr").style.display="block";');
  html.push('  google.script.run');
  html.push('    .withSuccessHandler(function(r){');
  html.push('      document.getElementById("progOcr").style.display="none";');
  html.push('      document.getElementById("rawText").value=r.text;');
  html.push('      document.getElementById("charBadge").textContent=r.chars.toLocaleString()+" chars";');
  html.push('      document.getElementById("card2").classList.remove("hidden");');
  html.push('      document.getElementById("card3").classList.remove("hidden");');
  html.push('      hst("hst2");');
  html.push('      stat("Text extracted! "+r.chars.toLocaleString()+" chars. Review then click Parse.","sok");');
  html.push('      document.getElementById("ocrBtn").disabled=false;');
  html.push('    })');
  html.push('    .withFailureHandler(function(e){');
  html.push('      document.getElementById("progOcr").style.display="none";');
  html.push('      stat("OCR Error: "+e.message,"ser");');
  html.push('      document.getElementById("ocrBtn").disabled=false;');
  html.push('    })');
  html.push('    .extractTextOnly(pdfB64,"upload.pdf");');
  html.push('}');

  // Parse
  html.push('function runParse(){');
  html.push('  var raw=document.getElementById("rawText").value.trim();');
  html.push('  if(raw.length<10){stat("Text is empty. Run OCR first.","ser");return;}');
  html.push('  var diff=document.getElementById("dd").value;');
  html.push('  var pts=parseFloat(document.getElementById("pts").value)||1;');
  html.push('  var neg=parseFloat(document.getElementById("neg").value)||0;');
  html.push('  stat("Sending to Gemini... auto-rotating keys if needed...","sld");');
  html.push('  document.getElementById("parseBtn").disabled=true;');
  html.push('  document.getElementById("progParse").style.display="block";');
  html.push('  google.script.run');
  html.push('    .withSuccessHandler(function(r){');
  html.push('      document.getElementById("progParse").style.display="none";');
  html.push('      D=r.questions;');
  html.push('      renderPreview(r);');
  html.push('      loadSheets();');
  html.push('      document.getElementById("card4").classList.remove("hidden");');
  html.push('      hst("hst3");');
  html.push('      stat(r.count+" questions parsed! Model: "+r.model+" Key #"+r.keyUsed,"sok");');
  html.push('      document.getElementById("parseBtn").disabled=false;');
  html.push('    })');
  html.push('    .withFailureHandler(function(e){');
  html.push('      document.getElementById("progParse").style.display="none";');
  html.push('      stat("Parse Error: "+e.message,"ser");');
  html.push('      document.getElementById("parseBtn").disabled=false;');
  html.push('    })');
  html.push('    .parseTextToMcqs(raw,diff,pts,neg);');
  html.push('}');

  // Preview
  html.push('function renderPreview(r){');
  html.push('  document.getElementById("previewCard").classList.remove("hidden");');
  html.push('  document.getElementById("qCount").textContent=D.length;');
  html.push('  if(r&&r.model) document.getElementById("modelBadge").textContent="Key #"+(r.keyUsed||1)+" - "+r.model;');
  html.push('  var l=document.getElementById("previewList");l.innerHTML="";');
  html.push('  D.forEach(function(q,i){');
  html.push('    var d=document.createElement("div");d.className="qc";');
  html.push('    d.innerHTML="<button type=\'button\' class=\'dx\' onclick=\'rm("+i+")\'>X</button>"');
  html.push('      +"<div class=\'qn\'>Q"+(i+1)+". "+esc(q.question)+"</div>"');
  html.push('      +"<div class=\'qo\'>A: "+esc(q.optA)+"<br>B: "+esc(q.optB)');
  html.push('        +(q.optC?"<br>C: "+esc(q.optC):"")+(q.optD?"<br>D: "+esc(q.optD):"")+"</div>"');
  html.push('      +"<div class=\'qf\'><span class=\'bg ba\'>Ans: "+esc(q.answer||"A")+"</span>"');
  html.push('        +"<span class=\'bg bd\'>"+(q.difficulty||"medium")+"</span>"');
  html.push('        +"<span class=\'bg bpt\'>"+(q.points||1)+"pt</span></div>";');
  html.push('    l.appendChild(d);');
  html.push('  });');
  html.push('}');

  html.push('function rm(i){D.splice(i,1);document.getElementById("qCount").textContent=D.length;if(D.length===0)document.getElementById("previewCard").classList.add("hidden");else renderPreview();}');

  // Sheet list
  html.push('function loadSheets(){');
  html.push('  google.script.run.withSuccessHandler(function(sheets){');
  html.push('    SINFO=sheets;');
  html.push('    var sel=document.getElementById("targetSheet");sel.innerHTML="";');
  html.push('    sheets.forEach(function(s){');
  html.push('      var o=document.createElement("option");');
  html.push('      o.value=s.name;');
  html.push('      o.textContent=s.name+(s.count>0?" ("+s.count+" Qs)":" (empty)");');
  html.push('      sel.appendChild(o);');
  html.push('    });');
  html.push('    var on=document.createElement("option");on.value="__new__";on.textContent="+ Create New Sheet...";sel.appendChild(on);');
  html.push('    updateSheetInfo();');
  html.push('  }).getPdfSheetList();');
  html.push('}');

  html.push('function onSheetChange(){');
  html.push('  var n=document.getElementById("targetSheet").value==="__new__";');
  html.push('  var e=document.getElementById("newSheetName");');
  html.push('  n?e.classList.remove("hidden"):e.classList.add("hidden");');
  html.push('  if(n)e.focus();');
  html.push('  updateSheetInfo();');
  html.push('}');

  html.push('function updateSheetInfo(){');
  html.push('  var sv=document.getElementById("targetSheet").value;');
  html.push('  var el=document.getElementById("sheetInfo");');
  html.push('  if(sv==="__new__"){el.style.display="none";return;}');
  html.push('  var s=SINFO.find(function(x){return x.name===sv;});');
  html.push('  el.style.display="block";');
  html.push('  if(s&&s.count>0) el.innerHTML="<b>"+s.count+" existing questions</b> - new ones appended.";');
  html.push('  else el.textContent="Empty sheet. Questions start from row 2.";');
  html.push('}');

  // Write
  html.push('function runWrite(){');
  html.push('  if(D.length===0){stat("No questions to write.","ser");return;}');
  html.push('  var sv=document.getElementById("targetSheet").value;');
  html.push('  var nm=sv==="__new__"?document.getElementById("newSheetName").value.trim():sv;');
  html.push('  if(!nm){stat("Enter a sheet name.","ser");return;}');
  html.push('  stat("Writing "+D.length+" questions to: "+nm+"...","sld");');
  html.push('  document.getElementById("writeBtn").disabled=true;');
  html.push('  document.getElementById("progWrite").style.display="block";');
  html.push('  google.script.run');
  html.push('    .withSuccessHandler(function(r){');
  html.push('      document.getElementById("progWrite").style.display="none";');
  html.push('      var msg=r.count+" questions added to: "+r.sheet;');
  html.push('      if(r.existing>0) msg+=" (after "+r.existing+" existing)";');
  html.push('      stat(msg,"sok");');
  html.push('      document.getElementById("writeBtn").disabled=false;');
  html.push('      hst("hst4");');
  html.push('    })');
  html.push('    .withFailureHandler(function(e){');
  html.push('      document.getElementById("progWrite").style.display="none";');
  html.push('      stat("Write Error: "+e.message,"ser");');
  html.push('      document.getElementById("writeBtn").disabled=false;');
  html.push('    })');
  html.push('    .writeQuestionsToSheet(D,nm);');
  html.push('}');

  // Utils
  html.push('function esc(s){if(!s)return"<em style=color:#ccc>-</em>";return s.toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}');
  html.push('function stat(m,c){var e=document.getElementById("status");e.style.display="block";e.className=c;e.textContent=m;setTimeout(function(){e.scrollIntoView({behavior:"smooth",block:"nearest"});},60);}');
  html.push('function hst(id){var ids=["hst1","hst2","hst3","hst4"];var idx=ids.indexOf(id);ids.forEach(function(h,i){document.getElementById(h).className="hs"+(i<idx?" done":i===idx?" active":"");});}');

  // Wire up buttons after DOM ready
  html.push('document.addEventListener("DOMContentLoaded",function(){');
  html.push('  document.getElementById("addKeyBtn").onclick=function(){addKeyRow("",document.querySelectorAll(".key-row").length);};');
  html.push('  document.getElementById("saveKeysBtn").onclick=saveKeys;');
  html.push('  document.getElementById("ocrBtn").onclick=runOcr;');
  html.push('  document.getElementById("parseBtn").onclick=runParse;');
  html.push('  document.getElementById("writeBtn").onclick=runWrite;');
  html.push('  document.getElementById("clearBtn").onclick=function(){document.getElementById("rawText").value="";document.getElementById("charBadge").textContent="0 chars";};');
  html.push('  initDrop();');
  html.push('  loadKeys();');
  html.push('});');

  html.push('</script></body></html>');
  return html.join('\n');
}