import { ErroInterpretadorInterface, ResultadoParcialInterpretadorInterface } from "@designliquido/delegua/interfaces";

export interface ResultadoInterpretadorDeleguaInterface {
  erros: ErroInterpretadorInterface[];
  resultado: ResultadoParcialInterpretadorInterface[];
}