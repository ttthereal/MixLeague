// medalhas.js — Lógica de cálculo do Quadro de Medalhas

const Medalhas = {

  // Calcula ranking de países por pontos
  // medalhas: array de medalhas
  // paises: array de países
  // Retorna array ordenado: [{ paisId, nome, bandeira, ouro, prata, bronze, total }]
  calcularRanking(medalhas, paises) {
    const mapa = {};
    paises.forEach(p => {
      mapa[p.id] = {
        paisId: p.id,
        nome: p.nome,
        bandeira: p.bandeira,
        ouro: 0,
        prata: 0,
        bronze: 0,
        total: 0
      };
    });
    medalhas.forEach(m => {
      if (!mapa[m.paisId]) return;
      if (m.posicao === 1)      mapa[m.paisId].ouro++;
      else if (m.posicao === 2) mapa[m.paisId].prata++;
      else if (m.posicao === 3) mapa[m.paisId].bronze++;
      mapa[m.paisId].total += m.pontos || 0;
    });
    return Object.values(mapa).sort((a, b) => {
      // Desempate: total > ouro > prata > bronze
      if (b.total !== a.total) return b.total - a.total;
      if (b.ouro  !== a.ouro)  return b.ouro  - a.ouro;
      if (b.prata !== a.prata) return b.prata - a.prata;
      return b.bronze - a.bronze;
    });
  },

  // Pontuação de um país específico
  getPontuacaoPais(paisId, medalhas) {
    return medalhas
      .filter(m => m.paisId === paisId)
      .reduce((acc, m) => {
        if (m.posicao === 1)      acc.ouro++;
        else if (m.posicao === 2) acc.prata++;
        else if (m.posicao === 3) acc.bronze++;
        acc.total += m.pontos || 0;
        return acc;
      }, { ouro: 0, prata: 0, bronze: 0, total: 0 });
  },

  // Histórico de medalhas de um país por modalidade
  // Retorna [{ modalidade, posicao, pontos }]
  getHistoricoPais(paisId, medalhas) {
    return medalhas.filter(m => m.paisId === paisId);
  },

  // Nome formatado da modalidade
  nomeModalidade(chave) {
    const nomes = {
      x1:            'X1',
      braco_direito: 'Braço Direito',
      retake:        'Retake',
      '5x5':         '5x5',
      corrida_armada:'Corrida Armada'
    };
    return nomes[chave] || chave;
  },

  // Ícone da medalha
  icone(posicao) {
    return ['', '🥇', '🥈', '🥉'][posicao] || '';
  }
};
