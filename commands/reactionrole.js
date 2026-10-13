const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (สไตล์ SHGOX ค่ายบักก๊อต)
const ICONS = {
    SYSTEM: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png',
    BANNER: 'https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png'
};

// 🗄️ ตัวแปรชั่วคราวสำหรับเก็บข้อมูลพรีวิว (Cache)
const roleCache = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('สร้างระบบปุ่มกดรับยศอัตโนมัติในห้องที่กำหนด (สำหรับแอดมิน)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('เลือกห้องที่ต้องการส่งปุ่มกดรับยศไปแสดง')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('เลือกยศ (Role) ที่ต้องการให้ผู้ใช้ได้รับเมื่อกดปุ่ม')
                .setRequired(true)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const targetRole = interaction.options.getRole('role');

        // 📝 สร้าง Modal ฟอร์มให้ตั้งค่าหัวข้อ ข้อความ และอีโมจิปุ่ม (Label ความยาวไม่เกิน 45 ตัวอักษร)
        const modal = new ModalBuilder()
            .setCustomId(`role_modal_${interaction.user.id}_${channel.id}_${targetRole.id}`)
            .setTitle('✨ ตั้งค่าปุ่มกดรับยศอัตโนมัติ');

        const titleInput = new TextInputBuilder()
            .setCustomId('role_title')
            .setLabel('หัวข้อประกาศ (Embed Title)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('👑 ระบบกดรับยศอัตโนมัติ / Verification 🎮')
            .setRequired(true)
            .setMaxLength(100);

        const descInput = new TextInputBuilder()
            .setCustomId('role_desc')
            .setLabel('รายละเอียดประกาศ (รองรับอีโมจิ)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('📌 กดปุ่มด้านล่างเพื่อรับยศเข้าสู่ห้องพูดคุยได้ทันที!')
            .setRequired(true)
            .setMaxLength(1000);

        const btnLabelInput = new TextInputBuilder()
            .setCustomId('role_btn_label')
            .setLabel('ชื่อปุ่มกดรับยศ')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('รับยศสมาชิก / Verify')
            .setRequired(true)
            .setMaxLength(50);

        const btnEmojiInput = new TextInputBuilder()
            .setCustomId('role_btn_emoji')
            .setLabel('อีโมจิปุ่ม (เช่น <a:k_:15360763...>)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('<a:k_:1536076347292651570> หรือไอคอนทั่วไป')
            .setRequired(false)
            .setMaxLength(100);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(btnLabelInput),
            new ActionRowBuilder().addComponents(btnEmojiInput)
        );

        await interaction.showModal(modal);
    },

    // 🔄 ฟังก์ชันจัดการ Interaction (Modal Submit, Preview Buttons และ Role Click Buttons)
    async handleInteraction(interaction) {
        // 1. จัดการข้อมูลจาก Modal เมื่อแอดมินกดส่งฟอร์ม
        if (interaction.isModalSubmit() && interaction.customId.startsWith('role_modal_')) {
            const parts = interaction.customId.split('_');
            const adminId = parts[2];
            const channelId = parts[3];
            const roleId = parts[4];

            if (interaction.user.id !== adminId) {
                return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์จัดการฟอร์มนี้', flags: [MessageFlags.Ephemeral] });
            }

            const title = interaction.fields.getTextInputValue('role_title');
            const desc = interaction.fields.getTextInputValue('role_desc');
            const btnLabel = interaction.fields.getTextInputValue('role_btn_label');
            const btnEmoji = interaction.fields.getTextInputValue('role_btn_emoji') || null;

            // 🔑 บันทึกข้อมูลลง Cache ชั่วคราว
            const cacheKey = `rr_${interaction.user.id}_${Date.now()}`;
            roleCache.set(cacheKey, {
                channelId,
                roleId,
                title,
                desc,
                btnLabel,
                btnEmoji
            });

            setTimeout(() => roleCache.delete(cacheKey), 10 * 60 * 1000);

            // 🔍 สร้าง Embed พรีวิวให้แอดมินดูก่อนส่งจริง
            const previewEmbed = new EmbedBuilder()
                .setColor('#38bdf8')
                .setAuthor({ name: '✨ REACTION ROLE PREVIEW', iconURL: ICONS.SYSTEM })
                .setTitle(title)
                .setDescription(desc)
                .addFields(
                    { name: '📌 ห้องปลายทาง', value: `<#${channelId}>`, inline: false },
                    { name: '🛡️ ยศที่จะได้รับ', value: `<@&${roleId}> (\`${roleId}\`)`, inline: false },
                    { name: '🔘 ปุ่มที่จะแสดง', value: `${btnEmoji ? btnEmoji + ' ' : ''}**${btnLabel}**`, inline: false }
                )
                .setImage(ICONS.BANNER)
                .setFooter({ text: `${interaction.client.user.username} | ตรวจสอบความถูกต้องก่อนกดยืนยัน`, iconURL: ICONS.FOOTER })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_send_${cacheKey}`)
                    .setLabel('🚀 ยืนยันและส่งปุ่มรับยศจริง')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rr_cancel')
                    .setLabel('❌ ยกเลิก')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                embeds: [previewEmbed],
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
            return true;
        }

        // 2. จัดการปุ่มพรีวิว (ยืนยันส่ง / ยกเลิก)
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('rr_send_')) {
                const cacheKey = interaction.customId.replace('rr_send_', '');
                const data = roleCache.get(cacheKey);

                if (!data) {
                    return interaction.update({
                        content: '⏱️ ข้อมูลหมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง',
                        embeds: [],
                        components: []
                    });
                }

                const { channelId, roleId, title, desc, btnLabel, btnEmoji } = data;
                const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

                if (!channel || !channel.isTextBased()) {
                    return interaction.update({
                        content: '❌ ไม่พบห้องแชทเป้าหมายในเซิร์ฟเวอร์นี้',
                        embeds: [],
                        components: []
                    });
                }

                try {
                    // 📢 สร้าง Embed และ ปุ่มจริงที่จะส่งลงห้อง
                    const finalEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: '✨ OFFICIAL REACTION ROLE', iconURL: ICONS.SYSTEM })
                        .setTitle(title)
                        .setDescription(desc)
                        .setImage(ICONS.BANNER)
                        .setFooter({ text: `${interaction.client.user.username} | Role Verification System`, iconURL: ICONS.FOOTER })
                        .setTimestamp();

                    // สร้าง Custom ID สำหรับปุ่มรับยศจริง รูปแบบ: rr_toggle_RoleID
                    const actionButton = new ButtonBuilder()
                        .setCustomId(`rr_toggle_${roleId}`)
                        .setLabel(btnLabel)
                        .setStyle(ButtonStyle.Primary);

                    if (btnEmoji) {
                        try {
                            actionButton.setEmoji(btnEmoji);
                        } catch (e) {
                            console.error('Invalid emoji format provided:', e);
                        }
                    }

                    const buttonRow = new ActionRowBuilder().addComponents(actionButton);

                    // ส่งข้อความจริงลงห้องที่เลือก
                    await channel.send({
                        embeds: [finalEmbed],
                        components: [buttonRow]
                    });

                    roleCache.delete(cacheKey);

                    await interaction.update({
                        content: `✅ **ส่งระบบปุ่มกดรับยศไปยังห้อง <#${channelId}> เรียบร้อยแล้ว!**`,
                        embeds: [],
                        components: []
                    });
                } catch (error) {
                    console.error('Error sending reaction role message:', error);
                    await interaction.update({
                        content: '❌ เกิดข้อผิดพลาดในการส่งข้อความ (กรุณาตรวจสอบสิทธิ์การส่งข้อความของบอท)',
                        embeds: [],
                        components: []
                    });
                }
                return true;
            }

            if (interaction.customId === 'rr_cancel') {
                await interaction.update({
                    content: '❌ **ยกเลิกการสร้างระบบปุ่มกดรับยศเรียบร้อยแล้ว**',
                    embeds: [],
                    components: []
                });
                return true;
            }

            // 3. 🛡️ ระบบเมื่อมีผู้ใช้กดปุ่มรับ/ถอดยศจริงในห้องแชท
            if (interaction.customId.startsWith('rr_toggle_')) {
                const roleId = interaction.customId.replace('rr_toggle_', '');
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({
                        content: '❌ ไม่พบยศ (Role) นี้ในเซิร์ฟเวอร์ อาจถูกลบไปแล้ว กรุณาแจ้งแอดมิน',
                        flags: [MessageFlags.Ephemeral]
                    });
                }

                try {
                    // ตรวจสอบยศสูงสุดของบอทว่าสูงกว่ายศที่จะแจกหรือไม่
                    const botMember = await interaction.guild.members.fetchMe();
                    if (botMember.roles.highest.position <= role.position) {
                        return interaction.reply({
                            content: '❌ บอทไม่สามารถจัดการยศนี้ได้ เนื่องจากตำแหน่งยศของบอทต่ำกว่ายศที่ตั้งค่าไว้ (กรุณาย้ายยศบอทให้อยู่เหนือยศรับสมัคร)',
                            flags: [MessageFlags.Ephemeral]
                        });
                    }

                    // เช็คว่าผู้ใช้มีรึยัง ถ้ามีแล้วให้ถอดออก / ถ้ายังไม่มีให้ใส่เพิ่ม
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                        return interaction.reply({
                            content: `❌ **ถอดยศสำเร็จ!** คุณได้ทำการนำยศ **@${role.name}** ออกจากตัวคุณแล้ว`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    } else {
                        await member.roles.add(roleId);
                        return interaction.reply({
                            content: `🎉 **รับยศสำเร็จ!** คุณได้รับยศ **@${role.name}** เรียบร้อยแล้วครับ!`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } catch (err) {
                    console.error('Error toggling reaction role:', err);
                    return interaction.reply({
                        content: '❌ เกิดข้อผิดพลาดในการเพิ่มหรือถอดยศ กรุณาตรวจสอบสิทธิ์ของบอท (Manage Roles)',
                        flags: [MessageFlags.Ephemeral]
                    });
                }
                return true;
            }
        }

        return false;
    }
};
