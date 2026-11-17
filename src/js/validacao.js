/**
 * Motor de validação do Sistema de Horários Escolares.
 * Compatível com navegador (window.Validacao) e Node.js (module.exports).
 */
(function (root) {
  'use strict';

  const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

  /**
   * Busca um item por id em uma lista; retorna null se não encontrar.
   */
  function buscarPorId(lista, id) {
    return (lista || []).find((item) => item.id === id) || null;
  }

  /**
   * Formata o rótulo legível de um horário (ex.: "1ª aula (07:30–08:20)").
   */
  function formatarHorario(horario) {
    if (!horario) return 'horário desconhecido';
    return horario.rotulo
      ? `${horario.rotulo} (${horario.inicio}–${horario.fim})`
      : `${horario.inicio}–${horario.fim}`;
  }

  /**
   * Verifica se um professor está indisponível em um dia e horário específicos.
   */
  function professorEstaIndisponivel(professor, dia, horarioId) {
    return (professor?.indisponibilidades || []).some(
      (item) => item.dia === dia && item.horarioId === horarioId
    );
  }

  /**
   * Valida uma única alocação antes de salvar.
   * Retorna { valido: boolean, erros: Array<{tipo, mensagem}>, avisos: Array<{tipo, mensagem}> }.
   */
  function validarAlocacao(novaAlocacao, estado, ignorarId = null) {
    const erros = [];
    const avisos = [];

    const turmas = estado.turmas || [];
    const professores = estado.professores || [];
    const disciplinas = estado.disciplinas || [];
    const horarios = estado.horarios || [];
    const alocacoes = estado.alocacoes || [];

    const turmaIds = Array.isArray(novaAlocacao.turmaIds) ? novaAlocacao.turmaIds : [];

    // 1. Campos obrigatórios
    if (!novaAlocacao.disciplinaId || !novaAlocacao.professorId || !novaAlocacao.dia || !novaAlocacao.horarioId || turmaIds.length === 0) {
      erros.push({
        tipo: 'campos_obrigatorios',
        mensagem: 'Preencha disciplina, professor, dia, horário e pelo menos uma turma.'
      });
      return { valido: false, erros, avisos };
    }

    const professor = buscarPorId(professores, novaAlocacao.professorId);
    const disciplina = buscarPorId(disciplinas, novaAlocacao.disciplinaId);
    const horario = buscarPorId(horarios, novaAlocacao.horarioId);
    const textoHorario = `${novaAlocacao.dia}, ${formatarHorario(horario)}`;

    if (!professor || !disciplina || !horario) {
      erros.push({
        tipo: 'referencia_invalida',
        mensagem: 'Professor, disciplina ou horário selecionado não existe no cadastro.'
      });
      return { valido: false, erros, avisos };
    }

    // 2. Habilitação do professor na disciplina
    if (Array.isArray(professor.disciplinaIds) && professor.disciplinaIds.length > 0) {
      if (!professor.disciplinaIds.includes(disciplina.id)) {
        erros.push({
          tipo: 'professor_nao_habilitado',
          mensagem: `${professor.nome} não está habilitado(a) para lecionar ${disciplina.nome}.`
        });
      }
    }

    // 3. Indisponibilidade do professor no dia e horário
    if (professorEstaIndisponivel(professor, novaAlocacao.dia, novaAlocacao.horarioId)) {
      erros.push({
        tipo: 'professor_indisponivel',
        mensagem: `${professor.nome} está marcado(a) como indisponível em ${textoHorario}.`
      });
    }

    // 4. Conflitos no mesmo dia e horário com outras alocações
    // Nota: múltiplas turmas na MESMA alocação formam uma aula conjunta (permitido).
    for (const existente of alocacoes) {
      if (ignorarId && existente.id === ignorarId) continue;
      if (existente.dia !== novaAlocacao.dia || existente.horarioId !== novaAlocacao.horarioId) continue;

      // Conflito de professor
      if (existente.professorId === professor.id) {
        const turmasExistentes = (existente.turmaIds || [])
          .map((id) => buscarPorId(turmas, id)?.nome || id)
          .join(', ');
        const discExistente = buscarPorId(disciplinas, existente.disciplinaId)?.nome || 'outra disciplina';

        erros.push({
          tipo: 'conflito_professor',
          mensagem: `Conflito de professor: ${professor.nome} já está alocado(a) em ${textoHorario} (${discExistente} — ${turmasExistentes}).`
        });
      }

      // Conflito de turma (qualquer turma em comum)
      const turmasEmComum = turmaIds.filter((tid) => (existente.turmaIds || []).includes(tid));
      for (const tid of turmasEmComum) {
        const nomeTurma = buscarPorId(turmas, tid)?.nome || tid;
        const discExistente = buscarPorId(disciplinas, existente.disciplinaId)?.nome || 'outra disciplina';
        const profExistente = buscarPorId(professores, existente.professorId)?.nome || 'outro professor';

        erros.push({
          tipo: 'conflito_turma',
          mensagem: `Conflito de turma: ${nomeTurma} já tem aula em ${textoHorario} (${discExistente} com ${profExistente}).`
        });
      }
    }

    // 5. Alerta de excesso de carga horária semanal por turma
    const cargaPrevista = Number(disciplina.cargaSemanal) || 0;
    if (cargaPrevista > 0) {
      for (const tid of turmaIds) {
        const alocadasTurma = alocacoes.filter(
          (a) => a.id !== ignorarId && a.disciplinaId === disciplina.id && (a.turmaIds || []).includes(tid)
        ).length;

        if (alocadasTurma + 1 > cargaPrevista) {
          const nomeTurma = buscarPorId(turmas, tid)?.nome || tid;
          erros.push({
            tipo: 'excesso_carga_horaria',
            mensagem: `Carga horária excedida: ${disciplina.nome} na turma ${nomeTurma} ficaria com ${alocadasTurma + 1} aulas (previsto: ${cargaPrevista}/semana).`
          });
        }
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }

  /**
   * Verifica a carga horária nos dois sentidos (faltando e sobrando)
   * para todos os pares (Turma, Disciplina) presentes na grade.
   */
  function validarCargaHoraria(estado) {
    const turmas = estado.turmas || [];
    const disciplinas = estado.disciplinas || [];
    const alocacoes = estado.alocacoes || [];

    const contagem = new Map();
    for (const aloc of alocacoes) {
      for (const tid of aloc.turmaIds || []) {
        const chave = `${tid}::${aloc.disciplinaId}`;
        contagem.set(chave, (contagem.get(chave) || 0) + 1);
      }
    }

    const pendencias = [];
    for (const [chave, qtd] of contagem.entries()) {
      const [tid, did] = chave.split('::');
      const turma = buscarPorId(turmas, tid);
      const disciplina = buscarPorId(disciplinas, did);
      if (!turma || !disciplina) continue;

      const prevista = Number(disciplina.cargaSemanal) || 0;
      if (prevista <= 0) continue;

      if (qtd < prevista) {
        pendencias.push({
          status: 'faltando',
          turmaId: tid,
          disciplinaId: did,
          alocadas: qtd,
          prevista,
          mensagem: `${turma.nome} — ${disciplina.nome}: ${qtd}/${prevista} aulas alocadas (faltam ${prevista - qtd}).`
        });
      } else if (qtd > prevista) {
        pendencias.push({
          status: 'excesso',
          turmaId: tid,
          disciplinaId: did,
          alocadas: qtd,
          prevista,
          mensagem: `${turma.nome} — ${disciplina.nome}: ${qtd}/${prevista} aulas alocadas (${qtd - prevista} em excesso).`
        });
      }
    }

    return pendencias;
  }

  /**
   * Valida toda a grade atual, consolidando conflitos de alocações e carga horária.
   */
  function validarGradeCompleta(estado) {
    const conflitos = [];
    for (const aloc of estado.alocacoes || []) {
      const res = validarAlocacao(aloc, estado, aloc.id);
      for (const erro of res.erros) {
        if (erro.tipo !== 'excesso_carga_horaria') {
          conflitos.push({ alocacaoId: aloc.id, ...erro });
        }
      }
    }

    const cargaHoraria = validarCargaHoraria(estado);
    return {
      conflitos,
      cargaHoraria,
      gradeValida: conflitos.length === 0 && cargaHoraria.length === 0
    };
  }

  /**
   * Sugere professores livres e disponíveis para substituir uma aula em um dia/horário.
   * Separa quem já é habilitado na disciplina dos demais professores livres.
   */
  function sugerirSubstitutos(estado, { dia, horarioId, disciplinaId = null, ignorarProfessorId = null }) {
    const professores = estado.professores || [];
    const alocacoes = estado.alocacoes || [];

    if (!dia || !horarioId) {
      return { habilitadosLivres: [], outrosLivres: [] };
    }

    const ocupados = new Set(
      alocacoes
        .filter((a) => a.dia === dia && a.horarioId === horarioId)
        .map((a) => a.professorId)
    );

    const habilitadosLivres = [];
    const outrosLivres = [];

    for (const prof of professores) {
      if (ignorarProfessorId && prof.id === ignorarProfessorId) continue;
      if (ocupados.has(prof.id)) continue;
      if (professorEstaIndisponivel(prof, dia, horarioId)) continue;

      const habilitado =
        !disciplinaId ||
        !Array.isArray(prof.disciplinaIds) ||
        prof.disciplinaIds.length === 0 ||
        prof.disciplinaIds.includes(disciplinaId);

      if (habilitado) {
        habilitadosLivres.push(prof);
      } else {
        outrosLivres.push(prof);
      }
    }

    return { habilitadosLivres, outrosLivres };
  }

  const api = {
    DIAS_SEMANA,
    validarAlocacao,
    validarCargaHoraria,
    validarGradeCompleta,
    sugerirSubstitutos
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Validacao = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
