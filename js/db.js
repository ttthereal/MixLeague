// db.js — Camada de acesso ao Supabase
// Mantém a mesma interface pública do DB original (compatível com todos os outros arquivos JS)
//
// Mapeamento de nomes DB → JS:
//   jogadores.pais_id       → paisId
//   torneio.modalidade_atual → modalidadeAtual
//   medalhas.pais_id        → paisId
//   config.codigo_acesso    → codigoAcesso
//   draft.dados (JSONB)     → objeto draft completo
//   votacao.dados (JSONB)   → objeto votacao completo
//   brackets.dados (JSONB)  → objeto bracket completo

const DB = {

  // ─── LEITURA ────────────────────────────────────────────────────────────────

  async getJogadores() {
    const { data, error } = await sb.from('jogadores').select('*').order('nick');
    if (error) throw error;
    return (data || []).map(j => ({ id: j.id, nick: j.nick, tier: j.tier, paisId: j.pais_id }));
  },

  async getJogador(id) {
    const { data, error } = await sb.from('jogadores').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id: data.id, nick: data.nick, tier: data.tier, paisId: data.pais_id };
  },

  async getPaises() {
    const { data, error } = await sb.from('paises').select('*');
    if (error) throw error;
    return data || [];
  },

  async getPais(id) {
    const { data, error } = await sb.from('paises').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getTorneio() {
    const { data, error } = await sb.from('torneio').select('*').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { status: data.status, modalidadeAtual: data.modalidade_atual, fase: data.fase };
  },

  async getMedalhas() {
    const { data, error } = await sb.from('medalhas').select('*');
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id, paisId: m.pais_id, modalidade: m.modalidade, posicao: m.posicao, pontos: m.pontos
    }));
  },

  async getBracket(modalidade) {
    const { data, error } = await sb.from('brackets').select('dados').eq('modalidade', modalidade).maybeSingle();
    if (error) throw error;
    return data ? data.dados : null;
  },

  async getConfig() {
    const { data, error } = await sb.from('config').select('*').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { codigoAcesso: data.codigo_acesso, modalidades: data.modalidades };
  },

  async getDraft() {
    const { data, error } = await sb.from('draft').select('dados').eq('id', 'main').maybeSingle();
    if (error) throw error;
    return data ? data.dados : null;
  },

  // ─── ESCRITA ─────────────────────────────────────────────────────────────────

  async salvarJogador(id, dados) {
    const row = { id, nick: dados.nick, tier: dados.tier, pais_id: dados.paisId ?? null };
    const { error } = await sb.from('jogadores').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  async removerJogador(id) {
    const { error } = await sb.from('jogadores').delete().eq('id', id);
    if (error) throw error;
  },

  async salvarPais(id, dados) {
    const row = { id, nome: dados.nome, bandeira: dados.bandeira, jogadores: dados.jogadores || {} };
    const { error } = await sb.from('paises').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  async atualizarTorneio(dados) {
    const row = { id: 'main' };
    if (dados.status          !== undefined) row.status           = dados.status;
    if (dados.modalidadeAtual !== undefined) row.modalidade_atual = dados.modalidadeAtual;
    if (dados.fase            !== undefined) row.fase             = dados.fase;
    const { error } = await sb.from('torneio').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  async adicionarMedalha(dados) {
    const id = 'med_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const row = {
      id,
      pais_id:    dados.paisId,
      modalidade: dados.modalidade,
      posicao:    dados.posicao,
      pontos:     dados.pontos
    };
    const { error } = await sb.from('medalhas').insert(row);
    if (error) throw error;
  },

  async salvarBracket(modalidade, dados) {
    const { error } = await sb.from('brackets').upsert({ modalidade, dados }, { onConflict: 'modalidade' });
    if (error) throw error;
  },

  async salvarDraft(dados) {
    const { error } = await sb.from('draft').upsert({ id: 'main', dados }, { onConflict: 'id' });
    if (error) throw error;
  },

  async atualizarConfig(dados) {
    const row = { id: 'main' };
    if (dados.codigoAcesso !== undefined) row.codigo_acesso = dados.codigoAcesso;
    if (dados.modalidades  !== undefined) row.modalidades   = dados.modalidades;
    const { error } = await sb.from('config').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },

  // ─── LISTENERS TEMPO REAL ────────────────────────────────────────────────────
  // Cada listener re-busca os dados completos ao receber qualquer mudança na tabela,
  // mantendo a mesma interface do Firebase (callback recebe o conjunto completo).

  onJogadoresChange(callback) {
    const channel = sb.channel('jogadores-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores' }, async () => {
        callback(await this.getJogadores());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  onPaisesChange(callback) {
    const channel = sb.channel('paises-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paises' }, async () => {
        callback(await this.getPaises());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  onTorneioChange(callback) {
    const channel = sb.channel('torneio-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneio' }, async () => {
        callback(await this.getTorneio());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  onMedalhasChange(callback) {
    const channel = sb.channel('medalhas-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medalhas' }, async () => {
        callback(await this.getMedalhas());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  onBracketChange(modalidade, callback) {
    const channel = sb.channel('bracket-' + modalidade + '-rt-' + Date.now())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'brackets',
        filter: 'modalidade=eq.' + modalidade
      }, async () => {
        callback(await this.getBracket(modalidade));
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  onDraftChange(callback) {
    const channel = sb.channel('draft-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft' }, async () => {
        callback(await this.getDraft());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  // ─── VOTAÇÃO DE TIERS ────────────────────────────────────────────────────────

  async getVotacao() {
    const { data, error } = await sb.from('votacao').select('dados').eq('id', 'main').maybeSingle();
    if (error) throw error;
    return data ? data.dados : null;
  },

  async salvarVotosJogador(nick, votos) {
    const nickKey = nick.replace(/[.#$[\]]/g, '_');
    const atual = await this.getVotacao() || { status: 'aberta', votos: {}, participantes: {} };
    if (!atual.votos)         atual.votos = {};
    if (!atual.participantes) atual.participantes = {};
    atual.votos[nickKey]         = votos;
    atual.participantes[nickKey] = true;
    const { error } = await sb.from('votacao').upsert({ id: 'main', dados: atual }, { onConflict: 'id' });
    if (error) throw error;
  },

  onVotacaoChange(callback) {
    const channel = sb.channel('votacao-rt-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votacao' }, async () => {
        callback(await this.getVotacao());
      })
      .subscribe();
    return { off: () => sb.removeChannel(channel) };
  },

  async iniciarVotacao() {
    const { error } = await sb.from('votacao').upsert(
      { id: 'main', dados: { status: 'aberta', votos: {}, participantes: {} } },
      { onConflict: 'id' }
    );
    if (error) throw error;
    await this.atualizarTorneio({ status: 'votacao' });
  },

  async encerrarVotacao() {
    const [votacao, jogadores] = await Promise.all([this.getVotacao(), this.getJogadores()]);
    const votos = (votacao && votacao.votos) ? votacao.votos : {};

    // Agrupa votos por jogadorId e calcula média
    const somaVotos = {};
    Object.values(votos).forEach(votosDeUmJogador => {
      if (!votosDeUmJogador) return;
      Object.entries(votosDeUmJogador).forEach(([jogadorId, tier]) => {
        if (!somaVotos[jogadorId]) somaVotos[jogadorId] = { soma: 0, count: 0 };
        somaVotos[jogadorId].soma  += Number(tier);
        somaVotos[jogadorId].count += 1;
      });
    });

    // Atualiza tier de cada jogador
    const updates = jogadores
      .filter(j => j.nick !== 'admin' && somaVotos[j.id])
      .map(j => {
        const media     = somaVotos[j.id].soma / somaVotos[j.id].count;
        const tierFinal = Math.min(5, Math.max(1, Math.round(media)));
        return sb.from('jogadores').update({ tier: tierFinal }).eq('id', j.id);
      });
    await Promise.all(updates);

    // Fecha votação e reseta torneio
    const dadosAtualizados = { ...(votacao || {}), status: 'fechada' };
    await sb.from('votacao').upsert({ id: 'main', dados: dadosAtualizados }, { onConflict: 'id' });
    await this.atualizarTorneio({ status: 'aguardando' });
    return somaVotos;
  }

};
