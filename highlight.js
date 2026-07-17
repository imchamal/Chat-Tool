// ─── highlight.js ───────────────────────────────────────────────────────────
// /find, /change 결과를 채팅 화면(DOM) 위에 <mark>로 표시.
// 각 mark가 몇 번 메시지(msgIdx)에 속하고, 그 메시지 안에서 몇 번째 일치인지도
// 같이 기억해둠 — /change에서 "지금 보고 있는 이 매치만 실제로 바꾸기"에 사용.
//
// 검색옵션(대소문자 구분/띄어쓰기 무시/온전한 단어/태그 무시)은 Slashie의 정규식
// 엔진을 이식해서 지원함 (utils.js의 buildSearchRegex/maskTags).
// 참고: 지금 화면에 렌더링된 메시지 안에서만 검색됨 (아직 로드 안 된 위쪽 메시지는
// 제외 — 기존과 동일한 단순화 버전 한계).

import { buildSearchRegex, maskTags } from './utils.js';

let marks = [];       // 화면에 표시된 <mark> 엘리먼트들 (등장 순서대로)
let matchMeta = [];   // marks와 같은 순서. { msgIdx, occurrence } (occurrence: 그 메시지 안에서 몇 번째 일치인지, 0부터)
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
    matchMeta = [];
    curIndex = -1;
}

// options: { caseSensitive, ignoreSpace, wholeWord, ignoreTags }
export function highlightKeyword(keyword, options = {}) {
    clearHighlights();
    if (!keyword) return 0;

    document.querySelectorAll('#chat .mes_text').forEach((mesText) => {
        const mesEl = mesText.closest('.mes[mesid]');
        const msgIdx = mesEl ? parseInt(mesEl.getAttribute('mesid'), 10) : -1;
        let occurrence = 0;

        const walker = document.createTreeWalker(mesText, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) textNodes.push(node);

        textNodes.forEach((tn) => {
            const text = tn.textContent;
            const searchText = options.ignoreTags ? maskTags(text) : text;
            const re = buildSearchRegex(keyword, options);

            const found = [];
            let m;
            while ((m = re.exec(searchText)) !== null) {
                if (m.index === re.lastIndex) { re.lastIndex++; continue; } // 빈 매치(예: 옵션 조합으로 생긴) 무한루프 방지
                found.push({ start: m.index, end: m.index + m[0].length });
            }
            if (!found.length) return;

            const frag = document.createDocumentFragment();
            let cursor = 0;
            found.forEach(({ start, end }) => {
                frag.appendChild(document.createTextNode(text.slice(cursor, start)));
                const mark = document.createElement('mark');
                mark.setAttribute('data-ct', '1');
                mark.textContent = text.slice(start, end);
                frag.appendChild(mark);
                marks.push(mark);
                matchMeta.push({ msgIdx, occurrence });
                occurrence++;
                cursor = end;
            });
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
export const getCurrentIndex = () => curIndex;
export const getCurrentMatch = () => matchMeta[curIndex] || null;
