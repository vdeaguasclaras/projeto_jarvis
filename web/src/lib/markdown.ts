/** Markdown das notas — dialeto do protótipo v6, ampliado no uso real:
 *  # ## ### #### títulos · **negrito** ou __negrito__ · *itálico* ou _itálico_
 *  `código` · ~~riscado~~ · > citação · - ou * listas · 1. numeradas
 *  - [ ] encaminhamentos · --- linha divisória
 *  [[links]] entre notas · #tags · @pessoas · [arquivo](file:...) linkado, nunca duplicado. */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function mdInline(s: string): string {
  return (
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // negrito antes do itálico; lazy para aceitar * solto dentro
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      // itálico só entre bordas de palavra — não pega snake_case nem 2*3*4
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,;:!?])/g, "$1<em>$2</em>")
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/g, "$1<em>$2</em>")
      .replace(/~~(.+?)~~/g, "<s>$1</s>")
      // na leitura o link aparece limpo, sem os colchetes (como no Obsidian)
      .replace(/\[\[([^\]]+)\]\]/g, '<a class="wikilink" data-nota="$1">$1</a>')
      .replace(/\[([^\]]+)\]\(file:[^)]*\)/g, '<span class="chip file">📄 $1</span>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/(^|\s)#([\wÀ-ú-]+)/g, '$1<span class="note-tag">#$2</span>')
      .replace(/(^|\s)@([\wÀ-ú]+)/g, '$1<span class="chip person">@$2</span>')
  );
}

export function mdToHtml(md: string): string {
  let html = "";
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };
  for (const raw of md.split("\n")) {
    const l = raw.trimEnd();
    const media = l.match(/^!\[([^\]]*)\]\((video:)?[^)]*\)$/);
    if (media) {
      closeList();
      html += `<figure class="md-media"><div class="ph">${media[2] ? "🎬" : "🖼"} ${esc(media[1] || "mídia")}</div></figure>`;
      continue;
    }
    if (/^[-*] \[[ x]\] /.test(l)) {
      if (list !== "ul") {
        closeList();
        html += "<ul>";
        list = "ul";
      }
      const feita = /^[-*] \[x\]/.test(l);
      html += `<li class="mdtask${feita ? " done" : ""}"><span class="bx${feita ? " on" : ""}"></span>${mdInline(l.slice(6))}</li>`;
      continue;
    }
    if (/^[-*] /.test(l)) {
      if (list !== "ul") {
        closeList();
        html += "<ul>";
        list = "ul";
      }
      html += `<li>${mdInline(l.slice(2))}</li>`;
      continue;
    }
    if (/^\d+\. /.test(l)) {
      if (list !== "ol") {
        closeList();
        html += "<ol>";
        list = "ol";
      }
      html += `<li>${mdInline(l.replace(/^\d+\. /, ""))}</li>`;
      continue;
    }
    closeList();
    const titulo = l.match(/^(#{1,4}) (.+)/); // #tag continua tag: título exige espaço
    if (titulo) html += `<h${titulo[1].length}>${mdInline(titulo[2])}</h${titulo[1].length}>`;
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) html += "<hr>";
    else if (l.startsWith("> ")) html += `<blockquote>${mdInline(l.slice(2))}</blockquote>`;
    else if (l) html += `<p>${mdInline(l)}</p>`;
  }
  closeList();
  return html;
}

/** ── Markdown vivo (Etapa G, telas 12a/8a): highlight EM CIMA do texto cru ──
 *  Usado no overlay do editor: o HTML gerado precisa ter EXATAMENTE os mesmos
 *  caracteres do texto digitado (marcas incluídas), senão o colorido desalinha
 *  do textarea transparente. Por isso: nada de mudar tamanho de fonte, nada de
 *  padding horizontal nos "chips" — só cor, peso e fundo. */

function vivoInline(s: string): string {
  return (
    esc(s)
      .replace(/`([^`]+)`/g, '<span class="mv-code">`$1`</span>')
      .replace(/\*\*(.+?)\*\*/g, '<span class="mv-m">**</span><b>$1</b><span class="mv-m">**</span>')
      .replace(/__(.+?)__/g, '<span class="mv-m">__</span><b>$1</b><span class="mv-m">__</span>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,;:!?])/g, '$1<span class="mv-m">*</span><i>$2</i><span class="mv-m">*</span>')
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/g, '$1<span class="mv-m">_</span><i>$2</i><span class="mv-m">_</span>')
      .replace(/~~(.+?)~~/g, '<span class="mv-m">~~</span><s>$1</s><span class="mv-m">~~</span>')
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="mv-wl">[[$1]]</span>')
      .replace(/(^|\s)#([\wÀ-ú-]+)/g, '$1<span class="mv-tag">#$2</span>')
      .replace(/(^|\s)@([\wÀ-ú]+)/g, '$1<span class="mv-at">@$2</span>')
  );
}

export function mdVivoHtml(md: string): string {
  return md
    .split("\n")
    .map((l) => {
      const titulo = l.match(/^(#{1,4}) (.*)$/);
      if (titulo) return `<span class="mv-h">${titulo[1]}</span> <b>${vivoInline(titulo[2])}</b>`;
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) return `<span class="mv-m">${l}</span>`;
      const check = l.match(/^([-*] \[[ x]\] )(.*)$/);
      if (check) return `<span class="mv-b">${esc(check[1])}</span>${vivoInline(check[2])}`;
      const item = l.match(/^([-*] |\d+\. )(.*)$/);
      if (item) return `<span class="mv-b">${esc(item[1])}</span>${vivoInline(item[2])}`;
      const cit = l.match(/^(> )(.*)$/);
      if (cit) return `<span class="mv-h">&gt; </span><span class="mv-q">${vivoInline(cit[2])}</span>`;
      return vivoInline(l);
    })
    .join("\n");
}

/** [[títulos]] citados no texto. */
export function linksDe(md: string): string[] {
  return [...md.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
}

/** #tags do texto (sem repetição, na ordem). */
export function tagsDe(md: string): string[] {
  return [...new Set([...md.matchAll(/(^|\s)#([\wÀ-ú-]+)/g)].map((m) => m[2]))];
}

/** @pessoas mencionadas (sem repetição). */
export function pessoasDe(md: string): string[] {
  return [...new Set([...md.matchAll(/(^|\s)@([\wÀ-ú]+)/g)].map((m) => m[2]))];
}

/** Encaminhamentos abertos: linhas "- [ ] …" (ou "* [ ] …"). */
export function encaminhamentosDe(md: string): string[] {
  return (md.match(/^[-*] \[ \] .+$/gm) ?? []).map((l) => l.slice(6).trim());
}

/** Primeira linha legível, para o snippet da lista. */
export function snippetDe(md: string): string {
  return (md.split("\n").find((l) => l.trim()) ?? "").replace(/[#*[\]>!()]/g, "").slice(0, 90);
}
