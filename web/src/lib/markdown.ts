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
      .replace(/\[\[([^\]]+)\]\]/g, '<a class="wikilink" data-nota="$1">[[$1]]</a>')
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
      html += `<li class="mdtask"><span class="bx">${feita ? "☑" : "☐"}</span>${mdInline(l.slice(6))}</li>`;
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
