"""Build one portable administration HTML with embedded styles, scripts and fonts."""
from pathlib import Path
import base64
import re
import sys
root=Path(__file__).resolve().parents[1]
assets=root/'android-app/app/src/main/assets'
s=(assets/'index.html').read_text()
fonts={name:'data:font/ttf;base64,'+base64.b64encode((assets/'fonts'/name).read_bytes()).decode() for name in ('cairo-400.ttf','cairo-700.ttf')}
for name in ('mobile-ui.css','desktop-ui.css','redesign.css','interiors.css','notifications.css'):
    css=(assets/name).read_text()
    for file,data in fonts.items():css=css.replace('fonts/'+file,data)
    s=s.replace('<link rel="stylesheet" href="'+name+'">','<style>'+css+'</style>')
for name in ('mobile-ui.js','qr-code.js','thermal-label.js','gift-print.js','desktop-ui.js','mobile-status.js','finance-core.js','finance-ui.js','redesign.js','interiors.js','notifications.js','regions-picker.js','archive-view.js','preparation-core.js','preparation-batches.js','preparation-ui.js','backups.js','analytics-core.js','analytics-ui.js'):
    js=(assets/name).read_text()
    if name=='gift-print.js':js=js.replace("new URL('fonts/cairo-700.ttf',document.baseURI).href",repr(fonts['cairo-700.ttf']))
    s=s.replace('<script src="'+name+'"></script>','<script>'+js.replace('</script','<\\/script')+'</script>')
for sdk in ('app','database','auth'):
    s=s.replace('vendor/firebase-'+sdk+'-compat.js','https://www.gstatic.com/firebasejs/9.22.1/firebase-'+sdk+'-compat.js')
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'dist/Azzams-Desktop-1.15.2.html'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(s)
print(out)
