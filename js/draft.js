/**
 * draft.js — Lógica completa do Draft Snake com setup flow de 3 passos
 * Mix League
 *
 * Admin NÃO é jogador — ele apenas administra o torneio.
 */

const Draft = {
  // ─── Estado ──────────────────────────────────────────────────────────────────
  estado: null,        // dados do draft (Firebase)
  jogadores: [],       // todos os jogadores (excluindo admin)
  paises: [],          // todos os países cadastrados
  _listeners: [],      // referências para cleanup de listeners Firebase

  // Estado do fluxo de setup (3 passos)
  _setupData: {
    numTimes: null,
    capitaesSelecionados: [],  // array de objetos jogador
    assignedPaises: null,      // { paisId: nick }
    capitaeTiers: null,        // { paisId: tier } — tier do capitão de cada país
    ordemTiers: null,          // [3,1,5,2,4] — ordem sorteada dos tiers
    ordemPaisesBase: null,     // [paisId, ...] — ordem base dos países
    ordemSorteada: null,       // [paisId, ...] — parallel array: country per pick
    ordemTierPorPick: null,    // [tier, ...] — parallel array: tier per pick
    paisesUsados: []
  },

  // ─── Inicialização ────────────────────────────────────────────────────────────
  async init() {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }

    // Mostra link Admin na nav e controles de admin
    if (typeof Auth !== 'undefined' && Auth.isAdmin()) {
      const navAdmin = document.getElementById('nav-admin');
      if (navAdmin) navAdmin.classList.remove('hidden');
      const adminControls = document.getElementById('admin-controls');
      if (adminControls) adminControls.classList.remove('hidden');
    }

    try {
      const [jogadores, paises, draftData] = await Promise.all([
        DB.getJogadores(),
        DB.getPaises(),
        DB.getDraft()
      ]);

      // Exclui admin da lista de jogadores
      this.jogadores = (jogadores || []).filter(j => j.nick !== 'admin');
      this.paises    = paises    || [];
      this.estado    = draftData || null;

      this._renderizarUI();
      this._configurarListeners();
    } catch (err) {
      console.error('[Draft] Erro ao inicializar:', err);
      this._showToast('Erro ao carregar dados do draft.', 'error');
    }
  },

  // ─── Listeners Firebase ──────────────────────────────────────────────────────
  _configurarListeners() {
    // Listener do draft (tempo real)
    const draftListener = DB.onDraftChange((dados) => {
      this.estado = dados || null;
      this._sincronizarSessaoCapitao();
      this._renderizarUI();
    });
    this._listeners.push(draftListener);

    // Listener de jogadores (tempo real)
    const jogadoresListener = DB.onJogadoresChange((dados) => {
      this.jogadores = (dados || []).filter(j => j.nick !== 'admin');
      if (this.estado && this.estado.status === 'em_andamento') {
        this.renderizarPool();
      }
    });
    this._listeners.push(jogadoresListener);

    // Listener de países (tempo real)
    const paisesListener = DB.onPaisesChange((dados) => {
      this.paises = dados || [];
      if (this.estado && (this.estado.status === 'em_andamento' || this.estado.status === 'finalizado')) {
        this.renderizarTimes();
      }
    });
    this._listeners.push(paisesListener);

    // Desliga listeners ao sair da página
    window.addEventListener('beforeunload', () => {
      this._listeners.forEach(l => {
        if (l && typeof l.off === 'function') l.off();
      });
    });
  },

  // ─── Sincronizar sessão do capitão ───────────────────────────────────────────
  // Quando o draft entra em andamento, atualiza o sessionStorage do capitão com seu paisId
  _sincronizarSessaoCapitao() {
    if (!this.estado || this.estado.status !== 'em_andamento') return;
    const capitaes = this.estado.capitaes || {};
    const user = Auth.getUser();
    if (!user || Auth.isAdmin()) return;

    for (const [paisId, nick] of Object.entries(capitaes)) {
      if (nick === user.nick && user.paisId !== paisId) {
        const updatedUser = { ...user, paisId };
        sessionStorage.setItem('ml_user', JSON.stringify(updatedUser));
        break;
      }
    }
  },

  // ─── Render central ──────────────────────────────────────────────────────────
  _renderizarUI() {
    const status = this.estado ? this.estado.status : 'aguardando';

    if (status === 'aguardando' || !this.estado) {
      this._mostrarMensagem(
        '⏳',
        'Aguardando início',
        Auth.isAdmin()
          ? 'Clique em "Iniciar Draft" para configurar e começar as picks.'
          : 'O draft ainda não foi iniciado. Aguarde o administrador iniciar o sorteio.'
      );
      this._atualizarBotoesAdmin('aguardando');
      return;
    }

    if (status === 'finalizado') {
      document.getElementById('state-message').style.display = 'none';
      document.getElementById('draft-content').style.display = 'block';
      document.getElementById('status-banner').classList.add('hidden');
      this.renderizarTimes();
      this._atualizarBotoesAdmin('finalizado');
      return;
    }

    // status === 'em_andamento'
    document.getElementById('state-message').style.display = 'none';
    document.getElementById('draft-content').style.display = 'block';
    this._atualizarBotoesAdmin('em_andamento');
    this.renderizarStatus();
    this.renderizarPool();
    this.renderizarTimes();
  },

  _mostrarMensagem(icone, titulo, desc) {
    document.getElementById('state-icon').textContent  = icone;
    document.getElementById('state-title').textContent = titulo;
    document.getElementById('state-desc').textContent  = desc;

    document.getElementById('state-message').style.display = 'flex';
    document.getElementById('draft-content').style.display = 'none';
    document.getElementById('status-banner').classList.add('hidden');
  },

  // ─── Botões Admin ────────────────────────────────────────────────────────────
  _atualizarBotoesAdmin(status) {
    if (!Auth.isAdmin()) return;
    const btnIniciar = document.getElementById('btn-iniciar');
    const btnResetar = document.getElementById('btn-resetar');
    if (!btnIniciar || !btnResetar) return;

    if (status === 'aguardando') {
      btnIniciar.disabled = false;
      btnIniciar.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      btnIniciar.disabled = true;
      btnIniciar.classList.add('opacity-50', 'cursor-not-allowed');
    }

    btnResetar.disabled = false;
    btnResetar.classList.remove('opacity-50', 'cursor-not-allowed');
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  FLUXO DE SETUP — 3 Passos
  // ════════════════════════════════════════════════════════════════════════════

  iniciarDraft() {
    if (!Auth.isAdmin()) {
      this._showToast('Apenas o administrador pode iniciar o draft.', 'error');
      return;
    }

    // Reseta dados de setup
    this._setupData = {
      numTimes: null,
      capitaesSelecionados: [],
      assignedPaises: null,
      capitaeTiers: null,
      ordemTiers: null,
      ordemPaisesBase: null,
      ordemSorteada: null,
      ordemTierPorPick: null,
      paisesUsados: []
    };

    // Mostra overlay no step 1
    const overlay = document.getElementById('setup-overlay');
    document.getElementById('setup-step-1').classList.remove('hidden');
    document.getElementById('setup-step-2').classList.add('hidden');
    document.getElementById('setup-step-3').classList.add('hidden');
    overlay.classList.remove('hidden');
  },

  _fecharSetup() {
    document.getElementById('setup-overlay').classList.add('hidden');
  },

  // ── STEP 1 → STEP 2 ─────────────────────────────────────────────────────────
  _selecionarNumTimes(n) {
    this._setupData.numTimes = n;
    this._mostrarStep2();
  },

  async _mostrarStep2() {
    const n = this._setupData.numTimes;

    // Verifica se há países suficientes
    const paises = await DB.getPaises();
    if (!paises || paises.length < n) {
      this._showToast(`São necessários ao menos ${n} países cadastrados.`, 'error');
      return;
    }

    // Recarrega jogadores frescos (excluindo admin)
    const jogadores = await DB.getJogadores();
    this.jogadores = (jogadores || []).filter(j => j.nick !== 'admin');

    // Reseta seleção de capitães
    this._setupData.capitaesSelecionados = [];

    // Atualiza contador
    document.getElementById('capitaes-contador').textContent = '0';
    document.getElementById('capitaes-total-label').textContent = ` / ${n} selecionados`;

    // Botão confirmar desabilitado
    const btnConfirmar = document.getElementById('btn-confirmar-capitaes');
    btnConfirmar.disabled = true;
    btnConfirmar.classList.add('opacity-40', 'cursor-not-allowed');
    btnConfirmar.classList.remove('hover:bg-yellow-400', 'cursor-pointer');

    // Renderiza grade de capitães
    this._renderizarGridCapitaes();

    // Troca de step
    document.getElementById('setup-step-1').classList.add('hidden');
    document.getElementById('setup-step-2').classList.remove('hidden');
  },

  _renderizarGridCapitaes() {
    const grid = document.getElementById('capitaes-grid');
    const jogadores = this.jogadores;

    if (!jogadores || jogadores.length === 0) {
      grid.innerHTML = `<p class="text-[#94A3B8] text-sm text-center py-6 col-span-2">Nenhum jogador cadastrado.</p>`;
      return;
    }

    // Ordena por nick
    const sorted = [...jogadores].sort((a, b) => a.nick.localeCompare(b.nick));
    const selecionados = new Set(this._setupData.capitaesSelecionados.map(j => j.id));

    grid.innerHTML = sorted.map(jogador => {
      const esSelecionado = selecionados.has(jogador.id);
      const tierBadge = this._getTierBadge(jogador.tier);
      const tierLabel = jogador.tier ? `T${jogador.tier}` : '?';
      return `
        <div id="cap-card-${jogador.id}"
          class="capitao-card ${esSelecionado ? 'selecionado' : ''}"
          onclick="Draft._toggleCapitao('${jogador.id}')">
          <div class="cap-check" id="cap-check-${jogador.id}">${esSelecionado ? '✓' : ''}</div>
          <span class="font-semibold text-sm text-[#F8FAFC] flex-1 truncate">${sanitize(jogador.nick)}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${tierBadge}">${tierLabel}</span>
        </div>
      `;
    }).join('');
  },

  _toggleCapitao(jogadorId) {
    const n = this._setupData.numTimes;
    const jogador = this.jogadores.find(j => j.id === jogadorId);
    if (!jogador) return;

    const idx = this._setupData.capitaesSelecionados.findIndex(j => j.id === jogadorId);

    if (idx !== -1) {
      // Desmarca
      this._setupData.capitaesSelecionados.splice(idx, 1);
      const card  = document.getElementById(`cap-card-${jogadorId}`);
      const check = document.getElementById(`cap-check-${jogadorId}`);
      if (card)  card.classList.remove('selecionado');
      if (check) check.textContent = '';
    } else {
      // Já tem N selecionados — não permite mais
      if (this._setupData.capitaesSelecionados.length >= n) {
        this._showToast(`Máximo de ${n} capitães atingido.`, 'info');
        return;
      }
      // Marca
      this._setupData.capitaesSelecionados.push(jogador);
      const card  = document.getElementById(`cap-card-${jogadorId}`);
      const check = document.getElementById(`cap-check-${jogadorId}`);
      if (card)  card.classList.add('selecionado');
      if (check) check.textContent = '✓';
    }

    const qtd = this._setupData.capitaesSelecionados.length;
    document.getElementById('capitaes-contador').textContent = qtd;

    // Atualiza botão confirmar
    const btnConfirmar = document.getElementById('btn-confirmar-capitaes');
    if (qtd === n) {
      btnConfirmar.disabled = false;
      btnConfirmar.classList.remove('opacity-40', 'cursor-not-allowed');
      btnConfirmar.classList.add('hover:bg-yellow-400', 'cursor-pointer');
    } else {
      btnConfirmar.disabled = true;
      btnConfirmar.classList.add('opacity-40', 'cursor-not-allowed');
      btnConfirmar.classList.remove('hover:bg-yellow-400', 'cursor-pointer');
    }
  },

  _confirmarCapitaes() {
    const n = this._setupData.numTimes;
    if (this._setupData.capitaesSelecionados.length !== n) {
      this._showToast(`Selecione exatamente ${n} capitães.`, 'error');
      return;
    }
    this._mostrarStep3();
  },

  // ── STEP 2 → STEP 3 ─────────────────────────────────────────────────────────
  _mostrarStep3() {
    const n       = this._setupData.numTimes;
    const paises  = [...this.paises];

    // Pega os primeiros N países e embaralha a ordem
    const primeirosN = paises.slice(0, n);
    const paisesEmbaralhados = this._embaralhar([...primeirosN]);

    // Associa capitão → país aleatoriamente
    const capitaesEmbaralhados = this._embaralhar([...this._setupData.capitaesSelecionados]);
    const assignedPaises = {};  // paisId → nick
    const paisesUsados   = [];

    for (let i = 0; i < n; i++) {
      const pais    = paisesEmbaralhados[i];
      const capitao = capitaesEmbaralhados[i];
      assignedPaises[pais.id] = capitao.nick;
      paisesUsados.push(pais);
    }

    // Sorteio da ordem dos tiers
    const ordemTiers = this._embaralhar([1, 2, 3, 4, 5]);

    // Tier de cada capitão por paisId
    const capitaeTiers = {};
    for (const [paisId, nickCap] of Object.entries(assignedPaises)) {
      const jogadorCap = this._setupData.capitaesSelecionados.find(j => j.nick === nickCap);
      capitaeTiers[paisId] = jogadorCap ? (Number(jogadorCap.tier) || null) : null;
    }

    // Gera sequência completa: para cada tier (na ordem sorteada),
    // somente os países cujo capitão NÃO é desse tier precisam fazer pick.
    // A ordem snake se inverte a cada rodada de tier.
    const ordemPaisesBase = paisesUsados.map(p => p.id);
    const ordemSorteada = [];
    const ordemTierPorPick = [];
    for (let r = 0; r < ordemTiers.length; r++) {
      const tier = ordemTiers[r];
      const eligible = ordemPaisesBase.filter(p => Number(capitaeTiers[p]) !== tier);
      const ordered = r % 2 === 0 ? [...eligible] : [...eligible].reverse();
      for (const paisId of ordered) {
        ordemSorteada.push(paisId);
        ordemTierPorPick.push(tier);
      }
    }

    this._setupData.assignedPaises   = assignedPaises;
    this._setupData.capitaeTiers     = capitaeTiers;
    this._setupData.ordemTiers       = ordemTiers;
    this._setupData.ordemPaisesBase  = ordemPaisesBase;
    this._setupData.ordemSorteada    = ordemSorteada;
    this._setupData.ordemTierPorPick = ordemTierPorPick;
    this._setupData.paisesUsados     = paisesUsados;

    // Renderiza tabela de resultado
    const container = document.getElementById('ordem-resultado');

    // Tabela de times sorteados
    const tabelaTimes = `
      <div class="mb-5">
        <h3 class="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Times Sorteados</h3>
        <div class="bg-[#0F172A] rounded-xl border border-[#334155] overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[#334155]">
                <th class="text-left px-4 py-2 text-[#94A3B8] font-semibold">Posição</th>
                <th class="text-left px-4 py-2 text-[#94A3B8] font-semibold">País</th>
                <th class="text-left px-4 py-2 text-[#94A3B8] font-semibold">Capitão</th>
              </tr>
            </thead>
            <tbody>
              ${paisesUsados.map((pais, i) => `
                <tr class="border-b border-[#334155] last:border-0">
                  <td class="px-4 py-3">
                    <span class="bg-[#1E293B] text-[#F5A623] font-bold text-xs px-2 py-1 rounded-full">#${i + 1}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-lg mr-2">${sanitize(pais.bandeira || '')}</span>
                    <span class="font-semibold text-[#F8FAFC]">${sanitize(pais.nome)}</span>
                  </td>
                  <td class="px-4 py-3 text-[#F8FAFC] font-medium">${sanitize(assignedPaises[pais.id])}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Section 1 - Ordem dos Tiers (colored badges)
    const TIER_COLORS = { 1: '#F5A623', 2: '#94A3B8', 3: '#CD7F32', 4: '#27AE60', 5: '#3B82F6' };
    const TIER_TEXT = { 1: '#0F172A', 2: '#0F172A', 3: '#F8FAFC', 4: '#F8FAFC', 5: '#F8FAFC' };
    const ordemTiersHtml = ordemTiers.map((t, i) =>
      `<div class="flex flex-col items-center gap-1">
        <span class="text-xs text-[#94A3B8]">#${i+1}</span>
        <span style="background:${TIER_COLORS[t]};color:${TIER_TEXT[t]}" class="text-xs font-bold px-3 py-1.5 rounded-full">T${t}</span>
      </div>`
    ).join('');
    const tabelaTiers = `
      <div class="mb-5">
        <h3 class="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Ordem dos Tiers Sorteada</h3>
        <div class="bg-[#0F172A] rounded-xl border border-[#334155] p-4">
          <div class="flex items-center gap-3 flex-wrap">${ordemTiersHtml}</div>
        </div>
      </div>
    `;

    // Section 2 - Picks por rodada de tier
    const totalPicks = ordemSorteada.length;
    const roundsLabel = [];
    let pos = 0;
    for (let r = 0; r < ordemTiers.length; r++) {
      const tier = ordemTiers[r];
      const eligible = ordemPaisesBase.filter(p => Number(capitaeTiers[p]) !== tier);
      const count = eligible.length;
      const picksNestaRodada = ordemSorteada.slice(pos, pos + count);
      pos += count;
      const seta = r % 2 === 0 ? '→' : '←';
      const cor = r % 2 === 0 ? 'text-[#F5A623]' : 'text-[#94A3B8]';
      const tierColor = TIER_COLORS[tier];
      const tierTextColor = TIER_TEXT[tier];
      roundsLabel.push(`
        <div class="flex items-center gap-2 text-sm">
          <span style="background:${tierColor};color:${tierTextColor}" class="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 w-10 text-center">T${tier}</span>
          <span class="${cor} text-xs mr-1">${seta}</span>
          <div class="flex gap-2 flex-wrap">
            ${picksNestaRodada.map(paisId => {
              const p = paisesUsados.find(x => x.id === paisId);
              return p ? `<span class="bg-[#1E293B] border border-[#334155] rounded px-2 py-0.5 text-xs font-medium">${sanitize(p.bandeira || '')} ${sanitize(p.nome)}</span>` : '';
            }).join('')}
            ${eligible.length === 0 ? `<span class="text-[#94A3B8] text-xs italic">todos têm capitão neste tier</span>` : ''}
          </div>
        </div>
      `);
    }
    const tabelaOrdem = `
      <div>
        <h3 class="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Picks por Rodada de Tier (${totalPicks} picks + ${n} capitães)</h3>
        <div class="bg-[#0F172A] rounded-xl border border-[#334155] p-4 flex flex-col gap-3">
          ${roundsLabel.join('')}
        </div>
      </div>
    `;

    container.innerHTML = tabelaTimes + tabelaTiers + tabelaOrdem;

    // Troca de step
    document.getElementById('setup-step-2').classList.add('hidden');
    document.getElementById('setup-step-3').classList.remove('hidden');
  },

  // ── Confirmar e Salvar no Firebase ──────────────────────────────────────────
  async _confirmarEIniciarDraft() {
    const btnConfirmar = document.getElementById('btn-confirmar-draft');
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Salvando...';
    }

    const { numTimes, assignedPaises, capitaeTiers, ordemTiers, ordemPaisesBase, ordemSorteada, ordemTierPorPick, paisesUsados, capitaesSelecionados } = this._setupData;

    try {
      // Salva draft no Firebase
      await DB.salvarDraft({
        status:          'em_andamento',
        numTimes:        numTimes,
        capitaes:        assignedPaises,
        capitaeTiers:    capitaeTiers,
        ordemTiers:      ordemTiers,
        ordemPaisesBase: ordemPaisesBase,
        ordem:           ordemSorteada,
        ordemTier:       ordemTierPorPick,
        rodadaAtual:     0,
        pickAtual:       0,
        vezDe:           ordemSorteada[0] || null,
        tierAtual:       ordemTierPorPick[0] || null,
        picks:           {}
      });

      // Atualiza paisId de cada capitão no Firebase
      for (const [paisId, nick] of Object.entries(assignedPaises)) {
        const jogador = this.jogadores.find(j => j.nick === nick);
        if (jogador) {
          await DB.salvarJogador(jogador.id, { ...jogador, paisId });
        }
      }

      // Atualiza status do torneio
      await DB.atualizarTorneio({ status: 'draft' });

      this._fecharSetup();
      this._showToast('Draft iniciado! Boa sorte a todos!', 'success');
    } catch (err) {
      console.error('[Draft] Erro ao confirmar draft:', err);
      this._showToast('Erro ao salvar o draft. Tente novamente.', 'error');
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '🚀 Iniciar Draft!';
      }
    }
  },

  // ── Voltar entre steps ───────────────────────────────────────────────────────
  _voltarStep1() {
    document.getElementById('setup-step-2').classList.add('hidden');
    document.getElementById('setup-step-1').classList.remove('hidden');
    this._setupData.capitaesSelecionados = [];
  },

  _voltarStep2() {
    document.getElementById('setup-step-3').classList.add('hidden');
    document.getElementById('setup-step-2').classList.remove('hidden');
    // Restaura seleção visual
    this._renderizarGridCapitaes();
    // Re-aplica seleção que já estava feita
    this._setupData.capitaesSelecionados.forEach(j => {
      const card  = document.getElementById(`cap-card-${j.id}`);
      const check = document.getElementById(`cap-check-${j.id}`);
      if (card)  card.classList.add('selecionado');
      if (check) check.textContent = '✓';
    });
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  ALGORITMO SNAKE
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Gera a ordem snake de picks para N times, 5 rounds cada.
   * Round ímpar (0,2,4): ordem[0] → ordem[N-1]
   * Round par  (1,3):    ordem[N-1] → ordem[0]
   * Retorna array de N×5 paisIds.
   */
  gerarOrdemSnake(paisIds) {
    const ordem = [];
    for (let r = 0; r < 5; r++) {
      const round = r % 2 === 0 ? [...paisIds] : [...paisIds].reverse();
      ordem.push(...round);
    }
    return ordem;
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  ADMIN: RESETAR DRAFT
  // ════════════════════════════════════════════════════════════════════════════

  async resetarDraft() {
    if (!Auth.isAdmin()) {
      this._showToast('Apenas o administrador pode resetar o draft.', 'error');
      return;
    }
    if (!confirm('Confirma reset do draft? Todas as escolhas serão perdidas.')) return;

    try {
      // Remove paisId de todos os jogadores
      const jogadores = await DB.getJogadores();
      const updateJogadores = jogadores
        .filter(j => j.nick !== 'admin')
        .map(j => DB.salvarJogador(j.id, { ...j, paisId: null }));
      await Promise.all(updateJogadores);

      // Limpa jogadores de todos os países
      const paises = await DB.getPaises();
      const updatePaises = paises.map(p =>
        DB.salvarPais(p.id, { nome: p.nome, bandeira: p.bandeira, jogadores: {} })
      );
      await Promise.all(updatePaises);

      // Reseta o draft
      await DB.salvarDraft({
        status:          'aguardando',
        numTimes:        null,
        capitaes:        {},
        capitaeTiers:    {},
        ordemTiers:      [],
        ordemPaisesBase: [],
        ordem:           [],
        ordemTier:       [],
        rodadaAtual:     0,
        pickAtual:       0,
        vezDe:           null,
        tierAtual:       null,
        picks:           {}
      });

      // Reseta status do torneio
      await DB.atualizarTorneio({ status: 'aguardando', modalidadeAtual: null, fase: null });

      this._showToast('Draft resetado com sucesso.', 'info');
    } catch (err) {
      console.error('[Draft] Erro ao resetar draft:', err);
      this._showToast('Erro ao resetar o draft.', 'error');
    }
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  FAZER PICK
  // ════════════════════════════════════════════════════════════════════════════

  async fazerPick(jogadorId) {
    // 1. Draft em andamento?
    if (!this.estado || this.estado.status !== 'em_andamento') {
      this._showToast('O draft não está em andamento.', 'error');
      return;
    }

    const user      = Auth.getUser();
    const vezDe     = this.estado.vezDe;
    const capitaes  = this.estado.capitaes || {};  // { paisId: nick }
    const isAdmin   = Auth.isAdmin();

    // 2. Verifica se o usuário pode fazer pick:
    //    - Admin pode fazer pick por qualquer time
    //    - Capitão do time da vez pode fazer pick
    if (!isAdmin) {
      const nickCapitaoVez = capitaes[vezDe];
      if (!nickCapitaoVez || user.nick !== nickCapitaoVez) {
        this._showToast('Não é a vez do seu time.', 'error');
        return;
      }
    }

    // 3. Verifica se o jogador existe e não foi escolhido
    const jogador = this.jogadores.find(j => j.id === jogadorId);
    if (!jogador) {
      this._showToast('Jogador não encontrado.', 'error');
      return;
    }

    const picks = this.estado.picks || {};
    const jaEscolhido = Object.values(picks).some(p => p.jogadorId === jogadorId);

    // Verifica se jogador já foi adicionado como capitão
    const capitaes2 = this.estado.capitaes || {};
    const jaEscolhidoComoCapitao = Object.values(capitaes2).includes(jogador.nick);
    if (jaEscolhido || jaEscolhidoComoCapitao) {
      this._showToast('Este jogador já foi adicionado a um time.', 'error');
      return;
    }

    // 4. Verifica se o jogador é do tier atual
    const tierAtual = this.estado.tierAtual;
    if (Number(jogador.tier) !== Number(tierAtual)) {
      this._showToast(`Apenas jogadores Tier ${tierAtual} podem ser escolhidos agora.`, 'error');
      return;
    }

    // Verifica se jogador é capitão (capitães não podem ser draftados)
    const capitaesNicks = new Set(Object.values(capitaes));
    if (capitaesNicks.has(jogador.nick)) {
      this._showToast('Capitães são adicionados automaticamente ao time.', 'error');
      return;
    }

    // Animação antes de salvar
    this.animarPick(jogadorId);

    try {
      // Re-lê estado mais recente para evitar race condition entre dois capitães
      const estadoFresh = await DB.getDraft();
      if (!estadoFresh || estadoFresh.status !== 'em_andamento') {
        this._showToast('O draft foi encerrado ou reiniciado.', 'info');
        return;
      }
      if ((estadoFresh.pickAtual || 0) !== (this.estado.pickAtual || 0) ||
          estadoFresh.vezDe !== vezDe) {
        this._showToast('Outro pick acabou de ser registrado. Aguarde a atualização.', 'info');
        return;
      }

      const pickAtualIdx = estadoFresh.pickAtual || 0;
      const ordem        = this._toArray(estadoFresh.ordem);
      const ordemTier    = this._toArray(estadoFresh.ordemTier);
      const numTimes     = estadoFresh.numTimes  || 2;
      const picks        = estadoFresh.picks || {};

      const novoPicks = { ...picks };
      novoPicks[`pick_${pickAtualIdx}`] = {
        jogadorId: jogadorId,
        paisId:    vezDe,
        tier:      jogador.tier,
        pickIdx:   pickAtualIdx
      };

      const proximoPickIdx = pickAtualIdx + 1;
      const totalPicks     = ordem.length;

      if (proximoPickIdx >= totalPicks) {
        await DB.salvarDraft({ ...estadoFresh, picks: novoPicks, pickAtual: proximoPickIdx, vezDe: null, tierAtual: null });
        await this.finalizarDraft(novoPicks, ordem);
      } else {
        await DB.salvarDraft({
          ...estadoFresh,
          picks:       novoPicks,
          pickAtual:   proximoPickIdx,
          vezDe:       ordem[proximoPickIdx],
          tierAtual:   ordemTier[proximoPickIdx],
          rodadaAtual: Math.floor(proximoPickIdx / numTimes)
        });
      }
    } catch (err) {
      console.error('[Draft] Erro ao fazer pick:', err);
      this._showToast('Erro ao registrar pick. Tente novamente.', 'error');
    }
  },

  // ─── Finalizar Draft ─────────────────────────────────────────────────────────
  async finalizarDraft(picks, ordem) {
    try {
      const picksArr = Object.values(picks);

      for (const pick of picksArr) {
        const jogador = this.jogadores.find(j => j.id === pick.jogadorId);
        if (!jogador) continue;

        // Atualiza paisId do jogador
        await DB.salvarJogador(pick.jogadorId, { ...jogador, paisId: pick.paisId });

        // Adiciona jogador ao país
        const pais = this.paises.find(p => p.id === pick.paisId);
        if (pais) {
          const jogadoresPais = pais.jogadores || {};
          jogadoresPais[pick.jogadorId] = true;
          await DB.salvarPais(pick.paisId, {
            nome:      pais.nome,
            bandeira:  pais.bandeira,
            jogadores: jogadoresPais
          });
        }
      }

      // Também garante que os capitães estejam no array de jogadores do país
      const capitaes = this.estado.capitaes || {};
      for (const [paisId, nick] of Object.entries(capitaes)) {
        const jogador = this.jogadores.find(j => j.nick === nick);
        const pais    = this.paises.find(p => p.id === paisId);
        if (jogador && pais) {
          const jogadoresPais = pais.jogadores || {};
          jogadoresPais[jogador.id] = true;
          await DB.salvarPais(paisId, {
            nome:      pais.nome,
            bandeira:  pais.bandeira,
            jogadores: jogadoresPais
          });
        }
      }

      await DB.salvarDraft({
        ...this.estado,
        picks:  picks,
        status: 'finalizado',
        vezDe:  null
      });

      await DB.atualizarTorneio({ status: 'em_andamento' });

      this._showToast('Draft finalizado! Torneio iniciado.', 'success');
    } catch (err) {
      console.error('[Draft] Erro ao finalizar draft:', err);
      this._showToast('Erro ao finalizar o draft.', 'error');
    }
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDERIZAÇÃO
  // ════════════════════════════════════════════════════════════════════════════

  // ─── Pool de Jogadores ────────────────────────────────────────────────────────
  renderizarPool() {
    const container = document.getElementById('player-pool');
    const countEl   = document.getElementById('pool-count');
    if (!container || !countEl) return;

    const tierAtual    = this.estado ? this.estado.tierAtual : null;
    const picks        = this.estado && this.estado.picks ? this.estado.picks : {};
    const capitaes     = this.estado ? (this.estado.capitaes || {}) : {};
    const capitaesNicks = new Set(Object.values(capitaes));
    const isAdmin      = Auth.isAdmin();
    const user         = Auth.getUser();
    const vezDe        = this.estado ? this.estado.vezDe : null;
    const draftAtivo   = this.estado && this.estado.status === 'em_andamento';

    const nickCapitaoVez  = capitaes[vezDe] || null;
    const euSouCapitaoVez = !isAdmin && user && nickCapitaoVez && user.nick === nickCapitaoVez;

    const jogadoresEscolhidos = new Set(Object.values(picks).map(p => p.jogadorId));

    // Filtra: tier atual + não é capitão
    let filtrados = this.jogadores.filter(j => {
      if (capitaesNicks.has(j.nick)) return false;  // capitões são pré-adicionados
      if (draftAtivo && tierAtual !== null && Number(j.tier) !== Number(tierAtual)) return false;
      return true;
    });
    filtrados.sort((a, b) => a.nick.localeCompare(b.nick));

    const disponiveis = filtrados.filter(j => !jogadoresEscolhidos.has(j.id));
    countEl.textContent = `${disponiveis.length} disponíveis`;

    // Atualiza indicador de tier atual
    const tierInfo = document.getElementById('tier-atual-info');
    const tierBadgeEl = document.getElementById('tier-atual-badge');
    const TIER_COLORS = { 1: '#F5A623', 2: '#94A3B8', 3: '#CD7F32', 4: '#27AE60', 5: '#3B82F6' };
    const TIER_TEXT   = { 1: '#0F172A', 2: '#0F172A', 3: '#F8FAFC', 4: '#F8FAFC', 5: '#F8FAFC' };
    if (tierInfo) {
      if (draftAtivo && tierAtual) {
        tierInfo.style.display = 'block';
        if (tierBadgeEl) {
          tierBadgeEl.textContent = `T${tierAtual}`;
          tierBadgeEl.style.background = TIER_COLORS[tierAtual] || '#334155';
          tierBadgeEl.style.color = TIER_TEXT[tierAtual] || '#F8FAFC';
        }
        // Mini ordem de tiers
        const ordemMini = document.getElementById('tier-ordem-mini');
        if (ordemMini && this.estado.ordemTiers) {
          ordemMini.innerHTML = this._toArray(this.estado.ordemTiers).map((t, i) => {
            const ativo = t === tierAtual;
            return `<span style="background:${ativo ? TIER_COLORS[t] : '#1E293B'};color:${ativo ? TIER_TEXT[t] : '#94A3B8'};border:1px solid ${ativo ? TIER_COLORS[t] : '#334155'}" class="text-xs font-bold px-2 py-0.5 rounded-full ${ativo ? '' : 'opacity-50'}">T${t}</span>`;
          }).join('');
        }
      } else {
        tierInfo.style.display = 'none';
      }
    }

    if (filtrados.length === 0) {
      container.innerHTML = `<p class="text-[#94A3B8] text-sm text-center py-6">Nenhum jogador disponível para este tier.</p>`;
      return;
    }

    container.innerHTML = filtrados.map(jogador => {
      const foiEscolhido = jogadoresEscolhidos.has(jogador.id);
      let clicavel = false;
      let cssExtra = '';

      if (foiEscolhido) {
        cssExtra = 'disabled';
      } else if (!draftAtivo) {
        cssExtra = 'unavailable';
      } else if (isAdmin) {
        clicavel = true;
      } else {
        clicavel = euSouCapitaoVez;
        if (!euSouCapitaoVez) cssExtra = 'unavailable';
      }

      const tierBadge   = this._getTierBadge(jogador.tier);
      const tierLabel   = jogador.tier ? `T${jogador.tier}` : '?';
      const onClickAttr = clicavel ? `onclick="Draft.fazerPick('${jogador.id}')"` : '';

      return `
        <div id="player-card-${jogador.id}"
          class="player-card ${cssExtra} fade-slide-up bg-[#0F172A] border border-[#334155] rounded-lg px-4 py-3 flex items-center justify-between gap-2 transition"
          ${onClickAttr}>
          <span class="font-semibold text-sm ${foiEscolhido ? 'line-through text-[#94A3B8]' : 'text-[#F8FAFC]'}">${sanitize(jogador.nick)}</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full ${tierBadge}">${tierLabel}</span>
        </div>
      `;
    }).join('');
  },

  // ─── Times ────────────────────────────────────────────────────────────────────
  renderizarTimes() {
    const container = document.getElementById('times-grid');
    if (!container) return;

    const picks    = this.estado && this.estado.picks ? this.estado.picks : {};
    const vezDe    = this.estado ? this.estado.vezDe : null;
    const capitaes = this.estado ? (this.estado.capitaes || {}) : {};

    // Determina quais países estão no draft
    const ordemPaises = this.estado && this.estado.ordem
      ? [...new Set(this._toArray(this.estado.ordem))]
      : [];

    const paisesNoDraft = ordemPaises
      .map(id => this.paises.find(p => p.id === id))
      .filter(Boolean);

    // Se draft ainda não iniciou, mostra todos os países
    const paisesParaExibir = paisesNoDraft.length > 0 ? paisesNoDraft : this.paises;

    if (!paisesParaExibir || paisesParaExibir.length === 0) {
      container.innerHTML = `<p class="text-[#94A3B8] text-sm col-span-2 text-center py-8">Nenhum país cadastrado.</p>`;
      return;
    }

    // Mapa picks por país: { paisId: { tier: nick } }
    const picksPorPais = {};
    Object.values(picks).forEach(pick => {
      if (!picksPorPais[pick.paisId]) picksPorPais[pick.paisId] = {};
      const jogador = this.jogadores.find(j => j.id === pick.jogadorId);
      if (jogador) picksPorPais[pick.paisId][pick.tier] = jogador.nick;
    });

    container.innerHTML = paisesParaExibir.map(pais => {
      const ehAtivo   = pais.id === vezDe;
      const tiersPais = picksPorPais[pais.id] || {};
      const nickCapitao = capitaes[pais.id] || null;

      const capitaeTiers = this.estado ? (this.estado.capitaeTiers || {}) : {};
      const tierDoCapitaoPais = capitaeTiers[pais.id];

      const slotsHTML = [1, 2, 3, 4, 5].map(tier => {
        const jogadorNick = tiersPais[tier];
        const capitalFillsThisTier = (Number(tierDoCapitaoPais) === tier);
        const displayNick = jogadorNick || (capitalFillsThisTier ? nickCapitao : null);
        const isCapSlot = !jogadorNick && capitalFillsThisTier;
        const tierBadge = this._getTierBadge(tier);
        return `
          <div class="flex items-center justify-between py-1.5 border-b border-[#334155] last:border-0">
            <span class="text-xs font-bold px-2 py-0.5 rounded-full ${tierBadge} shrink-0">T${tier}</span>
            <span class="${displayNick ? 'slot-filled' : 'slot-empty'} text-sm ml-3 truncate">
              ${displayNick ? (isCapSlot ? `⚑ ${sanitize(displayNick)}` : sanitize(displayNick)) : '— vazio —'}
            </span>
          </div>
        `;
      }).join('');

      const capsContribuicao = (tierDoCapitaoPais !== undefined && tierDoCapitaoPais !== null && tierDoCapitaoPais !== false) ? 1 : 0;
      const totalPicks = Object.keys(tiersPais).length + capsContribuicao;

      return `
        <div class="bg-[#1E293B] border-2 ${ehAtivo ? 'active-team-card border-[#F5A623]' : 'border-[#334155]'} rounded-xl p-4 transition-all">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <span class="text-2xl">${sanitize(pais.bandeira || '')}</span>
              <div>
                <h3 class="font-bold text-[#F8FAFC] leading-tight">${sanitize(pais.nome)}</h3>
                ${nickCapitao ? `<p class="text-xs text-[#F5A623]">Cap: ${sanitize(nickCapitao)}</p>` : ''}
                <p class="text-xs text-[#94A3B8]">${totalPicks}/5 jogadores</p>
              </div>
            </div>
            ${ehAtivo ? '<span class="text-xs bg-[#F5A623] text-[#0F172A] font-bold px-2 py-0.5 rounded-full animate-pulse">VEZ</span>' : ''}
          </div>
          <div class="w-full bg-[#0F172A] rounded-full h-1.5 mb-3 mt-2">
            <div class="bg-[#F5A623] h-1.5 rounded-full transition-all duration-500"
                 style="width: ${(totalPicks / 5) * 100}%"></div>
          </div>
          <div>${slotsHTML}</div>
        </div>
      `;
    }).join('');
  },

  // ─── Banner de Status ─────────────────────────────────────────────────────────
  renderizarStatus() {
    if (!this.estado || this.estado.status !== 'em_andamento') {
      document.getElementById('status-banner').classList.add('hidden');
      return;
    }

    const banner   = document.getElementById('status-banner');
    const textEl   = document.getElementById('status-text');
    const vezDe    = this.estado.vezDe;
    const pickIdx  = this.estado.pickAtual || 0;
    const numTimes = this.estado.numTimes  || 2;
    const totalPicks = this._toArray(this.estado.ordem).length;
    const pickNum  = pickIdx + 1;

    const pais      = this.paises.find(p => p.id === vezDe);
    const paisNome  = pais ? `${pais.bandeira || ''} ${pais.nome}` : '—';
    const capitaes  = this.estado.capitaes || {};
    const nickCap   = capitaes[vezDe] || '—';

    const tierAtual = this.estado.tierAtual;
    const TIER_COLORS = { 1: '#F5A623', 2: '#94A3B8', 3: '#CD7F32', 4: '#27AE60', 5: '#3B82F6' };
    const tierColor = TIER_COLORS[tierAtual] || '#F8FAFC';
    textEl.innerHTML = `VEZ DE: ${sanitize(paisNome)}  —  Cap: <strong>${sanitize(nickCap)}</strong>  |  Tier: <span style="color:${tierColor};font-weight:bold">T${Number(tierAtual)}</span>  |  Pick ${Number(pickNum)}/${Number(totalPicks)}`;
    banner.classList.remove('hidden');
  },

  // ─── Animação de Pick ────────────────────────────────────────────────────────
  animarPick(jogadorId) {
    const card = document.getElementById(`player-card-${jogadorId}`);
    if (card) {
      card.classList.add('pick-flash');
      setTimeout(() => card.classList.remove('pick-flash'), 900);
    }
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  // Converte valor do Firebase (pode vir como objeto {0:x,1:y} ou array) para array JS
  _toArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    // Firebase retornou como objeto com chaves numéricas
    return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
  },

  _getTierBadge(tier) {
    const mapa = {
      1: 'tier-badge-1',
      2: 'tier-badge-2',
      3: 'tier-badge-3',
      4: 'tier-badge-4',
      5: 'tier-badge-5'
    };
    return mapa[tier] || 'bg-[#334155] text-[#F8FAFC]';
  },

  // Fisher-Yates shuffle
  _embaralhar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  _showToast(mensagem, tipo = 'info') {
    if (typeof showToast === 'function') {
      showToast(mensagem, tipo);
      return;
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    container.appendChild(toast);

    void toast.offsetWidth;
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 450);
    }, 3500);
  }
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => Draft.init());
