import { estado } from './estado.js';
import { api, baixar } from './api.js';
import { carregarGrade } from './grade.js';
import { DIAS, abrirModal, escapeHtml, faixaAula, fecharModal, horaCurta, indice, podeEditar, statusNoHorario, toast } from './ui.js';

let recarregar = async () => {};
let graficos = [];

export function iniciarPaineis(dependencias) {
  recarregar = dependencias.recarregar;
}

export async function renderDashboard() {
  const destino = document.getElementById('dashboardBody');
  destino.innerHTML = '<p class="loading">Carregando indicadores…</p>';
  try {
    const gradeId = estado.grade?.id;
    const dados = await api(`/api/dashboard${gradeId ? `?gradeId=${gradeId}` : ''}`);
    const ind = dados.indicadores;
    destino.innerHTML = `
      <section class="stat-grid">
        ${stat('Professores', ind.professores, 'envolvidos na grade')}
        ${stat('Disciplinas', ind.disciplinas, 'componentes alocados')}
        ${stat('Turmas', ind.turmas, 'turmas processadas')}
        ${stat('Conflitos', ind.conflitos, 'obrigatórios')}
        ${stat('Preferências', `${ind.preferenciasAtendidas}%`, 'meta inicial ≥ 90%')}
        ${stat('Ocupação', `${ind.ocupacaoSalas}%`, 'salas físicas')}
        ${stat('Pontuação', ind.pontuacao, dados.grade ? dados.grade.nome : 'sem grade')}
        ${stat('Tempo', dados.indicadores.tempoMs ? `${dados.indicadores.tempoMs} ms` : '—', 'última geração')}
      </section>
      <section class="split">
        <article class="panel"><h3>Ocupação por sala</h3><canvas id="graficoSalas" height="220"></canvas></article>
        <article class="panel"><h3>Carga por professor</h3><p class="note">Cada aula representa 3 h para o professor.</p><canvas id="graficoProfessores" height="220"></canvas></article>
      </section>
      <section class="split">
        <article class="panel">
          <h3>Metas de avaliação</h3>
          <table class="data-table"><thead><tr><th>Métrica</th><th>Atual</th><th>Meta</th></tr></thead>
          <tbody>${dados.metas.map((meta) => `<tr><td>${escapeHtml(meta.nome)}</td><td>${escapeHtml(meta.atual)}</td><td>${escapeHtml(meta.meta)}</td></tr>`).join('')}</tbody></table>
          ${dados.curso ? `<p class="note">Matriz de referência: ${dados.curso.carga_horaria_total} h totais, ${dados.curso.carga_presencial} h presenciais e ${dados.curso.carga_ead} h EAD.</p>` : ''}
        </article>
        <article class="panel">
          <h3>Leitura da grade</h3>
          ${(dados.conflitos || []).slice(0, 5).map((item) => `<p class="flag bad">${escapeHtml(item.mensagem)}</p>`).join('') || '<p class="flag ok">Nenhum conflito obrigatório na grade considerada.</p>'}
          ${(dados.avisos || []).slice(0, 4).map((item) => `<p class="flag warn">${escapeHtml(item.mensagem)}</p>`).join('')}
          ${dados.formula ? `<p class="formula">${escapeHtml(dados.formula)}</p>` : ''}
        </article>
      </section>`;
    desenharGraficos(dados);
  } catch (erro) {
    destino.innerHTML = `<p class="flag bad">${escapeHtml(erro.message)}</p>`;
  }
}

function stat(titulo, valor, detalhe) {
  return `<article class="stat"><span>${escapeHtml(titulo)}</span><strong>${escapeHtml(valor)}</strong><small>${escapeHtml(detalhe)}</small></article>`;
}

function desenharGraficos(dados) {
  graficos.forEach((grafico) => grafico.destroy());
  graficos = [];
  if (!window.Chart) return;
  const salas = dados.ocupacaoPorSala || [];
  const professores = dados.cargaPorProfessor || [];
  graficos.push(new Chart(document.getElementById('graficoSalas'), {
    type: 'bar',
    data: {
      labels: salas.map((item) => item.nome),
      datasets: [{ label: 'Horários ocupados', data: salas.map((item) => item.ocupadas), backgroundColor: '#008078', borderRadius: 6 }],
    },
    options: opcoesGrafico(),
  }));
  graficos.push(new Chart(document.getElementById('graficoProfessores'), {
    type: 'bar',
    data: {
      labels: professores.map((item) => item.nome.split(' ')[0]),
      datasets: [
        { label: 'Horas', data: professores.map((item) => item.horas ?? item.aulas * 3), backgroundColor: '#3d9a45', borderRadius: 6 },
        { label: 'Máxima (h)', data: professores.map((item) => item.maxima), backgroundColor: '#d9d0c3', borderRadius: 6 },
      ],
    },
    options: opcoesGrafico(),
  }));
}

function opcoesGrafico() {
  return { responsive: true, plugins: { legend: { labels: { boxWidth: 12, font: { family: 'Outfit' } } } }, scales: { x: { ticks: { font: { family: 'Outfit' } } }, y: { beginAtZero: true, ticks: { precision: 0 } } } };
}

const FORMULARIOS = [
  { tabela: 'cursos', titulo: 'Cursos', campos: [
    ['nome', 'Nome'], ['turno', 'Turno'], ['campus', 'Campus'],
    ['carga_horaria_total', 'Carga total', 'number'], ['carga_presencial', 'Presencial', 'number'], ['carga_ead', 'EAD', 'number'],
  ]},
  { tabela: 'periodos', titulo: 'Períodos', campos: [
    ['curso_id', 'Curso', 'select', 'cursos'], ['numero', 'Número', 'number'],
  ]},
  { tabela: 'disciplinas', titulo: 'Disciplinas', campos: [
    ['nome', 'Nome'], ['periodo_id', 'Período', 'select', 'periodos'], ['carga_horaria', 'Carga horária', 'number'],
    ['aulas_semana', 'Aulas na semana', 'number'], ['modalidade', 'Modalidade', 'select-fixo', ['presencial', 'ead', 'especial']],
    ['tipo', 'Tipo', 'select-fixo', ['especifica', 'comum', 'institucional', 'extensionista']],
    ['bloco', 'Bloco', 'select-fixo', ['1/2', '3/4', '5/6', '7/8']],
    ['requer_laboratorio', 'Exige laboratório', 'bool'], ['ofertada', 'Ofertada em 2026.2', 'bool'],
  ]},
  { tabela: 'professores', titulo: 'Professores', campos: [
    ['nome', 'Nome'], ['email', 'E-mail'], ['carga_maxima', 'Carga máxima (horas)', 'number'],
  ]},
  { tabela: 'turmas', titulo: 'Turmas', campos: [
    ['rotulo', 'Rótulo'], ['nome', 'Nome'], ['curso_id', 'Curso', 'select', 'cursos'],
    ['periodo', 'Período', 'number'], ['bloco', 'Bloco', 'select-fixo', ['1/2', '3/4', '5/6', '7/8']],
    ['qtd_alunos', 'Alunos', 'number'], ['semestre', 'Semestre'],
  ]},
  { tabela: 'salas', titulo: 'Salas', campos: [
    ['nome', 'Nome'], ['capacidade', 'Capacidade', 'number'], ['campus', 'Campus'],
    ['tipo_sala', 'Uso', 'select-fixo', ['presencial', 'virtual', 'especial']],
    ['laboratorio', 'Laboratório', 'bool'], ['compartilhada', 'Compartilhada', 'bool'],
  ]},
  { tabela: 'horarios', titulo: 'Horários', campos: [
    ['dia_semana', 'Dia', 'select-fixo', [['1', 'Segunda'], ['2', 'Terça'], ['3', 'Quarta'], ['4', 'Quinta'], ['5', 'Sexta']]],
    ['hora_inicio', 'Início'], ['hora_fim', 'Fim'],
  ]},
];

export function renderCadastros() {
  const destino = document.getElementById('cadastrosBody');
  const abas = FORMULARIOS.map((form, i) => `<button type="button" class="tab ${i === 0 ? 'active' : ''}" data-tab="${form.tabela}">${form.titulo}</button>`).join('');
  destino.innerHTML = `<div class="tabs">${abas}</div><div id="cadastroPainel"></div><section class="panel vinculo-panel"><h3>Professores habilitados por disciplina</h3><div id="vinculos"></div></section>`;
  destino.querySelectorAll('.tab').forEach((aba) => aba.addEventListener('click', () => {
    destino.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    aba.classList.add('active');
    desenharTabela(aba.dataset.tab);
  }));
  desenharTabela('cursos');
  desenharVinculos();
}

function desenharTabela(tabela) {
  const form = FORMULARIOS.find((item) => item.tabela === tabela);
  const linhas = estado.catalogo[tabela] || [];
  const mapas = indice(estado.catalogo);
  const painel = document.getElementById('cadastroPainel');
  painel.innerHTML = `
    <div class="panel-head"><h3>${form.titulo}</h3>${podeEditar(estado.usuario) ? `<button type="button" class="btn-primary" id="novoRegistro">Novo</button>` : ''}</div>
    <div class="table-wrap"><table class="data-table"><thead><tr>${form.campos.map((campo) => `<th>${escapeHtml(campo[1])}</th>`).join('')}${podeEditar(estado.usuario) ? '<th></th>' : ''}</tr></thead>
    <tbody>${linhas.map((linha) => `<tr>${form.campos.map((campo) => `<td>${escapeHtml(mostrarCampo(linha, campo, mapas))}</td>`).join('')}${podeEditar(estado.usuario) ? `<td class="row-actions"><button type="button" data-edit="${linha.id}">Editar</button><button type="button" data-del="${linha.id}">Excluir</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  painel.querySelector('#novoRegistro')?.addEventListener('click', () => formularioRegistro(form, null));
  painel.querySelectorAll('[data-edit]').forEach((botao) => botao.addEventListener('click', () => formularioRegistro(form, linhas.find((linha) => linha.id === botao.dataset.edit))));
  painel.querySelectorAll('[data-del]').forEach((botao) => botao.addEventListener('click', () => excluirRegistro(tabela, botao.dataset.del)));
}

function mostrarCampo(linha, campo, mapas) {
  const valor = linha[campo[0]];
  if (campo[2] === 'bool') return valor ? 'sim' : 'não';
  if (campo[2] === 'select' && campo[3] === 'cursos') return mapas.curso.get(valor)?.nome || '';
  if (campo[2] === 'select' && campo[3] === 'periodos') {
    const periodo = mapas.periodo.get(valor);
    return periodo ? `${periodo.numero}º` : '';
  }
  if (campo[0] === 'dia_semana') return DIAS[valor] || valor || '';
  if (campo[0] === 'hora_inicio' || campo[0] === 'hora_fim') return horaCurta(valor);
  return valor ?? '';
}

function formularioRegistro(form, registro) {
  const mapas = indice(estado.catalogo);
  const campos = form.campos.map((campo) => campoHtml(campo, registro, mapas)).join('');
  abrirModal({
    titulo: registro ? `Editar ${form.titulo.toLowerCase()}` : `Novo em ${form.titulo.toLowerCase()}`,
    corpo: `<form id="formRegistro" class="stack">${campos}<div class="modal-actions"><button class="btn-primary" type="submit">Salvar</button></div></form>`,
    aoMontar: (corpo) => {
      corpo.querySelector('#formRegistro').addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const dados = Object.fromEntries(new FormData(evento.target).entries());
        for (const campo of form.campos) {
          if (campo[2] === 'bool') dados[campo[0]] = evento.target.elements[campo[0]].checked;
        }
        try {
          if (registro) await api(`/api/${form.tabela}/${registro.id}`, { method: 'PUT', body: dados });
          else await api(`/api/${form.tabela}`, { method: 'POST', body: dados });
          fecharModal();
          await recarregar();
          renderCadastros();
          toast('Cadastro atualizado.');
        } catch (erro) {
          toast(erro.message, 'bad');
        }
      });
    },
  });
}

function campoHtml(campo, registro, mapas) {
  const [nome, label, tipo, fonte] = campo;
  const valor = registro?.[nome] ?? '';
  if (tipo === 'bool') return `<label class="check"><input name="${nome}" type="checkbox" ${valor ? 'checked' : ''}> ${escapeHtml(label)}</label>`;
  if (tipo === 'select' && fonte === 'cursos') {
    return `<label>${escapeHtml(label)}<select name="${nome}">${estado.catalogo.cursos.map((curso) => `<option value="${curso.id}" ${curso.id === valor ? 'selected' : ''}>${escapeHtml(curso.nome)}</option>`).join('')}</select></label>`;
  }
  if (tipo === 'select' && fonte === 'periodos') {
    return `<label>${escapeHtml(label)}<select name="${nome}">${estado.catalogo.periodos.map((periodo) => `<option value="${periodo.id}" ${periodo.id === valor ? 'selected' : ''}>${periodo.numero}º período</option>`).join('')}</select></label>`;
  }
  if (tipo === 'select-fixo') {
    const opcoes = fonte.map((item) => Array.isArray(item) ? item : [item, item]);
    return `<label>${escapeHtml(label)}<select name="${nome}">${opcoes.map(([id, texto]) => `<option value="${id}" ${String(valor) === String(id) ? 'selected' : ''}>${escapeHtml(texto)}</option>`).join('')}</select></label>`;
  }
  return `<label>${escapeHtml(label)}<input name="${nome}" type="${tipo || 'text'}" value="${escapeHtml(valor)}"></label>`;
}

async function excluirRegistro(tabela, id) {
  if (!confirm('Excluir este registro?')) return;
  try {
    await api(`/api/${tabela}/${id}`, { method: 'DELETE' });
    await recarregar();
    renderCadastros();
    toast('Registro excluído.');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

function desenharVinculos() {
  const mapas = indice(estado.catalogo);
  const destino = document.getElementById('vinculos');
  const grupos = new Map();
  for (const vinculo of estado.catalogo.vinculos) {
    if (!grupos.has(vinculo.disciplina_id)) grupos.set(vinculo.disciplina_id, []);
    grupos.get(vinculo.disciplina_id).push(vinculo.professor_id);
  }
  destino.innerHTML = `
    ${podeEditar(estado.usuario) ? `<form id="novoVinculo" class="inline-form">
      <select name="disciplina_id">${estado.catalogo.disciplinas.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('')}</select>
      <select name="professor_id">${estado.catalogo.professores.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('')}</select>
      <button class="btn-primary" type="submit">Vincular</button>
    </form>` : ''}
    <ul class="vinculo-list">${[...grupos.entries()].map(([disciplinaId, professores]) => `
      <li><b>${escapeHtml(mapas.disciplina.get(disciplinaId)?.nome || '')}</b>
      ${professores.map((id) => `<span>${escapeHtml(mapas.professor.get(id)?.nome || '')}${podeEditar(estado.usuario) ? ` <button type="button" data-dp="${disciplinaId}" data-pr="${id}">×</button>` : ''}</span>`).join('')}</li>`).join('')}</ul>`;
  destino.querySelector('#novoVinculo')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target).entries());
    try {
      await api('/api/vinculos', { method: 'POST', body: dados });
      await recarregar();
      renderCadastros();
    } catch (erro) {
      toast(erro.message, 'bad');
    }
  });
  destino.querySelectorAll('[data-dp]').forEach((botao) => botao.addEventListener('click', async () => {
    try {
      await api('/api/vinculos', { method: 'DELETE', body: { disciplina_id: botao.dataset.dp, professor_id: botao.dataset.pr } });
      await recarregar();
      renderCadastros();
    } catch (erro) {
      toast(erro.message, 'bad');
    }
  }));
}

export function renderDisponibilidade() {
  const destino = document.getElementById('disponibilidadeBody');
  const professores = estado.catalogo.professores.filter((professor) => estado.usuario.perfil !== 'professor' || professor.id === estado.usuario.professor_id);
  destino.innerHTML = `
    <div class="panel-head"><h3>Agenda docente</h3>
      <label>Professor<select id="profDisp">${professores.map((professor) => `<option value="${professor.id}">${escapeHtml(professor.nome)}</option>`).join('')}</select></label>
    </div>
    <p class="note">Clique em um horário para alternar disponível, preferencial e indisponível. Sem registro, o professor é tratado como disponível em todo o turno.</p>
    <div class="legend"><span class="pill disponivel">Disponível</span><span class="pill preferencial">Preferencial</span><span class="pill indisponivel">Indisponível</span></div>
    <div id="matrizDisp"></div>`;
  const select = destino.querySelector('#profDisp');
  if (estado.usuario.professor_id) select.value = estado.usuario.professor_id;
  const desenhar = () => desenharMatriz(select.value);
  select.addEventListener('change', desenhar);
  desenhar();
}

function desenharMatriz(professorId) {
  const horarios = [...estado.catalogo.horarios].sort((a, b) => a.dia_semana - b.dia_semana || String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
  const faixas = [];
  for (const horario of horarios) {
    if (!faixas.some((item) => horaCurta(item.hora_inicio) === horaCurta(horario.hora_inicio))) faixas.push(horario);
  }
  const pode = podeEditar(estado.usuario) || estado.usuario.perfil === 'professor';
  let html = `<div class="matriz"><div></div>${[1, 2, 3, 4, 5].map((dia) => `<div class="grade-day">${DIAS[dia]}</div>`).join('')}`;
  for (const faixa of faixas) {
    html += `<div class="grade-time">${faixaAula(faixa.hora_inicio, faixa.hora_fim)}</div>`;
    for (const dia of [1, 2, 3, 4, 5]) {
      const horario = horarios.find((item) => item.dia_semana === dia && horaCurta(item.hora_inicio) === horaCurta(faixa.hora_inicio));
      const status = statusNoHorario(professorId, horario, estado.catalogo.disponibilidades);
      html += `<button type="button" class="slot ${status}" data-horario="${horario.id}" ${pode ? '' : 'disabled'}>${rotuloStatus(status)}</button>`;
    }
  }
  html += '</div>';
  const matriz = document.getElementById('matrizDisp');
  matriz.innerHTML = html;
  matriz.querySelectorAll('.slot').forEach((botao) => botao.addEventListener('click', () => ciclarDisponibilidade(professorId, botao.dataset.horario)));
}

function rotuloStatus(status) {
  if (status === 'preferencial') return 'Prefere';
  if (status === 'indisponivel') return 'Não pode';
  return 'Pode';
}

async function ciclarDisponibilidade(professorId, horarioId) {
  const horario = estado.catalogo.horarios.find((item) => item.id === horarioId);
  const atual = statusNoHorario(professorId, horario, estado.catalogo.disponibilidades);
  const ciclo = { disponivel: 'preferencial', preferencial: 'indisponivel', indisponivel: 'disponivel' };
  try {
    await api('/api/disponibilidades', {
      method: 'POST',
      body: {
        professor_id: professorId,
        dia_semana: horario.dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fim: horario.hora_fim,
        status: ciclo[atual],
      },
    });
    await recarregar();
    desenharMatriz(professorId);
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

export function renderRestricoes() {
  const destino = document.getElementById('restricoesBody');
  destino.innerHTML = `
    <div class="panel">
      <p class="note">Regras obrigatórias eliminam soluções inválidas. Preferências entram só na função de custo.</p>
      <table class="data-table"><thead><tr><th>Tipo</th><th>Prioridade</th><th>Descrição</th><th>Ativa</th></tr></thead>
      <tbody>${estado.catalogo.restricoes.map((regra) => `<tr>
        <td>${escapeHtml(regra.tipo)}</td><td>${regra.prioridade}</td><td>${escapeHtml(regra.descricao)}</td>
        <td><input type="checkbox" data-regra="${regra.id}" ${regra.ativa ? 'checked' : ''} ${podeEditar(estado.usuario) ? '' : 'disabled'}></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
  destino.querySelectorAll('[data-regra]').forEach((campo) => campo.addEventListener('change', async () => {
    try {
      await api(`/api/restricoes/${campo.dataset.regra}`, { method: 'PUT', body: { ativa: campo.checked } });
      await recarregar();
      toast('Restrição atualizada.');
    } catch (erro) {
      toast(erro.message, 'bad');
    }
  }));
}

export function renderRelatorios() {
  const destino = document.getElementById('relatoriosBody');
  const grades = estado.catalogo.grades;
  destino.innerHTML = `
    <div class="panel-head"><h3>Distribuição da grade</h3></div>
    <div class="inline-form">
      <select id="relGrade">${grades.map((grade) => `<option value="${grade.id}">${escapeHtml(grade.nome)}</option>`).join('') || '<option value="">Sem grades</option>'}</select>
      <select id="relVisao"><option value="turma">Por turma</option><option value="professor">Por professor</option><option value="sala">Por sala</option></select>
      <button type="button" class="btn-primary" id="btnCsv">Exportar Excel (CSV)</button>
      <button type="button" class="btn-ghost" id="btnPdf">Exportar PDF</button>
    </div>
    <div id="relatorioTabela"></div>
    ${podeEditar(estado.usuario) ? `<section class="panel"><h3>Importar grade</h3>
      <p class="note">CSV com colunas turma, disciplina, professor, sala, dia e inicio. Use ponto e vírgula.</p>
      <input type="file" id="arquivoCsv" accept=".csv,text/csv">
      <button type="button" class="btn-primary" id="btnImportar">Converter e validar</button></section>` : ''}`;
  if (estado.grade?.id) destino.querySelector('#relGrade').value = estado.grade.id;
  const atualizar = () => preencherRelatorio();
  destino.querySelector('#relGrade').addEventListener('change', atualizar);
  destino.querySelector('#relVisao').addEventListener('change', atualizar);
  destino.querySelector('#btnCsv').addEventListener('click', exportarCsv);
  destino.querySelector('#btnPdf').addEventListener('click', () => window.print());
  destino.querySelector('#btnImportar')?.addEventListener('click', importarCsv);
  atualizar();
}

async function preencherRelatorio() {
  const id = document.getElementById('relGrade').value;
  const tabela = document.getElementById('relatorioTabela');
  if (!id) { tabela.innerHTML = '<p>Gere uma grade para exportar.</p>'; return; }
  try {
    const dados = await api(`/api/grades/${id}`);
    const mapas = indice(estado.catalogo);
    const visao = document.getElementById('relVisao').value;
    const grupos = new Map();
    for (const item of dados.itens) {
      const chave = visao === 'professor' ? item.professor_id : visao === 'sala' ? item.sala_id : item.turma_id;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(item);
    }
    tabela.innerHTML = [...grupos.entries()].map(([chave, itens]) => {
      const titulo = visao === 'professor' ? mapas.professor.get(chave)?.nome : visao === 'sala' ? mapas.sala.get(chave)?.nome : mapas.turma.get(chave)?.rotulo;
      return `<section class="panel print-block"><h3>${escapeHtml(titulo || 'Sem nome')}</h3>
        <table class="data-table"><thead><tr><th>Dia</th><th>Horário</th><th>Disciplina</th><th>Professor</th><th>Sala</th><th>Turma</th><th>Situação</th></tr></thead>
        <tbody>${itens.sort(ordenarAula).map((item) => {
          const horario = mapas.horario.get(item.horario_id);
          return `<tr><td>${DIAS[horario?.dia_semana] || ''}</td><td>${horario ? faixaAula(horario.hora_inicio, horario.hora_fim) : ''}</td><td>${escapeHtml(mapas.disciplina.get(item.disciplina_id)?.nome || '')}</td><td>${escapeHtml(mapas.professor.get(item.professor_id)?.nome || '')}</td><td>${escapeHtml(mapas.sala.get(item.sala_id)?.nome || '')}</td><td>${escapeHtml(mapas.turma.get(item.turma_id)?.rotulo || '')}</td><td>${escapeHtml(item.status_validacao)}</td></tr>`;
        }).join('')}</tbody></table></section>`;
    }).join('') || '<p>Esta visão não tem aulas.</p>';
  } catch (erro) {
    tabela.innerHTML = `<p class="flag bad">${escapeHtml(erro.message)}</p>`;
  }
}

function ordenarAula(a, b) {
  const mapas = indice(estado.catalogo);
  const ha = mapas.horario.get(a.horario_id);
  const hb = mapas.horario.get(b.horario_id);
  return (ha?.dia_semana || 0) - (hb?.dia_semana || 0) || String(ha?.hora_inicio).localeCompare(String(hb?.hora_inicio));
}

async function exportarCsv() {
  const id = document.getElementById('relGrade').value;
  const visao = document.getElementById('relVisao').value;
  if (!id) return;
  try {
    await baixar(`/api/grades/${id}/export?visao=${visao}`, `smartgrade-ia-${visao}.csv`);
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

async function importarCsv() {
  const arquivo = document.getElementById('arquivoCsv').files[0];
  if (!arquivo) { toast('Escolha um arquivo CSV.', 'warn'); return; }
  const csv = await arquivo.text();
  try {
    const dados = await api('/api/grades/import', {
      method: 'POST',
      body: { csv, cursoId: estado.catalogo.cursos[0]?.id, semestre: '2026.2', nome: `Importação ${arquivo.name}` },
    });
    await recarregar();
    await carregarGrade(dados.grade.id);
    document.querySelector('[data-view-link="grade"]').click();
    toast(dados.avaliacao.viavel ? 'Planilha convertida e válida.' : 'Planilha convertida com conflitos. Revise a grade.', dados.avaliacao.viavel ? 'ok' : 'warn');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}
