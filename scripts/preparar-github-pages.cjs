const fs = require('node:fs');
const path = require('node:path');

const raizProjeto = path.resolve(__dirname, '..');
const diretorioSite = path.join(raizProjeto, 'site');
const diretorioDist = path.join(raizProjeto, 'dist');
const caminhoIndex = path.join(raizProjeto, 'index.html');
const caminhoLicenca = path.join(raizProjeto, 'LICENSE');
const caminhoBundle = path.join(diretorioDist, 'delegua-script.js');
const caminhoDeleguaUmd = path.join(
  raizProjeto,
  'node_modules',
  '@designliquido',
  'delegua',
  'umd',
  'delegua.js'
);

if (!fs.existsSync(caminhoBundle)) {
  throw new Error('Bundle não encontrado em dist/delegua-script.js. Execute yarn empacotar antes de preparar o GitHub Pages.');
}

if (!fs.existsSync(caminhoDeleguaUmd)) {
  throw new Error('UMD da Delégua não encontrado em node_modules/@designliquido/delegua/umd/delegua.js.');
}

fs.rmSync(diretorioSite, { recursive: true, force: true });
fs.mkdirSync(path.join(diretorioSite, 'dist'), { recursive: true });
fs.mkdirSync(path.join(diretorioSite, 'vendor'), { recursive: true });

const htmlOriginal = fs.readFileSync(caminhoIndex, 'utf8');
const htmlParaSite = htmlOriginal.replace(
  './node_modules/@designliquido/delegua/umd/delegua.js',
  './vendor/delegua.js'
);

fs.writeFileSync(path.join(diretorioSite, 'index.html'), htmlParaSite);
fs.copyFileSync(caminhoBundle, path.join(diretorioSite, 'dist', 'delegua-script.js'));
fs.copyFileSync(caminhoDeleguaUmd, path.join(diretorioSite, 'vendor', 'delegua.js'));
fs.writeFileSync(path.join(diretorioSite, '.nojekyll'), '');

if (fs.existsSync(caminhoLicenca)) {
  fs.copyFileSync(caminhoLicenca, path.join(diretorioSite, 'LICENSE'));
}