import { estado } from './estado.js';
import { api } from './api.js';
import { DIAS, abrirModal, escapeHtml, faixaAula, fecharModal, horaCurta, indice, podeEditar, toast } from './ui.js';

let recarregar = async () => {};

export function iniciarGrade(dependencias) {
  recarregar = dependencias.recarregar;
  document.getElementById('btnGerar').addEventListener('click', abrirGeracao);
  document.getElementById('btnReotimizar').addEventListener('click', reotimizar);
  document.getElementById('btnAprovar').addEventListener('click', aprovar);
  document.getElementById('filtroGrade').addEventListener('change', (evento) => carregarGrade(evento.target.value));
  document.getElementById('filtroVisao').addEventListener('change', renderGrade);
  document.getElementById('filtroEntidade').addEventListener('change', renderGrade);
  const grid = document.getElementById('gradeGrid');
  grid.addEventListener('dragstart', aoArrastar);
  grid.addEventListener('dragend', aoSoltarArraste);
  grid.addEventListener('dragover', aoPassar);
  grid.addEventListener('dragleave', aoSair);
  grid.addEventListener('drop', aoDropar);
  grid.addEventListener('click', aoClicarCard);
}

export async function carregarGrade(id) {
  if (!id) {
    estado.grade = null;
    estado.itens = [];
    estado.avaliacao = null;
    estado.historico = [];
    renderGrade();
    return;
  }
  const dados = await api(`/api/grades/${id}`);
  estado.grade = dados.grade;
  estado.itens = dados.itens;
  estado.avaliacao = dados.avaliacao;
  estado.historico = dados.historico;
  renderGrade();
}

export function renderGrade() {
  const catalogo = estado.catalogo;
  if (!catalogo) return;
  if (!estado.grade && !estado.gradeVista && catalogo.grades?.length) {
    estado.gradeVista = true;
    carregarGrade(catalogo.grades[0].id);
    return;
  }
  estado.gradeVista = true;
  const selectGrade = document.getElementById('filtroGrade');
  const valorAtual = estado.grade?.id || selectGrade.value;
  selectGrade.innerHTML = `<option value="">Nenhuma grade salva</option>${catalogo.grades.map((grade) => `
    <option value="${grade.id}">${escapeHtml(grade.nome)} · ${escapeHtml(grade.status)} · ${grade.pontuacao ?? '—'}</option>`).join('')}`;
  if (valorAtual) selectGrade.value = valorAtual;

  const visao = document.getElementById('filtroVisao').value;
  const entidades = opcoesEntidade(visao);
  const selectEntidade = document.getElementById('filtroEntidade');
  const entidadeAtual = selectEntidade.value;
  selectEntidade.innerHTML = entidades.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('');
  if (entidades.some((item) => item.id === entidadeAtual)) selectEntidade.value = entidadeAtual;
  else if (estado.usuario?.perfil === 'aluno' && estado.usuario.turma_id) selectEntidade.value = estado.usuario.turma_id;
  else if (estado.usuario?.perfil === 'professor' && estado.usuario.professor_id && visao === 'professor') selectEntidade.value = estado.usuario.professor_id;

  const editar = podeEditar(estado.usuario) && estado.grade?.status !== 'aprovada';
  document.getElementById('btnGerar').hidden = !podeEditar(estado.usuario);
  document.getElementById('btnReotimizar').hidden = !editar || !estado.grade;
  document.getElementById('btnAprovar').hidden = !podeEditar(estado.usuario) || !estado.grade || estado.grade.status === 'aprovada';
  document.getElementById('btnAprovar').disabled = estado.avaliacao ? !estado.avaliacao.viavel : true;

  desenharGrid(visao, selectEntidade.value, editar);
  desenharPainel();
}

function opcoesEntidade(visao) {
  const catalogo = estado.catalogo;
  if (visao === 'professor') return catalogo.professores.map((item) => ({ id: item.id, nome: item.nome }));
  if (visao === 'sala') return catalogo.salas.map((item) => ({ id: item.id, nome: item.nome }));
  return catalogo.turmas.map((item) => ({ id: item.id, nome: item.rotulo || item.nome }));
}

function itensVisiveis(visao, entidadeId) {
  return estado.itens.filter((item) => {
    if (visao === 'professor') return item.professor_id === entidadeId;
    if (visao === 'sala') return item.sala_id === entidadeId;
    return item.turma_id === entidadeId;
  });
}

function desenharGrid(visao, entidadeId, editar) {
  const grid = document.getElementById('gradeGrid');
  const mapas = indice(estado.catalogo);
  const dias = [1, 2, 3, 4, 5];
  const faixas = [...estado.catalogo.horarios].sort((a, b) => a.dia_semana - b.dia_semana || String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
  const modelos = [];
  for (const horario of faixas) {
    if (!modelos.some((item) => horaCurta(item.hora_inicio) === horaCurta(horario.hora_inicio))) modelos.push(horario);
  }
  const visiveis = itensVisiveis(visao, entidadeId);
  let html = `<div class="grade-corner">Horário</div>${dias.map((dia) => `<div class="grade-day">${DIAS[dia]}</div>`).join('')}`;
  for (const modelo of modelos) {
    html += `<div class="grade-time">${faixaAula(modelo.hora_inicio, modelo.hora_fim)}</div>`;
    for (const dia of dias) {
      const horario = faixas.find((item) => item.dia_semana === dia && horaCurta(item.hora_inicio) === horaCurta(modelo.hora_inicio));
      const cards = horario ? visiveis.filter((item) => item.horario_id === horario.id) : [];
      html += `<div class="grade-cell" data-horario="${horario?.id || ''}">${cards.map((item) => cardHtml(item, mapas, editar, visao)).join('') || '<em class="celula-vazia">Livre</em>'}</div>`;
    }
  }
  grid.innerHTML = html;
}

function cardHtml(item, mapas, editar, visao) {
  const disciplina = mapas.disciplina.get(item.disciplina_id);
  const professor = mapas.professor.get(item.professor_id);
  const sala = mapas.sala.get(item.sala_id);
  const turma = mapas.turma.get(item.turma_id);
  const horario = mapas.horario.get(item.horario_id);
  const nivel = item.status_validacao || 'valido';
  return `<article class="grade-card ${nivel}" draggable="${editar ? 'true' : 'false'}" data-id="${item.id}" data-professor="${item.professor_id}" data-disciplina="${item.disciplina_id}">
    <div class="drag-handle" title="Arrastar">⋮⋮</div>
    <strong>${escapeHtml(disciplina?.nome || 'Disciplina')}</strong>
    <span>Professor: ${escapeHtml(professor?.nome || '—')}</span>
    <span>Sala: ${escapeHtml(sala?.nome || '—')}</span>
    ${visao !== 'turma' ? `<span>${escapeHtml(turma?.rotulo || '')}</span>` : ''}
    <small>${horario ? `${DIAS[horario.dia_semana]} · ${faixaAula(horario.hora_inicio, horario.hora_fim)}` : ''}</small>
  </article>`;
}

function desenharPainel() {
  const painel = document.getElementById('gradeSide');
  const conflitosPainel = document.getElementById('gradeConflitos');
  const avaliacao = estado.avaliacao;
  if (!estado.grade || !avaliacao) {
    conflitosPainel.hidden = true;
    conflitosPainel.innerHTML = '';
    painel.innerHTML = `<div class="side-card"><h3>Nenhuma grade aberta</h3><p>Gere uma grade otimizada ou abra um rascunho salvo. O motor devolve três alternativas e registra o motivo de cada alocação.</p></div>`;
    return;
  }
  const conflitos = avaliacao.obrigatorios || [];
  const avisos = avaliacao.preferenciais || [];
  const decisoes = (estado.grade.metricas?.decisoes || []).slice(0, 8);
  conflitosPainel.hidden = false;
  conflitosPainel.innerHTML = `
    <h3>Conflitos</h3>
    ${conflitos.length ? conflitos.map((item) => `<p class="flag bad">${escapeHtml(item.mensagem)}</p>`).join('') : '<p class="flag ok">Nenhum conflito obrigatório.</p>'}
    ${avisos.map((item) => `<p class="flag warn">${escapeHtml(item.mensagem)}</p>`).join('')}`;
  painel.innerHTML = `
    <div class="side-card score-card">
      <p class="eyebrow">${escapeHtml(estado.grade.status)} · versão ${estado.grade.versao || 1}</p>
      <strong class="score">${avaliacao.pontuacao}</strong>
      <span>pontuação · custo ${avaliacao.custo}</span>
      <p>${avaliacao.viavel ? 'Grade viável: nenhum conflito obrigatório.' : 'Há conflito obrigatório. A aprovação fica bloqueada.'}</p>
    </div>
    <div class="side-card">
      <h3>Indicadores</h3>
      <ul class="metric-list">
        <li><span>Preferências</span><b>${avaliacao.preferenciasAtendidas}%</b></li>
        <li><span>Ocupação de salas</span><b>${avaliacao.ocupacaoSalas}%</b></li>
        <li><span>Janelas</span><b>${avaliacao.contagens?.janelas ?? 0}</b></li>
        <li><span>Professores</span><b>${avaliacao.professores}</b></li>
      </ul>
      <p class="formula">${escapeHtml(avaliacao.formula || '')}</p>
    </div>
    <div class="side-card">
      <h3>Rastreabilidade</h3>
      ${decisoes.length ? decisoes.map((item) => `<p class="trace">${escapeHtml(item)}</p>`).join('') : '<p>As decisões aparecem depois da geração automática.</p>'}
    </div>`;
}

function abrirGeracao() {
  const catalogo = estado.catalogo;
  const curso = catalogo.cursos[0];
  abrirModal({
    titulo: 'Gerar grade otimizada',
    corpo: `
      <p class="modal-lead">O sistema carrega disciplinas, professores, salas e disponibilidades, elimina combinações inválidas e devolve as três melhores alternativas.</p>
      <div class="field-grid">
        <label>Curso<select id="genCurso">${catalogo.cursos.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('')}</select></label>
        <label>Semestre<input id="genSemestre" value="2026.2"></label>
      </div>
      <fieldset>
        <legend>Turmas</legend>
        <div class="check-grid">${catalogo.turmas.filter((item) => !curso || item.curso_id === curso.id).map((item) => `
          <label class="check"><input type="checkbox" name="turma" value="${item.id}" checked><span><b>${escapeHtml(item.rotulo || item.nome)}</b><small>${item.qtd_alunos} alunos</small></span></label>`).join('')}</div>
      </fieldset>
      <fieldset>
        <legend>Regras desta geração</legend>
        <div class="rule-list">
          <label class="check"><input id="regDisp" type="checkbox" checked><span>Respeitar disponibilidade do professor</span></label>
          <label class="check"><input id="regJanela" type="checkbox" checked><span>Evitar janelas</span></label>
          <label class="check"><input id="regLab" type="checkbox" checked><span>Preferir laboratórios nas práticas</span></label>
          <label class="check"><input id="regEquilibrio" type="checkbox" checked><span>Equilibrar a carga docente</span></label>
          <label class="check"><input id="regCampus" type="checkbox" checked><span>Reduzir deslocamento entre campi</span></label>
        </div>
      </fieldset>
      <div class="modal-actions"><button class="btn-primary" id="confirmarGerar" type="button">Gerar três alternativas</button></div>`,
    aoMontar: (corpo) => {
      corpo.querySelector('#confirmarGerar').addEventListener('click', () => gerar(corpo));
    },
  });
}

async function gerar(corpo) {
  const botao = corpo.querySelector('#confirmarGerar');
  botao.disabled = true;
  botao.textContent = 'Gerando…';
  const regras = {
    respeitarDisponibilidade: corpo.querySelector('#regDisp').checked,
    evitarJanelas: corpo.querySelector('#regJanela').checked,
    preferirLaboratorios: corpo.querySelector('#regLab').checked,
    equilibrarCarga: corpo.querySelector('#regEquilibrio').checked,
    reduzirDeslocamento: corpo.querySelector('#regCampus').checked,
  };
  const pedido = {
    cursoId: corpo.querySelector('#genCurso').value,
    semestre: corpo.querySelector('#genSemestre').value,
    turmaIds: [...corpo.querySelectorAll('input[name="turma"]:checked')].map((item) => item.value),
    regras,
  };
  try {
    const dados = await api('/api/grades/generate', { method: 'POST', body: pedido });
    mostrarAlternativas(dados, pedido);
  } catch (erro) {
    const extra = erro.detalhes?.diagnostico?.length ? ` ${erro.detalhes.diagnostico.join(' ')}` : '';
    toast(`${erro.message}${extra}`, 'bad');
    botao.disabled = false;
    botao.textContent = 'Gerar três alternativas';
  }
}

function mostrarAlternativas(dados, pedido) {
  const corpo = document.querySelector('.modal-body');
  corpo.innerHTML = `
    <p class="modal-lead">Três alternativas em ${dados.tempoMs} ms. A restrição obrigatória inviabiliza a solução; a pontuação mede só o que pode ser negociado.</p>
    <div class="alt-grid">${dados.alternativas.map((alternativa, indiceAlt) => `
      <article class="alt-card ${alternativa.viavel ? '' : 'inviavel'}">
        <p class="eyebrow">Alternativa ${indiceAlt + 1} · semente ${alternativa.seed}</p>
        <strong>${alternativa.pontuacao}</strong>
        <ul>
          <li>${alternativa.viavel ? 'Sem conflito obrigatório' : `${alternativa.conflitos.length} conflito(s)`}</li>
          <li>Preferências ${alternativa.metricas.preferenciasAtendidas}%</li>
          <li>Ocupação ${alternativa.metricas.ocupacaoSalas}%</li>
          <li>${alternativa.tempoMs} ms</li>
        </ul>
        <button type="button" class="btn-primary" data-alt="${indiceAlt}" ${alternativa.viavel ? '' : ''}>Abrir no editor</button>
      </article>`).join('')}</div>`;
  corpo.querySelectorAll('[data-alt]').forEach((botao) => {
    botao.addEventListener('click', () => salvarAlternativa(dados.alternativas[Number(botao.dataset.alt)], pedido));
  });
}

async function salvarAlternativa(alternativa, pedido) {
  try {
    const salva = await api('/api/grades', {
      method: 'POST',
      body: {
        nome: `CC ${pedido.semestre} · semente ${alternativa.seed}`,
        semestre: pedido.semestre,
        cursoId: pedido.cursoId,
        seed: alternativa.seed,
        itens: alternativa.grade,
        regras: pedido.regras,
        decisoes: alternativa.decisoes,
        tempoMs: alternativa.tempoMs,
      },
    });
    await recarregar();
    estado.grade = salva.grade;
    estado.itens = salva.itens;
    estado.avaliacao = salva.avaliacao;
    estado.historico = [];
    fecharModal();
    document.getElementById('filtroVisao').value = 'turma';
    renderGrade();
    toast(`Grade salva com pontuação ${salva.avaliacao.pontuacao}. Arraste os cards para ajustar.`);
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

async function reotimizar() {
  if (!estado.grade) return;
  const visao = document.getElementById('filtroVisao').value;
  const entidade = document.getElementById('filtroEntidade').value;
  const corpo = { turmaId: visao === 'turma' ? entidade : null };
  try {
    const dados = await api(`/api/grades/${estado.grade.id}/reotimizar`, { method: 'POST', body: corpo });
    estado.grade = dados.grade;
    estado.itens = dados.itens;
    estado.avaliacao = dados.avaliacao;
    await recarregar();
    renderGrade();
    toast(`Reotimização concluída. Pontuação ${dados.avaliacao.pontuacao}.`);
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

async function aprovar() {
  if (!estado.grade) return;
  try {
    const dados = await api(`/api/grades/${estado.grade.id}/aprovar`, { method: 'POST', body: {} });
    estado.grade = dados.grade;
    await recarregar();
    renderGrade();
    toast('Grade aprovada e registrada no histórico.');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

function aoArrastar(evento) {
  const card = evento.target.closest('.grade-card');
  if (!card || card.getAttribute('draggable') !== 'true') return;
  card.classList.add('dragging');
  evento.dataTransfer.setData('text/plain', card.dataset.id);
  evento.dataTransfer.effectAllowed = 'move';
}

function aoSoltarArraste(evento) {
  const card = evento.target.closest('.grade-card');
  if (card) card.classList.remove('dragging');
}

function aoPassar(evento) {
  const celula = evento.target.closest('.grade-cell');
  if (!celula) return;
  evento.preventDefault();
  celula.classList.add('drop-target');
}

function aoSair(evento) {
  const celula = evento.target.closest('.grade-cell');
  if (celula) celula.classList.remove('drop-target');
}

async function aoDropar(evento) {
  const celula = evento.target.closest('.grade-cell');
  if (!celula) return;
  evento.preventDefault();
  celula.classList.remove('drop-target');
  const id = evento.dataTransfer.getData('text/plain');
  const horarioId = celula.dataset.horario;
  if (!id || !horarioId || !estado.grade) return;
  const atual = estado.itens.find((item) => item.id === id);
  if (!atual || atual.horario_id === horarioId) return;
  try {
    const resultado = await api(`/api/grades/${estado.grade.id}/mover`, {
      method: 'POST',
      body: { itemId: id, horarioId },
    });
    if (!resultado.valido) {
      toast(resultado.conflitos.map((item) => item.mensagem).join(' '), 'bad');
      return;
    }
    estado.grade = resultado.grade;
    estado.itens = resultado.itens;
    estado.avaliacao = resultado.avaliacao;
    renderGrade();
    toast(resultado.nivel === 'preferencia' ? 'Movimento salvo com aviso de preferência.' : 'Movimento válido e salvo.', resultado.nivel === 'preferencia' ? 'warn' : 'ok');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

function aoClicarCard(evento) {
  const card = evento.target.closest('.grade-card');
  if (!card || evento.target.closest('.drag-handle')) return;
  const item = estado.itens.find((atual) => atual.id === card.dataset.id);
  if (!item) return;
  const mapas = indice(estado.catalogo);
  const horario = mapas.horario.get(item.horario_id);
  const editar = podeEditar(estado.usuario) && estado.grade?.status !== 'aprovada';
  abrirModal({
    titulo: mapas.disciplina.get(item.disciplina_id)?.nome || 'Aula',
    corpo: `
      <p><b>Professor:</b> ${escapeHtml(mapas.professor.get(item.professor_id)?.nome || '')}</p>
      <p><b>Turma:</b> ${escapeHtml(mapas.turma.get(item.turma_id)?.rotulo || '')}</p>
      <p><b>Quando:</b> ${horario ? `${DIAS[horario.dia_semana]}, ${faixaAula(horario.hora_inicio, horario.hora_fim)}` : ''}</p>
      <label>Sala<select id="novaSala" ${editar ? '' : 'disabled'}>${estado.catalogo.salas.map((sala) => `
        <option value="${sala.id}" ${sala.id === item.sala_id ? 'selected' : ''}>${escapeHtml(sala.nome)} · ${sala.capacidade}</option>`).join('')}</select></label>
      <div class="trace-box">${(item.motivos || []).map((motivo) => `<p>${escapeHtml(motivo)}</p>`).join('') || '<p>Sem rastreio registrado.</p>'}</div>
      ${editar ? '<div class="modal-actions"><button type="button" class="btn-ghost" id="removerAula">Remover</button><button type="button" class="btn-primary" id="salvarSala">Salvar sala</button></div>' : ''}`,
    aoMontar: (corpo) => {
      corpo.querySelector('#salvarSala')?.addEventListener('click', () => moverSala(item, corpo.querySelector('#novaSala').value));
      corpo.querySelector('#removerAula')?.addEventListener('click', () => removerAula(item.id));
    },
  });
}

async function moverSala(item, salaId) {
  try {
    const resultado = await api(`/api/grades/${estado.grade.id}/mover`, {
      method: 'POST',
      body: { itemId: item.id, horarioId: item.horario_id, salaId },
    });
    if (!resultado.valido) {
      toast(resultado.conflitos.map((conflito) => conflito.mensagem).join(' '), 'bad');
      return;
    }
    estado.grade = resultado.grade;
    estado.itens = resultado.itens;
    estado.avaliacao = resultado.avaliacao;
    fecharModal();
    renderGrade();
    toast(resultado.nivel === 'preferencia' ? 'Sala atualizada com aviso.' : 'Sala atualizada.');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}

async function removerAula(itemId) {
  try {
    const dados = await api(`/api/grades/${estado.grade.id}/itens/${itemId}`, { method: 'DELETE' });
    estado.grade = dados.grade;
    estado.itens = dados.itens;
    estado.avaliacao = dados.avaliacao;
    fecharModal();
    renderGrade();
    toast('Aula removida. A carga horária foi reavaliada.', 'warn');
  } catch (erro) {
    toast(erro.message, 'bad');
  }
}
