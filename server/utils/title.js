const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'how',
  'what',
  'why',
  'when',
  'where',
  'can',
  'could',
  'would',
  'should',
  'please',
  'help',
  'me',
  'my',
  'to',
  'of',
  'for',
  'and',
  'in',
  'on',
  'with',
]);

export function createTitle(text) {
  if (!text || !text.trim()) {
    return 'New Chat';
  }

  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[?!.,;:]+$/g, '')
    .trim();

  /*
   * Remove common question words.
   */

  const words = cleaned
    .split(' ')
    .filter(Boolean);

  let selectedWords =
    words.filter(
      (word) =>
        !STOP_WORDS.has(
          word
            .toLowerCase()
            .replace(
              /[^a-z0-9]/gi,
              ''
            )
        )
    );

  /*
   * If everything was filtered,
   * use the original words.
   */

  if (!selectedWords.length) {
    selectedWords = words;
  }

  /*
   * Keep titles short.
   */

  selectedWords =
    selectedWords.slice(0, 6);

  let title =
    selectedWords.join(' ');

  /*
   * Capitalize first character.
   */

  title =
    title.charAt(0).toUpperCase() +
    title.slice(1);

  /*
   * Keep title reasonably short.
   */

  if (title.length > 55) {
    title =
      title.slice(0, 52) + '...';
  }

  return title || 'New Chat';
}