// ============================================================
// Dashboard.gs — ITI ASSESSMENT DASHBOARD (FIXED)
// FIXES:
//   1. Options now read from optA/optB/optC/optD (not q.options / q.opts)
//   2. RESULTS sheet read dynamically (not hardcoded 15 cols) — fixes
//      broken answers when fixResultsHeaders() added extra columns
//   3. Same dynamic fix applied to dash_getStudentList and dash_getStudentTests
// ============================================================

function openDashboard() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.showSidebar(
      HtmlService.createHtmlOutput(DASHBOARD_HTML())
        .setTitle('📊 Assessment Dashboard')
        .setWidth(1200)
    );
  } catch (e) {
    Logger.log('Dashboard Error: ' + e.message);
  }
}

// ============================================================
// HELPER: Find column index by header name (0-based)
// ============================================================
function findColIndex(headerRow, name) {
  for (var i = 0; i < headerRow.length; i++) {
    if ((headerRow[i] || '').toString().trim() === name) return i;
  }
  return -1;
}

// ============================================================
// FIX: Proper percentage parsing
// ============================================================
function parsePercentage(pctStr) {
  if (!pctStr) return 0;
  var cleaned = pctStr.toString().replace('%', '').trim();
  var num = parseFloat(cleaned) || 0;
  if (num > 0 && num < 1) {
    num = num * 100;
  }
  return num;
}

// ============================================================
// SERVER FUNCTION 1: Get list of all tests
// ============================================================
function dash_getTestList() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var out = [];
    var seen = {};

    var atSheet = ss.getSheetByName('ACTIVE TESTS');
    if (atSheet && atSheet.getLastRow() > 1) {
      var atRows = atSheet.getDataRange().getValues();
      for (var i = 1; i < atRows.length; i++) {
        var id    = (atRows[i][0] || '').toString().trim();
        var title = (atRows[i][1] || '').toString().trim();
        if (id && title && !seen[id]) {
          seen[id] = true;
          out.push({ 
            id: id, 
            title: title, 
            teacher: (atRows[i][2] || '').toString().trim() 
          });
        }
      }
    }

    var resSheet = ss.getSheetByName('RESULTS');
    if (resSheet && resSheet.getLastRow() > 1) {
      var resRows = resSheet.getDataRange().getValues();
      for (var j = 1; j < resRows.length; j++) {
        var rid    = (resRows[j][1] || '').toString().trim();
        var rtitle = (resRows[j][2] || '').toString().trim();
        if (rid && rtitle && !seen[rid]) {
          seen[rid] = true;
          out.push({ 
            id: rid, 
            title: rtitle, 
            teacher: '' 
          });
        }
      }
    }

    return out;
  } catch (e) {
    Logger.log('dash_getTestList Error: ' + e.message);
    return [];
  }
}

// ============================================================
// SERVER FUNCTION 2: Get comprehensive student assessment
// ============================================================
function dash_getStudentAssessment(studentName, rollNo, testId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get student's test submission
    var resSheet = ss.getSheetByName('RESULTS');
    if (!resSheet || resSheet.getLastRow() < 2) {
      return { error: 'No submission found.' };
    }

    // ✅ FIX 2: Read ALL columns dynamically — handles extra columns added by fixResultsHeaders()
    var allResData = resSheet.getDataRange().getValues();
    var resHeader = allResData[0];

    // Find column positions by name instead of hardcoded index
    var COL_SUB_ID   = findColIndex(resHeader, 'Submission ID');
    var COL_TEST_ID  = findColIndex(resHeader, 'Test ID');
    var COL_TITLE    = findColIndex(resHeader, 'Test Title');
    var COL_NAME     = findColIndex(resHeader, 'Student Name');
    var COL_ROLL     = findColIndex(resHeader, 'Roll No');
    var COL_CLASS    = findColIndex(resHeader, 'Class');
    var COL_TRADE    = findColIndex(resHeader, 'Trade');
    var COL_DATE     = findColIndex(resHeader, 'Submitted At');
    var COL_SCORE    = findColIndex(resHeader, 'Score');
    var COL_TOTAL    = findColIndex(resHeader, 'Total Marks');
    var COL_PCT      = findColIndex(resHeader, 'Percentage');
    var COL_STATUS   = findColIndex(resHeader, 'Status');
    var COL_ANSWERS  = findColIndex(resHeader, 'Answers (JSON)');

    // Fallback to original positions if headers not found (backward compat)
    if (COL_SUB_ID  < 0) COL_SUB_ID  = 0;
    if (COL_TEST_ID < 0) COL_TEST_ID = 1;
    if (COL_TITLE   < 0) COL_TITLE   = 2;
    if (COL_NAME    < 0) COL_NAME    = 3;
    if (COL_ROLL    < 0) COL_ROLL    = 4;
    if (COL_CLASS   < 0) COL_CLASS   = 5;
    if (COL_TRADE   < 0) COL_TRADE   = 6;
    if (COL_DATE    < 0) COL_DATE    = 7;
    if (COL_SCORE   < 0) COL_SCORE   = 8;
    if (COL_TOTAL   < 0) COL_TOTAL   = 9;
    if (COL_PCT     < 0) COL_PCT     = 10;
    if (COL_STATUS  < 0) COL_STATUS  = 11;
    if (COL_ANSWERS < 0) COL_ANSWERS = 14;

    var submission = null;

    for (var i = 1; i < allResData.length; i++) {
      var r = allResData[i];
      if (!r[COL_SUB_ID]) continue;
      
      var sName = (r[COL_NAME] || '').toString().trim();
      var sRoll = (r[COL_ROLL] || '').toString().toUpperCase().trim();
      var tId   = (r[COL_TEST_ID] || '').toString().trim();
      
      if (sName === studentName && sRoll === rollNo && tId === testId) {
        var pct = parsePercentage(r[COL_PCT]);
        
        var answers = {};
        try { 
          answers = JSON.parse((r[COL_ANSWERS] || '{}').toString()); 
        } catch (e) {
          Logger.log('Answers parse error: ' + e.message);
        }
        
        submission = {
          score:  parseFloat(r[COL_SCORE])  || 0,
          total:  parseFloat(r[COL_TOTAL])  || 0,
          pct:    pct,
          status: (r[COL_STATUS]  || '').toString().trim(),
          date:   (r[COL_DATE]    || '').toString().trim(),
          answers: answers
        };
        break;
      }
    }

    if (!submission) {
      return { error: 'No submission found for this student.' };
    }

    // Get test questions from TEST_DATA sheet
    var questions  = [];
    var testTitle  = '';
    var collegeName = 'Government ITI';
    
    var tdSheet = ss.getSheetByName('TEST_DATA');
    if (tdSheet && tdSheet.getLastRow() > 1) {
      var tdData = tdSheet.getRange(2, 1, tdSheet.getLastRow() - 1, 2).getValues();

      // Use LAST matching row (newest re-deployment of same testId)
      var matchedJson = null;
      for (var j = 0; j < tdData.length; j++) {
        if ((tdData[j][0] || '').toString().trim() === testId) {
          matchedJson = tdData[j][1].toString();
        }
      }

      if (matchedJson) {
        try {
          var td = JSON.parse(matchedJson);
          testTitle   = (td.title         || testId).toString();
          collegeName = (td.instituteName  || 'Government ITI').toString();

          questions = (td.questions || []).map(function(q, idx) {

            // ✅ FIX 1: Read actual option TEXT from optA/optB/optC/optD
            // code.gs stores questions with these exact field names.
            // The old code looked for q.options / q.opts which never existed.
            var options = [
              (q.optA || '').toString().trim(),
              (q.optB || '').toString().trim(),
              (q.optC || '').toString().trim(),
              (q.optD || '').toString().trim()
            ].filter(function(o) { return o !== ''; });

            // Also handle the rare case where a future version stores q.options array
            if (options.length === 0 && Array.isArray(q.options) && q.options.length > 0) {
              options = q.options.map(function(o) { return o.toString().trim(); });
            }

            // ✅ FIX 3 (answer key lookup):
            // Student answers are stored with the COMBINED array index as the key
            // (e.g., answers["0"], answers["1"] ... answers["N"]).
            // idx here IS that combined position — so this lookup is correct for all tabs.
            var chosen = (
              submission.answers[idx] ||
              submission.answers[String(idx)] ||
              ''
            ).toString().toUpperCase().trim();

            return {
              idx:         idx,
              q:           (q.question    || '').toString(),
              options:     options,
              ans:         (q.answer      || '').toString().trim().toUpperCase(),
              ch:          (q.chapter     || 'General').toString().trim(),
              explanation: (q.explanation || '').toString().trim(),
              chosen:      chosen
            };
          });
        } catch (e) {
          Logger.log('Error parsing test data: ' + e.message);
        }
      }
    }

    // ---- Calculate insights ----

    // 1. Grade (based on stored percentage, not recalculated)
    var grade = 'F';
    if      (submission.pct >= 90) grade = 'A+';
    else if (submission.pct >= 80) grade = 'A';
    else if (submission.pct >= 70) grade = 'B+';
    else if (submission.pct >= 60) grade = 'B';
    else if (submission.pct >= 50) grade = 'C';
    else if (submission.pct >= 40) grade = 'D';

    // 2. Chapter-wise analysis — ALL chapters, ALL questions
    var chapterAnalysis = {};
    questions.forEach(function(q) {
      if (!chapterAnalysis[q.ch]) {
        chapterAnalysis[q.ch] = { correct: 0, total: 0, questions: [] };
      }
      chapterAnalysis[q.ch].total++;
      
      var isCorrect = (q.chosen !== '' && q.chosen === q.ans);
      if (isCorrect) {
        chapterAnalysis[q.ch].correct++;
      }
      chapterAnalysis[q.ch].questions.push({
        idx:         q.idx,
        q:           q.q,
        options:     q.options,
        correct:     isCorrect,
        status:      !q.chosen ? 'skipped' : isCorrect ? 'correct' : 'wrong',
        chosen:      q.chosen,
        ans:         q.ans,
        ch:          q.ch,
        explanation: q.explanation
      });
    });

    var chapters = [];
    Object.keys(chapterAnalysis).forEach(function(ch) {
      var pct = chapterAnalysis[ch].total > 0
        ? Math.round(chapterAnalysis[ch].correct / chapterAnalysis[ch].total * 100)
        : 0;
      chapters.push({
        name:      ch,
        correct:   chapterAnalysis[ch].correct,
        total:     chapterAnalysis[ch].total,
        pct:       pct,
        questions: chapterAnalysis[ch].questions
      });
    });

    chapters.sort(function(a, b) { return a.pct - b.pct; });

    // 3. Wrong questions
    var wrongQuestions = [];
    questions.forEach(function(q) {
      if (q.chosen && q.chosen !== q.ans) {
        wrongQuestions.push({
          idx:         q.idx + 1,
          q:           q.q,
          options:     q.options,
          chosen:      q.chosen,
          ans:         q.ans,
          ch:          q.ch,
          explanation: q.explanation
        });
      }
    });

    // 4. Correct questions
    var correctQuestions = [];
    questions.forEach(function(q) {
      if (q.chosen === q.ans && q.chosen !== '') {
        correctQuestions.push({
          idx:         q.idx + 1,
          q:           q.q,
          options:     q.options,
          ans:         q.ans,
          ch:          q.ch,
          explanation: q.explanation
        });
      }
    });

    // 5. Skipped questions
    var skippedQuestions = [];
    questions.forEach(function(q) {
      if (!q.chosen) {
        skippedQuestions.push({
          idx:         q.idx + 1,
          q:           q.q,
          options:     q.options,
          ans:         q.ans,
          ch:          q.ch,
          explanation: q.explanation
        });
      }
    });

    return {
      student:          { name: studentName, rollNo: rollNo },
      test:             { id: testId, title: testTitle },
      college:          collegeName,
      submission:       submission,
      grade:            grade,
      chapters:         chapters,
      wrongQuestions:   wrongQuestions,
      correctQuestions: correctQuestions,
      skippedQuestions: skippedQuestions,
      totalQuestions:   questions.length,
      correct:          correctQuestions.length,
      wrong:            wrongQuestions.length,
      skipped:          skippedQuestions.length,
      allQuestions:     questions
    };

  } catch (e) {
    Logger.log('dash_getStudentAssessment Error: ' + e.message);
    return { error: 'Error: ' + e.message };
  }
}

// ============================================================
// SERVER FUNCTION 3: Get all students list
// ============================================================
function dash_getStudentList() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resSheet = ss.getSheetByName('RESULTS');
    
    if (!resSheet || resSheet.getLastRow() < 2) {
      return [];
    }

    // ✅ FIX 2: Read all columns dynamically
    var allData = resSheet.getDataRange().getValues();
    var header  = allData[0];
    var COL_SUB_ID = findColIndex(header, 'Submission ID'); if (COL_SUB_ID < 0) COL_SUB_ID = 0;
    var COL_NAME   = findColIndex(header, 'Student Name');  if (COL_NAME   < 0) COL_NAME   = 3;
    var COL_ROLL   = findColIndex(header, 'Roll No');       if (COL_ROLL   < 0) COL_ROLL   = 4;

    var seen = {};
    var students = [];

    for (var i = 1; i < allData.length; i++) {
      var r = allData[i];
      if (!r[COL_SUB_ID]) continue;

      var name   = (r[COL_NAME] || '').toString().trim();
      var rollNo = (r[COL_ROLL] || '').toString().toUpperCase().trim();
      
      if (name && rollNo) {
        var key = name + '|' + rollNo;
        if (!seen[key]) {
          seen[key] = true;
          students.push({ name: name, rollNo: rollNo });
        }
      }
    }

    return students;

  } catch (e) {
    Logger.log('dash_getStudentList Error: ' + e.message);
    return [];
  }
}

// ============================================================
// SERVER FUNCTION 4: Get all tests for a student
// ============================================================
function dash_getStudentTests(studentName, rollNo) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resSheet = ss.getSheetByName('RESULTS');
    
    if (!resSheet || resSheet.getLastRow() < 2) {
      return [];
    }

    // ✅ FIX 2: Read all columns dynamically
    var allData = resSheet.getDataRange().getValues();
    var header  = allData[0];
    var COL_SUB_ID  = findColIndex(header, 'Submission ID'); if (COL_SUB_ID  < 0) COL_SUB_ID  = 0;
    var COL_TEST_ID = findColIndex(header, 'Test ID');        if (COL_TEST_ID < 0) COL_TEST_ID = 1;
    var COL_TITLE   = findColIndex(header, 'Test Title');     if (COL_TITLE   < 0) COL_TITLE   = 2;
    var COL_NAME    = findColIndex(header, 'Student Name');   if (COL_NAME    < 0) COL_NAME    = 3;
    var COL_ROLL    = findColIndex(header, 'Roll No');        if (COL_ROLL    < 0) COL_ROLL    = 4;
    var COL_DATE    = findColIndex(header, 'Submitted At');   if (COL_DATE    < 0) COL_DATE    = 7;
    var COL_SCORE   = findColIndex(header, 'Score');          if (COL_SCORE   < 0) COL_SCORE   = 8;
    var COL_TOTAL   = findColIndex(header, 'Total Marks');    if (COL_TOTAL   < 0) COL_TOTAL   = 9;
    var COL_PCT     = findColIndex(header, 'Percentage');     if (COL_PCT     < 0) COL_PCT     = 10;
    var COL_STATUS  = findColIndex(header, 'Status');         if (COL_STATUS  < 0) COL_STATUS  = 11;

    var tests = [];

    for (var i = 1; i < allData.length; i++) {
      var r = allData[i];
      if (!r[COL_SUB_ID]) continue;
      
      var sName = (r[COL_NAME] || '').toString().trim();
      var sRoll = (r[COL_ROLL] || '').toString().toUpperCase().trim();
      
      if (sName === studentName && sRoll === rollNo) {
        var pct = parsePercentage(r[COL_PCT]);
        
        tests.push({
          testId: (r[COL_TEST_ID] || '').toString().trim(),
          title:  (r[COL_TITLE]   || '').toString().trim(),
          date:   (r[COL_DATE]    || '').toString().trim(),
          pct:    pct,
          score:  parseFloat(r[COL_SCORE]) || 0,
          total:  parseFloat(r[COL_TOTAL]) || 0,
          status: (r[COL_STATUS]  || '').toString().trim()
        });
      }
    }

    tests.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    return tests;

  } catch (e) {
    Logger.log('dash_getStudentTests Error: ' + e.message);
    return [];
  }
}

// ============================================================
// HTML TEMPLATE
// ============================================================
function DASHBOARD_HTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Assessment Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 12px;
      font-size: 13px;
    }

    .container { max-width: 100%; }
    
    .section { margin-bottom: 14px; }
    .section-title { 
      font-size: 11px; 
      font-weight: 700; 
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tab-buttons { 
      display: flex; 
      gap: 6px; 
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .tab-btn { 
      padding: 7px 12px; 
      border: none; 
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
      transition: all 0.2s;
    }
    .tab-btn.active { 
      background: #1e40af; 
      color: white;
    }
    .tab-btn:hover { background: #e2e8f0; }
    .tab-btn.active:hover { background: #1e40af; }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .card { 
      padding: 12px; 
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .card-title { 
      font-weight: 700; 
      color: #0f172a;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .perf-card {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      text-align: center;
    }
    .perf-score { font-size: 48px; font-weight: 800; margin: 8px 0; }
    .perf-grade { 
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
      margin-top: 4px;
    }
    .perf-status { font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 8px; }

    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .stat-box { 
      padding: 10px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      text-align: center;
    }
    .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
    .stat-value { font-size: 20px; font-weight: 800; color: #1e40af; margin-top: 4px; }

    .chapter-box {
      padding: 10px;
      background: white;
      border-left: 4px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .chapter-name { 
      font-weight: 700;
      color: #0f172a;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .chapter-score {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .chapter-pct { font-weight: 700; font-size: 13px; }
    .chapter-bar {
      width: 100%;
      height: 5px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .chapter-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .chapter-note { 
      font-size: 10px;
      color: #64748b;
      font-style: italic;
    }

    .wrong-q {
      padding: 10px;
      background: #fef2f2;
      border-left: 3px solid #dc2626;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .wrong-q-num { 
      font-weight: 700;
      color: #7f1d1d;
      font-size: 11px;
    }
    .wrong-q-text { 
      font-size: 11px;
      color: #4b5563;
      margin: 4px 0;
      line-height: 1.4;
    }
    .wrong-answer {
      background: white;
      padding: 6px;
      border-radius: 3px;
      font-size: 10px;
      margin: 4px 0;
    }
    .wrong-answer-label { color: #64748b; }
    .wrong-answer-val { font-weight: 700; color: #dc2626; }

    .correct-q {
      padding: 10px;
      background: #f0fdf4;
      border-left: 3px solid #16a34a;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .correct-q-num { 
      font-weight: 700;
      color: #166534;
      font-size: 11px;
    }

    .color-strong { border-left-color: #16a34a; }
    .color-good { border-left-color: #0ea5e9; }
    .color-weak { border-left-color: #f59e0b; }
    .color-critical { border-left-color: #dc2626; }

    .fill-strong { background: linear-gradient(90deg, #16a34a, #22c55e); }
    .fill-good { background: linear-gradient(90deg, #0ea5e9, #06b6d4); }
    .fill-weak { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .fill-critical { background: linear-gradient(90deg, #dc2626, #ef4444); }

    select { 
      width: 100%; 
      padding: 8px; 
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 8px;
      font-family: inherit;
    }
    button { 
      padding: 8px 12px; 
      background: #1e40af; 
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 11px;
      width: 100%;
      transition: background 0.2s;
      margin-bottom: 6px;
    }
    button:hover { background: #1e3a8a; }
    button:disabled { background: #cbd5e1; cursor: not-allowed; }

    .loading { 
      text-align: center; 
      padding: 20px; 
      color: #64748b;
      font-size: 12px;
    }
    .spinner { 
      display: inline-block;
      width: 14px; 
      height: 14px;
      border: 2px solid #e2e8f0;
      border-top-color: #1e40af;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error { 
      padding: 10px; 
      background: #fecaca;
      color: #991b1b;
      border-radius: 4px;
      border-left: 3px solid #dc2626;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
    }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }

    .empty-state {
      padding: 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }

    .download-btn {
      background: #16a34a;
      padding: 14px 16px !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      margin-bottom: 12px !important;
    }
    .download-btn:hover {
      background: #15803d;
    }

    /* Options display in wrong-answer section */
    .opt-list { margin: 6px 0; }
    .opt-line { font-size: 10px; padding: 2px 0; color: #374151; }
    .opt-line.correct-opt { color: #166534; font-weight: 700; }
    .opt-line.wrong-opt   { color: #991b1b; font-weight: 700; text-decoration: line-through; }
  </style>
</head>
<body>

<div class="container">
  <div class="tab-buttons">
    <button class="tab-btn active" onclick="switchTab('assessment')">📊 Assessment</button>
    <button class="tab-btn" onclick="switchTab('history')">📈 History</button>
  </div>

  <div id="assessment" class="tab-content active">
    <div class="section">
      <div class="section-title">Select Student & Test</div>
      <select id="studentSelect" onchange="loadStudentTests()">
        <option value="">Loading students...</option>
      </select>
      <select id="testSelect" onchange="loadAssessment()" style="display:none;">
        <option value="">Select a test...</option>
      </select>
    </div>
    <div id="assessmentContainer"></div>
  </div>

  <div id="history" class="tab-content">
    <div class="section">
      <div class="section-title">Select Student</div>
      <select id="historyStudentSelect" onchange="loadStudentHistory()">
        <option value="">Loading students...</option>
      </select>
    </div>
    <div id="historyContainer"></div>
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
  var allStudents = [];
  var currentStudentTests = [];
  var currentAssessment = null;
  var currentStudentName = '';
  var currentRollNo = '';
  var currentTestId = '';

  function init() {
    loadStudents();
  }

  function loadStudents() {
    google.script.run.withSuccessHandler(function(students) {
      allStudents = students || [];
      var sel  = document.getElementById('studentSelect');
      var hsel = document.getElementById('historyStudentSelect');
      
      sel.innerHTML  = '<option value="">Select a student...</option>';
      hsel.innerHTML = '<option value="">Select a student...</option>';
      
      allStudents.forEach(function(s) {
        var opt1 = document.createElement('option');
        opt1.value = s.name + '|' + s.rollNo;
        opt1.textContent = s.name + ' (' + s.rollNo + ')';
        sel.appendChild(opt1);
        
        var opt2 = document.createElement('option');
        opt2.value = s.name + '|' + s.rollNo;
        opt2.textContent = s.name + ' (' + s.rollNo + ')';
        hsel.appendChild(opt2);
      });
    }).dash_getStudentList();
  }

  function loadStudentTests() {
    var val = document.getElementById('studentSelect').value;
    if (!val) return;
    
    var parts = val.split('|');
    currentStudentName = parts[0];
    currentRollNo = parts[1];
    
    var testSel = document.getElementById('testSelect');
    testSel.style.display = 'block';
    testSel.innerHTML = '<option value="">Loading tests...</option>';
    
    google.script.run.withSuccessHandler(function(tests) {
      currentStudentTests = tests || [];
      testSel.innerHTML = '<option value="">Select a test...</option>';
      currentStudentTests.forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t.testId;
        opt.textContent = t.title + ' (' + t.date.substring(0,10) + ') - ' + Math.round(t.pct * 10) / 10 + '%';
        testSel.appendChild(opt);
      });
    }).dash_getStudentTests(currentStudentName, currentRollNo);
  }

  function loadAssessment() {
    currentTestId = document.getElementById('testSelect').value;
    if (!currentTestId) return;
    
    var container = document.getElementById('assessmentContainer');
    container.innerHTML = '<div class="loading"><span class="spinner"></span>Analyzing test...</div>';
    
    google.script.run.withSuccessHandler(function(assessment) {
      if (assessment.error) {
        container.innerHTML = '<div class="error">' + assessment.error + '</div>';
        return;
      }
      currentAssessment = assessment;
      container.innerHTML = renderAssessment(assessment);
    }).dash_getStudentAssessment(currentStudentName, currentRollNo, currentTestId);
  }

  function renderAssessment(a) {
    var html = '';
    
    // PERFORMANCE CARD
    var actualPct = a.totalQuestions > 0
      ? Math.round(a.correct / a.totalQuestions * 100 * 10) / 10
      : 0;
    
    html += '<div class="perf-card">';
    html += '<div class="perf-score">' + actualPct + '%</div>';
    html += '<div class="perf-grade">' + a.grade + '</div>';
    html += '<div class="perf-status"><span class="badge ' + (a.submission.status === 'PASS' ? 'badge-pass' : 'badge-fail') + '">' + a.submission.status + '</span></div>';
    html += '</div>';
    
    // STATS
    html += '<div class="stat-grid">';
    html += '<div class="stat-box"><div class="stat-label">Correct</div><div class="stat-value">' + a.correct + '/' + a.totalQuestions + '</div></div>';
    html += '<div class="stat-box"><div class="stat-label">Attempted</div><div class="stat-value">' + (a.correct + a.wrong) + '</div></div>';
    html += '<div class="stat-box"><div class="stat-label">Wrong</div><div class="stat-value">' + a.wrong + '</div></div>';
    html += '<div class="stat-box"><div class="stat-label">Skipped</div><div class="stat-value">' + a.skipped + '</div></div>';
    html += '</div>';

    // DOWNLOAD BUTTON
    html += '<button class="download-btn" onclick="downloadAssessment()">📥 DOWNLOAD ASSESSMENT CARD (PDF)</button>';
    
    // CHAPTER PERFORMANCE
    html += '<div class="section">';
    html += '<div class="section-title">📚 Chapter Performance (' + a.chapters.length + ' chapter' + (a.chapters.length !== 1 ? 's' : '') + ')</div>';
    
    a.chapters.forEach(function(ch) {
      var colorClass = ch.pct >= 70 ? 'color-strong' : ch.pct >= 50 ? 'color-good' : ch.pct >= 30 ? 'color-weak' : 'color-critical';
      var fillClass  = ch.pct >= 70 ? 'fill-strong'  : ch.pct >= 50 ? 'fill-good'  : ch.pct >= 30 ? 'fill-weak'  : 'fill-critical';
      var note = ch.pct >= 80 ? '✅ Master - Keep it up!'
               : ch.pct >= 60 ? '👍 Good - Room for improvement'
               : ch.pct >= 40 ? '⚠️  Needs Work - Focus here'
               : '🚨 Critical - Priority study area';
      
      html += '<div class="chapter-box ' + colorClass + '">';
      html += '<div class="chapter-name">' + ch.name + '</div>';
      html += '<div class="chapter-score"><span>' + ch.correct + '/' + ch.total + ' correct</span><span class="chapter-pct">' + ch.pct + '%</span></div>';
      html += '<div class="chapter-bar"><div class="chapter-fill ' + fillClass + '" style="width:' + ch.pct + '%"></div></div>';
      html += '<div class="chapter-note">' + note + '</div>';
      html += '</div>';
    });
    html += '</div>';
    
    // WRONG QUESTIONS — now shows actual option text
    if (a.wrongQuestions.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">❌ Wrong Answers (' + a.wrongQuestions.length + ')</div>';
      
      a.wrongQuestions.forEach(function(w) {
        html += '<div class="wrong-q">';
        html += '<div class="wrong-q-num">Q' + w.idx + ' — ' + w.ch + '</div>';
        html += '<div class="wrong-q-text"><strong>' + esc(w.q) + '</strong></div>';

        // ✅ Show actual options with highlights
        if (w.options && w.options.length > 0) {
          html += '<div class="opt-list">';
          w.options.forEach(function(opt, i) {
            var letter = String.fromCharCode(65 + i); // A, B, C, D
            var cls = '';
            if (letter === w.ans)    cls = 'correct-opt';
            if (letter === w.chosen && letter !== w.ans) cls = 'wrong-opt';
            html += '<div class="opt-line ' + cls + '">' + letter + ') ' + esc(opt);
            if (letter === w.ans)    html += ' ✅';
            if (letter === w.chosen && letter !== w.ans) html += ' ❌ (your answer)';
            html += '</div>';
          });
          html += '</div>';
        } else {
          html += '<div class="wrong-answer"><span class="wrong-answer-label">Your answer:</span> <span class="wrong-answer-val">' + w.chosen + '</span></div>';
          html += '<div class="wrong-answer"><span class="wrong-answer-label">Correct:</span> <span class="wrong-answer-val">' + w.ans + '</span></div>';
        }

        if (w.explanation) {
          html += '<div class="wrong-answer"><span class="wrong-answer-label">💡 Explanation:</span> ' + esc(w.explanation) + '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    }
    
    // CORRECT QUESTIONS
    if (a.correctQuestions.length > 0) {
      html += '<div class="section">';
      html += '<div class="section-title">✅ Correct Answers (' + a.correctQuestions.length + ')</div>';
      
      a.correctQuestions.forEach(function(c) {
        html += '<div class="correct-q">';
        html += '<div class="correct-q-num">Q' + c.idx + ' — ' + c.ch + '</div>';
        html += '<div style="font-size:11px;color:#4b5563;margin:4px 0;line-height:1.4;"><strong>' + esc(c.q) + '</strong></div>';
        html += '<div style="font-size:10px;color:#166534;">✅ Answer: ' + c.ans;
        if (c.options && c.options.length > 0) {
          var ansIdx = c.ans.charCodeAt(0) - 65;
          if (c.options[ansIdx]) html += ' — ' + esc(c.options[ansIdx]);
        }
        if (c.explanation) html += '<br>💡 ' + esc(c.explanation);
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    
    // RECOMMENDATIONS
    html += renderRecommendations(a);
    
    return html;
  }

  function renderRecommendations(a) {
    var html = '<div class="section"><div class="section-title">🎯 Study Recommendations</div>';
    
    var weakest = a.chapters[0];
    var strong  = a.chapters[a.chapters.length - 1];
    
    if (weakest && weakest.pct < 70) {
      html += '<div class="card">';
      html += '<div class="card-title">⚡ PRIORITY 1: ' + weakest.name + ' (' + weakest.pct + '%)</div>';
      html += '<div style="font-size:11px;color:#64748b;line-height:1.5;">';
      html += 'Focus on this area for quick improvement!<br>';
      html += '• Review chapter material thoroughly<br>';
      html += '• Practice all ' + weakest.total + ' questions in this chapter<br>';
      html += '• Target: Improve to 70%+ in next test<br>';
      html += '</div></div>';
    }
    
    if (strong && strong.pct >= 80) {
      html += '<div class="card">';
      html += '<div class="card-title">💪 MAINTAIN: ' + strong.name + ' (' + strong.pct + '%)</div>';
      html += '<div style="font-size:11px;color:#64748b;line-height:1.5;">';
      html += 'Excellent! Keep this level consistent.<br>';
      html += '• Review regularly to stay sharp<br>';
      html += '</div></div>';
    }
    
    html += '</div>';
    return html;
  }

  // ============================================================
  // DOWNLOAD PDF REPORT CARD
  // ============================================================
  function downloadAssessment() {
    if (!currentAssessment) {
      alert('Please load an assessment first');
      return;
    }

    var a = currentAssessment;
    var filename = currentStudentName.replace(/\s+/g, '_') + '_' + a.test.id + '_assessment.pdf';

    var html = '';
    html += '<html><head><style>';
    html += 'body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; }';
    html += 'h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }';
    html += 'h2 { color: #0f172a; margin-top: 25px; margin-bottom: 15px; border-left: 4px solid #1e40af; padding-left: 10px; }';
    html += '.header { background: #f0f5ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #1e40af; }';
    html += '.header-line { margin: 5px 0; font-size: 14px; }';
    html += '.college-name { font-size: 16px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }';
    html += '.scorecard { background: #1e40af; color: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }';
    html += '.score-big { font-size: 48px; font-weight: bold; }';
    html += '.grade-big { font-size: 28px; font-weight: bold; margin-top: 10px; }';
    html += '.chapter { margin: 15px 0; padding: 12px; border-left: 4px solid #1e40af; background: #f8fafc; }';
    html += '.chapter-bar { width: 100%; height: 10px; background: #e2e8f0; border-radius: 3px; margin: 8px 0; overflow: hidden; }';
    html += '.chapter-fill { height: 100%; background: #1e40af; }';
    html += '.question { margin: 15px 0; padding: 12px; background: #f8fafc; border-radius: 5px; }';
    html += '.question-num { font-weight: bold; color: #1e40af; font-size: 14px; margin-bottom: 5px; }';
    html += '.question-text { margin: 8px 0; font-size: 13px; }';
    html += '.options { margin: 10px 0; padding-left: 20px; font-size: 12px; }';
    html += '.option-line { margin: 4px 0; }';
    html += '.option-correct { color: #166534; font-weight: bold; }';
    html += '.option-wrong   { color: #991b1b; font-weight: bold; text-decoration: line-through; }';
    html += '.wrong-q { background: #fef2f2; padding: 12px; margin: 10px 0; border-left: 4px solid #dc2626; border-radius: 3px; }';
    html += '.correct-q { background: #f0fdf4; padding: 12px; margin: 10px 0; border-left: 4px solid #16a34a; border-radius: 3px; }';
    html += '.answer-info { margin: 8px 0; font-size: 12px; }';
    html += '.recommendation { background: #fffbeb; padding: 12px; margin: 12px 0; border-left: 4px solid #f59e0b; border-radius: 3px; }';
    html += '.page-break { page-break-after: always; margin: 30px 0; }';
    html += '.explanation { background: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 3px; font-size: 12px; }';
    html += '.footer { text-align: center; margin-top: 40px; color: #999; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 20px; }';
    html += '</style></head><body>';

    // HEADER
    html += '<h1>📊 Student Assessment Report</h1>';
    html += '<div class="header">';
    html += '<div class="college-name">📚 ' + a.college + '</div>';
    html += '<div class="header-line"><strong>Test:</strong> ' + a.test.title + '</div>';
    html += '<div class="header-line"><strong>Student:</strong> ' + a.student.name + '</div>';
    html += '<div class="header-line"><strong>Roll No:</strong> ' + a.student.rollNo + '</div>';
    html += '<div class="header-line"><strong>Test ID:</strong> ' + a.test.id + '</div>';
    html += '<div class="header-line"><strong>Date:</strong> ' + a.submission.date + '</div>';
    html += '</div>';

    // SCORECARD
    var correctPct = a.totalQuestions > 0 ? Math.round(a.correct / a.totalQuestions * 100 * 10) / 10 : 0;
    html += '<div class="scorecard">';
    html += '<div class="score-big">' + correctPct + '%</div>';
    html += '<div>' + a.correct + ' out of ' + a.totalQuestions + ' correct</div>';
    html += '<div>Wrong: ' + a.wrong + ' | Skipped: ' + a.skipped + '</div>';
    html += '<div class="grade-big">Grade: ' + a.grade + '</div>';
    html += '<div style="font-size: 16px; margin-top: 10px;">' + a.submission.status + '</div>';
    html += '</div>';

    // CHAPTER PERFORMANCE
    html += '<h2>📚 Chapter-wise Performance (' + a.chapters.length + ' chapters)</h2>';
    a.chapters.forEach(function(ch) {
      html += '<div class="chapter">';
      html += '<strong>' + ch.name + '</strong> — ' + ch.pct + '% (' + ch.correct + '/' + ch.total + ' correct)<br>';
      html += '<div class="chapter-bar"><div class="chapter-fill" style="width:' + ch.pct + '%"></div></div>';
      html += '</div>';
    });

    // WRONG ANSWERS
    if (a.wrongQuestions.length > 0) {
      html += '<div class="page-break"></div>';
      html += '<h2>❌ Wrong Answers (' + a.wrongQuestions.length + ')</h2>';
      a.wrongQuestions.forEach(function(w) {
        html += '<div class="wrong-q">';
        html += '<div class="question-num">Q' + w.idx + ' — ' + w.ch + '</div>';
        html += '<div class="question-text"><strong>' + escHtml(w.q) + '</strong></div>';
        
        // ✅ Show actual option text in PDF
        if (w.options && w.options.length > 0) {
          html += '<div class="options">';
          w.options.forEach(function(opt, i) {
            var letter = String.fromCharCode(65 + i);
            var cls = '';
            if (letter === w.ans)    cls = 'option-correct';
            if (letter === w.chosen && letter !== w.ans) cls = 'option-wrong';
            var mark = letter === w.ans ? ' ✅' : (letter === w.chosen && letter !== w.ans ? ' ❌' : '');
            html += '<div class="option-line ' + cls + '">' + letter + ') ' + escHtml(opt) + mark + '</div>';
          });
          html += '</div>';
        }

        html += '<div class="answer-info"><strong style="color:#dc2626;">Your Answer:</strong> ' + w.chosen + '</div>';
        html += '<div class="answer-info"><strong style="color:#16a34a;">Correct Answer:</strong> ' + w.ans + '</div>';
        if (w.explanation) {
          html += '<div class="explanation"><strong>💡 Explanation:</strong> ' + escHtml(w.explanation) + '</div>';
        }
        html += '</div>';
      });
    }

    // CORRECT ANSWERS
    if (a.correctQuestions.length > 0) {
      html += '<div class="page-break"></div>';
      html += '<h2>✅ Correct Answers (' + a.correctQuestions.length + ')</h2>';
      a.correctQuestions.forEach(function(c) {
        html += '<div class="correct-q">';
        html += '<div class="question-num">Q' + c.idx + ' — ' + c.ch + '</div>';
        html += '<div class="question-text"><strong>' + escHtml(c.q) + '</strong></div>';

        if (c.options && c.options.length > 0) {
          html += '<div class="options">';
          c.options.forEach(function(opt, i) {
            var letter = String.fromCharCode(65 + i);
            var cls = letter === c.ans ? 'option-correct' : '';
            html += '<div class="option-line ' + cls + '">' + letter + ') ' + escHtml(opt) + (letter === c.ans ? ' ✅' : '') + '</div>';
          });
          html += '</div>';
        }

        html += '<div class="answer-info"><strong style="color:#16a34a;">Correct Answer:</strong> ' + c.ans + '</div>';
        if (c.explanation) {
          html += '<div class="explanation"><strong>💡 Explanation:</strong> ' + escHtml(c.explanation) + '</div>';
        }
        html += '</div>';
      });
    }

    // RECOMMENDATIONS
    html += '<div class="page-break"></div>';
    html += '<h2>🎯 Personalized Study Recommendations</h2>';
    var weakest = a.chapters[0];
    if (weakest && weakest.pct < 70) {
      html += '<div class="recommendation">';
      html += '<strong>⚡ PRIORITY 1: ' + weakest.name + ' (' + weakest.pct + '%)</strong><br>';
      html += 'This is your weakest area. Focus here for maximum improvement!<br>';
      html += '• Review ' + weakest.name + ' material thoroughly<br>';
      html += '• Practice all ' + weakest.total + ' questions in this chapter<br>';
      html += '• Target: Improve to 70%+ in next test<br>';
      html += '</div>';
    }

    var strong = a.chapters[a.chapters.length - 1];
    if (strong && strong.pct >= 80) {
      html += '<div class="recommendation">';
      html += '<strong>💪 MAINTAIN: ' + strong.name + ' (' + strong.pct + '%)</strong><br>';
      html += 'Excellent performance! Keep this momentum.<br>';
      html += '• Review ' + strong.name + ' once a month<br>';
      html += '• This is your strength — leverage it!<br>';
      html += '</div>';
    }

    html += '<div class="footer">';
    html += 'Generated: ' + new Date().toLocaleString() + '<br>';
    html += 'Keep practicing and improving! 📚<br>';
    html += 'Next target: Aim for Grade A+ (90%+)';
    html += '</div>';

    html += '</body></html>';

    var element = document.createElement('div');
    element.innerHTML = html;

    var opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
  }

  // ============================================================
  // HISTORY TAB
  // ============================================================
  function loadStudentHistory() {
    var val = document.getElementById('historyStudentSelect').value;
    if (!val) return;
    
    var parts  = val.split('|');
    var name   = parts[0];
    var rollNo = parts[1];
    
    var container = document.getElementById('historyContainer');
    container.innerHTML = '<div class="loading"><span class="spinner"></span>Loading history...</div>';
    
    google.script.run.withSuccessHandler(function(tests) {
      if (!tests || tests.length === 0) {
        container.innerHTML = '<div class="empty-state">No test history found.</div>';
        return;
      }
      
      var html = '<div class="section">';
      tests.forEach(function(t, i) {
        var trend = i > 0 ? (t.pct > tests[i-1].pct ? '📈' : t.pct < tests[i-1].pct ? '📉' : '➡️') : '';
        html += '<div class="card">';
        html += '<div class="card-title">' + t.title + ' ' + trend + '</div>';
        html += '<div style="font-size:11px;color:#64748b;margin:4px 0">' + t.date + '</div>';
        html += '<div style="font-size:13px;font-weight:700;color:#1e40af;margin:4px 0">' + Math.round(t.pct * 10) / 10 + '% (' + t.score + '/' + t.total + ')</div>';
        html += '<div style="font-size:11px">' + (t.status === 'PASS' ? '✅ PASS' : '❌ FAIL') + '</div>';
        html += '</div>';
      });
      html += '</div>';
      container.innerHTML = html;
    }).dash_getStudentTests(name, rollNo);
  }

  // ============================================================
  // TAB SWITCHER
  // ============================================================
  function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById(tab).classList.add('active');
    event.target.classList.add('active');
  }

  // ============================================================
  // UTILS
  // ============================================================
  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function escHtml(str) {
    return esc(str);
  }

  init();
</script>

</body>
</html>`;
}