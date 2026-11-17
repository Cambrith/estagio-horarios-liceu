/**
 * Camada de persistência em LocalStorage, histórico de ações e dados de demonstração.
 */
(function (root) {
  'use strict';

  const CHAVE_STORAGE = 'liceu_horarios_v1';

  /**
   * Retorna o estado inicial vazio da aplicação.
   */
  function criarEstadoVazio() {
    return {
      professores: [],
      disciplinas: [],
      turmas: [],
      horarios: [],
      alocacoes: [],
      historico: [],
      gradeAprovada: false
    };
  }

  /**
   * Gera um identificador único simples para novas entidades.
   */
  function gerarId(prefixo) {
    return `${prefixo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  /**
   * Carrega o estado salvo no LocalStorage; se for o primeiro acesso, carrega os dados do Slide 3.
   */
  function carregarEstado() {
    try {
      const bruto = localStorage.getItem(CHAVE_STORAGE);
      if (!bruto) {
        return root.DadosSlide3 ? root.DadosSlide3.criarDadosSlide3() : criarEstadoVazio();
      }
      const parsed = JSON.parse(bruto);
      return {
        professores: Array.isArray(parsed.professores) ? parsed.professores : [],
        disciplinas: Array.isArray(parsed.disciplinas) ? parsed.disciplinas : [],
        turmas: Array.isArray(parsed.turmas) ? parsed.turmas : [],
        horarios: Array.isArray(parsed.horarios) ? parsed.horarios : [],
        alocacoes: Array.isArray(parsed.alocacoes) ? parsed.alocacoes : [],
        historico: Array.isArray(parsed.historico) ? parsed.historico : [],
        gradeAprovada: Boolean(parsed.gradeAprovada)
      };
    } catch {
      return criarEstadoVazio();
    }
  }

  /**
   * Salva o estado completo no LocalStorage.
   */
  function salvarEstado(estado) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
  }

  /**
   * Cria a massa de exemplo completa (23 professores e 7 turmas do Slide 3).
   */
  function criarDadosExemplo() {
    if (root.DadosSlide3) {
      return root.DadosSlide3.criarDadosSlide3();
    }
    return criarEstadoVazio();
  }

  root.StorageApp = {
    criarEstadoVazio,
    gerarId,
    carregarEstado,
    salvarEstado,
    criarDadosExemplo
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
