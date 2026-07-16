// ─── commands/find-change.js ────────────────────────────────────────────────
// /find, /change — 검색(하이라이트 + 결과 패널), 찾아바꾸기

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '/scripts/slash-commands/SlashCommandArgument.js';
import { getChat, editMessage, getSettings } from '../state.js';
import { createPanel, getPanelBody, btn } from '../panel-ui.js';
import { highlightKeyword, focusNext, focusPrev, clearHighlights } from '../highlight.js';

export function registerFindChangeCommands() {
    // ─── /find ────────────────────────────────────────────────────────────
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'find',
        helpString: '채팅에서 검색합니다. 사용법: /find 키워드 (다시 /find 만 입력하면 하이라이트 해제)',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '검색어', typeList: [ARGUMENT_TYPE.STRING], isRequired: false }),
        ],
        callback: async (_a, value) => {
            const keyword = String(value ?? '').trim();
            if (!keyword) { clearHighlights(); document.getElementById('ct-find-panel')?.remove(); return ''; }

            const settings = getSettings();
            if (!settings.hlEnabled) { toastr.info('편집모드(/edit-mode)에서 하이라이트가 꺼져있습니다.'); return ''; }

            const count = highlightKeyword(keyword);
            if (!count) { toastr.info('검색 결과가 없습니다.'); return ''; }

            const panel = createPanel('ct-find-panel', `검색 결과: ${count}개`);
            const body = getPanelBody(panel);
            const row = document.createElement('div');
            row.appendChild(btn('◀ 이전', () => focusPrev()));
            row.appendChild(btn('다음 ▶', () => focusNext()));
            row.appendChild(btn('닫기', () => { clearHighlights(); panel.remove(); }));
            body.appendChild(row);
            return '';
        },
    }));

    // ─── /change ──────────────────────────────────────────────────────────
    // 슬래시 커맨드에 공백이 섞인 인자를 넣기 번거로워서(특히 모바일), "/"로 구분하는
    // 방식을 씀: /change 원본텍스트/바꿀텍스트  (원본/바꿀텍스트 자체에 "/"가 들어가면
    // 지원 안 함 — 테스트 버전이라 단순하게)
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'change',
        helpString: '전체 채팅에서 찾아 바꿉니다. 사용법: /change 원본텍스트/바꿀텍스트',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '원본/바꿀텍스트', typeList: [ARGUMENT_TYPE.STRING], isRequired: true }),
        ],
        callback: async (_a, value) => {
            const raw = String(value ?? '');
            const slashIdx = raw.indexOf('/');
            if (slashIdx === -1) { toastr.error('사용법: /change 원본텍스트/바꿀텍스트'); return ''; }
            const find = raw.slice(0, slashIdx);
            const replace = raw.slice(slashIdx + 1);
            if (!find) { toastr.error('원본텍스트가 비어있습니다.'); return ''; }

            const chat = getChat();
            let changedCount = 0;
            for (let idx = 0; idx < chat.length; idx++) {
                const msg = chat[idx];
                if (!msg || !msg.mes.includes(find)) continue;
                await editMessage(idx, msg.mes.split(find).join(replace));
                changedCount++;
            }
            if (changedCount) toastr.success(`${changedCount}개 메시지에서 바꿨습니다.`);
            else toastr.info('일치하는 내용이 없습니다.');
            return '';
        },
    }));
}
