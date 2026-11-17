# Especificação do Sistema de Horários Escolares (Liceu São José de Itaipava)

Este documento define os requisitos, casos de uso, modelo de dados e regras de validação da primeira versão (Nível Base) do sistema, alinhados à apresentação do estágio e às diretrizes de [AGENTS.md](../AGENTS.md).

---

## 1. Requisitos Funcionais (RF)

| Código | Requisito | Descrição |
| --- | --- | --- |
| **RF01** | Cadastrar professores | Criar, listar, editar e excluir professores, informando nome, e-mail opcional e disciplinas que está habilitado a lecionar. |
| **RF02** | Cadastrar disciplinas e carga horária | Criar, listar, editar e excluir disciplinas, definindo a carga horária semanal prevista (aulas por semana). |
| **RF03** | Cadastrar turmas | Criar, listar, editar e excluir turmas, informando nome, série/ano, nível (`Fundamental` ou `Médio`) e turno. |
| **RF04** | Cadastrar dias e horários | Definir os dias da semana e as faixas de horário (início, fim e nível opcional) disponíveis na escola. |
| **RF05** | Alocar aulas | Associar disciplina, professor, uma ou mais turmas (suporte a **aula conjunta**) e dia + faixa de horário. |
| **RF06** | Editar e remover alocações | Alterar ou excluir alocações existentes, revalidando conflitos e carga horária imediatamente. |
| **RF07** | Consultar o quadro | Visualizar a grade semanal filtrada por **Turma**, **Professor** ou **Dia da semana**, com opção de impressão. |
| **RF08** | Detectar conflitos automaticamente | Bloquear ou alertar conflitos de professor, turma, habilitação, indisponibilidade e carga horária (faltando ou sobrando) com mensagem clara indicando quem, onde e quando. |

---

## 2. Requisitos Não Funcionais (RNF)

| Código | Requisito | Como é atendido |
| --- | --- | --- |
| **RNF01** | Usabilidade | Interface simples em português do Brasil, com 6 telas claras e feedback imediato nos formulários. |
| **RNF02** | Responsividade | Layout adaptável para computador, tablet e celular via CSS Grid/Flexbox e media queries. |
| **RNF03** | Acessibilidade | Contraste adequado, rótulos (`<label>`) em todos os campos, navegação por teclado com foco visível e atributos ARIA. |
| **RNF04** | Confiabilidade e persistência | Dados salvos localmente no navegador (`LocalStorage`), com opção de exportar e importar backup em JSON. |
| **RNF05** | Manutenibilidade | Código separado em HTML, CSS e JavaScript puro, organizado por módulos e comentado em português. |
| **RNF06** | Desempenho | Validação instantânea no navegador sem dependência de servidor externo. |

---

## 3. Casos de Uso Principais

- **UC01 — Gerenciar Cadastros Base:** Coordenador cadastra professores (com disciplinas habilitadas), disciplinas (com carga semanal), turmas e faixas de horário.
- **UC02 — Alocar Aula Manualmente:** Coordenador seleciona disciplina, professor, uma ou mais turmas, dia e horário. O sistema valida antes de salvar e exibe o motivo detalhado caso haja conflito.
- **UC03 — Alocar Aula Conjunta:** Coordenador seleciona duas ou mais turmas para a mesma aula (mesmo professor, disciplina, dia e horário). O sistema aceita sem acusar duplicidade do professor.
- **UC04 — Editar ou Remover Alocação:** Coordenador altera dados de uma aula ou a exclui; o sistema recalcula conflitos e carga horária.
- **UC05 — Consultar Quadro de Horários:** Usuário escolhe a visão por Turma, Professor ou Dia e visualiza ou imprime o quadro.
- **UC06 — Verificar Painel de Pendências:** Coordenador consulta o Dashboard para ver total de conflitos ativos e disciplinas com carga horária faltando ou excedente.
- **UC07 — Backup de Dados:** Coordenador exporta os dados em arquivo JSON ou restaura um backup anterior.

---

## 4. Modelo de Dados

As entidades são armazenadas em um objeto único no `LocalStorage` (`liceu_horarios_v1`):

### `Professor`
- `id`: string (identificador único)
- `nome`: string
- `disciplinaIds`: string[] (disciplinas que pode lecionar)
- `indisponibilidades`: Array de `{ dia: string, horarioId: string }` (preparado para controle de disponibilidade)

### `Disciplina`
- `id`: string
- `nome`: string
- `cargaSemanal`: number (quantidade de aulas por semana por turma)

### `Turma`
- `id`: string
- `nome`: string (ex.: `"1º Ano A"`, `"9º Ano B"`)
- `nivel`: `"Fundamental"` | `"Médio"`
- `turno`: `"Manhã"` | `"Tarde"` | `"Noite"`

### `Horario`
- `id`: string
- `inicio`: string (`"HH:MM"`)
- `fim`: string (`"HH:MM"`)
- `rotulo`: string (ex.: `"1ª aula (07:30 - 08:20)"`)

### `Alocacao`
- `id`: string
- `turmaIds`: string[] (aceita 1 ou mais turmas — **aula conjunta**)
- `disciplinaId`: string
- `professorId`: string
- `dia`: `"Segunda"` | `"Terça"` | `"Quarta"` | `"Quinta"` | `"Sexta"`
- `horarioId`: string

---

## 5. Regras de Validação (Nível Base)

1. **Conflito de Professor (bloqueante):** Um professor não pode estar em duas alocações diferentes no mesmo `dia` e `horarioId`. *Exceção:* uma mesma alocação com múltiplas turmas (`turmaIds.length > 1`) representa uma **aula conjunta** e é permitida.
2. **Conflito de Turma (bloqueante):** Uma turma não pode participar de duas alocações diferentes no mesmo `dia` e `horarioId`.
3. **Habilitação do Professor (bloqueante):** O professor selecionado deve ter a disciplina em sua lista `disciplinaIds` (quando houver disciplinas vinculadas).
4. **Indisponibilidade do Professor (bloqueante):** Se o professor marcou o `dia` + `horarioId` como indisponível, a alocação é impedida com aviso claro.
5. **Carga Horária (nos dois sentidos — alerta no painel):** Para cada par `(Turma, Disciplina)` com aulas alocadas (ou previsto na grade), o sistema compara a quantidade alocada com `disciplina.cargaSemanal`, apontando tanto **aulas faltando** quanto **aulas em excesso**.
