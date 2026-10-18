const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ChannelSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ai-config.json');

const ADMIN_ID = '1143741885098250281';

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
        .setName('applysetup')
        .setDescription('ตั้งค่าและจัดการระบบสัมภาษณ์ผู้สมัครทีมงาน')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('ส่งพาเนลปุ่มกดเริ่มสมัครงานเข้าสู่ห้องปัจจุบัน')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('log')
                .setDescription('ตั้งค่าห้องแชทสำหรับรับรายงานผลการสัมภาษณ์หลังบ้าน')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dmchannels')
                .setDescription('ตั้งค่าห้องสำหรับรับข้อความที่ผู้ใช้พิมพ์คุยส่วนตัว (DM) กับบอท (เฉพาะแอดมิน)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('ดึงรายการและประวัติคำตอบของผู้สมัครทั้งหมดที่ค้างอยู่ (เฉพาะแอดมินหลัก)')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const db = loadConfig();

        if (!db[guildId]) db[guildId] = {};

        if (subcommand === 'panel') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const panelEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: 'SHGOX RECRUITMENT CENTER', iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined })
                .setTitle('🎙️ สมัครเข้าร่วมเป็นทีมงานกับเรา')
                .setDescription('> ยินดีต้อนรับผู้เล่นและผู้สนใจทุกท่านเข้าสู่ระบบสมัครทีมงานอัตโนมัติของเซิร์ฟเวอร์เรา!\n\n**📋 ขั้นตอนการสมัคร:**\n1. กดปุ่ม **"เริ่มทำแบบสัมภาษณ์"** ด้านล่าง\n2. ระบบจะส่งคำถาม 10 ข้อไปที่คุณทางข้อความส่วนตัว (DM)\n3. ตอบคำถามทีละข้อตามความเป็นจริง (แนบลิงก์รูป/วิดีโอผลงานได้)\n4. เมื่อครบถ้วน ระบบจะส่งข้อมูลให้แอดมินพิจารณาโดยอัตโนมัติ')
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ text: 'SHGOX Official System • สมัครได้ตลอด 24 ชั่วโมง' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_apply_btn')
                    .setLabel('🎙️ เริ่มทำแบบสัมภาษณ์')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨')
            );

            await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
            return await interaction.editReply({ content: '✅ ส่งพาเนลระบบสมัครงานไปยังห้องนี้เรียบร้อยแล้วครับ!' });
        }

        if (subcommand === 'log') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('apply_log_select')
                .setPlaceholder('เลือกห้องแชตสำหรับรับรายงานผลสัมภาษณ์...')
                .setMinValues(1)
                .setMaxValues(1)
                .setChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(channelSelect);

            return await interaction.editReply({
                content: '🎙️ กรุณาเลือกห้องแชตที่ต้องการให้บอทส่งผลการสัมภาษณ์ 10 ข้อของผู้สมัครเข้ามา:',
                components: [row]
            });
        }

        if (subcommand === 'dmchannels') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const channelSelect = new ChannelSelectMenuBuilder()
                .setCustomId('apply_dm_forward_select')
                .setPlaceholder('เลือกห้องสำหรับส่งข้อความที่ผู้ใช้พิมพ์ใน DM...')
                .setMinValues(1)
                .setMaxValues(1)
                .setChannelTypes(ChannelType.GuildText);

            const row = new ActionRowBuilder().addComponents(channelSelect);

            return await interaction.editReply({
                content: '📩 **ตั้งค่าห้องรับข้อความ DM:** กรุณาเลือกห้องแชตในเซิร์ฟเวอร์ที่ต้องการให้บอทส่งข้อความที่ผู้ใช้พิมพ์คุยส่วนตัว (DM) เข้ามา:',
                components: [row]
            });
        }

        if (subcommand === 'list') {
            if (interaction.user.id !== ADMIN_ID) {
                return await interaction.reply({
                    content: '❌ **คำสั่งนี้จำกัดสิทธิ์ให้เฉพาะแอดมินหลักของบอทใช้งานเท่านั้น!**',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const applyHandler = require('../handler/applyHandler');
            const allSessions = typeof applyHandler.getAllSessions === 'function' ? applyHandler.getAllSessions() : new Map();

            if (!allSessions || allSessions.size === 0) {
                return await interaction.editReply({
                    content: 'ℹ️ **ขณะนี้ไม่มีผู้สมัครที่กำลังทำแบบสอบถามสัมภาษณ์ค้างอยู่ในระบบครับ**'
                });
            }

            const embeds = [];
            const rows = [];

            for (const [userId, sessionData] of allSessions.entries()) {
                const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
                const userName = targetUser ? targetUser.tag : `User ID: ${userId}`;
                const statusText = sessionData.status === 'closed' ? '🔴 ปิดชั่วคราว (ห้ามทำต่อ)' : '🟢 กำลังดำเนินการ (Active)';

                const sessionEmbed = new EmbedBuilder()
                    .setColor(sessionData.status === 'closed' ? '#ED4245' : '#38BDF8')
                    .setAuthor({ name: '🛠️ SESSION MANAGEMENT', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTitle(`📌 ผู้สมัคร: ${userName}`)
                    .setThumbnail(targetUser ? targetUser.displayAvatarURL({ dynamic: true }) : null)
                    .setDescription(`👤 **ผู้ใช้:** <@${userId}>\n🆔 **User ID:** \`${userId}\`\n📌 **สถานะเซสชัน:** \`${statusText}\`\n📊 **ความคืบหน้า:** \`ตอบไปแล้ว ${sessionData.answers.length} / 10 ข้อ\`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**📝 ประวัติคำตอบที่เคยตอบไว้:**`);

                if (sessionData.answers && sessionData.answers.length > 0) {
                    sessionData.answers.forEach((item, idx) => {
                        sessionEmbed.addFields({
                            name: `ข้อที่ ${idx + 1}: ${item.question.split('. ')[1] || item.question}`,
                            value: item.answer.length > 500 ? item.answer.slice(0, 497) + '...' : item.answer,
                            inline: false
                        });
                    });
                } else {
                    sessionEmbed.addFields({
                        name: '⚠️ สถานะคำตอบ',
                        value: '`กำลังอยู่ที่ข้อ 1 (ยังไม่ได้กดส่งคำตอบข้อแรก)`',
                        inline: false
                    });
                }

                sessionEmbed.setFooter({ text: 'SHGOX Recruitment System' }).setTimestamp();
                embeds.push(sessionEmbed);

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`apply_extend_${userId}`)
                        .setLabel('⏳ เพิ่มเวลา / เปิดใช้งานต่อ')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`apply_reset_${userId}`)
                        .setLabel('🔄 คืนค่าเซสชัน')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`apply_close_${userId}`)
                        .setLabel('⛔ ปิดการสัมภาษณ์')
                        .setStyle(ButtonStyle.Danger)
                );

                rows.push(controlRow);
            }

            return await interaction.editReply({ embeds: embeds, components: rows });
        }
    },

    async handleInteraction(interaction) {
        if (interaction.isChannelSelectMenu() && interaction.customId === 'apply_log_select') {
            const db = loadConfig();
            const guildId = interaction.guild.id;

            if (!db[guildId]) db[guildId] = {};
            const selectedChannelId = interaction.channels.first().id;

            db[guildId].interviewLogChannel = selectedChannelId;
            saveConfig(db);

            await interaction.update({
                content: `✅ ตั้งค่าห้องรับผลสัมภาษณ์หลังบ้านเรียบร้อย! บอทจะส่งรายงานไปที่ห้อง <#${selectedChannelId}>`,
                components: []
            });

            return true;
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'apply_dm_forward_select') {
            const db = loadConfig();
            const guildId = interaction.guild.id;

            if (!db[guildId]) db[guildId] = {};
            const selectedChannelId = interaction.channels.first().id;

            db[guildId].dmForwardChannel = selectedChannelId;
            saveConfig(db);

            await interaction.update({
                content: `✅ **ตั้งค่าห้องรับข้อความ DM สำเร็จ!** ข้อความที่ผู้ใช้พิมพ์คุยกับบอทในส่วนตัวจะถูกส่งเข้ามาที่ห้อง <#${selectedChannelId}> นี้`,
                components: []
            });

            return true;
        }

        if (interaction.isButton()) {
            const applyHandler = require('../handler/applyHandler');

            if (interaction.customId.startsWith('apply_extend_')) {
                if (interaction.user.id !== ADMIN_ID) {
                    return await interaction.reply({ content: '❌ คุณไม่มีสิทธิ์กดปุ่มนี้', flags: [MessageFlags.Ephemeral] });
                }

                await interaction.deferUpdate().catch(() => {});
                const targetUserId = interaction.customId.replace('apply_extend_', '');
                
                if (typeof applyHandler.extendUserSession === 'function') {
                    applyHandler.extendUserSession(targetUserId);
                }

                try {
                    const targetUser = await interaction.client.users.fetch(targetUserId);
                    if (targetUser) {
                        await targetUser.send({
                            content: '🎉 **แจ้งเตือนจากแอดมิน:** เซสชันการทำแบบสอบถามสัมภาษณ์ของคุณถูก **เปิดใช้งาน / เพิ่มเวลา** เรียบร้อยแล้ว! คุณสามารถกลับเข้าไปทำต่อได้เลยครับ ✨'
                        }).catch(() => {});
                    }
                } catch (e) {}

                await interaction.editReply({
                    content: `⏳ **เปิดใช้งานเซสชันสำเร็จ!** ส่งข้อความแจ้งเตือนไปหา <@${targetUserId}> เรียบร้อย สามารถกลับมาทำต่อได้เลย`,
                    embeds: [],
                    components: []
                });
                return true;
            }

            if (interaction.customId.startsWith('apply_reset_')) {
                if (interaction.user.id !== ADMIN_ID) {
                    return await interaction.reply({ content: '❌ คุณไม่มีสิทธิ์กดปุ่มนี้', flags: [MessageFlags.Ephemeral] });
                }

                await interaction.deferUpdate().catch(() => {});
                const targetUserId = interaction.customId.replace('apply_reset_', '');

                if (typeof applyHandler.resetUserSession === 'function') {
                    applyHandler.resetUserSession(targetUserId);
                }

                await interaction.editReply({
                    content: `🔄 **คืนค่าเซสชันสำเร็จ!** ล้างคำตอบเก่าของ <@${targetUserId}> เรียบร้อย สามารถเริ่มทำใหม่ได้ทันที`,
                    embeds: [],
                    components: []
                });
                return true;
            }

            if (interaction.customId.startsWith('apply_close_')) {
                if (interaction.user.id !== ADMIN_ID) {
                    return await interaction.reply({ content: '❌ คุณไม่มีสิทธิ์กดปุ่มนี้', flags: [MessageFlags.Ephemeral] });
                }

                await interaction.deferUpdate().catch(() => {});
                const targetUserId = interaction.customId.replace('apply_close_', '');

                if (typeof applyHandler.closeUserSession === 'function') {
                    applyHandler.closeUserSession(targetUserId);
                }

                try {
                    const targetUser = await interaction.client.users.fetch(targetUserId);
                    if (targetUser) {
                        await targetUser.send({
                            content: '⚠️ **แจ้งเตือนจากแอดมิน:** เซสชันการทำแบบสอบถามสัมภาษณ์ของคุณถูกปิดการใช้งานชั่วคราว ข้อมูลของคุณยังถูกเก็บบันทึกไว้ แต่จะไม่สามารถทำต่อได้ในขณะนี้ กรุณาติดต่อแอดมินหากมีข้อสงสัยครับ'
                        }).catch(() => {});
                    }
                } catch (e) {}

                await interaction.editReply({
                    content: `⛔ **ปิดการสัมภาษณ์เรียบร้อย!** ส่งข้อความแจ้งเตือนไปหา <@${targetUserId}> แล้ว (ข้อมูลยังอยู่แต่ถูกระงับการทำต่อ)`,
                    embeds: [],
                    components: []
                });
                return true;
            }
        }

        return false;
    }
};
