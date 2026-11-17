/**
 * Exportação de quadro de horários em CSV (padrão brasileiro com ponto e vírgula).
 * Corrige a falha do sistema de referência: respeita exatamente a visão/filtro escolhido.
 */
(function (root) {
  'use strict';

  function buscar(lista, id) {
    return (lista || []).find((item) => item.id === id) || null;
  }

  function escaparCelulaCsv(valor) {
    const texto = String(valor ?? '').replace(/"/g, '""');
    return /[;"\n\r]/.test(texto) ? `"${texto}"` : texto;
  }

  /**
   * Filtra as alocações conforme a visão ('completa', 'turma', 'professor' ou 'dia').
   */
  function filtrarAlocacoes(alocacoes, { visao = 'completa', filtroId = '' } = {}) {
    if (visao === 'completa' || !filtroId) return alocacoes;
    if (visao === 'turma') {
      return alocacoes.filter((a) => (a.turmaIds || []).includes(filtroId));
    }
    if (visao === 'professor') {
      return alocacoes.filter((a) => a.professorId === filtroId);
    }
    if (visao === 'dia') {
      return alocacoes.filter((a) => a.dia === filtroId);
    }
    return alocacoes;
  }

  /**
   * Gera o conteúdo CSV com BOM UTF-8 para abertura correta no Excel/LibreOffice.
   */
  function gerarCsvQuadro(estado, opcoes = {}) {
    const alocacoes = filtrarAlocacoes(estado.alocacoes || [], opcoes);
    const linhas = ['Turma;Disciplina;Professor;Dia;Horario;Inicio;Fim'];

    for (const a of alocacoes) {
      const turmas = (a.turmaIds || [])
        .map((id) => buscar(estado.turmas, id)?.nome || id)
        .join(' + ');
      const disc = buscar(estado.disciplinas, a.disciplinaId)?.nome || '';
      const prof = buscar(estado.professores, a.professorId)?.nome || '';
      const hor = buscar(estado.horarios, a.horarioId);

      linhas.push(
        [
          turmas,
          disc,
          prof,
          a.dia,
          hor?.rotulo || '',
          hor?.inicio || '',
          hor?.fim || ''
        ]
          .map(escaparCelulaCsv)
          .join(';')
      );
    }

    return '\uFEFF' + linhas.join('\r\n');
  }

  const api = {
    filtrarAlocacoes,
    gerarCsvQuadro
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.CsvApp = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
