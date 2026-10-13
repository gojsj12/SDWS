const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (สไตล์ค่ายบักก๊อต)
const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png'
};

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoclear')
        .setDescription('ตั้งค่าการลบข้อความอัตโนมัติหรือลบทั้งแชตในห้องที่กำหนด')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('เลือกช่องที่ต้องการให้ทำงาน')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('เลือกโหมดการทำงาน')
                .setRequired(true)
                .addChoices(
                    { name: '🧹 ลบข้อความทั้งหมดในห้องทันที (Purge All)', value: 'purge_now' },
                    { name: '⏱️ ตั้งเวลาลบอัตโนมัติเป็นรอบๆ (Auto Schedule)', value: 'auto_schedule' },
                    { name: '❌ ปิดการตั้งเวลาลบห้องนี้ (Disable)', value: 'disable' }
                ))
        .addIntegerOption(option =>
            option.setName('interval')
                .setDescription('เลือกระยะเวลาลบอัตโนมัติ (เฉพาะโหมด Auto Schedule)')
                .addChoices(
                    { name: '⏱️ ทุกๆ 5 นาที', value: 5 },
                    { name: '⏱️ ทุกๆ 10 นาที', value: 10 },
                    { name: '⏱️ ทุกๆ 30 นาที', value: 30 },
                    { name: '⏱️ ทุกๆ 1 ชั่วโมง', value: 60 }
                ))
        .addBooleanOption(option =>
            option.setName('ignore_bots')
                .setDescription('ยกเว้นข้อความของบอท (ไม่ลบข้อความบอท)? ค่าเริ่มต้น: ไม่ลบข้อความบอท (True)')
                .setRequired(false)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const mode = interaction.options.getString('mode');
        const interval = interaction.options.getInteger('interval');
        // ค่าเริ่มต้น: true (ไม่ลบข้อความของบอท)
        const ignoreBots = interaction.options.getBoolean('ignore_bots') ?? true;

        // ----------------------------------------------------
        // โหมด 1: ลบข้อความทั้งหมดทันที (Purge Now)
        // ----------------------------------------------------
        if (mode === 'purge_now') {
            await interaction.reply({ content: `🧹 กำลังประมวลผลล้างข้อความในห้อง ${channel}...`, ephemeral: true });
            
            try {
                let totalDeleted = 0;
                let fetched;

                do {
                    // ดึงข้อความทีละ 100 ข้อความ
                    fetched = await channel.messages.fetch({ limit: 100 });
                    
                    // กรองข้อความตามเงื่อนไขห้ามลบบอท
                    let messagesToDelete = fetched;
                    if (ignoreBots) {
                        messagesToDelete = fetched.filter(msg => !msg.author.bot);
                    }

                    if (messagesToDelete.size === 0) break;

                    // Discord bulkDelete รองรับเฉพาะข้อความไม่เกิน 14 วัน
                    const deleted = await channel.bulkDelete(messagesToDelete, true);
                    totalDeleted += deleted.size;

                    // ถ้าดึงข้อความมาได้น้อยกว่า 100 แสดงว่าหมดห้องแล้ว
                    if (fetched.size < 100) break;

                } while (fetched.size > 0);

                const embed = new EmbedBuilder()
                    .setColor('#00FF7F')
                    .setAuthor({ name: 'AUTO CLEAR SYSTEM', iconURL: ICONS.SYSTEM })
                    .setTitle('ล้างข้อความเรียบร้อยแล้ว')
                    .setDescription(`ล้างข้อความในห้อง ${channel} เรียบร้อยแล้ว!`)
                    .addFields(
                        { name: 'จำนวนที่ลบได้', value: `${totalDeleted} ข้อความ`, inline: true },
                        { name: 'ป้องกันข้อความบอท', value: ignoreBots ? 'เปิดใช้งาน (เว้นบอท)' : 'ปิดใช้งาน (ลบทั้งหมด)', inline: true }
                    )
                    .setImage(ICONS.BANNER)
                    .setFooter({ text: `${interaction.client.user.username} | Purge System`, iconURL: ICONS.FOOTER })
                    .setTimestamp();

                return await interaction.followUp({ embeds: [embed], ephemeral: true });
            } catch (err) {
                console.error('Error purging channel:', err);
                return await interaction.followUp({ 
                    content: '❌ เกิดข้อผิดพลาดในการลบข้อความ (ข้อความที่เก่ากว่า 14 วันจะไม่สามารถลบแบบกลุ่มได้)', 
                    ephemeral: true 
                });
            }
        }

        // ----------------------------------------------------
        // โหมด 2: ตั้งเวลาลบอัตโนมัติ (Auto Schedule)
        // ----------------------------------------------------
        if (mode === 'auto_schedule') {
            if (!interval) {
                return await interaction.reply({ 
                    content: '⚠️ กรุณาเลือกระยะเวลา (interval) สำหรับโหมดตั้งเวลาลบอัตโนมัติด้วยครับ!', 
                    ephemeral: true 
                });
            }

            const db = loadConfig();
            db[channel.id] = {
                guildId: interaction.guild.id,
                channelId: channel.id,
                intervalMinutes: interval,
                ignoreBots: ignoreBots, // บันทึกสถานะห้ามลบบอท
                lastCleared: Date.now(),
                enabled: true
            };
            saveConfig(db);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ name: 'AUTO CLEAR SYSTEM', iconURL: ICONS.SYSTEM })
                .setTitle('ตั้งค่าลบข้อความอัตโนมัติสำเร็จ')
                .setDescription(`ระบบจะทำการลบข้อความในห้อง ${channel} ทุกๆ **${interval} นาที** เมื่อมีข้อความสะสม`)
                .addFields(
                    { name: 'ระยะเวลาลบ', value: `ทุกๆ ${interval} นาที`, inline: true },
                    { name: 'ป้องกันข้อความบอท', value: ignoreBots ? 'เปิดใช้งาน (ไม่ลบข้อความบอท)' : 'ปิดใช้งาน (ลบข้อความบอทด้วย)', inline: true }
                )
                .setImage(ICONS.BANNER)
                .setFooter({ text: `${interaction.client.user.username} | Scheduler System`, iconURL: ICONS.FOOTER })
                .setTimestamp();

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ----------------------------------------------------
        // โหมด 3: ปิดการทำงาน (Disable)
        // ----------------------------------------------------
        if (mode === 'disable') {
            const db = loadConfig();
            if (db[channel.id]) {
                delete db[channel.id];
                saveConfig(db);
            }

            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: 'AUTO CLEAR SYSTEM', iconURL: ICONS.SYSTEM })
                .setTitle('ยกเลิกการตั้งเวลาสำเร็จ')
                .setDescription(`ยกเลิกการตั้งเวลาลบข้อความอัตโนมัติในห้อง ${channel} เรียบร้อยแล้ว`)
                .setFooter({ text: `${interaction.client.user.username} | System Disabled`, iconURL: ICONS.FOOTER })
                .setTimestamp();

            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
