# AGENTS.md

Instruções para agentes de IA que trabalharem neste projeto.

## O projeto

Sistema web de alocação de horários de aula para o Liceu São José de Itaipava, feito como estágio supervisionado por alunos do Técnico em Informática. Leia `README.md` e `docs/analise/relatorio.md` antes de começar.

## Escopo

- **Nível base (obrigatório):** cadastro de professores, disciplinas, turmas, dias e horários; alocação manual; bloqueio de conflitos de professor e de turma; carga horária; quadro consultável por dia, turma e professor.
- **Nível inteligente (se o professor pedir):** geração automática da grade, disponibilidade do professor, pontuação e motivo de cada decisão.
- **Extras:** CSV e PDF, arrastar aulas, versões, banco de dados e login.

## Tecnologia

HTML5, CSS3 e JavaScript puro, com LocalStorage. Sem frameworks nem build, a menos que o professor autorize. O código vai em `src/`, os protótipos em `prototipos/` e os testes em `testes/`.

## Regras do projeto

- A ficha de atividades e o horário de exemplo do slide 3 **não são oficiais**. Não os trate como dados reais nem siga o cronograma da ficha.
- Uma aula pode ter mais de uma turma (aula conjunta). Não bloqueie professor "duplicado" quando for a mesma aula.
- Toda validação deve dar mensagem clara que diga onde está o conflito.
- Interface em português do Brasil, responsiva e acessível (contraste, rótulos, foco por teclado).
- Código simples e comentado em português, em HTML, CSS e JavaScript separados.

## Pasta `referencia/`

Site de referência do professor: https://smartgrade-ia.vercel.app (SmartGrade IA, UNIFESO).

- `referencia/smartgrade-ia/` é cópia de estudo do site do professor. Não edite nem copie trechos para o projeto sem entender a lógica. O gerador de grade roda no servidor dele e não está disponível.
- `referencia/smartgrade-ia/API.md` descreve a API do site, e `docs/analise/smartgrade-ia-analise-profunda.md` traz as regras testadas e as falhas encontradas (por exemplo, a carga horária só barra aula a mais). Leia antes de copiar qualquer regra.
- `referencia/horario-exemplo/` tem a imagem do horário de exemplo, útil só como ideia de dados de demonstração.

## Segurança

- Não grave senhas, tokens ou logins de demonstração neste repositório.
- Não envie dados do projeto a serviços externos sem aprovação do grupo.

## Antes de entregar

Rode os cenários de conflito de `testes/` e guarde as evidências. Atualize `README.md` se a estrutura mudar.
