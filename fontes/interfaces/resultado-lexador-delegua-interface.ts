import { SimboloInterface } from "@designliquido/delegua/interfaces";
import { ErroLexador } from "@designliquido/delegua/lexador/erro-lexador";

export interface ResultadoLexadorDeleguaInterface {
  simbolos: SimboloInterface[];
  erros: ErroLexador[];
}
