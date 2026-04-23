import { DeleguaApi, ErroExecucaoDeleguaInterface, ResultadoExecucaoDeleguaInterface, OpcoesTempoExecucaoDeleguaInterface, OpcoesDeleguaScriptInterface } from "./interfaces";
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
      const delegua = window.Delegua;
      const lexador = new delegua.Lexador();
      const avaliadorSintatico = new delegua.AvaliadorSintatico();
      const interpretador = new delegua.Interpretador(window.location.pathname, false, escrever);

      const retornoLexador = lexador.mapear(normalizarCodigoParaLinhas(codigo), hashArquivo);
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
