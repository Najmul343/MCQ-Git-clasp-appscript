function buildStudentTestHtml(testData, testId) {
  var questionsJson = JSON.stringify(testData.questions).replace(/<\//g, '<\\/');
  var testInfoJson = JSON.stringify({
    testId: testId,
    title: testData.title,
    teacher: testData.teacher,
    tradeClass: testData.tradeClass || '',
    instituteName: testData.instituteName || 'ITI',
    instituteSubtitle: testData.instituteSubtitle || '',
    duration: testData.duration || 60,
    passingMarks: testData.passingMarks || 40,
    shuffle: testData.shuffle || false,
    shuffleOpts: testData.shuffleOpts || false,
    forceFullscreen: testData.forceFullscreen || false,
    instructions: testData.instructions || []
  }).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">
<title>ITI Mock Test</title>
<style>
/* ===== FORCE VIEWPORT FIX FOR GAS ===== */
@viewport { width: device-width; zoom: 1; }
@-ms-viewport { width: device-width; }

/* ===== RESET & BASE ===== */
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html {
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
body {
  height: 100%;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #eef2f7;
  color: #1a202c;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-size: 16px;
  line-height: 1.5;
}
button { cursor: pointer; font-family: inherit; touch-action: manipulation; }
img { -webkit-user-select: none; user-select: none; max-width: 100%; }
input, select, textarea { font-size: 16px !important; }

/* ===== LIGHTBOX ===== */
#lightbox {
  display: none; position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.96);
  align-items: center; justify-content: center;
  flex-direction: column;
  opacity: 0; transition: opacity 0.25s ease;
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
}
#lightbox.show { display: flex; }
#lightbox.fade-in { opacity: 1; }
.lb-close {
  position: fixed; top: env(safe-area-inset-top, 10px); right: 12px; z-index: 10001;
  background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.4);
  color: white; width: 48px; height: 48px; border-radius: 50%;
  font-size: 24px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.lb-close:active { background: rgba(255,255,255,0.4); transform: scale(1.1); }
.lb-img-wrap {
  position: relative; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  padding: 60px 8px 60px 8px; overflow: hidden;
}
.lb-img {
  max-width: 100%; max-height: 100%; object-fit: contain;
  border-radius: 4px; touch-action: pinch-zoom pan-x pan-y;
}
.lb-loading {
  color: white; font-size: 14px; display: flex; align-items: center;
  gap: 8px; padding: 20px; position: absolute;
}
.lb-spinner {
  width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white; border-radius: 50%;
  animation: lbSpin 0.7s linear infinite;
}
@keyframes lbSpin { to { transform: rotate(360deg); } }
.lb-hint {
  position: fixed; bottom: max(16px, env(safe-area-inset-bottom, 16px)); left: 50%; transform: translateX(-50%);
  color: rgba(255,255,255,0.7); font-size: 12px;
  background: rgba(0,0,0,0.5); padding: 6px 16px; border-radius: 20px;
  pointer-events: none; white-space: nowrap;
}

/* ===== FULLSCREEN WARNING ===== */
#fsWarning {
  display: none; position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.92);
  align-items: center; justify-content: center;
  flex-direction: column; text-align: center; padding: 30px;
}
#fsWarning.show { display: flex; }
.fs-warn-icon { font-size: 56px; margin-bottom: 12px; }
.fs-warn-title { font-size: 20px; font-weight: 800; color: #f87171; margin-bottom: 8px; }
.fs-warn-msg { font-size: 13px; color: #e5e7eb; line-height: 1.7; margin-bottom: 8px; max-width: 350px; }
.fs-warn-count { font-size: 11px; color: #fbbf24; margin-bottom: 20px; }
.fs-warn-btn {
  padding: 14px 36px; background: #1a56db; color: white; border: none;
  border-radius: 10px; font-size: 15px; font-weight: 700;
  touch-action: manipulation;
}

/* ===== SCREENS ===== */
.screen { display: none; min-height: 100vh; min-height: 100dvh; width: 100%; }
.screen.active { display: flex; flex-direction: column; }

/* ===== WELCOME SCREEN ===== */
#welcomeScreen {
  background: linear-gradient(135deg, #0d2f7e 0%, #1a56db 50%, #2563eb 100%);
  align-items: center; justify-content: center;
  padding: 16px; padding-top: max(16px, env(safe-area-inset-top));
  min-height: 100vh; min-height: 100dvh;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}
.welcome-card {
  background: white; border-radius: 16px; padding: 24px 20px;
  max-width: 520px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: fadeUp 0.5s ease;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.inst-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
.inst-name { font-size: 20px; font-weight: 800; color: #1a56db; line-height: 1.2; }
.inst-sub { font-size: 12px; color: #718096; margin-top: 4px; }
.test-title-display { font-size: 16px; font-weight: 700; color: #1a202c; margin-top: 12px; }
.test-meta { display: flex; justify-content: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.meta-chip { display: flex; align-items: center; gap: 4px; background: #f0f5ff; color: #1a56db; border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 600; }

.instructions-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
.instructions-box h3 { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 8px; }
.instructions-box ol { padding-left: 18px; }
.instructions-box li { font-size: 12px; color: #78350f; margin-bottom: 4px; line-height: 1.5; }

.legend-box { background: #f8faff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
.legend-box h3 { font-size: 12px; font-weight: 700; color: #4a5568; margin-bottom: 8px; }
.legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4a5568; }
.legend-num { width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
.ln-gray { background: #e2e8f0; color: #4a5568; }
.ln-red { background: #fc8181; color: white; }
.ln-green { background: #48bb78; color: white; }
.ln-purple { background: #9f7aea; color: white; border-radius: 50%; }
.ln-purple-green { background: linear-gradient(135deg, #9f7aea, #48bb78); color: white; border-radius: 50%; }

.form-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 16px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.4px; }
.form-group input, .form-group select {
  padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px;
  font-size: 16px !important; font-family: inherit; transition: border 0.15s;
  -webkit-appearance: none; appearance: none; background: white;
  width: 100%;
}
.form-group input:focus, .form-group select:focus { border-color: #1a56db; outline: none; }
.start-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #1a56db, #0d3b9e);
  color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 700;
  letter-spacing: 0.3px; transition: all 0.2s; touch-action: manipulation;
  min-height: 48px;
}
.start-btn:active { transform: scale(0.98); opacity: 0.9; }

/* ===== TEST SCREEN ===== */
#testScreen { display: none; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; width: 100%; }
#testScreen.active { display: flex; }

.top-bar {
  position: fixed; top: 0; left: 0; right: 0;
  background: linear-gradient(135deg, #1a56db, #1e40af);
  color: white; height: 48px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 10px; padding-top: env(safe-area-inset-top, 0);
  z-index: 200; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  width: 100%;
}
.top-bar-left { display: flex; flex-direction: column; min-width: 0; flex: 1; margin-right: 8px; }
.tb-title { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tb-subtitle { font-size: 10px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-bar-center { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.timer-icon { font-size: 12px; opacity: 0.8; }
.timer-display {
  background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3);
  border-radius: 6px; padding: 3px 8px; font-size: 14px; font-weight: 800;
  letter-spacing: 1px; min-width: 68px; text-align: center;
  font-variant-numeric: tabular-nums;
}
.timer-display.warning { background: rgba(252,129,74,0.3); border-color: #fc814a; color: #ffd4b8; }
.timer-display.danger  { background: rgba(252,100,100,0.3); border-color: #fc6464; color: #ffb8b8; animation: blink 1s infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.top-bar-right { flex-shrink: 0; }
.submit-btn-top {
  background: #22c55e; color: white; border: none; border-radius: 6px;
  padding: 6px 10px; font-size: 11px; font-weight: 700; transition: all 0.15s;
  touch-action: manipulation; white-space: nowrap; min-height: 32px;
}
.submit-btn-top:active { background: #16a34a; transform: scale(0.96); }

.test-body {
  display: flex; flex-direction: column; width: 100%;
  margin-top: 48px; height: calc(100vh - 48px); height: calc(100dvh - 48px);
  overflow: hidden;
}
.question-area {
  flex: 1; overflow-y: auto; padding: 12px 12px 120px 12px;
  background: #f5f7fa; -webkit-overflow-scrolling: touch;
  width: 100%;
}

.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.q-number { font-size: 12px; color: #718096; font-weight: 600; }
.q-diff-badge { font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 700; text-transform: uppercase; }
.b-easy   { background: #def7ec; color: #03543f; }
.b-medium { background: #fef3c7; color: #92400e; }
.b-hard   { background: #fde8e8; color: #9b1c1c; }

.question-card { background: white; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 12px; width: 100%; }
.q-text { font-size: 14px; line-height: 1.7; color: #1a202c; font-weight: 500; margin-bottom: 4px; word-wrap: break-word; }
.q-text-tr { font-size: 12px; line-height: 1.6; color: #2563eb; font-weight: 400; margin-top: 4px; margin-bottom: 4px; padding: 4px 0 4px 10px; border-left: 3px solid #93c5fd; display: none; }
.opt-text-tr { font-size: 11px; color: #2563eb; margin-top: 2px; font-style: italic; }

/* ===== IMAGE STYLES ===== */
.img-wrap {
  position: relative; display: block; width: 100%; margin: 10px 0;
  cursor: zoom-in; -webkit-tap-highlight-color: transparent;
  border-radius: 8px; overflow: hidden;
}
.img-placeholder {
  background: linear-gradient(90deg, #e2e8f0 25%, #f0f4f8 50%, #e2e8f0 75%);
  background-size: 200% 100%; animation: shimmer 1.2s infinite;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: #94a3b8; font-size: 12px; gap: 6px; border: 1px solid #e2e8f0;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.img-error-state {
  background: #fef2f2; border: 1px dashed #fca5a5; border-radius: 8px;
  padding: 12px; text-align: center; color: #dc2626; font-size: 11px;
}
.q-image {
  width: 100%; max-height: 220px; object-fit: contain; border-radius: 8px;
  display: none; -webkit-touch-callout: none; background: #f8fafc;
}
.opt-image {
  width: 100%; max-height: 120px; object-fit: contain; border-radius: 6px;
  display: none; margin-top: 6px; -webkit-touch-callout: none; background: #f8fafc;
}
.tap-hint {
  position: absolute; bottom: 6px; right: 8px;
  background: rgba(0,0,0,0.65); color: white; font-size: 10px;
  padding: 3px 8px; border-radius: 10px; pointer-events: none;
  display: block; /* Always show */
}

/* ===== OPTIONS ===== */
.options-grid { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; width: 100%; }
.option-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px;
  border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer;
  transition: all 0.12s; background: white;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  width: 100%; min-height: 44px;
}
.option-item:active { background: #f0f5ff; transform: scale(0.99); }
.option-item.selected { border-color: #1a56db; background: #ebf2ff; }
.opt-letter {
  width: 28px; height: 28px; border: 2px solid #e2e8f0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #4a5568; flex-shrink: 0;
  transition: all 0.12s; margin-top: 1px;
}
.option-item.selected .opt-letter { background: #1a56db; border-color: #1a56db; color: white; }
.opt-content { flex: 1; min-width: 0; }
.opt-text { font-size: 13px; line-height: 1.5; color: #2d3748; word-wrap: break-word; }

/* ===== QUESTION NAVIGATION ===== */
.q-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; border-top: 1px solid #e2e8f0;
  padding: 8px 10px; padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));
  display: flex; justify-content: space-between; align-items: center;
  z-index: 100; width: 100%;
}
.nav-btn {
  padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
  border: 2px solid transparent; transition: all 0.12s;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  min-height: 36px; display: flex; align-items: center; justify-content: center;
}
.nav-prev { background: white; border-color: #e2e8f0; color: #4a5568; }
.nav-prev:active { border-color: #4a5568; background: #f7f9fc; }
.nav-next { background: #1a56db; color: white; }
.nav-next:active { background: #0d3b9e; }
.nav-review { background: white; border-color: #9f7aea; color: #9f7aea; font-size: 11px; padding: 8px 10px; }
.nav-review:active { background: #f5f0ff; }
.nav-review.marked { background: #9f7aea; color: white; }
.nav-clear { background: white; border-color: #fc8181; color: #e53e3e; font-size: 11px; padding: 8px 10px; }
.nav-clear:active { background: #fff5f5; }
.center-nav { display: flex; gap: 6px; }

/* ===== SIDE PANEL (Desktop only) ===== */
.side-panel { display: none; }

/* ===== RESULT SCREEN ===== */
#resultScreen {
  background: #f0f4f8; align-items: center; justify-content: flex-start;
  padding: 16px 12px; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding-top: max(16px, env(safe-area-inset-top));
}
.result-card { background: white; border-radius: 16px; max-width: 600px; width: 100%; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); animation: fadeUp 0.5s ease; }
.result-header { background: linear-gradient(135deg, #1a56db, #0d3b9e); color: white; padding: 24px 16px; text-align: center; }
.result-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.result-subtitle { font-size: 12px; opacity: 0.8; word-wrap: break-word; }
.score-circle-wrap { margin: 20px 0; display: flex; justify-content: center; }
.score-circle { width: 110px; height: 110px; border-radius: 50%; border: 6px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.sc-pct { font-size: 28px; font-weight: 900; }
.sc-label { font-size: 11px; opacity: 0.8; font-weight: 600; }
.pass-badge { display: inline-block; padding: 5px 20px; border-radius: 20px; font-size: 14px; font-weight: 800; letter-spacing: 1px; }
.pass-badge.pass { background: #22c55e; }
.pass-badge.fail { background: #ef4444; }
.score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #e2e8f0; }
.score-box { background: white; padding: 14px 8px; text-align: center; }
.sb-num { font-size: 20px; font-weight: 800; color: #1a56db; }
.sb-lbl { font-size: 10px; color: #718096; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
.review-section { padding: 16px; }
.review-title { font-size: 14px; font-weight: 700; color: #1a202c; margin-bottom: 12px; }
.review-q { border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
.review-q-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f7f9fc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; flex-wrap: wrap; gap: 4px; }
.rv-correct { color: #22c55e; }
.rv-wrong   { color: #ef4444; }
.rv-skipped { color: #6b7280; }
.review-q-body { padding: 10px 12px; }
.rv-q-text { font-size: 12px; color: #2d3748; line-height: 1.6; margin-bottom: 8px; word-wrap: break-word; }
.rv-options { display: flex; flex-direction: column; gap: 5px; }
.rv-opt { display: flex; align-items: flex-start; gap: 6px; padding: 7px 10px; border-radius: 6px; font-size: 11px; line-height: 1.4; word-wrap: break-word; }
.rv-opt.correct-ans { background: #def7ec; color: #03543f; }
.rv-opt.wrong-ans   { background: #fde8e8; color: #9b1c1c; }
.rv-opt.plain       { background: #f7f9fc; color: #4a5568; }
.rv-opt-mark { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; margin-top: 1px; }
.mark-correct { background: #22c55e; color: white; }
.mark-wrong   { background: #ef4444; color: white; }
.rv-explanation { font-size: 11px; color: #4a5568; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px; margin-top: 8px; line-height: 1.6; word-wrap: break-word; }
.done-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #1a56db, #0d3b9e);
  color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
  margin: 12px 0; touch-action: manipulation; min-height: 48px;
}
.done-btn:active { transform: scale(0.98); opacity: 0.9; }

/* ===== MODAL ===== */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 500; align-items: center; justify-content: center; padding: 16px; }
.modal-overlay.show { display: flex; }
.modal { background: white; border-radius: 16px; padding: 24px 20px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: fadeUp 0.3s ease; }
.modal h3 { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
.modal p { font-size: 13px; color: #4a5568; margin-bottom: 6px; line-height: 1.6; }
.modal-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 12px 0; }
.modal-stat { text-align: center; background: #f7f9fc; border-radius: 8px; padding: 8px; }
.modal-stat .n { font-size: 18px; font-weight: 800; }
.modal-stat .l { font-size: 10px; color: #718096; }
.modal-btns { display: flex; gap: 8px; margin-top: 14px; }
.modal-cancel {
  flex: 1; padding: 12px; background: white; border: 2px solid #e2e8f0;
  border-radius: 8px; font-size: 14px; font-weight: 600; color: #4a5568;
  touch-action: manipulation; min-height: 44px;
}
.modal-confirm {
  flex: 1; padding: 12px; background: #22c55e; border: none;
  border-radius: 8px; font-size: 14px; font-weight: 700; color: white;
  touch-action: manipulation; min-height: 44px;
}

/* ===== MOBILE PALETTE BUTTON & DRAWER ===== */
#mobilePaletteBtn {
  display: flex; position: fixed;
  bottom: max(68px, calc(env(safe-area-inset-bottom, 8px) + 60px));
  right: 12px; z-index: 300;
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, #1a56db, #0d3b9e);
  color: white; border: none; font-size: 20px;
  box-shadow: 0 4px 16px rgba(26,86,219,0.45);
  align-items: center; justify-content: center;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
}
#mobilePaletteBtn:active { transform: scale(0.9); }
#mobilePaletteBtn .mob-pal-count {
  position: absolute; top: -4px; right: -4px;
  background: #22c55e; color: white; font-size: 10px; font-weight: 700;
  min-width: 18px; height: 18px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; padding: 0 4px;
}
.mob-pal-overlay { display: none; position: fixed; inset: 0; z-index: 399; background: rgba(0,0,0,0.35); }
.mob-pal-overlay.show { display: block; }
#mobilePaletteDrawer {
  display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 400;
  background: white; border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.18);
  max-height: 65vh; flex-direction: column;
  transform: translateY(100%); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
  padding-bottom: env(safe-area-inset-bottom, 0);
}
#mobilePaletteDrawer.open { transform: translateY(0); }
.mob-pal-handle { width: 36px; height: 4px; background: #cbd5e1; border-radius: 2px; margin: 8px auto 0 auto; flex-shrink: 0; }
.mob-pal-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px 6px 16px; flex-shrink: 0; }
.mob-pal-title { font-size: 14px; font-weight: 700; color: #1a202c; }
.mob-pal-close { background: none; border: none; font-size: 20px; color: #718096; padding: 4px 8px; touch-action: manipulation; min-width: 36px; min-height: 36px; display: flex; align-items: center; justify-content: center; }
.mob-pal-stats { display: flex; gap: 6px; padding: 0 16px 8px 16px; flex-shrink: 0; }
.mob-stat { flex: 1; text-align: center; padding: 6px 4px; border-radius: 8px; font-size: 10px; font-weight: 600; }
.msn { display: block; font-size: 18px; font-weight: 800; }
.mob-stat.ms-green { background: #f0fdf4; color: #166534; }
.mob-stat.ms-red   { background: #fef2f2; color: #991b1b; }
.mob-stat.ms-gray  { background: #f8fafc; color: #475569; }
.mob-pal-scroll { overflow-y: auto; padding: 8px 16px 16px 16px; flex: 1; -webkit-overflow-scrolling: touch; }
.mob-pal-scroll .q-palette { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.mob-pal-scroll .q-btn { width: 38px; height: 38px; font-size: 12px; }
.mob-pal-scroll .section-label { font-size: 11px; font-weight: 700; color: #718096; margin: 6px 0 4px 0; }
.s-green { color: #22c55e; }
.s-red   { color: #ef4444; }
.s-gray  { color: #6b7280; }

/* ===== DESKTOP (wider than 768px) ===== */
@media (min-width: 769px) {
  body { font-size: 16px; }
  .welcome-card { padding: 36px 40px; max-width: 580px; border-radius: 20px; }
  .inst-name { font-size: 22px; }
  .test-title-display { font-size: 18px; }
  .form-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .top-bar { height: 54px; padding: 0 16px; }
  .tb-title { font-size: 14px; }
  .tb-subtitle { font-size: 11px; }
  .timer-display { font-size: 18px; min-width: 100px; padding: 5px 14px; letter-spacing: 2px; }
  .submit-btn-top { font-size: 13px; padding: 7px 16px; }
  .test-body { margin-top: 54px; height: calc(100vh - 54px); flex-direction: row; }
  .question-area { padding: 20px 24px 100px 24px; }
  .question-card { padding: 22px; }
  .q-text { font-size: 15px; }
  .q-image { max-height: 300px; }
  .option-item { padding: 14px 16px; gap: 12px; }
  .opt-letter { width: 32px; height: 32px; font-size: 13px; }
  .opt-text { font-size: 14px; }
  .opt-image { max-height: 150px; }
  .q-nav { right: 320px; padding: 12px 20px; }
  .nav-btn { padding: 9px 20px; font-size: 13px; }
  .side-panel {
    display: flex; width: 320px; background: white; border-left: 1px solid #e2e8f0;
    flex-direction: column; overflow: hidden;
  }
  .side-header { background: #f7f9fc; border-bottom: 1px solid #e2e8f0; padding: 14px 16px; }
  .side-header h3 { font-size: 13px; font-weight: 700; color: #1a202c; }
  .legend-row { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; background: #f7f9fc; }
  .leg-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4a5568; }
  .palette-scroll { flex: 1; overflow-y: auto; padding: 12px 16px; }
  .stat-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f7f9fc; }
  .stat-box { text-align: center; }
  .stat-num { font-size: 18px; font-weight: 800; }
  .stat-lbl { font-size: 10px; color: #718096; text-transform: uppercase; font-weight: 600; }
  #mobilePaletteBtn { display: none; }
  #mobilePaletteDrawer { display: none !important; }
  .mob-pal-overlay { display: none !important; }
  .score-grid { grid-template-columns: repeat(4,1fr); }
  .result-header { padding: 30px; }
  .score-circle { width: 140px; height: 140px; }
  .sc-pct { font-size: 34px; }
  .review-section { padding: 24px; }
}

/* ===== LANDSCAPE MOBILE ===== */
@media (max-width: 900px) and (orientation: landscape) {
  .top-bar { height: 40px; }
  .test-body { margin-top: 40px; height: calc(100vh - 40px); }
  .question-area { padding: 8px 10px 70px 10px; }
  .q-nav { padding: 6px 10px; }
  .nav-btn { padding: 6px 10px; font-size: 11px; }
  .question-card { padding: 10px; }
  .q-image { max-height: 120px; }
  .welcome-card { padding: 12px 16px; }
  .score-circle-wrap { margin: 8px 0; }
}

/* ===== PRINT ===== */
@media print {
  body { background: white !important; }
  #welcomeScreen, #testScreen, .modal-overlay, #fsWarning,
  #mobilePaletteBtn, #mobilePaletteDrawer, .mob-pal-overlay,
  #doneBtn, #lightbox, button { display: none !important; }
  #resultScreen { display: block !important; min-height: unset !important; padding: 0 !important; background: white !important; }
  .result-card { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
  .result-header, .rv-opt.correct-ans, .rv-opt.wrong-ans, .rv-opt.plain,
  .rv-explanation, .pass-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .review-q { break-inside: avoid; page-break-inside: avoid; }
}
</style>
</head>
<body>

<!-- LIGHTBOX -->
<div id="lightbox">
  <button class="lb-close" id="lbClose" aria-label="Close image">✕</button>
  <div class="lb-img-wrap">
    <div class="lb-loading" id="lbLoading"><div class="lb-spinner"></div> Loading HD image...</div>
    <img class="lb-img" id="lbImg" alt="Full size image" />
  </div>
  <div class="lb-hint" id="lbHint">Pinch to zoom · Tap ✕ to close</div>
</div>

<!-- FULLSCREEN WARNING -->
<div id="fsWarning">
  <div class="fs-warn-icon">⚠️</div>
  <div class="fs-warn-title">Fullscreen Required!</div>
  <div class="fs-warn-msg">You have exited fullscreen mode. Please return to fullscreen to continue.</div>
  <div class="fs-warn-count">Violation #<span id="fsViolationCount">1</span> | Tab switches: <span id="fsTabCount">0</span></div>
  <button class="fs-warn-btn" onclick="returnToFullscreen()">↩ Return to Fullscreen</button>
</div>

<!-- WELCOME SCREEN -->
<div id="welcomeScreen" class="screen active">
  <div class="welcome-card">
    <div class="inst-header">
      <div class="inst-name" id="instName">ITI</div>
      <div class="inst-sub" id="instSub"></div>
      <div class="test-title-display" id="testTitleDisplay">Loading...</div>
      <div class="test-meta" id="testMeta"></div>
    </div>
    <div class="instructions-box">
      <h3>📋 Instructions & Rules</h3>
      <ol id="instructionsList">
        <li>Read each question carefully before answering.</li>
        <li>Navigate between questions using Next/Previous.</li>
        <li>Mark questions for review to revisit them.</li>
        <li>Timer starts when you click "Start Test".</li>
        <li>Tap any image to view in HD.</li>
        <li>Do not refresh or close during the test.</li>
        <li>Click "Submit Test" when done.</li>
      </ol>
    </div>
    <div class="legend-box">
      <h3>🎨 Question Status Guide</h3>
      <div class="legend-grid">
        <div class="legend-item"><div class="legend-num ln-gray">1</div> Not Visited</div>
        <div class="legend-item"><div class="legend-num ln-red">2</div> Not Answered</div>
        <div class="legend-item"><div class="legend-num ln-green">3</div> Answered</div>
        <div class="legend-item"><div class="legend-num ln-purple">4</div> Marked Review</div>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group full">
        <label>Full Name *</label>
        <input type="text" id="studentName" placeholder="Enter your full name" autocomplete="name" />
      </div>
      <div class="form-group">
        <label>Roll Number *</label>
        <input type="text" id="rollNo" placeholder="e.g. 2024001" autocomplete="off" />
      </div>
      <div class="form-group">
        <label>Class / Semester</label>
        <input type="text" id="className" placeholder="e.g. Sem 1" autocomplete="off" />
      </div>
      <div class="form-group full">
        <label>Trade</label>
        <input type="text" id="tradeName" placeholder="e.g. Electrician" autocomplete="off" />
      </div>
    </div>
    <button class="start-btn" onclick="startTest()">▶ Start Test</button>
  </div>
</div>

<!-- TEST SCREEN -->
<div id="testScreen" class="screen">
  <div class="top-bar">
    <div class="top-bar-left">
      <div class="tb-title" id="topTestTitle">ITI Mock Test</div>
      <div class="tb-subtitle" id="topStudentName">Student</div>
    </div>
    <div class="top-bar-center">
      <span class="timer-icon">⏱</span>
      <div class="timer-display" id="timerDisplay">60:00</div>
    </div>
    <div class="top-bar-right">
      <button class="submit-btn-top" onclick="confirmSubmit()">Submit ✓</button>
    </div>
  </div>
  <div class="test-body">
    <div class="question-area" id="questionArea">
      <div class="q-header">
        <div class="q-number" id="qNumber">Question 1 of 25</div>
        <div class="q-diff-badge b-medium" id="qDiffBadge">Medium</div>
      </div>
      <div class="question-card">
        <div class="q-text" id="qText"></div>
        <div class="q-text-tr" id="qTextTr"></div>
        <div id="qImageWrap"></div>
        <div class="options-grid" id="optionsGrid"></div>
      </div>
      <div class="q-nav">
        <button class="nav-btn nav-prev" onclick="navigate(-1)">◀ Prev</button>
        <div class="center-nav">
          <button class="nav-btn nav-clear" onclick="clearAnswer()">✕ Clear</button>
          <button class="nav-btn nav-review" id="reviewBtn" onclick="toggleReview()">⚑ Review</button>
        </div>
        <button class="nav-btn nav-next" onclick="navigate(1)">Next ▶</button>
      </div>
    </div>
    <div class="side-panel">
      <div class="side-header"><h3>📊 Question Palette</h3></div>
      <div class="legend-row">
        <div class="leg-item"><div class="legend-num ln-gray" style="width:18px;height:18px;font-size:9px;">N</div>&nbsp;Not Visited</div>
        <div class="leg-item"><div class="legend-num ln-red" style="width:18px;height:18px;font-size:9px;">-</div>&nbsp;Not Answered</div>
        <div class="leg-item"><div class="legend-num ln-green" style="width:18px;height:18px;font-size:9px;">✓</div>&nbsp;Answered</div>
        <div class="leg-item"><div class="legend-num ln-purple" style="width:18px;height:18px;border-radius:50%;font-size:9px;">⚑</div>&nbsp;Review</div>
      </div>
      <div class="palette-scroll" id="paletteScroll"></div>
      <div class="stat-row">
        <div class="stat-box"><div class="stat-num s-green" id="statAnswered">0</div><div class="stat-lbl">Answered</div></div>
        <div class="stat-box"><div class="stat-num s-red" id="statNotAnswered">0</div><div class="stat-lbl">Not Ans.</div></div>
        <div class="stat-box"><div class="stat-num s-gray" id="statMarked">0</div><div class="stat-lbl">Review</div></div>
      </div>
    </div>
  </div>
</div>

<!-- RESULT SCREEN -->
<div id="resultScreen" class="screen">
  <div class="result-card">
    <div class="result-header">
      <div class="result-title" id="resTestTitle">Test Results</div>
      <div class="result-subtitle" id="resStudentInfo">Student Name</div>
      <div class="score-circle-wrap">
        <div class="score-circle">
          <div class="sc-pct" id="resPercent">0%</div>
          <div class="sc-label">Score</div>
        </div>
      </div>
      <div id="resPassBadge" class="pass-badge pass">PASS</div>
    </div>
    <div class="score-grid">
      <div class="score-box"><div class="sb-num" id="resScore">0</div><div class="sb-lbl">Score</div></div>
      <div class="score-box"><div class="sb-num" id="resTotal">0</div><div class="sb-lbl">Total</div></div>
      <div class="score-box"><div class="sb-num s-green" id="resCorrect">0</div><div class="sb-lbl">Correct</div></div>
      <div class="score-box"><div class="sb-num s-red" id="resWrong">0</div><div class="sb-lbl">Wrong</div></div>
    </div>
    <div class="review-section">
      <div style="text-align:center;margin-bottom:12px;">
        <button class="done-btn" id="doneBtn" onclick="window.close()">✓ Done — Close</button>
        <button class="done-btn" onclick="window.print()" style="background:linear-gradient(135deg,#059669,#047857);margin-top:8px;">🖨️ Print / Save PDF</button>
      </div>
      <div class="review-title">📝 Answer Review</div>
      <div id="answerReview"></div>
    </div>
  </div>
</div>

<!-- SUBMIT MODAL -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal">
    <h3>📤 Submit Test?</h3>
    <p>Are you sure you want to submit?</p>
    <div class="modal-stats">
      <div class="modal-stat"><div class="n s-green" id="mAnswered">0</div><div class="l">Answered</div></div>
      <div class="modal-stat"><div class="n s-red" id="mNotAnswered">0</div><div class="l">Not Answered</div></div>
      <div class="modal-stat"><div class="n s-gray" id="mMarked">0</div><div class="l">Marked</div></div>
      <div class="modal-stat"><div class="n" id="mTotal">0</div><div class="l">Total</div></div>
    </div>
    <p style="color:#ef4444;font-size:12px;">⚠️ Cannot change answers after submitting.</p>
    <div class="modal-btns">
      <button class="modal-cancel" onclick="closeModal()">◀ Go Back</button>
      <button class="modal-confirm" onclick="submitTest()">Submit ✓</button>
    </div>
  </div>
</div>

<!-- MOBILE PALETTE -->
<div class="mob-pal-overlay" id="mobPalOverlay"></div>
<button id="mobilePaletteBtn">📋<span class="mob-pal-count" id="mobPalCount">0</span></button>
<div id="mobilePaletteDrawer">
  <div class="mob-pal-handle"></div>
  <div class="mob-pal-header">
    <span class="mob-pal-title">📊 Question Palette</span>
    <button class="mob-pal-close" id="mobPalCloseBtn">✕</button>
  </div>
  <div class="mob-pal-stats">
    <div class="mob-stat ms-green"><span class="msn" id="mobStatAnswered">0</span>Answered</div>
    <div class="mob-stat ms-red"><span class="msn" id="mobStatNotAns">0</span>Not Ans.</div>
    <div class="mob-stat ms-gray"><span class="msn" id="mobStatReview">0</span>Review</div>
  </div>
  <div class="mob-pal-scroll" id="mobPaletteScroll"></div>
</div>

<script>
/* ================================================================
   FORCE VIEWPORT — The #1 fix for GAS serving in desktop mode
   ================================================================ */
(function() {
  // Remove any existing viewport meta (GAS may inject its own)
  var existing = document.querySelectorAll('meta[name="viewport"]');
  for (var i = 0; i < existing.length; i++) existing[i].parentNode.removeChild(existing[i]);

  // Create our own
  var meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
  document.head.insertBefore(meta, document.head.firstChild);

  // Also set for older browsers
  if (document.documentElement) {
    document.documentElement.style.setProperty('width', '100%', 'important');
    document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
  }
})();

/* ================================================================
   DATA
   ================================================================ */
var questions = ${questionsJson};
var testInfo  = ${testInfoJson};

var studentInfo  = {};
var currentQ     = 0;
var answers      = {};
var visited      = {};
var markedReview = {};
var timerInterval = null;
var timeLeft     = testInfo.duration * 60;
var testStarted  = false;
var testSubmitted = false;
var fsViolations = 0;
var tabViolations = 0;
var preloadedImages = [];

/* ===== UTILS ===== */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : str; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function looksLikeUrl(str) {
  if (!str) return false;
  var s = str.trim();
  return s.indexOf('http://') === 0 || s.indexOf('https://') === 0;
}

/* ===== DRIVE URL ===== */
function getDriveId(url) {
  if (!url) return null;
  var s = url.trim();
  var m1 = s.match(/\\/d\\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  var m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}
function convertDriveUrl(url) {
  if (!url) return '';
  var s = url.trim();
  if (s.indexOf('drive.google.com/thumbnail') !== -1) return s;
  var id = getDriveId(s);
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800';
  return s;
}
function convertDriveUrlHD(url) {
  if (!url) return '';
  var id = getDriveId(url.trim());
  if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
  return url.trim();
}

/* ===== LIGHTBOX ===== */
var lightboxEl, lbImg, lbLoading, lbHint, lbTimeout;

function initLightbox() {
  lightboxEl = document.getElementById('lightbox');
  lbImg = document.getElementById('lbImg');
  lbLoading = document.getElementById('lbLoading');
  lbHint = document.getElementById('lbHint');

  document.getElementById('lbClose').addEventListener('click', function(e) {
    e.preventDefault(); e.stopPropagation(); closeLightbox();
  });
  document.getElementById('lbClose').addEventListener('touchend', function(e) {
    e.preventDefault(); e.stopPropagation(); closeLightbox();
  });

  lightboxEl.addEventListener('click', function(e) {
    if (e.target === lightboxEl || e.target.classList.contains('lb-img-wrap')) closeLightbox();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lightboxEl.classList.contains('show')) closeLightbox();
  });

  lightboxEl.addEventListener('touchmove', function(e) {
    if (e.touches.length < 2) e.preventDefault();
  }, { passive: false });
}

function openLightbox(origUrl) {
  if (!origUrl) return;
  var hdSrc = convertDriveUrlHD(origUrl);
  var fallbackSrc = convertDriveUrl(origUrl);

  lbImg.style.display = 'none';
  lbLoading.style.display = 'flex';
  lbLoading.innerHTML = '<div class="lb-spinner"></div> Loading HD image...';
  lbHint.style.opacity = '1';

  lightboxEl.classList.add('show');
  requestAnimationFrame(function() { lightboxEl.classList.add('fade-in'); });
  document.body.style.overflow = 'hidden';

  lbImg.onload = function() {
    lbLoading.style.display = 'none';
    lbImg.style.display = 'block';
    clearTimeout(lbTimeout);
    lbTimeout = setTimeout(function() { if (lbHint) lbHint.style.opacity = '0'; }, 3000);
  };
  lbImg.onerror = function() {
    if (lbImg.src !== fallbackSrc) {
      lbLoading.innerHTML = '<div class="lb-spinner"></div> Trying smaller size...';
      lbImg.src = fallbackSrc;
    } else {
      lbLoading.innerHTML = '<span style="color:#fca5a5;">⚠️ Could not load image</span>';
    }
  };
  lbImg.src = hdSrc;
}

function closeLightbox() {
  lightboxEl.classList.remove('fade-in');
  setTimeout(function() {
    lightboxEl.classList.remove('show');
    lbImg.onload = null; lbImg.onerror = null;
    lbImg.src = ''; lbImg.style.display = 'none';
    lbLoading.style.display = 'flex';
    lbLoading.innerHTML = '<div class="lb-spinner"></div> Loading HD image...';
    if (!document.getElementById('mobilePaletteDrawer').classList.contains('open')) {
      document.body.style.overflow = '';
    }
    if (lbHint) lbHint.style.opacity = '';
  }, 200);
  clearTimeout(lbTimeout);
}

/* ===== IMAGE HTML BUILDER ===== */
function makeImgHtml(url, cssClass, altText, extraStyle) {
  if (!url) return '';
  var src = convertDriveUrl(url.trim());
  var style = extraStyle || '';
  var phH = (cssClass === 'q-image') ? '140px' : '70px';
  var uid = 'img_' + Math.random().toString(36).substr(2, 9);
  var safeUrl = escHtml(url.trim());

  return '<div class="img-wrap" data-src="' + safeUrl + '" onclick="openLightbox(\'' + safeUrl.replace(/'/g, "\\'") + '\')">' +
    '<div class="img-placeholder" id="ph_' + uid + '" style="height:' + phH + ';">🖼 Loading...</div>' +
    '<img class="' + cssClass + '" id="' + uid + '" src="' + src + '" alt="' + escHtml(altText || '') + '" ' +
    'style="' + style + '" ' +
    'onload="this.style.display=\'block\';document.getElementById(\'ph_' + uid + '\').style.display=\'none\';this.parentElement.classList.add(\'img-loaded\');" ' +
    'onerror="document.getElementById(\'ph_' + uid + '\').innerHTML=\'<div class=img-error-state>⚠️ Image not available</div>\';" />' +
    '<div class="tap-hint">🔍 Tap to zoom</div>' +
  '</div>';
}

/* ===== GLOBAL IMAGE TAP HANDLER ===== */
(function() {
  var tapStartTime = 0;
  var tapStartX = 0;
  var tapStartY = 0;

  document.body.addEventListener('touchstart', function(e) {
    var wrap = e.target.closest ? e.target.closest('.img-wrap') : null;
    if (!wrap) return;
    tapStartTime = Date.now();
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }, { passive: true });

  document.body.addEventListener('touchend', function(e) {
    var wrap = e.target.closest ? e.target.closest('.img-wrap') : null;
    if (!wrap) return;

    var elapsed = Date.now() - tapStartTime;
    var dx = Math.abs(e.changedTouches[0].clientX - tapStartX);
    var dy = Math.abs(e.changedTouches[0].clientY - tapStartY);

    // Quick tap (<400ms, <15px movement) opens lightbox
    if (elapsed < 400 && dx < 15 && dy < 15) {
      e.preventDefault();
      e.stopPropagation();
      var src = wrap.getAttribute('data-src');
      if (src) openLightbox(src);
    }
  }, { passive: false });

  // Desktop click handler
  document.body.addEventListener('click', function(e) {
    var wrap = e.target.closest ? e.target.closest('.img-wrap') : null;
    if (!wrap) return;

    // Don't intercept option selection clicks
    var optionItem = e.target.closest('.option-item');
    if (optionItem) {
      if (e.target.tagName !== 'IMG' && !e.target.classList.contains('tap-hint') && e.target !== wrap) return;
    }

    var src = wrap.getAttribute('data-src');
    if (src) {
      e.preventDefault();
      openLightbox(src);
    }
  });
})();

/* ===== IMAGE PRELOADER ===== */
function preloadAllImages() {
  questions.forEach(function(q) {
    var urls = [
      q.questionImage,
      q.optAImage, q.optBImage, q.optCImage, q.optDImage,
      q.explanationImage,
      looksLikeUrl(q.explanation) ? q.explanation : null
    ];
    urls.forEach(function(url) {
      if (!url || url.trim() === '') return;
      var img = new Image();
      img.src = convertDriveUrl(url.trim());
      preloadedImages.push(img);
    });
  });
}

/* ===== INIT WELCOME ===== */
function initWelcomeScreen() {
  document.getElementById('instName').textContent = testInfo.instituteName || 'ITI';
  document.getElementById('instSub').textContent = testInfo.instituteSubtitle || '';
  document.getElementById('testTitleDisplay').textContent = testInfo.title || 'Mock Test';

  var meta = document.getElementById('testMeta');
  meta.innerHTML =
    '<div class="meta-chip">⏱ ' + testInfo.duration + ' min</div>' +
    '<div class="meta-chip">📝 ' + questions.length + ' Qs</div>' +
    (testInfo.teacher ? '<div class="meta-chip">👨‍🏫 ' + escHtml(testInfo.teacher) + '</div>' : '') +
    (testInfo.tradeClass ? '<div class="meta-chip">🏫 ' + escHtml(testInfo.tradeClass) + '</div>' : '');

  var instList = document.getElementById('instructionsList');
  if (testInfo.instructions && testInfo.instructions.length > 0) {
    instList.innerHTML = '';
    testInfo.instructions.forEach(function(ins) {
      var li = document.createElement('li');
      li.textContent = ins;
      instList.appendChild(li);
    });
  }
}

/* ===== START TEST ===== */
function startTest() {
  var name = document.getElementById('studentName').value.trim();
  var roll = document.getElementById('rollNo').value.trim();
  if (!name) { alert('Please enter your name!'); return; }
  if (!roll) { alert('Please enter your Roll Number!'); return; }

  studentInfo = {
    name: name,
    rollNo: roll,
    className: document.getElementById('className').value.trim(),
    trade: document.getElementById('tradeName').value.trim()
  };

  showScreen('testScreen');
  document.getElementById('topTestTitle').textContent = testInfo.title;
  document.getElementById('topStudentName').textContent = name + ' | ' + roll;

  if (testInfo.forceFullscreen) enterFullscreen();
  requestWakeLock();

  // Organize by chapters
  var chapMap = {};
  var chapOrder = [];
  questions.forEach(function(q) {
    var chap = q.chapter || 'Questions';
    if (!chapMap[chap]) { chapMap[chap] = []; chapOrder.push(chap); }
    chapMap[chap].push(q);
  });
  if (testInfo.shuffle) {
    chapOrder.forEach(function(chap) {
      chapMap[chap].sort(function() { return Math.random() - 0.5; });
    });
  }
  questions = [];
  chapOrder.forEach(function(chap) {
    chapMap[chap].forEach(function(q) { questions.push(q); });
  });
  questions.forEach(function(q, i) { q._origIdx = i; });

  preloadAllImages();
  buildPalette();
  showQuestion(0);
  startTimer();
  testStarted = true;
}

/* ===== TIMER ===== */
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(function() {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      autoSubmit();
      return;
    }
    timeLeft--;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  var t = Math.max(0, timeLeft);
  var m = Math.floor(t / 60);
  var s = t % 60;
  var display = document.getElementById('timerDisplay');
  display.textContent = pad(m) + ':' + pad(s);
  display.className = 'timer-display';
  if (t <= 300) display.classList.add('danger');
  else if (t <= 600) display.classList.add('warning');
}

function autoSubmit() {
  alert('⏰ Time is up! Your test is being submitted.');
  submitTest();
}

/* ===== SHOW QUESTION ===== */
function showQuestion(index) {
  if (index < 0 || index >= questions.length) return;
  currentQ = index;
  visited[index] = true;

  var q = questions[index];
  var origIdx = q._origIdx;

  document.getElementById('qNumber').textContent = 'Q ' + (index + 1) + ' / ' + questions.length;
  var diffClass = q.difficulty || 'medium';
  var badge = document.getElementById('qDiffBadge');
  badge.textContent = capitalize(diffClass);
  badge.className = 'q-diff-badge b-' + diffClass;

  document.getElementById('qText').textContent = q.question;

  var qTrEl = document.getElementById('qTextTr');
  if (q.questionTr) { qTrEl.textContent = q.questionTr; qTrEl.style.display = 'block'; }
  else { qTrEl.style.display = 'none'; }

  document.getElementById('qImageWrap').innerHTML =
    q.questionImage ? makeImgHtml(q.questionImage, 'q-image', 'Question Image') : '';

  var grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';
  var opts = [
    { letter: 'A', text: q.optA, img: q.optAImage, tr: q.optATr || '' },
    { letter: 'B', text: q.optB, img: q.optBImage, tr: q.optBTr || '' },
    { letter: 'C', text: q.optC, img: q.optCImage, tr: q.optCTr || '' },
    { letter: 'D', text: q.optD, img: q.optDImage, tr: q.optDTr || '' }
  ];

  if (testInfo.shuffleOpts) {
    if (!q._so) q._so = [0, 1, 2, 3].sort(function() { return Math.random() - 0.5; });
    opts = q._so.map(function(i) { return opts[i]; });
  }

  opts.forEach(function(opt, displayPos) {
    if (!opt.text && !opt.img) return;
    var item = document.createElement('div');
    item.className = 'option-item' + (answers[origIdx] === opt.letter ? ' selected' : '');
    item.setAttribute('data-qi', index);
    item.setAttribute('data-letter', opt.letter);

    var displayLabel = testInfo.shuffleOpts ? String.fromCharCode(65 + displayPos) : opt.letter;
    var trHtml = opt.tr ? '<div class="opt-text-tr">' + escHtml(opt.tr) + '</div>' : '';
    var imgHtml = opt.img ? makeImgHtml(opt.img, 'opt-image', 'Option ' + opt.letter) : '';

    item.innerHTML =
      '<div class="opt-letter">' + displayLabel + '</div>' +
      '<div class="opt-content">' +
        '<div class="opt-text">' + escHtml(opt.text || '') + '</div>' +
        trHtml + imgHtml +
      '</div>';

    // Touch handler for option selection
    (function(qi, letter, el) {
      var optTouchStart = 0;
      var optTouchX = 0;
      var optTouchY = 0;

      el.addEventListener('touchstart', function(e) {
        optTouchStart = Date.now();
        optTouchX = e.touches[0].clientX;
        optTouchY = e.touches[0].clientY;
      }, { passive: true });

      el.addEventListener('touchend', function(e) {
        // Don't select if user tapped on image
        var tgt = e.target;
        if (tgt.closest && tgt.closest('.img-wrap')) return;

        var elapsed = Date.now() - optTouchStart;
        var dx = Math.abs(e.changedTouches[0].clientX - optTouchX);
        var dy = Math.abs(e.changedTouches[0].clientY - optTouchY);

        if (elapsed < 500 && dx < 20 && dy < 20) {
          e.preventDefault();
          selectAnswer(qi, letter);
        }
      }, { passive: false });

      // Desktop click
      el.addEventListener('click', function(e) {
        if ('ontouchstart' in window) return; // handled by touch
        if (e.target.closest && e.target.closest('.img-wrap')) return;
        selectAnswer(qi, letter);
      });
    })(index, opt.letter, item);

    grid.appendChild(item);
  });

  document.getElementById('reviewBtn').classList.toggle('marked', !!markedReview[index]);
  updatePalette();
  updateStats();

  // Scroll to top
  var qa = document.getElementById('questionArea');
  if (qa) qa.scrollTop = 0;
}

function selectAnswer(qIndex, letter) {
  answers[questions[qIndex]._origIdx] = letter;
  showQuestion(qIndex);
}

function clearAnswer() {
  delete answers[questions[currentQ]._origIdx];
  showQuestion(currentQ);
}

function toggleReview() {
  if (markedReview[currentQ]) delete markedReview[currentQ];
  else markedReview[currentQ] = true;
  document.getElementById('reviewBtn').classList.toggle('marked', !!markedReview[currentQ]);
  updatePalette();
  updateStats();
}

/* ===== NAVIGATE ===== */
function navigate(dir) {
  var next = currentQ + dir;
  if (next >= 0 && next < questions.length) {
    showQuestion(next);
  }
}

/* ===== PALETTE ===== */
function buildPalette() {
  var scroll = document.getElementById('paletteScroll');
  scroll.innerHTML = '';
  var chapters = {};
  var chapOrder = [];
  questions.forEach(function(q, i) {
    var chap = q.chapter || 'Questions';
    if (!chapters[chap]) { chapters[chap] = []; chapOrder.push(chap); }
    chapters[chap].push(i);
  });
  chapOrder.forEach(function(chap) {
    var label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = chap;
    scroll.appendChild(label);
    var palette = document.createElement('div');
    palette.className = 'q-palette';
    chapters[chap].forEach(function(qi, posInChap) {
      var btn = document.createElement('button');
      btn.className = 'q-btn not-visited';
      btn.id = 'qbtn_' + qi;
      btn.textContent = posInChap + 1;
      btn.dataset.qi = qi;
      btn.addEventListener('click', function() { showQuestion(qi); });
      palette.appendChild(btn);
    });
    scroll.appendChild(palette);
  });
}

function updatePalette() {
  questions.forEach(function(q, i) {
    var btn = document.getElementById('qbtn_' + i);
    if (!btn) return;
    btn.className = 'q-btn';
    var ans = answers[q._origIdx];
    var marked = markedReview[i];
    var vis = visited[i];
    if (ans && marked) btn.classList.add('answered-marked');
    else if (ans) btn.classList.add('answered');
    else if (marked) btn.classList.add('marked');
    else if (vis) btn.classList.add('not-answered');
    else btn.classList.add('not-visited');
    if (i === currentQ) btn.classList.add('current');
  });

  // Update mobile drawer buttons too
  var mobScroll = document.getElementById('mobPaletteScroll');
  if (mobScroll && mobScroll.children.length > 0) {
    mobScroll.querySelectorAll('.q-btn').forEach(function(btn) {
      var qi = parseInt(btn.dataset.qi);
      if (isNaN(qi) || !questions[qi]) return;
      var q = questions[qi];
      btn.className = 'q-btn';
      var ans = answers[q._origIdx];
      var marked = markedReview[qi];
      var vis = visited[qi];
      if (ans && marked) btn.classList.add('answered-marked');
      else if (ans) btn.classList.add('answered');
      else if (marked) btn.classList.add('marked');
      else if (vis) btn.classList.add('not-answered');
      else btn.classList.add('not-visited');
      if (qi === currentQ) btn.classList.add('current');
    });
  }
}

function updateStats() {
  var answered = Object.keys(answers).length;
  var marked = Object.keys(markedReview).length;
  var notAnswered = questions.filter(function(q, i) { return visited[i] && !answers[q._origIdx]; }).length;
  document.getElementById('statAnswered').textContent = answered;
  document.getElementById('statNotAnswered').textContent = notAnswered;
  document.getElementById('statMarked').textContent = marked;
  updateMobilePaletteStats();
}

/* ===== SUBMIT ===== */
function confirmSubmit() {
  var answered = Object.keys(answers).length;
  var marked = Object.keys(markedReview).length;
  document.getElementById('mAnswered').textContent = answered;
  document.getElementById('mNotAnswered').textContent = questions.length - answered;
  document.getElementById('mMarked').textContent = marked;
  document.getElementById('mTotal').textContent = questions.length;
  document.getElementById('confirmModal').classList.add('show');
}

function closeModal() { document.getElementById('confirmModal').classList.remove('show'); }

function submitTest() {
  if (testSubmitted) return;
  testSubmitted = true;
  clearInterval(timerInterval);
  releaseWakeLock();
  closeModal();
  closeMobilePalette();

  var score = 0, totalMarks = 0, correct = 0, wrong = 0;
  questions.forEach(function(q) {
    var pts = q.points || 1;
    var neg = q.negativeMarks || 0;
    totalMarks += pts;
    var sa = answers[q._origIdx];
    if (sa) {
      if (sa === q.answer) { score += pts; correct++; }
      else { score -= neg; wrong++; }
    }
  });
  if (score < 0) score = 0;
  var pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  var passed = pct >= testInfo.passingMarks;

  try {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function() {})
        .withFailureHandler(function() {})
        .submitTestResult({
          testId: testInfo.testId, testTitle: testInfo.title,
          studentName: studentInfo.name, rollNo: studentInfo.rollNo,
          className: studentInfo.className, trade: studentInfo.trade,
          score: score, totalMarks: totalMarks, percentage: pct,
          passingMarks: testInfo.passingMarks,
          fsViolations: fsViolations, tabViolations: tabViolations,
          answers: answers
        });
    }
  } catch (e) { console.warn('Submit error:', e); }

  showResultScreen(score, totalMarks, pct, passed, correct, wrong);
}

/* ===== RESULT SCREEN ===== */
function showResultScreen(score, totalMarks, pct, passed, correct, wrong) {
  showScreen('resultScreen');
  document.getElementById('resTestTitle').textContent = testInfo.title;
  document.getElementById('resStudentInfo').textContent =
    studentInfo.name + ' | Roll: ' + studentInfo.rollNo +
    (studentInfo.className ? ' | ' + studentInfo.className : '');
  document.getElementById('resPercent').textContent = pct.toFixed(1) + '%';
  document.getElementById('resScore').textContent = score.toFixed(1);
  document.getElementById('resTotal').textContent = totalMarks;
  document.getElementById('resCorrect').textContent = correct;
  document.getElementById('resWrong').textContent = wrong;

  var badge = document.getElementById('resPassBadge');
  badge.textContent = passed ? '✓ PASS' : '✗ FAIL';
  badge.className = 'pass-badge ' + (passed ? 'pass' : 'fail');

  var review = document.getElementById('answerReview');
  review.innerHTML = '';

  questions.forEach(function(q, i) {
    var origIdx = q._origIdx;
    var userAns = answers[origIdx];
    var isCorrect = userAns === q.answer;
    var isSkipped = !userAns;

    var statusClass = isSkipped ? 'rv-skipped' : (isCorrect ? 'rv-correct' : 'rv-wrong');
    var statusText = isSkipped ? '— Skipped'
      : isCorrect ? '✓ (+' + (q.points || 1) + ')'
      : '✗ (' + (q.negativeMarks > 0 ? '-' + q.negativeMarks : '0') + ')';

    var optsHtml = ['A', 'B', 'C', 'D'].map(function(l) {
      var txt = q['opt' + l] || '';
      if (!txt && !q['opt' + l + 'Image']) return '';
      var cls = 'plain', mark = '';
      if (l === q.answer) {
        cls = 'correct-ans';
        mark = '<div class="rv-opt-mark mark-correct">✓</div>';
      } else if (l === userAns && !isCorrect) {
        cls = 'wrong-ans';
        mark = '<div class="rv-opt-mark mark-wrong">✗</div>';
      } else {
        mark = '<div class="rv-opt-mark" style="width:16px;height:16px;"></div>';
      }
      var optImg = q['opt' + l + 'Image']
        ? makeImgHtml(q['opt' + l + 'Image'], 'opt-image', 'Option ' + l, 'max-height:140px;')
        : '';
      return '<div class="rv-opt ' + cls + '">' + mark + '<b>' + l + '.</b>&nbsp;' + escHtml(txt) + optImg + '</div>';
    }).join('');

    // Explanation
    var expHtml = '';
    var exp = q.explanation ? q.explanation.trim() : '';
    var expImg = q.explanationImage ? q.explanationImage.trim() : '';
    if (exp || expImg) {
      var inner = '';
      if (exp) {
        if (looksLikeUrl(exp)) {
          inner += makeImgHtml(exp, 'q-image', 'Explanation', 'max-height:300px;');
        } else {
          inner += '<b>💡 Explanation:</b> ' + escHtml(exp);
        }
      }
      if (expImg) {
        inner += makeImgHtml(expImg, 'q-image', 'Explanation', 'max-height:300px;');
      }
      expHtml = '<div class="rv-explanation">' + inner + '</div>';
    }

    var rv = document.createElement('div');
    rv.className = 'review-q';

    var header = document.createElement('div');
    header.className = 'review-q-header';
    header.innerHTML =
      '<span>Q' + (i + 1) + '. ' + escHtml(q.chapter || '') + '</span>' +
      '<span class="' + statusClass + '">' + statusText + '</span>';

    var body = document.createElement('div');
    body.className = 'review-q-body';
    body.innerHTML =
      '<div class="rv-q-text">' + escHtml(q.question) + '</div>' +
      (q.questionImage ? makeImgHtml(q.questionImage, 'q-image', 'Question', 'max-height:200px;') : '') +
      '<div class="rv-options">' + optsHtml + '</div>' +
      expHtml;

    rv.appendChild(header);
    rv.appendChild(body);
    review.appendChild(rv);
  });
}

/* ===== SCREEN HELPER ===== */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  var el = document.getElementById(id);
  el.style.display = 'flex';
  el.classList.add('active');
  if (id === 'testScreen') el.style.flexDirection = 'column';
  window.scrollTo(0, 0);
}

/* ===== FULLSCREEN ===== */
function enterFullscreen() {
  var el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
}
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement ||
    document.mozFullScreenElement || document.msFullscreenElement);
}
function showFsWarning() {
  fsViolations++;
  document.getElementById('fsViolationCount').textContent = fsViolations;
  document.getElementById('fsWarning').classList.add('show');
}
function hideFsWarning() { document.getElementById('fsWarning').classList.remove('show'); }
function returnToFullscreen() { enterFullscreen(); hideFsWarning(); }

function setupFullscreenGuard() {
  if (!testInfo.forceFullscreen) return;
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function(evt) {
    document.addEventListener(evt, function() {
      if (testStarted && !testSubmitted && !isFullscreen()) showFsWarning();
    });
  });
  document.addEventListener('visibilitychange', function() {
    if (testStarted && !testSubmitted && document.hidden) {
      tabViolations++;
      document.getElementById('fsTabCount').textContent = tabViolations;
    }
  });
}

/* ===== MOBILE PALETTE ===== */
function openMobilePalette() {
  var src = document.getElementById('paletteScroll');
  var dst = document.getElementById('mobPaletteScroll');
  dst.innerHTML = src.innerHTML;
  dst.querySelectorAll('.q-btn').forEach(function(btn) {
    var qi = parseInt(btn.dataset.qi);
    btn.addEventListener('click', function() {
      showQuestion(qi);
      closeMobilePalette();
    });
    // Also handle touch
    (function(qIdx) {
      var ts = 0;
      btn.addEventListener('touchstart', function() { ts = Date.now(); }, { passive: true });
      btn.addEventListener('touchend', function(e) {
        if (Date.now() - ts < 400) {
          e.preventDefault();
          showQuestion(qIdx);
          closeMobilePalette();
        }
      }, { passive: false });
    })(qi);
  });
  updatePalette();
  document.getElementById('mobilePaletteDrawer').classList.add('open');
  document.getElementById('mobPalOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMobilePalette() {
  document.getElementById('mobilePaletteDrawer').classList.remove('open');
  document.getElementById('mobPalOverlay').classList.remove('show');
  if (!lightboxEl || !lightboxEl.classList.contains('show')) {
    document.body.style.overflow = '';
  }
}

function updateMobilePaletteStats() {
  var answered = Object.keys(answers).length;
  var marked = Object.keys(markedReview).length;
  var notAnswered = questions.filter(function(q, i) { return visited[i] && !answers[q._origIdx]; }).length;
  var el1 = document.getElementById('mobPalCount');
  var el2 = document.getElementById('mobStatAnswered');
  var el3 = document.getElementById('mobStatNotAns');
  var el4 = document.getElementById('mobStatReview');
  if (el1) el1.textContent = answered;
  if (el2) el2.textContent = answered;
  if (el3) el3.textContent = notAnswered;
  if (el4) el4.textContent = marked;
}

/* ===== WAKE LOCK ===== */
var wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', async function() {
        if (wakeLock !== null && document.visibilityState === 'visible' && testStarted && !testSubmitted) {
          try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
        }
      });
    }
  } catch (e) { console.log('Wake Lock:', e.message); }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(function() {}); wakeLock = null; }
}

/* ===== KEYBOARD SHORTCUTS (Desktop) ===== */
document.addEventListener('keydown', function(e) {
  if (!testStarted || testSubmitted) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (lightboxEl && lightboxEl.classList.contains('show')) return;
  if (document.getElementById('confirmModal').classList.contains('show')) return;

  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); navigate(-1); break;
    case 'ArrowRight': e.preventDefault(); navigate(1); break;
    case 'a': case 'A': selectAnswer(currentQ, 'A'); break;
    case 'b': case 'B': selectAnswer(currentQ, 'B'); break;
    case 'c': case 'C': selectAnswer(currentQ, 'C'); break;
    case 'd': case 'D': selectAnswer(currentQ, 'D'); break;
    case 'm': case 'M': toggleReview(); break;
  }
});

/* ===== SWIPE NAVIGATION (Mobile) ===== */
(function() {
  var swStartX = 0, swStartY = 0, swStartT = 0;

  document.addEventListener('touchstart', function(e) {
    if (!testStarted || testSubmitted) return;
    if (lightboxEl && lightboxEl.classList.contains('show')) return;
    if (document.getElementById('confirmModal').classList.contains('show')) return;
    if (document.getElementById('mobilePaletteDrawer').classList.contains('open')) return;
    // Don't track swipes starting on interactive elements
    if (e.target.closest && (e.target.closest('.option-item') || e.target.closest('.img-wrap') || e.target.closest('.q-nav') || e.target.closest('button'))) return;

    swStartX = e.touches[0].clientX;
    swStartY = e.touches[0].clientY;
    swStartT = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!testStarted || testSubmitted) return;
    if (lightboxEl && lightboxEl.classList.contains('show')) return;
    if (!swStartT) return;

    var elapsed = Date.now() - swStartT;
    if (elapsed > 350) { swStartT = 0; return; }

    var dx = e.changedTouches[0].clientX - swStartX;
    var dy = e.changedTouches[0].clientY - swStartY;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
      if (dx > 0) navigate(-1);
      else navigate(1);
    }
    swStartT = 0;
  }, { passive: true });
})();

/* ===== BEFORE UNLOAD ===== */
window.addEventListener('beforeunload', function(e) {
  if (testStarted && !testSubmitted) {
    e.preventDefault();
    e.returnValue = 'Test in progress! Leaving will lose your answers.';
    return e.returnValue;
  }
});

/* ===== ATTACH EVENT LISTENERS ===== */
function attachEventListeners() {
  // Mobile palette button
  document.getElementById('mobilePaletteBtn').addEventListener('click', openMobilePalette);
  document.getElementById('mobilePaletteBtn').addEventListener('touchend', function(e) {
    e.preventDefault(); openMobilePalette();
  });

  // Mobile palette overlay close
  document.getElementById('mobPalOverlay').addEventListener('click', closeMobilePalette);
  document.getElementById('mobPalOverlay').addEventListener('touchend', function(e) {
    e.preventDefault(); closeMobilePalette();
  });

  // Mobile palette close button
  document.getElementById('mobPalCloseBtn').addEventListener('click', closeMobilePalette);
  document.getElementById('mobPalCloseBtn').addEventListener('touchend', function(e) {
    e.preventDefault(); closeMobilePalette();
  });
}

/* ===== BOOT ===== */
initWelcomeScreen();
initLightbox();
setupFullscreenGuard();
attachEventListeners();

</script>
</body>
</html>`;
}