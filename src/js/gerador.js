/**
 * Gerador automático de horários (Nível Inteligente — inspirado no SmartGrade IA).
 * Roda 100% no navegador com sementes determinísticas, gera 3 alternativas,
 * calcula pontuação (100 - penalidades) e registra o motivo de cada alocação.
 */
(function (root) {
  'use strict';

  const Validacao =
    typeof require !== 'undefined' ? require('./validacao.js') : root.Validacao;

  const { DIAS_SEMANA, validarAlocacao } = Validacao;

  /**
   * Gerador pseudoaleatório determinístico (Mulberry32) para repetir resultados por semente.
   */
  function criarRng(semente) {
    let a = semente >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function embaralhar(lista, rng) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  /**
   * Calcula quantas aulas ainda faltam para completar a carga semanal
   * dos pares (Turma, Disciplina) já iniciados ou de toda a matriz selecionada.
   */
  function levantarPendencias(estado, { turmaId = null, incluirTodas = false } = {}) {
    const turmas = turmaId
      ? (estado.turmas || []).filter((t) => t.id === turmaId)
      : estado.turmas || [];
    const disciplinas = estado.disciplinas || [];
    const alocacoes = estado.alocacoes || [];

    const tarefas = [];
    for (const turma of turmas) {
      for (const disc of disciplinas) {
        const previstas = Number(disc.cargaSemanal) || 0;
        if (previstas <= 0) continue;

        const existentes = alocacoes.filter(
          (a) => a.disciplinaId === disc.id && (a.turmaIds || []).includes(turma.id)
        );

        // Se incluirTodas=false, completa apenas disciplinas que já têm ao menos 1 aula na turma
        if (!incluirTodas && existentes.length === 0) continue;

        const faltantes = previstas - existentes.length;
        for (let i = 0; i < faltantes; i++) {
          tarefas.push({
            turmaId: turma.id,
            turmaNome: turma.nome,
            disciplinaId: disc.id,
            disciplinaNome: disc.nome,
            professorPreferidoId: existentes[0]?.professorId || null
          });
        }
      }
    }
    return tarefas;
  }

  /**
   * Avalia a penalidade suave (menor é melhor) de colocar uma aula em (dia, horarioId).
   */
  function avaliarSlot(estadoSimulado, horariosOrdenados, tarefa, dia, horarioId, profId) {
    let penalidade = 0;
    const motivos = [];

    const idxHor = horariosOrdenados.findIndex((h) => h.id === horarioId);
    const aulasTurmaNoDia = estadoSimulado.alocacoes.filter(
      (a) => a.dia === dia && (a.turmaIds || []).includes(tarefa.turmaId)
    );

    // Verifica se fica adjacente a outra aula da turma no mesmo dia (evita janela)
    const indicesTurma = aulasTurmaNoDia
      .map((a) => horariosOrdenados.findIndex((h) => h.id === a.horarioId))
      .filter((i) => i >= 0);

    if (indicesTurma.length > 0) {
      const adjacente = indicesTurma.some((i) => Math.abs(i - idxHor) === 1);
      if (!adjacente) {
        penalidade += 4;
        motivos.push('gera janela no horário da turma');
      } else {
        motivos.push('encaixada sem janela para a turma');
      }
    } else {
      motivos.push('primeiro horário da turma no dia');
    }

    // Equilíbrio: evita concentrar muitas aulas do mesmo professor no mesmo dia
    const aulasProfNoDia = estadoSimulado.alocacoes.filter(
      (a) => a.dia === dia && a.professorId === profId
    ).length;
    if (aulasProfNoDia >= 4) {
      penalidade += 2;
      motivos.push('professor com carga alta no dia');
    }

    if (tarefa.professorPreferidoId && profId === tarefa.professorPreferidoId) {
      motivos.push('mantém o mesmo professor da disciplina');
    }

    return { penalidade, motivo: motivos.join('; ') };
  }

  /**
   * Executa uma tentativa de geração para uma semente específica.
   */
  function gerarComSemente(estado, semente, opcoes = {}) {
    const rng = criarRng(semente);
    const horariosOrdenados = [...(estado.horarios || [])].sort((a, b) =>
      a.inicio.localeCompare(b.inicio)
    );

    const tarefas = embaralhar(levantarPendencias(estado, opcoes), rng);
    const estadoSimulado = {
      ...estado,
      alocacoes: [...(estado.alocacoes || [])]
    };

    const novasAlocacoes = [];
    const naoAlocadas = [];
    let penalidadeTotal = 0;

    for (const tarefa of tarefas) {
      const professoresHabilitados = (estado.professores || []).filter(
        (p) =>
          !Array.isArray(p.disciplinaIds) ||
          p.disciplinaIds.length === 0 ||
          p.disciplinaIds.includes(tarefa.disciplinaId)
      );

      // Prioriza o professor já usado na turma, se houver
      const candidatosProf = [...professoresHabilitados].sort((a, b) => {
        if (a.id === tarefa.professorPreferidoId) return -1;
        if (b.id === tarefa.professorPreferidoId) return 1;
        return 0;
      });

      let melhorEscolha = null;
      const diasEmbaralhados = embaralhar(DIAS_SEMANA, rng);

      for (const prof of candidatosProf) {
        for (const dia of diasEmbaralhados) {
          for (const hor of horariosOrdenados) {
            const tentativa = {
              id: `gen_${semente}_${novasAlocacoes.length + 1}`,
              turmaIds: [tarefa.turmaId],
              disciplinaId: tarefa.disciplinaId,
              professorId: prof.id,
              dia,
              horarioId: hor.id
            };

            const res = validarAlocacao(tentativa, estadoSimulado);
            if (!res.valido) continue;

            const aval = avaliarSlot(estadoSimulado, horariosOrdenados, tarefa, dia, hor.id, prof.id);
            const desempate = rng() * 0.5;
            const custo = aval.penalidade + desempate;

            if (!melhorEscolha || custo < melhorEscolha.custo) {
              melhorEscolha = {
                alocacao: { ...tentativa, motivo: aval.motivo },
                penalidade: aval.penalidade,
                custo
              };
            }
          }
        }
      }

      if (melhorEscolha) {
        estadoSimulado.alocacoes.push(melhorEscolha.alocacao);
        novasAlocacoes.push(melhorEscolha.alocacao);
        penalidadeTotal += melhorEscolha.penalidade;
      } else {
        naoAlocadas.push(tarefa);
        penalidadeTotal += 10;
      }
    }

    const pontuacao = Math.max(0, 100 - penalidadeTotal);
    return {
      semente,
      pontuacao,
      novasAlocacoes,
      naoAlocadas,
      totalAdicionadas: novasAlocacoes.length
    };
  }

  /**
   * Gera 3 alternativas ordenadas pela maior pontuação.
   */
  function gerarAlternativas(estado, opcoes = {}) {
    const sementes = opcoes.sementes || [1, 5, 9];
    const resultados = sementes.map((s) => gerarComSemente(estado, s, opcoes));
    return resultados.sort((a, b) => b.pontuacao - a.pontuacao);
  }

  const api = {
    levantarPendencias,
    gerarAlternativas
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GeradorApp = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
