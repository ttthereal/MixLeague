// sorteio.js — Motor de sorteio de Tiers por modalidade + animações

const Sorteio = {

  // ─── CONFIGURAÇÃO DE MODALIDADES ─────────────────────────────────────────────

  MODALIDADES: {
    x1:            { label: 'X1',             icon: '🎯', qtdTiers: 1, jogadoresPorTime: 1 },
    braco_direito: { label: 'Braço Direito',  icon: '💪', qtdTiers: 2, jogadoresPorTime: 2 },
    retake:        { label: 'Retake',          icon: '🔫', qtdTiers: 4, jogadoresPorTime: 4 },
    '5x5':         { label: '5x5',             icon: '⚔️', qtdTiers: 5, jogadoresPorTime: 5, semSorteio: true },
    corrida_armada:{ label: 'Corrida Armada', icon: '🏃', qtdTiers: 5, jogadoresPorTime: 5, semSorteio: true }
  },

  // ─── SORTEIO DE TIERS ─────────────────────────────────────────────────────────

  /**
   * Retorna array de tiers sorteados para a modalidade.
   * @param {string} modalidade - chave da modalidade
   * @returns {number[]} tiers ordenados crescentemente
   */
  sortearTiers(modalidade) {
    const todos = [1, 2, 3, 4, 5];
    if (modalidade === '5x5' || modalidade === 'corrida_armada') return [...todos];

    const qtd = { x1: 1, braco_direito: 2, retake: 4 }[modalidade] || 1;

    // Fisher-Yates shuffle
    const arr = [...todos];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, qtd).sort((a, b) => a - b);
  },

  // ─── SELEÇÃO DE JOGADORES POR MODALIDADE ─────────────────────────────────────

  /**
   * Retorna jogadores de cada país para os tiers sorteados.
   * @param {Array} paises - array de países
   * @param {Array} jogadores - array completo de jogadores
   * @param {number[]} tiersSorteados - ex: [1, 3, 5]
   * @returns {Array} [{ paisId, nome, bandeira, jogadores: [{id, nick, tier}] }]
   */
  getJogadoresParaModalidade(paises, jogadores, tiersSorteados) {
    return paises.map(pais => {
      // IDs dos jogadores deste país
      const idsNoPais = pais.jogadores ? Object.keys(pais.jogadores) : [];

      // Filtra jogadores cujo tier está nos tiersSorteados
      const jogadoresSelecionados = jogadores
        .filter(j => idsNoPais.includes(j.id) && tiersSorteados.includes(Number(j.tier)))
        .map(j => ({ id: j.id, nick: j.nick, tier: Number(j.tier) }))
        .sort((a, b) => a.tier - b.tier);

      return {
        paisId:    pais.id,
        nome:      pais.nome,
        bandeira:  pais.bandeira,
        jogadores: jogadoresSelecionados
      };
    });
  },

  // ─── ANIMAÇÃO DE ROLETA ───────────────────────────────────────────────────────

  /**
   * Anima slots girando números antes de revelar os tiers finais.
   * @param {string} containerId - ID do elemento onde os slots serão criados
   * @param {number[]} tiersFinais - tiers que serão revelados
   * @param {Function} onComplete - callback chamado após animação
   */
  animarRoleta(containerId, tiersFinais, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) { if (onComplete) onComplete(); return; }

    // Limpa conteúdo anterior
    container.innerHTML = '';

    const slots = tiersFinais.map((_, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex flex-col items-center gap-1';

      const slot = document.createElement('div');
      slot.className = [
        'tier-slot',
        'w-20 h-20',
        'rounded-2xl',
        'flex items-center justify-center',
        'text-2xl font-black',
        'bg-[#0F172A]',
        'border-2 border-[#334155]',
        'text-[#94A3B8]',
        'transition-all duration-150',
        'select-none',
        'shadow-lg'
      ].join(' ');
      slot.style.transition = 'border-color 0.3s, color 0.3s, transform 0.3s, box-shadow 0.3s';
      slot.textContent = '?';

      wrapper.appendChild(slot);
      container.appendChild(wrapper);
      return slot;
    });

    // Fase 1: acelerado — troca rápida (100ms)
    let phase = 'fast';
    let elapsed = 0;
    const fastDuration  = 1200;
    const slowDuration  = 800;
    const totalDuration = fastDuration + slowDuration;

    const intervalFast = setInterval(() => {
      slots.forEach(slot => {
        slot.textContent = 'T' + (Math.floor(Math.random() * 5) + 1);
      });
      elapsed += 100;

      if (elapsed >= fastDuration) {
        clearInterval(intervalFast);
        // Fase 2: desacelerado — revela um a um
        Sorteio._revelarSequencial(slots, tiersFinais, onComplete);
      }
    }, 100);
  },

  /**
   * Revela slots um a um com efeito de desaceleração.
   * @private
   */
  _revelarSequencial(slots, tiersFinais, onComplete) {
    let idx = 0;
    let delay = 120;

    // Continua girando os não-revelados
    let spinInterval = null;
    const naoRevelados = new Set(slots.map((_, i) => i));

    spinInterval = setInterval(() => {
      naoRevelados.forEach(i => {
        slots[i].textContent = 'T' + (Math.floor(Math.random() * 5) + 1);
      });
    }, 150);

    function revelarProximo() {
      if (idx >= slots.length) {
        clearInterval(spinInterval);
        if (onComplete) onComplete();
        return;
      }

      const slot = slots[idx];
      const tier  = tiersFinais[idx];
      naoRevelados.delete(idx);

      slot.textContent    = 'T' + tier;
      slot.style.color    = Sorteio.getTierColor(tier);
      slot.style.borderColor = Sorteio.getTierColor(tier);
      slot.style.boxShadow   = `0 0 18px ${Sorteio.getTierColor(tier)}88`;
      slot.style.transform   = 'scale(1.15)';

      setTimeout(() => {
        slot.style.transform = 'scale(1)';
      }, 250);

      idx++;
      delay = Math.min(delay + 80, 600); // desacelera progressivamente
      setTimeout(revelarProximo, delay);
    }

    // Pequena pausa antes de começar a revelar
    setTimeout(revelarProximo, 200);
  },

  // ─── HELPERS DE TIER ─────────────────────────────────────────────────────────

  getTierColor(tier) {
    const cores = {
      1: '#FFD700',
      2: '#C0C0C0',
      3: '#CD7F32',
      4: '#4CAF50',
      5: '#2196F3'
    };
    return cores[tier] || '#F8FAFC';
  },

  getTierNome(tier) {
    return ['', 'Elite', 'Pro', 'Semi-Pro', 'Amateur', 'Iniciante'][tier] || '';
  },

  /**
   * Gera badge HTML de tier.
   * @param {number} tier
   * @returns {string} HTML do badge
   */
  getTierBadgeHTML(tier) {
    const cor  = Sorteio.getTierColor(tier);
    const nome = Sorteio.getTierNome(tier);
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style="background:${cor}22; color:${cor}; border:1px solid ${cor}55;">
              T${tier} <span class="opacity-75">${nome}</span>
            </span>`;
  }
};
