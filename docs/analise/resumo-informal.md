# Resumo informal: o que a gente descobriu e o que criar pro Liceu

Em português simples, sem enrolação. Os detalhes técnicos estão nos outros arquivos de `docs/analise/`.

## Em 30 segundos

- O professor mandou **3 coisas**: uma ficha de atividades (exemplo, sem valor oficial), uma apresentação com a proposta do projeto e o site SmartGrade IA, que é um sistema parecido que ele mesmo fez.
- O pedido do projeto é um **sistema web de horários**: cadastrar professores, disciplinas e turmas, colocar as aulas no quadro e **avisar quando dá conflito**.
- O site dele vai além: **monta o horário sozinho**, dá nota, explica o porquê de cada aula estar onde está e tem login por perfil.
- Testamos o site a fundo. Ele funciona bem, mas tem **falhas** que a gente pode evitar no nosso.
- Minha sugestão pro Liceu: começar pelo **quadro com validação de conflito** e, depois, acrescentar um **gerador automático simples**, mais recursos que escola de verdade usa (aula geminada, aula conjunta, impressão por turma e por professor, substituição de professor).

## O que o professor pediu (apresentação)

- **Fluxo:** cadastrar, definir horários, alocar, validar, publicar.
- **Regra principal:** nunca dois conflitos de professor, turma ou horário.
- **8 requisitos:** cadastro de professores, disciplinas com carga, turmas e horários; alocar; editar e remover; consultar por dia, turma ou professor; detectar conflito sozinho.
- **6 telas:** Dashboard, Professores, Disciplinas, Turmas, Alocação e Quadro.
- **Tecnologia:** HTML, CSS e JavaScript puro, dados salvos no navegador.
- **9 entregáveis:** requisitos, casos de uso, modelo, protótipo, código, sistema funcionando, detecção de conflito, testes e relatório com apresentação.

A ficha de atividades e o horário que vieram nos arquivos são exemplos. Vocês nunca tiveram esse planejamento, então não precisa seguir.

## O que o site do professor mostrou

**Como é por fora:** painel com números, grade semanal com cartões arrastáveis, cadastros, disponibilidade dos professores, lista de regras e relatórios com exportação.

**Os números do exemplo dele:** 12 professores, 24 disciplinas (20 usadas), 8 turmas, 10 salas e 10 faixas de horário.

**Como o gerador se comporta (descobrimos testando):**
- Devolve **3 alternativas** por vez, cada uma com uma "semente".
- Dá resultado igual se você pedir de novo (não é sorteio solto).
- Nota de 0 a 100: começa em 100 e desconta penalidades. Grade com conflito grave leva 0.
- Cada aula guarda o **motivo** da escolha, por exemplo "dia preferido do professor".

**Regras que o site cobra de verdade:** professor, turma ou sala duas vezes no mesmo horário, sala pequena demais, professor indisponível, tipo de aula (presencial ou EAD) e aula a mais que o previsto. **Só avisam:** laboratório e dia preferido do professor.

**Falhas que a gente achou:**
1. Se **falta** uma aula, o site não reclama e ainda deixa aprovar. Só reclama de aula a mais.
2. A exportação ignora a visão escolhida e sempre solta a grade inteira.
3. Ele não confere se o professor é habilitado para a disciplina.
4. Importar planilha com conflito grava mesmo assim, com nota 0.

**Permissões (4 perfis):** coordenador faz tudo, gestor só lê, professor só mexe na própria disponibilidade e aluno só vê a própria turma. O servidor realmente barra, não é só botão escondido.

**Por dentro:** front-end simples, sem framework, com uma API própria. O código do servidor não é público, então o algoritmo exato a gente só deduziu pelo comportamento.

## O que a gente aprendeu do quadro de exemplo

O horário que veio no slide 3 não é oficial, mas mostra como costuma ser um quadro de escola de Ensino Médio:
- **7 aulas por dia**, de segunda a sexta, com intervalo no meio da manhã.
- **Aulas geminadas:** a mesma disciplina em duas aulas seguidas.
- **Aulas conjuntas:** o mesmo professor com duas turmas ao mesmo tempo. Sem tratar isso, a regra "professor duplicado" bloquearia aula válida.
- Professor dando **várias disciplinas** e aula com **dois professores**.

Se o Liceu é parecido, o sistema precisa cobrir tudo isso.

## O que aproveitar e o que evitar

**Aproveitar:** a lista de dados (turma, disciplina, professor, horário, disponibilidade, aula), as mensagens de conflito claras ("Fulano está em duas aulas na quarta, 18h–19h"), a separação entre regra que barra e regra que só avisa, a nota simples e o histórico de mudanças.

**Evitar:** a falha da carga horária (conferir se falta aula também), a exportação que ignora a visão e a importação que aceita bagunça sem avisar.

## O que eu sugiro criar pro Liceu

Três etapas. Cada uma já entrega algo que funciona.

**Etapa 1: o básico (é o que a apresentação pede)**
- Cadastros de turmas, professores, disciplinas e das faixas de aula.
- Quadro semanal por turma e por professor.
- Validador de conflito com mensagem clara (professor, turma) e conferência de carga horária **nos dois sentidos**.
- Salvar no navegador.

**Etapa 2: o que torna útil na escola**
- **Aula conjunta** (uma aula, várias turmas) e **aula geminada**.
- **Disponibilidade do professor** (dias e horários que ele pode, como o site faz).
- **Imprimir e exportar** por turma e por professor, porque escola cola horário na parede.
- **Colar dados de planilha**, já que a coordenação costuma ter tudo no Excel.

**Etapa 3: o "inteligente"**
- **Gerador automático simples** no próprio navegador: coloca primeiro as aulas mais difíceis, preenche o resto e desfaz quando trava. Mostra 3 alternativas com nota e o motivo de cada escolha.
- **Substituição de professor:** quando um professor falta, o sistema lista quem está livre naquela aula e é habilitado na disciplina. O site do professor não tem isso, e escola precisa muito.

**O que não vale a pena agora:** salas e campi (escola normalmente tem sala fixa por turma), banco de dados e login por perfil. Dá pra deixar para depois, se sobrar tempo.

## Ajustando pelo que a gente sabe do Liceu

O que você confirmou, e o que isso muda:

| O que sabemos | O que muda na sugestão |
| --- | --- |
| A escola toda vai usar (Fundamental e Médio) | Bem mais turmas e professores que o quadro de exemplo. O **gerador automático** passa de enfeite a algo que faz diferença, e **colar dados de planilha** vira essencial para ninguém digitar tudo. |
| Provavelmente já existe algum programa ou planilha, e o horário segue sempre o mesmo padrão | O sistema precisa ser **melhor que o que já existe**, e não só igual. Entra a ideia de **copiar o horário do ano anterior e só ajustar** o que mudou. Também vale **conferir o horário pronto** (validador) e a **substituição de professor**. |
| Não sabemos quem usa (coordenação, professores ou alunos) | Começar só para a **coordenação**. Professor e aluno consultando fica para a Etapa 2, sem login complicado (um link de consulta já resolve). |
| Ainda não perguntamos se é só validar ou também gerar | Segue em aberto. Montar a **Etapa 1 e a 2 primeiro** funciona nos dois casos. A Etapa 3 espera a resposta do professor. |

**Mudanças nas etapas por causa disso:**
- **Etapa 1:** acrescentar um campo para o **nível da turma** (Fundamental ou Médio) e as **faixas de aula** por nível, porque Fundamental e Médio costumam ter horários diferentes.
- **Etapa 2:** subir de prioridade o **colar de planilha** e o **copiar do ano anterior**.
- **Etapa 3:** o gerador precisa dar conta de bem mais turmas. Em JavaScript no navegador isso é viável, mas vale testar com dados grandes cedo.

## O que ainda dá pra descobrir (sem depender de ninguém de fora)

Se alguém do grupo puder perguntar na escola, bastam três respostas curtas:
1. **Quem monta o horário hoje** e em que ferramenta.
2. **Quantas turmas e quantos professores** existem, no Fundamental e no Médio.
3. **Quais regras fixas** a escola segue (por exemplo, professor que só vem em certos dias, aulas que sempre vão juntas).

## Pra começar essa semana

1. Combinar com o professor se o sistema só **valida** ou também **gera**.
2. Levantar no Liceu as faixas de horário, as turmas e quantas aulas por semana cada disciplina tem.
3. Preencher o `docs/ideias.md` com o que vocês já sabem da rotina da escola.
4. Desenhar as 6 telas no papel.
