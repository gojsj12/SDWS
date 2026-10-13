const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');
const { rememberFact, getMemoryContext } = require('../services/aiMemory');

// 🔗 ลิงก์ไอคอนรูปภาพแบบ PNG/SVG คลีนๆ สไตล์มินิมอล
const ICONS = {
    VERIFIED: 'https://cdn-icons-png.flaticon.com/512/7542/7542177.png',
    SERVER: 'https://cdn-icons-png.flaticon.com/512/888/888853.png',
    CROWN: 'https://cdn-icons-png.flaticon.com/512/6941/6941892.png',
    USERS: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png'
};

// 🧠 เก็บประวัติแชทส่วนตัว (DM) สำหรับ AI
const dmSessions = new Map();

// 1. ระบบเดิม: ส่งข้อความต้อนรับและแจ้งเตือนเข้า DM Owner เมื่อบอทเข้าเซิร์ฟเวอร์
async function handleGuildCreate(guild, client) {
    try {
        const owner = await guild.fetchOwner();
        
        console.log(`[${new Date().toLocaleTimeString('th-TH')}] 📥 Connected: "${guild.name}" | Members: ${guild.memberCount} \vert{} Owner:${owner.user.tag}`);

        const embedWelcome = new EmbedBuilder()
            .setColor('#2F3136') // สี Dark Theme คลีนๆ แบบ Discord
            .setAuthor({ 
                name: 'SYSTEM CONNECTED', 
                iconURL: ICONS.VERIFIED 
            })
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }) || client.user.displayAvatarURL())
            .setDescription(`สวัสดีครับคุณ **${owner.user.username}** บอทพร้อมใช้งานในเซิร์ฟเวอร์ของคุณแล้วครับ`)
            .addFields(
                { 
                    name: 'OWNER', 
                    value: `\`${owner.user.tag}\``, 
                    inline: true 
                },
                { 
                    name: 'MEMBERS', 
                    value: `\`${guild.memberCount.toLocaleString()}\` คน`, 
                    inline: true 
                },
                { 
                    name: 'COMMANDS', 
                    value: '```/help```', 
                    inline: false 
                }
            )
            .setFooter({ 
                text: `${client.user.username} • Server ID: ${guild.id}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        await owner.send({ embeds: [embedWelcome] });
        console.log(`  └─ ✉️ DM Sent to ${owner.user.tag}`);

    } catch (error) {
        console.error(`  └─ ❌ Error sending DM:`, error.message);
    }
}

// 2. ระบบเพิ่มใหม่: AI ตอบแชทอัตโนมัติเฉพาะในแชทส่วนตัว (DM เท่านั้น)
async function handleDM_AI(message) {
    if (message.author.bot || message.guild) return;

    await message.channel.sendTyping();

    try {
        const userPrompt = message.content.trim();
        const senderName = message.author.username;
        const userId = message.author.id;

        // 🧠 ระบบจำข้อมูล
        if (userPrompt.includes('จำไว้ว่า') || userPrompt.includes('จำนะ')) {
            const learnedInfo = userPrompt.replace(/จำไว้ว่า|จำนะ/g, '').trim();
            if (learnedInfo) {
                rememberFact(`${senderName} บอกว่า: ${learnedInfo}`);
                return await message.reply(`เออ กูจำเรื่อง "${learnedInfo}" ของมึงไว้ละ!`);
            }
        }

        if (!dmSessions.has(userId)) {
            dmSessions.set(userId, {
                sessionUuid: crypto.randomUUID(),
                chatHistory: []
            });
        }

        const userSession = dmSessions.get(userId);
        const currentMemory = getMemoryContext(userPrompt);
        const messagesHistory = [];

        messagesHistory.push({
            role: 'user',
            content: `[System Note: มึงคือ SHGOX บอทเพื่อนซี้สายกวน พูดจาภาษาเพื่อน ใช้ "กู-มึง" วิเคราะห์บทสนทนาแล้วตอบโต้ให้เข้ากับบริบทและคำถามของผู้ใช้แบบธรรมชาติ ไม่ต้องท่องสูตรหรือตอบแข็งกระด้าง]`
        });
        messagesHistory.push({
            role: 'assistant',
            content: 'เออ รู้เรื่อง คุยกันแบบธรรมชาติสไตล์เพื่อนทั่วไปนี่แหละ'
        });

        if (currentMemory && currentMemory !== 'ยังไม่มีความจำพิเศษ') {
            messagesHistory.push({
                role: 'user',
                content: `[ข้อมูลที่จำไว้]: ${currentMemory}`
            });
            messagesHistory.push({
                role: 'assistant',
                content: 'เออ กูจำได้'
            });
        }

        const recentHistory = userSession.chatHistory.slice(-4);
        for (const hist of recentHistory) {
            messagesHistory.push(hist);
        }

        messagesHistory.push({
            role: 'user',
            content: `${senderName}: ${userPrompt}`
        });

        const params = new URLSearchParams();
        params.append('chat_style', 'chat');
        params.append('chatHistory', JSON.stringify(messagesHistory));
        params.append('model', 'standard');
        params.append('session_uuid', userSession.sessionUuid);
        params.append('hacker_is_stinky', 'very_stinky');
        params.append('sensitivity_request_id', crypto.randomUUID());
        params.append('tool_activity_support', '1');
        params.append('thinking_image_tool_support', '1');
        params.append('enabled_tools', JSON.stringify(["image_generator", "image_editor"]));

        const response = await axios({
            method: 'post',
            url: 'https://api.deepai.org/hacking_is_a_serious_crime',
            data: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://deepai.org/',
                'Origin': 'https://deepai.org'
            },
            timeout: 25000
        });

        let finalMessage = '';

        if (typeof response.data === 'string') {
            finalMessage = response.data;
        } else if (typeof response.data === 'object') {
            finalMessage = response.data?.output || response.data?.text || response.data?.response || '';
        }

        finalMessage = finalMessage
            .replace(/\[.*?\]/gs, '')
            .replace(/Standard AI Chat/gi, 'SHGOX')
            .replace(/DeepAI/gi, 'SHGOX')
            .replace(/ผม/g, 'กู')
            .replace(/คุณ/g, 'มึง')
            .replace(/ครับ/g, '')
            .replace(/ค่ะ/g, '')
            .trim();

        if (!finalMessage || finalMessage === '') {
            finalMessage = `ว่าไงนะ ${senderName} เอาใหมดิ๊!`;
        } else {
            userSession.chatHistory.push({ role: 'user', content: `${senderName}: ${userPrompt}` });
            userSession.chatHistory.push({ role: 'assistant', content: finalMessage });

            if (userSession.chatHistory.length > 6) {
                userSession.chatHistory = userSession.chatHistory.slice(-6);
            }
        }

        if (finalMessage.length > 2000) {
            finalMessage = finalMessage.slice(0, 1995) + '...';
        }

        await message.reply(finalMessage);

    } catch (error) {
        console.error('Error DM AI chat:', error.message);
        dmSessions.delete(message.author.id);
        await message.reply('สมองช็อตว่ะเพื่อน ใน DM ถามใหม่อีกรอบดิ!');
    }
}

// ส่งออกฟังก์ชันให้ index.js เรียกใช้งานทั้งสองระบบ
module.exports = handleGuildCreate;
module.exports.handleGuildCreate = handleGuildCreate;
module.exports.handleDM_AI = handleDM_AI;
