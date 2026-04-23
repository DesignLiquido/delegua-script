import { ResultadoExecucaoDeleguaInterface } from "./resultado-execucao-delegua-interface";
import { ScriptType } from "../tipos";

export interface OpcoesTempoExecucaoDeleguaInterface {
  debug?: number;
  ids?: string[];
  tiposDeScript?: ScriptType[];
  autoIniciar?: boolean;
  saida?: (texto: string, info: { scriptId: string }) => void;
  aoIniciarScript?: (info: { scriptId: string; origem?: string }) => void;
  aoFinalizarScript?: (resultado: ResultadoExecucaoDeleguaInterface) => void;
}
