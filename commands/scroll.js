// ─── commands/scroll.js ─────────────────────────────────────────────────────
// /up, /down, /goto — 스크롤 이동

import { SlashCommandParser } from '/scripts/slash-commands/SlashCommandParser.js';
import { SlashCommand } from '/scripts/slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '/scripts/slash-commands/SlashCommandArgument.js';

export function registerScrollCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'up',
        helpString: '채팅 맨 위로 스크롤합니다.',
        callback: async () => {
            document.getElementById('chat')?.scrollTo({ top: 0, behavior: 'smooth' });
            return '';
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'down',
        helpString: '채팅 맨 아래로 스크롤합니다.',
        callback: async () => {
            const chatEl = document.getElementById('chat');
            chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
            return '';
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'goto',
        helpString: '메시지 번호로 스크롤합니다. 사용법: /goto 5',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({ description: '메시지 번호', typeList: [ARGUMENT_TYPE.NUMBER], isRequired: true }),
        ],
        callback: async (_a, value) => {
            const idx = parseInt(value, 10);
            if (Number.isNaN(idx)) { toastr.error('사용법: /goto 5'); return ''; }
            const el = document.querySelector(`[mesid="${idx}"]`);
            if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
            else toastr.error(`${idx}번 메시지를 화면에서 찾지 못했습니다. (아직 로드되지 않았을 수 있음 — 위로 스크롤해서 불러온 뒤 다시 시도)`, '', { timeOut: 5000 });
            return '';
        },
    }));
}
