# API do SmartGrade IA (contrato observado)

Mapeada em 2026-11-07 a partir do código do front-end (`js/api.js`, `js/grade.js`, `js/paineis.js`, `js/app.js`) e de chamadas reais feitas pelo navegador com uma sessão de coordenador. O código do servidor não é público, então tudo aqui é comportamento **observado**, não código lido.

Base: `https://smartgrade-ia.vercel.app` · Servidor: Vercel (função serverless) · Resposta: sempre JSON, exceto a exportação (CSV).

## Convenções

- Autenticação: cabeçalho `Authorization: Bearer <token>`. O front guarda o token em `localStorage` na chave `sigo_token`.
- Sucesso: `{ "success": true, ... }`. Erro: `{ "success": false, "error": "mensagem em português", "diagnostico"?: [...] }`.
- Rota inexistente: `404 {"error":"Rota não encontrada."}`.
- Códigos vistos: 200, 201 (criado), 400 (arquivo vazio), 401 (sem token ou token inválido), 404, 409 (grade aprovada não muda), 422 (regra de negócio ou dados que não batem).
- Em 401 (fora do login) o front apaga o token e recarrega a página.
- O token tem duas partes separadas por ponto: um JSON em base64 (id, nome, e-mail, perfil, ids de professor e turma, expiração) e uma assinatura. Pela expiração, vale cerca de 12 horas.

## Sessão e saúde

| Rota | O que faz |
| --- | --- |
| `POST /api/auth/login` | Corpo `{email, senha}`. Devolve `{token, usuario, modo}`. |
| `GET /api/auth/me` | Devolve `{usuario, modo}`. `usuario` tem `id, nome, email, perfil, professor_id, turma_id`. |
| `GET /api/health` | Público (sem token). Devolve `{servico:"SmartGrade IA", modo:"memoria", versao:"1.0.0"}`. |

## Dados de base

| Rota | O que faz |
| --- | --- |
| `GET /api/catalogo` | Tudo de uma vez: `cursos, periodos, disciplinas, professores, turmas, salas, horarios, disponibilidades, vinculos, restricoes, grades, modo`. |
| `GET /api/{professores, turmas, disciplinas, salas, horarios, restricoes}` | Lista em `{registros: [...]}`. |
| `POST /api/{tabela}` · `PUT /api/{tabela}/{id}` · `DELETE /api/{tabela}/{id}` | CRUD usado pela tela Cadastros. Tabelas do front: cursos, periodos, disciplinas, professores, turmas, salas, horarios. Não testei a escrita para não alterar o catálogo. |
| `POST /api/vinculos` · `DELETE /api/vinculos` | Corpo `{disciplina_id, professor_id}`. Liga ou desliga o professor habilitado. |
| `POST /api/disponibilidades` | Corpo `{professor_id, dia_semana, hora_inicio, hora_fim, status}`, com status `disponivel`, `preferencial` ou `indisponivel`. |
| `PUT /api/restricoes/{id}` | Corpo `{ativa: true|false}`. Liga ou desliga uma regra. |
| `GET /api/dashboard?gradeId=` | `indicadores, metas, formula, conflitos, avisos, ocupacaoPorSala, cargaPorProfessor, situacao, faixas, curso, grade`. |

Rotas que devolvem 404 em GET: `/api/grades`, `/api/vinculos`, `/api/disponibilidades`. A lista de grades vem dentro de `/api/catalogo`.

## Grades

| Rota | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/grades/{id}` | | `{grade, itens, historico, avaliacao}` |
| `POST /api/grades/generate` | `{cursoId, semestre, turmaIds, regras}` | `{alternativas[3], tempoMs, score, grade, conflitos}`. Não grava nada. |
| `POST /api/grades` | `{nome, semestre, cursoId, seed, itens, regras, decisoes, tempoMs}` | 201 `{grade, itens, avaliacao, conflitos, avisos}`. Grava como rascunho. |
| `POST /api/grades/import` | `{csv, cursoId, semestre, nome}` | 201 com a grade avaliada, mesmo se inviável. |
| `GET /api/grades/{id}/export?visao=` | | CSV com `;`. O parâmetro `visao` é ignorado, a grade sai inteira. |
| `POST /api/grades/{id}/mover` | `{itemId, horarioId, salaId?}` | `{valido, nivel, conflitos, avisos}`, mais a grade nova quando válido. |
| `POST /api/grades/{id}/reotimizar` | `{turmaId|null}` | Grade nova e avaliação. 409 se estiver aprovada. |
| `POST /api/grades/{id}/aprovar` | `{}` | 200 e status `aprovada`. 422 se houver conflito obrigatório. |
| `DELETE /api/grades/{id}/itens/{itemId}` | | Grade nova e avaliação. |

### `regras` do gerador

`respeitarDisponibilidade`, `evitarJanelas`, `preferirLaboratorios`, `equilibrarCarga`, `reduzirDeslocamento` (booleanos). Sem o campo `regras`, tudo vale como ligado.

### Uma alternativa

`seed, pontuacao, viavel, conflitos[], tempoMs, metricas{preferenciasAtendidas, ocupacaoSalas, contagens{...}}, grade[] (aulas), decisoes[] (textos)`.

### Uma aula (item da grade)

`id, grade_id, turma_id, disciplina_id, professor_id, sala_id, horario_id, status_validacao (valido|preferencia|conflito), motivos[]`.

### Histórico da grade

Ações vistas: `criacao`, `movimento`, `remocao`, `aprovacao`. Cada uma guarda e-mail do usuário, horário e detalhes.

### CSV (importação e exportação)

Colunas da exportação: `Turma;Disciplina;Professor;Sala;Dia;Inicio;Fim;Situacao;Motivos`. A importação usa pelo menos `turma;disciplina;professor;sala;dia;inicio`. Dia em texto (segunda, terça...) e hora como `19:00`. Nomes precisam bater com o cadastro, senão dá 422 com o número da linha.
