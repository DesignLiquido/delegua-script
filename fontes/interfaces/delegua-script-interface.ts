import { ResultadoAvaliadorSintaticoDeleguaInterface } from "./resultado-avaliador-sintatico-delegua-interface";
import { ResultadoInterpretadorDeleguaInterface } from "./resultado-interpretador-delegua-interface";
import { ResultadoLexadorDeleguaInterface } from "./resultado-lexador-delegua-interface";

export interface DeleguaApi {
  Lexador: new () => {
    mapear(codigo: string[], hashArquivo: number): ResultadoLexadorDeleguaInterface;
  };
  AvaliadorSintatico: new () => {
    analisar(retornoLexador: ResultadoLexadorDeleguaInterface, hashArquivo: number): Promise<ResultadoAvaliadorSintaticoDeleguaInterface>;
  };
  Interpretador: new (
    diretorioBase: string,
    performance?: boolean,
    funcaoDeRetorno?: (texto: string) => void
  ) => {
    interpretar(declaracoes: unknown[], manterAmbiente?: boolean): Promise<ResultadoInterpretadorDeleguaInterface>;
  };
}
