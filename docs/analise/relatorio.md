# Relatório de análise: sistema de horários do Liceu São José de Itaipava

Data: 2026-11-07

O projeto é um sistema web que cadastra professores, disciplinas e turmas, aloca as aulas e bloqueia conflitos, com a opção de gerar a grade sozinho como o SmartGrade IA.

Versão online do relatório: https://claude.ai/artifact/5PBZBiX34UbitcxLE5AB5x

## O que fazer

O professor pediu um sistema web que ajude a escola a montar o quadro de horários sem conflitos. O núcleo do projeto, nos slides, é cadastrar professores, disciplinas e turmas, alocar as aulas e identificar conflitos automaticamente.

O SmartGrade IA, o site de exemplo, vai além: gera a grade sozinho, pontua alternativas e explica cada decisão. Isso serve de modelo para a parte "inteligente" do projeto.

A proposta tem três níveis:

1. **Base (exigida nos slides):** cadastros, alocação manual, bloqueio de conflitos e quadro consultável.
2. **Inteligente (visto no site):** geração automática, disponibilidade do professor, pontuação e explicação das decisões.
3. **Extra:** exportar CSV e PDF, arrastar aulas, aprovar versões, banco de dados e login.

A ficha de atividades e o horário que vieram nos arquivos são apenas exemplos, sem valor oficial, e não precisam ser seguidos.

## Passos definidos nos slides

O fluxo principal tem cinco passos, que também servem de ordem de construção:

1. **Cadastrar** professor, disciplina e turma.
2. **Definir** dias e horários.
3. **Alocar** professor, disciplina, turma e horário.
4. **Validar** conflitos e carga horária.
5. **Publicar** o quadro final para consulta.

A regra central é que nenhuma combinação pode gerar conflito de professor, turma ou horário. Antes de salvar, o sistema compara dia + horário + professor e dia + horário + turma, e bloqueia se houver duplicidade, com uma mensagem que indica onde está o conflito.

**Requisitos funcionais**

| Código | Requisito |
| --- | --- |
| RF01 | Cadastrar professores |
| RF02 | Cadastrar disciplinas e carga horária |
| RF03 | Cadastrar turmas |
| RF04 | Cadastrar dias e períodos |
| RF05 | Alocar disciplina + professor + turma + horário |
| RF06 | Editar e remover alocações |
| RF07 | Consultar o quadro por dia, turma ou professor |
| RF08 | Detectar conflitos automaticamente |

**Requisitos não funcionais:** usabilidade, responsividade (computador, tablet e celular), desempenho, confiabilidade, manutenibilidade e acessibilidade.

**Telas:** Dashboard, Professores, Disciplinas, Turmas, Alocação e Quadro.

**Perfis:** o coordenador cria e altera o quadro, e o professor consulta suas aulas e sua disponibilidade.

**Tecnologia da primeira versão:** HTML5 (formulários, tabelas e filtros), CSS3, JavaScript (DOM, eventos e validações) e LocalStorage. A evolução opcional é JSON Server, API REST, banco de dados, autenticação e exportação para PDF. O código vai no Git/GitHub.

**Entregáveis:** requisitos, casos de uso, modelo conceitual, protótipo das telas, código-fonte, sistema funcional, mecanismo de conflitos, testes e evidências, relatório acadêmico, apresentação e demonstração.

## SmartGrade IA por dentro

O site é do curso de Ciência da Computação do UNIFESO (2026.2, noturno). O front-end é uma página única com cinco módulos JavaScript (login, estado, API, grade e painéis), Chart.js para gráficos e uma API própria com sessão por token. Tem o modo "memória" e um modo Supabase para banco de verdade. Os dados abaixo vêm do código público do front-end e das respostas que a própria página carrega.

**Telas e perfis**

| Tela | O que faz |
| --- | --- |
| Painel | Indicadores, metas, ocupação por sala e carga por professor |
| Grade | Gerar, reotimizar, aprovar, arrastar aulas e ver por turma, professor ou sala |
| Cadastros | Cursos, períodos, disciplinas, professores, turmas, salas, horários e vínculos professor-disciplina |
| Disponibilidade | Matriz de dia por faixa com três estados |
| Restrições | Liga e desliga cada regra |
| Relatórios | Tabelas por turma, professor ou sala, CSV, PDF e importação de CSV |

Quatro perfis: coordenador e administrador editam, professor consulta e ajusta a própria disponibilidade, aluno só vê a grade da sua turma. Aluno não vê Cadastros nem Restrições, e professor não vê Cadastros.

**Como a geração funciona**

1. O coordenador escolhe curso, semestre, turmas e quais regras valem.
2. O servidor devolve três alternativas, cada uma com uma semente que repete o resultado.
3. O coordenador abre uma alternativa no editor, que a salva como rascunho.
4. Ele ajusta arrastando aulas ou trocando a sala, e cada movimento é validado na hora.
5. A aprovação fica bloqueada enquanto houver conflito obrigatório.
6. Cada aula guarda os motivos da decisão, e a grade tem versão e histórico.

**Regras (13 no total)**

| Tipo | Regras |
| --- | --- |
| Obrigatórias | Professor único, turma única e sala única por horário; capacidade da sala; disponibilidade do professor; modalidade da disciplina; carga horária |
| Preferenciais | Dia preferido, equilíbrio da carga, janelas, laboratório nas práticas, ocupação das salas e deslocamento entre campi |

O custo da grade soma penalidades com pesos: indisponibilidade 8, janela 4, deslocamento 3, sala 2, preferência 2 e equilíbrio 1. Regra obrigatória quebrada torna a grade inviável, e a pontuação só mede o que é negociável.

**Dados que o site guarda**

- **Turma:** período, bloco (por exemplo 1º/2º), nome, semestre e quantidade de alunos.
- **Disciplina:** carga horária, aulas por semana, modalidade (presencial, EAD ou especial), tipo, se exige laboratório e se está ofertada.
- **Professor:** nome, e-mail e carga máxima.
- **Sala:** capacidade, se é laboratório, se é compartilhada e o tipo (presencial, virtual ou especial).
- **Horário:** dia da semana, início e fim.
- **Disponibilidade:** professor, horário e estado (disponível, preferencial ou indisponível).
- **Aula alocada:** grade, turma, disciplina, professor, sala, horário, status de validação e motivos.

O exemplo do site tem 12 professores, 24 disciplinas cadastradas (20 alocadas), 8 turmas, 10 salas e 10 horários (duas faixas por dia, de segunda a sexta).

## Modelo de dados e regras propostos

Para o projeto da escola, o modelo pode ser bem menor que o do site. Estes são os campos mínimos:

| Entidade | Campos principais |
| --- | --- |
| Turma | id, nome, série, turno |
| Disciplina | id, nome, carga semanal por turma |
| Professor | id, nome, disciplinas que pode lecionar, disponibilidade por dia e horário |
| Horário | id, dia, início, fim |
| Alocação | id, turma, disciplina, professor, horário |

Campos extras do site que valem se sobrar tempo: sala com capacidade, carga máxima do professor, modalidade da disciplina e status de validação.

**Regras do nível base (os slides)**

1. Um professor não pode ter duas alocações no mesmo dia e horário.
2. Uma turma não pode ter duas alocações no mesmo dia e horário.
3. Cada disciplina precisa fechar a carga horária prevista para a turma.

**Regras do nível inteligente (o site)**

1. O professor só recebe aula em horário que não marcou como indisponível.
2. Dias preferidos, menos janelas e carga equilibrada entram só na pontuação.
3. Cada escolha do gerador guarda um motivo, para mostrar como o site faz.

O exemplo de horário do slide 3 mostra a mesma aula dada ao mesmo tempo para duas turmas. Se a escola real tiver isso, a alocação deve aceitar mais de uma turma por aula, senão a regra de professor duplicado vai bloquear aulas válidas.

## Passos para construir, em ordem

- [ ] Escrever os requisitos RF01 a RF08 e os não funcionais
- [ ] Desenhar o modelo de dados e os casos de uso
- [ ] Prototipar as 6 telas: Dashboard, Professores, Disciplinas, Turmas, Alocação e Quadro
- [ ] Montar HTML e CSS responsivos dos formulários e do quadro
- [ ] Programar os cadastros com salvamento em LocalStorage
- [ ] Programar a alocação manual de professor, disciplina, turma e horário
- [ ] Implementar a validação de conflitos de professor, turma e carga horária, com mensagens claras
- [ ] Fazer o quadro com consulta por dia, turma e professor
- [ ] Se o professor quiser o nível inteligente: gerador automático, disponibilidade e pontuação
- [ ] Testar com cenários de conflito e guardar as evidências
- [ ] Escrever o relatório acadêmico e preparar a demonstração

## Resultados dos testes no SmartGrade IA

Depois da primeira versão deste relatório, o site de referência foi testado a fundo. O detalhe está em [smartgrade-ia-analise-profunda.md](smartgrade-ia-analise-profunda.md). O que importa para o projeto:

- **Gerador:** é determinístico e devolve as 3 melhores de cerca de 10 tentativas. A pontuação é 100 menos o custo das penalidades.
- **Regras que barram:** professor, turma e sala duplicados, capacidade da sala, professor indisponível, modalidade e aula a mais que o previsto.
- **Regras que só avisam:** laboratório nas aulas práticas e dia preferido do professor.
- **Falha a evitar:** a carga horária só barra aula a mais. Uma aula faltando passa, e a grade ainda é aprovada.
- **Outras falhas:** o CSV ignora a visão pedida, e a habilitação do professor na disciplina não é validada.
- **Permissões:** o servidor barra as escritas do professor e filtra o que o aluno recebe. O gestor lê tudo e teve a geração barrada.

## Limites desta análise

- O código do servidor do SmartGrade IA, onde ficam o gerador e a avaliação, não é público. O algoritmo exato é desconhecido, e as conclusões vêm do comportamento.
- Os testes criaram grades com nome começando por "TESTE" no servidor de demonstração, que guarda os dados só em memória. A grade original do professor e o catálogo não foram alterados.
- A escrita nos cadastros e as escritas do aluno e do gestor (além da geração) não foram testadas.
- Os slides tratam o horário do slide 3 como "quadro real". Como não é oficial, vale combinar com o professor se ele aceita dados fictícios na demonstração.
- As senhas de demonstração ficam fora destes arquivos de propósito.
