# Evidências de Teste — Validação, Gerador e Exportação

Executado em: 2026-11-17  
Comando: `node --test testes/validacao.test.js`  
Arquivos testados: [src/js/validacao.js](../src/js/validacao.js), [src/js/csv.js](../src/js/csv.js), [src/js/dados-slide3.js](../src/js/dados-slide3.js), [src/js/gerador.js](../src/js/gerador.js)

## Resultado

- **Total:** 13 cenários
- **Aprovados:** 13
- **Reprovados:** 0

## Cenários cobertos

1. Alocação válida simples aceita.
2. Conflito de professor no mesmo dia e horário bloqueado com mensagem indicando professor, dia e horário.
3. Aula conjunta (mesmo professor com 2 turmas na mesma alocação) permitida sem falso positivo.
4. Conflito de turma no mesmo dia e horário bloqueado com mensagem indicando turma, dia e horário.
5. Professor não habilitado para a disciplina bloqueado.
6. Professor marcado como indisponível no dia e horário bloqueado.
7. Carga horária faltando (`1/2`) detectada por `validarCargaHoraria`.
8. Carga horária excedente (`3/2`) bloqueada em `validarAlocacao`.
9. Edição de alocação existente sem conflito consigo mesma.
10. Sugestão de substituto separa professores livres habilitados de outros livres e ignora ocupados/indisponíveis.
11. Exportação CSV respeita exatamente a visão filtrada (`turma`, `professor`, `dia` ou `completa`).
12. Massa completa do Slide 3 (23 professores e 7 turmas) inicia com 0 conflitos.
13. Gerador automático gera 3 alternativas determinísticas mantendo 0 conflitos.
