// ─── state.js ───────────────────────────────────────────────────────────────
// 채팅 데이터 접근 + 설정 저장/로드를 담당하는 공용 모듈.
//
// 설정은 SillyTavern 서버(settings.json)에 저장되는 extensionSettings를 사용함.
// → Termux에 띄운 서버 + 아이폰 클라이언트처럼 여러 기기에서 같은 서버에 접속하면
//   설정값(편집모드 토글 등)이 자동으로 공유됨. (기기별로 따로 기억하고 싶다면
//   localStorage로 바꾸면 되지만, 지금은 서버 공유 방식으로 구성)

export const EXT_ID = 'chatTools';

// ── 채팅 배열 접근 ────────────────────────────────────────────────────────────
export const getChat = () => SillyTavern.getContext().chat;

// 메시지 본문을 바꾸고, 화면(DOM)까지 즉시 다시 그려줌 + 저장 예약
export async function editMessage(idx, newMes) {
    const ctx = SillyTavern.getContext();
    const chat = getChat();
    if (!chat[idx]) return;
    chat[idx].mes = newMes;
    // 스와이프 중인 메시지라면 현재 스와이프 본문도 같이 갱신
    const sid = chat[idx].swipe_id ?? 0;
    if (chat[idx].swipes && sid < chat[idx].swipes.length) chat[idx].swipes[sid] = newMes;

    const el = document.querySelector(`#chat [mesid="${idx}"] .mes_text`);
    if (el && ctx.messageFormatting) {
        el.innerHTML = ctx.messageFormatting(newMes, chat[idx].name, chat[idx].is_system, chat[idx].is_user, idx);
    }
    ctx.saveChatDebounced?.();
}

// ── 서버 공유 설정 ────────────────────────────────────────────────────────────
const DEFAULTS = {
    hlEnabled: true,        // /find 결과 하이라이트 사용 여부
    quickEditEnabled: true, // 드래그 후 뜨는 빠른수정 아이콘 사용 여부
};

// 설정 객체를 반환 (없으면 기본값으로 채워서 생성). 이 객체의 프로퍼티를
// 직접 수정한 뒤 saveSettings()를 호출하면 서버에 저장됨.
export function getSettings() {
    const ctx = SillyTavern.getContext();
    if (!ctx.extensionSettings[EXT_ID]) ctx.extensionSettings[EXT_ID] = {};
    const s = ctx.extensionSettings[EXT_ID];
    // 새 필드가 추가돼도 기존 사용자 설정이 깨지지 않도록, 없는 필드만 기본값으로 채움
    for (const key in DEFAULTS) {
        if (s[key] === undefined) s[key] = DEFAULTS[key];
    }
    return s;
}

export function saveSettings() {
    SillyTavern.getContext().saveSettingsDebounced?.();
}

// ── 클립보드 ──────────────────────────────────────────────────────────────────
export async function copyText(text) {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); ok = true; } catch { /* fallback으로 */ }
    }
    if (!ok) {
        try {
            const ta = Object.assign(document.createElement('textarea'), { value: text });
            ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.focus(); ta.select();
            ok = document.execCommand('copy');
            document.body.removeChild(ta);
        } catch { /* 완전 실패 */ }
    }
    if (ok) toastr.success('클립보드에 복사되었습니다.', '', { timeOut: 2000 });
    else toastr.error('클립보드 접근이 거부되었습니다. (iOS Safari는 https 환경에서만 허용)', '', { timeOut: 4000 });
}
