export function generateIframeHtml(
  bundleUrl: string,
  importMap?: Record<string, string>,
): string {
  const escapedUrl = bundleUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  const importMapTag = importMap
    ? `<script type="importmap">${JSON.stringify({ imports: importMap })}</script>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; }
  </style>
  ${importMapTag}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${escapedUrl}"></script>
  <script>
    window.addEventListener('error', function(e) {
      window.parent.postMessage({ type: 'error', error: e.message }, '*');
    });
    window.kgBridge = {
      sendToParent: function(type, data) {
        window.parent.postMessage({ type: type, data: data }, '*');
      }
    };
  </script>
</body>
</html>`;
}
