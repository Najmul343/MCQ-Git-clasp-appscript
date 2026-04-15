// ============================================================
// TeacherDB.gs  —  ITI QUIZ SYSTEM  —  TEACHER DASHBOARD (FINAL)
// ============================================================
// KEY FIX: Trade is now read from TEST_DATA (teacher-entered tradeClass)
// instead of RESULTS sheet (student-entered trade field).
// This ensures 100% match between test creation and dashboard filtering.
//
// Shareable URL format:
//   <webAppUrl>?dashboard=teacher&trade=Electrician
//
// Menu helper: Magic Quiz Generator → 👨‍🏫 Get Teacher Dashboard Link
// ============================================================

// ============ MENU HELPER ============
function openTeacherDashboardLink() {
  var ui = SpreadsheetApp.getUi();
  var webAppUrl = getWebAppUrl();
  if (!webAppUrl) {
    ui.alert('❌ Web App URL not set yet!\n\nGo to: Magic Quiz Generator → ⚙️ Set Web App URL');
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var testsSheet = ss.getSheetByName('ACTIVE TESTS');
  var trades = [];
  if (testsSheet && testsSheet.getLastRow() > 1) {
    var data = testsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var trade = data[i][3] ? data[i][3].toString().trim() : '';
      if (trade && trades.indexOf(trade) === -1) trades.push(trade);
    }
  }

  var tradeList = trades.length > 0
    ? 'Available trades/classes:\n' + trades.map(function(t, i) { return (i+1) + '. ' + t; }).join('\n')
    : 'No trades found yet. Create a test first.';

  var result = ui.prompt(
    '👨‍🏫 Get Teacher Dashboard Link',
    tradeList + '\n\nEnter the trade/class name exactly as shown above\n(e.g. Electrician, Plumber, COPA):',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;
  var trade = result.getResponseText().trim();
  if (!trade) { ui.alert('No trade entered.'); return; }

  var link = webAppUrl.replace(/\/$/, '') + '?dashboard=teacher&trade=' + encodeURIComponent(trade);
  ui.alert(
    '✅ Teacher Dashboard Link\n\nTrade: ' + trade + '\n\nShare this link with the teacher:\n\n' + link +
    '\n\nThe teacher can bookmark this link and open it anytime.'
  );
}

// ============ DATA AGGREGATOR ============
function getTeacherDashboardData(trade) {
  var ss = getSpreadsheet();
  if (!ss) return null;

  // --- CONFIG ---
  var config = { instituteName: 'Government ITI', instituteSubtitle: 'Industrial Training Institute' };
  var cfgSheet = ss.getSheetByName('CONFIG');
  if (cfgSheet) {
    cfgSheet.getDataRange().getValues().forEach(function(r) {
      if (r[0] === 'instituteName')     config.instituteName    = r[1] || config.instituteName;
      if (r[0] === 'instituteSubtitle') config.instituteSubtitle = r[1] || config.instituteSubtitle;
    });
  }

  // ----------------------------------------------------------------
  // STEP 1: Build a map of testId → tradeClass from TEST_DATA sheet.
  // This is the authoritative source — teacher entered it at test creation.
  // RESULTS sheet stores whatever the student typed, which may differ.
  // ----------------------------------------------------------------
  var testTradeMap = {};   // testId → tradeClass string
  var testTitleMap = {};   // testId → title string
  var tdSheet = ss.getSheetByName('TEST_DATA');
  if (tdSheet && tdSheet.getLastRow() > 1) {
    var tdData = tdSheet.getDataRange().getValues();
    for (var i = 1; i < tdData.length; i++) {
      var tid = tdData[i][0] ? tdData[i][0].toString().trim() : '';
      if (!tid) continue;
      try {
        var parsed = JSON.parse(tdData[i][1].toString());
        testTradeMap[tid] = (parsed.tradeClass || '').toString().trim();
        testTitleMap[tid] = (parsed.title      || '').toString().trim();
      } catch(e) {}
    }
  }

  // ----------------------------------------------------------------
  // STEP 2: Build column index map for RESULTS sheet dynamically.
  // ----------------------------------------------------------------
  var resSheet = ss.getSheetByName('RESULTS');
  var allResults = [];

  if (resSheet && resSheet.getLastRow() > 1) {
    var rData = resSheet.getDataRange().getValues();
    var hdr   = rData[0];

    function ci(name, fallback) {
      for (var c = 0; c < hdr.length; c++) {
        if ((hdr[c] || '').toString().trim() === name) return c;
      }
      return fallback;
    }

    var C_SUBID  = ci('Submission ID', 0);
    var C_TESTID = ci('Test ID',        1);
    var C_TITLE  = ci('Test Title',     2);
    var C_NAME   = ci('Student Name',   3);
    var C_ROLL   = ci('Roll No',        4);
    var C_CLASS  = ci('Class',          5);
    var C_TRADE  = ci('Trade',          6);
    var C_DATE   = ci('Submitted At',   7);
    var C_SCORE  = ci('Score',          8);
    var C_TOTAL  = ci('Total Marks',    9);
    var C_PCT    = ci('Percentage',    10);
    var C_STATUS = ci('Status',        11);
    var C_FSVIO  = ci('FS Violations', 12);
    var C_TABS   = ci('Tab Switches',  13);

    for (var j = 1; j < rData.length; j++) {
      var row = rData[j];
      if (!row[C_SUBID]) continue;

      // ---- KEY FIX: match by testId → tradeClass, NOT by row's trade column ----
      var rowTestId   = row[C_TESTID] ? row[C_TESTID].toString().trim() : '';
      var rowTrade    = testTradeMap[rowTestId] || '';   // teacher's value
      var tradeLower  = trade.toLowerCase();
      var rowTradeLow = rowTrade.toLowerCase();

      // Accept exact match or partial match (e.g. "Electrician" matches "Electrician — Sem 1")
      if (rowTradeLow.indexOf(tradeLower) === -1 && tradeLower.indexOf(rowTradeLow) === -1) continue;

      var pctRaw = parseFloat((row[C_PCT] || '0').toString().replace('%', '')) || 0;
      // Handle decimal form (e.g. 0.75 instead of 75)
      if (pctRaw > 0 && pctRaw < 1) pctRaw = pctRaw * 100;

      allResults.push({
        submissionId : (row[C_SUBID]  || '').toString(),
        testId       : rowTestId,
        testTitle    : testTitleMap[rowTestId] || (row[C_TITLE] || '').toString(),
        studentName  : (row[C_NAME]   || '').toString(),
        rollNo       : (row[C_ROLL]   || '').toString(),
        className    : (row[C_CLASS]  || '').toString(),
        trade        : rowTrade || (row[C_TRADE] || '').toString(),
        submittedAt  : (row[C_DATE]   || '').toString(),
        score        : parseFloat(row[C_SCORE])  || 0,
        totalMarks   : parseFloat(row[C_TOTAL])  || 0,
        percentage   : pctRaw,
        status       : (row[C_STATUS] || '').toString(),
        fsViolations : parseInt(row[C_FSVIO]) || 0,
        tabSwitches  : parseInt(row[C_TABS])  || 0
      });
    }
  }

  // ----------------------------------------------------------------
  // STEP 3: Tests from ACTIVE TESTS filtered by trade (same fix).
  // ----------------------------------------------------------------
  var allTests = [];
  var testsSheet = ss.getSheetByName('ACTIVE TESTS');
  if (testsSheet && testsSheet.getLastRow() > 1) {
    var tData = testsSheet.getDataRange().getValues();
    for (var k = 1; k < tData.length; k++) {
      var tr = tData[k];
      if (!tr[0]) continue;
      var tTrade    = (tr[3] || '').toString().trim();
      var tTradeLow = tTrade.toLowerCase();
      var tradeLow  = trade.toLowerCase();
      if (tTradeLow.indexOf(tradeLow) === -1 && tradeLow.indexOf(tTradeLow) === -1) continue;
      allTests.push({
        testId     : (tr[0] || '').toString(),
        title      : (tr[1] || '').toString(),
        teacher    : (tr[2] || '').toString(),
        trade      : tTrade,
        created    : (tr[4] || '').toString(),
        duration   : (tr[5] || '').toString(),
        questions  : parseInt(tr[6]) || 0,
        studentUrl : (tr[7] || '').toString(),
        status     : (tr[8] || 'Active').toString()
      });
    }
  }

  // ----------------------------------------------------------------
  // STEP 4: Compute all aggregated stats.
  // ----------------------------------------------------------------
  var totalStudents = allResults.length;
  var passCount     = allResults.filter(function(r) { return r.status === 'PASS'; }).length;
  var failCount     = allResults.filter(function(r) { return r.status === 'FAIL'; }).length;
  var avgPct        = totalStudents > 0
    ? (allResults.reduce(function(s, r) { return s + r.percentage; }, 0) / totalStudents).toFixed(1)
    : 0;
  var passRate  = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 0;
  var highScore = totalStudents > 0 ? Math.max.apply(null, allResults.map(function(r) { return r.percentage; })).toFixed(1) : 0;
  var lowScore  = totalStudents > 0 ? Math.min.apply(null, allResults.map(function(r) { return r.percentage; })).toFixed(1) : 0;

  // Unique students
  var studentMap = {};
  allResults.forEach(function(r) {
    var key = (r.rollNo || r.studentName).toString().trim().toLowerCase();
    if (!studentMap[key]) studentMap[key] = { name: r.studentName, rollNo: r.rollNo, className: r.className, trade: r.trade, tests: [], totalPct: 0 };
    studentMap[key].tests.push(r);
    studentMap[key].totalPct += r.percentage;
  });
  var uniqueStudents = Object.values(studentMap).map(function(s) {
    return {
      name      : s.name,
      rollNo    : s.rollNo,
      className : s.className,
      trade     : s.trade,
      testCount : s.tests.length,
      avgPct    : s.tests.length > 0 ? (s.totalPct / s.tests.length).toFixed(1) : 0,
      passCount : s.tests.filter(function(t) { return t.status === 'PASS'; }).length,
      failCount : s.tests.filter(function(t) { return t.status === 'FAIL'; }).length,
      bestPct   : Math.max.apply(null, s.tests.map(function(t) { return t.percentage; })).toFixed(1),
      results   : s.tests
    };
  }).sort(function(a, b) { return parseFloat(b.avgPct) - parseFloat(a.avgPct); });

  // Per-test stats
  var testMap = {};
  allResults.forEach(function(r) {
    if (!testMap[r.testId]) testMap[r.testId] = { title: r.testTitle, pass: 0, fail: 0, total: 0, scoreSum: 0 };
    testMap[r.testId].total++;
    testMap[r.testId].scoreSum += r.percentage;
    if (r.status === 'PASS') testMap[r.testId].pass++;
    else testMap[r.testId].fail++;
  });
  var testStats = Object.keys(testMap).map(function(tid) {
    var d = testMap[tid];
    return {
      testId   : tid,
      title    : d.title,
      total    : d.total,
      pass     : d.pass,
      fail     : d.fail,
      passRate : d.total > 0 ? ((d.pass / d.total) * 100).toFixed(1) : 0,
      avgScore : d.total > 0 ? (d.scoreSum / d.total).toFixed(1) : 0
    };
  }).sort(function(a, b) { return b.total - a.total; });

  // Score distribution buckets
  var buckets = [0, 0, 0, 0, 0];
  allResults.forEach(function(r) {
    var p = r.percentage;
    if      (p < 40) buckets[0]++;
    else if (p < 60) buckets[1]++;
    else if (p < 75) buckets[2]++;
    else if (p < 90) buckets[3]++;
    else             buckets[4]++;
  });

  // Integrity flags
  var integrityFlags = allResults.filter(function(r) {
    return r.fsViolations > 0 || r.tabSwitches > 1;
  }).sort(function(a, b) {
    return (b.fsViolations + b.tabSwitches) - (a.fsViolations + a.tabSwitches);
  }).slice(0, 30);

  var recentActivity = allResults.slice().reverse().slice(0, 20);
  var topScorers     = allResults.slice().sort(function(a, b) { return b.percentage - a.percentage; }).slice(0, 10);
  var bottomScorers  = allResults.slice().sort(function(a, b) { return a.percentage - b.percentage; }).slice(0, 5);

  return {
    trade          : trade,
    config         : config,
    summary        : { totalStudents, passCount, failCount, avgPct, passRate, highScore, lowScore, totalTests: allTests.length },
    uniqueStudents : uniqueStudents,
    testStats      : testStats,
    allTests       : allTests,
    buckets        : buckets,
    integrityFlags : integrityFlags,
    recentActivity : recentActivity,
    topScorers     : topScorers,
    bottomScorers  : bottomScorers,
    allResults     : allResults
  };
}

// ============ HTML BUILDER ============
function buildTeacherDashboardHtml(d) {
  var dataJson = JSON.stringify(d);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teacher Dashboard</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --blue:#1a56db;--green:#059669;--red:#dc2626;--amber:#d97706;--purple:#7c3aed;--teal:#0891b2;
  --bg:#f0f4f8;--card:#fff;--border:#e2e8f0;--text:#1e293b;--muted:#64748b;
  --font:'Plus Jakarta Sans',sans-serif;--mono:'JetBrains Mono',monospace;
  --r:14px;--shadow:0 1px 3px rgba(0,0,0,.07),0 4px 16px rgba(0,0,0,.06);
}
body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:13px;line-height:1.5;}

.hdr{background:linear-gradient(130deg,#0b1437 0%,#1a56db 60%,#059669 100%);color:white;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(11,20,55,.3);}
.hdr-left{display:flex;align-items:center;gap:14px;}
.hdr-icon{width:44px;height:44px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;}
.hdr-title{font-size:17px;font-weight:800;}
.hdr-sub{font-size:11px;opacity:.75;margin-top:1px;}
.hdr-trade{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 16px;font-size:12px;font-weight:700;}

.tab-bar{background:white;border-bottom:1px solid var(--border);display:flex;gap:0;padding:0 24px;overflow-x:auto;position:sticky;top:80px;z-index:90;box-shadow:0 2px 8px rgba(0,0,0,.05);}
.tab-bar::-webkit-scrollbar{display:none;}
.tab-btn{background:none;border:none;border-bottom:3px solid transparent;padding:13px 18px;font:600 12px var(--font);color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .15s;display:flex;align-items:center;gap:6px;}
.tab-btn:hover{color:var(--blue);}
.tab-btn.active{color:var(--blue);border-bottom-color:var(--blue);}

.main{padding:22px 24px 40px;}
.tab-pane{display:none;}
.tab-pane.active{display:block;}

.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:22px;}
.stat-card{background:var(--card);border-radius:var(--r);padding:18px 20px;box-shadow:var(--shadow);border:1px solid var(--border);display:flex;flex-direction:column;gap:6px;position:relative;overflow:hidden;transition:transform .15s;}
.stat-card:hover{transform:translateY(-2px);}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.sc-blue::before{background:var(--blue);}
.sc-green::before{background:var(--green);}
.sc-red::before{background:var(--red);}
.sc-amber::before{background:var(--amber);}
.sc-purple::before{background:var(--purple);}
.sc-teal::before{background:var(--teal);}
.stat-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;}
.stat-value{font-size:28px;font-weight:800;line-height:1.1;font-family:var(--mono);}
.sv-blue{color:var(--blue);}
.sv-green{color:var(--green);}
.sv-red{color:var(--red);}
.sv-amber{color:var(--amber);}
.sv-purple{color:var(--purple);}
.sv-teal{color:var(--teal);}
.stat-sub{font-size:10.5px;color:var(--muted);}

/* Empty state */
.empty-dash{text-align:center;padding:60px 20px;color:var(--muted);}
.empty-dash .ei{font-size:48px;margin-bottom:14px;}
.empty-dash .et{font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;}
.empty-dash .es{font-size:13px;}

.card{background:var(--card);border-radius:var(--r);box-shadow:var(--shadow);border:1px solid var(--border);overflow:hidden;margin-bottom:18px;}
.card-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);background:#fafbff;}
.card-title{font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;}
.card-badge{background:var(--blue);color:white;border-radius:20px;padding:1px 9px;font-size:10px;font-weight:700;}
.card-body{padding:18px 20px;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:18px;}

.data-table{width:100%;border-collapse:collapse;font-size:12px;}
.data-table th{background:#f1f5f9;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;}
.data-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:hover td{background:#f8faff;}
.mono{font-family:var(--mono);font-size:11px;}

.badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;}
.badge-pass{background:#dcfce7;color:#15803d;}
.badge-fail{background:#fee2e2;color:#b91c1c;}
.badge-active{background:#dbeafe;color:#1d4ed8;}
.badge-warn{background:#fef3c7;color:#92400e;}

.progress-wrap{height:7px;background:#e2e8f0;border-radius:99px;overflow:hidden;}
.progress-fill{height:100%;border-radius:99px;transition:width .5s;}
.pf-green{background:var(--green);}
.pf-blue{background:var(--blue);}
.pf-red{background:var(--red);}
.pf-amber{background:var(--amber);}

.rank{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
.r1{background:#fef9c3;color:#854d0e;}
.r2{background:#f1f5f9;color:#475569;}
.r3{background:#fef3c7;color:#92400e;}
.rn{background:#f0f4f8;color:var(--muted);font-size:10px;}

.score-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.score-bar-label{font-size:11px;width:90px;color:var(--muted);}
.score-bar-track{flex:1;height:20px;background:#e2e8f0;border-radius:5px;overflow:hidden;}
.score-bar-fill{height:100%;border-radius:5px;display:flex;align-items:center;padding-left:8px;font-size:10px;font-weight:700;color:white;}
.score-bar-count{font-size:11px;font-family:var(--mono);color:var(--muted);width:24px;text-align:right;}

.search-row{display:flex;gap:10px;margin-bottom:14px;}
.search-row input,.search-row select{padding:9px 14px;border:1.5px solid var(--border);border-radius:8px;font:13px var(--font);transition:border .15s;background:white;}
.search-row input{flex:1;}
.search-row input:focus,.search-row select:focus{border-color:var(--blue);outline:none;}

.ring-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 0 10px;}
.ring-container{position:relative;width:110px;height:110px;}
.ring-svg{transform:rotate(-90deg);}
.ring-bg{fill:none;stroke:#e2e8f0;stroke-width:10;}
.ring-pass{fill:none;stroke:var(--green);stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1s ease;}
.ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ring-pct{font-size:20px;font-weight:800;color:var(--green);font-family:var(--mono);}
.ring-lbl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;}
.ring-sub{font-size:11px;color:var(--muted);margin-top:10px;}

#studentModal{display:none;position:fixed;inset:0;z-index:999;background:rgba(11,20,55,.6);align-items:center;justify-content:center;padding:20px;}
#studentModal.show{display:flex;}
.smod-box{background:white;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:popIn .2s ease;}
@keyframes popIn{from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);}}
.smod-hdr{background:linear-gradient(130deg,#0b1437,#1a56db);color:white;padding:22px 26px;border-radius:16px 16px 0 0;}
.smod-title{font-size:17px;font-weight:800;}
.smod-sub{font-size:11px;opacity:.75;margin-top:2px;}
.smod-body{padding:22px 26px;}
.smod-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.smod-stat{text-align:center;background:#f8faff;border-radius:10px;padding:12px;}
.smod-stat .val{font-size:22px;font-weight:800;font-family:var(--mono);}
.smod-stat .lbl{font-size:10px;color:var(--muted);text-transform:uppercase;margin-top:2px;}
.smod-close{width:100%;padding:11px;background:var(--blue);color:white;border:none;border-radius:10px;font:700 13px var(--font);cursor:pointer;margin-top:10px;}
.smod-close:hover{background:#1348b8;}

.vcount{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--red);}
.empty-state{text-align:center;padding:50px 20px;color:var(--muted);}
.empty-icon{font-size:40px;margin-bottom:10px;}
.empty-text{font-size:14px;font-weight:600;}
.empty-sub{font-size:12px;margin-top:4px;}

::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-thumb{background:#c1c9d4;border-radius:3px;}

@media(max-width:700px){.two-col{grid-template-columns:1fr;}.stat-grid{grid-template-columns:1fr 1fr;}}
</style>
</head>
<body>

<div class="hdr">
  <div class="hdr-left">
    <div class="hdr-icon">👨‍🏫</div>
    <div>
      <div class="hdr-title" id="hdrInstitute">—</div>
      <div class="hdr-sub" id="hdrSub">Teacher Dashboard</div>
    </div>
  </div>
  <div class="hdr-trade" id="hdrTrade">—</div>
</div>

<div class="tab-bar">
  <button class="tab-btn active" onclick="switchTab('overview')">📊 Overview</button>
  <button class="tab-btn" onclick="switchTab('students')">🎓 Students</button>
  <button class="tab-btn" onclick="switchTab('tests')">📝 Tests</button>
  <button class="tab-btn" onclick="switchTab('performance')">📈 Performance</button>
  <button class="tab-btn" onclick="switchTab('integrity')">🛡 Integrity</button>
  <button class="tab-btn" onclick="switchTab('recent')">🕐 Recent</button>
</div>

<div class="main">

  <!-- OVERVIEW -->
  <div class="tab-pane active" id="tab-overview">
    <div class="stat-grid">
      <div class="stat-card sc-blue"><div class="stat-label">Total Submissions</div><div class="stat-value sv-blue" id="st-total">0</div><div class="stat-sub">All attempts</div></div>
      <div class="stat-card sc-green"><div class="stat-label">Passed</div><div class="stat-value sv-green" id="st-pass">0</div><div class="stat-sub" id="st-passrate">—% pass rate</div></div>
      <div class="stat-card sc-red"><div class="stat-label">Failed</div><div class="stat-value sv-red" id="st-fail">0</div><div class="stat-sub">Need attention</div></div>
      <div class="stat-card sc-amber"><div class="stat-label">Class Avg</div><div class="stat-value sv-amber" id="st-avg">0%</div><div class="stat-sub">Average score</div></div>
      <div class="stat-card sc-purple"><div class="stat-label">Unique Students</div><div class="stat-value sv-purple" id="st-students">0</div><div class="stat-sub">Distinct roll nos</div></div>
      <div class="stat-card sc-teal"><div class="stat-label">Tests Created</div><div class="stat-value sv-teal" id="st-tests">0</div><div class="stat-sub">For this trade</div></div>
    </div>

    <div id="noDataBanner" style="display:none;" class="empty-dash">
      <div class="ei">📭</div>
      <div class="et">No submissions yet for this trade</div>
      <div class="es">Share the test links with students. Once they submit, data will appear here.</div>
    </div>

    <div id="overviewCharts">
      <div class="two-col">
        <div class="card">
          <div class="card-header"><div class="card-title">📊 Score Distribution</div></div>
          <div class="card-body" id="distBars"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">🎯 Pass Rate</div></div>
          <div class="card-body">
            <div class="ring-wrap">
              <div class="ring-container">
                <svg class="ring-svg" width="110" height="110" viewBox="0 0 110 110">
                  <circle class="ring-bg" cx="55" cy="55" r="45"/>
                  <circle class="ring-pass" id="ringCircle" cx="55" cy="55" r="45" stroke-dasharray="282.6" stroke-dashoffset="282.6"/>
                </svg>
                <div class="ring-center">
                  <div class="ring-pct" id="ringPct">0%</div>
                  <div class="ring-lbl">Pass Rate</div>
                </div>
              </div>
              <div class="ring-sub" id="ringLabel">—</div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
              <div style="text-align:center;"><div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--green)" id="highScore">0%</div><div style="font-size:10px;color:var(--muted)">Highest</div></div>
              <div style="text-align:center;"><div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--amber)" id="avgScore2">0%</div><div style="font-size:10px;color:var(--muted)">Average</div></div>
              <div style="text-align:center;"><div style="font-size:18px;font-weight:800;font-family:var(--mono);color:var(--red)" id="lowScore">0%</div><div style="font-size:10px;color:var(--muted)">Lowest</div></div>
            </div>
          </div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-header"><div class="card-title">🏆 Top Scorers</div></div>
          <div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>#</th><th>Student</th><th>Score %</th><th>Test</th></tr></thead><tbody id="topBody"></tbody></table></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ Needs Attention</div></div>
          <div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>#</th><th>Student</th><th>Score %</th><th>Test</th></tr></thead><tbody id="bottomBody"></tbody></table></div>
        </div>
      </div>
    </div>
  </div>

  <!-- STUDENTS -->
  <div class="tab-pane" id="tab-students">
    <div class="search-row">
      <input type="text" id="stuSearch" placeholder="🔍 Search name, roll no..." oninput="filterStudents()">
      <select id="stuStatus" onchange="filterStudents()">
        <option value="">All Results</option>
        <option value="pass">Mostly Passing</option>
        <option value="fail">Mostly Failing</option>
      </select>
    </div>
    <div class="card">
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Class</th><th>Tests</th><th>Avg %</th><th>Best %</th><th>Pass</th><th>Fail</th><th>Details</th></tr></thead>
          <tbody id="studentsBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TESTS -->
  <div class="tab-pane" id="tab-tests">
    <div class="card">
      <div class="card-header"><div class="card-title">📝 Tests for this Trade <span class="card-badge" id="testsBadge">0</span></div></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Teacher</th><th>Created</th><th>Duration</th><th>Qs</th><th>Appeared</th><th>Avg %</th><th>Pass Rate</th><th>Status</th></tr></thead>
          <tbody id="testsBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- PERFORMANCE -->
  <div class="tab-pane" id="tab-performance">
    <div class="card">
      <div class="card-header"><div class="card-title">📈 Per-Test Performance</div></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>#</th><th>Test Title</th><th>Appeared</th><th>Passed</th><th>Failed</th><th>Avg %</th><th>Pass Rate</th></tr></thead>
          <tbody id="perfBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- INTEGRITY -->
  <div class="tab-pane" id="tab-integrity">
    <div class="card">
      <div class="card-header">
        <div class="card-title">🛡 Integrity Flags</div>
        <span class="badge badge-warn" id="intCount">0 flagged</span>
      </div>
      <div class="card-body" style="padding-top:8px;font-size:12px;color:var(--muted);margin-bottom:4px;">Students with fullscreen exits or more than 1 tab switch during test.</div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Test</th><th>FS Exits</th><th>Tab Switches</th><th>Score %</th><th>Status</th></tr></thead>
          <tbody id="integrityBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- RECENT -->
  <div class="tab-pane" id="tab-recent">
    <div class="card">
      <div class="card-header"><div class="card-title">🕐 Recent Submissions <span class="card-badge" id="recentBadge">0</span></div></div>
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr><th>Student</th><th>Roll No</th><th>Test</th><th>Score</th><th>%</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody id="recentBody"></tbody>
        </table>
      </div>
    </div>
  </div>

</div>

<!-- STUDENT MODAL -->
<div id="studentModal">
  <div class="smod-box">
    <div class="smod-hdr">
      <div class="smod-title" id="smodName">—</div>
      <div class="smod-sub" id="smodInfo">—</div>
    </div>
    <div class="smod-body">
      <div class="smod-stats">
        <div class="smod-stat"><div class="val sv-blue" id="smodTests">0</div><div class="lbl">Tests Taken</div></div>
        <div class="smod-stat"><div class="val sv-amber" id="smodAvg">0%</div><div class="lbl">Avg Score</div></div>
        <div class="smod-stat"><div class="val sv-green" id="smodPass">0</div><div class="lbl">Passed</div></div>
        <div class="smod-stat"><div class="val sv-red" id="smodFail">0</div><div class="lbl">Failed</div></div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">All Test Results</div>
      <table class="data-table" style="font-size:12px;">
        <thead><tr><th>Test</th><th>Score</th><th>%</th><th>Status</th><th>Date</th><th>FS</th><th>Tabs</th></tr></thead>
        <tbody id="smodResultsBody"></tbody>
      </table>
      <button class="smod-close" onclick="closeStudentModal()">✕ Close</button>
    </div>
  </div>
</div>

<script>
var DB = ${dataJson};
var filteredStudents = [];

window.onload = function() {
  document.getElementById('hdrInstitute').textContent = DB.config.instituteName;
  document.getElementById('hdrSub').textContent       = DB.config.instituteSubtitle + ' — Teacher Dashboard';
  document.getElementById('hdrTrade').textContent     = '🔧 ' + DB.trade;

  renderSummary();
  renderDistribution();
  renderPassRing();
  renderTopBottom();
  renderStudents();
  renderTests();
  renderPerformance();
  renderIntegrity();
  renderRecent();

  // Show empty state banner if no submissions
  if (DB.summary.totalStudents === 0) {
    document.getElementById('noDataBanner').style.display = 'block';
    document.getElementById('overviewCharts').style.display = 'none';
  }
};

function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
  document.getElementById('tab-' + name).classList.add('active');
  var map = {overview:0,students:1,tests:2,performance:3,integrity:4,recent:5};
  document.querySelectorAll('.tab-btn')[map[name]].classList.add('active');
}

function renderSummary() {
  var s = DB.summary;
  document.getElementById('st-total').textContent    = s.totalStudents;
  document.getElementById('st-pass').textContent     = s.passCount;
  document.getElementById('st-fail').textContent     = s.failCount;
  document.getElementById('st-avg').textContent      = s.avgPct + '%';
  document.getElementById('st-students').textContent = DB.uniqueStudents.length;
  document.getElementById('st-tests').textContent    = s.totalTests;
  document.getElementById('st-passrate').textContent = s.passRate + '% pass rate';
  document.getElementById('highScore').textContent   = s.highScore + '%';
  document.getElementById('avgScore2').textContent   = s.avgPct + '%';
  document.getElementById('lowScore').textContent    = s.lowScore + '%';
}

function renderDistribution() {
  var b = DB.buckets;
  var total = b.reduce(function(a,v){ return a+v; }, 0);
  var labels = ['< 40 (Fail)','40–59','60–74','75–89','90+'];
  var colors = ['#dc2626','#d97706','#2563eb','#0891b2','#059669'];
  var max = Math.max.apply(null, b) || 1;
  var html = '';
  if (!total) {
    html = '<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No results yet</div></div>';
  } else {
    b.forEach(function(count, i) {
      var w = Math.round((count/max)*100);
      html += '<div class="score-bar-row">' +
        '<div class="score-bar-label">' + labels[i] + '</div>' +
        '<div class="score-bar-track"><div class="score-bar-fill" style="width:' + w + '%;background:' + colors[i] + '">' + (count>0?count:'') + '</div></div>' +
        '<div class="score-bar-count">' + count + '</div>' +
      '</div>';
    });
  }
  document.getElementById('distBars').innerHTML = html;
}

function renderPassRing() {
  var rate = parseFloat(DB.summary.passRate) || 0;
  var offset = 282.6 * (1 - rate/100);
  document.getElementById('ringCircle').style.strokeDashoffset = offset;
  document.getElementById('ringPct').textContent = rate + '%';
  document.getElementById('ringLabel').textContent = DB.summary.passCount + ' passed / ' + DB.summary.failCount + ' failed';
}

function renderTopBottom() {
  var topRows = DB.topScorers || [];
  var botRows = DB.bottomScorers || [];
  var rankCls = function(i){ return i===0?'r1':i===1?'r2':i===2?'r3':'rn'; };
  var rankTxt = function(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1); };

  document.getElementById('topBody').innerHTML = topRows.length
    ? topRows.map(function(r,i){
        return '<tr><td><div class="rank ' + rankCls(i) + '">' + rankTxt(i) + '</div></td>' +
          '<td><strong>' + esc(r.studentName) + '</strong><br><small style="color:var(--muted)">' + esc(r.rollNo) + '</small></td>' +
          '<td><strong class="mono">' + r.percentage.toFixed(1) + '%</strong></td>' +
          '<td style="font-size:11px;color:var(--muted)">' + esc(r.testTitle) + '</td></tr>';
      }).join('') : emptyRow(4);

  document.getElementById('bottomBody').innerHTML = botRows.length
    ? botRows.map(function(r,i){
        return '<tr><td><div class="rank rn">' + (i+1) + '</div></td>' +
          '<td><strong>' + esc(r.studentName) + '</strong><br><small style="color:var(--muted)">' + esc(r.rollNo) + '</small></td>' +
          '<td><strong class="mono" style="color:var(--red)">' + r.percentage.toFixed(1) + '%</strong></td>' +
          '<td style="font-size:11px;color:var(--muted)">' + esc(r.testTitle) + '</td></tr>';
      }).join('') : emptyRow(4);
}

filteredStudents = (DB.uniqueStudents || []).slice();
function renderStudents() {
  var tbody = document.getElementById('studentsBody');
  if (!filteredStudents.length) { tbody.innerHTML = emptyRow(10); return; }
  tbody.innerHTML = filteredStudents.map(function(s, i) {
    var avg = parseFloat(s.avgPct);
    var col = avg >= 75 ? 'pf-green' : avg >= 40 ? 'pf-blue' : 'pf-red';
    return '<tr>' +
      '<td>' + (i+1) + '</td>' +
      '<td><strong>' + esc(s.name) + '</strong></td>' +
      '<td class="mono">' + esc(s.rollNo) + '</td>' +
      '<td>' + esc(s.className) + '</td>' +
      '<td class="mono">' + s.testCount + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:6px;"><div class="progress-wrap" style="width:60px"><div class="progress-fill ' + col + '" style="width:' + Math.min(avg,100) + '%"></div></div><strong class="mono">' + s.avgPct + '%</strong></div></td>' +
      '<td class="mono">' + s.bestPct + '%</td>' +
      '<td class="mono" style="color:var(--green)">' + s.passCount + '</td>' +
      '<td class="mono" style="color:var(--red)">' + s.failCount + '</td>' +
      '<td><button onclick="openStudentModal(' + i + ')" style="background:var(--blue);color:white;border:none;border-radius:6px;padding:4px 10px;font:600 11px var(--font);cursor:pointer;">View</button></td>' +
    '</tr>';
  }).join('');
}

function filterStudents() {
  var q  = document.getElementById('stuSearch').value.toLowerCase();
  var st = document.getElementById('stuStatus').value;
  filteredStudents = (DB.uniqueStudents || []).filter(function(s) {
    var mq = !q || (s.name + s.rollNo + s.className).toLowerCase().indexOf(q) !== -1;
    var ms = !st
      || (st === 'pass' && s.passCount >= s.failCount)
      || (st === 'fail' && s.failCount > s.passCount);
    return mq && ms;
  });
  renderStudents();
}

function openStudentModal(idx) {
  var s = filteredStudents[idx];
  document.getElementById('smodName').textContent = s.name;
  document.getElementById('smodInfo').textContent = 'Roll: ' + s.rollNo + (s.className ? ' | ' + s.className : '') + ' | ' + s.trade;
  document.getElementById('smodTests').textContent = s.testCount;
  document.getElementById('smodAvg').textContent   = s.avgPct + '%';
  document.getElementById('smodPass').textContent  = s.passCount;
  document.getElementById('smodFail').textContent  = s.failCount;
  document.getElementById('smodResultsBody').innerHTML = (s.results || []).map(function(r) {
    var col = r.status === 'PASS' ? 'badge-pass' : 'badge-fail';
    return '<tr>' +
      '<td>' + esc(r.testTitle) + '</td>' +
      '<td class="mono">' + r.score + '/' + r.totalMarks + '</td>' +
      '<td class="mono"><strong>' + r.percentage.toFixed(1) + '%</strong></td>' +
      '<td><span class="badge ' + col + '">' + r.status + '</span></td>' +
      '<td style="font-size:11px;color:var(--muted)">' + esc(r.submittedAt) + '</td>' +
      '<td class="mono" style="color:var(--red)">' + r.fsViolations + '</td>' +
      '<td class="mono" style="color:var(--amber)">' + r.tabSwitches + '</td>' +
    '</tr>';
  }).join('');
  document.getElementById('studentModal').classList.add('show');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('show');
}
document.getElementById('studentModal').addEventListener('click', function(e) {
  if (e.target === this) closeStudentModal();
});

function renderTests() {
  var rows = DB.allTests || [];
  document.getElementById('testsBadge').textContent = rows.length;
  var testResultMap = {};
  (DB.testStats || []).forEach(function(t){ testResultMap[t.testId] = t; });
  var tbody = document.getElementById('testsBody');
  if (!rows.length) { tbody.innerHTML = emptyRow(9); return; }
  tbody.innerHTML = rows.map(function(r) {
    var ts = testResultMap[r.testId] || {};
    var pct = parseFloat(ts.passRate) || 0;
    var col = pct >= 75 ? 'pf-green' : pct >= 50 ? 'pf-amber' : 'pf-red';
    return '<tr>' +
      '<td><strong>' + esc(r.title) + '</strong></td>' +
      '<td>' + esc(r.teacher) + '</td>' +
      '<td style="font-size:11px">' + esc(r.created) + '</td>' +
      '<td>' + esc(r.duration) + '</td>' +
      '<td class="mono">' + r.questions + '</td>' +
      '<td class="mono">' + (ts.total || 0) + '</td>' +
      '<td class="mono">' + (ts.avgScore || '—') + (ts.avgScore ? '%' : '') + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:6px;"><div class="progress-wrap" style="width:60px"><div class="progress-fill ' + col + '" style="width:' + pct + '%"></div></div><span class="mono">' + (ts.passRate || '—') + (ts.passRate ? '%' : '') + '</span></div></td>' +
      '<td><span class="badge ' + (r.status==='Active'?'badge-active':'badge-warn') + '">' + esc(r.status) + '</span></td>' +
    '</tr>';
  }).join('');
}

function renderPerformance() {
  var rows = DB.testStats || [];
  var tbody = document.getElementById('perfBody');
  if (!rows.length) { tbody.innerHTML = emptyRow(7); return; }
  tbody.innerHTML = rows.map(function(r, i) {
    var pct = parseFloat(r.passRate);
    var col = pct >= 75 ? 'pf-green' : pct >= 50 ? 'pf-amber' : 'pf-red';
    return '<tr>' +
      '<td>' + (i+1) + '</td>' +
      '<td><strong>' + esc(r.title) + '</strong></td>' +
      '<td class="mono">' + r.total + '</td>' +
      '<td class="mono" style="color:var(--green)">' + r.pass + '</td>' +
      '<td class="mono" style="color:var(--red)">' + r.fail + '</td>' +
      '<td class="mono"><strong>' + r.avgScore + '%</strong></td>' +
      '<td><div style="display:flex;align-items:center;gap:8px;"><div class="progress-wrap" style="width:80px"><div class="progress-fill ' + col + '" style="width:' + pct + '%"></div></div><span class="mono">' + r.passRate + '%</span></div></td>' +
    '</tr>';
  }).join('');
}

function renderIntegrity() {
  var rows = DB.integrityFlags || [];
  document.getElementById('intCount').textContent = rows.length + ' flagged';
  var tbody = document.getElementById('integrityBody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">No integrity flags</div><div class="empty-sub">All students maintained exam discipline</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function(r, i) {
    return '<tr>' +
      '<td>' + (i+1) + '</td>' +
      '<td><strong>' + esc(r.studentName) + '</strong></td>' +
      '<td class="mono">' + esc(r.rollNo) + '</td>' +
      '<td>' + esc(r.testTitle) + '</td>' +
      '<td><span class="vcount">' + r.fsViolations + '</span></td>' +
      '<td><span class="vcount">' + r.tabSwitches + '</span></td>' +
      '<td class="mono">' + r.percentage.toFixed(1) + '%</td>' +
      '<td><span class="badge ' + (r.status==='PASS'?'badge-pass':'badge-fail') + '">' + r.status + '</span></td>' +
    '</tr>';
  }).join('');
}

function renderRecent() {
  var rows = DB.recentActivity || [];
  document.getElementById('recentBadge').textContent = rows.length;
  var tbody = document.getElementById('recentBody');
  if (!rows.length) { tbody.innerHTML = emptyRow(7); return; }
  tbody.innerHTML = rows.map(function(r) {
    return '<tr>' +
      '<td><strong>' + esc(r.studentName) + '</strong></td>' +
      '<td class="mono">' + esc(r.rollNo) + '</td>' +
      '<td>' + esc(r.testTitle) + '</td>' +
      '<td class="mono">' + r.score + '/' + r.totalMarks + '</td>' +
      '<td class="mono"><strong>' + r.percentage.toFixed(1) + '%</strong></td>' +
      '<td><span class="badge ' + (r.status==='PASS'?'badge-pass':'badge-fail') + '">' + r.status + '</span></td>' +
      '<td style="font-size:11px;color:var(--muted)">' + esc(r.submittedAt) + '</td>' +
    '</tr>';
  }).join('');
}

function esc(s) {
  if (!s) return '—';
  return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function emptyRow(cols) {
  return '<tr><td colspan="' + cols + '"><div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No data yet</div></div></td></tr>';
}
</script>
</body>
</html>`;
}