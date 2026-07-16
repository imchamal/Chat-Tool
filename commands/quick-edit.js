// ─── commands/quick-edit.js ─────────────────────────────────────────────────
// 채팅 메시지에서 텍스트를 드래그(길게 눌러 선택)하면 그 위에 "✏️ 수정" 아이콘이 뜨고,
// 누르면 팝업으로 새 텍스트를 입력받아 그 부분만 바꿔줌.
// 테스트 버전이라 입력은 prompt()를 씀 — 나중에 패널 입력창으로 바꿀 수 있음.
// mouseup/touchend 대신 selectionchange를 써서 마우스·터치 모두 동일하게 동작함
// (아이폰 사파리에서 길게 눌러 드래그 선택하는 것도 selectionchange로 잡힘).

import { getChat, editMessage, getSettings } from '../state.js';

let pillEl = null;
let debounceTimer = null;

function removePill() {
    pillEl?.remove();
    pillEl = null;
}

function showPill(x, y, onClick) {
    removePill();
    pillEl = document.createElement('div');
    pillEl.className = 'ct-pill';
    pillEl.textContent = '✏️ 수정';
    pillEl.style.left = `${x}px`;
    pillEl.style.top = `${y}px`;
    // 패널 안 버튼과 마찬가지로, 아이콘을 누를 때 선택이 풀리며 pointerdown이
    // 바깥 클릭으로 오인되지 않도록 전파를 막음
    pillEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    pillEl.addEventListener('click', () => { onClick(); removePill(); });
    document.body.appendChild(pillEl);
}

function handleSelection() {
    const settings = getSettings();
    if (!settings.quickEditEnabled) { removePill(); return; }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { removePill(); return; }
    const text = sel.toString();
    if (!text.trim()) { removePill(); return; }

    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const startEl = startNode.nodeType === 1 ? startNode : startNode.parentElement;
    const mesEl = startEl?.closest?.('.mes[mesid]');
    if (!mesEl) { removePill(); return; } // 채팅 메시지 바깥 선택은 무시

    const msgIdx = parseInt(mesEl.getAttribute('mesid'), 10);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) { removePill(); return; }

    showPill(rect.left + rect.width / 2, rect.top - 10, async () => {
        const replacement = prompt('바꿀 텍스트를 입력하세요:', text);
        if (replacement === null) return; // 취소
        const chat = getChat();
        const msg = chat[msgIdx];
        if (!msg) return;
        // 렌더링된 화면 텍스트가 아니라 저장된 원본(raw) 텍스트에서 첫 번째로 일치하는
        // 위치를 찾아서 바꿈. 마크다운 서식(*, ** 등)이 섞여있으면 정확히 못 찾을 수 있음
        // — 테스트 버전의 알려진 한계.
        const idx = msg.mes.indexOf(text);
        if (idx === -1) {
            toastr.error('원문에서 선택한 텍스트를 정확히 찾지 못했습니다. (서식 문자 때문일 수 있음)', '', { timeOut: 4000 });
            return;
        }
        const newMes = msg.mes.slice(0, idx) + replacement + msg.mes.slice(idx + text.length);
        await editMessage(msgIdx, newMes);
        toastr.success('수정되었습니다.', '', { timeOut: 2000 });
    });
}

export function registerQuickEdit() {
    document.addEventListener('selectionchange', () => {
        // selectionchange는 매우 자주 발생하므로 살짝 디바운스
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSelection, 150);
    });
    // 아이콘 바깥을 누르면 아이콘 닫기
    document.addEventListener('pointerdown', (e) => {
        if (pillEl && !pillEl.contains(e.target)) removePill();
    });
}
