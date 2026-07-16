// ─── highlight.js ───────────────────────────────────────────────────────────
// /find 결과를 채팅 화면(DOM) 위에 <mark>로 표시. 저장되는 데이터는 안 건드리고
// 화면에 보이는 텍스트 노드만 감쌌다 풀었다 함.

let marks = [];
let curIndex = -1;

export function clearHighlights() {
    document.querySelectorAll('#chat .mes_text mark[data-ct]').forEach((mark) => {
        const p = mark.parentNode;
        if (!p) return;
        while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
        p.removeChild(mark);
        p.normalize();
    });
    marks = [];
    curIndex = -1;
}

// 대소문자 무시 단순 일치만 지원 (테스트 버전 — 정규식/옵션 등은 나중에 추가)
export function highlightKeyword(keyword) {
    clearHighlights();
    if (!keyword) return 0;
    const lower = keyword.toLowerCase();

    document.querySelectorAll('#chat .mes_text').forEach((mesText) => {
        const walker = document.createTreeWalker(mesText, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) textNodes.push(node);

        textNodes.forEach((tn) => {
            const text = tn.textContent;
            const lowerText = text.toLowerCase();
            let idx = lowerText.indexOf(lower);
            if (idx === -1) return;

            const frag = document.createDocumentFragment();
            let cursor = 0;
            while (idx !== -1) {
                frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
                const mark = document.createElement('mark');
                mark.setAttribute('data-ct', '1');
                mark.textContent = text.slice(idx, idx + keyword.length);
                frag.appendChild(mark);
                marks.push(mark);
                cursor = idx + keyword.length;
                idx = lowerText.indexOf(lower, cursor);
            }
            frag.appendChild(document.createTextNode(text.slice(cursor)));
            tn.parentNode.replaceChild(frag, tn);
        });
    });

    if (marks.length) focusMark(0);
    return marks.length;
}

export function focusMark(i) {
    if (!marks.length) return;
    marks.forEach((m) => m.classList.remove('ct-cur'));
    curIndex = ((i % marks.length) + marks.length) % marks.length;
    const mark = marks[curIndex];
    mark.classList.add('ct-cur');
    mark.scrollIntoView({ block: 'center' });
}

export const focusNext = () => focusMark(curIndex + 1);
export const focusPrev = () => focusMark(curIndex - 1);
export const getMarkCount = () => marks.length;
