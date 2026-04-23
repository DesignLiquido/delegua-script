import { DeleguaTempoExecucaoNavegador } from '../fontes/delegua-script';

describe('DeleguaTempoExecucaoNavegador', () => {
  it('inicia com auto início habilitado por padrão', () => {
    const tempoExecucao = new DeleguaTempoExecucaoNavegador();

    expect(tempoExecucao.deveAutoIniciar()).toBe(true);
  });

  it('respeita opção de desabilitar auto início', () => {
    const tempoExecucao = new DeleguaTempoExecucaoNavegador();

    tempoExecucao.configurar({ autoIniciar: false });

    expect(tempoExecucao.deveAutoIniciar()).toBe(false);
  });

  it('lança erro ao executar sem UMD da Delégua carregado', async () => {
    const tempoExecucao = new DeleguaTempoExecucaoNavegador();

    // Garante cenário de ausência de runtime UMD para a validação.
    // @ts-expect-error ajuste explícito para cenário de teste.
    window.Delegua = undefined;

    await expect(tempoExecucao.executarCodigo('escreva(1)')).rejects.toThrow(
      'window.Delegua não encontrado. Carregue o UMD da Delégua antes de delegua-scripts.'
    );
  });
});
