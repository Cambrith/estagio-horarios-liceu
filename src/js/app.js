/**
 * Controlador principal da interface do Sistema de Horários Escolares.
 */
(function () {
  'use strict';

  const { DIAS_SEMANA, validarAlocacao, validarGradeCompleta, sugerirSubstitutos } = window.Validacao;
  const { gerarId, carregarEstado, salvarEstado, criarEstadoVazio, criarDadosExemplo } = window.StorageApp;
  const { gerarCsvQuadro } = window.CsvApp;
  const { gerarAlternativas } = window.GeradorApp;

  let estado = carregarEstado();
  let professorDisponibilidadeId = null;
  let alternativasGeradas = [];
  let arrastandoAlocacaoId = null;

  /**
   * Escapa caracteres especiais para evitar inserção de HTML indevido.
   */
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buscar(lista, id) {
    return lista.find((item) => item.id === id) || null;
  }

  function horariosOrdenados() {
    return [...estado.horarios].sort((a, b) => a.inicio.localeCompare(b.inicio));
  }

  /**
   * Gera uma cor pastel determinística para destacar cada disciplina no quadro.
   */
  function corDisciplina(disciplinaId) {
    let hash = 0;
    for (let i = 0; i < String(disciplinaId).length; i++) {
      hash = (hash * 31 + String(disciplinaId).charCodeAt(i)) % 360;
    }
    return {
      fundo: `hsl(${hash}, 55%, 94%)`,
      borda: `hsl(${hash}, 60%, 42%)`
    };
  }

  function registrarHistorico(acao, detalhe) {
    estado.historico = estado.historico || [];
    estado.historico.unshift({
      data: new Date().toISOString(),
      acao,
      detalhe
    });
    if (estado.historico.length > 30) {
      estado.historico.length = 30;
    }
  }

  function salvarEAtualizar() {
    salvarEstado(estado);
    renderizarTudo();
  }

  /* ==================== NAVEGAÇÃO ==================== */

  function ativarTela(nomeTela) {
    document.querySelectorAll('.tela').forEach((sec) => {
      const ativa = sec.id === `tela-${nomeTela}`;
      sec.hidden = !ativa;
      sec.classList.toggle('ativa', ativa);
    });
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('ativo', btn.dataset.tela === nomeTela);
    });
  }

  function configurarNavegacao() {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => ativarTela(btn.dataset.tela));
    });
  }

  /* ==================== DASHBOARD ==================== */

  function renderizarDashboard() {
    const validacao = validarGradeCompleta(estado);

    const indicadores = [
      { rotulo: 'Professores', valor: estado.professores.length },
      { rotulo: 'Disciplinas', valor: estado.disciplinas.length },
      { rotulo: 'Turmas', valor: estado.turmas.length },
      { rotulo: 'Faixas de horário', valor: estado.horarios.length },
      { rotulo: 'Aulas alocadas', valor: estado.alocacoes.length },
      { rotulo: 'Conflitos', valor: validacao.conflitos.length, alerta: validacao.conflitos.length > 0 }
    ];

    document.getElementById('cards-resumo').innerHTML = indicadores
      .map(
        (ind) => `
        <div class="card-indicador ${ind.alerta ? 'alerta' : ''}">
          <div class="valor">${ind.valor}</div>
          <div class="rotulo">${escapar(ind.rotulo)}</div>
        </div>`
      )
      .join('');

    const elConflitos = document.getElementById('lista-conflitos-dashboard');
    elConflitos.innerHTML =
      validacao.conflitos.length === 0
        ? '<p class="alerta-item ok">Nenhum conflito de professor, turma ou habilitação detectado.</p>'
        : validacao.conflitos.map((c) => `<div class="alerta-item erro">${escapar(c.mensagem)}</div>`).join('');

    const elCarga = document.getElementById('lista-carga-dashboard');
    elCarga.innerHTML =
      validacao.cargaHoraria.length === 0
        ? '<p class="alerta-item ok">Nenhuma pendência de carga horária nas aulas alocadas.</p>'
        : validacao.cargaHoraria
            .map(
              (c) =>
                `<div class="alerta-item ${c.status === 'excesso' ? 'erro' : 'aviso'}">${escapar(c.mensagem)}</div>`
            )
            .join('');

    const badge = document.getElementById('status-grade-badge');
    const btnAprovar = document.getElementById('btn-aprovar-grade');
    if (estado.gradeAprovada) {
      badge.className = 'badge-status aprovada';
      badge.textContent = 'Aprovada';
      btnAprovar.textContent = 'Reabrir para edição';
    } else {
      badge.className = 'badge-status rascunho';
      badge.textContent = 'Rascunho';
      btnAprovar.textContent = 'Aprovar grade';
    }

    const elHist = document.getElementById('lista-historico-dashboard');
    const hist = (estado.historico || []).slice(0, 10);
    elHist.innerHTML =
      hist.length === 0
        ? '<p class="texto-vazio">Nenhuma alteração registrada ainda.</p>'
        : hist
            .map((h) => {
              const hora = new Date(h.data).toLocaleString('pt-BR');
              return `<div class="alerta-item ok"><strong>${escapar(h.acao)}</strong> (${escapar(hora)}): ${escapar(h.detalhe)}</div>`;
            })
            .join('');
  }

  /* ==================== PROFESSORES E DISPONIBILIDADE ==================== */

  function renderizarProfessores() {
    const opcoesEl = document.getElementById('prof-disciplinas-opcoes');
    opcoesEl.innerHTML =
      estado.disciplinas.length === 0
        ? '<p class="texto-vazio">Cadastre disciplinas primeiro para vincular habilitações.</p>'
        : estado.disciplinas
            .map(
              (d) => `
              <label class="checkbox-item">
                <input type="checkbox" name="prof-disc" value="${escapar(d.id)}">
                ${escapar(d.nome)}
              </label>`
            )
            .join('');

    const listaEl = document.getElementById('lista-professores');
    if (estado.professores.length === 0) {
      listaEl.innerHTML = '<p class="texto-vazio">Nenhum professor cadastrado.</p>';
      document.getElementById('painel-disponibilidade').hidden = true;
      return;
    }

    listaEl.innerHTML = `
      <table>
        <thead>
          <tr><th>Nome</th><th>Disciplinas habilitadas</th><th>Indisponibilidades</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${estado.professores
            .map((p) => {
              const nomesDisc = (p.disciplinaIds || [])
                .map((id) => buscar(estado.disciplinas, id)?.nome)
                .filter(Boolean)
                .join(', ');
              const qtdIndisp = (p.indisponibilidades || []).length;
              return `
                <tr>
                  <td>${escapar(p.nome)}</td>
                  <td>${escapar(nomesDisc || 'Todas / não especificado')}</td>
                  <td>${qtdIndisp === 0 ? 'Livre' : `${qtdIndisp} horário(s)`}</td>
                  <td class="acoes-linha">
                    <button type="button" class="btn btn-secundario btn-pequeno" data-disp-prof="${escapar(p.id)}">Disponibilidade</button>
                    <button type="button" class="btn btn-secundario btn-pequeno" data-editar-prof="${escapar(p.id)}">Editar</button>
                    <button type="button" class="btn btn-perigo btn-pequeno" data-excluir-prof="${escapar(p.id)}">Excluir</button>
                  </td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>`;

    renderizarPainelDisponibilidade();
  }

  function renderizarPainelDisponibilidade() {
    const painel = document.getElementById('painel-disponibilidade');
    const prof = professorDisponibilidadeId ? buscar(estado.professores, professorDisponibilidadeId) : null;
    if (!prof) {
      painel.hidden = true;
      return;
    }

    painel.hidden = false;
    document.getElementById('titulo-disponibilidade').textContent = `Disponibilidade — ${prof.nome}`;
    const gradeEl = document.getElementById('grade-disponibilidade');
    const horarios = horariosOrdenados();

    if (horarios.length === 0) {
      gradeEl.innerHTML = '<p class="texto-vazio">Cadastre faixas de horário primeiro para marcar a disponibilidade.</p>';
      return;
    }

    gradeEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Horário</th>
            ${DIAS_SEMANA.map((d) => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${horarios
            .map((h) => {
              const celulas = DIAS_SEMANA.map((dia) => {
                const indisp = (prof.indisponibilidades || []).some((i) => i.dia === dia && i.horarioId === h.id);
                const classe = indisp ? 'indisponivel' : 'disponivel';
                const texto = indisp ? 'Indisponível' : 'Disponível';
                return `
                  <td>
                    <button type="button" class="btn-disp ${classe}" data-toggle-disp-dia="${dia}" data-toggle-disp-hor="${escapar(h.id)}">
                      ${texto}
                    </button>
                  </td>`;
              }).join('');
              return `<tr><th>${escapar(h.rotulo)}<br><small>${escapar(h.inicio)}–${escapar(h.fim)}</small></th>${celulas}</tr>`;
            })
            .join('')}
        </tbody>
      </table>`;
  }

  function limparFormProfessor() {
    document.getElementById('prof-id').value = '';
    document.getElementById('prof-nome').value = '';
    document.querySelectorAll('input[name="prof-disc"]').forEach((cb) => (cb.checked = false));
    document.getElementById('titulo-form-professor').textContent = 'Novo professor';
    document.getElementById('btn-cancelar-prof').hidden = true;
  }

  /* ==================== DISCIPLINAS ==================== */

  function renderizarDisciplinas() {
    const listaEl = document.getElementById('lista-disciplinas');
    if (estado.disciplinas.length === 0) {
      listaEl.innerHTML = '<p class="texto-vazio">Nenhuma disciplina cadastrada.</p>';
      return;
    }

    listaEl.innerHTML = `
      <table>
        <thead>
          <tr><th>Disciplina</th><th>Aulas/semana</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${estado.disciplinas
            .map(
              (d) => `
              <tr>
                <td>${escapar(d.nome)}</td>
                <td>${Number(d.cargaSemanal)}</td>
                <td class="acoes-linha">
                  <button type="button" class="btn btn-secundario btn-pequeno" data-editar-disc="${escapar(d.id)}">Editar</button>
                  <button type="button" class="btn btn-perigo btn-pequeno" data-excluir-disc="${escapar(d.id)}">Excluir</button>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  }

  function limparFormDisciplina() {
    document.getElementById('disc-id').value = '';
    document.getElementById('disc-nome').value = '';
    document.getElementById('disc-carga').value = '2';
    document.getElementById('titulo-form-disciplina').textContent = 'Nova disciplina';
    document.getElementById('btn-cancelar-disc').hidden = true;
  }

  /* ==================== TURMAS E HORÁRIOS ==================== */

  function renderizarTurmasEHorarios() {
    const listaTurmas = document.getElementById('lista-turmas');
    listaTurmas.innerHTML =
      estado.turmas.length === 0
        ? '<p class="texto-vazio">Nenhuma turma cadastrada.</p>'
        : `
          <table>
            <thead><tr><th>Turma</th><th>Nível</th><th>Turno</th><th>Ações</th></tr></thead>
            <tbody>
              ${estado.turmas
                .map(
                  (t) => `
                  <tr>
                    <td>${escapar(t.nome)}</td>
                    <td>${escapar(t.nivel)}</td>
                    <td>${escapar(t.turno)}</td>
                    <td class="acoes-linha">
                      <button type="button" class="btn btn-secundario btn-pequeno" data-editar-turma="${escapar(t.id)}">Editar</button>
                      <button type="button" class="btn btn-perigo btn-pequeno" data-excluir-turma="${escapar(t.id)}">Excluir</button>
                    </td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`;

    const listaHorarios = document.getElementById('lista-horarios');
    const ordenados = horariosOrdenados();
    listaHorarios.innerHTML =
      ordenados.length === 0
        ? '<p class="texto-vazio">Nenhuma faixa de horário cadastrada.</p>'
        : `
          <table>
            <thead><tr><th>Rótulo</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
            <tbody>
              ${ordenados
                .map(
                  (h) => `
                  <tr>
                    <td>${escapar(h.rotulo)}</td>
                    <td>${escapar(h.inicio)}</td>
                    <td>${escapar(h.fim)}</td>
                    <td class="acoes-linha">
                      <button type="button" class="btn btn-secundario btn-pequeno" data-editar-horario="${escapar(h.id)}">Editar</button>
                      <button type="button" class="btn btn-perigo btn-pequeno" data-excluir-horario="${escapar(h.id)}">Excluir</button>
                    </td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`;
  }

  function limparFormTurma() {
    document.getElementById('turma-id').value = '';
    document.getElementById('turma-nome').value = '';
    document.getElementById('turma-nivel').value = 'Fundamental';
    document.getElementById('turma-turno').value = 'Manhã';
    document.getElementById('titulo-form-turma').textContent = 'Nova turma';
    document.getElementById('btn-cancelar-turma').hidden = true;
  }

  function limparFormHorario() {
    document.getElementById('horario-id').value = '';
    document.getElementById('horario-rotulo').value = '';
    document.getElementById('horario-inicio').value = '07:30';
    document.getElementById('horario-fim').value = '08:20';
    document.getElementById('titulo-form-horario').textContent = 'Nova faixa de horário';
    document.getElementById('btn-cancelar-horario').hidden = true;
  }

  /* ==================== ALOCAÇÃO ==================== */

  function preencherSelect(selectEl, itens, textoPadrao, formatarFn) {
    const valorAtual = selectEl.value;
    selectEl.innerHTML =
      `<option value="">${escapar(textoPadrao)}</option>` +
      itens.map((item) => `<option value="${escapar(item.id)}">${escapar(formatarFn(item))}</option>`).join('');
    if (itens.some((i) => i.id === valorAtual)) {
      selectEl.value = valorAtual;
    }
  }

  function atualizarProgressoCarga() {
    const el = document.getElementById('aloc-progresso-carga');
    const discId = document.getElementById('aloc-disciplina').value;
    const turmaIds = Array.from(document.querySelectorAll('input[name="aloc-turma"]:checked')).map((c) => c.value);

    if (!discId || turmaIds.length === 0) {
      el.textContent = '';
      return;
    }

    const disc = buscar(estado.disciplinas, discId);
    if (!disc) return;

    const textos = turmaIds.map((tid) => {
      const turma = buscar(estado.turmas, tid);
      const qtd = estado.alocacoes.filter(
        (a) => a.disciplinaId === discId && (a.turmaIds || []).includes(tid)
      ).length;
      return `${turma?.nome || tid}: ${qtd}/${disc.cargaSemanal} aulas`;
    });

    el.textContent = `Carga atual — ${textos.join(' | ')}`;
  }

  function renderizarAlocacao() {
    const turmasMarcadas = new Set(
      Array.from(document.querySelectorAll('input[name="aloc-turma"]:checked')).map((c) => c.value)
    );

    preencherSelect(document.getElementById('aloc-disciplina'), estado.disciplinas, 'Selecione a disciplina', (d) => `${d.nome} (${d.cargaSemanal}x/sem)`);
    preencherSelect(document.getElementById('aloc-professor'), estado.professores, 'Selecione o professor', (p) => p.nome);
    preencherSelect(
      document.getElementById('aloc-horario'),
      horariosOrdenados(),
      'Selecione o horário',
      (h) => `${h.rotulo} (${h.inicio}–${h.fim})`
    );

    const selDia = document.getElementById('aloc-dia');
    const diaAtual = selDia.value;
    selDia.innerHTML =
      '<option value="">Selecione o dia</option>' +
      DIAS_SEMANA.map((d) => `<option value="${d}">${d}</option>`).join('');
    if (DIAS_SEMANA.includes(diaAtual)) selDia.value = diaAtual;

    const turmasOpcoes = document.getElementById('aloc-turmas-opcoes');
    turmasOpcoes.innerHTML =
      estado.turmas.length === 0
        ? '<p class="texto-vazio">Cadastre turmas primeiro.</p>'
        : estado.turmas
            .map(
              (t) => `
              <label class="checkbox-item">
                <input type="checkbox" name="aloc-turma" value="${escapar(t.id)}" ${turmasMarcadas.has(t.id) ? 'checked' : ''}>
                ${escapar(t.nome)} (${escapar(t.nivel)})
              </label>`
            )
            .join('');

    atualizarProgressoCarga();

    preencherSelect(document.getElementById('gen-turma'), estado.turmas, 'Todas as turmas', (t) => `${t.nome} (${t.nivel})`);

    const listaEl = document.getElementById('lista-alocacoes');
    if (estado.alocacoes.length === 0) {
      listaEl.innerHTML = '<p class="texto-vazio">Nenhuma aula alocada ainda.</p>';
      return;
    }

    listaEl.innerHTML = `
      <table>
        <thead>
          <tr><th>Dia / Horário</th><th>Turma(s)</th><th>Disciplina</th><th>Professor</th><th>Ações</th></tr>
        </thead>
        <tbody>
          ${estado.alocacoes
            .map((a) => {
              const disc = buscar(estado.disciplinas, a.disciplinaId)?.nome || '—';
              const prof = buscar(estado.professores, a.professorId)?.nome || '—';
              const hor = buscar(estado.horarios, a.horarioId);
              const turmasNomes = (a.turmaIds || [])
                .map((id) => buscar(estado.turmas, id)?.nome || id)
                .join(' + ');
              const tagConjunta = (a.turmaIds || []).length > 1 ? ' <span class="tag-conjunta">Conjunta</span>' : '';

              return `
                <tr>
                  <td>${escapar(a.dia)}<br><small>${hor ? escapar(`${hor.rotulo} (${hor.inicio}–${hor.fim})`) : '—'}</small></td>
                  <td>${escapar(turmasNomes)}${tagConjunta}</td>
                  <td>${escapar(disc)}</td>
                  <td>${escapar(prof)}</td>
                  <td class="acoes-linha">
                    <button type="button" class="btn btn-secundario btn-pequeno" data-editar-aloc="${escapar(a.id)}">Editar</button>
                    <button type="button" class="btn btn-perigo btn-pequeno" data-excluir-aloc="${escapar(a.id)}">Remover</button>
                  </td>
                </tr>`;
            })
            .join('')}
        </tbody>
      </table>`;
  }

  function mostrarFeedbackAlocacao(tipo, mensagens) {
    const el = document.getElementById('aloc-feedback');
    el.className = `feedback ${tipo}`;
    el.innerHTML = mensagens.map((m) => `<div>${escapar(m)}</div>`).join('');
    el.hidden = false;
  }

  function limparFormAlocacao() {
    document.getElementById('aloc-id').value = '';
    document.getElementById('aloc-disciplina').value = '';
    document.getElementById('aloc-professor').value = '';
    document.getElementById('aloc-dia').value = '';
    document.getElementById('aloc-horario').value = '';
    document.getElementById('aloc-geminada').checked = false;
    document.querySelectorAll('input[name="aloc-turma"]').forEach((cb) => (cb.checked = false));
    document.getElementById('titulo-form-alocacao').textContent = 'Alocar aula';
    document.getElementById('btn-cancelar-aloc').hidden = true;
    atualizarProgressoCarga();
  }

  /* ==================== QUADRO E SUBSTITUTOS ==================== */

  function atualizarOpcoesFiltroQuadro() {
    const visao = document.getElementById('quadro-visao').value;
    const filtroEl = document.getElementById('quadro-filtro');
    const anterior = filtroEl.value;

    let itens = [];
    if (visao === 'turma') {
      itens = estado.turmas.map((t) => ({ id: t.id, label: `${t.nome} (${t.nivel})` }));
    } else if (visao === 'professor') {
      itens = estado.professores.map((p) => ({ id: p.id, label: p.nome }));
    } else {
      itens = DIAS_SEMANA.map((d) => ({ id: d, label: d }));
    }

    filtroEl.innerHTML =
      itens.length === 0
        ? '<option value="">Nenhum item cadastrado</option>'
        : itens.map((i) => `<option value="${escapar(i.id)}">${escapar(i.label)}</option>`).join('');

    if (itens.some((i) => i.id === anterior)) {
      filtroEl.value = anterior;
    }
  }

  function renderizarQuadro() {
    atualizarOpcoesFiltroQuadro();

    const visao = document.getElementById('quadro-visao').value;
    const filtroId = document.getElementById('quadro-filtro').value;
    const tituloEl = document.getElementById('quadro-titulo-resultado');
    const conteudoEl = document.getElementById('quadro-conteudo');

    const ordenados = horariosOrdenados();
    if (ordenados.length === 0 || !filtroId) {
      tituloEl.textContent = 'Grade semanal';
      conteudoEl.innerHTML = '<p class="texto-vazio">Cadastre turmas, horários e alocações para visualizar o quadro.</p>';
      renderizarPainelSubstituto();
      return;
    }

    if (visao === 'dia') {
      tituloEl.textContent = `Quadro de ${filtroId}`;
      if (estado.turmas.length === 0) {
        conteudoEl.innerHTML = '<p class="texto-vazio">Nenhuma turma cadastrada.</p>';
        renderizarPainelSubstituto();
        return;
      }

      conteudoEl.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Horário</th>
              ${estado.turmas.map((t) => `<th>${escapar(t.nome)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${ordenados
              .map((h) => {
                const celulas = estado.turmas
                  .map((t) => {
                    const aulas = estado.alocacoes.filter(
                      (a) => a.dia === filtroId && a.horarioId === h.id && (a.turmaIds || []).includes(t.id)
                    );
                    return `<td>${renderizarCelulas(aulas, 'turma', { dia: filtroId, horarioId: h.id, turmaId: t.id })}</td>`;
                  })
                  .join('');
                return `<tr><th>${escapar(h.rotulo)}<br><small>${escapar(h.inicio)}–${escapar(h.fim)}</small></th>${celulas}</tr>`;
              })
              .join('')}
          </tbody>
        </table>`;
      renderizarPainelSubstituto();
      return;
    }

    const nomeFiltro =
      visao === 'turma'
        ? buscar(estado.turmas, filtroId)?.nome || ''
        : buscar(estado.professores, filtroId)?.nome || '';
    tituloEl.textContent = `Quadro semanal — ${nomeFiltro}`;

    conteudoEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Horário</th>
            ${DIAS_SEMANA.map((d) => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${ordenados
            .map((h) => {
              const celulas = DIAS_SEMANA.map((dia) => {
                const aulas = estado.alocacoes.filter((a) => {
                  if (a.dia !== dia || a.horarioId !== h.id) return false;
                  return visao === 'turma' ? (a.turmaIds || []).includes(filtroId) : a.professorId === filtroId;
                });
                const ctx = visao === 'turma' ? { dia, horarioId: h.id, turmaId: filtroId } : { dia, horarioId: h.id, professorId: filtroId };
                return `<td data-drop-dia="${dia}" data-drop-hor="${escapar(h.id)}">${renderizarCelulas(aulas, visao, ctx, true)}</td>`;
              }).join('');
              return `<tr><th>${escapar(h.rotulo)}<br><small>${escapar(h.inicio)}–${escapar(h.fim)}</small></th>${celulas}</tr>`;
            })
            .join('')}
        </tbody>
      </table>`;

    renderizarPainelSubstituto();
  }

  function renderizarCelulas(aulas, visao, contextoVazio, permitirArrastar = false) {
    if (aulas.length === 0) {
      if (!contextoVazio) return '<span class="texto-vazio">—</span>';
      const attrs = [
        `data-atalho-dia="${escapar(contextoVazio.dia)}"`,
        `data-atalho-hor="${escapar(contextoVazio.horarioId)}"`,
        contextoVazio.turmaId ? `data-atalho-turma="${escapar(contextoVazio.turmaId)}"` : '',
        contextoVazio.professorId ? `data-atalho-prof="${escapar(contextoVazio.professorId)}"` : ''
      ]
        .filter(Boolean)
        .join(' ');
      return `<button type="button" class="btn-alocar-celula no-print" ${attrs}>+ Alocar</button>`;
    }

    return aulas
      .map((a) => {
        const disc = buscar(estado.disciplinas, a.disciplinaId)?.nome || '—';
        const prof = buscar(estado.professores, a.professorId)?.nome || '—';
        const turmas = (a.turmaIds || []).map((id) => buscar(estado.turmas, id)?.nome || id).join(' + ');
        const detalhe = visao === 'professor' ? turmas : prof;
        const conjunta = (a.turmaIds || []).length > 1 ? '<div class="tag-conjunta">Conjunta</div>' : '';
        const cores = corDisciplina(a.disciplinaId);
        const dragAttr = permitirArrastar ? `draggable="true" data-drag-aloc="${escapar(a.id)}"` : '';
        const titleAttr = a.motivo ? `title="Motivo: ${escapar(a.motivo)}"` : '';

        return `
          <div class="celula-aula" ${dragAttr} ${titleAttr} style="background:${cores.fundo};border-left-color:${cores.borda};">
            <strong>${escapar(disc)}</strong><br>
            <small>${escapar(detalhe)}</small>
            ${conjunta}
          </div>`;
      })
      .join('');
  }

  function renderizarPainelSubstituto() {
    const selDia = document.getElementById('sub-dia');
    const diaAtual = selDia.value;
    selDia.innerHTML =
      '<option value="">Selecione o dia</option>' +
      DIAS_SEMANA.map((d) => `<option value="${d}">${d}</option>`).join('');
    if (DIAS_SEMANA.includes(diaAtual)) selDia.value = diaAtual;

    preencherSelect(document.getElementById('sub-horario'), horariosOrdenados(), 'Selecione o horário', (h) => `${h.rotulo} (${h.inicio}–${h.fim})`);
    preencherSelect(document.getElementById('sub-disciplina'), estado.disciplinas, 'Qualquer disciplina', (d) => d.nome);

    atualizarResultadoSubstitutos();
  }

  function atualizarResultadoSubstitutos() {
    const dia = document.getElementById('sub-dia').value;
    const horarioId = document.getElementById('sub-horario').value;
    const disciplinaId = document.getElementById('sub-disciplina').value || null;
    const resEl = document.getElementById('resultado-substitutos');

    if (!dia || !horarioId) {
      resEl.innerHTML = '<p class="texto-vazio">Escolha o dia e o horário para listar professores disponíveis.</p>';
      return;
    }

    const { habilitadosLivres, outrosLivres } = sugerirSubstitutos(estado, { dia, horarioId, disciplinaId });
    if (habilitadosLivres.length === 0 && outrosLivres.length === 0) {
      resEl.innerHTML = '<div class="alerta-item erro">Nenhum professor livre e disponível neste horário.</div>';
      return;
    }

    const blocos = [];
    if (habilitadosLivres.length > 0) {
      blocos.push(
        `<div class="alerta-item ok"><strong>Livres e habilitados:</strong> ${escapar(
          habilitadosLivres.map((p) => p.nome).join(', ')
        )}</div>`
      );
    }
    if (outrosLivres.length > 0 && disciplinaId) {
      blocos.push(
        `<div class="alerta-item aviso"><strong>Livres (outras disciplinas):</strong> ${escapar(
          outrosLivres.map((p) => p.nome).join(', ')
        )}</div>`
      );
    }
    resEl.innerHTML = blocos.join('');
  }

  function baixarArquivo(nomeArquivo, conteudo, tipoMime) {
    const blob = new Blob([conteudo], { type: tipoMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ==================== EVENTOS ==================== */

  function configurarEventos() {
    // Dashboard ações
    document.getElementById('btn-aprovar-grade').addEventListener('click', () => {
      const fb = document.getElementById('feedback-dashboard');
      if (estado.gradeAprovada) {
        estado.gradeAprovada = false;
        registrarHistorico('reabertura', 'Grade reaberta para edição.');
        fb.className = 'feedback sucesso';
        fb.textContent = 'Grade reaberta para edição.';
        fb.hidden = false;
        salvarEAtualizar();
        return;
      }

      const validacao = validarGradeCompleta(estado);
      if (validacao.conflitos.length > 0 || validacao.cargaHoraria.length > 0) {
        fb.className = 'feedback erro';
        fb.textContent = `Não é possível aprovar: há ${validacao.conflitos.length} conflito(s) e ${validacao.cargaHoraria.length} pendência(s) de carga horária.`;
        fb.hidden = false;
        return;
      }

      estado.gradeAprovada = true;
      registrarHistorico('aprovacao', 'Grade aprovada sem conflitos nem pendências de carga.');
      fb.className = 'feedback sucesso';
      fb.textContent = 'Grade aprovada e publicada com sucesso!';
      fb.hidden = false;
      salvarEAtualizar();
    });

    document.getElementById('btn-carregar-exemplo').addEventListener('click', () => {
      estado = criarDadosExemplo();
      professorDisponibilidadeId = null;
      alternativasGeradas = [];
      salvarEAtualizar();
    });

    document.getElementById('btn-limpar-tudo').addEventListener('click', () => {
      if (!confirm('Deseja realmente apagar todos os dados salvos no navegador?')) return;
      estado = criarEstadoVazio();
      professorDisponibilidadeId = null;
      salvarEAtualizar();
    });

    document.getElementById('btn-exportar-json').addEventListener('click', () => {
      baixarArquivo('backup-horarios-liceu.json', JSON.stringify(estado, null, 2), 'application/json');
    });

    document.getElementById('input-importar-json').addEventListener('change', (ev) => {
      const arquivo = ev.target.files?.[0];
      if (!arquivo) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        try {
          const dados = JSON.parse(String(leitor.result));
          estado = {
            professores: dados.professores || [],
            disciplinas: dados.disciplinas || [],
            turmas: dados.turmas || [],
            horarios: dados.horarios || [],
            alocacoes: dados.alocacoes || []
          };
          professorDisponibilidadeId = null;
          salvarEAtualizar();
        } catch {
          alert('Arquivo JSON inválido.');
        }
      };
      leitor.readAsText(arquivo);
      ev.target.value = '';
    });

    // Form Professor
    document.getElementById('form-professor').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = document.getElementById('prof-id').value;
      const nome = document.getElementById('prof-nome').value.trim();
      const disciplinaIds = Array.from(document.querySelectorAll('input[name="prof-disc"]:checked')).map((c) => c.value);
      if (!nome) return;

      if (id) {
        const alvo = buscar(estado.professores, id);
        if (alvo) {
          alvo.nome = nome;
          alvo.disciplinaIds = disciplinaIds;
        }
      } else {
        estado.professores.push({ id: gerarId('prof'), nome, disciplinaIds, indisponibilidades: [] });
      }
      limparFormProfessor();
      salvarEAtualizar();
    });

    document.getElementById('btn-cancelar-prof').addEventListener('click', limparFormProfessor);
    document.getElementById('btn-fechar-disp').addEventListener('click', () => {
      professorDisponibilidadeId = null;
      document.getElementById('painel-disponibilidade').hidden = true;
    });

    // Form Disciplina
    document.getElementById('form-disciplina').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = document.getElementById('disc-id').value;
      const nome = document.getElementById('disc-nome').value.trim();
      const cargaSemanal = Number(document.getElementById('disc-carga').value) || 1;
      if (!nome) return;

      if (id) {
        const alvo = buscar(estado.disciplinas, id);
        if (alvo) {
          alvo.nome = nome;
          alvo.cargaSemanal = cargaSemanal;
        }
      } else {
        estado.disciplinas.push({ id: gerarId('disc'), nome, cargaSemanal });
      }
      limparFormDisciplina();
      salvarEAtualizar();
    });

    document.getElementById('btn-cancelar-disc').addEventListener('click', limparFormDisciplina);

    // Form Turma
    document.getElementById('form-turma').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = document.getElementById('turma-id').value;
      const nome = document.getElementById('turma-nome').value.trim();
      const nivel = document.getElementById('turma-nivel').value;
      const turno = document.getElementById('turma-turno').value;
      if (!nome) return;

      if (id) {
        const alvo = buscar(estado.turmas, id);
        if (alvo) {
          alvo.nome = nome;
          alvo.nivel = nivel;
          alvo.turno = turno;
        }
      } else {
        estado.turmas.push({ id: gerarId('tur'), nome, nivel, turno });
      }
      limparFormTurma();
      salvarEAtualizar();
    });

    document.getElementById('btn-cancelar-turma').addEventListener('click', limparFormTurma);

    // Form Horário
    document.getElementById('form-horario').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = document.getElementById('horario-id').value;
      const rotulo = document.getElementById('horario-rotulo').value.trim();
      const inicio = document.getElementById('horario-inicio').value;
      const fim = document.getElementById('horario-fim').value;
      if (!rotulo || !inicio || !fim) return;

      if (id) {
        const alvo = buscar(estado.horarios, id);
        if (alvo) {
          alvo.rotulo = rotulo;
          alvo.inicio = inicio;
          alvo.fim = fim;
        }
      } else {
        estado.horarios.push({ id: gerarId('hor'), rotulo, inicio, fim });
      }
      limparFormHorario();
      salvarEAtualizar();
    });

    document.getElementById('btn-cancelar-horario').addEventListener('click', limparFormHorario);

    // Progresso de carga ao mudar campos da alocação
    document.getElementById('aloc-disciplina').addEventListener('change', atualizarProgressoCarga);
    document.getElementById('aloc-turmas-opcoes').addEventListener('change', atualizarProgressoCarga);

    // Form Alocação (suporta aula simples e aula geminada)
    document.getElementById('form-alocacao').addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (estado.gradeAprovada) {
        mostrarFeedbackAlocacao('erro', ['A grade está aprovada. Clique em "Reabrir para edição" no Dashboard para alterar.']);
        return;
      }
      const id = document.getElementById('aloc-id').value || null;
      const geminada = document.getElementById('aloc-geminada').checked && !id;

      const base = {
        id: id || gerarId('aloc'),
        disciplinaId: document.getElementById('aloc-disciplina').value,
        professorId: document.getElementById('aloc-professor').value,
        turmaIds: Array.from(document.querySelectorAll('input[name="aloc-turma"]:checked')).map((c) => c.value),
        dia: document.getElementById('aloc-dia').value,
        horarioId: document.getElementById('aloc-horario').value
      };

      const res1 = validarAlocacao(base, estado, id);
      if (!res1.valido) {
        mostrarFeedbackAlocacao('erro', res1.erros.map((e) => e.mensagem));
        return;
      }

      if (geminada) {
        const ordenados = horariosOrdenados();
        const idxAtual = ordenados.findIndex((h) => h.id === base.horarioId);
        const proximoHorario = idxAtual >= 0 ? ordenados[idxAtual + 1] : null;
        if (!proximoHorario) {
          mostrarFeedbackAlocacao('erro', ['Não existe um próximo horário cadastrado para formar aula geminada.']);
          return;
        }

        const segundaAula = { ...base, id: gerarId('aloc'), horarioId: proximoHorario.id };
        const estadoSimulado = { ...estado, alocacoes: [...estado.alocacoes, base] };
        const res2 = validarAlocacao(segundaAula, estadoSimulado);
        if (!res2.valido) {
          mostrarFeedbackAlocacao('erro', [
            'Não foi possível alocar a 2ª aula da geminada:',
            ...res2.erros.map((e) => e.mensagem)
          ]);
          return;
        }

        estado.alocacoes.push(base, segundaAula);
        registrarHistorico('alocacao', `Aula geminada alocada (${base.dia}).`);
        mostrarFeedbackAlocacao('sucesso', ['Aula geminada (2 horários seguidos) salva sem conflitos!']);
      } else {
        if (id) {
          const idx = estado.alocacoes.findIndex((a) => a.id === id);
          if (idx >= 0) estado.alocacoes[idx] = base;
          registrarHistorico('edicao', `Alocação editada (${base.dia}).`);
        } else {
          estado.alocacoes.push(base);
          registrarHistorico('alocacao', `Nova aula alocada (${base.dia}).`);
        }
        mostrarFeedbackAlocacao('sucesso', ['Alocação salva sem conflitos!']);
      }

      limparFormAlocacao();
      salvarEAtualizar();
    });

    // Gerador automático (3 alternativas)
    document.getElementById('btn-gerar-alternativas').addEventListener('click', () => {
      const turmaId = document.getElementById('gen-turma').value || null;
      alternativasGeradas = gerarAlternativas(estado, { turmaId });
      const el = document.getElementById('lista-alternativas');

      if (alternativasGeradas.every((a) => a.totalAdicionadas === 0 && a.naoAlocadas.length === 0)) {
        el.innerHTML = '<p class="alerta-item ok">Todas as disciplinas iniciadas já estão com a carga horária completa!</p>';
        return;
      }

      el.innerHTML = alternativasGeradas
        .map(
          (alt, idx) => `
          <div class="card-alternativa">
            <div class="nota">${alt.pontuacao}/100</div>
            <div><strong>Alternativa ${idx + 1}</strong> · Semente ${alt.semente}</div>
            <div class="texto-vazio">${alt.totalAdicionadas} aula(s) adicionada(s), ${alt.naoAlocadas.length} não encaixada(s).</div>
            <button type="button" class="btn btn-primario btn-pequeno" data-aplicar-alt="${idx}">Aplicar alternativa</button>
          </div>`
        )
        .join('');
    });

    document.getElementById('btn-cancelar-aloc').addEventListener('click', () => {
      limparFormAlocacao();
      document.getElementById('aloc-feedback').hidden = true;
    });

    // Quadro filtros, exportação CSV, impressão e substitutos
    document.getElementById('quadro-visao').addEventListener('change', renderizarQuadro);
    document.getElementById('quadro-filtro').addEventListener('change', renderizarQuadro);
    document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

    document.getElementById('btn-exportar-csv-visao').addEventListener('click', () => {
      const visao = document.getElementById('quadro-visao').value;
      const filtroId = document.getElementById('quadro-filtro').value;
      const csv = gerarCsvQuadro(estado, { visao, filtroId });
      baixarArquivo(`horario-${visao}.csv`, csv, 'text/csv;charset=utf-8');
    });

    document.getElementById('btn-exportar-csv-tudo').addEventListener('click', () => {
      const csv = gerarCsvQuadro(estado, { visao: 'completa' });
      baixarArquivo('horario-completo.csv', csv, 'text/csv;charset=utf-8');
    });

    ['sub-dia', 'sub-horario', 'sub-disciplina'].forEach((id) => {
      document.getElementById(id).addEventListener('change', atualizarResultadoSubstitutos);
    });

    // Arrastar e soltar (Drag & Drop) no Quadro
    const quadroConteudo = document.getElementById('quadro-conteudo');
    quadroConteudo.addEventListener('dragstart', (ev) => {
      const card = ev.target.closest('[data-drag-aloc]');
      if (!card) return;
      arrastandoAlocacaoId = card.dataset.dragAloc;
      ev.dataTransfer.effectAllowed = 'move';
    });

    quadroConteudo.addEventListener('dragover', (ev) => {
      const td = ev.target.closest('td[data-drop-dia]');
      if (!td || !arrastandoAlocacaoId) return;
      ev.preventDefault();
      td.classList.add('celula-drop-ativa');
    });

    quadroConteudo.addEventListener('dragleave', (ev) => {
      const td = ev.target.closest('td[data-drop-dia]');
      if (td) td.classList.remove('celula-drop-ativa');
    });

    quadroConteudo.addEventListener('drop', (ev) => {
      const td = ev.target.closest('td[data-drop-dia]');
      if (!td || !arrastandoAlocacaoId) return;
      ev.preventDefault();
      td.classList.remove('celula-drop-ativa');

      const aloc = buscar(estado.alocacoes, arrastandoAlocacaoId);
      arrastandoAlocacaoId = null;
      if (!aloc) return;

      const fb = document.getElementById('quadro-feedback');
      if (estado.gradeAprovada) {
        fb.className = 'feedback erro';
        fb.textContent = 'A grade está aprovada. Reabra para edição no Dashboard antes de mover aulas.';
        fb.hidden = false;
        return;
      }

      const novoDia = td.dataset.dropDia;
      const novoHorarioId = td.dataset.dropHor;
      if (aloc.dia === novoDia && aloc.horarioId === novoHorarioId) return;

      const tentativa = { ...aloc, dia: novoDia, horarioId: novoHorarioId };
      const res = validarAlocacao(tentativa, estado, aloc.id);

      if (!res.valido) {
        fb.className = 'feedback erro';
        fb.innerHTML = res.erros.map((e) => `<div>${escapar(e.mensagem)}</div>`).join('');
        fb.hidden = false;
        return;
      }

      aloc.dia = novoDia;
      aloc.horarioId = novoHorarioId;
      registrarHistorico('movimento', `Aula movida para ${novoDia}.`);
      fb.className = 'feedback sucesso';
      fb.textContent = `Aula movida para ${novoDia} sem conflitos!`;
      fb.hidden = false;
      salvarEAtualizar();
    });

    // Delegação de cliques para ações em tabelas, disponibilidade e atalhos do quadro
    document.body.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;

      if (btn.dataset.aplicarAlt !== undefined) {
        const alt = alternativasGeradas[Number(btn.dataset.aplicarAlt)];
        if (!alt) return;
        estado.alocacoes.push(...alt.novasAlocacoes);
        registrarHistorico('geracao', `Alternativa ${Number(btn.dataset.aplicarAlt) + 1} aplicada (${alt.totalAdicionadas} aulas, nota ${alt.pontuacao}/100).`);
        document.getElementById('lista-alternativas').innerHTML =
          `<p class="alerta-item ok">Alternativa aplicada! ${alt.totalAdicionadas} aula(s) adicionada(s).</p>`;
        salvarEAtualizar();
      } else if (btn.dataset.dispProf) {
        professorDisponibilidadeId = btn.dataset.dispProf;
        renderizarPainelDisponibilidade();
      } else if (btn.dataset.toggleDispDia && btn.dataset.toggleDispHor) {
        const prof = buscar(estado.professores, professorDisponibilidadeId);
        if (!prof) return;
        prof.indisponibilidades = prof.indisponibilidades || [];
        const dia = btn.dataset.toggleDispDia;
        const horarioId = btn.dataset.toggleDispHor;
        const idx = prof.indisponibilidades.findIndex((i) => i.dia === dia && i.horarioId === horarioId);
        if (idx >= 0) {
          prof.indisponibilidades.splice(idx, 1);
        } else {
          prof.indisponibilidades.push({ dia, horarioId });
        }
        salvarEAtualizar();
      } else if (btn.dataset.atalhoDia && btn.dataset.atalhoHor) {
        limparFormAlocacao();
        document.getElementById('aloc-dia').value = btn.dataset.atalhoDia;
        document.getElementById('aloc-horario').value = btn.dataset.atalhoHor;
        if (btn.dataset.atalhoProf) {
          document.getElementById('aloc-professor').value = btn.dataset.atalhoProf;
        }
        if (btn.dataset.atalhoTurma) {
          document.querySelectorAll('input[name="aloc-turma"]').forEach((cb) => {
            cb.checked = cb.value === btn.dataset.atalhoTurma;
          });
        }
        atualizarProgressoCarga();
        ativarTela('alocacao');
      } else if (btn.dataset.editarProf) {
        const p = buscar(estado.professores, btn.dataset.editarProf);
        if (!p) return;
        document.getElementById('prof-id').value = p.id;
        document.getElementById('prof-nome').value = p.nome;
        document.querySelectorAll('input[name="prof-disc"]').forEach((cb) => {
          cb.checked = (p.disciplinaIds || []).includes(cb.value);
        });
        document.getElementById('titulo-form-professor').textContent = 'Editar professor';
        document.getElementById('btn-cancelar-prof').hidden = false;
      } else if (btn.dataset.excluirProf) {
        const id = btn.dataset.excluirProf;
        if (professorDisponibilidadeId === id) professorDisponibilidadeId = null;
        estado.professores = estado.professores.filter((p) => p.id !== id);
        estado.alocacoes = estado.alocacoes.filter((a) => a.professorId !== id);
        salvarEAtualizar();
      } else if (btn.dataset.editarDisc) {
        const d = buscar(estado.disciplinas, btn.dataset.editarDisc);
        if (!d) return;
        document.getElementById('disc-id').value = d.id;
        document.getElementById('disc-nome').value = d.nome;
        document.getElementById('disc-carga').value = d.cargaSemanal;
        document.getElementById('titulo-form-disciplina').textContent = 'Editar disciplina';
        document.getElementById('btn-cancelar-disc').hidden = false;
      } else if (btn.dataset.excluirDisc) {
        const id = btn.dataset.excluirDisc;
        estado.disciplinas = estado.disciplinas.filter((d) => d.id !== id);
        estado.alocacoes = estado.alocacoes.filter((a) => a.disciplinaId !== id);
        salvarEAtualizar();
      } else if (btn.dataset.editarTurma) {
        const t = buscar(estado.turmas, btn.dataset.editarTurma);
        if (!t) return;
        document.getElementById('turma-id').value = t.id;
        document.getElementById('turma-nome').value = t.nome;
        document.getElementById('turma-nivel').value = t.nivel;
        document.getElementById('turma-turno').value = t.turno;
        document.getElementById('titulo-form-turma').textContent = 'Editar turma';
        document.getElementById('btn-cancelar-turma').hidden = false;
      } else if (btn.dataset.excluirTurma) {
        const id = btn.dataset.excluirTurma;
        estado.turmas = estado.turmas.filter((t) => t.id !== id);
        estado.alocacoes = estado.alocacoes
          .map((a) => ({ ...a, turmaIds: (a.turmaIds || []).filter((tid) => tid !== id) }))
          .filter((a) => a.turmaIds.length > 0);
        salvarEAtualizar();
      } else if (btn.dataset.editarHorario) {
        const h = buscar(estado.horarios, btn.dataset.editarHorario);
        if (!h) return;
        document.getElementById('horario-id').value = h.id;
        document.getElementById('horario-rotulo').value = h.rotulo;
        document.getElementById('horario-inicio').value = h.inicio;
        document.getElementById('horario-fim').value = h.fim;
        document.getElementById('titulo-form-horario').textContent = 'Editar faixa de horário';
        document.getElementById('btn-cancelar-horario').hidden = false;
      } else if (btn.dataset.excluirHorario) {
        const id = btn.dataset.excluirHorario;
        estado.horarios = estado.horarios.filter((h) => h.id !== id);
        estado.alocacoes = estado.alocacoes.filter((a) => a.horarioId !== id);
        salvarEAtualizar();
      } else if (btn.dataset.editarAloc) {
        const a = buscar(estado.alocacoes, btn.dataset.editarAloc);
        if (!a) return;
        document.getElementById('aloc-id').value = a.id;
        document.getElementById('aloc-disciplina').value = a.disciplinaId;
        document.getElementById('aloc-professor').value = a.professorId;
        document.getElementById('aloc-dia').value = a.dia;
        document.getElementById('aloc-horario').value = a.horarioId;
        document.getElementById('aloc-geminada').checked = false;
        document.querySelectorAll('input[name="aloc-turma"]').forEach((cb) => {
          cb.checked = (a.turmaIds || []).includes(cb.value);
        });
        atualizarProgressoCarga();
        document.getElementById('titulo-form-alocacao').textContent = 'Editar alocação';
        document.getElementById('btn-cancelar-aloc').hidden = false;
      } else if (btn.dataset.excluirAloc) {
        const id = btn.dataset.excluirAloc;
        estado.alocacoes = estado.alocacoes.filter((a) => a.id !== id);
        salvarEAtualizar();
      }
    });
  }

  function renderizarTudo() {
    renderizarDashboard();
    renderizarProfessores();
    renderizarDisciplinas();
    renderizarTurmasEHorarios();
    renderizarAlocacao();
    renderizarQuadro();
  }

  configurarNavegacao();
  configurarEventos();
  renderizarTudo();
})();
