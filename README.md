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
yarn build
yarn build:min
yarn watch
yarn testes
yarn testes:watch
```

## Uso básico

1. Gere o bundle do runtime:

```bash
yarn build
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
- `scriptTypes: ('text/delegua' | 'text/delegua3')[]`: tipos de script aceitos.
- `output(texto, info)`: callback para capturar saída de `escreva()`.
- `autoStart: boolean`: controla auto-execução no carregamento.
- `onScriptStart(info)` / `onScriptEnd(resultado)`: hooks de ciclo de vida.

## Exemplo pronto

Veja [index.html](index.html) para um exemplo completo com captura de saída em DOM.
