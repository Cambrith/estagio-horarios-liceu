import { estado } from './estado.js';
import { api, getToken, setToken } from './api.js';
import { iniciarGrade, renderGrade } from './grade.js';
import { iniciarPaineis, renderCadastros, renderDashboard, renderDisponibilidade, renderRelatorios, renderRestricoes } from './paineis.js';
import { toast } from './ui.js';

const VISTAS = {
  dashboard: renderDashboard,
  grade: () => renderGrade(),
  cadastros: renderCadastros,
  disponibilidade: renderDisponibilidade,
  restricoes: renderRestricoes,
  relatorios: renderRelatorios,
};

document.getElementById('formLogin').addEventListener('submit', entrar);
document.getElementById('btnSair').addEventListener('click', sair);
document.querySelectorAll('[data-view-link]').forEach((botao) => {
  botao.addEventListener('click', () => mostrar(botao.dataset.viewLink));
});

iniciarGrade({ recarregar });
iniciarPaineis({ recarregar });

if (getToken()) iniciarSessao().catch(() => sair());

async function entrar(evento) {
  evento.preventDefault();
  const botao = evento.target.querySelector('button');
  botao.disabled = true;
  try {
    const dados = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value,
      },
    });
    setToken(dados.token);
    estado.usuario = dados.usuario;
    estado.modo = dados.modo;
    await recarregar();
    abrirAplicacao();
  } catch (erro) {
    toast(erro.message, 'bad');
  } finally {
    botao.disabled = false;
  }
}

async function iniciarSessao() {
  const dados = await api('/api/auth/me');
  estado.usuario = dados.usuario;
  estado.modo = dados.modo;
  await recarregar();
  abrirAplicacao();
}

async function recarregar() {
  const catalogo = await api('/api/catalogo');
  estado.catalogo = catalogo;
  estado.modo = catalogo.modo;
  atualizarModo();
}

function abrirAplicacao() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('appShell').hidden = false;
  document.getElementById('usuarioNome').textContent = estado.usuario.nome;
  document.getElementById('usuarioPerfil').textContent = estado.usuario.perfil;
  const aluno = estado.usuario.perfil === 'aluno';
  const professor = estado.usuario.perfil === 'professor';
  document.querySelector('[data-view-link="cadastros"]').hidden = aluno || professor;
  document.querySelector('[data-view-link="restricoes"]').hidden = aluno;
  atualizarModo();
  mostrar(aluno ? 'grade' : 'dashboard');
}

function atualizarModo() {
  const selo = document.getElementById('modoBanco');
  if (!selo) return;
  if (estado.modo === 'supabase') {
    selo.textContent = 'Supabase';
    selo.className = 'selo ok';
  } else {
    selo.textContent = 'Demonstração em memória';
    selo.className = 'selo warn';
  }
}

function mostrar(nome) {
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== `view-${nome}`; });
  document.querySelectorAll('[data-view-link]').forEach((botao) => {
    botao.classList.toggle('active', botao.dataset.viewLink === nome);
  });
  const render = VISTAS[nome];
  if (render) render();
}

function sair() {
  setToken(null);
  estado.usuario = null;
  document.getElementById('appShell').hidden = true;
  document.getElementById('loginScreen').hidden = false;
}
