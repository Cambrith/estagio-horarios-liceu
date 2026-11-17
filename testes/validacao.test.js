const test = require('node:test');
const assert = require('node:assert/strict');
const { validarAlocacao, validarCargaHoraria, validarGradeCompleta, sugerirSubstitutos } = require('../src/js/validacao.js');
const { gerarCsvQuadro } = require('../src/js/csv.js');
const { criarDadosSlide3 } = require('../src/js/dados-slide3.js');
const { gerarAlternativas } = require('../src/js/gerador.js');

function criarEstadoBase() {
  return {
    disciplinas: [
      { id: 'd_mat', nome: 'Matemática', cargaSemanal: 2 },
      { id: 'd_edf', nome: 'Educação Física', cargaSemanal: 2 },
      { id: 'd_his', nome: 'História', cargaSemanal: 2 }
    ],
    professores: [
      { id: 'p_ana', nome: 'Ana Silva', disciplinaIds: ['d_mat'], indisponibilidades: [{ dia: 'Sexta', horarioId: 'h_1' }] },
      { id: 'p_lucas', nome: 'Lucas Lima', disciplinaIds: ['d_edf'], indisponibilidades: [] },
      { id: 'p_carlos', nome: 'Carlos Souza', disciplinaIds: ['d_his'], indisponibilidades: [] }
    ],
    turmas: [
      { id: 't_1a', nome: '1º Ano A', nivel: 'Médio', turno: 'Manhã' },
      { id: 't_1b', nome: '1º Ano B', nivel: 'Médio', turno: 'Manhã' }
    ],
    horarios: [
      { id: 'h_1', rotulo: '1ª aula', inicio: '07:30', fim: '08:20' },
      { id: 'h_2', rotulo: '2ª aula', inicio: '08:20', fim: '09:10' }
    ],
    alocacoes: [
      { id: 'a_1', turmaIds: ['t_1a'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Segunda', horarioId: 'h_1' }
    ]
  };
}

test('1. Alocação válida simples deve ser aceita', () => {
  const estado = criarEstadoBase();
  const nova = { turmaIds: ['t_1a'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Segunda', horarioId: 'h_2' };
  const res = validarAlocacao(nova, estado);
  assert.equal(res.valido, true);
  assert.equal(res.erros.length, 0);
});

test('2. Conflito de professor no mesmo dia e horário deve bloquear com mensagem clara', () => {
  const estado = criarEstadoBase();
  const nova = { turmaIds: ['t_1b'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Segunda', horarioId: 'h_1' };
  const res = validarAlocacao(nova, estado);
  assert.equal(res.valido, false);
  assert.ok(res.erros.some((e) => e.tipo === 'conflito_professor'));
  assert.match(res.erros[0].mensagem, /Ana Silva.*Segunda.*1ª aula/);
});

test('3. Aula conjunta (mesmo professor com 2 turmas na mesma alocação) deve ser permitida', () => {
  const estado = criarEstadoBase();
  const conjunta = { turmaIds: ['t_1a', 't_1b'], disciplinaId: 'd_edf', professorId: 'p_lucas', dia: 'Terça', horarioId: 'h_1' };
  const res = validarAlocacao(conjunta, estado);
  assert.equal(res.valido, true);
  assert.equal(res.erros.length, 0);
});

test('4. Conflito de turma no mesmo dia e horário deve bloquear', () => {
  const estado = criarEstadoBase();
  const nova = { turmaIds: ['t_1a'], disciplinaId: 'd_his', professorId: 'p_carlos', dia: 'Segunda', horarioId: 'h_1' };
  const res = validarAlocacao(nova, estado);
  assert.equal(res.valido, false);
  assert.ok(res.erros.some((e) => e.tipo === 'conflito_turma'));
  assert.match(res.erros[0].mensagem, /1º Ano A.*Segunda.*1ª aula/);
});

test('5. Professor não habilitado para a disciplina deve bloquear', () => {
  const estado = criarEstadoBase();
  const nova = { turmaIds: ['t_1b'], disciplinaId: 'd_his', professorId: 'p_ana', dia: 'Terça', horarioId: 'h_2' };
  const res = validarAlocacao(nova, estado);
  assert.equal(res.valido, false);
  assert.ok(res.erros.some((e) => e.tipo === 'professor_nao_habilitado'));
});

test('6. Professor indisponível no dia e horário deve bloquear', () => {
  const estado = criarEstadoBase();
  const nova = { turmaIds: ['t_1b'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Sexta', horarioId: 'h_1' };
  const res = validarAlocacao(nova, estado);
  assert.equal(res.valido, false);
  assert.ok(res.erros.some((e) => e.tipo === 'professor_indisponivel'));
});

test('7. Carga horária faltando (1 de 2 aulas) deve ser apontada em validarCargaHoraria', () => {
  const estado = criarEstadoBase();
  const pendencias = validarCargaHoraria(estado);
  assert.equal(pendencias.length, 1);
  assert.equal(pendencias[0].status, 'faltando');
  assert.match(pendencias[0].mensagem, /1\/2.*faltam 1/);
});

test('8. Carga horária excedente (3 de 2 aulas) deve bloquear na alocação e aparecer na carga horária', () => {
  const estado = criarEstadoBase();
  estado.alocacoes.push({
    id: 'a_2', turmaIds: ['t_1a'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Segunda', horarioId: 'h_2'
  });
  const terceira = { turmaIds: ['t_1a'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Terça', horarioId: 'h_1' };
  const res = validarAlocacao(terceira, estado);
  assert.equal(res.valido, false);
  assert.ok(res.erros.some((e) => e.tipo === 'excesso_carga_horaria'));
});

test('9. Edição de alocação existente não deve conflitar consigo mesma', () => {
  const estado = criarEstadoBase();
  const editada = { id: 'a_1', turmaIds: ['t_1a'], disciplinaId: 'd_mat', professorId: 'p_ana', dia: 'Segunda', horarioId: 'h_1' };
  const res = validarAlocacao(editada, estado, 'a_1');
  assert.equal(res.valido, true);
  const completa = validarGradeCompleta(estado);
  assert.equal(completa.conflitos.length, 0);
});

test('10. Sugestão de substituto separa livres habilitados de outros livres e ignora ocupados/indisponíveis', () => {
  const estado = criarEstadoBase();
  // Na Segunda h_1: Ana está alocada; Lucas (Ed. Física) e Carlos (História) estão livres.
  const subMat = sugerirSubstitutos(estado, { dia: 'Segunda', horarioId: 'h_1', disciplinaId: 'd_mat' });
  assert.equal(subMat.habilitadosLivres.length, 0);
  assert.equal(subMat.outrosLivres.length, 2);

  // Na Sexta h_1: Ana está indisponível; Lucas e Carlos estão livres.
  const subHis = sugerirSubstitutos(estado, { dia: 'Sexta', horarioId: 'h_1', disciplinaId: 'd_his' });
  assert.deepEqual(subHis.habilitadosLivres.map((p) => p.id), ['p_carlos']);
  assert.deepEqual(subHis.outrosLivres.map((p) => p.id), ['p_lucas']);
});

test('11. Exportação CSV deve respeitar exatamente a visão filtrada', () => {
  const estado = criarEstadoBase();
  estado.alocacoes.push({
    id: 'a_2', turmaIds: ['t_1b'], disciplinaId: 'd_his', professorId: 'p_carlos', dia: 'Terça', horarioId: 'h_2'
  });

  const csvTurma1A = gerarCsvQuadro(estado, { visao: 'turma', filtroId: 't_1a' });
  assert.match(csvTurma1A, /1º Ano A;Matemática;Ana Silva;Segunda/);
  assert.doesNotMatch(csvTurma1A, /1º Ano B/);

  const csvCompleto = gerarCsvQuadro(estado, { visao: 'completa' });
  assert.match(csvCompleto, /1º Ano A/);
  assert.match(csvCompleto, /1º Ano B/);
});

test('12. Massa completa do Slide 3 (23 professores e 7 turmas) inicia vazia e sem conflitos', () => {
  const slide3 = criarDadosSlide3();
  assert.equal(slide3.professores.length, 23);
  assert.equal(slide3.turmas.length, 7);
  assert.equal(slide3.alocacoes.length, 0);
  const res = validarGradeCompleta(slide3);
  assert.equal(res.conflitos.length, 0);
});

test('13. Gerador automático gera 3 alternativas determinísticas sem conflitos', () => {
  const slide3 = criarDadosSlide3();
  slide3.alocacoes.push(
    { id: 'seed_1', turmaIds: ['t_1bas'], disciplinaId: 'd_geo', professorId: 'p_marcelo', dia: 'Segunda', horarioId: 'h_1' },
    { id: 'seed_2', turmaIds: ['t_1bas'], disciplinaId: 'd_fis', professorId: 'p_pedro', dia: 'Segunda', horarioId: 'h_2' }
  );
  const alts = gerarAlternativas(slide3);
  assert.equal(alts.length, 3);
  assert.ok(alts[0].totalAdicionadas > 0);
  const estadoFinal = { ...slide3, alocacoes: [...slide3.alocacoes, ...alts[0].novasAlocacoes] };
  assert.equal(validarGradeCompleta(estadoFinal).conflitos.length, 0);
});
