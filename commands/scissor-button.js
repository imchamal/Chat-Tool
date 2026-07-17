// ─── commands/scissor-button.js ─────────────────────────────────────────────
// 실리태번이 메시지마다 기본으로 제공하는 툴바(연필/삭제 아이콘 있는 줄, .mes_buttons)에
// 가위 아이콘을 하나 추가함. 누르면 확인창 후 그 메시지 하나만 삭제(/cut).

const BTN_CLASS = 'ct-cut-btn';

async function cutMessage(idx) {
    const confirmed = confirm(`#${idx} 메시지를 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`);
    if (!confirmed) return;
    const ctx = SillyTavern.getContext();
    if (typeof ctx.executeSlashCommandsWithOptions !== 'function') {
        toastr.error('이 기능은 SillyTavern 최신 버전에서만 사용할 수 있습니다.', '', { timeOut: 4000 });
        return;
    }
    await ctx.executeSlashCommandsWithOptions(`/cut ${idx}`, { showOutput: false });
}

// 메시지 요소 하나에 가위 아이콘이 아직 없으면 추가
function addButtonTo(mesEl) {
    const buttons = mesEl.querySelector('.mes_buttons');
    if (!buttons || buttons.querySelector(`.${BTN_CLASS}`)) return;

    const cutBtn = document.createElement('div');
    cutBtn.className = `mes_button ${BTN_CLASS} fa-solid fa-scissors interactable`;
    cutBtn.title = '메시지 삭제';
    cutBtn.tabIndex = 0;
    cutBtn.addEventListener('click', () => {
        const idx = parseInt(mesEl.getAttribute('mesid'), 10);
        if (!Number.isNaN(idx)) cutMessage(idx);
    });
    buttons.appendChild(cutBtn);
}

function addButtonsToAll() {
    document.querySelectorAll('#chat .mes[mesid]').forEach(addButtonTo);
}

export function registerScissorButton() {
    addButtonsToAll();

    const chatEl = document.getElementById('chat');
    if (!chatEl) return;

    // 메시지가 새로 그려지거나(스와이프/생성/불러오기 등) 다시 렌더링될 때마다
    // 가위 아이콘이 빠져있으면 다시 채워넣음. 자주 바뀔 수 있어서 살짝 debounce.
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(addButtonsToAll, 150);
    });
    observer.observe(chatEl, { childList: true, subtree: true });
}
