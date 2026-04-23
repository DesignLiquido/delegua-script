import { extrairMensagemErro, normalizarCodigoParaLinhas } from '../fontes/delegua-script';

describe('Utilitários do runtime Delégua', () => {
  it('normaliza quebras de linha em formato de vetor', () => {
    const codigo = 'linha1\r\nlinha2\rlinha3\nlinha4';

    expect(normalizarCodigoParaLinhas(codigo)).toEqual(['linha1', 'linha2', 'linha3', 'linha4']);
  });

  it('extrai mensagem de Error', () => {
    expect(extrairMensagemErro(new Error('falhou'))).toBe('falhou');
  });

  it('retorna texto recebido diretamente', () => {
    expect(extrairMensagemErro('erro direto')).toBe('erro direto');
  });

  it('serializa objetos desconhecidos como JSON', () => {
    expect(extrairMensagemErro({ codigo: 500, detalhe: 'quebra' })).toBe('{"codigo":500,"detalhe":"quebra"}');
  });
});
