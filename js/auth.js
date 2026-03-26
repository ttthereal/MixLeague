// auth.js — Autenticação via sessionStorage (sem Firebase Auth)

const Auth = {

  getUser() {
    return JSON.parse(sessionStorage.getItem('ml_user') || 'null');
  },

  isAdmin() {
    return this.getUser()?.role === 'admin';
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  logout() {
    sessionStorage.removeItem('ml_user');
    window.location.href = 'index.html';
  },

  async login(nick, codigo) {
    if (!nick || !nick.trim()) {
      return { success: false, error: 'Informe seu nick.' };
    }
    if (!codigo || !codigo.trim()) {
      return { success: false, error: 'Informe o código de acesso.' };
    }

    try {
      // 1. Busca config para verificar código
      const config = await DB.getConfig();

      if (!config) {
        return { success: false, error: 'Configuração não encontrada. Contate o admin.' };
      }

      // 2. Verifica se código bate com config.codigoAcesso
      if (String(codigo).trim() !== String(config.codigoAcesso).trim()) {
        return { success: false, error: 'Código de acesso inválido.' };
      }

      const nickTrimmed = nick.trim();

      // 3a. Nick especial admin
      if (nickTrimmed === 'admin') {
        const user = {
          nick: 'admin',
          role: 'admin',
          paisId: null,
          loggedAt: Date.now()
        };
        sessionStorage.setItem('ml_user', JSON.stringify(user));
        window.location.href = 'dashboard.html';
        return { success: true };
      }

      // 3b. Busca nick existente ou cria novo jogador
      const jogadores = await DB.getJogadores();
      let jogador = jogadores.find(
        j => j.nick.toLowerCase() === nickTrimmed.toLowerCase()
      );

      if (!jogador) {
        // Novo participante: cria o jogador no Firebase com tier null (admin define depois)
        const novoId = 'j_' + Date.now();
        const novoJogador = { nick: nickTrimmed, tier: null, paisId: null };
        await DB.salvarJogador(novoId, novoJogador);
        jogador = { id: novoId, ...novoJogador };
      }

      // 4. Salva sessão
      const user = {
        nick: jogador.nick,
        role: 'jogador',
        paisId: jogador.paisId || null,
        jogadorId: jogador.id,
        loggedAt: Date.now()
      };
      sessionStorage.setItem('ml_user', JSON.stringify(user));

      // 5. Redireciona para dashboard
      window.location.href = 'dashboard.html';
      return { success: true };

    } catch (err) {
      console.error('[Auth] Erro no login:', err);
      return { success: false, error: 'Erro de conexão. Tente novamente.' };
    }
  }
};
