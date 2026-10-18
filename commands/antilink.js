const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ai-config.json');

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antilink')
        .setDescription('ตั้งค่าระบบป้องกันการส่งลิงก์ในเซิร์ฟเวอร์')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('on')
                .setDescription('เปิดใช้งานระบบป้องกันลิงก์')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('ปิดใช้งานระบบป้องกันลิงก์')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('select')
                .setDescription('เปิดเมนูกดเลือกห้องที่ต้องการบล็อกลิงก์')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('ดูสถานะและรายชื่อห้องที่ตั้งค่าบล็อกลิงก์ไว้')
        ),

    async execute(interaction) {
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const hasAdminPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                             interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!isOwner && !hasAdminPerm) {
            return await interaction.reply({ 
                content: '🛑 มึงไม่มีสิทธิ์ใช้คำสั่งนี้เว้ย! ต้องเป็นแอดมินหรือเจ้าของเซิร์ฟเท่านั้น!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const db = loadConfig();
        const guildId = interaction.guild.id;

        if (!db[guildId]) db[guildId] = {};
        if (!db[guildId].antiLink) {
            db[guildId].antiLink = {
                enabled: false,
                channels: []
            };
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'on') {
            db[guildId].antiLink.enabled = true;
            saveConfig(db);
            return await interaction.reply({ content: '✅ เปิดใช้งานระบบป้องกันการส่งลิงก์ในเซิร์ฟเวอร์เรียบร้อย!', flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === 'off') {
            db[guildId].antiLink.enabled = false;
            saveConfig(db);
            return await interaction.reply({ content: '🛑 ปิดใช้งานระบบป้องกันการส่งลิงก์เรียบร้อย!', flags: [MessageFlags.Ephemeral] });
        }

        // 🎛️ ใช้เมนูป๊อปอัปให้เลือกห้องแชท
        if (subcommand === 'select') {
            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('antilink_channel_select')
                .setPlaceholder('เลือกห้องที่ต้องการบล็อกลิงก์ (เลือกได้หลายห้อง)...')
                .setMinValues(1)
                .setMaxValues(5)
                .setChannelTypes(ChannelType.GuildText); // เลือกได้เฉพาะห้องข้อความ

            const row = new ActionRowBuilder().addComponents(channelSelect);

            return await interaction.reply({
                content: '🛡️ กรุณาเลือกห้องแชทที่ต้องการเปิดระบบ **Anti-Link** จากเมนูด้านล่างนี้ครับ:',
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
        }

        if (subcommand === 'list') {
            const channels = db[guildId].antiLink.channels.map(id => `<#${id}>`).join(', ') || 'ยังไม่มีการกำหนดห้อง';
            const status = db[guildId].antiLink.enabled ? '🟢 เปิดใช้งาน' : '🔴 ปิดใช้งาน';
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛡️ สถานะระบบ Anti-Link (ป้องกันลิงก์)')
                .addFields(
                    { name: 'สถานะระบบ', value: status, inline: true },
                    { name: 'ห้องที่บล็อกลิงก์', value: channels, inline: false }
                )
                .setTimestamp();

            return await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },

    // 📥 ฟังก์ชันรับค่าเมื่อแอดมินกดเลือกห้องจากเมนูป๊อปอัป
    async handleInteraction(interaction) {
        if (!interaction.isChannelSelectMenu() || interaction.customId !== 'antilink_channel_select') return false;

        const db = loadConfig();
        const guildId = interaction.guild.id;

        if (!db[guildId]) db[guildId] = {};
        if (!db[guildId].antiLink) {
            db[guildId].antiLink = { enabled: false, channels: [] };
        }

        // ดึงรายชื่อห้องที่ผู้ใช้เลือกจากเมนูป๊อปอัป
        const selectedChannels = interaction.channels.map(c => c.id);
        
        // บันทึกทับหรือรวมห้องที่เลือก
        db[guildId].antiLink.channels = selectedChannels;
        saveConfig(db);

        const channelTags = selectedChannels.map(id => `<#${id}>`).join(', ');

        await interaction.update({
            content: `🔒 ตั้งค่าห้องบล็อกลิงก์สำเร็จเรียบร้อย!\n📌 ห้องที่ถูกเลือก: ${channelTags}`,
            components: []
        });

        return true;
    }
};
