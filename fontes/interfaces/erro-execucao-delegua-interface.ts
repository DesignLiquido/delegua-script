export interface ErroExecucaoDeleguaInterface {
  etapa: 'lexador' | 'avaliador' | 'interpretador' | 'carregamento' | 'tempo-execucao';
  mensagem: string;
  detalhe?: unknown;
}
