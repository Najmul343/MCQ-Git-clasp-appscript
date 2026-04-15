function TINY(url) {
  return UrlFetchApp.fetch(
    "https://is.gd/create.php?format=simple&url=" + encodeURIComponent(url)
  ).getContentText();
}