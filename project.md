# 🏅 Olimpíadas Mix League — Plano do Projeto

> **Stack:** HTML + Tailwind CSS + JavaScript (vanilla) + Firebase Realtime Database  
> **Objetivo:** SaaS de torneios CS2 entre amigos com equilíbrio técnico por Tiers e múltiplas modalidades.  
> **Banco de dados:** Firebase Realtime Database (gratuito, tempo real, acessível de qualquer dispositivo)

---

## 📋 Visão Geral do Sistema

### Conceito
Evento multimodalidade onde equipes representam **Países**. Equilíbrio garantido por **Tiers (1–5)** e um **Draft Snake** que obriga cada time a ter exatamente um jogador de cada nível técnico.

### Quadro de Medalhas
| Posição | Medalha | Pontos |
|---------|---------|--------|
| 1º lugar | 🥇 Ouro | 10 pts |
| 2º lugar | 🥈 Prata | 5 pts |
| 3º lugar | 🥉 Bronze | 2 pts |

### Modalidades
| Modalidade | Jogadores/Time | Regra de Sorteio |
|------------|----------------|------------------|
| X1 | 1 | Sorteia 1 Tier |
| Braço Direito (2x2) | 2 | Sorteia 2 Tiers |
| Retake | 4 | Sorteia 4 Tiers |
| 5x5 | 5 | Todos jogam |
| Corrida Armada | 5 | Todos jogam |

### Login Simplificado
- Nick + Código fixo (`1234`)
- Sem criação de conta complexa
- Admin tem painel de controle

---

## 🗂 Estrutura de Arquivos

```
MixLeague/
├── index.html              # Landing page + login
├── dashboard.html          # Dashboard principal (Quadro de Medalhas)
├── admin.html              # Painel do Admin
├── draft.html              # Tela do Draft Snake
├── modalidade.html         # Tela de modalidade ativa (sorteio + bracket)
├── pais.html               # Página de perfil do País
├── css/
│   └── style.css           # Estilos customizados (complemento ao Tailwind)
├── js/
│   ├── app.js              # Inicialização, rotas, estado global
│   ├── auth.js             # Login/sessão (Nick + código)
│   ├── firebase-config.js  # Configuração do Firebase
│   ├── db.js               # Camada de dados (Firebase CRUD)
│   ├── draft.js            # Algoritmo do Draft Snake
│   ├── sorteio.js          # Sorteio de Tiers por modalidade
│   ├── bracket.js          # Geração de chaveamento automático
│   └── medalhas.js         # Quadro de medalhas + pontuação
├── assets/
│   └── bandeiras/          # Imagens das bandeiras dos países
└── project.md              # Este arquivo
```

---

## 🚀 Etapas de Desenvolvimento

---

### ETAPA 1 — Base e Infraestrutura
**Objetivo:** Criar o esqueleto do projeto, sistema de dados e autenticação.

**Arquivos envolvidos:**
- `index.html` — Página de login
- `js/firebase-config.js` — Inicialização do Firebase
- `js/db.js` — Camada de persistência com Firebase Realtime Database
- `js/auth.js` — Sistema de login (Nick + código "1234")
- `js/app.js` — Estado global e navegação entre páginas
- `css/style.css` — Design system base com Tailwind

**Tarefas:**
- [ ] Criar projeto no Firebase Console (gratuito) e obter credenciais
- [ ] Criar `firebase-config.js` com inicialização do SDK
- [ ] Criar `index.html` com layout de login (campo Nick + código)
- [ ] Implementar `db.js` com funções CRUD usando Firebase Realtime Database
- [ ] Implementar `auth.js` com login simples e controle de sessão (sessionStorage para sessão local)
- [ ] Configurar Tailwind via CDN
- [ ] Criar `app.js` com estado global e listeners do Firebase (tempo real)
- [ ] Popular dados iniciais no Firebase (jogadores, países, config)
- [ ] Diferenciar sessão de Admin vs Jogador comum

**Estrutura do banco (Firebase Realtime Database):**
```
mixleague/
├── jogadores/
│   └── {id}/              → { nick, tier, paisId }
├── paises/
│   └── {id}/              → { nome, bandeira, jogadores: { id: true } }
├── torneio/               → { status, modalidadeAtual, fase }
├── medalhas/
│   └── {id}/              → { paisId, modalidade, posicao, pontos }
├── brackets/
│   └── {modalidade}/      → { jogos: [...], fase, concluida }
└── config/                → { codigoAcesso, tiersDisponiveis, modalidades[] }
```

**Configuração do Firebase (firebase-config.js):**
```javascript
// Import via CDN (adicionar no HTML)
// <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"></script>

const firebaseConfig = {
  apiKey: "AIzaSyBDFEHpGMjnpWaV6S2pLKIvekpEyD7Zj_s",
  authDomain: "newoml.firebaseapp.com",
  databaseURL: "https://newoml-default-rtdb.firebaseio.com",
  projectId: "newoml",
  storageBucket: "newoml.firebasestorage.app",
  messagingSenderId: "105751662804",
  appId: "1:105751662804:web:a412681d803b12b4642b41",
  measurementId: "G-ZJ4LH92702"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
```

---

### ETAPA 2 — Draft Snake
**Objetivo:** Implementar o sistema de draft onde cada capitão monta sua equipe.

**Arquivos envolvidos:**
- `draft.html` — Interface visual do draft
- `js/draft.js` — Algoritmo Snake Draft

**Tarefas:**
- [ ] Criar `draft.html` com layout: pool de jogadores à esquerda, times à direita
- [ ] Implementar algoritmo Snake Draft (A→B→C→D → D→C→B→A)
- [ ] Validar regra: cada time DEVE ter exatamente 1 jogador por Tier (1–5)
- [ ] Sorteio automático de qual País cada capitão representa
- [ ] Feedback visual em tempo real (jogador selecionado, vez de quem, tiers restantes)
- [ ] Salvar resultado do draft no Firebase (`paises/` atualizado em tempo real)
- [ ] Botão Admin: "Resetar Draft"

**Regras do Draft:**
```
Ordem Snake (4 times):
  Round 1: A → B → C → D
  Round 2: D → C → B → A
  Round 3: A → B → C → D
  Round 4: D → C → B → A
  Round 5: A → B → C → D

Restrição: Se um time já tem um jogador Tier 3,
           não pode selecionar outro Tier 3.
```

---

### ETAPA 3 — Sistema de Modalidades e Sorteio de Tiers
**Objetivo:** Criar o motor de sorteio que define quais jogadores participam de cada modalidade.

**Arquivos envolvidos:**
- `modalidade.html` — Tela da modalidade ativa
- `js/sorteio.js` — Algoritmo de sorteio de Tiers

**Tarefas:**
- [ ] Criar `modalidade.html` com exibição da modalidade selecionada
- [ ] Implementar `sorteio.js` com lógica por tipo de modalidade:
  - X1: sorteia 1 Tier aleatório → 1 jogador por time
  - Braço Direito: sorteia 2 Tiers → 2 jogadores por time
  - Retake: sorteia 4 Tiers → 4 jogadores por time
  - 5x5 / Corrida Armada: todos os 5 jogam
- [ ] Animação de sorteio (efeito "roleta" nos Tiers)
- [ ] Exibir jogadores selecionados com nome, Tier e bandeira do país
- [ ] Admin: botão "Sortear Tiers" e "Confirmar Participantes"

**Pseudocódigo do Sorteio:**
```javascript
function sortearTiers(modalidade) {
  const todosOsTiers = [1, 2, 3, 4, 5];
  let quantidade;

  switch(modalidade) {
    case 'x1':             quantidade = 1; break;
    case 'braco_direito':  quantidade = 2; break;
    case 'retake':         quantidade = 4; break;
    case '5x5':
    case 'corrida_armada': return todosOsTiers; // todos jogam
  }

  // Embaralha e seleciona N tiers
  return shuffle(todosOsTiers).slice(0, quantidade);
}
```

---

### ETAPA 4 — Chaveamento Automático (Brackets)
**Objetivo:** Gerar confrontos automaticamente após definir participantes.

**Arquivos envolvidos:**
- `js/bracket.js` — Motor de geração de brackets
- `modalidade.html` — Exibição visual do bracket

**Tarefas:**
- [ ] Implementar `bracket.js` com geração de chaves:
  - 2 times → Final direta
  - 4 times → Semifinal + Final
  - Suporte a Best-of-1 (md1)
- [ ] Renderizar bracket visual na `modalidade.html`
- [ ] Admin: botão para registrar vencedor de cada confronto
- [ ] Avançar times vencedores automaticamente no bracket
- [ ] Ao encerrar modalidade, computar 1º, 2º e 3º lugar
- [ ] Salvar resultado no Firebase (`medalhas/` — todos veem em tempo real)

**Estrutura do Bracket (4 times):**
```
Semifinal 1: Time A vs Time B
Semifinal 2: Time C vs Time D
Final: Vencedor SF1 vs Vencedor SF2
3º Lugar: Perdedor SF1 vs Perdedor SF2
```

---

### ETAPA 5 — Quadro de Medalhas e Dashboard
**Objetivo:** Criar o painel principal com ranking atualizado em tempo real via Firebase listeners.

**Arquivos envolvidos:**
- `dashboard.html` — Dashboard Olímpico
- `pais.html` — Perfil individual do país
- `js/medalhas.js` — Cálculo de pontuação

**Tarefas:**
- [ ] Criar `dashboard.html` com:
  - Quadro de Medalhas (ranking geral por pontos)
  - Contagem de 🥇🥈🥉 por país
  - Modalidade atual em destaque
  - Status do torneio (fase atual)
- [ ] Criar `pais.html` com:
  - Bandeira do país
  - Lista de jogadores + Tiers
  - Medalhas conquistadas por modalidade
  - Total de pontos
- [ ] Implementar `medalhas.js`:
  - Função para somar pontos (Ouro=10, Prata=5, Bronze=2)
  - Ranking automático por pontuação
  - Desempate por quantidade de Ouros > Pratas > Bronzes
- [ ] Animações ao atualizar placar (destaque ao líder)

---

### ETAPA 6 — Painel Admin e Polimento Final
**Objetivo:** Centralizar controles do administrador e finalizar UX.

**Arquivos envolvidos:**
- `admin.html` — Painel administrativo
- Todos os arquivos JS (ajustes finais)

**Tarefas:**
- [ ] Criar `admin.html` com:
  - Gerenciar jogadores (adicionar/remover/editar Tier)
  - Iniciar/encerrar modalidades
  - Executar sorteios de Tiers
  - Registrar resultados (1º, 2º, 3º)
  - Resetar torneio completo
  - Visualizar sessões ativas
- [ ] Proteção de rotas Admin (verificar sessão com `role === 'admin'`)
- [ ] Responsividade mobile (Tailwind breakpoints)
- [ ] Tema visual Olímpico (cores, ícones, bandeiras)
- [ ] Feedback visual: toasts de confirmação, loading states
- [ ] Testes manuais de fluxo completo:
  - Login → Draft → Modalidade → Sorteio → Bracket → Resultado → Medalhas

---

## 🎨 Design System

### Paleta de Cores (sugestão)
```
Primária:       #1E3A5F (Azul escuro)
Secundária:     #F5A623 (Dourado)
Sucesso:        #27AE60 (Verde)
Perigo:         #E74C3C (Vermelho)
Background:     #0F172A (Dark mode)
Surface:        #1E293B (Cards)
Texto:          #F8FAFC (Branco suave)
```

### Fontes
- Títulos: `Inter` ou `Outfit` (Google Fonts)
- Corpo: `Inter`

### Tailwind via CDN
```html
<script src="https://cdn.tailwindcss.com"></script>
```

---

## 📌 Resumo das Etapas

| Etapa | Nome | Arquivos Principais | Dependência |
|-------|------|---------------------|-------------|
| 1 | Base e Infraestrutura | `index.html`, `firebase-config.js`, `db.js`, `auth.js`, `app.js` | Nenhuma |
| 2 | Draft Snake | `draft.html`, `draft.js` | Etapa 1 |
| 3 | Modalidades e Sorteio | `modalidade.html`, `sorteio.js` | Etapa 2 |
| 4 | Chaveamento (Brackets) | `bracket.js`, `modalidade.html` | Etapa 3 |
| 5 | Dashboard e Medalhas | `dashboard.html`, `pais.html`, `medalhas.js` | Etapa 4 |
| 6 | Painel Admin e Polish | `admin.html`, ajustes gerais | Etapa 5 |

---

## 🔧 Setup Inicial (Firebase)

1. Criar projeto em [console.firebase.google.com](https://console.firebase.google.com)
2. Ativar **Realtime Database** (modo teste para começar)
3. Copiar credenciais para `firebase-config.js`
4. Abrir `index.html` no navegador (ou usar Live Server do VS Code)
5. Login como Admin: Nick = `admin`, Código = `1234`
6. Login como Jogador: Nick = qualquer nick cadastrado, Código = `1234`

> **Vantagem do Firebase:** Todos acessam os mesmos dados de qualquer dispositivo em tempo real. Sem precisar de backend próprio!

## ⚡ Vantagens do Firebase vs localStorage

| Recurso | localStorage | Firebase |
|---------|-------------|----------|
| Acesso multi-dispositivo | ❌ | ✅ |
| Dados em tempo real | ❌ | ✅ |
| Custo | Grátis | Grátis (plano Spark) |
| Setup de servidor | Nenhum | Nenhum |
| Limite | ~5MB | 1GB (plano grátis) |
| Persistência | Só no navegador | Na nuvem |
