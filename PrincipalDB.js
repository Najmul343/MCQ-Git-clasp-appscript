// ============================================================
// PrincipalDashboard.gs — ITI PRINCIPAL ERP DASHBOARD
// Same project as Magic Quiz Generator
// Approach: All data aggregated server-side, injected into HTML
// Opens via: Menu → 🏫 Principal Dashboard
//        OR: Web App URL ?view=principal
// ============================================================

// ── MENU ENTRY POINT ──────────────────────────────────────
function openPrincipalDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('CONFIG')) {
    SpreadsheetApp.getUi().alert('System not set up yet. Please run the Quiz Maker first.');
    return;
  }
  var payload = getPrincipalDashboardData();
  var html    = buildPrincipalDashboardHtml(payload);
  var output  = HtmlService.createHtmlOutput(html)
    .setTitle('🏫 Principal Dashboard')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(output, '🏫 Principal ERP Dashboard');
}

// ── doGet HOOK ──────────────────────────────────────────
function getPrincipalDashboardHtml_doGet() {
  var payload = getPrincipalDashboardData();
  return buildPrincipalDashboardHtml(payload);
}

// ============================================================
// DATA AGGREGATOR — runs server side, returns one big object
// ============================================================
function getPrincipalDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── CONFIG ──
  var config = { instituteName: 'Government ITI', instituteSubtitle: 'Industrial Training Institute' };
  var cfgSheet = ss.getSheetByName('CONFIG');
  if (cfgSheet) {
    cfgSheet.getDataRange().getValues().forEach(function(r) {
      if (r[0] === 'instituteName')     config.instituteName    = r[1] || config.instituteName;
      if (r[0] === 'instituteSubtitle') config.instituteSubtitle = r[1] || config.instituteSubtitle;
    });
  }

  // ── RESULTS ──
  var results = [];
  var resSheet = ss.getSheetByName('RESULTS');
  if (resSheet && resSheet.getLastRow() > 1) {
    var rData = resSheet.getDataRange().getValues();
    for (var i = 1; i < rData.length; i++) {
      var row = rData[i];
      if (!row[0]) continue;
      var pctRaw = row[10];
      var pct = 0;
      if (pctRaw !== '' && pctRaw !== null && pctRaw !== undefined) {
        var pctStr = pctRaw.toString().replace('%','').trim();
        pct = parseFloat(pctStr) || 0;
        if (pct > 0 && pct <= 1) pct = pct * 100;
      }
      results.push({
        submissionId : row[0]  ? row[0].toString()  : '',
        testId       : row[1]  ? row[1].toString()  : '',
        testTitle    : row[2]  ? row[2].toString()  : '',
        studentName  : row[3]  ? row[3].toString()  : '',
        rollNo       : row[4]  ? row[4].toString()  : '',
        className    : row[5]  ? row[5].toString()  : '',
        trade        : row[6]  ? row[6].toString()  : '',
        submittedAt  : row[7]  ? row[7].toString()  : '',
        score        : parseFloat(row[8])  || 0,
        totalMarks   : parseFloat(row[9])  || 0,
        percentage   : Math.round(pct * 10) / 10,
        status       : row[11] ? row[11].toString() : '',
        fsViolations : parseInt(row[12]) || 0,
        tabSwitches  : parseInt(row[13]) || 0
      });
    }
  }

  // ── ACTIVE TESTS ──
  var tests = [];
  var testsSheet = ss.getSheetByName('ACTIVE TESTS');
  if (testsSheet && testsSheet.getLastRow() > 1) {
    var tData = testsSheet.getDataRange().getValues();
    for (var j = 1; j < tData.length; j++) {
      var tr = tData[j];
      if (!tr[0]) continue;
      tests.push({
        testId    : tr[0] ? tr[0].toString() : '',
        title     : tr[1] ? tr[1].toString() : '',
        teacher   : tr[2] ? tr[2].toString() : '',
        trade     : tr[3] ? tr[3].toString() : '',
        created   : tr[4] ? tr[4].toString() : '',
        duration  : tr[5] ? tr[5].toString() : '',
        questions : parseInt(tr[6]) || 0,
        studentUrl: tr[7] ? tr[7].toString() : '',
        status    : tr[8] ? tr[8].toString() : 'Active'
      });
    }
  }

  // ── SUMMARY ──
  var totalSubs   = results.length;
  var passCount   = results.filter(function(r){ return r.status === 'PASS'; }).length;
  var failCount   = results.filter(function(r){ return r.status === 'FAIL'; }).length;
  var avgPct      = totalSubs > 0 ? (results.reduce(function(s,r){ return s + r.percentage; }, 0) / totalSubs) : 0;
  var passRate    = totalSubs > 0 ? (passCount / totalSubs * 100) : 0;

  var uniqStudents = {};
  results.forEach(function(r){ uniqStudents[r.studentName + '|' + r.rollNo] = true; });

  // ── PER STUDENT ──
  var studentMap = {};
  results.forEach(function(r) {
    var key = r.studentName + '|' + r.rollNo;
    if (!studentMap[key]) {
      studentMap[key] = {
        name: r.studentName, roll: r.rollNo,
        cls: r.className, trade: r.trade,
        batch: (r.trade || '') + (r.className ? ' — ' + r.className : ''),
        tests: [], pcts: [], passes: 0
      };
    }
    studentMap[key].tests.push({
      testId: r.testId, title: r.testTitle, date: r.submittedAt,
      score: r.score, total: r.totalMarks, pct: r.percentage, status: r.status
    });
    studentMap[key].pcts.push(r.percentage);
    if (r.status === 'PASS') studentMap[key].passes++;
  });
  var students = Object.values(studentMap).map(function(s) {
    var avg  = s.pcts.length ? Math.round(s.pcts.reduce(function(a,b){return a+b;},0)/s.pcts.length*10)/10 : 0;
    var best = s.pcts.length ? Math.round(Math.max.apply(null,s.pcts)*10)/10 : 0;
    var grade= avg>=90?'A+':avg>=80?'A':avg>=70?'B+':avg>=60?'B':avg>=50?'C':avg>=40?'D':'F';
    return { name:s.name, roll:s.roll, cls:s.cls, trade:s.trade, batch:s.batch,
             totalTests:s.tests.length, avgPct:avg, bestPct:best,
             passes:s.passes, fails:s.tests.length-s.passes, grade:grade, tests:s.tests };
  }).sort(function(a,b){ return b.avgPct - a.avgPct; });

  // ── PER TEST STATS ──
  var testMap = {};
  results.forEach(function(r) {
    var tid = r.testId;
    if (!testMap[tid]) testMap[tid] = { title:r.testTitle, pass:0, fail:0, total:0, scoreSum:0 };
    testMap[tid].total++;
    testMap[tid].scoreSum += r.percentage;
    if (r.status === 'PASS') testMap[tid].pass++;
    else testMap[tid].fail++;
  });
  var testStats = Object.keys(testMap).map(function(tid) {
    var d = testMap[tid];
    return { testId:tid, title:d.title, total:d.total, pass:d.pass, fail:d.fail,
             passRate: d.total > 0 ? Math.round(d.pass/d.total*100) : 0,
             avgScore: d.total > 0 ? Math.round(d.scoreSum/d.total*10)/10 : 0 };
  }).sort(function(a,b){ return b.total - a.total; });

  // ── PER BATCH ──
  var batchMap = {};
  results.forEach(function(r) {
    var b = (r.trade || 'Unknown') + (r.className ? ' — ' + r.className : '');
    if (!batchMap[b]) batchMap[b] = { batch:b, trade:r.trade, cls:r.className, pass:0, fail:0, total:0, scoreSum:0, students:{}, tests:{} };
    batchMap[b].total++;
    batchMap[b].scoreSum += r.percentage;
    batchMap[b].students[r.studentName+'|'+r.rollNo] = true;
    if (r.status === 'PASS') batchMap[b].pass++;
    else batchMap[b].fail++;
    if (!batchMap[b].tests[r.testId]) batchMap[b].tests[r.testId] = { title:r.testTitle, total:0, pass:0, scoreSum:0 };
    batchMap[b].tests[r.testId].total++;
    batchMap[b].tests[r.testId].scoreSum += r.percentage;
    if (r.status === 'PASS') batchMap[b].tests[r.testId].pass++;
  });
  var batchStats = Object.values(batchMap).map(function(b) {
    var avg = b.total > 0 ? Math.round(b.scoreSum/b.total*10)/10 : 0;
    var testList = Object.keys(b.tests).map(function(tid) {
      var t = b.tests[tid];
      return { testId:tid, title:t.title, total:t.total, pass:t.pass,
               avgScore: Math.round(t.scoreSum/t.total*10)/10,
               passRate: Math.round(t.pass/t.total*100) };
    });
    return { batch:b.batch, trade:b.trade, cls:b.cls,
             totalStudents: Object.keys(b.students).length,
             totalSubs: b.total, avgPct: avg,
             passRate: b.total > 0 ? Math.round(b.pass/b.total*100) : 0,
             pass: b.pass, fail: b.fail, tests: testList };
  }).sort(function(a,b){ return b.avgPct - a.avgPct; });

  // ── SCORE DISTRIBUTION ──
  var buckets = [0,0,0,0,0];
  results.forEach(function(r) {
    var p = r.percentage;
    if      (p < 40) buckets[0]++;
    else if (p < 60) buckets[1]++;
    else if (p < 75) buckets[2]++;
    else if (p < 90) buckets[3]++;
    else             buckets[4]++;
  });

  var passFailReport = results.slice();

  // ── PROGRESS DATA ──
  var progressStudents = {};
  Object.values(studentMap).forEach(function(s) {
    var key = s.name + '|' + s.roll;
    var pts = s.tests.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
    progressStudents[key] = { name:s.name, roll:s.roll, batch: (s.trade||'')+(s.className?' — '+s.className:''), points: pts };
  });
  var progressBatches = {};
  Object.values(batchMap).forEach(function(b) {
    progressBatches[b.batch] = Object.values(b.tests).map(function(t) {
      return { title:t.title, avg: Math.round(t.scoreSum/t.total*10)/10, count:t.total };
    });
  });

  // ── LEADERBOARD ──
  var leaderboard = { overall: students.slice(0,20), byBatch:{} };
  var batchGroups = {};
  students.forEach(function(s) {
    if (!batchGroups[s.batch]) batchGroups[s.batch] = [];
    batchGroups[s.batch].push(s);
  });
  Object.keys(batchGroups).forEach(function(b) {
    leaderboard.byBatch[b] = batchGroups[b].slice(0,10);
  });

  // ── ATTENDANCE ──
  var attendanceMap = {};
  results.forEach(function(r) {
    if (!attendanceMap[r.testId]) attendanceMap[r.testId] = { students:[] };
    attendanceMap[r.testId].students.push({ name:r.studentName, roll:r.rollNo, batch:(r.trade||'')+(r.className?' — '+r.className:''), date:r.submittedAt, pct:r.percentage, status:r.status });
  });
  var attendance = tests.map(function(t) {
    var att = attendanceMap[t.testId] || { students:[] };
    return { testId:t.testId, title:t.title, teacher:t.teacher, trade:t.trade,
             date:t.created, questions:t.questions, status:t.status,
             submissions: att.students.length, students: att.students };
  });

  // ── INTEGRITY FLAGS ──
  var integrityFlags = results.filter(function(r){ return r.fsViolations > 0 || r.tabSwitches > 1; })
    .sort(function(a,b){ return (b.fsViolations+b.tabSwitches)-(a.fsViolations+a.tabSwitches) }).slice(0,30);

  // ── TEACHER STATS ──
  var teacherMap = {};
  tests.forEach(function(t) {
    var name = t.teacher || 'Unknown';
    if (!teacherMap[name]) teacherMap[name] = { tests:0 };
    teacherMap[name].tests++;
  });
  var teacherStats = Object.keys(teacherMap).map(function(n){ return { name:n, tests:teacherMap[n].tests }; })
    .sort(function(a,b){ return b.tests - a.tests; });

  return {
    config          : config,
    summary         : { totalSubs:totalSubs, totalTests:tests.length, totalStudents:Object.keys(uniqStudents).length,
                        passCount:passCount, failCount:failCount,
                        avgPct: Math.round(avgPct*10)/10, passRate: Math.round(passRate*10)/10 },
    results         : results,
    tests           : tests,
    students        : students,
    testStats       : testStats,
    batchStats      : batchStats,
    buckets         : buckets,
    passFailReport  : passFailReport,
    progressStudents: progressStudents,
    progressBatches : progressBatches,
    leaderboard     : leaderboard,
    attendance      : attendance,
    integrityFlags  : integrityFlags,
    teacherStats    : teacherStats,
    recentActivity  : results.slice().reverse().slice(0,15)
  };
}

// ============================================================
// HTML BUILDER
// ============================================================
function buildPrincipalDashboardHtml(d) {
  var dataJson = JSON.stringify(d);
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
'<title>Principal Dashboard</title>\n' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>\n' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>\n' +
'<style>\n' +
'*{box-sizing:border-box;margin:0;padding:0;}\n' +
'body{font-family:"Segoe UI",Arial,sans-serif;background:#f0f4f8;color:#1e293b;font-size:13px;}\n' +
':root{--blue:#1a56db;--dark:#0d3b9e;--green:#059669;--red:#dc2626;--amber:#d97706;--purple:#7c3aed;--teal:#0891b2;--border:#e2e8f0;--card:#fff;--muted:#64748b;}\n' +
'.hdr{background:linear-gradient(130deg,#0b1437 0%,#1a56db 60%,#2563eb 100%);color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(11,20,55,.35);}\n' +
'.hdr-left{display:flex;align-items:center;gap:12px;}\n' +
'.hdr-icon{width:40px;height:40px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;}\n' +
'.hdr-title{font-size:16px;font-weight:800;}\n' +
'.hdr-sub{font-size:11px;opacity:.75;}\n' +
'.hdr-badge{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;}\n' +
'.tabbar{background:#fff;border-bottom:1px solid var(--border);display:flex;padding:0 20px;overflow-x:auto;position:sticky;top:73px;z-index:90;box-shadow:0 2px 8px rgba(0,0,0,.05);}\n' +
'.tabbar::-webkit-scrollbar{display:none;}\n' +
'.tab-btn{background:none;border:none;border-bottom:3px solid transparent;padding:12px 16px;font:600 12px "Segoe UI",Arial,sans-serif;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .15s;}\n' +
'.tab-btn:hover{color:var(--blue);}\n' +
'.tab-btn.active{color:var(--blue);border-bottom-color:var(--blue);}\n' +
'.main{padding:20px 22px 40px;}\n' +
'.tab-pane{display:none;}\n' +
'.tab-pane.active{display:block;}\n' +
'.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}\n' +
'.three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;}\n' +
'@media(max-width:800px){.two-col,.three-col{grid-template-columns:1fr;}}\n' +
'.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:18px;}\n' +
'.stat-card{background:var(--card);border-radius:12px;padding:16px 18px;border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,.06);position:relative;overflow:hidden;}\n' +
'.stat-card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;}\n' +
'.sc-blue::before{background:var(--blue);}.sc-green::before{background:var(--green);}.sc-red::before{background:var(--red);}.sc-amber::before{background:var(--amber);}.sc-purple::before{background:var(--purple);}.sc-teal::before{background:var(--teal);}\n' +
'.stat-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}\n' +
'.stat-value{font-size:26px;font-weight:900;line-height:1;}\n' +
'.sv-blue{color:var(--blue);}.sv-green{color:var(--green);}.sv-red{color:var(--red);}.sv-amber{color:var(--amber);}.sv-purple{color:var(--purple);}.sv-teal{color:var(--teal);}\n' +
'.stat-sub{font-size:10px;color:var(--muted);margin-top:4px;}\n' +
'.card{background:var(--card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);}\n' +
'.card-head{padding:12px 16px;border-bottom:1px solid var(--border);background:#fafbff;display:flex;align-items:center;justify-content:space-between;}\n' +
'.card-title{font-size:13px;font-weight:700;}\n' +
'.card-body{padding:16px;}\n' +
'.tbl-wrap{overflow-x:auto;}\n' +
'table{width:100%;border-collapse:collapse;font-size:12px;}\n' +
'th{background:#f1f5f9;color:var(--muted);font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.4px;padding:8px 10px;text-align:left;white-space:nowrap;}\n' +
'td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}\n' +
'tr:last-child td{border-bottom:none;}\n' +
'tr:hover td{background:#f8faff;}\n' +
'.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;}\n' +
'.badge-pass{background:#dcfce7;color:#15803d;}.badge-fail{background:#fee2e2;color:#b91c1c;}\n' +
'.badge-active{background:#dbeafe;color:#1d4ed8;}.badge-warn{background:#fef3c7;color:#92400e;}\n' +
'.badge-flag{background:#fce7f3;color:#9d174d;}\n' +
'.grade{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-size:10px;font-weight:800;}\n' +
'.g-ap{background:#1a56db;color:#fff;}.g-a{background:#059669;color:#fff;}.g-b{background:#0891b2;color:#fff;}\n' +
'.g-c{background:#d97706;color:#fff;}.g-d{background:#f97316;color:#fff;}.g-f{background:#dc2626;color:#fff;}\n' +
'.pbar{height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;}\n' +
'.pbar-fill{height:100%;border-radius:3px;}\n' +
'.pf-green{background:var(--green);}.pf-blue{background:var(--blue);}.pf-red{background:var(--red);}.pf-amber{background:var(--amber);}\n' +
'.filter-bar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;}\n' +
'.filter-bar input,.filter-bar select{padding:7px 10px;border:1.5px solid var(--border);border-radius:7px;font-size:12px;font-family:inherit;background:#fff;}\n' +
'.filter-bar input:focus,.filter-bar select:focus{border-color:var(--blue);outline:none;}\n' +
'.sbar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}\n' +
'.sbar-label{font-size:11px;width:75px;color:var(--muted);}\n' +
'.sbar-track{flex:1;height:22px;background:#e2e8f0;border-radius:5px;overflow:hidden;}\n' +
'.sbar-fill{height:100%;border-radius:5px;display:flex;align-items:center;padding-left:8px;font-size:10px;font-weight:700;color:#fff;}\n' +
'.sbar-n{font-size:11px;color:var(--muted);width:28px;text-align:right;}\n' +
'.lb-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;margin-bottom:6px;background:#f8faff;border:1px solid var(--border);}\n' +
'.lb-rank{font-size:18px;font-weight:900;width:30px;text-align:center;flex-shrink:0;}\n' +
'.lb-name{font-weight:700;font-size:13px;}\n' +
'.lb-sub{font-size:10px;color:var(--muted);margin-top:1px;}\n' +
'.lb-score{font-size:18px;font-weight:900;color:var(--blue);margin-left:auto;}\n' +
'.rank-1{color:#f59e0b;}.rank-2{color:#94a3b8;}.rank-3{color:#cd7c2f;}\n' +
'.chart-wrap{position:relative;height:260px;}\n' +
'.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;}\n' +
'.modal-overlay.show{display:flex;}\n' +
'.modal-box{background:#fff;border-radius:14px;padding:24px;max-width:680px;width:95%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);}\n' +
'.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);}\n' +
'.modal-title{font-size:16px;font-weight:800;}\n' +
'.modal-close{background:none;border:none;font-size:22px;cursor:pointer;color:var(--muted);}\n' +
'.heatmap-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px;}\n' +
'.hm-cell{height:30px;border-radius:4px;display:flex;align-items:center;padding:0 10px;font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default;}\n' +
'.btn{padding:7px 14px;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;}\n' +
'.btn-blue{background:var(--blue);color:#fff;}.btn-blue:hover{background:var(--dark);}\n' +
'.btn-green{background:var(--green);color:#fff;}.btn-green:hover{background:#047857;}\n' +
'.btn-sm{padding:4px 9px;font-size:11px;}\n' +
'.btn-outline{background:#fff;border:1px solid var(--border);color:var(--muted);}.btn-outline:hover{border-color:var(--blue);color:var(--blue);}\n' +
'.empty{text-align:center;padding:40px;color:var(--muted);}\n' +
'.empty-icon{font-size:36px;margin-bottom:8px;}\n' +
'::-webkit-scrollbar{width:5px;height:5px;}\n' +
'::-webkit-scrollbar-thumb{background:#c1c9d4;border-radius:3px;}\n' +
'.stu-row{cursor:pointer;padding:8px 10px;border-bottom:1px solid #f1f5f9;transition:background .1s;}\n' +
'.stu-row:hover{background:#f8faff;}\n' +
'.stu-row.active{background:#ebf2ff;border-left:4px solid var(--blue);}\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +

'<div class="hdr">\n' +
'  <div class="hdr-left">\n' +
'    <div class="hdr-icon">🏫</div>\n' +
'    <div><div class="hdr-title" id="hdrName">Principal Dashboard</div><div class="hdr-sub" id="hdrSub"></div></div>\n' +
'  </div>\n' +
'  <div style="display:flex;gap:8px;align-items:center;">\n' +
'    <div class="hdr-badge" id="hdrDate"></div>\n' +
'    <button class="btn btn-green btn-sm" onclick="exportCurrentPDF()">📥 Export PDF</button>\n' +
'  </div>\n' +
'</div>\n' +

'<div class="tabbar">\n' +
'  <button class="tab-btn active" onclick="switchTab(this,\'overview\')">📊 Overview</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'activetests\')">🔗 Active Tests</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'alltests\')">📋 All Tests</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'attendance\')">📅 Attendance</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'students\')">👨‍🎓 Students</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'studentanalytics\')">📈 Student Analytics</button>\n' + // NEW TAB
'  <button class="tab-btn" onclick="switchTab(this,\'testwise\')">📊 Testwise Perf</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'passfail\')">✅ Pass/Fail</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'classperf\')">🏫 Class Performance</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'chapters\')">📖 Chapter Analysis</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'progress\')">📈 Progress</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'leaderboard\')">🏆 Leaderboard</button>\n' +
'  <button class="tab-btn" onclick="switchTab(this,\'integrity\')">🛡 Integrity</button>\n' +
'</div>\n' +

'<div class="main">\n' +

/* ── OVERVIEW TAB ── */
'<div class="tab-pane active" id="tab-overview">\n' +
'  <div class="stat-grid" id="overviewCards"></div>\n' +
'  <div class="two-col">\n' +
'    <div class="card"><div class="card-head"><span class="card-title">📊 Score Distribution</span></div><div class="card-body" id="distBars"></div></div>\n' +
'    <div class="card"><div class="card-head"><span class="card-title">🎯 Pass/Fail by Batch</span></div><div class="card-body"><div class="chart-wrap"><canvas id="batchPieChart"></canvas></div></div></div>\n' +
'  </div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title">🕐 Recent Submissions</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>Student</th><th>Roll No</th><th>Class/Trade</th><th>Test</th><th>Score</th><th>%</th><th>Status</th><th>Date</th></tr></thead><tbody id="recentTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── ACTIVE TESTS TAB ── */
'<div class="tab-pane" id="tab-activetests">\n' +
'  <div class="filter-bar">\n' +
'    <input id="atSearch" placeholder="🔍 Search test..." oninput="filterActiveTests()" style="min-width:200px;">\n' +
'    <select id="atStatus" onchange="filterActiveTests()">\n' +
'      <option value="">All Status</option>\n' +
'      <option value="Active">Active</option>\n' +
'      <option value="Inactive">Inactive</option>\n' +
'    </select>\n' +
'  </div>\n' +
'  <div class="stat-grid" style="margin-bottom:16px;" id="atSummaryCards"></div>\n' +
'  <div class="card">\n' +
'    <div class="card-head">\n' +
'      <span class="card-title" id="atTitle">Active Tests</span>\n' +
'      <button class="btn btn-green btn-sm" onclick="exportActiveTestsCSV()">📥 Export CSV</button>\n' +
'    </div>\n' +
'    <div class="tbl-wrap">\n' +
'      <table><thead><tr>\n' +
'        <th>#</th><th>Test Title</th><th>Teacher</th><th>Trade / Class</th>\n' +
'        <th>Created</th><th>Duration</th><th>Questions</th><th>Appeared</th>\n' +
'        <th>Avg %</th><th>Pass Rate</th><th>Status</th><th>Actions</th>\n' +
'      </tr></thead>\n' +
'      <tbody id="atTbody"></tbody></table>\n' +
'    </div>\n' +
'  </div>\n' +
'</div>\n' +

/* ── ALL TESTS TAB ── */
'<div class="tab-pane" id="tab-alltests">\n' +
'  <div class="filter-bar"><input id="testSearch" placeholder="🔍 Search test..." oninput="filterTests()" style="min-width:200px;"><select id="testStatusF" onchange="filterTests()"><option value="">All Status</option><option>Active</option><option>Inactive</option></select></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="allTestsTitle">All Tests</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Title</th><th>Teacher</th><th>Trade</th><th>Created</th><th>Duration</th><th>Qs</th><th>Appeared</th><th>Avg%</th><th>Pass Rate</th><th>Status</th></tr></thead><tbody id="allTestsTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── ATTENDANCE TAB ── */
'<div class="tab-pane" id="tab-attendance">\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="attTitle">Test Attendance</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Test Name</th><th>Teacher</th><th>Trade</th><th>Date</th><th>Qs</th><th>Submissions</th><th>Status</th><th>Detail</th></tr></thead><tbody id="attTbody"></tbody></table></div></div>\n' +
'  <div id="attDetail" style="display:none;">\n' +
'    <div class="card"><div class="card-head"><span class="card-title" id="attDetailTitle">Students</span></div>\n' +
'    <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Roll</th><th>Batch</th><th>Date</th><th>%</th><th>Status</th></tr></thead><tbody id="attDetailTbody"></tbody></table></div></div>\n' +
'  </div>\n' +
'</div>\n' +

/* ── STUDENTS TAB (LIST VIEW) ── */
'<div class="tab-pane" id="tab-students">\n' +
'  <div class="filter-bar"><input id="stuSearch" placeholder="🔍 Search student..." oninput="filterStudents()" style="min-width:200px;"><select id="stuBatch" onchange="filterStudents()"><option value="">All Batches</option></select><select id="stuGrade" onchange="filterStudents()"><option value="">All Grades</option><option>A+</option><option>A</option><option>B+</option><option>B</option><option>C</option><option>D</option><option>F</option></select></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="stuTitle">Students</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Roll</th><th>Batch</th><th>Tests</th><th>Avg%</th><th>Best%</th><th>Pass</th><th>Fail</th><th>Grade</th><th>Action</th></tr></thead><tbody id="stuTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── STUDENT ANALYTICS TAB (NEW - SPLIT VIEW) ── */
'<div class="tab-pane" id="tab-studentanalytics">\n' +
'  <div class="two-col" style="grid-template-columns: 350px 1fr; height: 75vh; gap:16px;">\n' +
'    <!-- LEFT: LIST -->\n' +
'    <div class="card" style="display:flex;flex-direction:column;height:100%;">\n' +
'      <div class="card-head"><span class="card-title">👨‍🎓 Select Student</span></div>\n' +
'      <div style="padding:10px;border-bottom:1px solid var(--border);">\n' +
'        <input id="saSearch" placeholder="🔍 Search name or roll..." oninput="filterStudentAnalyticsList()" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;">\n' +
'      </div>\n' +
'      <div class="tbl-wrap" style="flex:1;overflow-y:auto;">\n' +
'        <table><thead><tr><th style="position:sticky;top:0;background:#f1f5f9;">Name</th><th style="position:sticky;top:0;background:#f1f5f9;">Avg %</th></tr></thead>\n' +
'        <tbody id="saListTbody"></tbody></table>\n' +
'      </div>\n' +
'    </div>\n' +
'    <!-- RIGHT: DETAILS -->\n' +
'    <div class="card" style="display:flex;flex-direction:column;height:100%;">\n' +
'      <div class="card-head"><span class="card-title" id="saDetailTitle">Performance Details</span></div>\n' +
'      <div class="card-body" id="saDetailBody" style="flex:1;overflow-y:auto;">\n' +
'        <div class="empty"><div class="empty-icon">👈</div>Select a student from the left to view analytics</div>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</div>\n' +

/* ── TESTWISE PERFORMANCE TAB ── */
'<div class="tab-pane" id="tab-testwise">\n' +
'  <div class="filter-bar">\n' +
'    <input id="twSearchStu" placeholder="🔍 Student Name..." oninput="filterTestwise()" style="min-width:160px;">\n' +
'    <input id="twSearchTest" placeholder="🔍 Test Name..." oninput="filterTestwise()" style="min-width:160px;">\n' +
'    <select id="twBatch" onchange="filterTestwise()"><option value="">All Batches</option></select>\n' +
'  </div>\n' +
'  <div class="card">\n' +
'    <div class="card-head">\n' +
'      <span class="card-title" id="twTitle">📊 Testwise Performance</span>\n' +
'      <button class="btn btn-green btn-sm" onclick="exportTestwiseCSV()">📥 CSV</button>\n' +
'    </div>\n' +
'    <div class="tbl-wrap">\n' +
'      <table><thead><tr>\n' +
'        <th>#</th><th>Student</th><th>Roll</th><th>Batch</th><th>Test Name</th>\n' +
'        <th>Score</th><th>Total</th><th>%</th><th>Status</th><th>Date</th>\n' +
'      </tr></thead>\n' +
'      <tbody id="twTbody"></tbody></table>\n' +
'    </div>\n' +
'  </div>\n' +
'</div>\n' +

/* ── PASS/FAIL TAB ── */
'<div class="tab-pane" id="tab-passfail">\n' +
'  <div class="filter-bar"><input id="pfSearch" placeholder="🔍 Search..." oninput="filterPF()" style="min-width:180px;"><select id="pfBatch" onchange="filterPF()"><option value="">All Batches</option></select><select id="pfStatus" onchange="filterPF()"><option value="">All</option><option>PASS</option><option>FAIL</option></select><select id="pfTest" onchange="filterPF()"><option value="">All Tests</option></select><button class="btn btn-green btn-sm" onclick="exportCSV()">📥 CSV</button><button class="btn btn-blue btn-sm" onclick="exportPassFailPDF()">📄 PDF</button></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="pfTitle">Pass/Fail Report</span></div>\n' +
'  <div class="tbl-wrap" id="pfTableWrap"><table><thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Batch</th><th>Test ID</th><th>Test Name</th><th>Date</th><th>Score</th><th>Total</th><th>%</th><th>Status</th><th>FS Viol</th><th>Tab Switch</th></tr></thead><tbody id="pfTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── CLASS PERF TAB ── */
'<div class="tab-pane" id="tab-classperf">\n' +
'  <div id="batchCards" class="stat-grid" style="margin-bottom:16px;"></div>\n' +
'  <div class="two-col">\n' +
'    <div class="card"><div class="card-head"><span class="card-title">📊 Avg Score by Batch</span></div><div class="card-body"><div class="chart-wrap"><canvas id="batchAvgChart"></canvas></div></div></div>\n' +
'    <div class="card"><div class="card-head"><span class="card-title">✅ Pass Rate by Batch</span></div><div class="card-body"><div class="chart-wrap"><canvas id="batchPassChart"></canvas></div></div></div>\n' +
'  </div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title">🏫 Batch Details</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>Batch</th><th>Students</th><th>Submissions</th><th>Avg%</th><th>Pass Rate</th><th>Tests</th><th>Detail</th></tr></thead><tbody id="batchTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── CHAPTER TAB ── */
'<div class="tab-pane" id="tab-chapters">\n' +
'  <div class="filter-bar"><select id="chBatch" onchange="filterChapters()"><option value="">All Batches</option></select><select id="chStrength" onchange="filterChapters()"><option value="">All</option><option>Weak</option><option>Average</option><option>Strong</option></select></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title">🔥 Chapter Heatmap</span></div><div class="card-body" id="chHeatmap"></div></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title">📋 Chapter Detail</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>Chapter</th><th>Batch</th><th>Correct</th><th>Total</th><th>Score%</th><th>Strength</th></tr></thead><tbody id="chTbody"></tbody></table></div></div>\n' +
'</div>\n' +

/* ── PROGRESS TAB ── */
'<div class="tab-pane" id="tab-progress">\n' +
'  <div class="filter-bar"><select id="progView" onchange="updateProgressSelector()"><option value="student">Student-wise</option><option value="batch">Batch-wise</option></select><select id="progEntity" onchange="renderProgressChart()" style="min-width:200px;"></select></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="progTitle">📈 Progress Over Time</span></div><div class="card-body"><div class="chart-wrap" style="height:320px;"><canvas id="progressChart"></canvas></div></div></div>\n' +
'</div>\n' +

/* ── LEADERBOARD TAB ── */
'<div class="tab-pane" id="tab-leaderboard">\n' +
'  <div class="filter-bar"><select id="lbView" onchange="renderLeaderboard()"><option value="overall">🌐 Overall College</option></select></div>\n' +
'  <div class="card"><div class="card-head"><span class="card-title" id="lbTitle">🏆 Leaderboard</span></div><div class="card-body" id="lbBody"></div></div>\n' +
'</div>\n' +

/* ── INTEGRITY TAB ── */
'<div class="tab-pane" id="tab-integrity">\n' +
'  <div class="card"><div class="card-head"><span class="card-title">🛡 Integrity Flags</span><span class="badge badge-warn" id="intBadge">0</span></div>\n' +
'  <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Student</th><th>Roll</th><th>Class/Trade</th><th>Test</th><th>FS Exits</th><th>Tab Switches</th><th>%</th><th>Status</th></tr></thead><tbody id="intTbody"></tbody></table></div></div>\n' +
'</div>\n' +

'</div>\n' + /* /main */

/* MODALS */
'<div class="modal-overlay" id="stuModal"><div class="modal-box"><div class="modal-head"><span class="modal-title" id="stuModalTitle">Student</span><div style="display:flex;gap:8px;"><button class="btn btn-green btn-sm" onclick="exportStudentPDF()">📥 PDF</button><button class="modal-close" onclick="closeStuModal()">✕</button></div></div><div id="stuModalBody"></div></div></div>\n' +
'<div class="modal-overlay" id="batchModal"><div class="modal-box"><div class="modal-head"><span class="modal-title" id="batchModalTitle">Batch</span><button class="modal-close" onclick="document.getElementById(\'batchModal\').classList.remove(\'show\')">✕</button></div><div id="batchModalBody"></div></div></div>\n' +

'<script>\n' +
'var DB = ' + dataJson + ';\n' +
'var _charts = {};\n' +

'window.onload = function() {\n' +
'  document.getElementById("hdrName").textContent = (DB.config.instituteName || "ITI") + " — Principal Dashboard";\n' +
'  document.getElementById("hdrSub").textContent  = DB.config.instituteSubtitle || "";\n' +
'  document.getElementById("hdrDate").textContent = new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});\n' +
'  renderOverview();\n' +
'  renderActiveTests();\n' +
'  renderAllTests();\n' +
'  renderAttendance();\n' +
'  renderStudents();\n' +
'  renderStudentAnalytics(); // NEW\n' +
'  renderTestwise();\n' +
'  renderPassFail();\n' +
'  renderClassPerf();\n' +
'  renderChapters();\n' +
'  renderIntegrity();\n' +
'  populateLeaderboardBatches();\n' +
'  populateProgressSelectors();\n' +
'  populateFilters();\n' +
'};\n' +

'function switchTab(el,name) {\n' +
'  document.querySelectorAll(".tab-btn").forEach(function(b){b.classList.remove("active");});\n' +
'  document.querySelectorAll(".tab-pane").forEach(function(p){p.classList.remove("active");});\n' +
'  el.classList.add("active");\n' +
'  document.getElementById("tab-"+name).classList.add("active");\n' +
'  if (name==="progress") renderProgressChart();\n' +
'  if (name==="leaderboard") renderLeaderboard();\n' +
'  if (name==="studentanalytics" && !_saListRendered) { renderStudentAnalytics(); _saListRendered=true; }\n' + // Lazy render list
'}\n' +

'function populateFilters() {\n' +
'  var batches = [...new Set((DB.students||[]).map(function(s){return s.batch;}).filter(Boolean))].sort();\n' +
'  var stuBF = document.getElementById("stuBatch"), pfBF = document.getElementById("pfBatch"), chBF = document.getElementById("chBatch"), twBF = document.getElementById("twBatch");\n' +
'  batches.forEach(function(b){\n' +
'    [stuBF,pfBF,chBF,twBF].forEach(function(sel){\n' +
'      if(sel) sel.innerHTML += \'<option value="\'+esc(b)+\'">\'+esc(b)+\'</option>\';\n' +
'    });\n' +
'  });\n' +
'  var pfTestSel = document.getElementById("pfTest");\n' +
'  var seenT = {};\n' +
'  (DB.passFailReport||[]).forEach(function(r){ if(!seenT[r.testId]){seenT[r.testId]=true;pfTestSel.innerHTML+=\'<option value="\'+esc(r.testId)+\'">\'+esc(r.testTitle)+\'</option>\';} });\n' +
'}\n' +

/* RENDER OVERVIEW */
'function renderOverview() {\n' +
'  var s = DB.summary;\n' +
'  document.getElementById("overviewCards").innerHTML = [\n' +
'    {label:"Total Submissions",value:s.totalSubs,      sub:"All attempts",      cls:"sc-blue",  vcls:"sv-blue"},\n' +
'    {label:"Total Students",   value:s.totalStudents,  sub:"Unique learners",   cls:"sc-purple",vcls:"sv-purple"},\n' +
'    {label:"Total Tests",      value:s.totalTests,     sub:"Created by teachers",cls:"sc-teal", vcls:"sv-teal"},\n' +
'    {label:"Passed",           value:s.passCount,      sub:s.passRate+"% pass rate",cls:"sc-green",vcls:"sv-green"},\n' +
'    {label:"Failed",           value:s.failCount,      sub:"Need attention",    cls:"sc-red",   vcls:"sv-red"},\n' +
'    {label:"Avg Score",        value:s.avgPct+"%",     sub:"College average",   cls:"sc-amber", vcls:"sv-amber"}\n' +
'  ].map(function(c){\n' +
'    return \'<div class="stat-card \'+c.cls+\'"><div class="stat-label">\'+c.label+\'</div><div class="stat-value \'+c.vcls+\'">\'+c.value+\'</div><div class="stat-sub">\'+c.sub+\'</div></div>\';\n' +
'  }).join("");\n' +
'  var b = DB.buckets, total = b.reduce(function(a,v){return a+v;},0);\n' +
'  var labels = ["< 40 (Fail)","40-59","60-74","75-89","90+"];\n' +
'  var colors = ["#dc2626","#d97706","#2563eb","#0891b2","#059669"];\n' +
'  var max = Math.max.apply(null,b)||1;\n' +
'  document.getElementById("distBars").innerHTML = !total ? \'<div class="empty"><div class="empty-icon">📭</div>No data</div>\' :\n' +
'    b.map(function(count,i){\n' +
'      var w = Math.round(count/max*100);\n' +
'      return \'<div class="sbar-row"><div class="sbar-label">\'+labels[i]+\'</div><div class="sbar-track"><div class="sbar-fill" style="width:\'+w+\'%;background:\'+colors[i]+\'">\'+( count>0?count:"" )+\'</div></div><div class="sbar-n">\'+count+\'</div></div>\';\n' +
'    }).join("");\n' +
'  var batches = DB.batchStats||[];\n' +
'  if (batches.length) {\n' +
'    setTimeout(function(){\n' +
'      if (_charts.batchPie) _charts.batchPie.destroy();\n' +
'      var ctx = document.getElementById("batchPieChart");\n' +
'      if (!ctx) return;\n' +
'      _charts.batchPie = new Chart(ctx, {type:"doughnut",\n' +
'        data:{labels:batches.map(function(b){return b.batch;}),\n' +
'          datasets:[{data:batches.map(function(b){return b.passRate;}),\n' +
'            backgroundColor:["#1a56db","#059669","#d97706","#7c3aed","#0891b2","#dc2626","#f97316"],borderWidth:2}]},\n' +
'        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:10},padding:10}}}}});\n' +
'    },200);\n' +
'  }\n' +
'  document.getElementById("recentTbody").innerHTML = (DB.recentActivity||[]).map(function(r){\n' +
'    return \'<tr><td><b>\'+esc(r.studentName)+\'</b></td><td>\'+esc(r.rollNo)+\'</td><td>\'+esc(r.trade)+\'<br><small>\'+esc(r.className)+\'</small></td><td>\'+esc(r.testTitle)+\'</td><td>\'+r.score+\'/\'+r.totalMarks+\'</td><td><b>\'+r.percentage.toFixed(1)+\'%</b></td><td><span class="badge \'+(r.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+r.status+\'</span></td><td>\'+esc(r.submittedAt)+\'</td></tr>\';\n' +
'  }).join("") || \'<tr><td colspan="8"><div class="empty"><div class="empty-icon">📭</div>No data</div></td></tr>\';\n' +
'}\n' +

/* ACTIVE TESTS TAB */
'function renderActiveTests() {\n' +
'  var tests  = DB.tests || [];\n' +
'  var tsMap  = {};\n' +
'  (DB.testStats || []).forEach(function(t) { tsMap[t.testId] = t; });\n' +
'  var active   = tests.filter(function(t) { return t.status === "Active"; }).length;\n' +
'  var inactive = tests.length - active;\n' +
'  var totalApp = tests.reduce(function(s, t) { var ts = tsMap[t.testId]; return s + (ts ? ts.total : 0); }, 0);\n' +
'  document.getElementById("atSummaryCards").innerHTML = [\n' +
'    { label:"Total Tests",    value:tests.length, sub:"All time",         cls:"sc-blue",   vcls:"sv-blue"   },\n' +
'    { label:"Active",         value:active,       sub:"Currently live",   cls:"sc-green",  vcls:"sv-green"  },\n' +
'    { label:"Inactive",       value:inactive,     sub:"Deactivated",      cls:"sc-red",    vcls:"sv-red"    },\n' +
'    { label:"Total Appeared", value:totalApp,     sub:"Across all tests", cls:"sc-purple", vcls:"sv-purple" }\n' +
'  ].map(function(c) {\n' +
'    return "<div class=\\"stat-card "+c.cls+"\\"><div class=\\"stat-label\\">"+c.label+"</div><div class=\\"stat-value "+c.vcls+"\\">"+c.value+"</div><div class=\\"stat-sub\\">"+c.sub+"</div></div>";\n' +
'  }).join("");\n' +
'  filterActiveTests();\n' +
'}\n' +

'function filterActiveTests() {\n' +
'  var q   = document.getElementById("atSearch").value.toLowerCase();\n' +
'  var st  = document.getElementById("atStatus").value;\n' +
'  var tsMap = {};\n' +
'  (DB.testStats || []).forEach(function(t) { tsMap[t.testId] = t; });\n' +
'  var filtered = (DB.tests || []).filter(function(t) {\n' +
'    return (!q || (t.title + t.teacher + t.trade).toLowerCase().includes(q)) && (!st || t.status === st);\n' +
'  });\n' +
'  document.getElementById("atTitle").textContent = "All Tests (" + filtered.length + ")";\n' +
'  document.getElementById("atTbody").innerHTML = filtered.length ? filtered.map(function(t, i) {\n' +
'    var ts       = tsMap[t.testId] || { total:0, avgScore:0, passRate:0 };\n' +
'    var isActive = t.status === "Active";\n' +
'    var waText   = encodeURIComponent("📋 *" + t.title + "*\\n🔗 " + t.studentUrl + "\\n\\n👆 Click the link to start your test!");\n' +
'    var waLink   = "https://wa.me/?text=" + waText;\n' +
'    return "<tr id=\\"atr_"+t.testId+"\\">"+\n' +
'      "<td>"+(i+1)+"</td>"+\n' +
'      "<td><b>"+esc(t.title)+"</b></td>"+\n' +
'      "<td>"+esc(t.teacher)+"</td>"+\n' +
'      "<td>"+esc(t.trade)+"</td>"+\n' +
'      "<td>"+esc(t.created)+"</td>"+\n' +
'      "<td>"+esc(t.duration)+"</td>"+\n' +
'      "<td>"+t.questions+"</td>"+\n' +
'      "<td><b style=\\"color:var(--blue)\\">"+ts.total+"</b></td>"+\n' +
'      "<td>"+barCell(ts.avgScore)+"</td>"+\n' +
'      "<td><span class=\\"badge "+(ts.passRate>=60?"badge-pass":"badge-fail")+"\\">"+ts.passRate+"%</span></td>"+\n' +
'      "<td><span class=\\"badge "+(isActive?"badge-active":"badge-warn")+"\\" id=\\"atst_"+t.testId+"\\">"+t.status+"</span></td>"+\n' +
'      "<td style=\\"white-space:nowrap\\">"+\n' +
'        "<button class=\\"btn btn-blue btn-sm\\" style=\\"margin-right:4px\\" onclick=\\"copyTestLink(\'"+t.testId+"\',\'"+encodeURIComponent(t.studentUrl)+"\')\\">📋 Copy</button>"+\n' +
'        "<a href=\\""+waLink+"\\" target=\\"_blank\\" style=\\"text-decoration:none;margin-right:4px\\"><button class=\\"btn btn-green btn-sm\\">📲 WhatsApp</button></a>"+\n' +
'        "<button class=\\"btn btn-sm "+(isActive?"btn-outline":"btn-blue")+"\\" id=\\"atbtn_"+t.testId+"\\" onclick=\\"toggleStatus(\'"+t.testId+"\')\\">⏸ "+(isActive?"Deactivate":"Activate")+"</button>"+\n' +
'      "</td>"+\n' +
'    "</tr>";\n' +
'  }).join("") : emptyRow(12);\n' +
'}\n' +

'function copyTestLink(testId, encUrl) {\n' +
'  var url = decodeURIComponent(encUrl);\n' +
'  if (navigator.clipboard) {\n' +
'    navigator.clipboard.writeText(url).then(function() { showToast("✅ Link copied!"); });\n' +
'  } else {\n' +
'    var ta = document.createElement("textarea");\n' +
'    ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);\n' +
'    showToast("✅ Link copied!");\n' +
'  }\n' +
'}\n' +

'function toggleStatus(testId) {\n' +
'  var btn   = document.getElementById("atbtn_" + testId);\n' +
'  var badge = document.getElementById("atst_"  + testId);\n' +
'  if (btn) { btn.disabled = true; btn.textContent = "⏳..."; }\n' +
'  google.script.run\n' +
'    .withSuccessHandler(function(r) {\n' +
'      if (!r.ok) { showToast("❌ Error: " + r.error); if (btn) btn.disabled = false; return; }\n' +
'      var t = (DB.tests || []).find(function(x) { return x.testId === testId; });\n' +
'      if (t) t.status = r.newStatus;\n' +
'      var isActive = r.newStatus === "Active";\n' +
'      if (badge) { badge.textContent = r.newStatus; badge.className = "badge " + (isActive ? "badge-active" : "badge-warn"); }\n' +
'      if (btn)   { btn.disabled = false; btn.textContent = "⏸ " + (isActive ? "Deactivate" : "Activate"); btn.className = "btn btn-sm " + (isActive ? "btn-outline" : "btn-blue"); }\n' +
'      showToast(isActive ? "✅ Test Activated!" : "⏸ Test Deactivated!");\n' +
'    })\n' +
'    .withFailureHandler(function(e) {\n' +
'      if (btn) { btn.disabled = false; btn.textContent = "⏸ Toggle"; }\n' +
'      showToast("❌ Failed: " + e.message);\n' +
'    })\n' +
'    .toggleTestStatus(testId);\n' +
'}\n' +

'function showToast(msg) {\n' +
'  var t = document.getElementById("toast");\n' +
'  if (!t) {\n' +
'    t = document.createElement("div"); t.id = "toast";\n' +
'    t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);transition:opacity .3s;";\n' +
'    document.body.appendChild(t);\n' +
'  }\n' +
'  t.textContent = msg; t.style.opacity = "1";\n' +
'  setTimeout(function() { t.style.opacity = "0"; }, 2500);\n' +
'}\n' +

'function exportActiveTestsCSV() {\n' +
'  var tsMap = {};\n' +
'  (DB.testStats || []).forEach(function(t) { tsMap[t.testId] = t; });\n' +
'  var rows = DB.tests || [];\n' +
'  var h = ["Title","Teacher","Trade","Created","Duration","Questions","Appeared","Avg%","Pass Rate","Status","Link"];\n' +
'  var csv = [h.join(",")].concat(rows.map(function(t) {\n' +
'    var ts = tsMap[t.testId] || { total:0, avgScore:0, passRate:0 };\n' +
'    return [t.title,t.teacher,t.trade,t.created,t.duration,t.questions,ts.total,ts.avgScore,ts.passRate+"%",t.status,t.studentUrl]\n' +
'      .map(function(v){return \'"\'+String(v||"").replace(/"/g,\'""\')+\'"\';}).join(",");\n' +
'  })).join("\\n");\n' +
'  var a = document.createElement("a");\n' +
'  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));\n' +
'  a.download = "Active_Tests.csv"; a.click();\n' +
'}\n' +

/* ALL TESTS */
'function filterTests() {\n' +
'  var q  = document.getElementById("testSearch").value.toLowerCase();\n' +
'  var st = document.getElementById("testStatusF").value;\n' +
'  var tests = (DB.tests||[]).filter(function(t){ return (!q||(t.title+t.teacher+t.trade).toLowerCase().includes(q))&&(!st||t.status===st); });\n' +
'  document.getElementById("allTestsTitle").textContent = "All Tests ("+tests.length+")";\n' +
'  var tsMap = {}; (DB.testStats||[]).forEach(function(t){tsMap[t.testId]=t;});\n' +
'  document.getElementById("allTestsTbody").innerHTML = tests.map(function(t,i){\n' +
'    var ts = tsMap[t.testId]||{total:0,avgScore:0,passRate:0};\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(t.title)+\'</b></td><td>\'+esc(t.teacher)+\'</td><td>\'+esc(t.trade)+\'</td><td>\'+esc(t.created)+\'</td><td>\'+esc(t.duration)+\'</td><td>\'+t.questions+\'</td><td><b>\'+ts.total+\'</b></td><td>\'+barCell(ts.avgScore)+\'</td><td><span class="badge \'+(ts.passRate>=60?"badge-pass":"badge-fail")+\'">\'+ts.passRate+\'%</span></td><td><span class="badge \'+(t.status==="Active"?"badge-active":"badge-warn")+\'">\'+t.status+\'</span></td></tr>\';\n' +
'  }).join("") || emptyRow(11);\n' +
'}\n' +
'function renderAllTests(){filterTests();}\n' +

/* ATTENDANCE */
'function renderAttendance() {\n' +
'  var att = DB.attendance||[];\n' +
'  document.getElementById("attTitle").textContent = "Test Attendance ("+att.length+" tests)";\n' +
'  document.getElementById("attTbody").innerHTML = att.map(function(t,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(t.title)+\'</b></td><td>\'+esc(t.teacher)+\'</td><td>\'+esc(t.trade)+\'</td><td>\'+esc(t.date)+\'</td><td>\'+t.questions+\'</td><td><b style="color:var(--blue);">\'+t.submissions+\'</b></td><td><span class="badge \'+(t.status==="Active"?"badge-active":"badge-warn")+\'">\'+t.status+\'</span></td><td><button class="btn btn-blue btn-sm" onclick="showAttDetail(\\\'\'+encodeURIComponent(t.testId)+\'\\\')">View</button></td></tr>\';\n' +
'  }).join("") || emptyRow(9);\n' +
'}\n' +
'function showAttDetail(encId) {\n' +
'  var tid = decodeURIComponent(encId);\n' +
'  var att = (DB.attendance||[]).find(function(t){return t.testId===tid;});\n' +
'  if (!att) return;\n' +
'  document.getElementById("attDetailTitle").textContent = esc(att.title)+" — "+att.students.length+" students";\n' +
'  document.getElementById("attDetail").style.display = "block";\n' +
'  document.getElementById("attDetailTbody").innerHTML = att.students.map(function(s,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(s.name)+\'</b></td><td>\'+esc(s.roll)+\'</td><td>\'+esc(s.batch)+\'</td><td>\'+esc(s.date)+\'</td><td>\'+barCell(s.pct)+\'</td><td><span class="badge \'+(s.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+s.status+\'</span></td></tr>\';\n' +
'  }).join("") || emptyRow(7);\n' +
'  document.getElementById("attDetail").scrollIntoView({behavior:"smooth"});\n' +
'}\n' +

/* STUDENTS LIST TAB */
'var _filteredStu = [];\n' +
'function filterStudents() {\n' +
'  var q = document.getElementById("stuSearch").value.toLowerCase();\n' +
'  var b = document.getElementById("stuBatch").value;\n' +
'  var g = document.getElementById("stuGrade").value;\n' +
'  _filteredStu = (DB.students||[]).filter(function(s){\n' +
'    return (!q||(s.name+s.roll).toLowerCase().includes(q))&&(!b||s.batch===b)&&(!g||s.grade===g);\n' +
'  });\n' +
'  document.getElementById("stuTitle").textContent = "Students ("+_filteredStu.length+")";\n' +
'  var gcls = {"A+":"g-ap","A":"g-a","B+":"g-a","B":"g-b","C":"g-c","D":"g-d","F":"g-f"};\n' +
'  document.getElementById("stuTbody").innerHTML = _filteredStu.map(function(s,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(s.name)+\'</b></td><td>\'+esc(s.roll)+\'</td><td>\'+esc(s.batch)+\'</td><td>\'+s.totalTests+\'</td><td>\'+barCell(s.avgPct)+\'</td><td><b>\'+s.bestPct+\'%</b></td><td style="color:var(--green);font-weight:700;">\'+s.passes+\'</td><td style="color:var(--red);font-weight:700;">\'+s.fails+\'</td><td><span class="grade \'+(gcls[s.grade]||"g-f")+\'">\'+s.grade+\'</span></td><td><button class="btn btn-blue btn-sm" onclick="openStuModal(\\\'\'+encodeURIComponent(s.name)+\'\\\',\\\'\'+encodeURIComponent(s.roll)+\'\\\')">View</button></td></tr>\';\n' +
'  }).join("") || emptyRow(11);\n' +
'}\n' +
'function renderStudents(){_filteredStu=DB.students||[];filterStudents();}\n' +

/* STUDENT MODAL (EXISTING) */
'function openStuModal(encName,encRoll) {\n' +
'  var s = (DB.students||[]).find(function(x){return x.name===decodeURIComponent(encName)&&x.roll===decodeURIComponent(encRoll);});\n' +
'  if (!s) return;\n' +
'  document.getElementById("stuModalTitle").textContent = s.name+" ("+s.roll+")";\n' +
'  var gcls = {"A+":"g-ap","A":"g-a","B+":"g-a","B":"g-b","C":"g-c","D":"g-d","F":"g-f"};\n' +
'  document.getElementById("stuModalBody").innerHTML =\n' +
'    \'<div class="stat-grid" style="margin-bottom:14px;">\'+\n' +
'    \'<div class="stat-card sc-blue"><div class="stat-label">Avg Score</div><div class="stat-value sv-blue">\'+s.avgPct+\'%</div></div>\'+\n' +
'    \'<div class="stat-card sc-green"><div class="stat-label">Best Score</div><div class="stat-value sv-green">\'+s.bestPct+\'%</div></div>\'+\n' +
'    \'<div class="stat-card sc-purple"><div class="stat-label">Tests</div><div class="stat-value sv-purple">\'+s.totalTests+\'</div></div>\'+\n' +
'    \'<div class="stat-card sc-amber"><div class="stat-label">Grade</div><div class="stat-value sv-amber">\'+s.grade+\'</div></div>\'+\'</div>\'+\n' +
'    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">\'+\n' +
'    \'<div style="background:#dcfce7;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:var(--green);">\'+s.passes+\'</div><div style="font-size:10px;font-weight:700;color:#15803d;">PASSED</div></div>\'+\n' +
'    \'<div style="background:#fee2e2;border-radius:8px;padding:10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:var(--red);">\'+s.fails+\'</div><div style="font-size:10px;font-weight:700;color:#b91c1c;">FAILED</div></div>\'+\'</div>\'+\n' +
'    \'<div class="card"><div class="card-head"><span class="card-title">Test History</span></div><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Test</th><th>Date</th><th>Score</th><th>%</th><th>Status</th></tr></thead><tbody>\'+\n' +
'    s.tests.map(function(t,i){ return \'<tr><td>\'+(i+1)+\'</td><td>\'+esc(t.title)+\'</td><td>\'+esc(t.date.substring(0,10))+\'</td><td>\'+t.score+\'/\'+t.total+\'</td><td>\'+barCell(t.pct)+\'</td><td><span class="badge \'+(t.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+t.status+\'</span></td></tr>\'; }).join("")+\n' +
'    \'</tbody></table></div></div>\';\n' +
'  document.getElementById("stuModal").classList.add("show");\n' +
'}\n' +
'function closeStuModal(){document.getElementById("stuModal").classList.remove("show");}\n' +

/* STUDENT ANALYTICS TAB (NEW) */
'var _saList = [];\n' +
'var _saListRendered = false;\n' +
'function renderStudentAnalytics() {\n' +
'  _saList = (DB.students || []).slice();\n' +
'  filterStudentAnalyticsList();\n' +
'}\n' +
'function filterStudentAnalyticsList() {\n' +
'  var q = document.getElementById("saSearch").value.toLowerCase();\n' +
'  var filtered = _saList.filter(function(s){ return (s.name+" "+s.roll).toLowerCase().includes(q); });\n' +
'  document.getElementById("saListTbody").innerHTML = filtered.map(function(s){\n' +
'    return \'<tr class="stu-row" onclick="loadStudentAnalysis(\\\'\'+encodeURIComponent(s.name)+\'\\\',\\\'\'+encodeURIComponent(s.roll)+\'\\\')" id="sarow_\'+s.name+\'_\'+s.roll+\'"><td><b>\'+esc(s.name)+\'</b><br><small>\'+esc(s.roll)+\'</small></td><td style="text-align:right;font-weight:700;">\'+s.avgPct+\'%</td></tr>\';\n' +
'  }).join("") || \'<tr><td colspan="2"><div class="empty">No students found</div></td></tr>\';\n' +
'}\n' +
'function loadStudentAnalysis(encName, encRoll) {\n' +
'  var name = decodeURIComponent(encName);\n' +
'  var roll = decodeURIComponent(encRoll);\n' +
'  var s = (DB.students||[]).find(function(x){return x.name===name && x.roll===roll;});\n' +
'  if(!s) return;\n' +
'  \n' +
'  // Highlight selected\n' +
'  document.querySelectorAll(".stu-row").forEach(function(r){r.classList.remove("active");});\n' +
'  var row = document.getElementById("sarow_"+name+"_"+roll);\n' +
'  if(row) row.classList.add("active");\n' +
'  \n' +
'  var gcls = {"A+":"g-ap","A":"g-a","B+":"g-a","B":"g-b","C":"g-c","D":"g-d","F":"g-f"};\n' +
'  \n' +
'  // Prepare Chart Data (Sort tests by date)\n' +
'  var sortedTests = s.tests.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });\n' +
'  var labels = sortedTests.map(function(t,i){ return "Test "+(i+1); });\n' +
'  var dataPct = sortedTests.map(function(t){ return t.pct; });\n' +
'  \n' +
'  document.getElementById("saDetailTitle").textContent = "Analytics: "+s.name+" ("+s.roll+")";\n' +
'  document.getElementById("saDetailBody").innerHTML =\n' +
'    \'<div class="stat-grid" style="margin-bottom:16px;">\'+\n' +
'      \'<div class="stat-card sc-blue"><div class="stat-label">Average Score</div><div class="stat-value sv-blue">\'+s.avgPct+\'%</div><div class="stat-sub">Overall Performance</div></div>\'+\n' +
'      \'<div class="stat-card sc-green"><div class="stat-label">Best Score</div><div class="stat-value sv-green">\'+s.bestPct+\'%</div><div class="stat-sub">Peak Performance</div></div>\'+\n' +
'      \'<div class="stat-card sc-purple"><div class="stat-label">Total Tests</div><div class="stat-value sv-purple">\'+s.totalTests+\'</div><div class="stat-sub">Assessments Taken</div></div>\'+\n' +
'      \'<div class="stat-card sc-amber"><div class="stat-label">Grade</div><div class="stat-value sv-amber">\'+s.grade+\'</div><div class="stat-sub">Final Grade</div></div>\'+\n' +
'    \'</div>\'+\n' +
'    \'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">\'+\n' +
'      \'<div style="background:#dcfce7;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:28px;font-weight:900;color:var(--green);">\'+s.passes+\'</div><div style="font-size:11px;font-weight:700;color:#15803d;">PASSED</div></div>\'+\n' +
'      \'<div style="background:#fee2e2;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:28px;font-weight:900;color:var(--red);">\'+s.fails+\'</div><div style="font-size:11px;font-weight:700;color:#b91c1c;">FAILED</div></div>\'+\n' +
'    \'</div>\'+\n' +
'    \'<div class="card" style="margin-bottom:16px;"><div class="card-head"><span class="card-title">📈 Performance Trend</span></div><div class="card-body"><div class="chart-wrap" style="height:200px;"><canvas id="saChart"></canvas></div></div></div>\'+\n' +
'    \'<div class="card"><div class="card-head"><span class="card-title">📝 Detailed Test History</span></div><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Test Name</th><th>Date</th><th>Score</th><th>Total</th><th>%</th><th>Status</th></tr></thead><tbody>\'+\n' +
'    sortedTests.map(function(t,i){ return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(t.title)+\'</b></td><td>\'+esc(t.date.substring(0,10))+\'</td><td>\'+t.score+\'</td><td>\'+t.total+\'</td><td>\'+t.pct+\'%</td><td><span class="badge \'+(t.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+t.status+\'</span></td></tr>\'; }).join("")+\n' +
'    \'</tbody></table></div></div>\';\n' +
'    \n' +
'  // Render Chart\n' +
'  setTimeout(function(){\n' +
'    if(_charts.saChart) _charts.saChart.destroy();\n' +
'    var ctx = document.getElementById("saChart");\n' +
'    if(ctx && sortedTests.length){\n' +
'      _charts.saChart = new Chart(ctx, {\n' +
'        type: "line",\n' +
'        data: {\n' +
'          labels: labels,\n' +
'          datasets: [{\n' +
'            label: "Percentage",\n' +
'            data: dataPct,\n' +
'            borderColor: "#1a56db",\n' +
'            backgroundColor: "rgba(26,86,219,0.1)",\n' +
'            borderWidth: 2,\n' +
'            tension: 0.3,\n' +
'            fill: true\n' +
'          }]\n' +
'        },\n' +
'        options: {\n' +
'          responsive: true,\n' +
'          maintainAspectRatio: false,\n' +
'          scales: { y: { beginAtZero: true, max: 100 }, x: { ticks: { maxRotation: 45, font:{size:10} } } },\n' +
'          plugins: { legend: { display: false } }\n' +
'        }\n' +
'      });\n' +
'    }\n' +
'  }, 100);\n' +
'}\n' +

/* TESTWISE PERFORMANCE TAB */
'var _filteredTW = [];\n' +
'function renderTestwise() {\n' +
'  _filteredTW = (DB.results || []).slice().sort(function(a,b){\n' +
'    return b.testTitle.localeCompare(a.testTitle) || b.studentName.localeCompare(a.studentName);\n' +
'  });\n' +
'  filterTestwise();\n' +
'}\n' +
'function filterTestwise() {\n' +
'  var qStu = document.getElementById("twSearchStu").value.toLowerCase();\n' +
'  var qTest = document.getElementById("twSearchTest").value.toLowerCase();\n' +
'  var b = document.getElementById("twBatch").value;\n' +
'  var filtered = _filteredTW.filter(function(r){\n' +
'    var batch = (r.trade||"")+(r.className?" — "+r.className:"");\n' +
'    return (!qStu || (r.studentName+r.rollNo).toLowerCase().includes(qStu)) &&\n' +
'           (!qTest || r.testTitle.toLowerCase().includes(qTest)) &&\n' +
'           (!b || batch === b);\n' +
'  });\n' +
'  document.getElementById("twTitle").textContent = "Testwise Performance ("+filtered.length+" records)";\n' +
'  document.getElementById("twTbody").innerHTML = filtered.map(function(r,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(r.studentName)+\'</b></td><td>\'+esc(r.rollNo)+\'</td><td>\'+esc((r.trade||"")+(r.className?" — "+r.className:""))+\'</td><td>\'+esc(r.testTitle)+\'</td><td>\'+r.score+\'</td><td>\'+r.totalMarks+\'</td><td>\'+r.percentage.toFixed(1)+\'%</td><td><span class="badge \'+(r.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+r.status+\'</span></td><td>\'+esc(r.submittedAt)+\'</td></tr>\';\n' +
'  }).join("") || \'<tr><td colspan="9"><div class="empty"><div class="empty-icon">📭</div>No data</div></td></tr>\';\n' +
'}\n' +
'function exportTestwiseCSV() {\n' +
'  var rows = _filteredTW.length ? _filteredTW : (DB.results||[]);\n' +
'  var h = ["Student","Roll","Batch","Test Title","Score","Total","Percentage","Status","Date"];\n' +
'  var csv = [h.join(",")].concat(rows.map(function(r){\n' +
'    return [r.studentName,r.rollNo,(r.trade||"")+(r.className?" — "+r.className:""),r.testTitle,r.score,r.totalMarks,r.percentage.toFixed(1)+"%",r.status,r.submittedAt]\n' +
'      .map(function(v){return \'"\'+String(v).replace(/"/g,\'""\')+\'"\';}).join(",");\n' +
'  })).join("\\n");\n' +
'  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download = "Testwise_Performance.csv"; a.click();\n' +
'}\n' +

/* PASS/FAIL */
'var _filteredPF = [];\n' +
'function filterPF() {\n' +
'  var q  = document.getElementById("pfSearch").value.toLowerCase();\n' +
'  var b  = document.getElementById("pfBatch").value;\n' +
'  var st = document.getElementById("pfStatus").value;\n' +
'  var tid= document.getElementById("pfTest").value;\n' +
'  _filteredPF = (DB.passFailReport||[]).filter(function(r){\n' +
'    return (!q||(r.studentName+r.rollNo+r.testTitle).toLowerCase().includes(q))&&\n' +
'           (!b||((r.trade||"")+(r.className?" — "+r.className:""))===b)&&(!st||r.status===st)&&(!tid||r.testId===tid);\n' +
'  });\n' +
'  document.getElementById("pfTitle").textContent = "Pass/Fail Report ("+_filteredPF.length+" records)";\n' +
'  document.getElementById("pfTbody").innerHTML = _filteredPF.map(function(r,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(r.studentName)+\'</b></td><td>\'+esc(r.rollNo)+\'</td><td>\'+esc((r.trade||"")+(r.className?" — "+r.className:""))+\'</td><td style="font-size:10px;font-family:monospace;">\'+esc(r.testId)+\'</td><td>\'+esc(r.testTitle)+\'</td><td>\'+esc(r.submittedAt)+\'</td><td>\'+r.score+\'</td><td>\'+r.totalMarks+\'</td><td>\'+r.percentage.toFixed(1)+\'%</td><td><span class="badge \'+(r.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+r.status+\'</span></td><td>\'+(r.fsViolations||0)+\'</td><td>\'+(r.tabSwitches||0)+\'</td></tr>\';\n' +
'  }).join("") || emptyRow(13);\n' +
'}\n' +
'function renderPassFail(){_filteredPF=DB.passFailReport||[];filterPF();}\n' +

/* CLASS PERF */
'function renderClassPerf() {\n' +
'  var data = DB.batchStats||[];\n' +
'  document.getElementById("batchCards").innerHTML = data.map(function(b){\n' +
'    var fc = b.avgPct>=70?"pf-green":b.avgPct>=50?"pf-blue":b.avgPct>=40?"pf-amber":"pf-red";\n' +
'    return \'<div class="stat-card sc-blue"><div class="stat-label">\'+esc(b.batch)+\'</div><div class="stat-value sv-blue">\'+b.avgPct+\'%</div><div class="pbar"><div class="pbar-fill \'+fc+\'" style="width:\'+Math.min(b.avgPct,100)+\'%"></div></div><div class="stat-sub">\'+b.totalStudents+\' students | Pass: \'+b.passRate+\'%</div></div>\';\n' +
'  }).join("");\n' +
'  setTimeout(function(){\n' +
'    if (_charts.batchAvg) _charts.batchAvg.destroy();\n' +
'    var ctx1 = document.getElementById("batchAvgChart");\n' +
'    if (ctx1 && data.length) _charts.batchAvg = new Chart(ctx1,{type:"bar",data:{labels:data.map(function(b){return b.batch;}),datasets:[{label:"Avg %",data:data.map(function(b){return b.avgPct;}),backgroundColor:"rgba(26,86,219,.75)",borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}},plugins:{legend:{display:false}}}});\n' +
'    if (_charts.batchPass) _charts.batchPass.destroy();\n' +
'    var ctx2 = document.getElementById("batchPassChart");\n' +
'    if (ctx2 && data.length) _charts.batchPass = new Chart(ctx2,{type:"bar",data:{labels:data.map(function(b){return b.batch;}),datasets:[{label:"Pass Rate %",data:data.map(function(b){return b.passRate;}),backgroundColor:"rgba(5,150,105,.75)",borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100}},plugins:{legend:{display:false}}}});\n' +
'  },300);\n' +
'  document.getElementById("batchTbody").innerHTML = data.map(function(b){\n' +
'    return \'<tr><td><b>\'+esc(b.batch)+\'</b></td><td>\'+b.totalStudents+\'</td><td>\'+b.totalSubs+\'</td><td>\'+barCell(b.avgPct)+\'</td><td><span class="badge \'+(b.passRate>=60?"badge-pass":"badge-fail")+\'">\'+b.passRate+\'%</span></td><td>\'+b.tests.length+\'</td><td><button class="btn btn-blue btn-sm" onclick="openBatchModal(\\\'\'+encodeURIComponent(b.batch)+\'\\\')">Details</button></td></tr>\';\n' +
'  }).join("") || emptyRow(7);\n' +
'}\n' +

/* BATCH MODAL */
'function openBatchModal(encBatch) {\n' +
'  var batch = decodeURIComponent(encBatch);\n' +
'  var b = (DB.batchStats||[]).find(function(x){return x.batch===batch;});\n' +
'  if (!b) return;\n' +
'  document.getElementById("batchModalTitle").textContent = "🏫 "+batch;\n' +
'  document.getElementById("batchModalBody").innerHTML =\n' +
'    \'<div class="stat-grid" style="margin-bottom:14px;">\'+\n' +
'    \'<div class="stat-card sc-blue"><div class="stat-label">Students</div><div class="stat-value sv-blue">\'+b.totalStudents+\'</div></div>\'+\n' +
'    \'<div class="stat-card sc-purple"><div class="stat-label">Submissions</div><div class="stat-value sv-purple">\'+b.totalSubs+\'</div></div>\'+\n' +
'    \'<div class="stat-card sc-amber"><div class="stat-label">Avg Score</div><div class="stat-value sv-amber">\'+b.avgPct+\'%</div></div>\'+\n' +
'    \'<div class="stat-card sc-green"><div class="stat-label">Pass Rate</div><div class="stat-value sv-green">\'+b.passRate+\'%</div></div>\'+\'</div>\'+\n' +
'    \'<div class="card"><div class="card-head"><span class="card-title">Test-wise</span></div><div class="tbl-wrap"><table><thead><tr><th>Test</th><th>Submissions</th><th>Avg%</th><th>Pass Rate</th></tr></thead><tbody>\'+\n' +
'    b.tests.map(function(t){ return \'<tr><td>\'+esc(t.title)+\'</td><td>\'+t.total+\'</td><td>\'+barCell(t.avgScore)+\'</td><td><span class="badge \'+(t.passRate>=60?"badge-pass":"badge-fail")+\'">\'+t.passRate+\'%</span></td></tr>\'; }).join("")+\n' +
'    \'</tbody></table></div></div>\';\n' +
'  document.getElementById("batchModal").classList.add("show");\n' +
'}\n' +

/* CHAPTERS */
'function renderChapters() { renderChapterDisplay(buildChapterData()); }\n' +
'function buildChapterData() {\n' +
'  var chMap = {};\n' +
'  (DB.results||[]).forEach(function(r) {\n' +
'    var batch = (r.trade||"Unknown")+(r.className?" — "+r.className:"");\n' +
'    var key = batch+"||"+r.testTitle;\n' +
'    if (!chMap[key]) chMap[key] = {chapter:r.testTitle, batch:batch, correct:0, total:0};\n' +
'    chMap[key].total++;\n' +
'    if (r.status==="PASS") chMap[key].correct++;\n' +
'  });\n' +
'  return Object.values(chMap).map(function(c){\n' +
'    var pct = c.total?Math.round(c.correct/c.total*100):0;\n' +
'    return {chapter:c.chapter, batch:c.batch, correct:c.correct, total:c.total, pct:pct,\n' +
'            strength:pct>=70?"Strong":pct>=40?"Average":"Weak"};\n' +
'  }).sort(function(a,b){return a.pct-b.pct;});\n' +
'}\n' +
'function filterChapters() {\n' +
'  var all = buildChapterData();\n' +
'  var b = document.getElementById("chBatch").value;\n' +
'  var st= document.getElementById("chStrength").value;\n' +
'  renderChapterDisplay(all.filter(function(c){return (!b||c.batch===b)&&(!st||c.strength===st);}));\n' +
'}\n' +
'function renderChapterDisplay(data) {\n' +
'  document.getElementById("chHeatmap").innerHTML = !data.length ? \'<div class="empty"><div class="empty-icon">📖</div>No data</div>\' :\n' +
'    \'<div class="heatmap-grid">\'+data.map(function(c){\n' +
'      var bg = c.pct>=70?"#059669":c.pct>=40?"#d97706":"#dc2626";\n' +
'      var op = (0.4 + c.pct/100*0.6).toFixed(2);\n' +
'      return \'<div class="hm-cell" style="background:\'+bg+\';opacity:\'+op+\'" title="\'+esc(c.chapter)+" — "+esc(c.batch)+": "+c.pct+\'%">\'+esc(c.chapter)+\' (\'+c.pct+\'%)</div>\';\n' +
'    }).join("")+\'</div>\';\n' +
'  document.getElementById("chTbody").innerHTML = data.map(function(c){\n' +
'    return \'<tr><td><b>\'+esc(c.chapter)+\'</b></td><td>\'+esc(c.batch)+\'</td><td>\'+c.correct+\'</td><td>\'+c.total+\'</td><td>\'+barCell(c.pct)+\'</td><td><span class="badge badge-\'+(c.strength==="Strong"?"pass":c.strength==="Average"?"warn":"fail")+\'">\'+c.strength+\'</span></td></tr>\';\n' +
'  }).join("") || emptyRow(6);\n' +
'}\n' +

/* PROGRESS */
'function populateProgressSelectors() { updateProgressSelector(); }\n' +
'function updateProgressSelector() {\n' +
'  var view = document.getElementById("progView").value;\n' +
'  var sel  = document.getElementById("progEntity");\n' +
'  sel.innerHTML = "";\n' +
'  if (view==="student") {\n' +
'    Object.keys(DB.progressStudents||{}).forEach(function(k){\n' +
'      var s = DB.progressStudents[k];\n' +
'      sel.innerHTML += \'<option value="\'+encodeURIComponent(k)+\'">\'+esc(s.name)+\' (\'+esc(s.roll)+\')</option>\';\n' +
'    });\n' +
'  } else {\n' +
'    Object.keys(DB.progressBatches||{}).forEach(function(b){\n' +
'      sel.innerHTML += \'<option value="\'+encodeURIComponent(b)+\'">\'+esc(b)+\'</option>\';\n' +
'    });\n' +
'  }\n' +
'  renderProgressChart();\n' +
'}\n' +
'function renderProgressChart() {\n' +
'  var view = document.getElementById("progView").value;\n' +
'  var eKey = decodeURIComponent(document.getElementById("progEntity").value||"");\n' +
'  if (!eKey) return;\n' +
'  var labels=[], dataArr=[], title="";\n' +
'  if (view==="student") {\n' +
'    var sd = (DB.progressStudents||{})[eKey]; if (!sd) return;\n' +
'    title = "📈 "+sd.name+" — Progress";\n' +
'    labels  = sd.points.map(function(p){return p.title.substring(0,15);});\n' +
'    dataArr = sd.points.map(function(p){return p.pct;});\n' +
'  } else {\n' +
'    var bd = (DB.progressBatches||{})[eKey]; if (!bd) return;\n' +
'    title = "📈 "+eKey+" — Class Progress";\n' +
'    labels  = bd.map(function(p){return p.title.substring(0,15);});\n' +
'    dataArr = bd.map(function(p){return p.avg;});\n' +
'  }\n' +
'  document.getElementById("progTitle").textContent = title;\n' +
'  setTimeout(function(){\n' +
'    if (_charts.progress) _charts.progress.destroy();\n' +
'    var ctx = document.getElementById("progressChart"); if (!ctx) return;\n' +
'    _charts.progress = new Chart(ctx,{type:"line",\n' +
'      data:{labels:labels,datasets:[{label:eKey,data:dataArr,borderColor:"#1a56db",backgroundColor:"rgba(26,86,219,.1)",borderWidth:2.5,pointRadius:5,tension:.35,fill:true}]},\n' +
'      options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100,grid:{color:"#f1f5f9"}},x:{ticks:{font:{size:9},maxRotation:45}}},plugins:{legend:{display:false}}}});\n' +
'  },200);\n' +
'}\n' +

/* LEADERBOARD */
'function populateLeaderboardBatches() {\n' +
'  var lbSel = document.getElementById("lbView");\n' +
'  Object.keys((DB.leaderboard||{}).byBatch||{}).forEach(function(b){\n' +
'    lbSel.innerHTML += \'<option value="\'+encodeURIComponent(b)+\'">🏫 \'+esc(b)+\'</option>\';\n' +
'  });\n' +
'}\n' +
'function renderLeaderboard() {\n' +
'  var val  = document.getElementById("lbView").value;\n' +
'  var list = val==="overall" ? (DB.leaderboard||{}).overall||[] : ((DB.leaderboard||{}).byBatch||{})[decodeURIComponent(val)]||[];\n' +
'  document.getElementById("lbTitle").textContent = val==="overall"?"🏆 Overall Leaderboard":"🏆 "+decodeURIComponent(val);\n' +
'  var gcls = {"A+":"g-ap","A":"g-a","B+":"g-a","B":"g-b","C":"g-c","D":"g-d","F":"g-f"};\n' +
'  document.getElementById("lbBody").innerHTML = !list.length ? \'<div class="empty"><div class="empty-icon">🏆</div>No data</div>\' :\n' +
'    list.map(function(s,i){\n' +
'      var icon = i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1);\n' +
'      var rcls = i===0?"rank-1":i===1?"rank-2":i===2?"rank-3":"";\n' +
'      return \'<div class="lb-item"><div class="lb-rank \'+rcls+\'">\'+icon+\'</div><div style="flex:1"><div class="lb-name">\'+esc(s.name)+\'</div><div class="lb-sub">Roll: \'+esc(s.roll)+\' • \'+esc(s.batch)+\' • \'+s.totalTests+\' tests</div></div><span class="grade \'+(gcls[s.grade]||"g-f")+\'" style="margin-right:8px;">\'+s.grade+\'</span><div class="lb-score">\'+s.avgPct+\'%</div></div>\';\n' +
'    }).join("");\n' +
'}\n' +

/* INTEGRITY */
'function renderIntegrity() {\n' +
'  var rows = DB.integrityFlags||[];\n' +
'  document.getElementById("intBadge").textContent = rows.length+" flagged";\n' +
'  document.getElementById("intTbody").innerHTML = rows.length ? rows.map(function(r,i){\n' +
'    return \'<tr><td>\'+(i+1)+\'</td><td><b>\'+esc(r.studentName)+\'</b></td><td>\'+esc(r.rollNo)+\'</td><td>\'+esc(r.trade)+\' / \'+esc(r.className)+\'</td><td>\'+esc(r.testTitle)+\'</td><td style="color:var(--red);font-weight:700;">\'+r.fsViolations+\'</td><td style="color:var(--red);font-weight:700;">\'+r.tabSwitches+\'</td><td>\'+r.percentage.toFixed(1)+\'%</td><td><span class="badge \'+(r.status==="PASS"?"badge-pass":"badge-fail")+\'">\'+r.status+\'</span></td></tr>\';\n' +
'  }).join("") : \'<tr><td colspan="9"><div class="empty"><div class="empty-icon">✅</div>No integrity flags!</div></td></tr>\';\n' +
'}\n' +

/* EXPORT */
'function exportCSV() {\n' +
'  var rows = _filteredPF.length ? _filteredPF : (DB.passFailReport||[]);\n' +
'  var h = ["Student","Roll","Batch","Test ID","Test Name","Date","Score","Total","Percentage","Status","FS Violations","Tab Switches"];\n' +
'  var csv = [h.join(",")].concat(rows.map(function(r){\n' +
'    return [r.studentName,r.rollNo,(r.trade||"")+(r.className?" — "+r.className:""),r.testId,r.testTitle,r.submittedAt,r.score,r.totalMarks,r.percentage.toFixed(1)+"%",r.status,r.fsViolations||0,r.tabSwitches||0]\n' +
'      .map(function(v){return \'"\'+String(v).replace(/"/g,\'""\')+\'"\';}).join(",");\n' +
'  })).join("\\n");\n' +
'  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download = "PassFail_Report.csv"; a.click();\n' +
'}\n' +
'function exportPassFailPDF(){\n' +
'  html2pdf().set({margin:8,filename:"PassFail_Report.pdf",html2canvas:{scale:1.5},jsPDF:{orientation:"landscape",unit:"mm",format:"a3"}}).from(document.getElementById("pfTableWrap")).save();\n' +
'}\n' +
'function exportCurrentPDF(){\n' +
'  html2pdf().set({margin:10,filename:"Principal_Report.pdf",html2canvas:{scale:1.5},jsPDF:{orientation:"landscape",unit:"mm",format:"a3"}}).from(document.querySelector(".tab-pane.active")).save();\n' +
'}\n' +
'function exportStudentPDF(){\n' +
'  html2pdf().set({margin:10,filename:"Student_Report.pdf",html2canvas:{scale:2},jsPDF:{orientation:"portrait",unit:"mm",format:"a4"}}).from(document.getElementById("stuModalBody")).save();\n' +
'}\n' +

/* UTILS */
'function barCell(pct){\n' +
'  var fc=pct>=70?"pf-green":pct>=50?"pf-blue":pct>=40?"pf-amber":"pf-red";\n' +
'  return \'<div style="min-width:80px"><b>\'+pct.toFixed(1)+\'%</b><div class="pbar"><div class="pbar-fill \'+fc+\'" style="width:\'+Math.min(pct,100)+\'%"></div></div></div>\';\n' +
'}\n' +
'function emptyRow(n){return \'<tr><td colspan="\'+n+\'"><div class="empty"><div class="empty-icon">📭</div>No data</div></td></tr>\';}\n' +
'function esc(s){if(!s)return "";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}\n' +

'<\/script>\n' +
'</body>\n' +
'</html>';
}