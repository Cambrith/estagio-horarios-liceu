# SmartGrade IA: análise profunda do site de exemplo

Data: 2026-11-07 · Site: https://smartgrade-ia.vercel.app (do professor Rodrigo Braga, UNIFESO, Ciência da Computação 2026.2)

Esta análise mistura três fontes e diz sempre qual é qual:

- **Código lido:** os 6 arquivos JavaScript, o HTML e o CSS públicos do front-end, que estão em `referencia/smartgrade-ia/`.
- **Comportamento testado:** chamadas reais à API com a sessão de coordenador aberta no navegador.
- **Inferência:** conclusões tiradas dos resultados, marcadas como tal.

O código do servidor não é público e não foi lido. O contrato da API está em `referencia/smartgrade-ia/API.md`.

## 1. Arquitetura

- **Front-end:** uma página única (`index.html`) com módulos ES nativos, sem framework e sem build. Cinco arquivos de lógica: `app.js` (login, navegação), `estado.js` (objeto de estado global), `api.js` (cliente HTTP), `grade.js` (tela da grade) e `paineis.js` (painel, cadastros, disponibilidade, restrições e relatórios), mais `ui.js` (utilitários).
- **Bibliotecas:** só Chart.js 4.4.6 pelo CDN, para os dois gráficos do painel. Fontes Fraunces e Outfit do Google Fonts.
- **Estilo:** um CSS de 12 KB, com verde-azulado `#008078` e verde `#3d9a45` como cores de destaque.
- **Back-end (observado):** uma função serverless na Vercel com roteador próprio. Rota desconhecida devolve JSON padronizado. Respostas levam de 150 ms a 1,3 s (a primeira chamada costuma ser a lenta, por partida a frio).
- **Persistência:** o `/api/health` informa `modo: "memoria"` e a versão `1.0.0`. O código do front tem também um modo `supabase` (selo verde), então o servidor sabe falar com um banco. No modo de memória, os dados vivem na memória da função e não duram.
- **Sessão:** token no `localStorage`. Se a API responde 401, o front apaga o token e recarrega.

## 2. Front-end por dentro

- **Perfis (só no front):** `aluno` abre direto na grade, sem Cadastros nem Restrições. `professor` não vê Cadastros e só edita a própria disponibilidade. Edita quem é `administrador` ou `coordenador`. Existem quatro contas de demonstração (coordenador, professor, aluno e gestor).
- **Grade:** cada aula é um cartão arrastável (drag and drop nativo). Ao soltar, o front chama `/mover`. Se for inválido, mostra o texto do conflito. Se for válido, mostra aviso de preferência ou sucesso. Clicar no cartão abre um modal com os motivos, troca de sala e remoção.
- **Visões da grade:** turma, professor ou sala, trocando só o filtro dos itens que o servidor já mandou.
- **Disponibilidade:** a matriz alterna o estado em ciclo (disponível, preferencial, indisponível). Se o professor não tem nenhum registro, vale disponível em todo o turno.
- **Painel:** oito cartões de indicadores, dois gráficos de barras (ocupação por sala e carga por professor, com a hora máxima ao lado) e a tabela de metas.
- **Relatórios:** a visão "Por turma, professor ou sala" agrupa os itens no próprio front. O PDF é só `window.print()`.
- **Segurança do front:** o texto é escapado antes de ir para o HTML. A senha de demonstração aparece escrita no HTML da página (preenchida no campo de login), o que é aceitável numa demonstração, mas não num sistema real.

## 3. O motor de geração (comportamento testado)

Testes com o endpoint `generate`, que só calcula:

| Teste | Resultado |
| --- | --- |
| Pedido padrão, 8 turmas | 3 alternativas, sementes 1, 5 e 9, pontuações 99, 97 e 97, 40 aulas cada, 0 conflitos |
| Mesmo pedido repetido | Mesmas sementes e mesmas pontuações. O motor é determinístico |
| Todas as regras desligadas | Sementes 5, 9 e 10, pontuação 92 (4 preferências não atendidas) |
| Só a disponibilidade desligada | Sementes 1, 3 e 9, pontuações 99, 97 e 97 |
| Uma turma (5º/6º A) | 6 aulas, pontuação 100, ocupação de salas 5% |
| Lista de turmas vazia | Trata como "todas as turmas" |
| Sem o campo `regras` | Igual a todas ligadas |
| Curso ou semestre que não existem | 422 "Nenhuma turma encontrada para o curso e o semestre informados." |

**Inferências:**

- O servidor tenta várias sementes (pelo menos de 1 a 10, já que a semente 10 apareceu) e devolve as 3 melhores. O tempo total (cerca de 500 ms) é umas 10 vezes o de cada tentativa (cerca de 50 ms).
- **Pontuação = 100 − custo**, e o custo soma penalidades com pesos. Conferido nos casos: custo 1 dá 99, custo 3 dá 97 e custo 8 dá 92. Pesos: indisponibilidade 8, janela 4, deslocamento 3, sala 2, preferência 2, equilíbrio 1. O equilíbrio só entra quando a regra de equilíbrio está ligada.
- Grade com conflito obrigatório recebe pontuação 0 e `viavel: false`.
- São 40 aulas porque são 20 disciplinas ofertadas vezes 2 turmas por bloco, com 1 aula por semana cada.
- Cada decisão vem com texto explicando o motivo ("Dia preferencial de...", "Sala X comporta a turma de N alunos", "Encaixada na mesma noite para evitar janela").

## 4. Regras de validação (testadas na importação de CSV e em `mover`)

| Regra | O que o servidor fez |
| --- | --- |
| Professor em duas aulas no mesmo horário | Conflito: "Fulano está em duas aulas na quarta, 18h–19h." |
| Turma com duas disciplinas no mesmo horário | Conflito |
| Sala usada por duas turmas | Conflito: "Sala 106 está ocupada por mais de uma turma..." |
| Capacidade da sala | Conflito: "Sala 106 comporta 48 alunos e a turma tem 73." |
| Professor indisponível | Conflito: "Helena Duarte não está disponível na segunda, 18h–19h." |
| Modalidade | Conflito: "Inglês Técnico é presencial e não pode usar Sala Virtual." |
| Aula a mais que o previsto | Conflito: "Metodologia Científica da turma 5º/6º B tem 2 aula(s) e o previsto é 1." |
| Laboratório em disciplina prática | Só aviso de preferência: "... ficou em Sala 201." |
| Dia preferido do professor | Aviso de preferência, e o movimento é salvo |
| Nome inventado ou horário que não existe | 422 com o número da linha do CSV |

**Mover uma aula:** quando o horário muda, o servidor escolhe sozinho uma sala livre e compatível. Se não houver, devolve "Nenhuma sala livre e compatível neste horário." Movimentos inválidos não gravam nada (resposta 200 com `valido: false`). Os válidos geram um registro de histórico, e a versão da grade sobe a cada alteração.

**Aprovação:** o servidor bloqueia a aprovação de grade com conflito (422 "A grade ainda tem conflito obrigatório e não pode ser aprovada."). Grade aprovada fica imutável: tentar reotimizar devolve 409 "A grade aprovada fica preservada. Gere outro rascunho para editar."

## 5. Limitações e comportamentos estranhos encontrados

1. **A carga horária só reclama de aula a mais.** Remover uma aula (de 40 para 39) deixou a grade viável, com pontuação 97, e o servidor deixou aprovar. A tela até avisa "A carga horária foi reavaliada", mas não aponta a falta. A regra "a carga prevista deve ser atendida" só vale para o excesso.
2. **A exportação ignora o parâmetro `visao`.** As três visões e até um valor inválido devolvem o mesmo CSV com a grade inteira.
3. **A habilitação do professor não aparece na avaliação.** Trocar o professor de Metodologia Científica por alguém sem vínculo com a disciplina só gerou o conflito de horário, sem nenhum aviso de falta de habilitação. O gerador usa os vínculos, mas a validação não os cobra.
4. **A importação aceita grade inviável.** Ela é gravada como rascunho com pontuação 0 e a lista de conflitos. O bloqueio só vem na aprovação.
5. **Os dados somem.** O modo de memória não guarda nada de forma durável.
6. **Janelas e deslocamentos deram 0 em todos os testes.** Com só dois horários por noite e um campus, essas regras quase nunca têm efeito neste exemplo.

## 5b. Permissões por perfil (testadas na API)

O servidor aplica as permissões e não depende dos botões escondidos do front-end. Testado com as quatro contas de demonstração.

| Ação | Coordenador | Gestor | Professor (Ana Lima) | Aluno (turma 1º/2º A) |
| --- | --- | --- | --- | --- |
| Gerar grade (cálculo, não grava) | Permitido | 403 | 403 | Não testado |
| Importar, mover, remover, reotimizar, aprovar | Permitido | Não testado | 403 | Não testado |
| Editar cadastros, vínculos e restrições | Permitido | Não testado | 403 | Não testado |
| Editar disponibilidade | De qualquer professor | Não testado | Só a própria (a de outro dá 403 "Você só pode editar a própria disponibilidade.") | Não testado |
| Ler o catálogo | Completo | Completo, com e-mails | Completo, com e-mails | Completo, **sem e-mails** dos professores |
| Ler as aulas da grade | Todas (40) | Todas (40) | Todas (40) | **Só as da própria turma** (4 de 40) |
| Ler o histórico da grade | Sim (5 registros na grade de teste) | Sim (5) | Não conferido | Não conferido |
| Exportar CSV | 200 | 200 | 200 | 200 |
| Painel `GET /api/dashboard` | 200 | 200 | 200 | 200 |

Pontos para guardar:

- **O servidor filtra por perfil.** Para o aluno, a grade vem reduzida à turma dele e os e-mails dos professores são removidos. Isso é mais seguro do que esconder dados só na tela.
- **O gestor parece ser um perfil de leitura.** Tem acesso completo para ler, mas a geração de grade foi barrada (403). As outras escritas dele não foram testadas.
- **O professor lê quase tudo,** inclusive todas as grades e as disponibilidades de todos.
- **O estado é compartilhado entre perfis.** As grades de teste criadas como coordenador apareceram nas sessões dos outros três perfis.
- **O aluno também recebe o painel completo** (indicadores, ocupação de salas e carga por professor). Não conferi se a exportação em CSV dele vem filtrada.
- **O histórico do aluno e do professor ficou sem conclusão.** A grade original do professor não tem histórico para nenhum perfil, então ler essa grade não prova nada. Só o coordenador e o gestor foram conferidos numa grade que tem histórico.
- **Escritas como aluno e como gestor** (além da geração) não foram tentadas. O sistema de segurança do ambiente bloqueou um lote de tentativas de escrita, e preferi não repetir. Pelo padrão visto no professor, é provável que o servidor também as barre, mas isso é suposição.

## 6. Dados do exemplo

- 1 curso, 8 períodos, 8 turmas (1º/2º A com 73 alunos, B com 44; 3º/4º A com 36, B com 30; 5º/6º A com 28, B com 24; 7º/8º A com 20, B com 16).
- 24 disciplinas, 20 ofertadas em 2026.2 (as quatro não ofertadas: Introdução à Computação, Matemática Discreta, Banco de Dados, Estruturas de Dados). Todas valem 1 aula por semana. As de 80 h tendem a ocupar a faixa das 19h às 22h, e as de 40 h cabem também na faixa das 18h às 19h.
- 12 professores com carga máxima entre 6 h e 24 h por semana.
- 10 salas: Sala 201 e 202 (80 lugares), 105 (50), 106 (48), Laboratório 1 (40), 2 (36), 3 (80), Anexo (32), Sala Virtual e Espaço de Estágio (300 e compartilhadas).
- 10 horários: segunda a sexta, duas faixas por dia (18h–19h e 19h–22h).
- 34 vínculos professor-disciplina e 54 registros de disponibilidade (11 professores têm marcação em 4 ou 5 dias, e a Helena Duarte só tem quarta; todos os registros usam a faixa das 18h).

## 7. O que aproveitar no projeto da escola

- **O desenho do modelo:** turma, disciplina, professor, horário, disponibilidade, vínculo e aula com status e motivo. Dá para cortar sala e campus.
- **As mensagens de conflito**, que dizem quem, onde e quando. É o que o slide 12 do professor pede.
- **A separação entre regras obrigatórias e preferências**, e a pontuação simples de 100 menos o custo.
- **O fluxo de gerar, comparar alternativas, abrir no editor, ajustar e aprovar.**
- **O histórico de ações e as versões.**
- **O erro a evitar:** conferir a carga horária nos dois sentidos, para cima e para baixo.

## 8. O que foi criado no site durante os testes

Os testes criaram grades de teste no servidor de demonstração, todas com nome começando por "TESTE": uma chamada "TESTE Claude (pode ignorar)", que foi movida, teve uma aula removida e foi aprovada, e sete chamadas "TESTE import ...". A grade original do professor ("CC 2026.2 · semente 1") e o catálogo (professores, disciplinas, salas, disponibilidade, regras) não foram alterados. Não achei rota para apagar grades. Como o site guarda os dados em memória, elas somem quando o servidor reiniciar.

## 9. Limites

- Não vi o código do servidor, então o algoritmo exato do gerador é desconhecido. As conclusões da seção 3 vêm só do comportamento.
- Testei como coordenador, professor, aluno e gestor, mas as escritas só foram testadas a fundo como coordenador e, em parte, como professor. A escrita nos cadastros não foi testada com sucesso em nenhum perfil, para não alterar o catálogo.
- Não testei carga: não sei o que acontece com muitas turmas ou muitos professores.
