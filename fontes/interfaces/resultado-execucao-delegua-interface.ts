import { ErroExecucaoDeleguaInterface } from "./erro-execucao-delegua-interface";

export interface ResultadoExecucaoDeleguaInterface {
  scriptId: string;
  origem?: string;
  sucesso: boolean;
  saida: string[];
  erros: ErroExecucaoDeleguaInterface[];
  tempoMs: number;
}
