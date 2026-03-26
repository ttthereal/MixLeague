/**
 * bracket.js — Motor de Brackets/Chaveamento
 * Olimpíadas Mix League — Agente 4
 *
 * Objeto global `Bracket` responsável por:
 *  - Gerar estrutura de bracket (2 ou 4 times)
 *  - Registrar vencedores e avançar fases
 *  - Encerrar modalidade e atribuir medalhas
 *  - Renderizar o chaveamento visual com Tailwind CSS
 *  - Configurar listener Firebase para atualização em tempo real
 */

const Bracket = {

  // ---------------------------------------------------------------------------
  // GERAR BRACKET
  // ---------------------------------------------------------------------------

  /**
   * Gera a estrutura de dados do bracket para 2 ou 4 times.
   * @param {Array<{paisId: string, nome: string, bandeira: string}>} times
   * @param {string} modalidade
   * @returns {Object} bracketData pronto para salvar no Firebase
   */
  gerar(times, modalidade) {
    if (!times || (times.length !== 2 && times.length !== 4)) {
      throw new Error('Bracket.gerar: é necessário exatamente 2 ou 4 times.');
    }

    if (times.length === 2) {
      return {
        modalidade,
        fase: 'final',
        concluida: false,
        times,
        jogos: {
          final: {
            id: 'final',
            fase: 'final',
            timeA: times[0],
            timeB: times[1],
            vencedor: null,
            perdedor: null
          }
        }
      };
    }

    // 4 times — sorteio: [0] vs [1] na SF1, [2] vs [3] na SF2
    return {
      modalidade,
      fase: 'semifinal',
      concluida: false,
      times,
      jogos: {
        sf1: {
          id: 'sf1',
          fase: 'semifinal',
          timeA: times[0],
          timeB: times[1],
          vencedor: null,
          perdedor: null
        },
        sf2: {
          id: 'sf2',
          fase: 'semifinal',
          timeA: times[2],
          timeB: times[3],
          vencedor: null,
          perdedor: null
        },
        final: {
          id: 'final',
          fase: 'final',
          timeA: null,
          timeB: null,
          vencedor: null,
          perdedor: null
        },
        terceiro: {
          id: 'terceiro',
          fase: 'terceiro_lugar',
          timeA: null,
          timeB: null,
          vencedor: null,
          perdedor: null
        }
      }
    };
  },

  // ---------------------------------------------------------------------------
  // REGISTRAR VENCEDOR
  // ---------------------------------------------------------------------------

  /**
   * Admin registra o vencedor de um jogo e avança o bracket conforme necessário.
   * @param {string} modalidade
   * @param {string} jogoId — "sf1" | "sf2" | "final" | "terceiro"
   * @param {string} vencedorId — paisId do time vencedor
   * @returns {Promise<Object>} bracketData atualizado
   */
  async registrarVencedor(modalidade, jogoId, vencedorId) {
    let bracketData;

    try {
      bracketData = await DB.getBracket(modalidade);
    } catch (err) {
      showToast('Erro ao carregar bracket. Tente novamente.', 'error');
      throw err;
    }

    if (!bracketData || !bracketData.jogos) {
      showToast('Bracket não encontrado para esta modalidade.', 'error');
      return null;
    }

    const jogo = bracketData.jogos[jogoId];

    if (!jogo) {
      showToast(`Jogo "${jogoId}" não encontrado no bracket.`, 'error');
      return null;
    }

    if (jogo.vencedor) {
      showToast('Este jogo já possui um vencedor registrado.', 'error');
      return bracketData;
    }

    if (!jogo.timeA || !jogo.timeB) {
      showToast('Este jogo ainda não possui os dois times definidos.', 'error');
      return bracketData;
    }

    // Determina vencedor e perdedor
    const vencedor = jogo.timeA.paisId === vencedorId ? jogo.timeA : jogo.timeB;
    const perdedor  = jogo.timeA.paisId === vencedorId ? jogo.timeB : jogo.timeA;

    if (vencedor.paisId !== vencedorId) {
      showToast('Time vencedor não encontrado neste jogo.', 'error');
      return bracketData;
    }

    // Atualiza jogo
    bracketData.jogos[jogoId].vencedor = vencedor;
    bracketData.jogos[jogoId].perdedor = perdedor;

    // Propaga para as fases seguintes (apenas bracket de 4 times)
    if (jogoId === 'sf1') {
      bracketData.jogos.final.timeA    = vencedor;
      bracketData.jogos.terceiro.timeA = perdedor;
    } else if (jogoId === 'sf2') {
      bracketData.jogos.final.timeB    = vencedor;
      bracketData.jogos.terceiro.timeB = perdedor;
    }

    // Avança fase quando ambas as semifinais estiverem concluídas
    if (jogoId === 'sf1' || jogoId === 'sf2') {
      const sf1Feita = bracketData.jogos.sf1 && bracketData.jogos.sf1.vencedor;
      const sf2Feita = bracketData.jogos.sf2 && bracketData.jogos.sf2.vencedor;
      if (sf1Feita && sf2Feita) {
        bracketData.fase = 'final_e_terceiro';
      }
    }

    // Verifica se o bracket foi completamente finalizado
    if (jogoId === 'final' || jogoId === 'terceiro') {
      const finalDone    = bracketData.jogos.final?.vencedor;
      const terceiroDone = !bracketData.jogos.terceiro || bracketData.jogos.terceiro?.vencedor;

      if (finalDone && terceiroDone) {
        bracketData.fase     = 'finalizado';
        bracketData.concluida = true;
      }
    }

    // Persiste no Firebase
    try {
      await DB.salvarBracket(modalidade, bracketData);
    } catch (err) {
      showToast('Erro ao salvar bracket no banco de dados.', 'error');
      throw err;
    }

    // Encerra modalidade e distribui medalhas se concluído
    if (bracketData.concluida) {
      await Bracket.encerrarModalidade(modalidade, bracketData);
    }

    return bracketData;
  },

  // ---------------------------------------------------------------------------
  // ENCERRAR MODALIDADE — MEDALHAS
  // ---------------------------------------------------------------------------

  /**
   * Registra as medalhas (1º, 2º e 3º) ao final de uma modalidade.
   * @param {string} modalidade
   * @param {Object} bracketData
   */
  async encerrarModalidade(modalidade, bracketData) {
    const primeiro  = bracketData.jogos.final?.vencedor;
    const segundo   = bracketData.jogos.final?.perdedor;
    const terceiro  = bracketData.jogos.terceiro?.vencedor;

    const medalhas = [];

    if (primeiro) {
      medalhas.push(DB.adicionarMedalha({ paisId: primeiro.paisId, modalidade, posicao: 1, pontos: 10 }));
    }
    if (segundo) {
      medalhas.push(DB.adicionarMedalha({ paisId: segundo.paisId, modalidade, posicao: 2, pontos: 5 }));
    }
    if (terceiro) {
      medalhas.push(DB.adicionarMedalha({ paisId: terceiro.paisId, modalidade, posicao: 3, pontos: 2 }));
    }

    try {
      await Promise.all(medalhas);
      showToast(`Modalidade ${modalidade} encerrada! Medalhas atribuídas. 🏅`, 'success');
    } catch (err) {
      showToast('Erro ao registrar medalhas. Verifique o console.', 'error');
      console.error('[Bracket] encerrarModalidade error:', err);
    }
  },

  // ---------------------------------------------------------------------------
  // RENDERIZAR — VISUAL DO BRACKET
  // ---------------------------------------------------------------------------

  /**
   * Renderiza o bracket visual dentro de um elemento HTML.
   * @param {string} containerId — id do elemento HTML
   * @param {Object} bracketData — dados do bracket
   * @param {string} modalidade — identificador da modalidade
   */
  renderizar(containerId, bracketData, modalidade) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`[Bracket] Container "${containerId}" não encontrado.`);
      return;
    }
    if (!bracketData) {
      container.innerHTML = Bracket._renderVazio();
      return;
    }

    const isAdmin = Auth.isAdmin();
    const { jogos, fase, concluida } = bracketData;

    // ---- Banner de status ----
    const statusBanner = Bracket._renderStatusBanner(fase, concluida, bracketData);

    // ---- Bracket de 2 times (apenas final) ----
    if (!jogos.sf1) {
      container.innerHTML = `
        ${statusBanner}
        <div class="flex flex-col items-center gap-6 py-4">
          <h3 class="text-xl font-bold text-[#F5A623] tracking-wide uppercase">Final</h3>
          ${Bracket._renderJogo(jogos.final, isAdmin, modalidade)}
        </div>
      `;
      Bracket._bindBotoes(container, modalidade);
      return;
    }

    // ---- Bracket de 4 times: SF → Final + 3º ----
    container.innerHTML = `
      ${statusBanner}
      <div class="bracket-wrapper overflow-x-auto py-4">
        <div class="flex gap-6 items-center min-w-max px-4">

          <!-- ===== SEMIFINAIS ===== -->
          <div class="flex flex-col gap-8">
            <div>
              <p class="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider font-semibold">Semifinal 1</p>
              ${Bracket._renderJogo(jogos.sf1, isAdmin, modalidade)}
            </div>
            <div>
              <p class="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider font-semibold">Semifinal 2</p>
              ${Bracket._renderJogo(jogos.sf2, isAdmin, modalidade)}
            </div>
          </div>

          <!-- ===== CONECTORES ===== -->
          <div class="flex flex-col items-center gap-8 self-stretch justify-center">
            ${Bracket._renderConector()}
          </div>

          <!-- ===== FINAL + 3º LUGAR ===== -->
          <div class="flex flex-col gap-8">
            <div>
              <p class="text-xs text-[#F5A623] mb-2 uppercase tracking-wider font-bold">Final</p>
              ${Bracket._renderJogo(jogos.final, isAdmin, modalidade)}
            </div>
            <div>
              <p class="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider font-semibold">3º Lugar</p>
              ${Bracket._renderJogo(jogos.terceiro, isAdmin, modalidade)}
            </div>
          </div>

        </div>
      </div>
    `;

    Bracket._bindBotoes(container, modalidade);
  },

  // ---------------------------------------------------------------------------
  // HELPERS DE RENDERIZAÇÃO
  // ---------------------------------------------------------------------------

  /** Bind nos botões "Definir Vencedor" após injetar HTML */
  _bindBotoes(container, modalidade) {
    container.querySelectorAll('[data-vencedor-btn]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const jogoId  = btn.dataset.jogoid;
        const paisId  = btn.dataset.paisid;

        // Feedback visual imediato
        btn.disabled = true;
        btn.textContent = 'Salvando...';

        try {
          await Bracket.registrarVencedor(modalidade, jogoId, paisId);
        } catch (err) {
          // Restaura botão em caso de erro
          btn.disabled = false;
          btn.textContent = 'Definir Vencedor';
        }
      });
    });
  },

  /** Card de um jogo */
  _renderJogo(jogo, isAdmin, modalidade) {
    if (!jogo) {
      return `
        <div class="bg-[#1E293B] border border-[#334155] rounded-xl p-4 w-72 opacity-50">
          <p class="text-[#94A3B8] text-sm text-center">Aguardando resultado anterior...</p>
        </div>
      `;
    }

    const timeAHtml = Bracket._renderTime(jogo.timeA, jogo, isAdmin);
    const timeBHtml = Bracket._renderTime(jogo.timeB, jogo, isAdmin);

    // Indicador de resultado
    const resultadoHtml = jogo.vencedor
      ? `<div class="mt-3 pt-3 border-t border-[#334155] flex items-center justify-center gap-2">
           <span class="text-[#27AE60] text-xs font-semibold uppercase tracking-wide">Resultado Registrado</span>
         </div>`
      : '';

    return `
      <div class="card-jogo bg-[#1E293B] border border-[#334155] rounded-xl p-4 w-72 shadow-lg transition-all duration-300">
        <div class="flex flex-col gap-2">
          ${timeAHtml}
          <div class="flex items-center gap-2">
            <div class="flex-1 h-px bg-[#334155]"></div>
            <span class="text-[#94A3B8] text-xs font-bold px-1">VS</span>
            <div class="flex-1 h-px bg-[#334155]"></div>
          </div>
          ${timeBHtml}
        </div>
        ${resultadoHtml}
      </div>
    `;
  },

  /** Card de um time dentro de um jogo */
  _renderTime(time, jogo, isAdmin) {
    // Slot vazio (time ainda não definido)
    if (!time) {
      return `
        <div class="flex items-center gap-2 p-3 rounded-lg bg-[#0F172A] border border-dashed border-[#334155] opacity-50">
          <span class="text-[#94A3B8] text-sm italic">Aguardando...</span>
        </div>
      `;
    }

    const isVencedor = jogo.vencedor?.paisId === time.paisId;
    const isPerdedor = jogo.perdedor?.paisId === time.paisId;
    const jogoEncerrado = !!jogo.vencedor;

    // Classes dinâmicas de borda e opacidade
    let borderClass   = 'border-[#334155]';
    let opacityClass  = '';
    let nomeClass     = 'text-[#F8FAFC]';
    let bgClass       = 'bg-[#0F172A]';

    if (isVencedor) {
      borderClass  = 'border-[#27AE60] shadow-[0_0_8px_rgba(39,174,96,0.3)]';
      nomeClass    = 'text-[#27AE60] font-bold';
      bgClass      = 'bg-[#0F172A]';
    } else if (isPerdedor) {
      borderClass  = 'border-[#E74C3C]';
      opacityClass = 'opacity-50';
      nomeClass    = 'text-[#94A3B8]';
    }

    // Badge de resultado
    let badgeHtml = '';
    if (isVencedor) {
      badgeHtml = `<span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#27AE60] text-white rounded uppercase tracking-wide">Vencedor</span>`;
    } else if (isPerdedor) {
      badgeHtml = `<span class="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#E74C3C] text-white rounded uppercase tracking-wide opacity-80">Eliminado</span>`;
    }

    // Botão "Definir Vencedor" — apenas admin, apenas quando jogo ainda não tem resultado
    const btnHtml = (isAdmin && !jogoEncerrado)
      ? `<button
           data-vencedor-btn
           data-jogoid="${jogo.id}"
           data-paisid="${time.paisId}"
           class="ml-auto flex-shrink-0 px-2 py-1 text-xs font-semibold bg-[#27AE60] hover:bg-green-400 active:scale-95 text-white rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:ring-offset-1 focus:ring-offset-[#1E293B]"
         >
           Definir Vencedor
         </button>`
      : '';

    return `
      <div class="flex items-center gap-2 p-3 rounded-lg ${bgClass} border ${borderClass} ${opacityClass} transition-all duration-300">
        <span class="text-2xl leading-none select-none">${time.bandeira || '🏳️'}</span>
        <span class="font-semibold truncate ${nomeClass}">${time.nome}</span>
        ${badgeHtml}
        ${btnHtml}
      </div>
    `;
  },

  /** Conector visual entre semifinais e fases finais */
  _renderConector() {
    return `
      <div class="flex flex-col items-center gap-0 h-full justify-center select-none">
        <svg width="48" height="120" viewBox="0 0 48 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- linha superior (SF1 → Final) -->
          <path d="M0 30 H16 Q24 30 24 60" stroke="#334155" stroke-width="2" fill="none"/>
          <!-- linha inferior (SF2 → Final) -->
          <path d="M0 90 H16 Q24 90 24 60" stroke="#334155" stroke-width="2" fill="none"/>
          <!-- linha final →  -->
          <path d="M24 60 H48" stroke="#F5A623" stroke-width="2" fill="none"/>
          <!-- seta -->
          <polyline points="42,55 48,60 42,65" stroke="#F5A623" stroke-width="2" fill="none" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
  },

  /** Banner de status do bracket (fase atual, concluído, etc.) */
  _renderStatusBanner(fase, concluida, bracketData) {
    if (concluida) {
      const campeao  = bracketData.jogos?.final?.vencedor;
      const vice     = bracketData.jogos?.final?.perdedor;
      const terceiro = bracketData.jogos?.terceiro?.vencedor;

      return `
        <div class="mb-4 rounded-xl bg-gradient-to-r from-[#1E293B] to-[#0F172A] border border-[#F5A623] p-4">
          <p class="text-center text-[#F5A623] font-bold text-lg mb-3 uppercase tracking-wider">Modalidade Encerrada</p>
          <div class="flex flex-wrap justify-center gap-4 text-sm">
            ${campeao  ? `<div class="flex items-center gap-2"><span class="text-xl">🥇</span><span class="text-[#F8FAFC] font-semibold">${campeao.bandeira || ''} ${campeao.nome}</span></div>` : ''}
            ${vice     ? `<div class="flex items-center gap-2"><span class="text-xl">🥈</span><span class="text-[#F8FAFC] font-semibold">${vice.bandeira || ''} ${vice.nome}</span></div>` : ''}
            ${terceiro ? `<div class="flex items-center gap-2"><span class="text-xl">🥉</span><span class="text-[#F8FAFC] font-semibold">${terceiro.bandeira || ''} ${terceiro.nome}</span></div>` : ''}
          </div>
        </div>
      `;
    }

    const faseLabel = {
      semifinal:        'Fase: Semifinais em andamento',
      final_e_terceiro: 'Fase: Final e Disputa de 3º Lugar',
      final:            'Fase: Final em andamento',
      finalizado:       'Encerrado'
    }[fase] || `Fase: ${fase}`;

    const dotColor = fase === 'finalizado' ? 'bg-[#27AE60]' : 'bg-[#F5A623]';

    return `
      <div class="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1E293B] border border-[#334155] w-fit">
        <span class="w-2 h-2 rounded-full ${dotColor} animate-pulse"></span>
        <span class="text-xs text-[#94A3B8] font-medium">${faseLabel}</span>
      </div>
    `;
  },

  /** Placeholder quando bracketData é nulo */
  _renderVazio() {
    return `
      <div class="flex flex-col items-center justify-center gap-3 py-12 text-[#94A3B8]">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <p class="text-sm">Nenhum bracket gerado para esta modalidade.</p>
      </div>
    `;
  },

  // ---------------------------------------------------------------------------
  // LISTENER TEMPO REAL
  // ---------------------------------------------------------------------------

  /**
   * Configura listener Firebase para atualizar o bracket automaticamente.
   * @param {string} modalidade
   * @param {string} containerId — id do elemento HTML alvo
   * @returns {Function} unsubscribe — chame para remover o listener
   */
  configurarListener(modalidade, containerId) {
    return DB.onBracketChange(modalidade, (bracketData) => {
      if (bracketData) {
        Bracket.renderizar(containerId, bracketData, modalidade);
      } else {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = Bracket._renderVazio();
        }
      }
    });
  }

};
