// supabase-config.js — Inicialização do cliente Supabase + Seed de dados iniciais
// Substitui o firebase-config.js

const SUPABASE_URL     = 'https://ljhjieasdwyleoimqepe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eId6oDpgCgxsH1NoPkJTXw_T1TFtkxn';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedInitialData() {
  try {
    // Só executa se a config principal ainda não existir
    const { data, error } = await sb.from('config').select('id').eq('id', 'main').limit(1);
    if (error) { console.error('[Seed] Erro ao verificar dados:', error); return; }
    if (data && data.length > 0) { console.log('[Seed] Dados já existem, seed ignorado.'); return; }

    console.log('[Seed] Populando dados iniciais...');

    await sb.from('jogadores').insert([
      { id: 'j01', nick: 'admin',        tier: 1, pais_id: null },
      { id: 'j02', nick: 'zekinha',      tier: 1, pais_id: null },
      { id: 'j03', nick: 'falleN_pro',   tier: 1, pais_id: null },
      { id: 'j04', nick: 'coldzera',     tier: 1, pais_id: null },
      { id: 'j05', nick: 's1mple2',      tier: 2, pais_id: null },
      { id: 'j06', nick: 'electronic',   tier: 2, pais_id: null },
      { id: 'j07', nick: 'niko_fan',     tier: 2, pais_id: null },
      { id: 'j08', nick: 'rain_boy',     tier: 2, pais_id: null },
      { id: 'j09', nick: 'device_kid',   tier: 3, pais_id: null },
      { id: 'j10', nick: 'xyp9x_jr',     tier: 3, pais_id: null },
      { id: 'j11', nick: 'dupreeh',      tier: 3, pais_id: null },
      { id: 'j12', nick: 'glaive_fan',   tier: 3, pais_id: null },
      { id: 'j13', nick: 'magisk_jr',    tier: 4, pais_id: null },
      { id: 'j14', nick: 'astralis_fan', tier: 4, pais_id: null },
      { id: 'j15', nick: 'vitality_fan', tier: 4, pais_id: null },
      { id: 'j16', nick: 'navi_fan',     tier: 4, pais_id: null },
      { id: 'j17', nick: 'noob1',        tier: 5, pais_id: null },
      { id: 'j18', nick: 'noob2',        tier: 5, pais_id: null },
      { id: 'j19', nick: 'iniciante',    tier: 5, pais_id: null },
      { id: 'j20', nick: 'silver1',      tier: 5, pais_id: null }
    ]);

    await sb.from('paises').insert([
      { id: 'brasil',    nome: 'Brasil',    bandeira: '🇧🇷', jogadores: {} },
      { id: 'argentina', nome: 'Argentina', bandeira: '🇦🇷', jogadores: {} },
      { id: 'alemanha',  nome: 'Alemanha',  bandeira: '🇩🇪', jogadores: {} },
      { id: 'japao',     nome: 'Japão',     bandeira: '🇯🇵', jogadores: {} }
    ]);

    await sb.from('config').upsert({
      id: 'main',
      codigo_acesso: 'mixleague',
      modalidades: ['x1', 'braco_direito', 'retake', '5x5', 'corrida_armada']
    }, { onConflict: 'id' });

    await sb.from('torneio').upsert({
      id: 'main',
      status: 'aguardando',
      modalidade_atual: null,
      fase: null
    }, { onConflict: 'id' });

    await sb.from('draft').upsert({
      id: 'main',
      dados: {
        status: 'aguardando', numTimes: null, capitaes: {}, capitaeTiers: {},
        ordemTiers: [], ordemPaisesBase: [], ordem: [], ordemTier: [],
        rodadaAtual: 0, pickAtual: 0, vezDe: null, tierAtual: null, picks: {}
      }
    }, { onConflict: 'id' });

    await sb.from('votacao').upsert({
      id: 'main',
      dados: { status: 'fechada', votos: {}, participantes: {} }
    }, { onConflict: 'id' });

    console.log('[Seed] Dados iniciais inseridos com sucesso.');
  } catch (err) {
    console.error('[Seed] Erro no seed:', err);
  }
}

seedInitialData();
