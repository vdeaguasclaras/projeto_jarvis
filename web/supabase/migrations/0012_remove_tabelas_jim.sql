-- Remove o app do Jim (mapa-de-sala, projeto encerrado) deste banco.
-- Decisão do Raul em 22/07/2026; backup completo (dados + schema) entregue
-- na mesma data. Elimina as políticas RLS permissivas que o CLAUDE.md
-- alertava desde docs/08 — o projeto fica só com as kairos_* (RLS "dono").
drop table if exists
  jim_gincana_colocacoes, jim_gincana_resultados, jim_gincanas,
  jim_eventos_sumula, jim_sumulas, jim_penalidades, jim_abertura,
  jim_jogador_modalidade, jim_inscricoes, jim_jogos, jim_jogadores,
  jim_grupo_turmas, jim_grupos, jim_turmas, jim_equipes,
  jim_categorias, jim_modalidades, jim_config, jim_profiles
cascade;
drop function if exists jim_touch_updated_at();
