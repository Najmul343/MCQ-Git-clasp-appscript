function testORModel() {
  var key = "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";
  var resp = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: {'Authorization': 'Bearer ' + key, 'HTTP-Referer': 'https://script.google.com'},
    payload: JSON.stringify({model: 'openrouter/free', max_tokens: 10, messages: [{role: 'user', content: 'Say hi'}]}),
    muteHttpExceptions: true
  });
  Logger.log(resp.getResponseCode() + ' ' + resp.getContentText().substring(0, 300));
}


function fixORModel() {
  PropertiesService.getScriptProperties().setProperty('MCQ_OR_MODEL', 'openrouter/free');
  Logger.log('Done!');
}

function checkSavedORKeys() {
  var keys = PropertiesService.getScriptProperties().getProperty('MCQ_OR_KEYS');
  Logger.log(keys);
}


function fixORModel() {
  PropertiesService.getScriptProperties().setProperty('MCQ_OR_MODEL', 'openrouter/free');
  Logger.log('Done: ' + PropertiesService.getScriptProperties().getProperty('MCQ_OR_MODEL'));
}