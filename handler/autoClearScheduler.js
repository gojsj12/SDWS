const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../autoclear-config.json');

function loadConfig() {
    if (fs.existsSync(configPath)) {
        try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { return {}; }
    }
    return {};
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = (client) => {
    // เช็คทุกๆ 1 นาที
    setInterval(async () => {
        const db = loadConfig();
        const now = Date.now();

        for (const channelId in db) {
            const item = db[channelId];
            if (!item || !item.enabled) continue;

            const intervalMs = item.intervalMinutes * 60 * 1000;
            
            // ถึงเวลาลบข้อความแล้วหรือยัง
            if (now - item.lastCleared >= intervalMs) {
                try {
                    const channel = await client.channels.fetch(channelId).catch(() => null);
                    if (channel && channel.isTextBased()) {
                        // ลบข้อความย้อนหลังทีละ 100 ข้อความ
                        let fetched;
                        do {
                            fetched = await channel.messages.fetch({ limit: 100 });
                            if (fetched.size > 0) {
                                await channel.bulkDelete(fetched, true).catch(() => {});
                            }
                        } while (fetched.size >= 100);

                        console.log(`[AutoClear] Cleared messages in channel ${channel.name} (${channel.id})`);
                    }
                } catch (err) {
                    console.error(`[AutoClear Error] Channel ${channelId}:`, err.message);
                }

                // อัปเดตเวลาลบล่าสุด
                db[channelId].lastCleared = Date.now();
                saveConfig(db);
            }
        }
    }, 60000); // 60,000 ms = 1 นาที
};
