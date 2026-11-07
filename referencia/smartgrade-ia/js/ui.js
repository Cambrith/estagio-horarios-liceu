export const DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere]);
}

export function horaCurta(valor) {
  return String(valor || '').slice(0, 5);
}

export function faixaAula(inicio, fim) {
  const marca = (valor) => `${Number(String(valor || '0').slice(0, 2))}h`;
  return `${marca(inicio)}–${marca(fim)}`;
}

export function indice(catalogo) {
  const mapa = (lista) => new Map((lista || []).map((item) => [item.id, item]));
  return {
    turma: mapa(catalogo?.turmas),
    disciplina: mapa(catalogo?.disciplinas),
    professor: mapa(catalogo?.professores),
    sala: mapa(catalogo?.salas),
    horario: mapa(catalogo?.horarios),
    curso: mapa(catalogo?.cursos),
    periodo: mapa(catalogo?.periodos),
  };
}

export function horaChave(valor) {
  return String(valor || '').slice(0, 5);
}

export function statusNoHorario(professorId, horario, disponibilidades) {
  const doProfessor = (disponibilidades || []).filter((item) => item.professor_id === professorId);
  if (!doProfessor.length) return 'disponivel';
  const exatos = doProfessor.filter((item) => item.dia_semana === horario.dia_semana && horaChave(item.hora_inicio) === horaChave(horario.hora_inicio));
  const faixas = doProfessor.filter((item) => item.dia_semana === horario.dia_semana
    && horaChave(item.hora_inicio) <= horaChave(horario.hora_inicio)
    && horaChave(item.hora_fim) >= horaChave(horario.hora_fim));
  const linhas = exatos.length ? exatos : faixas;
  if (!linhas.length) return 'indisponivel';
  if (linhas.some((item) => item.status === 'indisponivel')) return 'indisponivel';
  if (linhas.some((item) => item.status === 'preferencial')) return 'preferencial';
  return 'disponivel';
}

export function toast(mensagem, tipo = 'ok') {
  const caixa = document.getElementById('toast');
  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo}`;
  aviso.textContent = mensagem;
  caixa.appendChild(aviso);
  setTimeout(() => aviso.remove(), 4200);
}

export function abrirModal({ titulo, corpo, aoMontar }) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitulo">
      <header class="modal-head">
        <h2 id="modalTitulo">${escapeHtml(titulo)}</h2>
        <button type="button" class="icon-btn" id="fecharModal" aria-label="Fechar">×</button>
      </header>
      <div class="modal-body">${corpo}</div>
    </div>`;
  modal.hidden = false;
  modal.querySelector('#fecharModal').addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) fecharModal();
  }, { once: true });
  if (aoMontar) aoMontar(modal.querySelector('.modal-body'));
}

export function fecharModal() {
  const modal = document.getElementById('modal');
  modal.hidden = true;
  modal.innerHTML = '';
}

export function podeEditar(usuario) {
  return usuario && (usuario.perfil === 'administrador' || usuario.perfil === 'coordenador');
}

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') fecharModal();
});
