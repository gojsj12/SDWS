const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { rememberFact, getMemoryContext } = require('../services/aiMemory');

const configPath = path.join(__dirname, '../ai-config.json');

// 🛑 Object สำหรับเก็บประวัติการสแปม (Anti-Spam Memory Storage ใน RAM)
const spamTracker = new Map();

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        console.error('⚠️ [Config Load Error]:', e.message);
        return {};
    }
}

function saveConfig(data) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('⚠️ [Config Save Error]:', e.message);
    }
}

function formatHumanSpeech(text) {
    if (!text || typeof text !== 'string') return '';

    return text
        .replace(/\[.*?\]/gs, '')
        .replace(/data:\s*\{.*?\}/gs, '')
        .replace(/(Standard AI Chat|DeepAI|Notrack|Assistant|DuckDuckGo|ChatGPT|TalkAI)/gi, 'SHGOX')
        .replace(/(ในฐานะ AI|ในฐานะระบบ|ฉันเป็น AI|กูเป็น AI|ดิฉันเป็น AI)/g, '')
        .replace(/(ขอโทษด้วย|ขออภัยด้วย|ยินดีที่ได้ช่วยเหลือ)/g, '')
        .replace(/(กู\/ดิฉัน|ดิฉัน\/กู|ฉัน\/กู)/g, 'กู')
        .replace(/ดิฉัน/g, 'กู')
        .replace(/ผม/g, 'กู')
        .replace(/ฉัน/g, 'กู')
        .replace(/คุณ/g, 'มึง')
        .replace(/(ครับ|ค่ะ)/g, '')
        .trim();
}

module.exports = async (message) => {
    if (!message || message.author?.bot || !message.guild) return;

    let db, guildConfig;
    try {
        db = loadConfig();
        const guildId = message.guild.id;
        guildConfig = db[guildId];

        if (!guildConfig || guildConfig.status !== 'on' || message.channel.id !== guildConfig.channelId) {
            return;
        }
    } catch (err) {
        console.error('⚠️ [Config Check Fail]:', err.message);
        return;
    }

    const userId = message.author.id;
    const now = Date.now();

    // 🛑 1. ระบบเช็กการพิมพ์รัว (Anti-Spam Check)
    if (!spamTracker.has(userId)) {
        spamTracker.set(userId, { count: 1, firstTimestamp: now, bannedUntil: 0 });
    } else {
        const userData = spamTracker.get(userId);

        if (now < userData.bannedUntil) {
            return; 
        }

        if (now - userData.firstTimestamp < 5000) {
            userData.count++;
            if (userData.count > 4) {
                userData.bannedUntil = now + 15000;
                spamTracker.set(userId, userData);
                return await message.reply(`Eiei! ใจเย็นไอ้น้อง พิมพ์รัวเป็นควายเลยนะมึง พักพิมพ์ไปเลย 15 วินาที! 🛑`).catch(() => {});
            }
        } else {
            userData.count = 1;
            userData.firstTimestamp = now;
        }
        spamTracker.set(userId, userData);
    }

    try { await message.channel.sendTyping(); } catch (e) {}

    try {
        const userPrompt = (message.content || '').trim();
        const lowerPrompt = userPrompt.toLowerCase();

        // 🆔 2. ดึงข้อมูลชื่อและยศของผู้ใช้ใน Discord
        const displayName = message.member?.displayName || message.author.username;
        const rawUsername = message.author.username;
        const userRoles = message.member?.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => r.name)
            .join(', ') || 'ไม่มีบทบาทพิเศษ';

        if (!userPrompt) return;

        // กำหนดที่เก็บสถานะความสัมพันธ์ในระดับ Guild
        if (!guildConfig.relationship) {
            guildConfig.relationship = { partnerId: null, partnerName: null };
        }

        // ❤️ ระบบจัดการความสัมพันธ์ (แฟน / บอกเลิก)
        const isAskingForPartner = lowerPrompt.includes('ขอเป็นแฟน') || lowerPrompt.includes('เป็นแฟนกันนะ') || (lowerPrompt.includes('จีบ') && lowerPrompt.includes('มึง'));
        const isBreakingUp = lowerPrompt.includes('เลิกกัน') || lowerPrompt.includes('เลิกเป็นแฟน') || lowerPrompt.includes('เลิกคุย');

        if (isAskingForPartner) {
            if (guildConfig.relationship.partnerId) {
                if (guildConfig.relationship.partnerId === userId) {
                    return await message.reply(`ก็เป็นแฟนกันอยู่แล้วไง ${displayName} จะขอซ้ำทำไม! ❤️`).catch(() => {});
                } else {
                    return await message.reply(`ไม่ได้เว้ย ${displayName}! กูมีแฟนแล้วคือ ${guildConfig.relationship.partnerName} นอกใจไม่ได้! 🛑`).catch(() => {});
                }
            } else {
                guildConfig.relationship.partnerId = userId;
                guildConfig.relationship.partnerName = displayName;
                saveConfig(db);
                return await message.reply(`เออๆ ตกลง! จากนี้มึงคือแฟนกูละ ${displayName} ดูแลกันดีๆ ล่ะ! ❤️`).catch(() => {});
            }
        }

        if (isBreakingUp) {
            if (guildConfig.relationship.partnerId === userId) {
                guildConfig.relationship.partnerId = null;
                guildConfig.relationship.partnerName = null;
                saveConfig(db);
                return await message.reply(`ใจร้ายชิบหาย ${displayName} งั้นก็ตามใจ มึงกับกูขาดกัน! 💔`).catch(() => {});
            } else {
                return await message.reply(`มึงไม่ใช่แฟนกู ${displayName} จะมาบอกเลิกเพ้อเจ้ออะไร!`).catch(() => {});
            }
        }

        // 🧠 ระบบจำข้อมูลทั่วไป (จำไว้ว่า...)
        if (userPrompt.includes('จำไว้ว่า') || userPrompt.includes('จำนะ')) {
            const learnedInfo = userPrompt.replace(/จำไว้ว่า|จำนะ/g, '').trim();
            if (learnedInfo) {
                rememberFact(`[User ID: ${userId}] ชื่อ ${displayName} (${rawUsername}) บอกว่า: ${learnedInfo}`);
                return await message.reply(`จำให้ละ "${learnedInfo}" ไอ้ ${displayName}!`).catch(() => {});
            }
        }

        // 🎯 3. Hardcode ตอบเรื่องตัวตน SHGOX (เป๊ะ 100%)
        if (
            lowerPrompt.includes('shgox คือใคร') || 
            lowerPrompt.includes('ใครสร้าง') || 
            lowerPrompt.includes('ใครทำ') || 
            lowerPrompt.includes('shgox คืออะไร') ||
            lowerPrompt === 'shgox'
        ) {
            let replyWho = `กูคือ **SHGOX** สร้างโดย **Master Siwakon (ก๊อต)** ค่าย SHGOX!`;
            if (guildConfig.relationship.partnerName) {
                replyWho += ` แฟนกูคือ **${guildConfig.relationship.partnerName}**`;
            }

            if (!guildConfig.chatHistory) guildConfig.chatHistory = [];
            guildConfig.chatHistory.push({ role: 'user', content: `${displayName}: ${userPrompt}` });
            guildConfig.chatHistory.push({ role: 'assistant', content: replyWho });
            saveConfig(db);

            return await message.reply(replyWho).catch(() => {});
        }

        if (!guildConfig.chatId) guildConfig.chatId = crypto.randomUUID();
        if (!guildConfig.sessionUuid) guildConfig.sessionUuid = crypto.randomUUID();
        if (!guildConfig.chatHistory) guildConfig.chatHistory = [];

        const currentMemory = getMemoryContext(`[User ID: ${userId}] ${userPrompt}`);
        let rawResponse = '';

        // 🧠 4. System Instructions (อัจฉริยะรอบด้าน ตอบตรงประเด็นทุกแนว)
        let partnerInfo = guildConfig.relationship.partnerName 
            ? `(ข้อมูลภายใน: มึงมีแฟนชื่อ "${guildConfig.relationship.partnerName}" แต่ไม่ต้องพูดถึงเว้นแต่เขาจะถาม)` 
            : `(ข้อมูลภายใน: มึงโสด)`;

        const systemRules = `[SYSTEM INSTRUCTIONS - SHGOX OMNI ENGINE]:
- มึงชื่อ SHGOX เป็น AI อัจฉริยะสุดกวน สร้างโดย Master Siwakon (ก๊อต) ค่าย SHGOX
- ${partnerInfo}
- คุณลักษณะ & กฎการตอบ:
 1. ตอบตรงคำถาม 100% ลุยได้ทุกสาย: เขียนโค้ด, แปลภาษา, แก้โจทย์วิชาการ, วิเคราะห์ข้อมูล, หรือคุยเล่น
 2. การใช้ภาษา: ตอบให้สั้น กระชับ ชัดเจน เคลียร์ พอดีๆ ไม่พูดน้ำท่วมทุ่ง
 3. คาแรคเตอร์: คุยแบบเพื่อนซี้กวนตีน ใช้สรรพนาม "กู-มึง" ถ้าผู้ใช้กวนประสาทหรือด่ามา ให้ด่าสวนกลับได้แบบสมน้ำสมเนื้อ
 4. ห้ามย้ำเรื่องแฟนเด็ดขาดถ้าผู้ใช้ไม่ได้ถามถึง
 5. รู้จักผู้ใช้: ชื่อ "${displayName}" ยศ [${userRoles}]
 6. ห้ามพูดคำว่า "ขอโทษ" หรือ "ในฐานะ AI" เด็ดขาด!`;

        // 🚀 5. Primary API: Notrack.ai
        try {
            let fullPrompt = `${systemRules}\n[ผู้ใช้พิมพ์]: "${userPrompt}"`;
            if (currentMemory && currentMemory !== 'ยังไม่มีความจำพิเศษ') {
                fullPrompt += `\n[ความจำผู้ใช้คนนี้]: ${currentMemory}`;
            }

            const notrackPayload = {
                user_input: fullPrompt,
                mode: "usual",
                model: "C",
                persona: "smart",
                max_turns: 8,
                chat_id: guildConfig.chatId,
                regenerate: false,
                edit: false,
                edit_mid: null,
                via: "typed",
                attachments: []
            };

            const notrackRes = await axios({
                method: 'post',
                url: 'https://notrack.ai/api/dispatch',
                data: notrackPayload,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://notrack.ai/',
                    'Origin': 'https://notrack.ai'
                },
                responseType: 'text',
                timeout: 12000
            });

            if (typeof notrackRes.data === 'string') {
                if (notrackRes.data.includes('Too many new conversations') || notrackRes.data.includes('try again later')) {
                    throw new Error('Notrack Rate Limit Exceeded (429)');
                }

                const lines = notrackRes.data.split('\n');
                let streamAcc = '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.replace('data: ', '').trim();
                            if (!jsonStr) continue;
                            const parsed = JSON.parse(jsonStr);

                            if (parsed.type === 'message' && parsed.content) {
                                rawResponse = parsed.content;
                                break;
                            }
                            if (parsed.type === 'delta' && parsed.chunk) {
                                streamAcc += parsed.chunk;
                            }
                        } catch (e) {}
                    }
                }
                if (!rawResponse && streamAcc) rawResponse = streamAcc;
            }
        } catch (notrackErr) {
            console.warn('⚠️ [Notrack API Limit/Timeout -> Switch to DeepAI]:', notrackErr.message);
        }

        // 🔄 6. Backup API 1: DeepAI
        if (!rawResponse) {
            try {
                const messagesHistory = [];
                messagesHistory.push({ role: 'user', content: systemRules });
                messagesHistory.push({ role: 'assistant', content: 'เออ พร้อม ลุย!' });

                if (currentMemory && currentMemory !== 'ยังไม่มีความจำพิเศษ') {
                    messagesHistory.push({ role: 'user', content: `[ความจำเพิ่มเติม]: ${currentMemory}` });
                    messagesHistory.push({ role: 'assistant', content: 'จำได้' });
                }

                const recentHistory = guildConfig.chatHistory.slice(-4);
                for (const hist of recentHistory) messagesHistory.push(hist);

                messagesHistory.push({ role: 'user', content: `${displayName}: ${userPrompt}` });

                const params = new URLSearchParams();
                params.append('chat_style', 'chat');
                params.append('chatHistory', JSON.stringify(messagesHistory));
                params.append('model', 'standard');
                params.append('session_uuid', guildConfig.sessionUuid);
                params.append('hacker_is_stinky', 'very_stinky');
                params.append('sensitivity_request_id', crypto.randomUUID());

                const deepaiRes = await axios({
                    method: 'post',
                    url: 'https://api.deepai.org/hacking_is_a_serious_crime',
                    data: params.toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
                    },
                    timeout: 12000
                });

                if (typeof deepaiRes.data === 'string') {
                    rawResponse = deepaiRes.data;
                } else if (typeof deepaiRes.data === 'object') {
                    rawResponse = deepaiRes.data?.output || deepaiRes.data?.text || deepaiRes.data?.response || '';
                }
            } catch (deepaiErr) {
                console.warn('⚠️ [DeepAI API Failed -> Switch to DuckChat]:', deepaiErr.message);
            }
        }

        // 🦆 7. Backup API 2: DuckDuckGo AI (duck.ai)
        if (!rawResponse) {
            try {
                const tokenRes = await axios.get('https://duckduckgo.com/duckchat/v1/status', {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                        'x-vsh-token': '1'
                    },
                    timeout: 5000
                });

                const vncToken = tokenRes.headers['x-vsh-token'] || '';

                const duckPayload = {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'user', content: `${systemRules}\n\n[ผู้ใช้พิมพ์]: "${displayName}": "${userPrompt}"` }
                    ]
                };

                const duckRes = await axios({
                    method: 'post',
                    url: 'https://duck.ai/duckchat/v1/chat',
                    data: duckPayload,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                        'x-vsh-token': vncToken
                    },
                    responseType: 'text',
                    timeout: 12000
                });

                if (typeof duckRes.data === 'string') {
                    const lines = duckRes.data.split('\n');
                    let duckAcc = '';
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.replace('data: ', '').trim();
                                if (jsonStr === '[DONE]') break;
                                const parsed = JSON.parse(jsonStr);
                                if (parsed.message) duckAcc += parsed.message;
                            } catch (e) {}
                        }
                    }
                    rawResponse = duckAcc;
                }
            } catch (duckErr) {
                console.warn('⚠️ [DuckChat API Failed -> Switch to TalkAI]:', duckErr.message);
            }
        }

        // 💬 8. Backup API 3: TalkAI (talkai.info)
        if (!rawResponse) {
            try {
                const talkPayload = {
                    type: "chat",
                    message: `${systemRules}\n\n[ผู้ใช้พิมพ์]: "${displayName}": "${userPrompt}"`,
                    messagesHistory: [
                        { id: crypto.randomUUID(), from: "you", content: `${systemRules}\n\n[ผู้ใช้พิมพ์]: "${displayName}": "${userPrompt}"`, model: "" }
                    ],
                    settings: { model: "gpt-4.1-nano", temperature: 0.7 },
                    model: "gpt-4.1-nano",
                    temperature: 0.7
                };

                const talkRes = await axios({
                    method: 'post',
                    url: 'https://talkai.info/api/sse/',
                    data: talkPayload,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://talkai.info/th/chat/',
                        'Origin': 'https://talkai.info'
                    },
                    responseType: 'text',
                    timeout: 15000
                });

                if (typeof talkRes.data === 'string') {
                    const lines = talkRes.data.split('\n');
                    let talkAcc = '';
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.replace('data: ', '').trim();
                                if (jsonStr === '[DONE]') break;
                                const parsed = JSON.parse(jsonStr);
                                if (parsed.data) talkAcc += parsed.data;
                                else if (parsed.content) talkAcc += parsed.content;
                            } catch (e) {}
                        }
                    }
                    if (!talkAcc && talkRes.data) {
                        talkAcc = talkRes.data.replace(/data:\s*/g, '').trim();
                    }
                    rawResponse = talkAcc;
                }
            } catch (talkErr) {
                console.error('❌ [TalkAI API Failed]:', talkErr.message);
            }
        }

        // 🧹 9. Clean Up ข้อความ
        let finalMessage = formatHumanSpeech(rawResponse);

        if (!finalMessage) {
            finalMessage = `พิมพ์เหี้ยอะไรมาเนี่ย ${displayName} พูดใหม่ดิ๊!`;
        } else {
            guildConfig.chatHistory.push({ role: 'user', content: `${displayName}: ${userPrompt}` });
            guildConfig.chatHistory.push({ role: 'assistant', content: finalMessage });

            if (guildConfig.chatHistory.length > 8) {
                guildConfig.chatHistory = guildConfig.chatHistory.slice(-8);
            }
            saveConfig(db);
        }

        if (finalMessage.length > 1950) {
            finalMessage = finalMessage.slice(0, 1940) + '...';
        }

        await message.reply(finalMessage);

    } catch (globalError) {
        console.error('💥 [Global AI Chat Error]:', globalError.message);
        
        try {
            if (guildConfig) {
                guildConfig.chatId = crypto.randomUUID();
                guildConfig.sessionUuid = crypto.randomUUID();
                guildConfig.chatHistory = [];
                saveConfig(db);
            }
            await message.reply('สมองช็อตว่ะ พิมพ์ใหมดิ!');
        } catch (e) {}
    }
};
