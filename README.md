# delegua-script

Runtime em TypeScript para executar Delégua em tags `<script>` de HTML, no estilo de inicialização do Brython.

## Requisitos

- Node.js 18+
- Yarn 1.x

## Instalação

```bash
yarn
```

## Scripts

```bash
yarn typecheck
yarn empacotar
yarn empacotar:min
yarn watch
yarn testes
yarn testes:watch
yarn preparar-github-pages
yarn publicar-github-pages:dry-run
yarn publicar-github-pages
yarn publicar-npm:dry-run
yarn publicar-npm
```

## Uso básico

1. Gere o bundle do runtime:

```bash
yarn empacotar
```

2. Inclua o UMD da Delégua e o runtime compilado na página:

```html
<script src="./node_modules/@designliquido/delegua/umd/delegua.js"></script>
<script src="./dist/delegua-script.js"></script>

<script type="text/delegua" id="programa">
escreva("Olá, mundo!")
</script>

<script>
	window.delegua({ ids: ["programa"] })
</script>
```

## API global

O runtime expõe:

- `window.delegua(options?)`: executa scripts Delégua encontrados na página.
- `window.__DELEGUA__`: instância do runtime.

Opções principais de `window.delegua()`:

- `ids: string[]`: executa somente scripts com IDs específicos.
- `tiposDeScript: ('text/delegua' | 'texto/delegua')[]`: tipos de script aceitos.
- `saida(texto, info)`: callback para capturar saída de `escreva()`.
- `autoIniciar: boolean`: controla auto-execução no carregamento.
- `aoIniciarScript(info)` / `aoFinalizarScript(resultado)`: hooks de ciclo de vida.

## Publicação no npm

1. Atualize a versão em package.json para a release que será publicada.
2. Faça login no npm com `npm login`.
3. Valide o artefato final com `yarn publicar-npm:dry-run`.
4. Publique com `yarn publicar-npm`.

O comando de publicação agora gera automaticamente um package.json enxuto em dist, copia README.md e LICENSE, e publica apenas o artefato pronto para consumo no navegador.

## Publicação no GitHub Pages

Use o comando `yarn publicar-github-pages`.

Para validar localmente o artefato do Pages antes de publicar:

```bash
yarn publicar-github-pages:dry-run
npx http-server site -p 8080 -c-1 -o /index.html
```

O comando de publicação envia apenas o conteúdo de site para a branch `gh-pages`.
O comando `publicar-github-pages:dry-run` não faz a publicação; ele apenas reconstrói o artefato local em site.

## Exemplo pronto

Veja [index.html](index.html) para um exemplo completo com captura de saída em DOM.
