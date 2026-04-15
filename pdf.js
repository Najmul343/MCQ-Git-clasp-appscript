// ============================================
// ImageCapture.gs — PDF VIEWER + SCREENSHOT UPLOADER (v4 — fixed)
// Add this as a NEW FILE in same Apps Script project
// Replaces showImageUploader() and handleFileUpload() in code.gs
// ============================================

function showImageUploader() {
  var active = SpreadsheetApp.getActiveRange();
  var selectedCell = active ? active.getA1Notation() : 'B2';
  var sheetName = SpreadsheetApp.getActiveSheet().getName();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput(buildImageCaptureHtml(selectedCell, sheetName))
      .setWidth(880)
      .setHeight(700),
    '📸 Image Capture & Upload'
  );
}

function getSelectedCell() {
  var active = SpreadsheetApp.getActiveRange();
  return active ? active.getA1Notation() : 'B2';
}

function uploadCapturedImage(base64Data, fileName, mimeType, targetCell, sheetName, folderName) {
  folderName = folderName || 'QUIZ_IMAGES';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var url  = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();
  if (!sheet) sheet = ss.getActiveSheet();
  sheet.getRange(targetCell).setValue(url);
  return { url: url, cell: targetCell };
}

function pasteUrlToCell(url, targetCell, sheetName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getActiveSheet();
  if (!sheet) sheet = ss.getActiveSheet();
  sheet.getRange(targetCell).setValue(url);
  return { cell: targetCell };
}

// ============================================================
function buildImageCaptureHtml(selectedCell, activeSheet) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0;}' +
'body{font-family:\'Segoe UI\',Arial,sans-serif;font-size:13px;background:#f1f5f9;color:#1e293b;overflow-x:hidden;}' +
'#cellBar{background:#1a56db;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}' +
'.bar-lbl{font-size:10px;color:#93c5fd;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-right:2px;}' +
'#cellInput{background:#fff;color:#1e293b;border:2px solid transparent;border-radius:6px;padding:5px 10px;font-size:15px;font-weight:700;width:80px;text-align:center;text-transform:uppercase;}' +
'#cellInput:focus{outline:none;border-color:#fbbf24;}' +
'#sheetInput{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:5px 10px;font-size:12px;width:130px;}' +
'#folderInput{background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:5px 10px;font-size:12px;width:120px;}' +
'#sheetInput::placeholder,#folderInput::placeholder{color:rgba(255,255,255,0.5);}' +
'#syncBtn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;border-radius:6px;padding:7px 13px;font-size:12px;font-weight:600;cursor:pointer;position:sticky;right:0;}' +
'#syncBtn:hover{background:rgba(255,255,255,0.28);}' +
'#cellBadge{background:#22c55e;color:#fff;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700;display:none;white-space:nowrap;}' +
'.tabs{display:flex;background:#fff;border-bottom:2px solid #e2e8f0;}' +
'.tab{flex:1;text-align:center;padding:9px 4px 7px;cursor:pointer;font-size:11px;font-weight:700;color:#64748b;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:3px;}' +
'.tab .ti{font-size:18px;}' +
'.tab.active{color:#1a56db;border-bottom-color:#1a56db;background:#f0f7ff;}' +
'.tab:hover:not(.active){background:#f8fafc;}' +
'.panel{display:none;padding:12px;}' +
'.panel.active{display:block;}' +
'.choose-lbl{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:16px;background:#fff;border:2px dashed #94a3b8;border-radius:10px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s;margin-bottom:8px;}' +
'.choose-lbl:hover{border-color:#1a56db;color:#1a56db;background:#f0f7ff;}' +
'#pdfToolbar{display:none;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;margin-bottom:8px;gap:6px;align-items:center;}' +
'#pdfToolbar.vis{display:flex;}' +
'.ztbn{padding:5px 10px;border:1px solid #cbd5e1;border-radius:5px;background:#f8fafc;font-size:13px;font-weight:700;cursor:pointer;color:#1e293b;line-height:1;}' +
'.ztbn:hover{background:#e2e8f0;}' +
'.ztbn.blue{background:#1a56db;color:#fff;border-color:#1a56db;}' +
'.ztbn.blue:hover{background:#1345b5;}' +
'#zoomPct{font-size:12px;font-weight:700;color:#1a56db;min-width:40px;text-align:center;}' +
'#pageInfo{font-size:12px;color:#64748b;flex:1;text-align:center;}' +
'#pdfViewport{display:none;width:100%;height:420px;overflow:auto;border:2px solid #cbd5e1;border-radius:8px;background:#525659;position:relative;cursor:crosshair;}' +
'#pdfViewport.vis{display:block;}' +
'#pdfCanvas{display:block;margin:8px auto;box-shadow:0 2px 12px rgba(0,0,0,.4);}' +
'#selBox{position:absolute;border:2px dashed #f97316;background:rgba(249,115,22,.12);pointer-events:none;display:none;}' +
'#selSize{position:absolute;background:#f97316;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;pointer-events:none;display:none;white-space:nowrap;}' +
'#captureBar{display:none;gap:8px;position:sticky;bottom:0;z-index:50;background:#f1f5f9;padding:8px 0 4px;}' +
'#captureBar.vis{display:flex;}' +
'#capRegionBtn{flex:1;padding:11px;border:none;border-radius:8px;background:#f97316;color:#fff;font-size:13px;font-weight:700;cursor:pointer;}' +
'#capRegionBtn:hover{background:#ea6b0a;}' +
'#capRegionBtn:disabled{opacity:.4;cursor:not-allowed;}' +
'#capFullBtn{padding:11px 16px;border:none;border-radius:8px;background:#1a56db;color:#fff;font-size:13px;font-weight:700;cursor:pointer;}' +
'#capFullBtn:hover{background:#1345b5;}' +
'#imgPreviewWrap{display:none;margin-top:8px;}' +
'#imgCanvas{width:100%;max-height:260px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;}' +
'#uploadImgBtn{width:100%;padding:11px;border:none;border-radius:8px;background:#10b981;color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;display:none;}' +
'#uploadImgBtn:hover{background:#059669;}' +
'#camVideo{width:100%;border-radius:8px;margin-top:8px;display:none;max-height:280px;background:#000;}' +
'#camSnapBtn{width:100%;padding:11px;border:none;border-radius:8px;background:#f97316;color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px;display:none;}' +
'#camSnapBtn:hover{background:#ea6b0a;}' +
'#camStartBtn{width:100%;padding:11px;border:none;border-radius:8px;background:#1a56db;color:#fff;font-size:13px;font-weight:700;cursor:pointer;}' +
'#camStartBtn:hover{background:#1345b5;}' +
'.statbox{padding:10px 14px;border-radius:8px;font-size:12px;line-height:1.5;margin-top:8px;display:none;}' +
'.sok{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;}' +
'.ser{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;}' +
'.sld{background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;}' +
'.urlrow{display:none;margin-top:6px;background:#f0fdf4;border:1px solid #a7f3d0;border-radius:7px;padding:8px 10px;font-size:11px;font-family:monospace;word-break:break-all;align-items:center;gap:8px;}' +
'.urlrow.vis{display:flex;}' +
'.urltxt{flex:1;color:#065f46;}' +
'.copybtn{background:#059669;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:11px;cursor:pointer;white-space:nowrap;flex-shrink:0;}' +
'.copybtn:hover{background:#047857;}' +
'.hist-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;padding:8px 0 4px;letter-spacing:0.5px;}' +
'.hist-row{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #f1f5f9;border-radius:8px;margin-bottom:6px;background:#fff;}' +
'.hist-row:hover{border-color:#e2e8f0;}' +
'.hist-thumb{width:54px;height:54px;border-radius:6px;border:1px solid #e2e8f0;object-fit:cover;flex-shrink:0;background:#f1f5f9;cursor:pointer;transition:opacity .15s;}' +
'.hist-thumb:hover{opacity:0.75;}' +
'.hist-cell{font-weight:700;color:#1a56db;font-size:13px;min-width:36px;}' +
'.hist-name{color:#64748b;font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
'.hbtn{border:1px solid #e2e8f0;border-radius:5px;padding:4px 9px;font-size:11px;cursor:pointer;background:#fff;color:#1e293b;white-space:nowrap;}' +
'.hbtn:hover{border-color:#1a56db;color:#1a56db;}' +
'.hbtn.rp{background:#dbeafe;border-color:#93c5fd;color:#1e40af;}' +
'.hbtn.rp:hover{background:#bfdbfe;}' +
'.hist-empty{padding:20px;text-align:center;color:#94a3b8;font-size:12px;}' +
'#fsOverlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;flex-direction:column;}' +
'#fsOverlay.open{display:flex;}' +
'#fsBar{background:#1e293b;padding:8px 12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex-shrink:0;}' +
'#fsBar button{padding:6px 11px;border:1px solid #475569;border-radius:5px;background:#334155;color:#fff;font-size:12px;cursor:pointer;}' +
'#fsBar button:hover{background:#475569;}' +
'#fsPageInfo{color:#94a3b8;font-size:12px;flex:1;text-align:center;}' +
'#fsZoomPct{color:#60a5fa;font-weight:700;font-size:13px;min-width:44px;text-align:center;}' +
'#fsHint{color:#fb923c;font-size:11px;padding:5px 14px;background:#1e293b;text-align:center;}' +
'#fsViewport{flex:1;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:12px;cursor:crosshair;position:relative;}' +
'#fsCanvas{display:block;border-radius:3px;box-shadow:0 4px 24px rgba(0,0,0,.6);}' +
'#fsSelBox{position:absolute;border:2px dashed #f97316;background:rgba(249,115,22,.12);pointer-events:none;display:none;}' +
'#fsSelSize{position:absolute;background:#f97316;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;pointer-events:none;display:none;white-space:nowrap;}' +

// ── NEW: minimize styles (purely additive) ──
'#miniStrip{display:none;background:#1a56db;color:#fff;padding:6px 14px;align-items:center;gap:10px;font-size:12px;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.15);}' +
'#miniStrip.vis{display:flex;}' +
'#mainBody{transition:opacity .15s;}' +
'#mainBody.hidden{display:none;}' +
'.minibtn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.35);color:#fff;border-radius:6px;padding:4px 10px;font-size:16px;font-weight:700;cursor:pointer;line-height:1;flex-shrink:0;}' +
'.minibtn:hover{background:rgba(255,255,255,0.28);}' +
// ── END NEW ──

'</style></head><body>' +

// ── NEW: mini strip shown when minimized (purely additive) ──
// ── NEW: always-visible top bar with − button, sits outside mainBody ──
'<div id="topMinBar" style="background:#1a56db;display:flex;align-items:center;justify-content:flex-end;padding:3px 8px;">' +
'<button class="minibtn" onclick="minimizeDialog()" title="Minimize — click sheet, then Restore" style="font-size:13px;padding:2px 10px;line-height:1.4;">− Minimize</button>' +
'</div>' +
// ── END NEW ──

'<div id="miniStrip">' +
'<span>📸 Image Capture</span>' +
'<span id="miniCell" style="background:rgba(255,255,255,0.2);padding:2px 10px;border-radius:5px;font-size:11px;"></span>' +
'<button class="minibtn" onclick="restoreDialog()" style="margin-left:auto;font-size:12px;padding:4px 14px;">▲ Restore</button>' +
'</div>' +
// ── END NEW ──

// ── NEW: wrap everything below in #mainBody (purely additive wrapper) ──
'<div id="mainBody">' +
// ── END NEW ──

// CELL BAR — original, untouched
'<div id="cellBar">' +
'<span class="bar-lbl">Cell</span>' +
'<input id="cellInput" type="text" value="' + selectedCell + '" maxlength="6" oninput="this.value=this.value.toUpperCase();updateLabels();" />' +
'<span class="bar-lbl" style="margin-left:6px;">Sheet</span>' +
'<input id="sheetInput" type="text" placeholder="' + activeSheet + '" />' +
'<span class="bar-lbl">Folder</span>' +
'<input id="folderInput" type="text" placeholder="QUIZ_IMAGES" />' +
'<div style="flex:1;"></div>' +
'<div id="cellBadge">✓ pasted</div>' +
'<button id="syncBtn" onclick="syncCell()">🔄 Sync from sheet</button>' +
'</div>' +
'<div style="background:#1e40af;color:#93c5fd;font-size:10px;padding:3px 14px;">💡 Type a cell (e.g. D5) — or click a cell in the spreadsheet then press Sync</div>' +

// TABS — original, untouched
'<div class="tabs">' +
'<div class="tab active" id="tbtn_pdf" onclick="switchTab(\'pdf\')"><span class="ti">📄</span><span>PDF</span></div>' +
'<div class="tab" id="tbtn_img" onclick="switchTab(\'img\')"><span class="ti">🖼️</span><span>Image</span></div>' +
'<div class="tab" id="tbtn_cam" onclick="switchTab(\'cam\')"><span class="ti">📷</span><span>Camera</span></div>' +
'<div class="tab" id="tbtn_hist" onclick="switchTab(\'hist\')"><span class="ti">🕒</span><span>History</span></div>' +
'</div>' +

// PDF PANEL — original, untouched
'<div class="panel active" id="tab_pdf">' +
'<label class="choose-lbl">📄 Click to choose a PDF file' +
'<input type="file" id="pdfFile" accept="application/pdf" style="display:none;" onchange="loadPdf(this)" /></label>' +
'<div id="pdfToolbar">' +
'<button class="ztbn" onclick="prevPage()">◀</button>' +
'<span id="pageInfo">Page 1 / 1</span>' +
'<button class="ztbn" onclick="nextPage()">▶</button>' +
// ── NEW: jump-to-page input (sidebar) ──
'<input id="jumpInput" type="number" min="1" title="Jump to page" onkeydown="if(event.key===\'Enter\')jumpToPage(\'jumpInput\')" style="width:48px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:5px;font-size:12px;font-weight:700;text-align:center;color:#1e293b;background:#f8fafc;" placeholder="Go#" />' +
'<button class="ztbn" onclick="jumpToPage(\'jumpInput\')" title="Jump to page">↵</button>' +
// ── END NEW ──
'<div style="width:1px;height:18px;background:#e2e8f0;"></div>' +
'<button class="ztbn" onclick="zoomOut()" style="font-size:17px;">−</button>' +
'<span id="zoomPct">150%</span>' +
'<button class="ztbn" onclick="zoomIn()" style="font-size:17px;">+</button>' +
'<button class="ztbn" onclick="zoomFit()">⬛ Fit</button>' +
'<div style="flex:1;"></div>' +
'<button class="ztbn blue" onclick="openFullscreen()">⛶ Expand</button>' +
'</div>' +
'<div id="pdfViewport"><canvas id="pdfCanvas"></canvas><div id="selBox"></div><div id="selSize"></div></div>' +
'<div id="captureBar">' +
'<button id="capRegionBtn" onclick="captureSelection()" disabled>📸 Capture Selection → <span id="capCell">' + selectedCell + '</span></button>' +
'<button id="capFullBtn" onclick="captureFullPage()">📄 Full Page → <span id="capCell2">' + selectedCell + '</span></button>' +
'</div>' +
'<div class="statbox" id="st1"></div>' +
'<div class="urlrow" id="ur1"><span class="urltxt" id="ut1"></span><button class="copybtn" onclick="doCopy(\'ut1\',\'cb1\')" id="cb1">Copy URL</button></div>' +
'</div>' +

// IMAGE PANEL — original, untouched
'<div class="panel" id="tab_img">' +
'<label class="choose-lbl">🖼️ Click to choose an image (JPG, PNG, GIF)' +
'<input type="file" id="imgFile" accept="image/*" style="display:none;" onchange="previewImg(this)" /></label>' +
'<div id="imgPreviewWrap"><canvas id="imgCanvas"></canvas></div>' +
'<button id="uploadImgBtn" onclick="uploadDirectImage()">☁️ Upload & paste URL into <span id="imgCapCell">' + selectedCell + '</span></button>' +
'<div class="statbox" id="st2"></div>' +
'<div class="urlrow" id="ur2"><span class="urltxt" id="ut2"></span><button class="copybtn" onclick="doCopy(\'ut2\',\'cb2\')" id="cb2">Copy URL</button></div>' +
'</div>' +

// CAMERA PANEL — original, untouched
'<div class="panel" id="tab_cam">' +
'<button id="camStartBtn" onclick="startCam()">📷 Start Camera</button>' +
'<video id="camVideo" autoplay playsinline></video>' +
'<button id="camSnapBtn" onclick="snapCam()">📸 Take Photo → paste into <span id="camCapCell">' + selectedCell + '</span></button>' +
'<canvas id="camCanvas" style="display:none;"></canvas>' +
'<div class="statbox" id="st3"></div>' +
'</div>' +

// HISTORY PANEL — original, untouched
'<div class="panel" id="tab_hist">' +
'<div id="histList"><div class="hist-empty">No uploads yet this session.</div></div>' +
'</div>' +

// FULLSCREEN OVERLAY — original, untouched
'<div id="fsOverlay">' +
'<div id="fsBar">' +
'<button onclick="fsPrev()">◀ Prev</button>' +
'<span id="fsPageInfo">Page 1 / 1</span>' +
'<button onclick="fsNext()">Next ▶</button>' +
// ── NEW: jump-to-page input (fullscreen) ──
'<input id="fsJumpInput" type="number" min="1" title="Jump to page" onkeydown="if(event.key===\'Enter\')jumpToPage(\'fsJumpInput\')" style="width:48px;padding:4px 6px;border:1px solid #475569;border-radius:5px;font-size:12px;font-weight:700;text-align:center;color:#fff;background:#334155;" placeholder="Go#" />' +
'<button onclick="jumpToPage(\'fsJumpInput\')" title="Jump to page">↵</button>' +
// ── END NEW ──
'<span style="color:#475569;padding:0 4px;">|</span>' +
'<button onclick="fsZoomOut()" style="font-size:15px;line-height:1;">−</button>' +
'<span id="fsZoomPct">200%</span>' +
'<button onclick="fsZoomIn()" style="font-size:15px;line-height:1;">+</button>' +
'<button onclick="fsZoomFit()">⬛ Fit</button>' +
'<span style="color:#475569;padding:0 4px;">|</span>' +
'<button onclick="fsCaptureSelection()" style="background:#f97316!important;border-color:#f97316!important;">📸 Capture Selection</button>' +
'<button onclick="fsCaptureFullPage()" style="background:#1a56db!important;border-color:#1a56db!important;">📄 Full Page</button>' +
'<div style="flex:1;"></div>' +
'<button onclick="closeFullscreen()" style="background:#dc2626!important;border-color:#dc2626!important;">✕ Close</button>' +
'</div>' +
'<div id="fsHint">✏️ Drag on the PDF to select a region, then click Capture Selection above</div>' +
'<div id="fsViewport"><canvas id="fsCanvas"></canvas><div id="fsSelBox"></div><div id="fsSelSize"></div></div>' +
'</div>' +

// ── NEW: close #mainBody wrapper ──
'</div>' +
// ── END NEW ──

'<script>' +

// ALL ORIGINAL JS — completely untouched
'pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";' +
'var pdfDoc=null,currentPage=1,totalPages=1;' +
'var zoomScale=1.5,fsZoomScale=2;' +
'var isDrawing=false,startX=0,startY=0,startOx=0,startOy=0,selRect={x:0,y:0,w:0,h:0};' +
'var fsDrawing=false,fsStartX=0,fsStartY=0,fsSelRect={x:0,y:0,w:0,h:0};' +
'var camStream=null,directImgData=null,directImgName=null,directImgMime=null,fsOpen=false;' +
'var uploadHistory=[];' +

'function getCell(){return document.getElementById("cellInput").value.trim().toUpperCase()||"B2";}' +
'function getSheet(){return document.getElementById("sheetInput").value.trim();}' +
'function getFolder(){return document.getElementById("folderInput").value.trim()||"QUIZ_IMAGES";}' +
'function updateLabels(){var c=getCell();["capCell","capCell2","imgCapCell","camCapCell"].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=c;});' +
// ── NEW: keep mini strip cell badge in sync (one line appended inside updateLabels) ──
'var mc=document.getElementById("miniCell");if(mc)mc.textContent=c;}' +
// ── END NEW ──

'function syncCell(){' +
'  google.script.run.withSuccessHandler(function(cell){' +
'    document.getElementById("cellInput").value=cell.toUpperCase();updateLabels();' +
'    var b=document.getElementById("cellBadge");b.textContent="🔄 "+cell;b.style.display="flex";' +
'    setTimeout(function(){b.style.display="none";},2000);' +
'  }).getSelectedCell();' +
'}' +

'function switchTab(id){' +
'  ["pdf","img","cam","hist"].forEach(function(t){' +
'    document.getElementById("tbtn_"+t).classList.toggle("active",t===id);' +
'    document.getElementById("tab_"+t).classList.toggle("active",t===id);' +
'  });' +
'  if(id==="hist")renderHistory();' +
'}' +

'function loadPdf(input){' +
'  if(!input.files||!input.files[0])return;' +
'  stat("Loading PDF...","sld","st1");' +
'  var reader=new FileReader();' +
'  reader.onload=function(ev){' +
'    var typedArr=new Uint8Array(ev.target.result);' +
'    pdfjsLib.getDocument(typedArr).promise.then(function(pdf){' +
'      pdfDoc=pdf;totalPages=pdf.numPages;currentPage=1;' +
'      document.getElementById("pdfToolbar").classList.add("vis");' +
'      document.getElementById("pdfViewport").classList.add("vis");' +
'      document.getElementById("captureBar").classList.add("vis");' +
'      zoomFit();' +
'      stat("PDF loaded — "+totalPages+" page(s). Drag on the page to select a region.","sok","st1");' +
'    }).catch(function(err){stat("PDF error: "+err.message,"ser","st1");});' +
'  };' +
'  reader.onerror=function(){stat("Could not read the file.","ser","st1");};' +
'  reader.readAsArrayBuffer(input.files[0]);' +
'}' +

'function renderPage(n,scl){' +
'  if(!pdfDoc)return;var s=scl||zoomScale;zoomScale=s;' +
'  document.getElementById("zoomPct").textContent=Math.round(s*100)+"%";' +
'  pdfDoc.getPage(n).then(function(page){' +
'    var vp=page.getViewport({scale:s});' +
'    var c=document.getElementById("pdfCanvas");c.width=vp.width;c.height=vp.height;' +
'    page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise.then(function(){' +
'      document.getElementById("pageInfo").textContent="Page "+n+" / "+totalPages;resetSel();' +
'    });' +
'  });' +
'}' +

'function fsRenderPage(n,scl){' +
'  if(!pdfDoc)return;var s=scl||fsZoomScale;fsZoomScale=s;' +
'  document.getElementById("fsZoomPct").textContent=Math.round(s*100)+"%";' +
'  pdfDoc.getPage(n).then(function(page){' +
'    var vp=page.getViewport({scale:s});' +
'    var c=document.getElementById("fsCanvas");c.width=vp.width;c.height=vp.height;' +
'    page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise.then(function(){' +
'      document.getElementById("fsPageInfo").textContent="Page "+n+" / "+totalPages;resetFsSel();' +
'    });' +
'  });' +
'}' +

'function zoomIn(){renderPage(currentPage,Math.min(zoomScale+0.25,4));}' +
'function zoomOut(){renderPage(currentPage,Math.max(zoomScale-0.25,0.5));}' +
'function zoomFit(){' +
'  if(!pdfDoc){renderPage(currentPage,1.5);return;}' +
'  pdfDoc.getPage(currentPage).then(function(page){' +
'    var vp=page.getViewport({scale:1});' +
'    var w=document.getElementById("pdfViewport").clientWidth-24;' +
'    renderPage(currentPage,Math.max(0.5,Math.min(w/vp.width,4)));' +
'  });' +
'}' +
'function fsZoomIn(){fsRenderPage(currentPage,Math.min(fsZoomScale+0.25,5));}' +
'function fsZoomOut(){fsRenderPage(currentPage,Math.max(fsZoomScale-0.25,0.5));}' +
'function fsZoomFit(){' +
'  if(!pdfDoc){fsRenderPage(currentPage,2);return;}' +
'  pdfDoc.getPage(currentPage).then(function(page){' +
'    var vp=page.getViewport({scale:1});' +
'    var w=document.getElementById("fsViewport").clientWidth-32;' +
'    fsRenderPage(currentPage,Math.max(0.5,Math.min(w/vp.width,5)));' +
'  });' +
'}' +

'function prevPage(){if(currentPage>1){currentPage--;renderPage(currentPage);if(fsOpen)fsRenderPage(currentPage);}}' +
'function nextPage(){if(currentPage<totalPages){currentPage++;renderPage(currentPage);if(fsOpen)fsRenderPage(currentPage);}}' +
'function fsPrev(){if(currentPage>1){currentPage--;fsRenderPage(currentPage);renderPage(currentPage);}}' +
'function fsNext(){if(currentPage<totalPages){currentPage++;fsRenderPage(currentPage);renderPage(currentPage);}}' +

'function openFullscreen(){if(!pdfDoc){stat("Load a PDF first.","ser","st1");return;}fsOpen=true;document.getElementById("fsOverlay").classList.add("open");setTimeout(function(){fsZoomFit();},120);}' +
'function closeFullscreen(){fsOpen=false;document.getElementById("fsOverlay").classList.remove("open");}' +

'var sbC=document.getElementById("pdfCanvas");' +
'var sbBox=document.getElementById("selBox");' +
'var sbSz=document.getElementById("selSize");' +
'var sbVp=document.getElementById("pdfViewport");' +
'function getSbPos(e){' +
'  var vr=sbVp.getBoundingClientRect();' +
'  var cr=sbC.getBoundingClientRect();' +
'  var scaleX=sbC.width/cr.width;' +
'  var scaleY=sbC.height/cr.height;' +
'  var cx=e.clientX,cy=e.clientY;' +
'  var px=(cx-cr.left)*scaleX;' +
'  var py=(cy-cr.top)*scaleY;' +
'  var ox=(cx-vr.left)+sbVp.scrollLeft-(cr.left-vr.left+sbVp.scrollLeft);' +
'  var oy=(cy-vr.top)+sbVp.scrollTop-(cr.top-vr.top+sbVp.scrollTop);' +
'  var canvasOffsetX=cr.left-vr.left+sbVp.scrollLeft;' +
'  var canvasOffsetY=cr.top-vr.top+sbVp.scrollTop;' +
'  ox=(cx-cr.left)+canvasOffsetX;' +
'  oy=(cy-cr.top)+canvasOffsetY;' +
'  return{x:px,y:py,ox:ox,oy:oy};' +
'}' +
'sbC.addEventListener("mousedown",function(e){' +
'  google.script.run.withSuccessHandler(function(cell){' +
'    document.getElementById("cellInput").value=cell.toUpperCase();updateLabels();' +
'  }).getSelectedCell();' +
'  var p=getSbPos(e);isDrawing=true;startX=p.x;startY=p.y;startOx=p.ox;startOy=p.oy;' +
'  sbBox.style.cssText="display:block;left:"+p.ox+"px;top:"+p.oy+"px;width:0;height:0;";' +
'  sbSz.style.display="none";selRect={x:p.x,y:p.y,w:0,h:0};e.preventDefault();' +
'});' +
'document.addEventListener("mousemove",function(e){' +
'  if(!isDrawing)return;' +
'  var p=getSbPos(e);' +
'  selRect={x:Math.min(startX,p.x),y:Math.min(startY,p.y),w:Math.abs(p.x-startX),h:Math.abs(p.y-startY)};' +
'  var lx=Math.min(startOx,p.ox),ly=Math.min(startOy,p.oy);' +
'  var lw=Math.abs(p.ox-startOx),lh=Math.abs(p.oy-startOy);' +
'  sbBox.style.left=lx+"px";sbBox.style.top=ly+"px";' +
'  sbBox.style.width=lw+"px";sbBox.style.height=lh+"px";' +
'  if(selRect.w>5&&selRect.h>5){sbSz.style.display="block";sbSz.style.left=lx+"px";sbSz.style.top=(ly-22)+"px";sbSz.textContent=Math.round(selRect.w)+" × "+Math.round(selRect.h);}' +
'});' +
'document.addEventListener("mouseup",function(){if(!isDrawing)return;isDrawing=false;document.getElementById("capRegionBtn").disabled=!(selRect.w>5&&selRect.h>5);});' +
'function resetSel(){sbBox.style.display="none";sbSz.style.display="none";selRect={x:0,y:0,w:0,h:0};document.getElementById("capRegionBtn").disabled=true;}' +

'var fsVp=document.getElementById("fsViewport");var fsC=document.getElementById("fsCanvas");var fsSB=document.getElementById("fsSelBox");var fsSZ=document.getElementById("fsSelSize");' +
'function getFsPos(e){var r=fsC.getBoundingClientRect();var fvr=fsVp.getBoundingClientRect();var dx=e.clientX-r.left,dy=e.clientY-r.top;var sdx=(e.clientX-fvr.left)+fsVp.scrollLeft;var sdy=(e.clientY-fvr.top)+fsVp.scrollTop;return{x:dx*(fsC.width/r.width),y:dy*(fsC.height/r.height),sdx:sdx,sdy:sdy};}' +
'fsVp.addEventListener("mousedown",function(e){if(e.target!==fsC)return;var p=getFsPos(e);fsDrawing=true;fsStartX=p.x;fsStartY=p.y;fsSB.style.cssText="display:block;left:"+p.sdx+"px;top:"+p.sdy+"px;width:0;height:0;";fsSZ.style.display="none";fsSelRect={x:p.x,y:p.y,w:0,h:0};e.preventDefault();});' +
'document.addEventListener("mousemove",function(e){' +
'  if(!fsDrawing)return;' +
'  var p=getFsPos(e);var r=fsC.getBoundingClientRect();var fvr=fsVp.getBoundingClientRect();' +
'  var sx=fsStartX*(r.width/fsC.width)+(r.left-fvr.left+fsVp.scrollLeft);' +
'  var sy=fsStartY*(r.height/fsC.height)+(r.top-fvr.top+fsVp.scrollTop);' +
'  fsSelRect={x:Math.min(fsStartX,p.x),y:Math.min(fsStartY,p.y),w:Math.abs(p.x-fsStartX),h:Math.abs(p.y-fsStartY)};' +
'  fsSB.style.left=Math.min(sx,p.sdx)+"px";fsSB.style.top=Math.min(sy,p.sdy)+"px";' +
'  fsSB.style.width=Math.abs(p.sdx-sx)+"px";fsSB.style.height=Math.abs(p.sdy-sy)+"px";' +
'  if(fsSelRect.w>5&&fsSelRect.h>5){fsSZ.style.display="block";fsSZ.style.left=Math.min(sx,p.sdx)+"px";fsSZ.style.top=(Math.min(sy,p.sdy)-22)+"px";fsSZ.textContent=Math.round(fsSelRect.w)+" × "+Math.round(fsSelRect.h);}' +
'});' +
'document.addEventListener("mouseup",function(){if(fsDrawing)fsDrawing=false;});' +
'function resetFsSel(){fsSB.style.display="none";fsSZ.style.display="none";fsSelRect={x:0,y:0,w:0,h:0};}' +

'function captureSelection(){if(!pdfDoc){stat("Load a PDF first.","ser","st1");return;}if(selRect.w<5||selRect.h<5){stat("Draw a selection on the PDF first.","ser","st1");return;}cropAndUpload(sbC,selRect,"region_p"+currentPage+".png","st1","ur1","ut1");}' +
'function captureFullPage(){if(!pdfDoc){stat("Load a PDF first.","ser","st1");return;}doUpload(sbC,"page_"+currentPage+".png","st1","ur1","ut1");}' +
'function fsCaptureSelection(){if(fsSelRect.w<5||fsSelRect.h<5){stat("Draw a selection first.","ser","st1");return;}cropAndUpload(fsC,fsSelRect,"region_p"+currentPage+".png","st1","ur1","ut1");closeFullscreen();}' +
'function fsCaptureFullPage(){doUpload(fsC,"page_"+currentPage+".png","st1","ur1","ut1");closeFullscreen();}' +
'function cropAndUpload(src,rect,name,sid,urid,utid){var tmp=document.createElement("canvas");tmp.width=Math.round(rect.w);tmp.height=Math.round(rect.h);tmp.getContext("2d").drawImage(src,-Math.round(rect.x),-Math.round(rect.y));doUpload(tmp,name,sid,urid,utid);}' +
'function doUpload(c,name,sid,urid,utid){uploadToServer(c.toDataURL("image/png").split(",")[1],name,"image/png",sid,urid,utid);}' +

'function previewImg(input){' +
'  if(!input.files||!input.files[0])return;' +
'  var file=input.files[0];directImgName=file.name;directImgMime=file.type;' +
'  var fr=new FileReader();' +
'  fr.onload=function(e){var img=new Image();img.onload=function(){var c=document.getElementById("imgCanvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);directImgData=c.toDataURL(directImgMime).split(",")[1];document.getElementById("imgPreviewWrap").style.display="block";document.getElementById("uploadImgBtn").style.display="block";};img.src=e.target.result;};' +
'  fr.readAsDataURL(file);' +
'}' +
'function uploadDirectImage(){if(!directImgData){stat("Choose an image first.","ser","st2");return;}uploadToServer(directImgData,directImgName,directImgMime,"st2","ur2","ut2");}' +

'function startCam(){navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(function(stream){camStream=stream;var v=document.getElementById("camVideo");v.srcObject=stream;v.style.display="block";document.getElementById("camSnapBtn").style.display="block";document.getElementById("camStartBtn").style.display="none";}).catch(function(err){stat("Camera error: "+err.message,"ser","st3");});}' +
'function snapCam(){var v=document.getElementById("camVideo"),c=document.getElementById("camCanvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);if(camStream)camStream.getTracks().forEach(function(t){t.stop();});document.getElementById("camVideo").style.display="none";document.getElementById("camSnapBtn").style.display="none";document.getElementById("camStartBtn").style.display="block";uploadToServer(c.toDataURL("image/jpeg",0.92).split(",")[1],"camera_shot.jpg","image/jpeg","st3","ur1","ut1");}' +

'function uploadToServer(b64,fname,mime,sid,urid,utid){' +
'  var cell=getCell(),sheet=getSheet(),folder=getFolder();' +
'  stat("Uploading → pasting URL into cell "+cell+"...","sld",sid);' +
'  document.getElementById(urid).classList.remove("vis");' +
'  google.script.run' +
'    .withSuccessHandler(function(r){' +
'      stat("Done! URL pasted into "+r.cell,"sok",sid);' +
'      document.getElementById(utid).textContent=r.url;' +
'      document.getElementById(urid).classList.add("vis");' +
'      var b=document.getElementById("cellBadge");b.textContent="✓ "+r.cell;b.style.display="flex";' +
'      setTimeout(function(){b.style.display="none";},3000);' +
'      var _thumb="data:"+mime+";base64,"+b64;' +
'      uploadHistory.unshift({cell:r.cell,fname:fname,url:r.url,thumb:_thumb,time:new Date()});' +
'      if(uploadHistory.length>30)uploadHistory.pop();' +
'      resetSel();resetFsSel();' +
'    })' +
'    .withFailureHandler(function(e){stat("Error: "+e.message,"ser",sid);})' +
'    .uploadCapturedImage(b64,fname,mime,cell,sheet,folder);' +
'}' +

'function doCopy(txtId,btnId){' +
'  var text=document.getElementById(txtId).textContent;if(!text)return;' +
'  var btn=document.getElementById(btnId);' +
'  if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy URL";},1500);});}' +
'  else{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);btn.textContent="Copied!";setTimeout(function(){btn.textContent="Copy URL";},1500);}' +
'}' +

'function renderHistory(){' +
'  var el=document.getElementById("histList");' +
'  if(!uploadHistory.length){el.innerHTML=\'<div class="hist-empty">No uploads yet this session.</div>\';return;}' +
'  var h=\'<div class="hist-lbl">Recent uploads — this session</div>\';' +
'  uploadHistory.forEach(function(item,i){' +
'    var ago=timeSince(item.time);' +
'    h+=\'<div class="hist-row"><a href="\'+item.url+\'" target="_blank" title="Click to open full image"><img class="hist-thumb" src="\'+item.thumb+\'" alt=""/></a><div style="flex:1;min-width:0;"><span class="hist-cell">\'+item.cell+\'</span><br><span class="hist-name">\'+item.fname+\' • \'+ago+\'</span></div><button class="hbtn" onclick="copyHistUrl(\'+i+\')">Copy URL</button><button class="hbtn rp" onclick="repasteHist(\'+i+\')">Re-paste</button></div>\';' +
'  });' +
'  el.innerHTML=h;' +
'}' +
'function copyHistUrl(i){var text=uploadHistory[i].url;if(navigator.clipboard){navigator.clipboard.writeText(text);}else{var ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);}stat("URL copied!","sok","st1");}' +
'function repasteHist(i){var item=uploadHistory[i],cell=getCell(),sheet=getSheet();stat("Re-pasting into "+cell+"...","sld","st1");google.script.run.withSuccessHandler(function(r){stat("Re-pasted into "+r.cell,"sok","st1");}).withFailureHandler(function(e){stat("Error: "+e.message,"ser","st1");}).pasteUrlToCell(item.url,cell,sheet);}' +
'function timeSince(d){var s=Math.floor((new Date()-d)/1000);if(s<60)return s+"s ago";if(s<3600)return Math.floor(s/60)+" min ago";return Math.floor(s/3600)+" hr ago";}' +

'function stat(m,c,id){var e=document.getElementById(id||"st1");if(!e)return;e.style.display="block";e.className="statbox "+c;e.textContent=m;setTimeout(function(){if(e)e.scrollIntoView({behavior:"smooth",block:"nearest"});},50);}' +

'updateLabels();' +

// ── NEW: jump-to-page function (works for both sidebar and fullscreen inputs) ──
'function jumpToPage(inputId){' +
'  var n=parseInt(document.getElementById(inputId).value,10);' +
'  if(!pdfDoc||isNaN(n))return;' +
'  n=Math.max(1,Math.min(n,totalPages));' +
'  currentPage=n;' +
'  renderPage(currentPage);' +
'  if(fsOpen)fsRenderPage(currentPage);' +
'  document.getElementById(inputId).value="";' +
'}' +
// ── END NEW ──

// ── NEW: minimize / restore functions with full window resize ──
'var _minimized=false;' +
'var _fullHeight=700;' +
'function minimizeDialog(){' +
'  _minimized=true;' +
'  document.getElementById("mainBody").classList.add("hidden");' +
'  document.getElementById("miniStrip").classList.add("vis");' +
'  google.script.host.setHeight(68);' +
'}' +
'function restoreDialog(){' +
'  _minimized=false;' +
'  document.getElementById("mainBody").classList.remove("hidden");' +
'  document.getElementById("miniStrip").classList.remove("vis");' +
'  google.script.host.setHeight(_fullHeight);' +
'}' +
// ── END NEW ──

'<\/script></body></html>';
}