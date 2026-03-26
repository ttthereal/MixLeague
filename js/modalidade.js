// modalidade.js — Lógica da página de modalidades (sorteio + bracket)

const ModalidadePage = {
  torneio:         null,
  paises:          [],
  jogadores:       [],
  tiersSorteados:  [],
  modalidadeAtual: null,
  participantes:   [],
  listeners:       [],
  _bracketListener: null,

  // ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────

  async init() {
    showLoading();
    try {
      // Carrega dados iniciais em paralelo
      const [paises, jogadores, torneio] = await Promise.all([
        DB.getPaises(),
        DB.getJogadores(),
        DB.getTorneio()
      ]);

      this.paises    = paises    || [];
      this.jogadores = jogadores || [];
      this.torneio   = torneio   || {};

      this.modalidadeAtual = this.torneio.modalidadeAtual || null;
      this.tiersSorteados  = this.torneio.tiersSorteados  || [];

      // Renderiza estado inicial
      this._renderizarTudo();

      // Listener tempo real do torneio
      const lt = DB.onTorneioChange(dados => {
        const t = dados || {};
        const modalidadeMudou = t.modalidadeAtual !== this.modalidadeAtual;
        const tiersMudaram    = JSON.stringify(t.tiersSorteados || []) !== JSON.stringify(this.tiersSorteados);

        this.torneio         = t;
        this.modalidadeAtual = t.modalidadeAtual || null;
        this.tiersSorteados  = t.tiersSorteados  || [];

        this._atualizarStatusTorneio(t);
        this._renderizarCards(this.modalidadeAtual);

        if (modalidadeMudou) {
          this._renderizarAreaSorteio();
          this._assinarBracketListener(this.modalidadeAtual);
        }

        if (tiersMudaram && this.tiersSorteados.length > 0) {
          this._exibirResultadoSorteio(this.tiersSorteados, false);
        }
      });
      this.listeners.push(lt);

      // Listener bracket da modalidade atual
      if (this.modalidadeAtual) {
        this._assinarBracketListener(this.modalidadeAtual);
      }

    } catch (err) {
      console.error('[ModalidadePage] Erro ao inicializar:', err);
      showToast('Erro ao carregar dados. Tente recarregar a página.', 'error');
    } finally {
      hideLoading();
    }
  },

  // ─── SUBSCRIÇÃO AO BRACKET ───────────────────────────────────────────────────

  _assinarBracketListener(modalidade) {
    if (!modalidade) return;
    if (this._bracketListener) this._bracketListener.off();

    this._bracketListener = DB.onBracketChange(modalidade, dados => {
      if (dados && typeof Bracket !== 'undefined' && typeof Bracket.renderizar === 'function') {
        Bracket.renderizar(dados, 'bracket-container', Auth.isAdmin());
        const area = document.getElementById('bracket-container-wrapper');
        if (area) area.classList.remove('hidden');
      } else {
        const area = document.getElementById('bracket-container-wrapper');
        if (area) area.classList.add('hidden');
      }
    });
  },

  // ─── RENDER PRINCIPAL ─────────────────────────────────────────────────────────

  _renderizarTudo() {
    this._atualizarStatusTorneio(this.torneio);
    this._renderizarCards(this.modalidadeAtual);
    this._renderizarAreaSorteio();

    if (this.tiersSorteados.length > 0) {
      this._exibirResultadoSorteio(this.tiersSorteados, false);
    }
  },

  // ─── STATUS DO TORNEIO ────────────────────────────────────────────────────────

  _atualizarStatusTorneio(t) {
    const el = document.getElementById('torneio-status');
    if (!el) return;

    const statusMap = {
      aguardando: { label: 'Aguardando',  cls: 'bg-[#334155] text-[#94A3B8]' },
      em_andamento: { label: 'Em Andamento', cls: 'bg-[#27AE60]/20 text-[#27AE60] border border-[#27AE60]/40' },
      encerrado:  { label: 'Encerrado',   cls: 'bg-[#E74C3C]/20 text-[#E74C3C] border border-[#E74C3C]/40' }
    };
    const s = statusMap[t?.status] || statusMap['aguardando'];
    el.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${s.cls}`;
    el.textContent = s.label;

    const faseEl = document.getElementById('torneio-fase');
    if (faseEl) faseEl.textContent = t?.fase || '—';
  },

  // ─── CARDS DE MODALIDADE ──────────────────────────────────────────────────────

  _renderizarCards(modalidadeAtual) {
    const container = document.getElementById('modalidades-grid');
    if (!container) return;

    const isAdmin = Auth.isAdmin();

    container.innerHTML = Object.entries(Sorteio.MODALIDADES).map(([chave, cfg]) => {
      const ativo     = chave === modalidadeAtual;
      const baseClass = ativo
        ? 'border-[#F5A623] bg-[#F5A623]/10 shadow-[0_0_20px_#F5A62344]'
        : 'border-[#334155] bg-[#1E293B] hover:border-[#F5A623]/50 hover:bg-[#F5A623]/5';
      const cursorClass = isAdmin ? 'cursor-pointer' : 'cursor-default';

      const tiersStr = cfg.qtdTiers === 5 ? 'Todos' : `${cfg.qtdTiers} Tier${cfg.qtdTiers > 1 ? 's' : ''}`;

      return `
        <div class="modalidade-card relative rounded-2xl border-2 p-5 transition-all duration-200 ${baseClass} ${cursorClass}"
             data-modalidade="${chave}"
             ${isAdmin ? `onclick="ModalidadePage.selecionarModalidade('${chave}')"` : ''}>
          ${ativo ? `<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#F5A623] text-[#0F172A] text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider">Atual</div>` : ''}
          <div class="text-3xl mb-2 text-center">${cfg.icon}</div>
          <div class="text-center">
            <div class="font-bold text-[#F8FAFC] text-base leading-tight">${cfg.label}</div>
            <div class="text-[#94A3B8] text-xs mt-1">${cfg.jogadoresPorTime}v${cfg.jogadoresPorTime} &bull; ${tiersStr}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ─── AREA DE SORTEIO ─────────────────────────────────────────────────────────

  _renderizarAreaSorteio() {
    const area = document.getElementById('area-sorteio');
    if (!area) return;

    if (!this.modalidadeAtual) {
      area.classList.add('hidden');
      return;
    }

    area.classList.remove('hidden');
    const cfg   = Sorteio.MODALIDADES[this.modalidadeAtual];
    const label = cfg ? cfg.label : this.modalidadeAtual;

    const tituloEl = document.getElementById('sorteio-titulo');
    if (tituloEl) tituloEl.textContent = `Tiers Sorteados para ${label}`;

    // Botões admin
    const btnSortear = document.getElementById('btn-sortear');
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnProxima  = document.getElementById('btn-proxima-modalidade');

    if (btnSortear) {
      if (Auth.isAdmin()) {
        btnSortear.classList.remove('hidden');
        btnSortear.disabled = false;
      } else {
        btnSortear.classList.add('hidden');
      }
    }

    if (btnConfirmar) {
      if (Auth.isAdmin() && this.tiersSorteados.length > 0) {
        btnConfirmar.classList.remove('hidden');
      } else {
        btnConfirmar.classList.add('hidden');
      }
    }

    if (btnProxima) {
      if (Auth.isAdmin()) {
        btnProxima.classList.remove('hidden');
      } else {
        btnProxima.classList.add('hidden');
      }
    }
  },

  // ─── SELECIONAR MODALIDADE ────────────────────────────────────────────────────

  async selecionarModalidade(modalidade) {
    if (!Auth.isAdmin()) {
      showToast('Apenas administradores podem selecionar a modalidade.', 'error');
      return;
    }
    if (modalidade === this.modalidadeAtual) return;

    try {
      await DB.atualizarTorneio({
        modalidadeAtual: modalidade,
        tiersSorteados:  [],
        status:          'em_andamento',
        fase:            'sorteio'
      });
      showToast(`Modalidade "${Sorteio.MODALIDADES[modalidade]?.label}" selecionada!`, 'success');
    } catch (err) {
      console.error('[ModalidadePage] Erro ao selecionar modalidade:', err);
      showToast('Erro ao selecionar modalidade.', 'error');
    }
  },

  // ─── SORTEAR TIERS ────────────────────────────────────────────────────────────

  async sortearTiers() {
    if (!Auth.isAdmin()) {
      showToast('Apenas administradores podem realizar o sorteio.', 'error');
      return;
    }
    if (!this.modalidadeAtual) {
      showToast('Selecione uma modalidade primeiro.', 'error');
      return;
    }

    const btnSortear = document.getElementById('btn-sortear');
    if (btnSortear) btnSortear.disabled = true;

    try {
      const tiers = Sorteio.sortearTiers(this.modalidadeAtual);

      // Limpa resultado anterior
      const slotsArea = document.getElementById('roleta-slots');
      if (slotsArea) slotsArea.innerHTML = '';
      const participantesArea = document.getElementById('area-participantes');
      if (participantesArea) participantesArea.classList.add('hidden');
      const btnConfirmar = document.getElementById('btn-confirmar');
      if (btnConfirmar) btnConfirmar.classList.add('hidden');

      // Anima roleta
      Sorteio.animarRoleta('roleta-slots', tiers, async () => {
        // Salva no Firebase
        try {
          await DB.atualizarTorneio({ tiersSorteados: tiers, fase: 'participantes' });
          showToast('Tiers sorteados com sucesso!', 'success');
        } catch (e) {
          console.error('[ModalidadePage] Erro ao salvar tiers:', e);
          showToast('Tiers sorteados, mas houve erro ao salvar.', 'error');
        }

        // Exibe participantes
        this._exibirResultadoSorteio(tiers, true);
      });

    } catch (err) {
      console.error('[ModalidadePage] Erro no sorteio:', err);
      showToast('Erro ao realizar o sorteio.', 'error');
      if (btnSortear) btnSortear.disabled = false;
    }
  },

  // ─── EXIBIR RESULTADO DO SORTEIO ─────────────────────────────────────────────

  _exibirResultadoSorteio(tiers, comAnimacao) {
    const slotsArea = document.getElementById('roleta-slots');

    if (!comAnimacao && slotsArea) {
      // Reconstrói os slots sem animação (vindo do listener)
      slotsArea.innerHTML = '';
      tiers.forEach(tier => {
        const slot = document.createElement('div');
        const cor  = Sorteio.getTierColor(tier);
        slot.className = 'tier-slot w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black bg-[#0F172A] shadow-lg';
        slot.style.border    = `2px solid ${cor}`;
        slot.style.color     = cor;
        slot.style.boxShadow = `0 0 18px ${cor}55`;
        slot.textContent     = 'T' + tier;
        slotsArea.appendChild(slot);
      });
    }

    // Calcula participantes
    this.tiersSorteados  = tiers;
    this.participantes   = Sorteio.getJogadoresParaModalidade(this.paises, this.jogadores, tiers);

    // Exibe seção de participantes
    this.renderizarParticipantes(this.participantes);

    // Exibe botão confirmar se admin
    const btnConfirmar = document.getElementById('btn-confirmar');
    const btnSortear   = document.getElementById('btn-sortear');
    if (btnConfirmar && Auth.isAdmin()) btnConfirmar.classList.remove('hidden');
    if (btnSortear)   btnSortear.disabled = false;
  },

  // ─── CONFIRMAR E GERAR BRACKET ────────────────────────────────────────────────

  async confirmarEGerarBracket() {
    if (!Auth.isAdmin()) {
      showToast('Apenas administradores podem gerar o bracket.', 'error');
      return;
    }
    if (!this.modalidadeAtual || this.tiersSorteados.length === 0) {
      showToast('Realize o sorteio antes de gerar o bracket.', 'error');
      return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar');
    if (btnConfirmar) btnConfirmar.disabled = true;

    showLoading();
    try {
      if (typeof Bracket === 'undefined' || typeof Bracket.gerar !== 'function') {
        throw new Error('Módulo Bracket não disponível.');
      }

      const bracketData = Bracket.gerar(this.participantes);
      await DB.salvarBracket(this.modalidadeAtual, bracketData);
      await DB.atualizarTorneio({ fase: 'bracket' });

      showToast('Bracket gerado com sucesso!', 'success');
    } catch (err) {
      console.error('[ModalidadePage] Erro ao gerar bracket:', err);
      showToast('Erro ao gerar bracket: ' + err.message, 'error');
      if (btnConfirmar) btnConfirmar.disabled = false;
    } finally {
      hideLoading();
    }
  },

  // ─── PRÓXIMA MODALIDADE ───────────────────────────────────────────────────────

  async iniciarProximaModalidade() {
    if (!Auth.isAdmin()) {
      showToast('Apenas administradores podem avançar a modalidade.', 'error');
      return;
    }

    const chaves    = Object.keys(Sorteio.MODALIDADES);
    const idxAtual  = chaves.indexOf(this.modalidadeAtual);
    const proxima   = idxAtual >= 0 && idxAtual < chaves.length - 1
      ? chaves[idxAtual + 1]
      : null;

    if (!proxima) {
      showToast('Esta é a última modalidade do torneio!', 'error');
      return;
    }

    const nomeProxima = Sorteio.MODALIDADES[proxima].label;
    const confirmar   = window.confirm(`Avançar para a modalidade "${nomeProxima}"?`);
    if (!confirmar) return;

    showLoading();
    try {
      await DB.atualizarTorneio({
        modalidadeAtual: proxima,
        tiersSorteados:  [],
        fase:            'sorteio'
      });
      showToast(`Avançando para "${nomeProxima}"...`, 'success');
    } catch (err) {
      console.error('[ModalidadePage] Erro ao avançar modalidade:', err);
      showToast('Erro ao avançar modalidade.', 'error');
    } finally {
      hideLoading();
    }
  },

  // ─── RENDERIZAR PARTICIPANTES ─────────────────────────────────────────────────

  renderizarParticipantes(participantes) {
    const area = document.getElementById('area-participantes');
    const grid = document.getElementById('participantes-grid');
    if (!area || !grid) return;

    if (!participantes || participantes.length === 0) {
      area.classList.add('hidden');
      return;
    }

    grid.innerHTML = participantes.map(p => {
      const semJogadores = p.jogadores.length === 0;
      const jogadoresHTML = semJogadores
        ? `<p class="text-[#94A3B8] text-sm italic">Nenhum jogador neste tier</p>`
        : p.jogadores.map(j => `
            <div class="flex items-center justify-between py-1.5 border-b border-[#334155]/50 last:border-0">
              <div class="flex items-center gap-2">
                <span class="text-[#F8FAFC] font-medium text-sm">${_escapeHTML(j.nick)}</span>
              </div>
              ${Sorteio.getTierBadgeHTML(j.tier)}
            </div>
          `).join('');

      return `
        <div class="rounded-2xl border border-[#334155] bg-[#1E293B] overflow-hidden shadow-lg">
          <!-- Header do País -->
          <div class="flex items-center gap-3 px-4 py-3 bg-[#0F172A]/50 border-b border-[#334155]">
            <span class="text-2xl leading-none">${_escapeHTML(p.bandeira || '🏳')}</span>
            <span class="font-bold text-[#F8FAFC] text-base">${_escapeHTML(p.nome)}</span>
            <span class="ml-auto text-[#94A3B8] text-xs">${p.jogadores.length} jogador${p.jogadores.length !== 1 ? 'es' : ''}</span>
          </div>
          <!-- Lista de jogadores -->
          <div class="px-4 py-3 space-y-0.5">
            ${jogadoresHTML}
          </div>
        </div>
      `;
    }).join('');

    area.classList.remove('hidden');
  },

  // ─── RENDERIZAR CARDS (público, usado pelo HTML) ──────────────────────────────

  renderizarModalidades(modalidadeAtual) {
    this._renderizarCards(modalidadeAtual);
  },

  // ─── DESTRUIR ────────────────────────────────────────────────────────────────

  destruir() {
    this.listeners.forEach(l => { try { l.off(); } catch(_) {} });
    this.listeners = [];
    if (this._bracketListener) {
      try { this._bracketListener.off(); } catch(_) {}
      this._bracketListener = null;
    }
  }
};

// ─── HELPER PRIVADO ────────────────────────────────────────────────────────────

function _escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => ModalidadePage.init());
window.addEventListener('beforeunload', () => ModalidadePage.destruir());
