// Italian texts of the interface. Like the questions, they are written in the
// impersonal form ("Mostrare la risposta"), never addressing students as "tu" or
// "voi".

export const TEXTS = {
  pageTitle: 'Esercizi Prima Prova Fondamenti di Informatica',
  title: 'Esercizi Prima Prova Fondamenti di Informatica',
  intro: [
    'Questa applicazione è utile a esercitarsi in vista della Prima Prova del corso di Fondamenti di Informatica ' +
      'per i CdL in Ingegneria Elettronica e Informatica e Ingegneria Biomedica tenuto dal Prof. Francesco Longo. ' +
      'Le domande sono generate in modo casuale al momento, sugli argomenti del deck di slide n. 2 del modulo A ' +
      '"Rappresentazione digitale dell\'informazione". La risposta corretta viene fornita su richiesta.',
    "Per ogni domanda lo studente può provare a risolvere l'esercizio su carta per poi farsi mostrare la risposta corretta e, " +
      'quando è disponibile, il procedimento.',
  ],
  limitsTitle: 'Cosa non è coperto',
  limits: [
    "La Prima Prova del corso di Fondamenti di Informatica comprende anche un diagramma di flusso da disegnare su carta: l'applicazione non lo copre.",
    'Nella prova le domande sono a risposta multipla, con quattro o più opzioni. Qui non ci sono opzioni: ' +
      'la risposta corretta viene mostrata su richiesta.',
  ],
  categoriesTitle: 'Tipologie di esercizio',

  back: 'Tutte le tipologie',
  newQuestion: 'Nuova domanda',
  showAnswer: 'Mostrare la risposta',
  hideAnswer: 'Nascondere la risposta',
  showProcedure: 'Mostrare il procedimento',
  hideProcedure: 'Nascondere il procedimento',
  codeLabel: 'Codice della domanda',
  codeHelp: 'Il codice permette di ritrovare esattamente la stessa domanda.',

  openCodeTitle: 'Ritrovare una domanda dal codice',
  openCodeLabel: 'Codice',
  openCodeButton: 'Aprire',

  notFound: 'La pagina richiesta non esiste.',
  codeErrors: {
    format: 'Il codice non è scritto in modo valido.',
    seed: 'Il codice non è scritto in modo valido.',
    'unknown-generator': 'Il codice si riferisce a una tipologia di esercizio che non esiste.',
    revision: "Il codice è stato prodotto da un'altra versione dell'applicazione e non può essere riprodotto.",
  },

  // accessible names of the drawings of the workings, by kind
  procedureTitles: {
    'division-table': 'Tabella delle divisioni successive',
    'long-division': 'Schema della divisione',
    'fraction-table': 'Tabella delle moltiplicazioni successive',
    'ieee-steps': 'Passi della conversione IEEE 754',
    'complement-steps': 'Passaggi della codifica di un numero intero',
    'positional-table': 'Calcolo del valore di un numero binario',
    'text-size-steps': 'Calcolo della dimensione di un testo',
    'image-steps': 'Calcolo sulle dimensioni di un\'immagine',
  },
};
