const BLOCK_TAGS = new Set(['P', 'LI', 'BLOCKQUOTE', 'TD', 'TH', 'DD', 'DT']);

function findBlockParent(startNode) {
  let node = startNode.parentElement;
  while (node && node !== document.body) {
    if (BLOCK_TAGS.has(node.tagName)) return node;
    node = node.parentElement;
  }
  return startNode.parentElement;
}

function _sentenceContaining(fullText, searchText) {
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
  const sentence = sentences.find(s => s.includes(searchText));
  if (sentence) {
    return sentence.trim().replace(searchText, `**${searchText}**`);
  }
  return fullText.slice(0, 100);
}

// Mode A: extractContext(span, null)  — for CEFR-highlighted words
// Mode B: extractContext(null, selectedText) — for manual selection lookups
function extractContext(span, selectedText) {
  if (span) {
    const word = span.dataset.word || span.textContent.trim();
    const block = findBlockParent(span);
    const fullText = block ? block.textContent : '';
    return { sentence: _sentenceContaining(fullText, word), word };
  }

  // Mode B — walk up from the selection's text node
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { sentence: '', word: selectedText };
  }
  const range = selection.getRangeAt(0);
  const textNode = range.startContainer;
  const block = findBlockParent(textNode);
  const fullText = block ? block.textContent : '';
  return { sentence: _sentenceContaining(fullText, selectedText), word: selectedText };
}
