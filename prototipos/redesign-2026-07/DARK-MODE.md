# Kairós — Modo escuro (mapa completo claro → escuro)

## Princípios
1. **Nunca preto puro** — a tinta é quente/esverdeada (#171a17), como o creme é quente no claro.
2. **Acentos clareiam um passo** para manter contraste em fundo escuro (verde #1c6b57 → #56c7a4).
3. **Texto sobre acento inverte para tinta** (#fffdf8 sobre verde no claro → #171a17 sobre #56c7a4 no escuro).
4. **Bordas clareiam em relação ao fundo** (nunca escurecem); sombras viram preto com opacidade maior.
5. Contraste mínimo AA: texto principal 12.5:1 (#ece8de/#171a17); secundário ≥ 4.5:1.

## Base
| Token | Claro | Escuro |
|---|---|---|
| bg | #f7f3ec | #171a17 |
| surface | #fffdf8 | #1f2320 |
| surface-inset | #f7f3ec | #262b26 |
| surface-muted | #f0ece1 | #1f2320 + borda #2e332e |
| border | #e8e2d6 | #2e332e |
| border-subtle | #f0eadd / #eee8db | #272c27 |
| border-strong | #dcd5c6 | #3a403a |
| ink | #26221b | #ece8de |
| ink-secondary | #6b655a | #a8a294 |
| ink-muted | #a09a8d | #7d7a6e |
| ink-soft | #3d382f | #d8d3c6 |

## Verde
| Token | Claro | Escuro |
|---|---|---|
| green (primário) | #1c6b57 | #56c7a4 |
| texto sobre green | #fffdf8 | #171a17 |
| green-deep (texto) | #145847 | #7fd7b5 |
| gradiente botão + | #23816a → #145847 | #56c7a4 → #2e8a6c |
| green-bg | #e9f1ec | #1e3a30 (ou rgba(86,199,164,0.14) no trilho) |
| green-border | #bcd6c8 | #35443c |
| green-event (timeline) | #dcebe2 / texto #145847 | #1e3a30 / texto #7fd7b5 |

## Terracota
| Token | Claro | Escuro |
|---|---|---|
| terracotta | #c05f3c | #e08a5f |
| texto sobre terracotta | #fffdf8 | #171a17 |
| terracotta-deep (texto) | #96431f | #e8ab88 |
| terracotta-bg (chips/eventos) | #f6e7dc / #f6e2d4 | #3a2a20 |
| despacho-card | #f1e5d8 | #302620 (borda interna de atalho #4a3c30) |

## Lilás
| Token | Claro | Escuro |
|---|---|---|
| purple (nós/bordas) | #7c6ba8 / #a493d6 | #a493d6 |
| purple-deep (texto) | #5b4a8a | #c3b6e8 |
| purple-bg | #ece8f4 | #2a2537 |

## Estados
| Token | Claro | Escuro |
|---|---|---|
| danger texto / fundo | #b3392b / #fdecea | #f28b7d / #3a211e |
| warning ponto / texto / fundo | #e0a83c / #8a6d1f / #f9f1de | #e6bd63 / #e6bd63 / #3a3120 |
| neutral-chip | #eff1ec | #262b26 |
| highlight de busca (mark) | #f9f1de | #3a3120 (texto #ece8de) |

## Sombras e overlays
| Uso | Claro | Escuro |
|---|---|---|
| card | 0 12px 30px rgba(38,34,27,0.06) | 0 12px 30px rgba(0,0,0,0.35) |
| tab bar / trilho flutuante | rgba(38,34,27,0.14) | rgba(0,0,0,0.5) |
| botão verde | rgba(28,107,87,0.3) | rgba(86,199,164,0.25) |
| overlay de ritual | rgba(38,34,27,0.45) | rgba(0,0,0,0.6) |
| fade de rolagem | rgba(surface,0) → surface | idem com surface escura |

## Casos especiais
- **Segmented control**: claro trilho #f0ece1 + ativo #fffdf8 com sombra; escuro trilho #1f2320 + borda #2e332e + ativo #2e332e (sem sombra).
- **Popover guia de marcações** (já escuro no claro): no escuro mantém #26221b mas ganha borda #3a403a.
- **Ritual imersivo 13c**: já é escuro por design — idêntico nos dois temas.
- **Grafo**: arestas #e8e2d6 → #2e332e; texto de rótulo #6b655a → #a8a294; nós mantêm as cores de tipo clareadas (lilás #a493d6, terracota #e08a5f, verde #56c7a4, pessoa #c07a4f).
- **iOS frame**: usar variante dark (status bar clara).
- Referências prontas no canvas: **16a** (desktop) e **16b** (mobile).
