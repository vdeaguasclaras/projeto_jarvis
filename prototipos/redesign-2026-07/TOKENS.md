# Kairós — Design Tokens (tema claro)

## Cores
### Base
| Token | Hex | Uso |
|---|---|---|
| bg | #f7f3ec | fundo do app |
| surface | #fffdf8 | cards, painéis, trilho |
| surface-inset | #f7f3ec | tiles dentro de cards |
| surface-muted | #f0ece1 | colunas kanban, segmented control |
| border | #e8e2d6 | borda padrão |
| border-subtle | #f0eadd / #eee8db | divisores internos |
| border-strong | #dcd5c6 | tracejados, handles |
| ink | #26221b | texto principal |
| ink-secondary | #6b655a | texto secundário |
| ink-muted | #a09a8d | rótulos, placeholders |
| ink-soft | #3d382f | títulos de itens não selecionados |

### Verde (marca / primário)
| Token | Hex | Uso |
|---|---|---|
| green | #1c6b57 | botões primários, ativo, links |
| green-deep | #145847 | texto verde, hover de link |
| green-bright | #23816a | topo do gradiente do botão + |
| green-bg | #e9f1ec | fundo suave verde (chips, ativo do trilho) |
| green-border | #bcd6c8 | borda de destaque verde |
| green-event | #dcebe2 | bloco de evento na timeline |

### Terracota (energia / rituais / projetos em destaque)
| Token | Hex | Uso |
|---|---|---|
| terracotta | #c05f3c | Despacho, ★ prioridade, projeto quente |
| terracotta-deep | #96431f | texto terracota |
| terracotta-bg | #f6e7dc / #f6e2d4 | chips e eventos terracota |
| despacho-card | #f1e5d8 | card quente do Despacho |

### Lilás (notas / conexões)
| Token | Hex |
|---|---|
| purple | #7c6ba8 (nós do grafo) · #a493d6 (bordas de evento) |
| purple-deep | #5b4a8a (texto) |
| purple-bg | #ece8f4 |

### Estados
| Token | Hex |
|---|---|
| danger / vencido | texto #b3392b · fundo #fdecea |
| warning / atenção | ponto #e0a83c · texto #8a6d1f · fundo #f9f1de |
| neutral-chip | #eff1ec |
| highlight (busca) | #f9f1de |

### Superfícies escuras no tema claro
Popover do guia de marcações e cards "dark" usam ink #26221b com texto #f7f3ec / #c9c2b2 e acentos #7fbfa8, #e0906f, #b3a5d6.

## Tipografia
- **Display / editorial**: Lora (400–700, itálica) — saudação mobile, manchetes da Revisão, citações, reflexões do usuário.
- **UI**: system-ui. Títulos de página 24px/700; título de card 16–17px/650; corpo 13–14.5px; rótulos uppercase 10.5–11px/650–700 com letter-spacing 0.10–0.14em; metadados 11–12.5px.
- **Monospace** (editor markdown): ui-monospace/'SF Mono'/Menlo 13.5–14.5px, line-height 1.75–1.85.

## Forma e espaço
- Radius: cards 16–20px · tiles/inputs 10–14px · pills/botões 999px · chips 5–8px · modais 24px · bottom sheets 26px 26px 0 0.
- Espaçamento: escala de 4 (4/6/8/10/12/16/20/28); padding de página desktop 16–28px; gaps de grid 16–22px.
- Sombras: card 0 12px 30px rgba(38,34,27,0.06) · flutuante 0 10px 22px rgba(28,107,87,0.3) (verde) · modal 0 30px 80px rgba(20,16,10,0.4).
- Barras de progresso: 4–6px, radius 2–3px, trilha border/#e8e2d6.
