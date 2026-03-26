# 📋 Task Board — Olimpíadas Mix League

> Cada agente trabalha de forma **independente**.  
> Todos usam o **mesmo contrato de dados** (schema Firebase + funções `db.js`) definido abaixo.  
> Nenhum agente precisa esperar outro terminar para começar.

---

## 🔗 CONTRATO COMPARTILHADO (Ler antes de tudo)

Todos os agentes devem respeitar este contrato. Ele define a estrutura dos dados e as funções que `db.js` expõe. Cada agente pode usar essas funções como se já existissem — quem implementa de fato é o **Agente 1**.

### Schema Firebase (caminhos no Realtime Database)
```
mixleague/
├── jogadores/{id}        → { nick: string, tier: number(1-5), paisId: string|null }
├── paises/{id}           → { nome: string, bandeira: string, jogadores: { jogadorId: true } }
├── torneio/              → { status: "aguardando"|"draft"|"em_andamento"|"finalizado", modalidadeAtual: string|null, fase: string|null }
├── medalhas/{id}         → { paisId: string, modalidade: string, posicao: number(1-3), pontos: number }
├── brackets/{modalidade} → { jogos: [...], fase: string, concluida: boolean }
├── config/               → { codigoAcesso: "1234", modalidades: ["x1","braco_direito","retake","5x5","corrida_armada"] }
└── draft/                → { ordem: [...], rodadaAtual: number, vezDe: string, status: "aguardando"|"em_andamento"|"finalizado" }
```

### Funções db.js (interface que todos os agentes usam)
```javascript
// ===== LEITURA (retornam Promises) =====
DB.getJogadores()                    → Promise<Array>
DB.getJogador(id)                    → Promise<Object>
DB.getPaises()                       → Promise<Array>
DB.getPais(id)                       → Promise<Object>
DB.getTorneio()                      → Promise<Object>
DB.getMedalhas()                     → Promise<Array>
DB.getBracket(modalidade)            → Promise<Object>
DB.getConfig()                       → Promise<Object>
DB.getDraft()                        → Promise<Object>

// ===== ESCRITA (retornam Promises) =====
DB.salvarJogador(id, dados)          → Promise<void>
DB.removerJogador(id)                → Promise<void>
DB.salvarPais(id, dados)             → Promise<void>
DB.atualizarTorneio(dados)           → Promise<void>
DB.adicionarMedalha(dados)           → Promise<void>
DB.salvarBracket(modalidade, dados)  → Promise<void>
DB.salvarDraft(dados)                → Promise<void>
DB.atualizarConfig(dados)            → Promise<void>

// ===== LISTENERS TEMPO REAL =====
DB.onJogadoresChange(callback)       → listener
DB.onPaisesChange(callback)          → listener
DB.onTorneioChange(callback)         → listener
DB.onMedalhasChange(callback)        → listener
DB.onBracketChange(modalidade, cb)   → listener
DB.onDraftChange(callback)           → listener
```

### HTML base (template que toda página deve seguir)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[TÍTULO] — Mix League</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body class="bg-[#0F172A] text-[#F8FAFC] font-['Inter'] min-h-screen">

  <!-- NAV (presente em todas as páginas exceto login) -->
  <nav id="main-nav" class="bg-[#1E293B] border-b border-[#334155] px-6 py-3 flex items-center justify-between">
    <a href="dashboard.html" class="text-xl font-bold text-[#F5A623]">🏅 Mix League</a>
    <div class="flex gap-4 text-sm">
      <a href="dashboard.html" class="hover:text-[#F5A623] transition">Dashboard</a>
      <a href="draft.html" class="hover:text-[#F5A623] transition">Draft</a>
      <a href="modalidade.html" class="hover:text-[#F5A623] transition">Modalidades</a>
      <a href="admin.html" id="nav-admin" class="hover:text-[#F5A623] transition hidden">Admin</a>
      <button onclick="Auth.logout()" class="text-red-400 hover:text-red-300 transition">Sair</button>
    </div>
  </nav>

  <!-- CONTEÚDO DA PÁGINA AQUI -->

  <!-- Scripts (ordem importa) -->
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"></script>
  <script src="js/firebase-config.js"></script>
  <script src="js/db.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/app.js"></script>
  <!-- Script específico da página -->
</body>
</html>
```

### Paleta de Cores
```
Background:  #0F172A     Surface/Cards: #1E293B     Border: #334155
Primária:    #1E3A5F     Dourado:       #F5A623     Texto: #F8FAFC
Sucesso:     #27AE60     Perigo:        #E74C3C     Muted: #94A3B8
```

### Sessão do Usuário (sessionStorage)
```javascript
// Auth.js salva e expõe:
Auth.getUser()   → { nick, role: "admin"|"jogador", paisId, loggedAt }
Auth.isAdmin()   → boolean
Auth.isLoggedIn() → boolean
Auth.logout()    → void (limpa sessão e redireciona para index.html)
```

---

## 🤖 AGENTE 1 — Firebase, DB e Autenticação

**Responsabilidade:** Criar a fundação — Firebase config, camada de dados e sistema de login.

**Arquivos que CRIA:**
- `js/firebase-config.js`
- `js/db.js`
- `js/auth.js`
- `js/app.js`
- `css/style.css`
- `index.html` (página de login)

**Tarefas:**
- [ ] Criar `js/firebase-config.js` com inicialização do Firebase SDK via CDN
- [ ] Criar `js/db.js` implementando TODAS as funções do contrato acima (CRUD + listeners)
- [ ] Criar `js/auth.js` com:
  - Login por Nick + Código (`1234`)
  - Sessão via `sessionStorage`
  - Funções `Auth.getUser()`, `Auth.isAdmin()`, `Auth.isLoggedIn()`, `Auth.logout()`
  - Nick `admin` tem `role: "admin"`, demais têm `role: "jogador"`
  - Verificação: nick deve existir na lista de jogadores do Firebase
- [ ] Criar `js/app.js` com:
  - Verificação de sessão em todas as páginas (redireciona para login se não logado)
  - Mostrar/esconder link Admin na nav conforme role
  - Helpers globais (formatação, toasts, loading)
- [ ] Criar `css/style.css` com:
  - Variáveis CSS da paleta
  - Classes utilitárias complementares ao Tailwind
  - Animações (fade-in, slide-up, pulse para updates)
  - Estilos do toast de notificação
- [ ] Criar `index.html` com:
  - Layout de login premium (dark mode, gradientes, logo)
  - Campos: Nick + Código
  - Validação visual (erro se código errado ou nick não existe)
  - Redirecionamento para `dashboard.html` após login
- [ ] Popular dados iniciais no Firebase (script de seed):
  - 20 jogadores com Tiers (1-5)
  - 4 países (Brasil, Argentina, Alemanha, Japão) com bandeiras emoji
  - Config inicial do torneio

---

## 🤖 AGENTE 2 — Draft Snake

**Responsabilidade:** Tela e lógica completa do Draft.

**Arquivos que CRIA:**
- `draft.html`
- `js/draft.js`

**Dependências de contrato (já definidas acima, usar como se existissem):**
- `DB.getJogadores()`, `DB.getPaises()`, `DB.getDraft()`
- `DB.salvarPais()`, `DB.salvarDraft()`, `DB.salvarJogador()`
- `DB.onDraftChange()`, `DB.onPaisesChange()`
- `Auth.isAdmin()`, `Auth.getUser()`

**Tarefas:**
- [ ] Criar `draft.html` com layout:
  - Pool de jogadores disponíveis (lado esquerdo) com filtro por Tier
  - 4 cards de Times/Países (lado direito) mostrando jogadores já escolhidos
  - Indicador visual de "vez de quem"
  - Tiers já preenchidos vs faltantes por time
  - Botão Admin: "Iniciar Draft", "Resetar Draft"
- [ ] Criar `js/draft.js` com:
  - Algoritmo Snake Draft (A→B→C→D → D→C→B→A) — 5 rounds
  - Validação: time não pode pegar 2 jogadores do mesmo Tier
  - Sorteio de Países para os 4 capitães
  - Ao clicar num jogador do pool → atribuir ao time da vez
  - Atualizar Firebase em tempo real (todos veem a pick)
  - Ao finalizar: salvar jogadores nos respectivos `paises/` e marcar draft como finalizado
  - Feedback: animação ao selecionar, som opcional, highlight do time atual

---

## 🤖 AGENTE 3 — Sorteio de Tiers e Modalidades

**Responsabilidade:** Tela de modalidade ativa com sorteio de Tiers.

**Arquivos que CRIA:**
- `modalidade.html`
- `js/sorteio.js`

**Dependências de contrato:**
- `DB.getPaises()`, `DB.getJogadores()`, `DB.getTorneio()`
- `DB.atualizarTorneio()`, `DB.getBracket()`, `DB.salvarBracket()`
- `DB.onTorneioChange()`, `DB.onBracketChange()`
- `Auth.isAdmin()`

**Tarefas:**
- [ ] Criar `modalidade.html` com:
  - Seleção de modalidade (X1, Braço Direito, Retake, 5x5, Corrida Armada)
  - Área de sorteio de Tiers (com animação de "roleta")
  - Exibição dos jogadores selecionados por time após sorteio
  - Área do bracket (preenchida pelo Agente 4 via `bracket.js`)
  - Placeholder `<div id="bracket-container"></div>` para o bracket
- [ ] Criar `js/sorteio.js` com:
  - `Sorteio.sortearTiers(modalidade)` → retorna array de Tiers sorteados
  - `Sorteio.getJogadoresParaModalidade(modalidade, tiersSorteados)` → retorna jogadores filtrados de cada país
  - Animação visual de roleta (números girando antes de revelar)
  - Admin: botão "Sortear" dispara o sorteio e salva no Firebase
  - Admin: botão "Confirmar" → inicia bracket (chama função do bracket.js)

---

## 🤖 AGENTE 4 — Chaveamento (Brackets)

**Responsabilidade:** Motor de geração e controle de brackets.

**Arquivos que CRIA:**
- `js/bracket.js`

**Dependências de contrato:**
- `DB.salvarBracket()`, `DB.getBracket()`, `DB.adicionarMedalha()`
- `DB.onBracketChange()`
- `Auth.isAdmin()`

**Tarefas:**
- [ ] Criar `js/bracket.js` com:
  - `Bracket.gerar(times)` → cria bracket baseado na quantidade de times:
    - 2 times → Final direta
    - 4 times → Semifinal + Final + Disputa de 3º
  - `Bracket.registrarVencedor(jogoId, vencedorId)` → avança vencedor, move perdedor
  - `Bracket.encerrarModalidade(modalidade)` → computa 1º, 2º, 3º e grava medalhas:
    - 1º lugar → `DB.adicionarMedalha({ posicao: 1, pontos: 10 })`
    - 2º lugar → `DB.adicionarMedalha({ posicao: 2, pontos: 5 })`
    - 3º lugar → `DB.adicionarMedalha({ posicao: 3, pontos: 2 })`
  - `Bracket.renderizar(containerId, bracketData)` → desenha bracket visual em HTML
    - Cards de confronto com nomes dos times e bandeiras
    - Linhas conectando fases (CSS)
    - Botão "Definir Vencedor" (visível só para Admin)
    - Destaque visual para vencedor de cada jogo
  - Listener: `DB.onBracketChange()` para atualizar UI em tempo real

---

## 🤖 AGENTE 5 — Dashboard e Quadro de Medalhas

**Responsabilidade:** Dashboard principal e página de perfil do país.

**Arquivos que CRIA:**
- `dashboard.html`
- `pais.html`
- `js/medalhas.js`

**Dependências de contrato:**
- `DB.getMedalhas()`, `DB.getPaises()`, `DB.getJogadores()`, `DB.getTorneio()`
- `DB.onMedalhasChange()`, `DB.onTorneioChange()`, `DB.onPaisesChange()`

**Tarefas:**
- [ ] Criar `js/medalhas.js` com:
  - `Medalhas.calcularRanking()` → retorna países ordenados por pontos
  - `Medalhas.getPontuacaoPais(paisId)` → { ouro, prata, bronze, total }
  - Regra de desempate: mais Ouros > mais Pratas > mais Bronzes
  - `Medalhas.getHistoricoPais(paisId)` → medalhas por modalidade
- [ ] Criar `dashboard.html` com:
  - Quadro de Medalhas em tabela (ranking por pontos)
  - Colunas: Posição, Bandeira, País, 🥇, 🥈, 🥉, Total
  - Card de destaque: modalidade atual em andamento
  - Status geral do torneio
  - Animação: linha do líder pulsa/brilha
  - Listener Firebase: atualiza quadro automaticamente
- [ ] Criar `pais.html` com:
  - Recebe `?id=paisId` na URL
  - Bandeira grande + nome do país
  - Lista de jogadores com Tier badge (cor por tier)
  - Tabela de medalhas por modalidade
  - Total de pontos acumulados

---

## 🤖 AGENTE 6 — Painel Administrativo

**Responsabilidade:** Painel completo de controle para o Admin.

**Arquivos que CRIA:**
- `admin.html`

**Dependências de contrato:**
- Todas as funções `DB.*`
- `Auth.isAdmin()` (redireciona se não for admin)

**Tarefas:**
- [ ] Criar `admin.html` com as seguintes seções (abas ou accordion):
  - **Jogadores:** tabela editável — adicionar, remover, alterar Tier
  - **Países:** ver composição de cada time (após draft)
  - **Draft:** botão "Iniciar Draft" (redireciona para draft.html) e "Resetar Draft"
  - **Torneio:** iniciar/encerrar modalidades, ver status atual
  - **Sorteio:** botão para sortear Tiers (redireciona para modalidade.html)
  - **Resultados:** registrar 1º, 2º, 3º de cada modalidade manualmente (fallback)
  - **Reset:** botão para zerar torneio completo (com confirmação dupla)
- [ ] Proteção: verificar `Auth.isAdmin()` ao carregar. Se não for admin → `dashboard.html`
- [ ] Feedback: toasts ao salvar, confirmar e resetar
- [ ] Responsividade mobile

---

## 📌 Resumo dos Agentes

| Agente | Responsabilidade | Arquivos | Pode iniciar? |
|--------|-----------------|----------|---------------|
| 1 | Firebase + DB + Auth + Login | `firebase-config.js`, `db.js`, `auth.js`, `app.js`, `style.css`, `index.html` | ✅ Sim |
| 2 | Draft Snake | `draft.html`, `draft.js` | ✅ Sim |
| 3 | Sorteio de Tiers | `modalidade.html`, `sorteio.js` | ✅ Sim |
| 4 | Brackets | `bracket.js` | ✅ Sim |
| 5 | Dashboard + Medalhas | `dashboard.html`, `pais.html`, `medalhas.js` | ✅ Sim |
| 6 | Painel Admin | `admin.html` | ✅ Sim |

> **Todos podem iniciar imediatamente** porque seguem o mesmo contrato de dados.  
> O Agente 1 implementa as funções reais; os demais usam as mesmas assinaturas.  
> Ao final, basta juntar os arquivos — tudo se conecta automaticamente via Firebase.

---

## 🔀 Instruções para cada Agente

Ao pedir para um agente trabalhar, envie:

```
Leia o arquivo task.md e o project.md do projeto MixLeague.  
Execute APENAS as tarefas do AGENTE [N].  
Siga o CONTRATO COMPARTILHADO (schema Firebase + funções DB).  
Use o template HTML base definido no task.md.  
Use a paleta de cores e fontes do Design System.  
NÃO modifique arquivos de outros agentes.
```
