// Turns messages { id, values } into text with a locale.
//
// A locale is a map from message id to a template. Templates use {name} for a
// value and {name:format} to format it ({{ and }} give literal braces). Formats:
//   int   an integer with the locale's digit grouping (accepts numbers and
//         strings of digits, so big integers survive)
// More formats can be passed in `formatters`.

const TOKEN = /\{\{|\}\}|\{([A-Za-z_][A-Za-z0-9_]*)(?::([A-Za-z]+))?\}/g;

export function createRenderer({ locale = 'en', messages, formatters = {} }) {
  const grouping = new Intl.NumberFormat(locale);
  const formats = {
    int(value) {
      if (typeof value === 'string' && /^-?\d+$/.test(value)) return grouping.format(BigInt(value));
      if (Number.isInteger(value)) return grouping.format(value);
      throw new TypeError(`format "int": not an integer: ${value}`);
    },
    ...formatters,
  };

  function render(message) {
    if (!Object.hasOwn(messages, message.id)) {
      throw new RangeError(`render: no message "${message.id}" in locale "${locale}"`);
    }
    const values = message.values ?? {};
    return messages[message.id].replace(TOKEN, (token, name, format) => {
      if (token === '{{') return '{';
      if (token === '}}') return '}';
      if (!Object.hasOwn(values, name)) {
        throw new RangeError(`render: message "${message.id}" has no value "${name}"`);
      }
      const value = values[name];
      if (format !== undefined) {
        if (!Object.hasOwn(formats, format)) throw new RangeError(`render: unknown format "${format}"`);
        return formats[format](value);
      }
      if (typeof value === 'object' && value !== null) {
        throw new TypeError(`render: value "${name}" is not text; give it a format`);
      }
      return String(value);
    });
  }

  return {
    render,
    /** Prompt and answer of a question, as text. */
    renderQuestion: (question) => ({
      prompt: render(question.prompt),
      answer: render(question.answer),
    }),
  };
}
