/**
 * Shivkrupa Trading Co. - Cross-Platform Clipboard Service
 * Supports:
 * 1. Modern Async Clipboard API (navigator.clipboard.writeText)
 * 2. Synchronous textarea + document.execCommand('copy') fallback for:
 *    - HTTP or local IP networks (e.g. http://192.168.x.x:5173)
 *    - Non-secure browsing contexts
 *    - Mobile Safari / Android WebViews / Embedded iframe environments
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text && text !== '') return false;

  // 1. Attempt modern navigator.clipboard if available and active
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (apiError) {
      console.warn('navigator.clipboard.writeText was unavailable or rejected, using fallback:', apiError);
    }
  }

  // 2. Fallback: Hidden Textarea with document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    
    // Position fixed off-screen without altering page scroll
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.zIndex = '-9999';

    document.body.appendChild(textArea);
    
    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackError) {
    console.error('Copy to clipboard failed via all methods:', fallbackError);
    return false;
  }
}
