# Dúvidas para tirar

Lista de tudo que ainda precisa ser perguntado, organizada por **com quem** falar. Marque `[x]` quando tiver a resposta e escreva embaixo.

Prioridade: 🔴 destrava o projeto · 🟡 importante, mas dá para avançar sem · 🟢 pode esperar.

## As 5 perguntas que mais destravam

Se só der para perguntar poucas coisas, comece por estas:

1. 🔴 **Professor:** o sistema só **valida** o horário ou também **gera** sozinho?
2. 🔴 **Professor:** podemos usar **dados fictícios** na demonstração?
3. 🔴 **Escola:** quem monta o horário hoje e em que **ferramenta**?
4. 🔴 **Escola:** quantas **turmas e professores** existem, e quais são as **faixas de aula**?
5. 🔴 **Professor:** quais são as **datas e o formato de entrega** (relatório, apresentação, demonstração)?

---

## 1. Perguntas para o professor Rodrigo

### Escopo do projeto

- [ ] 🔴 O sistema só **valida** o quadro montado à mão (como nos slides) ou também **gera** a grade sozinho (como o SmartGrade IA)?
  - Resposta:
- [ ] 🔴 Podemos usar **dados fictícios** na demonstração? O slide 18 fala em "quadro escolar real".
  - Resposta:
- [ ] 🟡 O horário do slide 3 pode ser usado como **modelo de dados de teste**?
  - Resposta:
- [ ] 🟡 Login com **perfis** (coordenador, professor, aluno) é obrigatório ou só a coordenação usa?
  - Resposta:
- [ ] 🟡 Pode usar **banco de dados, servidor ou framework**, ou é só HTML, CSS, JavaScript e LocalStorage?
  - Resposta:
- [ ] 🟢 Ele pode dar uma **dica de como funciona o gerador** do SmartGrade IA (que lógica usa)?
  - Resposta:

### Entrega e avaliação

- [ ] 🔴 Quais são as **datas** de entrega do relatório, da apresentação e da demonstração?
  - Resposta:
- [ ] 🟡 Existe **modelo ou norma** para o relatório acadêmico?
  - Resposta:
- [ ] 🟡 A **ficha de atividades diárias** precisa ser preenchida? Vocês nunca tiveram o planejamento que veio no exemplo.
  - Resposta:
- [ ] 🟡 Como é a **avaliação** e quantas pessoas por grupo?
  - Resposta:
- [ ] 🟡 É permitido usar **ferramentas de IA** no projeto e no relatório? Como citar?
  - Resposta:

### Avisos e permissões

- [ ] 🔴 Avisar que o repositório no GitHub é **público** e tem os arquivos dele e uma cópia do front-end do SmartGrade IA. Tudo bem?
  - Resposta:
- [ ] 🟡 Podemos **nos inspirar** nas regras e no modelo de dados do SmartGrade IA e **citá-lo** como referência no relatório?
  - Resposta:
- [ ] 🟡 Avisar que os testes que fizemos no site criaram **grades com nome "TESTE"** no servidor de demonstração (a grade dele não foi alterada). Ele quer que a gente avise ou limpe algo?
  - Resposta:
- [ ] 🟢 Contar as **falhas que achamos** no site (carga horária, exportação, habilitação do professor). Ele quer o relato?
  - Resposta:

---

## 2. Perguntas para a escola (coordenação do Liceu)

### Como é hoje

- [ ] 🔴 **Quem monta** o horário e **em que ferramenta** (planilha, papel, programa)?
  - Resposta:
- [ ] 🔴 Quantas **turmas** e quantos **professores** existem, no Fundamental e no Médio?
  - Resposta:
- [ ] 🟡 Qual a **maior dor** hoje? O que costuma dar errado no horário?
  - Resposta:
- [ ] 🟡 **Quando** o horário é feito (início do ano, semestre) e **com que frequência** muda durante o ano?
  - Resposta:
- [ ] 🟡 Como lidam com **faltas e substituições** de professor?
  - Resposta:

### Dados para o sistema

- [ ] 🔴 Quais são as **faixas de aula** (horário de início e fim) e os **intervalos**? Mudam entre Fundamental e Médio?
  - Resposta:
- [ ] 🔴 Quantas **aulas por semana** tem cada disciplina, por série?
  - Resposta:
- [ ] 🟡 Existe **cópia do horário atual** em planilha? Dá para usar como teste?
  - Resposta:
- [ ] 🟡 Como é coletada a **disponibilidade dos professores**? Alguns só vêm em certos dias ou dão aula em outras escolas?
  - Resposta:

### Regras da escola

- [ ] 🔴 Quais **regras fixas** o horário segue? Por exemplo: aulas geminadas, aulas conjuntas entre turmas, disciplinas que não podem ficar no último horário, professores com dias fixos.
  - Resposta:
- [ ] 🟡 Existe **limite** de aulas por dia ou de aulas seguidas para professor e turma?
  - Resposta:
- [ ] 🟡 Cada turma tem **sala fixa**? Há laboratórios, quadra ou outros espaços que precisam de reserva?
  - Resposta:

### Uso e autorização

- [ ] 🟡 **Quem usaria** o sistema: só a coordenação, os professores, os alunos?
  - Resposta:
- [ ] 🟡 Como o horário é **divulgado** hoje (impresso, PDF, WhatsApp, mural)?
  - Resposta:
- [ ] 🔴 A escola **autoriza** o uso de dados reais, mesmo sem nomes (LGPD)? Nomes de professores são dados pessoais.
  - Resposta:
- [ ] 🟢 Podemos usar o **nome do Liceu** no sistema e no grupo? E a logo?
  - Resposta:

---

## 3. Decisões do grupo (entre vocês)

- [ ] 🔴 **Quem fala** com o professor e com a escola? Melhor ter uma pessoa só para não repetir perguntas.
  - Resposta:
- [ ] 🔴 **Divisão de tarefas:** requisitos, modelo de dados, telas, código, testes e relatório.
  - Resposta:
- [ ] 🟡 Qual **nível** vamos buscar? Base, Útil na escola ou Inteligente (veja `analise/resumo-informal.md`).
  - Resposta:
- [ ] 🟡 **Usuários do GitHub** de cada colega, para adicionar ao repositório.
  - Resposta:
- [ ] 🟡 **Como trabalhar no código:** quem edita o quê, como evitar conflito de arquivos, de quanto em quanto tempo enviar.
  - Resposta:
- [ ] 🟡 **Dia fixo de reunião** do grupo.
  - Resposta:
- [ ] 🟢 **Nome do sistema.** A ideia anotada foi GradeCerta, mas qualquer um serve.
  - Resposta:

---

## 4. Decisões técnicas (depois das respostas acima)

- [ ] 🟡 O sistema aceita **aula conjunta** (uma aula, várias turmas) e **aula geminada**?
- [ ] 🟡 **Fundamental e Médio** ficam no mesmo sistema?
- [ ] 🟡 Como **não perder dados** com LocalStorage? Exportar e importar em arquivo?
- [ ] 🟢 Onde **hospedar** a demonstração (GitHub Pages ou rodar local)?
- [ ] 🟢 Formato da **importação de planilha** (CSV com `;` como no SmartGrade IA?).

---

## Como usar este arquivo

1. Faça as perguntas por grupo de pessoas. Uma única mensagem para o professor e uma única conversa com a escola já resolvem a maioria.
2. Escreva a resposta logo abaixo de cada pergunta e marque `[x]`.
3. Quando uma resposta mudar o plano, atualize `ideias.md` e o `analise/resumo-informal.md`.
