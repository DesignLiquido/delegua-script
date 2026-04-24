import { DeleguaApi, ErroExecucaoDeleguaInterface, ResultadoExecucaoDeleguaInterface, OpcoesTempoExecucaoDeleguaInterface, OpcoesDeleguaScriptInterface, ImportacaoDomResolvida, InformacaoElementoSintaticoSimplificada } from "./interfaces";
import { ScriptType } from "./tipos";

declare global {
  interface Window {
    Delegua: DeleguaApi;
    __DELEGUA__?: DeleguaTempoExecucaoNavegador;
    delegua?: (options?: OpcoesTempoExecucaoDeleguaInterface) => Promise<ResultadoExecucaoDeleguaInterface[]>;
  }
}

export function normalizarCodigoParaLinhas(codigo: string): string[] {
  const normalizado = codigo.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalizado.split('\n');
}

export function extrairMensagemErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }

  if (typeof erro === 'string') {
    return erro;
  }

  try {
    return JSON.stringify(erro);
  } catch {
    return 'Erro desconhecido';
  }
}

export function extrairImportacoesDeDom(codigo: string): ImportacaoDomResolvida {
  const linhas = normalizarCodigoParaLinhas(codigo);
  const simbolosImportados = new Set<string>();
  const linhasSemImportacoes: string[] = [];

  for (const linha of linhas) {
    const correspondenciaImportacao = linha.match(/^\s*importar\s*\{\s*([^}]+)\s*\}\s*de\s+dom\s*;?\s*$/i);

    if (!correspondenciaImportacao) {
      linhasSemImportacoes.push(linha);
      continue;
    }

    const listaDeSimbolos = correspondenciaImportacao[1]
      .split(',')
      .map((simbolo) => simbolo.trim())
      .filter((simbolo) => simbolo.length > 0);

    for (const simbolo of listaDeSimbolos) {
      simbolosImportados.add(simbolo);
    }
  }

  return {
    codigoSemImportacoes: linhasSemImportacoes.join('\n'),
    simbolosImportados: [...simbolosImportados],
  };
}

export function criarDescritoresSintaticosDom(): Record<string, InformacaoElementoSintaticoSimplificada> {
  return {
    bind: {
      nome: 'bind',
      tipo: 'qualquer',
      subElementos: [
        { nome: 'alvo', tipo: 'qualquer' },
        { nome: 'evento', tipo: 'texto' },
        { nome: 'callback', tipo: 'função' },
      ],
    },
    document: {
      nome: 'document',
      tipo: 'qualquer',
      subElementos: [],
    },
    alert: {
      nome: 'alert',
      tipo: 'qualquer',
      subElementos: [{ nome: 'mensagem', tipo: 'qualquer' }],
    },
  };
}

export function registrarImportacoesDeDomNoAvaliador(avaliadorSintatico: unknown, simbolosImportados: string[]): void {
  if (simbolosImportados.length === 0) {
    return;
  }

  const avaliador = avaliadorSintatico as {
    inicializarPilhaEscopos?: () => void;
    pilhaEscopos?: {
      definirInformacoesVariavel: (nome: string, informacoes: InformacaoElementoSintaticoSimplificada) => void;
    };
  };

  const inicializadorOriginal = avaliador.inicializarPilhaEscopos;
  if (typeof inicializadorOriginal !== 'function') {
    throw new Error('Avaliador sintático não expõe inicializarPilhaEscopos().');
  }

  const descritoresDom = criarDescritoresSintaticosDom();

  avaliador.inicializarPilhaEscopos = function inicializarPilhaEscoposComDom(this: typeof avaliador) {
    inicializadorOriginal.call(this);

    if (!this.pilhaEscopos?.definirInformacoesVariavel) {
      throw new Error('Avaliador sintático não expõe pilhaEscopos.definirInformacoesVariavel().');
    }

    for (const simboloImportado of simbolosImportados) {
      if (!(simboloImportado in descritoresDom)) {
        throw new Error(`Símbolo '${simboloImportado}' não existe no módulo dom.`);
      }

      this.pilhaEscopos.definirInformacoesVariavel(simboloImportado, descritoresDom[simboloImportado]);
    }
  };
}

class DeleguaTempoExecucaoNavegador {
  private readonly tiposScriptsPadrao: ScriptType[] = ['text/delegua', 'texto/delegua'];
  private opcoes: OpcoesTempoExecucaoDeleguaInterface = {};
  private contadorScripts = 0;
  private iniciado = false;

  public quandoPronto: Promise<void>;
  private resolucaoPronta!: () => void;

  constructor() {
    this.quandoPronto = new Promise<void>((resolve) => {
      this.resolucaoPronta = resolve;
    });
  }

  public configurar(opcoes?: OpcoesTempoExecucaoDeleguaInterface): void {
    this.opcoes = {
      ...this.opcoes,
      ...opcoes,
    };
  }

  public async executar(opcoes?: OpcoesTempoExecucaoDeleguaInterface): Promise<ResultadoExecucaoDeleguaInterface[]> {
    this.configurar(opcoes);

    if (!window.Delegua) {
      throw new Error('window.Delegua não encontrado. Carregue o UMD da Delégua antes de delegua-script.');
    }

    const elementosDeScript = this.coletarElementosDeScript();
    const resultados: ResultadoExecucaoDeleguaInterface[] = [];

    for (const script of elementosDeScript) {
      const resultado = await this.executarElementoScript(script);
      resultados.push(resultado);
      this.opcoes.aoFinalizarScript?.(resultado);
    }

    this.iniciado = true;
    this.resolucaoPronta();
    return resultados;
  }

  public async executarCodigo(codigo: string, opcoes?: OpcoesDeleguaScriptInterface): Promise<ResultadoExecucaoDeleguaInterface> {
    this.configurar();

    if (!window.Delegua) {
      throw new Error('window.Delegua não encontrado. Carregue o UMD da Delégua antes de delegua-scripts.');
    }

    const idScript = opcoes?.id ?? this.proximoIdScript();
    const hashArquivo = opcoes?.hashArquivo ?? Date.now();
    return this.executarCodigoFonte(codigo, idScript, hashArquivo);
  }

  private coletarElementosDeScript(): HTMLScriptElement[] {
    const tiposDeScript = this.opcoes.tiposDeScript ?? this.tiposScriptsPadrao;
    const seletor = tiposDeScript.map((tipo) => `script[type=\"${tipo}\"]`).join(', ');
    const encontrados = Array.from(document.querySelectorAll<HTMLScriptElement>(seletor));

    if (!this.opcoes.ids || this.opcoes.ids.length === 0) {
      return encontrados;
    }

    const ids = new Set(this.opcoes.ids);
    return encontrados.filter((elemento) => !!elemento.id && ids.has(elemento.id));
  }

  private async executarElementoScript(script: HTMLScriptElement): Promise<ResultadoExecucaoDeleguaInterface> {
    const idScript = script.id || this.proximoIdScript();
    const hashArquivo = Date.now() + this.contadorScripts;

    this.opcoes.aoIniciarScript?.({
      scriptId: idScript,
      origem: script.src || undefined,
    });

    if (script.src) {
      try {
        const resposta = await fetch(script.src);
        if (!resposta.ok) {
          return {
            scriptId: idScript,
            origem: script.src,
            sucesso: false,
            saida: [],
            erros: [
              {
                etapa: 'carregamento',
                mensagem: `Falha ao carregar script remoto (${resposta.status} ${resposta.statusText}).`,
              },
            ],
            tempoMs: 0,
          };
        }

        const codigoRemoto = await resposta.text();
        return this.executarCodigoFonte(codigoRemoto, idScript, hashArquivo, script.src);
      } catch (erro) {
        return {
          scriptId: idScript,
          origem: script.src,
          sucesso: false,
          saida: [],
          erros: [
            {
              etapa: 'carregamento',
              mensagem: 'Erro ao carregar script remoto.',
              detalhe: extrairMensagemErro(erro),
            },
          ],
          tempoMs: 0,
        };
      }
    }

    return this.executarCodigoFonte(script.textContent ?? '', idScript, hashArquivo);
  }

  private async executarCodigoFonte(
    codigo: string,
    scriptId: string,
    hashArquivo: number,
    src?: string
  ): Promise<ResultadoExecucaoDeleguaInterface> {
    const inicio = performance.now();
    const erros: ErroExecucaoDeleguaInterface[] = [];
    const saida: string[] = [];

    const escrever = (texto: string) => {
      const valor = String(texto);
      saida.push(valor);

      if (this.opcoes.saida) {
        this.opcoes.saida(valor, { scriptId });
      } else {
        // Padrão simples para facilitar observabilidade no navegador.
        console.log(valor);
      }
    };

    try {
      const importacoesDeDom = extrairImportacoesDeDom(codigo);
      const delegua = window.Delegua;
      const lexador = new delegua.Lexador();
      const avaliadorSintatico = new delegua.AvaliadorSintatico();
      const interpretador = new delegua.Interpretador(window.location.pathname, false, escrever);

      registrarImportacoesDeDomNoAvaliador(avaliadorSintatico, importacoesDeDom.simbolosImportados);

      this.registrarImportacoesDeDom(interpretador, importacoesDeDom.simbolosImportados);

      const retornoLexador = lexador.mapear(normalizarCodigoParaLinhas(importacoesDeDom.codigoSemImportacoes), hashArquivo);
      if (retornoLexador.erros.length > 0) {
        erros.push({
          etapa: 'lexador',
          mensagem: 'Erros encontrados durante o mapeamento léxico.',
          detalhe: retornoLexador.erros,
        });
      }

      const retornoAvaliador = await avaliadorSintatico.analisar(retornoLexador, hashArquivo);
      if (retornoAvaliador.erros.length > 0) {
        erros.push({
          etapa: 'avaliador',
          mensagem: 'Erros encontrados durante a análise sintática.',
          detalhe: retornoAvaliador.erros,
        });
      }

      if (erros.length === 0) {
        const retornoInterpretador = await interpretador.interpretar(retornoAvaliador.declaracoes);
        if (retornoInterpretador.erros.length > 0) {
          erros.push({
            etapa: 'interpretador',
            mensagem: 'Erros encontrados durante a interpretação.',
            detalhe: retornoInterpretador.erros,
          });
        }
      }
    } catch (erro) {
      erros.push({
        etapa: 'tempo-execucao',
        mensagem: 'Falha inesperada no tempo de execução.',
        detalhe: extrairMensagemErro(erro),
      });
    }

    const tempoMs = performance.now() - inicio;

    return {
      scriptId,
      origem: src,
      sucesso: erros.length === 0,
      saida,
      erros,
      tempoMs,
    };
  }

  private registrarImportacoesDeDom(interpretador: unknown, simbolosImportados: string[]): void {
    if (simbolosImportados.length === 0) {
      return;
    }

    const pilhaEscopos = (interpretador as { pilhaEscoposExecucao?: { definirVariavel: (nome: string, valor: unknown) => void } })
      .pilhaEscoposExecucao;

    if (!pilhaEscopos?.definirVariavel) {
      throw new Error('Não foi possível acessar o escopo global do interpretador para registrar o módulo dom.');
    }

    const simbolosDom = this.criarSimbolosDom(interpretador);

    for (const simboloImportado of simbolosImportados) {
      if (!(simboloImportado in simbolosDom)) {
        throw new Error(`Símbolo '${simboloImportado}' não existe no módulo dom.`);
      }

      pilhaEscopos.definirVariavel(simboloImportado, simbolosDom[simboloImportado]);
    }
  }

  private criarSimbolosDom(interpretador: unknown): Record<string, unknown> {
    const deleguaComEstruturas = window.Delegua as unknown as {
      FuncaoPadrao?: new (valorAridade: number, funcao: (...argumentos: unknown[]) => unknown) => unknown;
    };

    const criarFuncaoPadrao = (valorAridade: number, funcao: (...argumentos: unknown[]) => unknown) => {
      if (deleguaComEstruturas.FuncaoPadrao) {
        return new deleguaComEstruturas.FuncaoPadrao(valorAridade, funcao);
      }

      return funcao;
    };

    const bind = criarFuncaoPadrao(3, async (_visitante: unknown, alvo: unknown, evento: unknown, funcao: unknown) => {
      const elementoDom = this.resolverElementoDom(alvo);
      if (!elementoDom) {
        return null;
      }

      const nomeEvento = String(this.resolverValorDom(evento));
      const callbackDelegua = this.resolverValorDom(funcao);

      elementoDom.addEventListener(nomeEvento, async (eventoDom: Event) => {
        try {
          if (callbackDelegua && typeof (callbackDelegua as { chamar?: unknown }).chamar === 'function') {
            await (callbackDelegua as { chamar: (visitante: unknown, argumentos: unknown[]) => Promise<unknown> }).chamar(
              interpretador,
              [eventoDom]
            );
            return;
          }

          if (typeof callbackDelegua === 'function') {
            await callbackDelegua(eventoDom);
          }
        } catch (erro) {
          console.error('[delegua-script] Erro ao executar callback de bind():', erro);
        }
      });

      return null;
    });

    const alerta = criarFuncaoPadrao(1, (_visitante: unknown, mensagem: unknown) => {
      window.alert(String(this.resolverValorDom(mensagem)));
      return null;
    });

    return {
      bind,
      document: window.document,
      alert: alerta,
    };
  }

  private resolverValorDom(valor: unknown): unknown {
    if (valor && typeof valor === 'object' && 'valor' in (valor as Record<string, unknown>)) {
      return (valor as { valor: unknown }).valor;
    }

    return valor;
  }

  private resolverElementoDom(alvo: unknown): HTMLElement | Document | null {
    const alvoResolvido = this.resolverValorDom(alvo);

    if (typeof alvoResolvido === 'string') {
      return document.getElementById(alvoResolvido) ?? document.querySelector(alvoResolvido);
    }

    if (alvoResolvido === window.document) {
      return window.document;
    }

    if (alvoResolvido instanceof HTMLElement) {
      return alvoResolvido;
    }

    if (
      alvoResolvido &&
      typeof alvoResolvido === 'object' &&
      'addEventListener' in (alvoResolvido as Record<string, unknown>) &&
      typeof (alvoResolvido as { addEventListener?: unknown }).addEventListener === 'function'
    ) {
      return alvoResolvido as HTMLElement;
    }

    return null;
  }

  private proximoIdScript(): string {
    const id = this.contadorScripts === 0 ? '__delegua__main__' : `__delegua__main__${this.contadorScripts}`;
    this.contadorScripts += 1;
    return id;
  }

  public estaIniciado(): boolean {
    return this.iniciado;
  }

  public deveAutoIniciar(): boolean {
    return this.opcoes.autoIniciar !== false;
  }
}

const tempoExecucao = new DeleguaTempoExecucaoNavegador();

window.__DELEGUA__ = tempoExecucao;
window.delegua = (options?: OpcoesTempoExecucaoDeleguaInterface) => tempoExecucao.executar(options);

function tentarAutoExecucao(): void {
  if (!window.Delegua) {
    return;
  }

  if (tempoExecucao.estaIniciado()) {
    return;
  }

  if (!tempoExecucao.deveAutoIniciar()) {
    return;
  }

  void tempoExecucao.executar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tentarAutoExecucao);
} else {
  tentarAutoExecucao();
}

export {
  DeleguaTempoExecucaoNavegador,
  type OpcoesTempoExecucaoDeleguaInterface,
  type ResultadoExecucaoDeleguaInterface,
  type ErroExecucaoDeleguaInterface,
};
