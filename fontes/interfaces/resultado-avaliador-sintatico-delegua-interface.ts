import { ErroAvaliadorSintatico } from "@designliquido/delegua/avaliador-sintatico/erro-avaliador-sintatico";
import { Declaracao } from "@designliquido/delegua/declaracoes";

export interface ResultadoAvaliadorSintaticoDeleguaInterface {
  declaracoes: Declaracao[];
  erros: ErroAvaliadorSintatico[];
}
