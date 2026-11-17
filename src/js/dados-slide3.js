/**
 * Dados completos inspirados no horário de exemplo do Slide 3 (Ensino Médio).
 * Inclui os 23 professores, 7 turmas, 7 faixas de horário e aulas conjuntas/geminadas.
 * Nota: dados de demonstração não oficiais, conforme AGENTS.md.
 */
(function (root) {
  'use strict';

  function criarDadosSlide3() {
    const disciplinas = [
      { id: 'd_mat_a', nome: 'Matemática A', cargaSemanal: 2 },
      { id: 'd_mat_b', nome: 'Matemática B', cargaSemanal: 2 },
      { id: 'd_por', nome: 'Português', cargaSemanal: 2 },
      { id: 'd_lit', nome: 'Literatura', cargaSemanal: 1 },
      { id: 'd_red', nome: 'Redação', cargaSemanal: 1 },
      { id: 'd_ing', nome: 'Inglês', cargaSemanal: 2 },
      { id: 'd_fis', nome: 'Física', cargaSemanal: 2 },
      { id: 'd_fis_b', nome: 'Física B', cargaSemanal: 2 },
      { id: 'd_qui', nome: 'Química', cargaSemanal: 2 },
      { id: 'd_bio', nome: 'Biologia', cargaSemanal: 2 },
      { id: 'd_his', nome: 'História', cargaSemanal: 2 },
      { id: 'd_geo', nome: 'Geografia', cargaSemanal: 2 },
      { id: 'd_fil', nome: 'Filosofia', cargaSemanal: 1 },
      { id: 'd_soc', nome: 'Sociologia', cargaSemanal: 2 },
      { id: 'd_art', nome: 'Arte', cargaSemanal: 2 },
      { id: 'd_edf', nome: 'Educação Física', cargaSemanal: 2 },
      { id: 'd_psi', nome: 'Psicologia', cargaSemanal: 2 },
      { id: 'd_edfin', nome: 'Ed. Financeira', cargaSemanal: 2 },
      { id: 'd_cont', nome: 'Contabilidade', cargaSemanal: 2 },
      { id: 'd_lp', nome: 'LP I / II / III', cargaSemanal: 3 },
      { id: 'd_to', nome: 'TO / TP / TPI', cargaSemanal: 3 },
      { id: 'd_did', nome: 'Didática / Fund. Soc.', cargaSemanal: 3 },
      { id: 'd_edinc', nome: 'Ed. Inclusiva', cargaSemanal: 2 }
    ];

    const professores = [
      { id: 'p_adriano', nome: 'Adriano', disciplinaIds: ['d_edf'], indisponibilidades: [] },
      { id: 'p_alexandre', nome: 'Alexandre', disciplinaIds: ['d_to'], indisponibilidades: [] },
      { id: 'p_ariane', nome: 'Ariane', disciplinaIds: ['d_did'], indisponibilidades: [] },
      { id: 'p_carolina', nome: 'Carolina', disciplinaIds: ['d_ing'], indisponibilidades: [] },
      { id: 'p_daisa', nome: 'Daísa', disciplinaIds: ['d_red'], indisponibilidades: [] },
      { id: 'p_diego', nome: 'Diego', disciplinaIds: ['d_mat_a'], indisponibilidades: [] },
      { id: 'p_elza', nome: 'Elza', disciplinaIds: ['d_lp'], indisponibilidades: [] },
      { id: 'p_fabiana', nome: 'Fabiana', disciplinaIds: ['d_por', 'd_lit'], indisponibilidades: [] },
      { id: 'p_fabricia', nome: 'Fabrícia', disciplinaIds: ['d_edinc'], indisponibilidades: [] },
      { id: 'p_frederico', nome: 'Frederico', disciplinaIds: ['d_his'], indisponibilidades: [] },
      { id: 'p_isabel', nome: 'Isabel', disciplinaIds: ['d_mat_a', 'd_psi'], indisponibilidades: [] },
      { id: 'p_laio', nome: 'Laio', disciplinaIds: ['d_mat_b'], indisponibilidades: [] },
      { id: 'p_lucas', nome: 'Lucas', disciplinaIds: ['d_qui'], indisponibilidades: [] },
      { id: 'p_marcelo', nome: 'Marcelo', disciplinaIds: ['d_geo'], indisponibilidades: [] },
      { id: 'p_marcio', nome: 'Márcio', disciplinaIds: ['d_fil', 'd_soc'], indisponibilidades: [] },
      { id: 'p_marcal', nome: 'Marçal', disciplinaIds: ['d_edfin', 'd_cont'], indisponibilidades: [] },
      { id: 'p_mariane', nome: 'Mariane', disciplinaIds: ['d_bio'], indisponibilidades: [] },
      { id: 'p_mauricio', nome: 'Maurício', disciplinaIds: ['d_art'], indisponibilidades: [] },
      { id: 'p_paulofelipe', nome: 'Paulo Felipe', disciplinaIds: ['d_his'], indisponibilidades: [] },
      { id: 'p_pedro', nome: 'Pedro', disciplinaIds: ['d_fis'], indisponibilidades: [] },
      { id: 'p_rodrigo', nome: 'Rodrigo', disciplinaIds: ['d_lp'], indisponibilidades: [] },
      { id: 'p_thiago', nome: 'Thiago', disciplinaIds: ['d_fis_b'], indisponibilidades: [] },
      { id: 'p_valeria', nome: 'Valéria', disciplinaIds: ['d_lit', 'd_red'], indisponibilidades: [] }
    ];

    const turmas = [
      { id: 't_1bas', nome: '1º BÁSICO', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_2afp', nome: '2º A - FP', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_2ati', nome: '2º A - TI', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_2bfp', nome: '2º B - FP', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_2bti', nome: '2º B - TI', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_3fp', nome: '3º - FP', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_3ti', nome: '3º - TI', nivel: 'Médio', turno: 'Manhã' }
    ];

    const horarios = [
      { id: 'h_1', rotulo: '1ª aula', inicio: '07:30', fim: '08:20' },
      { id: 'h_2', rotulo: '2ª aula', inicio: '08:20', fim: '09:10' },
      { id: 'h_3', rotulo: '3ª aula', inicio: '09:10', fim: '10:00' },
      { id: 'h_4', rotulo: '4ª aula', inicio: '10:20', fim: '11:10' },
      { id: 'h_5', rotulo: '5ª aula', inicio: '11:10', fim: '12:00' },
      { id: 'h_6', rotulo: '6ª aula', inicio: '12:00', fim: '12:40' },
      { id: 'h_7', rotulo: '7ª aula', inicio: '12:40', fim: '13:30' }
    ];

    // Grade inicia vazia para alocação manual ou assistida pela coordenação
    const alocacoes = [];

    return {
      disciplinas,
      professores,
      turmas,
      horarios,
      alocacoes,
      historico: [
        {
          data: new Date().toISOString(),
          acao: 'carregamento',
          detalhe: 'Base inicial carregada (23 professores, 7 turmas, 7 horários; grade vazia).'
        }
      ],
      gradeAprovada: false
    };
  }

  const api = { criarDadosSlide3 };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.DadosSlide3 = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
