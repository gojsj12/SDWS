const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../ai-config.json');

function loadConfig() {
    if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {};
}

function saveConfig(data) {
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
}

const ICONS = {
    AI: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai-setup')
        .setDescription('ตั้งค่าระบบ AI คุยอิสระในห้องแชท (SHGOX ค่าย บักก๊อต)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('status')
                .setDescription('เปิดหรือปิดการใช้งานระบบ AI แชทอิสระ')
                .setRequired(true)
                .addChoices(
                    { name: 'เปิดใช้งาน (Enable)', value: 'on' },
                    { name: 'ปิดใช้งาน (Disable)', value: 'off' }
                )
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกช่องพิมพ์แชทที่ต้องการให้คุยกับ AI ได้ทันทีโดยไม่ต้องใช้คำสั่ง')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),

    async execute(interaction) {
        // 1. ตอบรับล่วงหน้าทันทีเพื่อป้องกัน Timeout (Unknown interaction)
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const status = interaction.options.getString('status');
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        let db = loadConfig();
        if (!db[guildId]) db[guildId] = {};

        db[guildId].status = status;
        if (channel) {
            db[guildId].channelId = channel.id;
        }

        saveConfig(db);

        const embed = new EmbedBuilder()
            .setColor(status === 'on' ? '#2ECC71' : '#ED4245')
            .setAuthor({ name: 'SHGOX AI CONFIGURATION', iconURL: ICONS.AI })
            .setTitle('อัปเดตการตั้งค่าระบบ AI สำเร็จ')
            .setDescription(`สถานะระบบ AI: **${status === 'on' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}**`)
            .addFields(
                { name: 'ห้องแชทที่กำหนด', value: channel ? `<#${channel.id}>` : (db[guildId].channelId ? `<#${db[guildId].channelId}>` : 'ยังไม่ได้ระบุ'), inline: true },
                { name: 'ชื่อบอทและค่าย', value: 'SHGOX ค่าย บักก๊อต', inline: true },
                { name: 'โหมดคำหยาบ', value: 'ตอบห้วน กวนส้นเท้า และพูดคำหยาบได้เต็มที่', inline: false }
            )
            .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
            .setFooter({ text: `${interaction.client.user.username} | Powered by NoTrack API`, iconURL: ICONS.FOOTER })
            .setTimestamp();

        // ใช้ editReply แทน reply เพราะเรา defer ไปแล้ว
        await interaction.editReply({ embeds: [embed] });
    },
};
