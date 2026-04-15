// ============================================
// Translator.gs — BILINGUAL MCQ TRANSLATOR v3
// UPGRADE: Protected Terms Pre-Processing
// Technical terms preserved across ALL languages
// Trades: Electrician, RAC, Civil Draughtsman,
//         Mechanical Draughtsman, WCS, Employability Skills
// ============================================
// HOW IT WORKS:
//   1. Protected terms → replaced with PROT0X, PROT1X... placeholders
//   2. GOOGLETRANSLATE runs (never translates PROT_N tokens)
//   3. Placeholders → restored back to original technical terms
//   Result: context-correct bilingual text, technical terms intact
// ============================================

var TR_Q_COL    = 0;
var TR_OPTA_COL = 2;
var TR_OPTB_COL = 4;
var TR_OPTC_COL = 6;
var TR_OPTD_COL = 8;

var TR_COL_MAP = [
  { src: TR_Q_COL,    dest: 16, header: 'Question (Translated)' },
  { src: TR_OPTA_COL, dest: 17, header: 'Option A (Translated)' },
  { src: TR_OPTB_COL, dest: 18, header: 'Option B (Translated)' },
  { src: TR_OPTC_COL, dest: 19, header: 'Option C (Translated)' },
  { src: TR_OPTD_COL, dest: 20, header: 'Option D (Translated)' }
];

var TR_SYSTEM_SHEETS = ['QUIZ LOG', 'ACTIVE TESTS', 'CONFIG', 'RESULTS', 'TEST_DATA'];

var TR_SUPPORTED_LANGS = [
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' }
];

// ============================================================
// PROTECTED TERMS — 500+ terms across all 6 trades
// IMPORTANT: Longer / more specific terms listed FIRST
// so they get matched before shorter substrings
// ============================================================
var TR_PROTECTED_TERMS = [

  // ── COMMON STANDARDS & ABBREVIATIONS ──
  'IS code','IS codes','IS 732','IS 1646','IS 3043',
  'NBC','CPWD','PWD','ITI','NCVT','SCVT','DGET','NTC','NAC',
  'CITS','CTI','NIMI','NIELIT','NSDC','PMKVY','RPL','QP','NOS',
  'TOT','TNA','SOP','BIS','ISI','ISO','IEC','IEEE','ASME','ASTM',
  'DIN','BS','ANSI','OSHA','MSME','SSI','DIC','NSIC','NIESBUD',
  'OHSAS','LOTO','MSDS','SDS','CAPA','PDCA','TQM','PPE',
  'BOQ','RCC','PCC','RBC','OPC','PPC','PSC','DPC',
  'AutoCAD','SolidWorks','CATIA','ProE',
  'HTML','HTTP','HTTPS','URL','WiFi','LAN','WAN','USB',
  'MS Office','MS Word','MS Excel','MS PowerPoint',
  'ISO 9001','ISO 45001','OHSAS 18001','Six Sigma',

  // ── ELECTRICIAN — Multi-word terms first ──
  'starting winding','running winding','auxiliary winding','field winding',
  'main winding','rotor winding','stator winding',
  'short circuit','open circuit','no load test','full load test',
  'no load','full load',
  'power factor','power supply','control circuit','main circuit',
  'slip ring','brush gear','brush contact',
  'tong tester','clamp meter','earth tester','insulation tester',
  'circuit breaker','fuse wire','fuse rating',
  'DOL starter','star delta starter','auto transformer starter',
  'forward reverse','plugging braking','dynamic braking',
  'MCB','ELCB','RCCB','MCCB','SMPS','VFD','DOL','UPS',
  'LED','CFL','RYB','EMF','MMF','RMS',
  'KVA','KW','KVAR','RPM','PPM','LDR','PTC','NTC',
  'SCR','TRIAC','DIAC','BJT','FET','MOSFET','PCB','PLC','SCADA','HRC',
  'AC','DC',
  'voltage','current','resistance','inductance','capacitance',
  'impedance','reactance','frequency','wattage',
  'ampere','ohm','volt','watt','henry','farad','hertz',
  'flux','torque','armature','rotor','stator',
  'winding','commutator','brush','solenoid','relay','contactor','starter',
  'earthing','grounding','neutral','phase','terminal','junction',
  'insulation','conductor','semiconductor',
  'rectifier','inverter','transformer','alternator','generator','motor',
  'capacitor','inductor','resistor','diode','transistor','thyristor',
  'fuse','switchgear','busbar','cable','conduit','duct','trunking',
  'megger','multimeter','oscilloscope','continuity','overload',

  // ── RAC — Multi-word terms first ──
  'expansion valve','solenoid valve','service valve',
  'Schrader valve','king valve','capillary tube','sight glass',
  'LP switch','HP switch','cooling tower','heat exchanger',
  'pressure gauge','manifold gauge','vacuum pump',
  'hermetic compressor','semi hermetic compressor','open type compressor',
  'reciprocating compressor','rotary compressor','scroll compressor',
  'air cooled condenser','water cooled condenser',
  'direct expansion','dry expansion',
  'thermostatic expansion valve','TEV','TXV',
  'R22','R32','R134a','R404A','R410A','R600a','R290','R507',
  'CFC','HCFC','HFC','GWP','ODP',
  'compressor','condenser','evaporator','receiver',
  'accumulator','drier','strainer','thermostat','pressostat',
  'refrigerant','tonnage','BTU','TR','COP','EER','SEER',
  'superheat','subcooling','subcool','enthalpy','entropy',
  'saturation','condensation','evaporation',
  'latent heat','sensible heat',
  'psychrometric','DBT','WBT','RH','CFM',
  'AHU','FCU','VRF','VRV','chiller',
  'brazing','flaring','swaging','charging','degassing',

  // ── CIVIL DRAUGHTSMAN — Multi-word first ──
  '1st angle projection','3rd angle projection',
  '1st angle','3rd angle',
  'auxiliary view','true shape',
  'assembly drawing','working drawing','detail drawing',
  'sectional view','section view',
  'plan view','front elevation','side elevation','top view',
  'isometric view','isometric drawing',
  'orthographic projection','perspective projection',
  'exploded view',
  'plan','elevation','section','isometric','orthographic','perspective',
  'projection','hatching','lettering','dimensioning','development',
  'scale','layout','tracing','blueprint',
  'footing','foundation','plinth','lintel','sill',
  'column','beam','slab','staircase','rafter','purlin','truss',
  'parapet','cornice','dado','fascia','soffit','jamb','reveal',
  'T-square','set square','compass','divider','protractor',
  'french curve','template','drafting machine','drafter','scale ruler',
  'A0','A1','A2','A3','A4',

  // ── MECHANICAL DRAUGHTSMAN — Multi-word first ──
  '1st angle projection','3rd angle projection',
  'true length','surface finish',
  'vernier caliper','dial gauge','height gauge','surface plate',
  'sine bar','slip gauge',
  'connecting rod','compression ratio',
  'chain drive','belt drive',
  'locus','involute','cycloid','epicycloid','hypocycloid',
  'tolerance','clearance','interference','allowance','limits','fits',
  'datum','thread','pitch','lead','helix',
  'cam','follower','gear','pinion','rack','worm','sprocket',
  'chain','belt','pulley','shaft','bearing',
  'key','keyway','spline','coupling','clutch','brake',
  'flywheel','piston','cylinder','crankshaft',
  'valve','port','stroke','bore',
  'CI','MS','SS','brass','bronze','Bakelite','PTFE','nylon',
  'BHN','HRC','HRB','UTS','YS',
  'Ra','Rz','GD&T','micrometer',

  // ── WCS — Multi-word science terms first ──
  "Young's modulus","Hooke's law","Bernoulli's principle",
  "Pascal's law","Archimedes' principle","Newton's law",
  "Newton's laws",
  'atomic number','atomic mass','standard deviation',
  'specific heat','thermal expansion',
  'latent heat','sensible heat',
  'screw gauge','least count','zero error','parallax error',
  'significant figures','sine rule','cosine rule',
  'SI unit','CGS','MKS','FPS',
  'BODMAS','LCM','HCF',
  'algebra','arithmetic','geometry','trigonometry','mensuration',
  'logarithm','antilogarithm','fraction','decimal','integer',
  'rational','irrational','permutation','combination','probability',
  'mean','median','mode','variance',
  'quadratic','linear','polynomial','matrix','determinant',
  'vector','scalar',
  'velocity','acceleration','momentum','inertia','friction','gravity',
  'density','viscosity','elasticity','plasticity','stress','strain',
  'thermodynamics','kinetics','kinematic','efficiency',
  'conduction','convection','radiation',
  'wavelength','amplitude','resonance',
  'refraction','reflection','diffraction','polarization',
  'electrolysis','electrode','anode','cathode','electrolyte',
  'oxidation','reduction','valency','isotope','cation','anion',
  'corrosion','alloy','flux','solder','catalyst',
  'atom','molecule','element','compound','mixture','solution',
  'solvent','solute','acid','alkali','base','pH',
  'micro','milli','centi','deci','kilo','mega','giga','nano','pico',
  'isosceles','equilateral','scalene','rhombus','trapezoid',
  'parallelogram','polygon','hexagon','octagon','ellipse',
  'parabola','hyperbola',
  'diameter','radius','circumference','perimeter',
  'chord','arc','sector','segment','tangent',
  'secant','normal','perpendicular','parallel','hypotenuse',
  'Pythagoras',

  // ── EMPLOYABILITY SKILLS — Multi-word first ──
  'body language','eye contact','group discussion','public speaking',
  'cover letter','non-verbal communication','verbal communication',
  'time management','problem solving','critical thinking','decision making',
  'first aid','fire extinguisher','toolbox talk','permit to work','PTW',
  'lockout','tagout','near miss',
  'non-conformance','corrective action','preventive action',
  'operating system','pen drive','IP address',
  'cash flow','balance sheet','return on investment',
  'communication','feedback','gesture','posture','tone','pitch',
  'diction','vocabulary','grammar','resume','email','memo',
  'minutes','agenda','report','presentation','interview','negotiation',
  'non-verbal','verbal',
  'computer','hardware','software','browser','password','username',
  'login','logout','download','upload','attachment','folder',
  'router','modem','server','cloud','backup','antivirus','firewall',
  'shortcut','spreadsheet','database','domain',
  'Windows','Linux','Android','iOS',
  'entrepreneur','entrepreneurship','startup','venture','capital',
  'investment','profit','loss','revenue','expense','budget',
  'ledger','debit','credit','invoice','receipt','quotation',
  'tender','loan','interest','subsidy',
  'Kaizen','Seiri','Seiton','Seiso','Seiketsu','Shitsuke','Lean',
  '5S','PDCA',
  'safety','health','hygiene','sanitation','hazard','risk','accident',
  'emergency','evacuation','audit','certification','calibration',
  'inspection','rejection','rework','scrap','defect','quality',
  'appraisal','increment','salary','wages','overtime','gratuity','bonus',
  'recruitment','selection','induction','probation','resignation',
  'termination','workplace','hierarchy','department','designation',
  'promotion','attendance','shift',
  'goal','target','deadline','priority','planning','scheduling','stress',
  'motivation','attitude','confidence','punctuality','discipline',
  'integrity','accountability','adaptability','flexibility',
  'leadership','teamwork','collaboration','coordination','delegation',
  'creativity','innovation',

  // ── UNITS — Always protect ──
  'kPa','MPa','kHz','MHz','mV','kV','mA','kA','kW','MW','kJ','kcal',
  'mm','cm','km','kg','rpm','lux','lumen',
  'm','g','N','Pa','bar','psi','Hz','V','A','W','J','K',
  'dB','CFM','BTU','TR',
  '1:10','1:20','1:50','1:100','1:200','1:500',
  '°C','°F',

  // ── MATH FUNCTIONS ──
  'sin','cos','tan','log','pH','formula','equation',
  'ratio','percentage','efficiency'

];

// ============================================================
// OPEN SIDEBAR
// ============================================================
function openTranslator() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets()
    .filter(function(s) { return TR_SYSTEM_SHEETS.indexOf(s.getName()) === -1; })
    .map(function(s) {
      var rows = Math.max(0, s.getLastRow() - 1);
      var hasBilingual = s.getLastColumn() >= 20 &&
        (s.getRange(1, 16).getValue() || '').toString().indexOf('Translated') !== -1;
      return { name: s.getName(), count: rows, hasBilingual: hasBilingual };
    });

  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(buildTranslatorHtml(sheets))
      .setTitle('🌐 Smart Bilingual Translator v3')
      .setWidth(480)
  );
}

// ============================================================
// PROTECT TERMS — replace with PROT0X, PROT1X ... placeholders
// ============================================================
function protectTerms(text) {
  if (!text || text.toString().trim() === '') return { text: text, map: {} };

  var result = text.toString();
  var map    = {};
  var counter = 0;

  // Sort longest first — prevents short term matching inside longer term
  var sorted = TR_PROTECTED_TERMS.slice().sort(function(a, b) {
    return b.length - a.length;
  });

  sorted.forEach(function(term) {
    try {
      var escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Word boundary: don't match if surrounded by word chars
      var regex = new RegExp('(?<![A-Za-z0-9_])' + escaped + '(?![A-Za-z0-9_])', 'gi');

      result = result.replace(regex, function(match) {
        var ph = 'PROT' + counter + 'X';
        map[ph] = match; // preserve original casing exactly
        counter++;
        return ph;
      });
    } catch(e) {
      // Skip term if regex fails (safe fallback — term stays untouched)
    }
  });

  return { text: result, map: map };
}

// ============================================================
// RESTORE TERMS — replace placeholders back with originals
// ============================================================
function restoreTerms(translatedText, map) {
  if (!translatedText) return translatedText;
  var result = translatedText.toString();

  Object.keys(map).forEach(function(ph) {
    // Direct replace
    while (result.indexOf(ph) !== -1) {
      result = result.replace(ph, map[ph]);
    }
    // Google Translate sometimes adds spaces: "PROT 0 X" → handle it
    var spaced = ph.replace(/([A-Z]+)(\d+)([A-Z]+)/, '$1 $2 $3');
    if (spaced !== ph) {
      while (result.indexOf(spaced) !== -1) {
        result = result.replace(spaced, map[ph]);
      }
    }
  });

  return result;
}

// ============================================================
// CORE: ADD BILINGUAL COLUMNS
// ============================================================
function addBilingualColumns(sheetName, targetLang, sourceLang) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var lastRow  = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No data rows in sheet: ' + sheetName);
  var dataRows = lastRow - 1;

  // ── STEP 1: Write headers ──
  TR_COL_MAP.forEach(function(m) {
    sheet.getRange(1, m.dest)
      .setValue(m.header)
      .setBackground('#1a56db')
      .setFontColor('white')
      .setFontWeight('bold');
  });

  // ── STEP 2: Read all source data (batch) ──
  var sourceData = {};
  TR_COL_MAP.forEach(function(m) {
    sourceData[m.dest] = sheet.getRange(2, m.src + 1, dataRows, 1).getValues();
  });

  // ── STEP 3: Create temp sheet for placeholder texts ──
  var tempName = '__TR_TEMP__';
  var tempSheet = ss.getSheetByName(tempName);
  if (tempSheet) ss.deleteSheet(tempSheet);
  tempSheet = ss.insertSheet(tempName);
  tempSheet.hideSheet();

  // Build placeholder texts and store maps
  var allMaps = [];

  TR_COL_MAP.forEach(function(m, colIdx) {
    var srcValues    = sourceData[m.dest];
    var protectedVals = [];
    var colMaps      = [];

    srcValues.forEach(function(row) {
      var text = (row[0] || '').toString().trim();
      if (!text) {
        protectedVals.push(['']);
        colMaps.push({});
      } else {
        var res = protectTerms(text);
        protectedVals.push([res.text]);
        colMaps.push(res.map);
      }
    });

    if (dataRows > 0) {
      tempSheet.getRange(1, colIdx + 1, dataRows, 1).setValues(protectedVals);
    }
    allMaps.push(colMaps);
  });

  SpreadsheetApp.flush();

  // ── STEP 4: Write GOOGLETRANSLATE formulas referencing temp sheet ──
  var tempRef = "'" + tempName + "'";

  TR_COL_MAP.forEach(function(m, colIdx) {
    var srcValues    = sourceData[m.dest];
    var tempColLetter = colNumToLetter(colIdx + 1);

    for (var row = 0; row < dataRows; row++) {
      var text     = (srcValues[row][0] || '').toString().trim();
      var destCell = sheet.getRange(row + 2, m.dest);

      if (!text) {
        destCell.setValue('');
      } else {
        var tempCellRef = tempRef + '!' + tempColLetter + (row + 1);
        var formula = '=IFERROR(GOOGLETRANSLATE(' + tempCellRef +
                      ',"' + sourceLang + '","' + targetLang + '"),' +
                      tempCellRef + ')';
        destCell.setFormula(formula);
      }
    }
  });

  SpreadsheetApp.flush();

  // ── STEP 5: Poll until GOOGLETRANSLATE resolves (max 120s) ──
  var maxWait = 120000;
  var pollMs  = 3000;
  var waited  = 0;

  while (waited < maxWait) {
    Utilities.sleep(pollMs);
    waited += pollMs;
    SpreadsheetApp.flush();

    var done = true;
    var checkDest = TR_COL_MAP[0].dest;
    var checkSrc  = TR_COL_MAP[0].src + 1;

    for (var r = 2; r <= Math.min(lastRow, 8); r++) {
      var hasText = sheet.getRange(r, checkSrc).getValue().toString().trim() !== '';
      var result  = sheet.getRange(r, checkDest).getDisplayValue().toString().trim();
      if (hasText && result === '') { done = false; break; }
    }
    if (done) break;
  }

  // ── STEP 6: Read translated values, restore terms, write back as plain text ──
  TR_COL_MAP.forEach(function(m, colIdx) {
    var colMaps    = allMaps[colIdx];
    var range      = sheet.getRange(2, m.dest, dataRows, 1);
    var translated = range.getDisplayValues();

    var restored = translated.map(function(row, rowIdx) {
      var val = (row[0] || '').toString();
      if (!val) return [''];
      return [restoreTerms(val, colMaps[rowIdx])];
    });

    range.setValues(restored);
  });

  // ── STEP 7: Format columns ──
  TR_COL_MAP.forEach(function(m) {
    sheet.getRange(2, m.dest, dataRows, 1)
      .setBackground('#f0fdf4')
      .setFontColor('#065f46')
      .setWrap(true);
    sheet.setColumnWidth(m.dest, 220);
  });

  // ── STEP 8: Delete temp sheet ──
  ss.deleteSheet(tempSheet);
  SpreadsheetApp.flush();

  return { sheet: sheetName, rows: dataRows, lang: targetLang };
}

// ============================================================
// HELPER: Column number → letter
// ============================================================
function colNumToLetter(n) {
  var s = '';
  while (n > 0) {
    var m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m - 1) / 26);
  }
  return s;
}

// ============================================================
// BUILD SIDEBAR HTML
// ============================================================
function buildTranslatorHtml(sheets) {
  var sheetsJson = JSON.stringify(sheets);
  var langsJson  = JSON.stringify(TR_SUPPORTED_LANGS);

  return '<!DOCTYPE html><html><head>' +
  '<meta name="viewport" content="width=device-width">' +
  '<style>' +
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:"Segoe UI",Arial,sans-serif;font-size:13px;background:#f0f4f8;color:#2d3748}' +
  '.hdr{background:linear-gradient(135deg,#1a56db,#0d3b9e);color:white;padding:14px 16px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.2)}' +
  '.hdr h1{font-size:15px;font-weight:700}.hdr p{font-size:11px;opacity:.8;margin-top:2px}' +
  '.card{background:white;margin:10px 8px;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
  '.ch{background:#f7faff;border-bottom:1px solid #e2e8f0;padding:10px 14px;display:flex;align-items:center;gap:8px}' +
  '.sn{background:#1a56db;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;flex-shrink:0}' +
  '.ct{font-weight:600;font-size:12px;color:#1a202c;text-transform:uppercase;letter-spacing:.5px}' +
  '.cb{padding:12px 14px}' +
  'label{font-size:11px;color:#718096;font-weight:600;display:block;margin-bottom:4px;margin-top:10px;text-transform:uppercase;letter-spacing:.3px}' +
  'label:first-child{margin-top:0}' +
  'select{width:100%;padding:8px 10px;border:2px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;transition:border .15s;background:white}' +
  'select:focus{border-color:#1a56db;outline:none}' +
  '.good-box{background:#f0fdf4;border:1px solid #6ee7b7;border-radius:8px;padding:10px 12px;font-size:11px;color:#065f46;line-height:1.8;margin-top:8px}' +
  '.warn-box{background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px 12px;font-size:11px;color:#92400e;line-height:1.6;margin-top:8px}' +
  '.badge{display:inline-block;background:#7c3aed;color:white;font-size:9px;font-weight:800;padding:2px 7px;border-radius:8px;margin-left:6px;vertical-align:middle}' +
  '.btn{width:100%;padding:13px;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:12px}' +
  '.bp{background:linear-gradient(135deg,#1a56db,#0d3b9e);color:white}' +
  '.bp:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(26,86,219,.4)}' +
  '.bp:disabled{background:#a0aec0!important;cursor:not-allowed!important;transform:none!important;box-shadow:none!important}' +
  '#status{margin:4px 8px;padding:10px 12px;border-radius:8px;display:none;font-size:12px;line-height:1.6;white-space:pre-line}' +
  '.sok{background:#d1fae5;color:#065f46;border:1px solid #6ee7b7}' +
  '.ser{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}' +
  '.sld{background:#fff7ed;color:#c2410c;border:1px solid #fdba74}' +
  '.sp{height:20px}' +
  '</style></head><body>' +

  '<div class="hdr"><h1>🌐 Smart Bilingual Translator <span class="badge">v3</span></h1>' +
  '<p>500+ technical terms protected — context-correct translation</p></div>' +

  '<div class="card"><div class="ch"><div class="sn">ℹ</div><div class="ct">What Changed in v3</div></div>' +
  '<div class="cb"><div class="good-box">' +
  '✅ <b>English columns never overwritten</b> — Cols P–T same as before<br>' +
  '🛡️ <b>500+ terms protected before translating:</b><br>' +
  '&nbsp;&nbsp;⚡ Electrician: voltage, relay, MCB, earthing, contactor...<br>' +
  '&nbsp;&nbsp;❄️ RAC: compressor, R410A, superheat, COP, AHU...<br>' +
  '&nbsp;&nbsp;📐 Civil: elevation, footing, DPC, 1st angle projection...<br>' +
  '&nbsp;&nbsp;🔧 Mechanical: tolerance, GD&T, bearing, involute...<br>' +
  '&nbsp;&nbsp;📊 WCS: trigonometry, viscosity, Young\'s modulus...<br>' +
  '&nbsp;&nbsp;💼 Employability: 5S, Kaizen, SOP, PDCA, CPR...<br>' +
  '🔄 Still uses <b>GOOGLETRANSLATE</b> — free, no quota<br>' +
  '🎯 Result: <b>No more out-of-context translations!</b>' +
  '</div></div></div>' +

  '<div class="card"><div class="ch"><div class="sn">1</div><div class="ct">Select Subject Sheet</div></div>' +
  '<div class="cb">' +
  '<label>Sheet to translate</label>' +
  '<select id="sheetSel" onchange="onSheetChange()"><option value="">— select a sheet —</option></select>' +
  '<div id="sheetInfo" style="display:none;margin-top:8px;font-size:11px;padding:6px 10px;border-radius:6px;background:#f0fdf4;color:#065f46;border:1px solid #bbf7d0;"></div>' +
  '</div></div>' +

  '<div class="card"><div class="ch"><div class="sn">2</div><div class="ct">Choose Language</div></div>' +
  '<div class="cb">' +
  '<label>Source language (MCQs are in)</label>' +
  '<select id="srcLang"><option value="en">English</option><option value="hi">Hindi</option><option value="auto">Auto-detect</option></select>' +
  '<label>Translate into</label>' +
  '<select id="tgtLang"><option value="">— select —</option></select>' +
  '</div></div>' +

  '<div class="card"><div class="ch"><div class="sn">3</div><div class="ct">Translate</div></div>' +
  '<div class="cb">' +
  '<div class="warn-box">⏳ Takes <b>30–90 seconds</b>. A temp sheet <b>__TR_TEMP__</b> appears briefly — it auto-deletes when done. Do not close the sidebar while running.</div>' +
  '<button class="btn bp" id="goBtn" onclick="startTranslate()">🛡️ Translate with Term Protection</button>' +
  '</div></div>' +

  '<div id="status"></div><div class="sp"></div>' +

  '<script>' +
  'var SHEETS=' + sheetsJson + ';' +
  'var LANGS='  + langsJson  + ';' +

  '(function(){' +
  '  var sel=document.getElementById("sheetSel");' +
  '  SHEETS.forEach(function(s){' +
  '    var o=document.createElement("option");' +
  '    o.value=s.name;' +
  '    o.textContent=s.name+(s.count>0?" ("+s.count+" Qs)":"")+(s.hasBilingual?" ✓ bilingual":"");' +
  '    sel.appendChild(o);' +
  '  });' +
  '  var tgt=document.getElementById("tgtLang");' +
  '  LANGS.forEach(function(l){' +
  '    var o=document.createElement("option");' +
  '    o.value=l.code;o.textContent=l.name;' +
  '    if(l.code==="hi")o.selected=true;' +
  '    tgt.appendChild(o);' +
  '  });' +
  '})();' +

  'function onSheetChange(){' +
  '  var v=document.getElementById("sheetSel").value;' +
  '  var el=document.getElementById("sheetInfo");' +
  '  if(!v){el.style.display="none";return;}' +
  '  var s=SHEETS.find(function(x){return x.name===v;});' +
  '  if(s){el.style.display="block";' +
  '    el.innerHTML=s.hasBilingual' +
  '      ?"<b>✓ Already bilingual.</b> Running again re-translates cols P–T with updated protection."' +
  '      :"<b>"+s.count+" questions</b> found. Cols P–T will be added with term-protected translation.";' +
  '  }' +
  '}' +

  'function startTranslate(){' +
  '  var sheet=document.getElementById("sheetSel").value;' +
  '  var tgt=document.getElementById("tgtLang").value;' +
  '  var src=document.getElementById("srcLang").value;' +
  '  if(!sheet){stat("Please select a sheet first.","ser");return;}' +
  '  if(!tgt){stat("Please select a target language.","ser");return;}' +
  '  var s=SHEETS.find(function(x){return x.name===sheet;});' +
  '  if(s&&s.count===0){stat("No questions found in this sheet.","ser");return;}' +
  '  stat("🛡️ Protecting technical terms...\\n⏳ Step 1/3: Building placeholder text\\nPlease wait — do not close this sidebar.","sld");' +
  '  dis("goBtn",true);' +
  '  google.script.run' +
  '    .withSuccessHandler(function(r){' +
  '      stat("✅ Translation Complete!\\n\\n"+r.rows+" questions in \'"+r.sheet+"\' translated.\\n\\n🛡️ Technical terms preserved in original form.\\n✅ Context-correct translation applied.\\n📋 Cols P–T updated.\\n\\nStudents will see both languages in the test!","sok");' +
  '      dis("goBtn",false);' +
  '      var s2=SHEETS.find(function(x){return x.name===r.sheet;});' +
  '      if(s2)s2.hasBilingual=true;' +
  '      onSheetChange();' +
  '    })' +
  '    .withFailureHandler(function(e){' +
  '      stat("❌ Error: "+e.message+"\\n\\nIf __TR_TEMP__ sheet is visible, delete it manually.","ser");' +
  '      dis("goBtn",false);' +
  '    })' +
  '    .addBilingualColumns(sheet,tgt,src==="auto"?"en":src);' +
  '}' +

  'function stat(m,c){var e=document.getElementById("status");e.style.display="block";e.className=c;e.textContent=m;setTimeout(function(){e.scrollIntoView({behavior:"smooth",block:"nearest"});},50);}' +
  'function dis(id,v){var e=document.getElementById(id);if(e)e.disabled=v;}' +
  '</script></body></html>';
}