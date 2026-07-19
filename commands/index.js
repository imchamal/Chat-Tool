// ─── commands/index.js ──────────────────────────────────────────────────────
// 기능 등록 레지스트리. 새 기능(파일)을 추가할 땐:
//   1) commands/새파일.js 만들고 register 함수 export
//   2) 아래 import 한 줄 + 배열에 한 줄만 추가
// index.js 본체는 건드리지 않아도 됨.

import { registerQuickEdit } from './quick-edit.js';
import { registerScissorButton } from './scissor-button.js';
import { registerStCommand } from './st.js';

const registrars = [
    registerStCommand,             // /st search, /st goto 5 처럼 SlashTavern 명령어 모음
    registerQuickEdit,             // 드래그 후 빠른수정/검색 아이콘
    registerScissorButton,         // 메시지 툴바에 가위 아이콘(삭제) 추가
];

export function registerAllCommands() {
    for (const register of registrars) {
        try {
            register();
        } catch (err) {
            console.error('[ChatTools] 기능 등록 실패:', register.name, err);
        }
    }
}
