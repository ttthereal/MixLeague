const firebaseConfig = {
  apiKey: "AIzaSyBDFEHpGMjnpWaV6S2pLKIvekpEyD7Zj_s",
  authDomain: "newoml.firebaseapp.com",
  databaseURL: "https://newoml-default-rtdb.firebaseio.com",
  projectId: "newoml",
  storageBucket: "newoml.firebasestorage.app",
  messagingSenderId: "105751662804",
  appId: "1:105751662804:web:a412681d803b12b4642b41"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function seedInitialData() {
  db.ref('mixleague/jogadores').once('value').then(snap => {
    if (!snap.exists()) {
      console.log('[Seed] Populando dados iniciais...');

      const jogadores = {
        j01: { nick: 'admin',        tier: 1, paisId: null },
        j02: { nick: 'zekinha',      tier: 1, paisId: null },
        j03: { nick: 'falleN_pro',   tier: 1, paisId: null },
        j04: { nick: 'coldzera',     tier: 1, paisId: null },
        j05: { nick: 's1mple2',      tier: 2, paisId: null },
        j06: { nick: 'electronic',   tier: 2, paisId: null },
        j07: { nick: 'niko_fan',     tier: 2, paisId: null },
        j08: { nick: 'rain_boy',     tier: 2, paisId: null },
        j09: { nick: 'device_kid',   tier: 3, paisId: null },
        j10: { nick: 'xyp9x_jr',     tier: 3, paisId: null },
        j11: { nick: 'dupreeh',      tier: 3, paisId: null },
        j12: { nick: 'glaive_fan',   tier: 3, paisId: null },
        j13: { nick: 'magisk_jr',    tier: 4, paisId: null },
        j14: { nick: 'astralis_fan', tier: 4, paisId: null },
        j15: { nick: 'vitality_fan', tier: 4, paisId: null },
        j16: { nick: 'navi_fan',     tier: 4, paisId: null },
        j17: { nick: 'noob1',        tier: 5, paisId: null },
        j18: { nick: 'noob2',        tier: 5, paisId: null },
        j19: { nick: 'iniciante',    tier: 5, paisId: null },
        j20: { nick: 'silver1',      tier: 5, paisId: null }
      };

      const paises = {
        brasil:    { nome: 'Brasil',    bandeira: '🇧🇷', jogadores: {} },
        argentina: { nome: 'Argentina', bandeira: '🇦🇷', jogadores: {} },
        alemanha:  { nome: 'Alemanha',  bandeira: '🇩🇪', jogadores: {} },
        japao:     { nome: 'Japão',     bandeira: '🇯🇵', jogadores: {} }
      };

      const config = {
        codigoAcesso: '1234',
        modalidades: ['x1', 'braco_direito', 'retake', '5x5', 'corrida_armada']
      };

      const torneio = {
        status: 'aguardando',
        modalidadeAtual: null,
        fase: null
      };

      const updates = {};
      updates['mixleague/jogadores'] = jogadores;
      updates['mixleague/paises']    = paises;
      updates['mixleague/config']    = config;
      updates['mixleague/torneio']   = torneio;

      db.ref('/').update(updates)
        .then(() => console.log('[Seed] Dados iniciais inseridos com sucesso.'))
        .catch(err => console.error('[Seed] Erro ao inserir dados:', err));
    } else {
      console.log('[Seed] Dados já existem, seed ignorado.');
    }
  }).catch(err => console.error('[Seed] Erro ao verificar dados:', err));
}

seedInitialData();
