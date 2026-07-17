// ─── utils.js ───────────────────────────────────────────────────────────────
// 상태를 갖지 않는 순수 함수 모음. SillyTavern API를 모르는, 그냥 자바스크립트 함수들.

// "5" 또는 "2-8" 형태의 문자열을 인덱스 배열로 변환. 형식이 안 맞으면 null.
export function parseRange(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    const str = String(raw).trim();

    const single = str.match(/^(\d+)$/);
    if (single) return [parseInt(single[1], 10)];

    const range = str.match(/^(\d+)-(\d+)$/);
    if (range) {
        const s = parseInt(range[1], 10), e = parseInt(range[2], 10);
        if (s > e) return null;
        return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    }
    return null;
}

// 줄바꿈 정리 + 앞뒤 공백 제거 (클립보드 복사 / 글자수 세기에 공용으로 사용)
export function stripText(raw) {
    return String(raw ?? '').replace(/\r\n/g, '\n').trim();
}

// 공백포함/공백제외 글자수, 단어수 계산
export function countStats(text) {
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, charsNoSpace, words };
}

// 태그 제거 + 공백 정리 + 길이 제한 (메시지 목록 미리보기용)
export function previewText(raw, maxLen = 40) {
    const stripped = String(raw ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > maxLen ? `${stripped.slice(0, maxLen)}…` : stripped;
}

// ── find/change 검색옵션 엔진 (Slashie utils.js에서 이식) ─────────────────────
// 정규식 특수문자 이스케이프
export function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ignoreSpace: 검색어의 띄어쓰기를 무시하고 글자 사이에 공백이 있든 없든 매치되게 함
export function applyFiller(escaped, ignoreSpace) {
    if (!ignoreSpace) return escaped;
    const stripped = escaped.replace(/ /g, '');
    if (!stripped) return escaped;
    const atoms = [];
    let i = 0;
    while (i < stripped.length) {
        if (stripped[i] === '\\' && i + 1 < stripped.length) { atoms.push(stripped.slice(i, i + 2)); i += 2; }
        else { atoms.push(stripped[i]); i++; }
    }
    return atoms.join('\\s*');
}

// 온전한 단어 일치 — 앞뒤가 글자/숫자/밑줄(한글 포함)이 아닌 경계에서만 매치
// 이 패턴을 쓰려면 정규식에 'u' 플래그가 있어야 함 (buildSearchRegex가 자동으로 붙여줌)
export function applyWholeWord(pattern, wholeWord) {
    if (!wholeWord) return pattern;
    return `(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`;
}

// 태그 무시 — "<"부터 ">"까지를 같은 길이의 더미 문자(\u0000)로 치환.
// 원본 글자 오프셋은 그대로 유지한 채 검색 대상에서만 제외됨.
export function maskTags(text) {
    return text.replace(/<[^>]*>/g, (m) => '\u0000'.repeat(m.length));
}

// 검색어 + 옵션(caseSensitive, ignoreSpace, wholeWord)으로 정규식을 만듦.
// ignoreTags는 정규식이 아니라 "검색 대상 텍스트를 마스킹"하는 방식이라 여기 포함 안 됨 (maskTags 별도 사용)
export function buildSearchRegex(keyword, options = {}) {
    const { caseSensitive = false, ignoreSpace = false, wholeWord = false } = options;
    const escaped = escapeRegex(keyword);
    const pattern = applyWholeWord(applyFiller(escaped, ignoreSpace), wholeWord);
    let flags = caseSensitive ? 'g' : 'gi';
    if (wholeWord) flags += 'u';
    return new RegExp(pattern, flags);
}
