// Italian texts for students. They are written in the impersonal form
// ("Calcolare", "Indicare"), never addressing the student as "tu" or "voi".

export const locale = 'it';

const grouping = new Intl.NumberFormat(locale);

export const formatters = {
  // 16777216 colours are called "16,7 milioni" (24 bit); other counts are plain numbers
  colors: (value) => (Number(value) === 2 ** 24 ? '16,7 milioni di' : grouping.format(value)),
  // decimal comma in decimal numbers given as text with a dot
  decimal: (value) => String(value).replace('.', ','),
};

export const messages = {
  'category.dec-to-bin': 'Conversione da decimale a binario',
  'category.bin-to-dec': 'Conversione da binario a decimale',
  'category.dec-to-hex': 'Conversione da decimale a esadecimale',
  'category.fixed-point': 'Codifica di numeri reali in virgola fissa',
  'category.floating-point': 'Codifica di numeri reali in virgola mobile',
  'category.complements': 'Codifiche di numeri interi',
  'category.binary-division': 'Divisioni binarie',
  'category.ascii-size': 'Codifica ASCII',
  'category.image-size': 'Codifica di immagini',

  'dec-to-bin.prompt':
    'Qual è la codifica binaria del numero decimale {n}? Indicare inoltre quante volte compare la cifra {digit} ' +
    'nella tabella delle divisioni successive (dividendi, quozienti, resti e divisori).',
  'dec-to-bin.answer': 'Codifica binaria: {binary}. La cifra {digit} compare {count} volte.',
  'dec-to-bin.answerOne': 'Codifica binaria: {binary}. La cifra {digit} compare 1 volta.',

  'bin-to-dec.prompt': 'Qual è la rappresentazione decimale del numero binario {bits}?',
  'bin-to-dec.answer': '{value}',

  'dec-to-hex.prompt': 'Qual è la rappresentazione esadecimale del numero decimale {n}?',
  'dec-to-hex.answer': '{hex}',

  'fixed-point.prompt':
    'Qual è la codifica binaria del numero decimale {value:decimal} in rappresentazione a virgola fissa ' +
    'con I={intBits} e D={fracBits}? La parte frazionaria va troncata a D bit.',
  'fixed-point.answer': '{bits} (segno {sign}, parte intera {integer}, parte frazionaria {fraction})',

  'floating-point.prompt':
    'Qual è la codifica binaria del numero decimale {value:decimal} in rappresentazione a virgola mobile ' +
    'IEEE 754 a precisione singola (32 bit)?',
  'floating-point.answer': '{bits} (segno {sign}, esponente {exponent}, mantissa {mantissa})',

  'complements.prompt.ms': 'Qual è la rappresentazione in modulo e segno a {width} bit del numero {n}?',
  'complements.prompt.c1': 'Qual è la rappresentazione in complemento a 1 a {width} bit del numero {n}?',
  'complements.prompt.c2': 'Qual è la rappresentazione in complemento a 2 a {width} bit del numero {n}?',
  'complements.answer': '{bits}',

  'binary-division.prompt':
    'Calcolare il quoziente e il resto della divisione tra i numeri naturali {dividend} e {divisor} ' +
    "in rappresentazione binaria. Indicare inoltre il numero di '1' presenti nello schema di svolgimento: " +
    'dividendo, divisore, quoziente e tutte le righe scritte sotto il dividendo ' +
    '(sottraendi, resti parziali con il bit abbassato e resto finale).',
  'binary-division.answer': "Quoziente: {quotient}; resto: {remainder}; numero di '1': {ones}.",

  'ascii-size.prompt':
    'Un file di testo in codifica ASCII estesa è composto da {pages} pagine, ciascuna di {rows} righe ' +
    'da {chars} caratteri (spazi compresi). Quanti byte occupa il file, trascurando i caratteri di fine riga?',
  'ascii-size.promptOnePage':
    'Un file di testo in codifica ASCII estesa è composto da 1 pagina di {rows} righe da {chars} caratteri ' +
    '(spazi compresi). Quanti byte occupa il file, trascurando i caratteri di fine riga?',
  'ascii-size.answer': '{bytes:int} byte',

  'image-size.kb.prompt':
    "Quanti KB occupa un'immagine non compressa di {width} x {height} pixel a {colors:colors} colori?",
  'image-size.kb.answer': '{kb:int} KB',
  'image-size.side.baseFromHeight':
    "Un'immagine non compressa a {colors:colors} colori occupa {kb:int} KB e ha un'altezza di {height} pixel. " +
    'Da quanti pixel è composta la base?',
  'image-size.side.heightFromBase':
    "Un'immagine non compressa a {colors:colors} colori occupa {kb:int} KB e ha una base di {width} pixel. " +
    "Da quanti pixel è composta l'altezza?",
  'image-size.side.answer': '{pixels:int} pixel',
  'image-size.bits.prompt':
    'Con quanti bit viene codificato il colore di ogni pixel in un\'immagine non compressa di {width} x {height} pixel ' +
    'che occupa {kb:int} KB?',
  'image-size.bits.answer': '{bits} bit',
  'image-size.colors.prompt':
    "Un'immagine non compressa di {width} x {height} pixel occupa {kb:int} KB. " +
    'Approssimativamente, a quanti colori può lavorare (profondità di colore)?',
  'image-size.colors.answer': '{colors:colors} colori ({bits} bit per pixel)',
};
