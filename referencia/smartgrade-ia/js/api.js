const CHAVE = 'sigo_token';

export function getToken() {
  return localStorage.getItem(CHAVE);
}

export function setToken(token) {
  if (token) localStorage.setItem(CHAVE, token);
  else localStorage.removeItem(CHAVE);
}

export async function api(path, opcoes = {}) {
  const headers = { ...(opcoes.headers || {}) };
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(path, {
    method: opcoes.method || 'GET',
    headers,
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
  });
  const dados = await resposta.json().catch(() => ({ success: false, error: 'Resposta inválida do servidor.' }));
  if (resposta.status === 401 && !path.includes('/auth/login')) {
    setToken(null);
    location.reload();
  }
  if (!resposta.ok || dados.success === false) {
    const erro = new Error(dados.error || 'Não foi possível concluir a operação.');
    erro.detalhes = dados;
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export async function baixar(path, nome) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const resposta = await fetch(path, { headers });
  if (!resposta.ok) throw new Error('Não foi possível exportar o arquivo.');
  const blob = await resposta.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  link.click();
  URL.revokeObjectURL(link.href);
}
