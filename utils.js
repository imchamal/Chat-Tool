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
