const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const levelsPath = path.join(__dirname, '../levels-data.json');
const configPath = path.join(__dirname, '../ai-config.json');

// โหลดข้อมูลเลเวลของผู้ใช้
function loadLevels() {
    if (!fs.existsSync(levelsPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

// บันทึกข้อมูลเลเวล
function saveLevels(data) {
    try {
        fs.writeFileSync(levelsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('⚠️ [Level Save Error]:', e.message);
    }
}

// โหลดการตั้งค่าห้อง
function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

// คูลดาวน์กันปั๊ม XP (60 วินาทีต่อ 1 ครั้ง)
const cooldowns = new Set();

module.exports = {
    async handleMessageXP(message) {
        if (!message.guild || message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        const cooldownKey = `${guildId}-${userId}`;

        if (cooldowns.has(cooldownKey)) return;
        cooldowns.add(cooldownKey);
        setTimeout(() => cooldowns.delete(cooldownKey), 60000);

        const db = loadLevels();
        if (!db[guildId]) db[guildId] = {};
        if (!db[guildId][userId]) {
            db[guildId][userId] = { xp: 0, level: 1 };
        }

        const userObj = db[guildId][userId];
        
        // สุ่ม XP ต่อข้อความ (15 - 25 XP)
        const xpGain = Math.floor(Math.random() * 11) + 15;
        userObj.xp += xpGain;

        const xpNeeded = userObj.level * 150;

        if (userObj.xp >= xpNeeded) {
            userObj.level += 1;
            userObj.xp = 0;

            const configDb = loadConfig();
            const levelChannelId = configDb[guildId]?.levelChannel;

            if (levelChannelId) {
                const channel = await message.guild.channels.fetch(levelChannelId).catch(() => null);
                if (channel) {
                    const levelEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setAuthor({ name: '🌟 LEVEL UP REWARD SYSTEM', iconURL: message.guild.iconURL({ dynamic: true }) || undefined })
                        .setTitle(`🎉 ขอแสดงความยินดีด้วยครับ!`)
                        .setDescription(`> ผู้เล่น <@${userId}> สามารถเก็บสะสม XP จนเลเวลอัปขึ้นไปอีกขั้นแล้ว!`)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 512 }))
                        .addFields(
                            { name: '👤 ผู้ใช้งาน', value: `\`${message.author.tag}\``, inline: true },
                            { name: '🚀 เลเวลปัจจุบัน', value: `\`Level ${userObj.level}\``, inline: true },
                            { name: '✨ สถานะ', value: 'กำลังเติบโตและแอคทีฟในเซิร์ฟเวอร์อย่างต่อเนื่อง!', inline: false }
                        )
                        .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                        .setFooter({ text: 'SHGOX Rank System | ยิ่งพิมพ์เยอะ ยิ่งเลเวลสูง' })
                        .setTimestamp();

                    await channel.send({ content: `🚀 เก่งมากครับ <@${userId}> เลเวลอัปแล้ว!`, embeds: [levelEmbed] });
                }
            }
        }

        saveLevels(db);
    }
};
