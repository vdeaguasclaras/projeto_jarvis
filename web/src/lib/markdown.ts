/** Markdown das notas — o mesmo dialeto do protótipo v6:
 *  **negrito** *itálico* ## títulos > citação - listas - [ ] encaminhamentos
 *  [[links]] entre notas · #tags · @pessoas · [arquivo](file:...) linkado, nunca duplicado. */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function mdInline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[\[([^\]]+)\]\]/g, '<a class="wikilink" data-nota="$1">[[$1]]</a>')
    .replace(/\[([^\]]+)\]\(file:[^)]*\)/g, '<span class="chip file">📄 $1</span>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/(^|\s)#([\wÀ-ú-]+)/g, '$1<span class="note-tag">#$2</span>')
    .replace(/(^|\s)@([\wÀ-ú]+)/g, '$1<span class="chip person">@$2</span>');
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
    if (/^- \[[ x]\] /.test(l)) {
      if (list !== "ul") {
        closeList();
        html += "<ul>";
        list = "ul";
      }
      const feita = /^- \[x\]/.test(l);
      html += `<li class="mdtask"><span class="bx">${feita ? "☑" : "☐"}</span>${mdInline(l.slice(6))}</li>`;
      continue;
    }
    if (/^- /.test(l)) {
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
    if (l.startsWith("## ")) html += `<h2>${mdInline(l.slice(3))}</h2>`;
    else if (l.startsWith("# ")) html += `<h1>${mdInline(l.slice(2))}</h1>`;
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

/** Encaminhamentos abertos: linhas "- [ ] …". */
export function encaminhamentosDe(md: string): string[] {
  return (md.match(/^- \[ \] .+$/gm) ?? []).map((l) => l.slice(6).trim());
}

/** Primeira linha legível, para o snippet da lista. */
export function snippetDe(md: string): string {
  return (md.split("\n").find((l) => l.trim()) ?? "").replace(/[#*[\]>!()]/g, "").slice(0, 90);
}
