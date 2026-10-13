const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพค่าเริ่มต้น (สไตล์ค่ายบักก๊อต)
const DEFAULT_ICONS = {
    SYSTEM: '[https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png](https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png)',
    FOOTER: '[https://cdn-icons-png.flaticon.com/512/2913/2913144.png](https://cdn-icons-png.flaticon.com/512/2913/2913144.png)',
    DEFAULT_IMAGE: '[https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png](https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png)',
    ALERT_THUMB: '[https://cdn-icons-png.flaticon.com/512/1792/1792931.png](https://cdn-icons-png.flaticon.com/512/1792/1792931.png)'
};

// ID แอดมินบอทที่ได้รับอนุญาตให้ใช้คำสั่งนี้ (ห้ามเปลี่ยน)
const ADMIN_ID = '1143741885098250281';

// 🗄️ ตัวแปรชั่วคราวสำหรับเก็บข้อมูล DM (Cache)
const dmCache = new Map();

// 🛠️ ฟังก์ชันสำหรับตรวจเช็กและจัดรูปแบบ URL ป้องกัน Error แครช
function parseValidUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return null;
    let trimmed = urlStr.trim();
    if (!trimmed) return null;

    if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = `https://${trimmed}`;
    }

    try {
        const parsed = new URL(trimmed);
        return parsed.href;
    } catch (e) {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('ส่งข้อความส่วนตัว (DM) พร้อมตั้งค่ารูปภาพและปุ่มลิงก์ได้ (สำหรับแอดมินบอท)')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('Discord User ID ของผู้ใช้ที่ต้องการส่งข้อความหา')
                .setRequired(true)
        ),

    async execute(interaction) {
        // ตรวจสอบสิทธิ์แอดมิน
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({
                content: '❌ **บอทตัวนี้จำกัดสิทธิ์ให้เฉพาะแอดมินหลักใช้งานเท่านั้น!**',
                flags: [MessageFlags.Ephemeral]
            });
        }

        const targetUserId = interaction.options.getString('userid');

        const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser) {
            return interaction.reply({
                content: `❌ **ไม่พบผู้ใช้งานที่มี User ID:** \`${targetUserId}\` กรุณาตรวจสอบความถูกต้องอีกครั้ง`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 📝 สร้าง Modal ฟอร์มตั้งค่า
        const modal = new ModalBuilder()
            .setCustomId(`dm_modal_${interaction.user.id}_${targetUserId}`)
            .setTitle('✨ ตั้งค่าประกาศ DM ส่วนตัว');

        const titleInput = new TextInputBuilder()
            .setCustomId('dm_title')
            .setLabel('หัวข้อข้อความ (Embed Title)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('เช่น 👑 ประกาศสำคัญจาก SHGOX STUDIO')
            .setRequired(true)
            .setMaxLength(100);

        const messageInput = new TextInputBuilder()
            .setCustomId('dm_message')
            .setLabel('เนื้อหาข้อความรายละเอียด')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('พิมพ์ข้อความของคุณที่นี่ (รองรับอีโมจิ)...')
            .setRequired(true)
            .setMaxLength(1000);

        const imageInput = new TextInputBuilder()
            .setCustomId('dm_image')
            .setLabel('ลิงก์รูปภาพประกอบ (Image URL)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('[https://example.com/image.png](https://example.com/image.png) (เว้นว่างได้)')
            .setRequired(false);

        const btnText = new TextInputBuilder()
            .setCustomId('dm_btn_text')
            .setLabel('ชื่อปุ่มกดลิงก์ (Button Label)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('เช่น 🌐 เข้าสู่เว็บไซต์ / 💬 ติดต่อแอดมิน')
            .setRequired(false)
            .setMaxLength(50);

        const btnUrl = new TextInputBuilder()
            .setCustomId('dm_btn_url')
            .setLabel('ลิงก์ URL ของปุ่มกด')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('[https://discord.gg/yourserver](https://discord.gg/yourserver)')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(messageInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(btnText),
            new ActionRowBuilder().addComponents(btnUrl)
        );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction) {
        if (interaction.isModalSubmit() && interaction.customId.startsWith('dm_modal_')) {
            const parts = interaction.customId.split('_');
            const adminId = parts[2];
            const targetUserId = parts[3];

            if (interaction.user.id !== adminId) {
                return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์จัดการฟอร์มนี้', flags: [MessageFlags.Ephemeral] });
            }

            const titleText = interaction.fields.getTextInputValue('dm_title');
            const messageText = interaction.fields.getTextInputValue('dm_message');
            const customImage = interaction.fields.getTextInputValue('dm_image');
            const buttonText = interaction.fields.getTextInputValue('dm_btn_text');
            const rawButtonUrl = interaction.fields.getTextInputValue('dm_btn_url');

            // 🛡️ เช็กรูปและสแกน URL ปุ่มกดให้ถูกต้อง
            const validatedImageUrl = parseValidUrl(customImage);
            const finalImage = validatedImageUrl || DEFAULT_ICONS.DEFAULT_IMAGE;

            const validatedButtonUrl = parseValidUrl(rawButtonUrl);

            // บันทึกข้อมูลลง Cache ชั่วคราว (10 นาที)
            const cacheKey = `dm_${interaction.user.id}_${Date.now()}`;
            dmCache.set(cacheKey, { 
                title: titleText, 
                message: messageText, 
                image: finalImage,
                btnText: buttonText || null, 
                btnUrl: validatedButtonUrl || null, 
                targetUserId 
            });

            setTimeout(() => dmCache.delete(cacheKey), 10 * 60 * 1000);

            const client = interaction.client;
            const unixTimestamp = Math.floor(Date.now() / 1000);

            // 🔍 แสดงหน้าพรีวิวพรีเมียมให้แอดมินดูก่อนส่งจริง
            const previewEmbed = new EmbedBuilder()
                .setColor('#38bdf8')
                .setAuthor({ name: '✨ DIRECT MESSAGE PREVIEW', iconURL: DEFAULT_ICONS.SYSTEM })
                .setTitle(`📌 ${titleText}`)
                .setDescription(`>>> ${messageText}`)
                .addFields(
                    { name: '👤 ผู้รับเป้าหมาย', value: `<@${targetUserId}> (\`${targetUserId}\`)`, inline: true },
                    { name: '⏰ เวลาเตรียมส่ง', value: `<t:${unixTimestamp}:R>`, inline: true },
                    { 
                        name: '🔘 สถานะปุ่มลิงก์', 
                        value: (buttonText && validatedButtonUrl) 
                            ? `\`\`\`yaml\nเปิดใช้งาน: ${buttonText}\nURL: ${validatedButtonUrl}\n\`\`\`` 
                            : '```arm\nปิดใช้งาน (ไม่มีปุ่มกดลิงก์)\n```', 
                        inline: false 
                    }
                )
                .setThumbnail(DEFAULT_ICONS.ALERT_THUMB)
                .setImage(finalImage)
                .setFooter({ text: `${client.user.username} | ตรวจสอบความถูกต้องก่อนกดยืนยัน`, iconURL: DEFAULT_ICONS.FOOTER })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dm_send_${cacheKey}`)
                    .setLabel('🚀 ยืนยันและส่งข้อความจริง')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dm_cancel')
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

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('dm_send_')) {
                if (interaction.user.id !== ADMIN_ID) {
                    return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์กดปุ่มนี้', flags: [MessageFlags.Ephemeral] });
                }

                const cacheKey = interaction.customId.replace('dm_send_', '');
                const dmData = dmCache.get(cacheKey);

                if (!dmData) {
                    return interaction.update({
                        content: '⏱️ ข้อมูลหมดอายุแล้ว (เกิน 10 นาที) กรุณาใช้คำสั่งใหม่อีกครั้ง',
                        embeds: [],
                        components: []
                    });
                }

                const { title, message, image, btnText, btnUrl, targetUserId } = dmData;
                const client = interaction.client;
                const targetUser = await client.users.fetch(targetUserId).catch(() => null);
                
                if (!targetUser) {
                    return interaction.update({ content: '❌ ไม่พบผู้ใช้ปลายทางในระบบ', embeds: [], components: [] });
                }

                try {
                    const unixTimestamp = Math.floor(Date.now() / 1000);

                    // 🚨 Embed ประกาศพรีเมียมส่งตรงเข้า DM ผู้รับ
                    const finalEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setAuthor({ name: '📢 OFFICIAL DIRECT NOTIFICATION', iconURL: DEFAULT_ICONS.SYSTEM })
                        .setTitle(`📌 ${title}`)
                        .setDescription(`>>> ${message}`)
                        .addFields(
                            { name: '👑 ผู้ดูแลระบบผู้ส่ง', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '⏰ เวลาที่แจ้งเตือน', value: `<t:${unixTimestamp}:F>`, inline: true }
                        )
                        .setThumbnail(DEFAULT_ICONS.ALERT_THUMB)
                        .setImage(image)
                        .setFooter({ text: `${client.user.username} • ค่ายบักก๊อต | Official Notification`, iconURL: DEFAULT_ICONS.FOOTER })
                        .setTimestamp();

                    const componentsToSend = [];

                    // สร้างปุ่มกดเฉพาะเมื่อกรอกปุ่มและได้ URL ที่ถูกต้อง
                    if (btnText && btnUrl) {
                        try {
                            const linkButton = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setLabel(btnText)
                                    .setURL(btnUrl)
                                    .setStyle(ButtonStyle.Link)
                            );
                            componentsToSend.push(linkButton);
                        } catch (e) {
                            console.warn('⚠️ ปุ่มกดถูกข้ามเนื่องจาก URL ไม่ถูกต้อง:', btnUrl);
                        }
                    }

                    // ส่งข้อความจริงเข้า DM ผู้ใช้
                    await targetUser.send({ embeds: [finalEmbed], components: componentsToSend });

                    dmCache.delete(cacheKey);

                    await interaction.update({
                        content: `✅ **ส่งข้อความไปยัง DM ของ <@${targetUserId}> เรียบร้อยแล้ว!**`,
                        embeds: [],
                        components: []
                    });
                } catch (error) {
                    console.error('Error sending DM:', error);
                    await interaction.update({
                        content: '❌ **ส่งข้อความไม่สำเร็จ!** ผู้ใช้อาจปิดรับข้อความส่วนตัว (DM) หรือบล็อกบอทอยู่',
                        embeds: [],
                        components: []
                    });
                }
                return true;
            }

            if (interaction.customId === 'dm_cancel') {
                await interaction.update({
                    content: '❌ **ยกเลิกการส่งข้อความเรียบร้อยแล้ว**',
                    embeds: [],
                    components: []
                });
                return true;
            }
        }

        return false;
    }
};
