# Estágio: Sistema de Horários Escolares (Liceu São José de Itaipava)

Projeto de estágio supervisionado do curso Técnico em Informática, orientado pelo professor Rodrigo Braga.

**Site de referência do professor:** https://smartgrade-ia.vercel.app (SmartGrade IA, UNIFESO). É um exemplo de sistema parecido, para inspirar o projeto.

## O projeto em uma frase

Um sistema web que cadastra professores, disciplinas e turmas, aloca as aulas e bloqueia conflitos de professor, turma e horário, com a opção de gerar a grade sozinho como no site de referência.

**Tecnologia da v1:** HTML5, CSS3, JavaScript puro e LocalStorage.

## Começar por aqui

| Quero... | Leia |
| --- | --- |
| Entender o que fazer e em que ordem | [docs/analise/relatorio.md](docs/analise/relatorio.md) |
| Ver como o site de referência funciona por dentro | [docs/analise/smartgrade-ia-analise-profunda.md](docs/analise/smartgrade-ia-analise-profunda.md) |
| Consultar a API do site de referência | [referencia/smartgrade-ia/API.md](referencia/smartgrade-ia/API.md) |
| Anotar ideias antes de programar | [docs/ideias.md](docs/ideias.md) |
| Ver o que cada pasta guarda | [docs/README.md](docs/README.md) |

## O que a análise descobriu (resumo)

- **O que os slides pedem:** cadastrar, definir horários, alocar, validar e publicar. Requisitos RF01 a RF08, 6 telas e 9 entregáveis.
- **O que o site de referência faz a mais:** gera a grade sozinho (3 alternativas por vez), pontua de 0 a 100, explica cada decisão, guarda histórico e versões, e tem quatro perfis de usuário.
- **Regras testadas no site:** barra professor, turma e sala duplicados, capacidade da sala, professor indisponível, modalidade e aula a mais que o previsto. Laboratório e dia preferido só avisam.
- **Falhas do site para não repetir:** a carga horária só barra aula a mais (uma aula faltando passa e a grade ainda é aprovada), o CSV ignora a visão pedida e a habilitação do professor na disciplina não é validada.
- **Permissões:** o servidor do site barra as escritas do professor (403) e filtra o que o aluno recebe. Vale copiar essa ideia.

## Estrutura da pasta

```
.
├── README.md
├── AGENTS.md                         instruções para agentes de IA
├── docs/
│   ├── README.md                     índice dos documentos
│   ├── ideias.md                     caderno de ideias para começar
│   ├── Plano_Atividades_...docx      ficha enviada pelo professor
│   ├── Apresentacao_...pptx          apresentação enviada pelo professor
│   ├── slides/                       apresentação em PDF e imagens dos slides
│   └── analise/
│       ├── relatorio.md              proposta, passos, modelo de dados e regras
│       └── smartgrade-ia-analise-profunda.md   análise e testes do site de referência
├── referencia/
│   ├── horario-exemplo/              imagem do horário de exemplo (slide 3)
│   └── smartgrade-ia/                front-end copiado do site e API.md
├── src/                              código do projeto (a criar)
├── prototipos/                       protótipos das telas (a criar)
└── testes/                           cenários de teste e evidências (a criar)
```

## Sobre os arquivos do professor

A ficha de atividades e o horário que vieram nos arquivos são **exemplos, sem valor oficial**, e não precisam ser seguidos. O que vale é a proposta do projeto descrita nos slides.

## Sobre a cópia do site de referência

Em `referencia/smartgrade-ia/` está só o front-end público do site, para estudo. Ele não roda sozinho porque depende do servidor do professor, e o código desse servidor (com o gerador de grade) não é público e não está aqui. Para ver o site funcionando, acesse o endereço acima com o login de demonstração que o professor passou no grupo. A senha não está neste repositório.

## Passos do projeto

1. Escrever os requisitos RF01 a RF08 e os não funcionais.
2. Desenhar o modelo de dados e os casos de uso.
3. Prototipar as 6 telas: Dashboard, Professores, Disciplinas, Turmas, Alocação e Quadro.
4. Montar HTML e CSS responsivos.
5. Programar cadastros e alocação com LocalStorage.
6. Implementar a validação de conflitos e de carga horária (nos dois sentidos).
7. Fazer o quadro com consulta por dia, turma e professor.
8. Se o professor quiser: gerador automático com pontuação.
9. Testar com cenários de conflito e guardar as evidências.
10. Escrever o relatório acadêmico e preparar a demonstração.

## Entregáveis do estágio

Requisitos, casos de uso, modelo conceitual, protótipo das telas, código-fonte, sistema funcional, mecanismo de detecção de conflitos, testes e evidências, relatório acadêmico, apresentação e demonstração.
