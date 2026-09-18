/**
 * @file latexExporter.js
 *
 * Generates ready-to-compile LaTeX (.tex) documents from the resume state.
 *
 * Implements full visual designs for all 10 themes:
 *   1. academic    — Traditional Academic CV (Serif, double-rule masthead, citation index)
 *   2. swish       — LianTze Lim cv-llt style (Olive gradient rubric bar, date gutter)
 *   3. marker      — Circled entry numbers (\circled{n}), smallcaps, accent rules
 *   4. compact     — Two-column dense layout (paracol, accent divider, compact leading)
 *   5. tech        — Modern sans-serif, tinted masthead card (tcolorbox), pill badges
 *   6. sidebar     — Two-column layout with tinted left rail (contacts + skills)
 *   7. timeline    — Chronological vertical timeline spine with node dots
 *   8. editorial   — Magazine layout, standfirst margin headings, serif, drop cap
 *   9. simplistic  — Clean ATS-friendly Jake's Resume style (pure monochrome)
 *  10. banner      — Full-bleed top color banner box, modern clean body
 *
 * In the generated file:
 *   - The ACTIVE theme is UNCOMMENTED and compiles immediately.
 *   - ALL other 9 themes are included but COMMENTED OUT with '%'.
 *   - Switching themes in Overleaf / TeXShop requires only uncommenting one block!
 *
 * Also provides generateLatexPackage() to export modular .tex + .sty files.
 */

/**
 * Escape LaTeX special characters in text strings.
 * @param {string} text
 * @returns {string}
 */
export function escapeLatex(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Clean markdown bold/italic formatting into LaTeX tags.
 * @param {string} md
 * @returns {string}
 */
export function markdownToLatex(md) {
  if (!md) return '';
  let str = escapeLatex(md);
  // Convert **bold** -> \textbf{bold}
  str = str.replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}');
  // Convert *italic* -> \textit{italic}
  str = str.replace(/\*(.+?)\*/g, '\\textit{$1}');
  return str;
}

/**
 * Extract monogram initials from full name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return 'CV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * All 10 theme definitions with full LaTeX code.
 */
const THEME_BUILDERS = {
  academic: {
    id: 'academic',
    name: 'Academic',
    desc: 'Traditional Academic CV (Serif, double-rule masthead, citation numbering)',
    code: (accent) => `\\usepackage{mathpazo}
\\usepackage[letterpaper,margin=0.75in]{geometry}
\\linespread{1.05}

\\newcommand{\\makemasthead}{%
  \\begin{center}%
    {\\Huge\\scshape \\cvname}\\\\[0.25em]%
    {\\large\\itshape \\cvtitle}\\\\[0.5em]%
    {\\small%
      \\ifx\\cvemail\\empty\\else\\href{mailto:\\cvemail}{\\cvemail}\\fi%
      \\ifx\\cvphone\\empty\\else\\enspace$\\cdot$\\enspace \\cvphone\\fi%
      \\ifx\\cvlocation\\empty\\else\\enspace$\\cdot$\\enspace \\cvlocation\\fi%
      \\ifx\\cvscholar\\empty\\else\\enspace$\\cdot$\\enspace \\href{\\cvscholar}{Google Scholar}\\fi%
      \\ifx\\cvgithub\\empty\\else\\enspace$\\cdot$\\enspace \\href{\\cvgithub}{GitHub}\\fi%
      \\ifx\\cvlinkedin\\empty\\else\\enspace$\\cdot$\\enspace \\href{\\cvlinkedin}{LinkedIn}\\fi%
    }%
  \\end{center}%
  \\vspace{0.2em}%
  \\hrule height 1.2pt%
  \\vspace{1.5pt}%
  \\hrule height 0.4pt%
  \\vspace{1em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  {\\large\\bfseries\\scshape #1}\\enspace\\hrulefill\\par%
  \\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#5&\\else\\space{\\normalfont\\itshape [#5]}\\fi%
  \\hfill{\\small\\itshape #1}\\\\%
  \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
  \\ifx&#4&\\else\\space{\\footnotesize\\color{black!70}(#4)}\\fi%
  \\ifx&#6&\\else\\\\{\\small #6}\\fi%
  #7%
  \\vspace{0.4em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\hangindent=2em\\hangafter=1%
  [#1]\\enspace #2, \\textbf{\`\`#3''}, \\textit{#4}, #5.%
  \\ifx&#6&\\else\\enspace{\\footnotesize\\url{#6}}\\fi\\par\\vspace{0.35em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\textbf{#1:}\\enspace {\\small #2}\\par\\vspace{0.25em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  swish: {
    id: 'swish',
    name: 'Swish',
    desc: 'LianTze Lim cv-llt style (Olive gradient rubric bar, date gutter, crimson markers)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.75in]{geometry}

\\definecolor{SwishLineColour}{HTML}{88AC0B}
\\definecolor{MarkerColour}{HTML}{920532}

\\newcommand{\\makemasthead}{%
  {\\Huge\\bfseries \\cvname}\\\\[0.2em]%
  {\\large\\color{black!75} \\cvtitle}\\\\[0.6em]%
  {\\small%
    \\ifx\\cvemail\\empty\\else\\textcolor{MarkerColour}{\\faEnvelope}\\enspace\\href{mailto:\\cvemail}{\\cvemail}\\hspace{1.5em}\\fi%
    \\ifx\\cvphone\\empty\\else\\textcolor{MarkerColour}{\\faPhone}\\enspace\\cvphone\\hspace{1.5em}\\fi%
    \\ifx\\cvlocation\\empty\\else\\textcolor{MarkerColour}{\\faMapMarker*}\\enspace\\cvlocation\\hspace{1.5em}\\fi%
    \\ifx\\cvscholar\\empty\\else\\textcolor{MarkerColour}{\\faGraduationCap}\\enspace\\href{\\cvscholar}{Scholar}\\hspace{1.5em}\\fi%
    \\ifx\\cvgithub\\empty\\else\\textcolor{MarkerColour}{\\faGithub}\\enspace\\href{\\cvgithub}{GitHub}\\hspace{1.5em}\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\textcolor{MarkerColour}{\\faLinkedin}\\enspace\\href{\\cvlinkedin}{LinkedIn}\\fi%
  }\\par\\vspace{0.8em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  \\begin{tikzpicture}[baseline]%
    \\shade[left color=SwishLineColour!60!white, right color=white] rectangle (\\textwidth, 2.8pt);%
    \\node[font=\\sffamily\\Large\\bfseries, inner sep=0pt, text ragged, anchor=south west] at (1pt, 4pt) {#1};%
  \\end{tikzpicture}\\par\\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft\\small\\color{black!75}\\textbf{#1}%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    \\textcolor{MarkerColour}{\\small\\faBookmark}\\enspace\\textbf{#2}%
    \\ifx&#5&\\else\\enspace{\\footnotesize\\bfseries\\color{MarkerColour}[#5]}\\fi\\hfill\\\\%
    \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
    \\ifx&#4&\\else\\enspace{\\footnotesize\\color{black!70}(#4)}\\fi%
    \\ifx&#6&\\else\\\\{\\small #6}\\fi%
    #7%
  \\end{minipage}\\par\\vspace{0.5em}%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft\\small\\color{black!75}\\textbf{#5}%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    \\tikz[baseline=(char.base)]{\\node[shape=circle,fill=MarkerColour,inner sep=1.5pt,text=white,font=\\tiny\\bfseries] (char) {#1};}\\enspace%
    #2, \\textbf{\`\`#3''}, \\textit{#4}.%
    \\ifx&#6&\\else\\enspace{\\footnotesize\\url{#6}}\\fi%
  \\end{minipage}\\par\\vspace{0.4em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft\\small\\bfseries #1%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    {\\small #2}%
  \\end{minipage}\\par\\vspace{0.3em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  marker: {
    id: 'marker',
    name: 'Marker',
    desc: 'Accent Marker Theme (Numbered circled badges \\circled{n} on every entry)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.75in]{geometry}

\\definecolor{MarkerColour}{HTML}{${accent.replace('#', '')}}

\\newcounter{cvcounter}
\\setcounter{cvcounter}{1}
\\newcommand*\\circled[1]{\\tikz[baseline=(char.base)]{\\node[shape=circle,fill=MarkerColour,inner sep=1.8pt,text=white,font=\\sffamily\\tiny\\bfseries] (char) {#1};}}

\\newcommand{\\makemasthead}{%
  {\\Huge\\bfseries \\cvname}\\\\[0.2em]%
  {\\large\\color{black!75} \\cvtitle}\\\\[0.6em]%
  {\\small%
    \\ifx\\cvemail\\empty\\else\\textcolor{MarkerColour}{\\faEnvelope}\\enspace\\href{mailto:\\cvemail}{\\cvemail}\\hspace{1.5em}\\fi%
    \\ifx\\cvphone\\empty\\else\\textcolor{MarkerColour}{\\faPhone}\\enspace\\cvphone\\hspace{1.5em}\\fi%
    \\ifx\\cvlocation\\empty\\else\\textcolor{MarkerColour}{\\faMapMarker*}\\enspace\\cvlocation\\hspace{1.5em}\\fi%
    \\ifx\\cvscholar\\empty\\else\\textcolor{MarkerColour}{\\faGraduationCap}\\enspace\\href{\\cvscholar}{Scholar}\\hspace{1.5em}\\fi%
    \\ifx\\cvgithub\\empty\\else\\textcolor{MarkerColour}{\\faGithub}\\enspace\\href{\\cvgithub}{GitHub}\\hspace{1.5em}\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\textcolor{MarkerColour}{\\faLinkedin}\\enspace\\href{\\cvlinkedin}{LinkedIn}\\fi%
  }\\par\\vspace{0.8em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  {\\sffamily\\large\\bfseries\\color{MarkerColour}\\uppercase{#1}}\\enspace%
  \\textcolor{MarkerColour!40}{\\hrulefill}\\par\\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft%
    \\circled{\\arabic{cvcounter}}\\\\[2pt]%
    {\\footnotesize\\color{black!70}#1}%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    \\textcolor{MarkerColour}{\\small\\faBookmark}\\enspace\\textbf{#2}%
    \\ifx&#5&\\else\\enspace\\tikz[baseline=-2pt]{\\node[fill=MarkerColour,text=white,rounded corners=1pt,inner sep=2pt,font=\\tiny\\bfseries] {#5};}\\fi\\hfill\\\\%
    \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
    \\ifx&#4&\\else\\enspace{\\footnotesize\\color{black!70}(#4)}\\fi%
    \\ifx&#6&\\else\\\\{\\small #6}\\fi%
    #7%
  \\end{minipage}\\par\\vspace{0.55em}%
  \\stepcounter{cvcounter}%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft\\circled{#1}\\\\[2pt]%
    {\\footnotesize\\color{black!70}#5}%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    #2, \\textbf{\`\`#3''}, \\textit{#4}.%
    \\ifx&#6&\\else\\enspace{\\footnotesize\\url{#6}}\\fi%
  \\end{minipage}\\par\\vspace{0.45em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\raggedleft\\small\\bfseries #1%
  \\end{minipage}\\hspace{0.03\\textwidth}%
  \\begin{minipage}[t]{0.75\\textwidth}%
    {\\small #2}%
  \\end{minipage}\\par\\vspace{0.3em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  compact: {
    id: 'compact',
    name: 'Compact',
    desc: 'Two-Column Dense Layout (paracol, accent divider rules, dense leading)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.5in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\makemasthead}{%
  \\noindent\\begin{minipage}[b]{0.55\\textwidth}%
    {\\LARGE\\bfseries \\cvname}\\\\[0.15em]%
    {\\small\\color{black!70} \\cvtitle}%
  \\end{minipage}%
  \\begin{minipage}[b]{0.45\\textwidth}%
    \\raggedleft\\scriptsize\\color{black!75}%
    \\ifx\\cvemail\\empty\\else\\href{mailto:\\cvemail}{\\cvemail}\\enspace$\\cdot$\\enspace\\fi%
    \\ifx\\cvphone\\empty\\else\\cvphone\\\\\\fi%
    \\ifx\\cvlocation\\empty\\else\\cvlocation\\enspace$\\cdot$\\enspace\\fi%
    \\ifx\\cvgithub\\empty\\else\\href{\\cvgithub}{GitHub}\\enspace$\\cdot$\\enspace\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\href{\\cvlinkedin}{LinkedIn}\\fi%
  \\end{minipage}\\par\\vspace{0.2em}%
  \\textcolor{themeAccent}{\\rule{\\textwidth}{1.5pt}}\\par\\vspace{0.5em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{0.7em}\\noindent%
  {\\small\\bfseries\\color{themeAccent}\\uppercase{#1}}\\par\\vspace{-0.3em}%
  \\textcolor{themeAccent!30}{\\rule{\\linewidth}{0.8pt}}\\par\\vspace{0.25em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}\\hfill{\\scriptsize\\color{black!60}#1}\\\\%
  \\ifx&#3&\\else{\\scriptsize\\textit{#3}}\\fi%
  \\ifx&#5&\\else\\enspace{\\tiny\\bfseries\\color{themeAccent}[#5]}\\fi%
  \\ifx&#6&\\else\\\\{\\scriptsize #6}\\fi%
  #7%
  \\vspace{0.3em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent{\\scriptsize\\bfseries #1.}\\enspace{\\scriptsize #2, \\textbf{\`\`#3''}, \\textit{#4}, #5.}%
  \\ifx&#6&\\else\\enspace{\\tiny\\url{#6}}\\fi\\par\\vspace{0.25em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent{\\scriptsize\\textbf{#1:}\\enspace #2}\\par\\vspace{0.15em}%
}

\\newcommand{\\startcolumns}{\\begin{paracol}{2}\\setlength{\\columnsep}{0.3in}}
\\newcommand{\\switchcol}{\\switchcolumn}
\\newcommand{\\stopcolumns}{\\end{paracol}}`,
  },

  tech: {
    id: 'tech',
    name: 'Tech',
    desc: 'Modern Software Engineer (Tinted masthead card, tech pill badges)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.65in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\techpill}[1]{\\tikz[baseline=-2.5pt]{\\node[fill=themeAccent!12, draw=themeAccent!25, rounded corners=2mm, inner sep=2.5pt, font=\\sffamily\\tiny\\bfseries, text=themeAccent!90!black] {#1};}}

\\newcommand{\\makemasthead}{%
  \\begin{tcolorbox}[colback=themeAccent!10, colframe=themeAccent!25, arc=3mm, boxrule=0.8pt, left=10pt, right=10pt, top=8pt, bottom=8pt]
    \\noindent\\begin{minipage}[c]{0.80\\textwidth}
      {\\huge\\bfseries \\cvname}\\\\[0.15em]
      {\\large\\bfseries\\color{themeAccent!85!black} \\cvtitle}\\\\[0.4em]
      {\\small
        \\ifx\\cvemail\\empty\\else\\href{mailto:\\cvemail}{\\cvemail}\\hspace{1.2em}\\fi
        \\ifx\\cvphone\\empty\\else\\cvphone\\hspace{1.2em}\\fi
        \\ifx\\cvlocation\\empty\\else\\cvlocation\\hspace{1.2em}\\fi
        \\ifx\\cvgithub\\empty\\else\\href{\\cvgithub}{GitHub}\\hspace{1.2em}\\fi
        \\ifx\\cvlinkedin\\empty\\else\\href{\\cvlinkedin}{LinkedIn}\\fi
      }
    \\end{minipage}%
    \\begin{minipage}[c]{0.18\\textwidth}
      \\flushright
      \\tikz{\\node[fill=themeAccent, text=white, font=\\sffamily\\Large\\bfseries, rounded corners=2.5mm, minimum size=1.1cm] {\\cvmonogram};}
    \\end{minipage}
  \\end{tcolorbox}
  \\vspace{0.4em}
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  \\tikz[baseline=-2.5pt]{\\node[fill=themeAccent!15, text=themeAccent, rounded corners=1.5pt, inner sep=3pt, font=\\sffamily\\tiny\\bfseries] {\\faTerminal};}\\enspace%
  {\\sffamily\\large\\bfseries\\uppercase{#1}}\\enspace%
  \\textcolor{themeAccent!40}{\\hrulefill}\\par\\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#3&\\else\\space{\\color{black!40}/}\\space{\\color{themeAccent!90!black}\\textbf{#3}}\\fi%
  \\ifx&#5&\\else\\space\\techpill{#5}\\fi%
  \\hfill{\\small\\fontfamily{cmtt}\\selectfont\\color{black!65}#1}\\\\%
  \\ifx&#4&\\else{\\footnotesize\\color{black!70}#4\\\\}\\fi%
  \\ifx&#6&\\else{\\small #6}\\fi%
  #7%
  \\vspace{0.4em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\textbf{\`\`#3''}\\\\%
  {\\small #2\\ifx&#4&\\else\\space$\\cdot$\\space\\textit{#4}\\fi\\space$\\cdot$\\space #5}%
  \\ifx&#6&\\else\\space{\\footnotesize\\url{#6}}\\fi\\par\\vspace{0.4em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\begin{minipage}[t]{0.22\\textwidth}%
    \\textbf{#1}%
  \\end{minipage}%
  \\begin{minipage}[t]{0.78\\textwidth}%
    {\\small #2}%
  \\end{minipage}\\par\\vspace{0.3em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  sidebar: {
    id: 'sidebar',
    name: 'Sidebar',
    desc: 'Two-Column Layout with Tinted Rail (paracol 0.32 / 0.68 column ratio)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.5in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\makemasthead}{%
  {\\LARGE\\bfseries \\cvname}\\\\[0.15em]%
  {\\small\\color{black!70} \\cvtitle}\\\\[0.4em]%
  {\\scriptsize%
    \\ifx\\cvemail\\empty\\else\\faEnvelope\\enspace\\href{mailto:\\cvemail}{\\cvemail}\\\\\\fi%
    \\ifx\\cvphone\\empty\\else\\faPhone\\enspace\\cvphone\\\\\\fi%
    \\ifx\\cvlocation\\empty\\else\\faMapMarker*\\enspace\\cvlocation\\\\\\fi%
    \\ifx\\cvgithub\\empty\\else\\faGithub\\enspace\\href{\\cvgithub}{GitHub}\\\\\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\faLinkedin\\enspace\\href{\\cvlinkedin}{LinkedIn}\\\\\\fi%
  }\\par\\vspace{0.5em}%
  \\textcolor{themeAccent}{\\rule{\\linewidth}{1.2pt}}\\par\\vspace{0.5em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{0.9em}\\noindent%
  {\\sffamily\\large\\bfseries #1}\\enspace%
  \\tikz[baseline=1pt]{\\fill[themeAccent] (0,0) rectangle (18pt, 2.5pt);}\\par\\vspace{0.35em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#5&\\else\\space\\tikz[baseline=-2pt]{\\node[fill=themeAccent!15,text=themeAccent,rounded corners=1pt,inner sep=2pt,font=\\tiny\\bfseries] {#5};}\\fi%
  \\hfill{\\small\\color{black!60}#1}\\\\%
  \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
  \\ifx&#4&\\else\\space{\\footnotesize\\color{black!70}(#4)}\\fi%
  \\ifx&#6&\\else\\\\{\\small #6}\\fi%
  #7%
  \\vspace{0.4em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\textbf{\`\`#3''}\\\\%
  {\\small #2, \\textit{#4}, #5.}%
  \\ifx&#6&\\else\\space{\\footnotesize\\url{#6}}\\fi\\par\\vspace{0.35em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\textbf{#1:}\\enspace {\\small #2}\\par\\vspace{0.25em}%
}

\\newcommand{\\startcolumns}{%
  \\begin{paracol}{2}%
  \\setcolumnwidth{0.32\\textwidth, 0.65\\textwidth}%
  \\setlength{\\columnsep}{0.25in}%
}
\\newcommand{\\switchcol}{\\switchcolumn}
\\newcommand{\\stopcolumns}{\\end{paracol}}`,
  },

  timeline: {
    id: 'timeline',
    name: 'Timeline',
    desc: 'Chronological Timeline (Vertical rail spine with node dots)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.7in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\makemasthead}{%
  {\\Huge\\bfseries \\cvname}\\\\[0.2em]%
  {\\large\\color{black!75} \\cvtitle}\\\\[0.5em]%
  {\\small%
    \\ifx\\cvemail\\empty\\else\\faEnvelope\\enspace\\href{mailto:\\cvemail}{\\cvemail}\\hspace{1.5em}\\fi%
    \\ifx\\cvphone\\empty\\else\\faPhone\\enspace\\cvphone\\hspace{1.5em}\\fi%
    \\ifx\\cvlocation\\empty\\else\\faMapMarker*\\enspace\\cvlocation\\hspace{1.5em}\\fi%
    \\ifx\\cvgithub\\empty\\else\\faGithub\\enspace\\href{\\cvgithub}{GitHub}\\hspace{1.5em}\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\faLinkedin\\enspace\\href{\\cvlinkedin}{LinkedIn}\\fi%
  }\\par\\vspace{0.8em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  \\tikz[baseline=-2pt]{\\fill[themeAccent] (0,0) rectangle (20pt, 2pt);}\\enspace%
  {\\sffamily\\large\\bfseries\\uppercase{#1}}\\par\\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\begin{minipage}[t]{0.18\\textwidth}%
    \\raggedleft\\footnotesize\\bfseries\\color{black!70}#1%
  \\end{minipage}%
  \\hspace{0.02\\textwidth}%
  \\begin{minipage}[t]{0.04\\textwidth}%
    \\centering%
    \\tikz[baseline]{\\draw[thick, themeAccent!30] (0,-1.5em) -- (0,0.8em); \\fill[themeAccent] (0,0.2em) circle (3pt);}%
  \\end{minipage}%
  \\hspace{0.02\\textwidth}%
  \\begin{minipage}[t]{0.74\\textwidth}%
    \\textbf{#2}%
    \\ifx&#5&\\else\\space\\tikz[baseline=-2pt]{\\node[fill=themeAccent!15,text=themeAccent,rounded corners=1pt,inner sep=2pt,font=\\tiny\\bfseries] {#5};}\\fi\\hfill\\\\%
    \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
    \\ifx&#4&\\else\\space{\\footnotesize\\color{black!70}(#4)}\\fi%
    \\ifx&#6&\\else\\\\{\\small #6}\\fi%
    #7%
  \\end{minipage}\\par\\vspace{0.4em}%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\begin{minipage}[t]{0.18\\textwidth}%
    \\raggedleft\\footnotesize\\bfseries\\color{black!70}#5%
  \\end{minipage}%
  \\hspace{0.02\\textwidth}%
  \\begin{minipage}[t]{0.04\\textwidth}%
    \\centering%
    \\tikz[baseline]{\\draw[thick, themeAccent!30] (0,-1.5em) -- (0,0.8em); \\fill[themeAccent] (0,0.2em) circle (3pt);}%
  \\end{minipage}%
  \\hspace{0.02\\textwidth}%
  \\begin{minipage}[t]{0.74\\textwidth}%
    #2, \\textbf{\`\`#3''}, \\textit{#4}.%
    \\ifx&#6&\\else\\enspace{\\footnotesize\\url{#6}}\\fi%
  \\end{minipage}\\par\\vspace{0.35em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\begin{minipage}[t]{0.18\\textwidth}%
    \\raggedleft\\small\\bfseries #1%
  \\end{minipage}\\hspace{0.08\\textwidth}%
  \\begin{minipage}[t]{0.74\\textwidth}%
    {\\small #2}%
  \\end{minipage}\\par\\vspace{0.3em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  editorial: {
    id: 'editorial',
    name: 'Editorial',
    desc: 'Magazine Layout (Serif, standfirst margin headings, fine hairlines)',
    code: (accent) => `\\usepackage{charter}
\\usepackage[letterpaper,margin=0.75in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\makemasthead}{%
  {\\Huge\\bfseries \\cvname}\\\\[0.25em]%
  {\\large\\itshape\\color{black!75} \\cvtitle}\\\\[0.6em]%
  {\\small%
    \\ifx\\cvemail\\empty\\else\\href{mailto:\\cvemail}{\\cvemail}\\hspace{1.5em}\\fi%
    \\ifx\\cvphone\\empty\\else\\cvphone\\hspace{1.5em}\\fi%
    \\ifx\\cvlocation\\empty\\else\\cvlocation\\hspace{1.5em}\\fi%
    \\ifx\\cvscholar\\empty\\else\\href{\\cvscholar}{Scholar}\\hspace{1.5em}\\fi%
    \\ifx\\cvgithub\\empty\\else\\href{\\cvgithub}{GitHub}\\hspace{1.5em}\\fi%
    \\ifx\\cvlinkedin\\empty\\else\\href{\\cvlinkedin}{LinkedIn}\\fi%
  }\\par\\vspace{0.6em}%
  \\hrule height 0.5pt%
  \\vspace{1em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  {\\large\\scshape\\bfseries\\color{black!70} #1}\\enspace\\hrulefill\\par%
  \\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#5&\\else\\space{\\normalfont\\textit{[#5]}}\\fi%
  \\hfill{\\footnotesize\\scshape\\color{black!60} #1}\\\\%
  \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
  \\ifx&#4&\\else\\space{\\footnotesize\\color{black!70}(#4)}\\fi%
  \\ifx&#6&\\else\\\\{\\small #6}\\fi%
  #7%
  \\vspace{0.45em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent #2, \\textbf{\`\`#3''}, \\textit{#4}, #5.%
  \\ifx&#6&\\else\\enspace{\\footnotesize\\url{#6}}\\fi\\par\\vspace{0.35em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\textbf{#1:}\\enspace {\\small #2}\\par\\vspace{0.25em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  simplistic: {
    id: 'simplistic',
    name: 'Simplistic',
    desc: 'Clean ATS Jake’s Resume Style (Pure monochrome single column, titlerule)',
    code: (accent) => `\\usepackage[letterpaper,margin=0.75in]{geometry}

\\newcommand{\\makemasthead}{%
  \\begin{center}%
    {\\Huge\\bfseries\\scshape \\cvname}\\\\[0.2em]%
    {\\large \\cvtitle}\\\\[0.4em]%
    {\\small%
      \\ifx\\cvemail\\empty\\else\\href{mailto:\\cvemail}{\\cvemail}\\fi%
      \\ifx\\cvphone\\empty\\else\\space$|$\\space \\cvphone\\fi%
      \\ifx\\cvlocation\\empty\\else\\space$|$\\space \\cvlocation\\fi%
      \\ifx\\cvscholar\\empty\\else\\space$|$\\space \\href{\\cvscholar}{Google Scholar}\\fi%
      \\ifx\\cvgithub\\empty\\else\\space$|$\\space \\href{\\cvgithub}{GitHub}\\fi%
      \\ifx\\cvlinkedin\\empty\\else\\space$|$\\space \\href{\\cvlinkedin}{LinkedIn}\\fi%
    }%
  \\end{center}%
  \\vspace{0.2em}%
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{0.8em}\\noindent%
  {\\large\\bfseries\\scshape #1}\\\\\\vspace{-0.6em}\\hrulefill\\par\\vspace{0.3em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#5&\\else\\space\\textbf{| #5}\\fi%
  \\hfill{\\small #1}\\\\%
  \\ifx&#3&\\else{\\textit{#3}}\\fi%
  \\ifx&#4&\\else\\space\\textbf{| #4}\\fi%
  \\ifx&#6&\\else\\\\{\\small #6}\\fi%
  #7%
  \\vspace{0.3em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent #2. (#5). #3. \\textit{#4}.%
  \\ifx&#6&\\else\\space\\url{#6}\\fi\\par\\vspace{0.3em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\textbf{#1:}\\enspace #2\\par\\vspace{0.2em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },

  banner: {
    id: 'banner',
    name: 'Banner',
    desc: 'Full-Bleed Header Banner (Solid accent color band, modern body)',
    code: (accent) => `\\usepackage[scaled=0.92]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage[letterpaper,margin=0.75in]{geometry}
\\definecolor{themeAccent}{HTML}{${accent.replace('#', '')}}

\\newcommand{\\makemasthead}{%
  \\begin{tcolorbox}[colback=themeAccent, colframe=themeAccent, arc=0mm, sharp corners, left=15pt, right=15pt, top=12pt, bottom=12pt]
    {\\Huge\\bfseries\\color{white} \\cvname}\\\\[0.2em]
    {\\large\\color{white!90} \\cvtitle}\\\\[0.6em]
    {\\small\\color{white}%
      \\ifx\\cvemail\\empty\\else\\faEnvelope\\enspace\\href{mailto:\\cvemail}{\\color{white}\\cvemail}\\hspace{1.5em}\\fi
      \\ifx\\cvphone\\empty\\else\\faPhone\\enspace\\cvphone\\hspace{1.5em}\\fi
      \\ifx\\cvlocation\\empty\\else\\faMapMarker*\\enspace\\cvlocation\\hspace{1.5em}\\fi
      \\ifx\\cvgithub\\empty\\else\\faGithub\\enspace\\href{\\cvgithub}{\\color{white}GitHub}\\hspace{1.5em}\\fi
      \\ifx\\cvlinkedin\\empty\\else\\faLinkedin\\enspace\\href{\\cvlinkedin}{\\color{white}LinkedIn}\\fi
    }
  \\end{tcolorbox}
  \\vspace{0.8em}
}

\\newcommand{\\cvsection}[1]{%
  \\vspace{1.1em}\\noindent%
  \\tikz[baseline=-2.5pt]{\\node[circle, fill=themeAccent, text=white, inner sep=2.5pt, font=\\sffamily\\tiny\\bfseries] {#1};}\\enspace%
  {\\sffamily\\large\\bfseries\\uppercase{#1}}\\enspace%
  \\textcolor{themeAccent!40}{\\hrulefill}\\par\\vspace{0.4em}%
}

\\newcommand{\\cventry}[7]{%
  \\noindent\\textbf{#2}%
  \\ifx&#5&\\else\\space\\tikz[baseline=-2pt]{\\node[fill=themeAccent,text=white,rounded corners=2pt,inner sep=2pt,font=\\tiny\\bfseries] {#5};}\\fi%
  \\hfill{\\small\\color{black!60}#1}\\\\%
  \\ifx&#3&\\else{\\small\\textit{#3}}\\fi%
  \\ifx&#4&\\else\\space{\\footnotesize\\color{black!70}(#4)}\\fi%
  \\ifx&#6&\\else\\\\{\\small #6}\\fi%
  #7%
  \\vspace{0.4em}\\par%
}

\\newcommand{\\cvpub}[6]{%
  \\noindent\\textbf{\`\`#3''}\\\\%
  {\\small #2, \\textit{#4}, #5.}%
  \\ifx&#6&\\else\\space{\\footnotesize\\url{#6}}\\fi\\par\\vspace{0.35em}%
}

\\newcommand{\\cvskill}[2]{%
  \\noindent\\textbf{#1:}\\enspace {\\small #2}\\par\\vspace{0.25em}%
}

\\newcommand{\\startcolumns}{}
\\newcommand{\\switchcol}{}
\\newcommand{\\stopcolumns}{}`,
  },
};

/**
 * Build the styles block containing all 10 themes with the active theme uncommented
 * and the remaining 9 themes commented out with '%'.
 *
 * @param {string} activeThemeId
 * @param {string} accent
 * @returns {string}
 */
export function buildAllThemesStyles(activeThemeId, accent = '#4f46e5') {
  const activeKey = THEME_BUILDERS[activeThemeId] ? activeThemeId : 'academic';
  let out = '';

  out += `% ==============================================================================\n`;
  out += `% THEME DEFINITIONS (10 STYLES INCLUDED)\n`;
  out += `% Active Theme: ${THEME_BUILDERS[activeKey].name.toUpperCase()} (uncommented below)\n`;
  out += `% To switch themes: Comment out the active theme block, and uncomment\n`;
  out += `% the block of any other theme you wish to use!\n`;
  out += `% ==============================================================================\n\n`;

  for (const [id, builder] of Object.entries(THEME_BUILDERS)) {
    const isActive = id === activeKey;
    const rawCode = builder.code(accent);

    out += `% ------------------------------------------------------------------------------\n`;
    out += `% THEME: ${builder.name.toUpperCase()}${isActive ? ' (ACTIVE — UNCOMMENTED)' : ' (COMMENTED OUT)'}\n`;
    out += `% ${builder.desc}\n`;
    out += `% ------------------------------------------------------------------------------\n`;

    if (isActive) {
      out += `${rawCode}\n\n`;
    } else {
      // Comment out every line
      const commented = rawCode
        .split('\n')
        .map((line) => (line.trim().length > 0 ? `% ${line}` : '%'))
        .join('\n');
      out += `${commented}\n\n`;
    }
  }

  return out;
}

/**
 * Generate the LaTeX body content from resume data.
 *
 * @param {Object} resume
 * @param {Object} visible
 * @returns {string}
 */
function buildLatexBody(resume, visible) {
  const { profile, settings } = resume;
  const activeSections = visible.order.filter((k) => {
    if (k === 'about') return Boolean(visible.about?.trim());
    return Array.isArray(visible[k]) && visible[k].length > 0;
  });

  const isCompactOrSidebar = settings.theme === 'compact' || settings.theme === 'sidebar';
  const midPoint = Math.ceil(activeSections.length / 2);
  const leftSections = isCompactOrSidebar ? activeSections.slice(0, midPoint) : activeSections;
  const rightSections = isCompactOrSidebar ? activeSections.slice(midPoint) : [];

  let body = '';

  const renderSectionItem = (key) => {
    let s = '';
    const titleText = escapeLatex(settings.sectionTitles?.[key] || key);
    s += `\n\\cvsection{${titleText}}\n`;

    if (key === 'about') {
      s += `\n${markdownToLatex(visible.about)}\\par\\vspace{0.4em}\n`;
    } else if (key === 'education') {
      for (const edu of visible.education || []) {
        const degree = escapeLatex(edu.degree);
        const inst = escapeLatex(edu.institution);
        const year = escapeLatex(edu.year || edu.term || '');
        const details = [];
        if (edu.dissertation) details.push(`Dissertation: “${escapeLatex(edu.dissertation)}”`);
        if (edu.advisor) details.push(`Advisor: ${escapeLatex(edu.advisor)}`);
        if (edu.cgpa) details.push(`CGPA: ${escapeLatex(edu.cgpa)}`);
        const detailStr = escapeLatex(details.join(' · '));
        s += `\\cventry{${year}}{${degree}}{${inst}}{}{}{${detailStr}}{}\n`;
      }
    } else if (key === 'experience') {
      for (const exp of visible.experience || []) {
        const role = escapeLatex(exp.role);
        const org = escapeLatex(exp.organisation || exp.company);
        const term = escapeLatex(exp.term || exp.date || '');
        const loc = escapeLatex(exp.location || '');
        const badge = escapeLatex(exp.badge || '');
        let bullets = '';
        if (exp.bullets && exp.bullets.length) {
          bullets += `  \\begin{itemize}[leftmargin=1.4em,noitemsep,topsep=2pt]\n`;
          for (const b of exp.bullets) {
            bullets += `    \\item ${markdownToLatex(b)}\n`;
          }
          bullets += `  \\end{itemize}`;
        }
        s += `\\cventry{${term}}{${role}}{${org}}{${loc}}{${badge}}{}{\n${bullets}}\n`;
      }
    } else if (key === 'projects') {
      for (const prj of visible.projects || []) {
        const name = escapeLatex(prj.name);
        const role = escapeLatex(prj.role || '');
        const year = escapeLatex(prj.year || prj.term || '');
        const desc = markdownToLatex(prj.description || prj.detail || '');
        const techs = Array.isArray(prj.tech) ? prj.tech.map(escapeLatex).join(', ') : '';
        let bullets = '';
        if (prj.bullets && prj.bullets.length) {
          bullets += `  \\begin{itemize}[leftmargin=1.4em,noitemsep,topsep=2pt]\n`;
          for (const b of prj.bullets) {
            bullets += `    \\item ${markdownToLatex(b)}\n`;
          }
          bullets += `  \\end{itemize}`;
        }
        const detailStr = techs ? `${desc}\\newline{\\footnotesize\\textit{Technologies: ${techs}}}` : desc;
        s += `\\cventry{${year}}{${name}}{${role}}{}{}{${detailStr}}{\n${bullets}}\n`;
      }
    } else if (key === 'publications') {
      let pubIndex = 1;
      for (const pub of visible.publications || []) {
        const title = escapeLatex(pub.title);
        const venue = escapeLatex(pub.venue || '');
        const year = escapeLatex(pub.year || '');
        const authors = Array.isArray(pub.authors)
          ? pub.authors.map((a) => escapeLatex(a.full || `${a.first} ${a.last}`)).join(', ')
          : escapeLatex(pub.authors || '');
        const doi = pub.doi ? `https://doi.org/${pub.doi}` : '';
        s += `\\cvpub{${pubIndex}}{${authors}}{${title}}{${venue}}{${year}}{${doi}}\n`;
        pubIndex += 1;
      }
    } else if (key === 'talks') {
      for (const talk of visible.talks || []) {
        const title = escapeLatex(talk.title);
        const venue = escapeLatex(talk.venue || talk.organisation || '');
        const date = escapeLatex(talk.date || talk.year || '');
        s += `\\cventry{${date}}{\`\`${title}''}{${venue}}{}{}{}{}\n`;
      }
    } else if (key === 'teaching') {
      for (const t of visible.teaching || []) {
        const course = escapeLatex(t.course || t.title);
        const role = escapeLatex(t.role || 'Instructor');
        const inst = escapeLatex(t.institution || '');
        const term = escapeLatex(t.term || '');
        s += `\\cventry{${term}}{${course}}{${role}, ${inst}}{}{}{}{}\n`;
      }
    } else if (key === 'skills') {
      for (const sk of visible.skills || []) {
        const cat = escapeLatex(sk.category || sk.name || 'Skills');
        const items = Array.isArray(sk.items) ? sk.items.map(escapeLatex).join(', ') : escapeLatex(sk.items);
        s += `\\cvskill{${cat}}{${items}}\n`;
      }
    }
    return s;
  };

  body += `\\startcolumns\n`;
  for (const k of leftSections) {
    body += renderSectionItem(k);
  }

  if (isCompactOrSidebar && rightSections.length > 0) {
    body += `\n\\switchcol\n`;
    for (const k of rightSections) {
      body += renderSectionItem(k);
    }
  }
  body += `\n\\stopcolumns\n`;

  return body;
}

/**
 * Generate full, self-contained, compilable LaTeX (.tex) content.
 * All 10 themes are present in the document preamble:
 * - Active theme is UNCOMMENTED.
 * - Other 9 themes are COMMENTED OUT.
 *
 * @param {Object} resume
 * @param {Object} visible
 * @returns {string}
 */
export function generateLatex(resume, visible) {
  const { profile, settings } = resume;
  const activeTheme = settings.theme || 'academic';
  const accent = settings.accent || '#4f46e5';

  const name = escapeLatex(profile.name || 'Your Name');
  const title = escapeLatex(profile.title || '');
  const email = profile.contact?.email || '';
  const phone = escapeLatex(profile.contact?.phone || '');
  const location = escapeLatex(profile.contact?.location || '');
  const links = profile.links || {};
  const monogram = getInitials(profile.name);

  let tex = `% ==============================================================================
% CURRICULUM VITAE / RÉSUMÉ — ${name}
% Generated by Modern Web Resume & CV Builder
% Active Theme: ${activeTheme.toUpperCase()}
% Compatible with: XeLaTeX, LuaLaTeX, or pdfLaTeX (Overleaf, TeXShop, VS Code)
%
% TIP: All 10 themes (Academic, Swish, Marker, Compact, Tech, Sidebar,
%      Timeline, Editorial, Simplistic, Banner) are included below!
%      To switch themes: comment the active theme block and uncomment any other!
% ==============================================================================

\\documentclass[10pt,letterpaper]{article}

% --- Core Packages ---
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[dvipsnames,svgnames]{xcolor}
\\usepackage[hidelinks]{hyperref}
\\usepackage{enumitem}
\\usepackage{tikz}
\\usepackage{tcolorbox}
\\usepackage{paracol}
\\usepackage{microtype}
\\usepackage{fontawesome5}

% --- Document Metadata ---
\\newcommand{\\cvname}{${name}}
\\newcommand{\\cvtitle}{${title}}
\\newcommand{\\cvemail}{${escapeLatex(email)}}
\\newcommand{\\cvphone}{${phone}}
\\newcommand{\\cvlocation}{${location}}
\\newcommand{\\cvwebsite}{${links.website ? links.website : ''}}
\\newcommand{\\cvscholar}{${links.scholar ? links.scholar : ''}}
\\newcommand{\\cvgithub}{${links.github ? links.github : ''}}
\\newcommand{\\cvlinkedin}{${links.linkedin ? links.linkedin : ''}}
\\newcommand{\\cvmonogram}{${monogram}}

${buildAllThemesStyles(activeTheme, accent)}

\\begin{document}
\\pagestyle{empty}

% ---- Masthead Header ----
\\makemasthead

% ---- Dynamic Resume Sections ----
${buildLatexBody(resume, visible)}

\\end{document}
`;

  return tex;
}

/**
 * Generate a modular package containing separate .tex and .sty files.
 *
 * @param {Object} resume
 * @param {Object} visible
 * @returns {{texContent: string, styContent: string, filenameBase: string}}
 */
export function generateLatexPackage(resume, visible) {
  const { profile, settings } = resume;
  const activeTheme = settings.theme || 'academic';
  const accent = settings.accent || '#4f46e5';

  const name = escapeLatex(profile.name || 'Your Name');
  const title = escapeLatex(profile.title || '');
  const email = profile.contact?.email || '';
  const phone = escapeLatex(profile.contact?.phone || '');
  const location = escapeLatex(profile.contact?.location || '');
  const links = profile.links || {};
  const monogram = getInitials(profile.name);

  const filenameBase = (profile.name || 'resume')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const styContent = `% ==============================================================================
% resume-theme.sty — Theme definitions for Curriculum Vitae
% Generated by Modern Web Resume & CV Builder
% Active Theme: ${activeTheme.toUpperCase()}
%
% Switch themes at any time by commenting out the active block and
% uncommenting any of the 10 available themes below!
% ==============================================================================

\\NeedsTeXFormat{LaTeX2e}
\\ProvidesPackage{resume-theme}[2026/09/18 Resume & CV Themes]

% --- Core Packages ---
\\RequirePackage[utf8]{inputenc}
\\RequirePackage[T1]{fontenc}
\\RequirePackage[dvipsnames,svgnames]{xcolor}
\\RequirePackage[hidelinks]{hyperref}
\\RequirePackage{enumitem}
\\RequirePackage{tikz}
\\RequirePackage{tcolorbox}
\\RequirePackage{paracol}
\\RequirePackage{microtype}
\\RequirePackage{fontawesome5}

${buildAllThemesStyles(activeTheme, accent)}
`;

  const texContent = `% ==============================================================================
% CURRICULUM VITAE / RÉSUMÉ — ${name}
% Generated by Modern Web Resume & CV Builder
% Uses style package: resume-theme.sty
% ==============================================================================

\\documentclass[10pt,letterpaper]{article}
\\usepackage{resume-theme}

% --- Document Metadata ---
\\newcommand{\\cvname}{${name}}
\\newcommand{\\cvtitle}{${title}}
\\newcommand{\\cvemail}{${escapeLatex(email)}}
\\newcommand{\\cvphone}{${phone}}
\\newcommand{\\cvlocation}{${location}}
\\newcommand{\\cvwebsite}{${links.website ? links.website : ''}}
\\newcommand{\\cvscholar}{${links.scholar ? links.scholar : ''}}
\\newcommand{\\cvgithub}{${links.github ? links.github : ''}}
\\newcommand{\\cvlinkedin}{${links.linkedin ? links.linkedin : ''}}
\\newcommand{\\cvmonogram}{${monogram}}

\\begin{document}
\\pagestyle{empty}

% ---- Masthead Header ----
\\makemasthead

% ---- Dynamic Resume Sections ----
${buildLatexBody(resume, visible)}

\\end{document}
`;

  return { texContent, styContent, filenameBase };
}
