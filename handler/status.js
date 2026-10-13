const { ActivityType } = require('discord.js');

module.exports = (client) => {
    // 1. ตั้งค่าสถานะเริ่มต้น (คงสถานะเดิมของคุณไว้ 100%)
    client.user.setActivity({
        name: 'ระบบควบคุมเซิร์ฟเวอร์ | /help',
        type: ActivityType.Streaming,
        url: 'https://www.twitch.tv/discord' // ลิงก์สำหรับโหมด Streaming
    });

    console.log('✨ [STATUS] Bot status has been updated successfully!');

    // 2. ระบบสลับสถานะอัจฉริยะ (รวมทุกสถานะครบถ้วนไม่มีตัดออก วนลูปทุกๆ 10 วินาที)
    let statusIndex = 0;

    setInterval(() => {
        // ดึงสถิติต่างๆ แบบเรียลไทม์
        const serverCount = client.guilds.cache.size;
        const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const ping = client.ws.ping;
        const uptime = process.uptime(); // ระยะเวลาเปิดบอท (วินาที)
        
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        // รวมทุกสถานะทั้งหมดไว้ในนี้ครบถ้วน
        const statuses = [
            {
                // สถานะที่ 1: สถานะหลักของคุณ
                name: 'ระบบควบคุมเซิร์ฟเวอร์ | /help',
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/discord'
            },
            {
                // สถานะที่ 2: แสดงจำนวนเซิร์ฟเวอร์และสมาชิก
                name: `${serverCount} เซิร์ฟเวอร์ | ${memberCount.toLocaleString()} สมาชิก`,
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/discord'
            },
            {
                // สถานะที่ 3: แสดงค่าปิงและเวลาการทำงาน
                name: `ปิง ${ping} ms | ออนไลน์ ${hours} ชม. ${minutes} นาที`,
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/discord'
            },
            {
                // สถานะที่ 4: แนะนำการใช้งานคำสั่ง
                name: 'พิมพ์ /help เพื่อดูคำสั่งทั้งหมด',
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/discord'
            }
        ];

        // วนลูปเปลี่ยนสถานะตามลำดับ
        const currentStatus = statuses[statusIndex];
        client.user.setActivity(currentStatus);

        statusIndex = (statusIndex + 1) % statuses.length;

    }, 10000); // สลับทุกๆ 10 วินาที
};
