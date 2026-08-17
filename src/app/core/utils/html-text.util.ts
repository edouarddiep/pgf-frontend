// Les descriptions sont saisies dans l'éditeur riche : elles arrivent en HTML.
// Partout où elles sont affichées hors `innerHTML` (cellules de tableau,
// infobulles), il faut du texte brut qui conserve les sauts de ligne des blocs.
// Le décodage reste purement statique pour donner le même rendu côté serveur
// (pré-rendu) et côté navigateur.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'',
  laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', deg: '°', euro: '€',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  agrave: 'à', acirc: 'â', ccedil: 'ç', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
  icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', uuml: 'ü', oelig: 'œ'
};

export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const stripped = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return decodeEntities(stripped)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match: string, code: string) => {
    if (!code.startsWith('#')) {
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    }
    const isHex = code[1].toLowerCase() === 'x';
    const codePoint = parseInt(isHex ? code.slice(2) : code.slice(1), isHex ? 16 : 10);
    if (Number.isNaN(codePoint)) {
      return match;
    }
    return String.fromCodePoint(codePoint);
  });
}
