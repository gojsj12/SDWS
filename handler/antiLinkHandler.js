const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ai-config.json');

// เก็บประวัติการสแปมลิงก์ใน RAM
const linkSpamTracker = new Map();

// Regex ตรวจจับ URL และ Discord Invite Links ทุกรูปแบบ
const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.(gg|io|me|li)\/[^\s]+)/gi;

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

module.exports = async (message) => {
    try {
        const db = loadConfig();
        const guildId = message.guild.id;
        const guildAntiLink = db[guildId]?.antiLink;

        // เช็กว่าเปิดระบบ Anti-Link และห้องนี้ถูกระบุไว้ในรายชื่อห้ามส่งลิงก์หรือไม่
        if (guildAntiLink && guildAntiLink.enabled && guildAntiLink.channels?.includes(message.channel.id)) {
            
            // ข้อยกเว้น: เจ้าของเซิร์ฟ / แอดมิน / คนที่มีสิทธิ์จัดการข้อความ (ManageMessages) ส่งได้ปกติ
            const isOwner = message.guild.ownerId === message.author.id;
            const isBypass = isOwner || 
                             message.member.permissions.has('Administrator') || 
                             message.member.permissions.has('ManageMessages');

            if (!isBypass && linkRegex.test(message.content)) {
                const userId = message.author.id;
                const displayName = message.member?.displayName || message.author.username;
                const now = Date.now();

                // 1. ลบข้อความที่มีลิงก์ออกทันที
                try { await message.delete(); } catch (e) {}

                // 2. ระบบตรวจจับการสแปมลิงก์รัวๆ (3 ครั้งภายใน 10 วินาที ➔ แบนทันที)
                if (!linkSpamTracker.has(userId)) {
                    linkSpamTracker.set(userId, { count: 1, firstTimestamp: now });
                } else {
                    const spamData = linkSpamTracker.get(userId);

                    if (now - spamData.firstTimestamp < 10000) {
                        spamData.count++;
                        
                        if (spamData.count >= 3) {
                            try {
                                await message.guild.members.ban(userId, { reason: 'สแปมลิงก์อัตโนมัติ (Anti-Link Security System)' });
                                linkSpamTracker.delete(userId);
                                await message.channel.send(`🔨 **BAN!** เรียบร้อย ไอ้ <@${userId}> (${displayName}) สแปมลิงก์รัวๆ โดนเตะปลิวออกจากเซิร์ฟไปเลย!`);
                                return true;
                            } catch (banErr) {
                                console.error('⚠️ [Ban Fail]:', banErr.message);
                                await message.channel.send(`⚠️ พยายามแบน <@${userId}> แต่บอทไม่มีสิทธิ์แบนหรือยศบอทต่ำกว่าเป้าหมาย!`);
                                return true;
                            }
                        }
                    } else {
                        spamData.count = 1;
                        spamData.firstTimestamp = now;
                    }
                    linkSpamTracker.set(userId, spamData);
                }

                // 3. ส่งข้อความเตือน (กรณีส่งครั้งแรก/ยังไม่ถึงเกณฑ์แบน)
                const warnMsg = await message.channel.send(`🛑 <@${userId}> **ห้ามส่งลิงก์ในห้องนี้!** (สแปมอีกจะโดนแบนอัตโนมัติ!)`);
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000); // ลบข้อความเตือนอัตโนมัติหลัง 5 วินาที

                return true; // คืนค่า true เพื่อหยุดไม่ให้ข้อความนี้ส่งต่อไปหา AI หรือระบบอื่น
            }
        }
    } catch (err) {
        console.error('⚠️ [AntiLink Handler Error]:', err.message);
    }

    return false; // ถ้าไม่มีลิงก์ หรือไม่อยู่ในเงื่อนไข ให้บอททำงานต่อตามปกติ
};
