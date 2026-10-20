// Local, dependency-free preview. Run: node tests/rescue-preview.cjs
// Full engine checks: node tests/inventory.test.cjs
// For later-day browser QA, first run the checks with --fixtures, then serve
// on port 8789: node tests/rescue-preview.cjs 8789
// Open /tests/.rescue-qa-day-5.html (or day-4, day-6, day-7, rush, ending, failure).
// The separate origin keeps QA saves away from the normal preview on port 8788.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const port=Number(process.argv[2]||8788);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let target=path.resolve(root,'.'+pathname);
    if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!fs.existsSync(target)){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(target).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`Café Rescue preview: http://127.0.0.1:${port}/dist/index.html`));
