const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../ticket-config.json');

function loadConfig(guildId) {
    if (fs.existsSync(configPath)) {
        try {
            const db = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return db[guildId] || null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

const ICONS = {
    SHGOX: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    BANNER: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    FOOTER: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    WARNING: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    SUCCESS: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    LOCKED: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    INFO: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png',
    URGENT: 'https://img1.pic.in.th/images/Cyber-Cute-Contact-Bear-Banner.png'
};

const DEPT_INFO = {
    admin: { name: 'ฝ่ายแอดมินหลัก', color: '#F1C40F' },
    contact: { name: 'ฝ่ายติดต่อสอบถาม', color: '#3498DB' },
    system: { name: 'ฝ่ายแจ้งระบบ / ปัญหา', color: '#E67E22' },
    discord: { name: 'ฝ่ายดูแลระบบ Discord', color: '#9B59B6' },
    care: { name: 'ฝ่ายดูแลสมาชิกทั่วไป', color: '#2ECC71' }
};

function formatStaffList(ids) {
    if (!ids || ids.length === 0) return '`ไม่มีรายชื่อผู้รับผิดชอบ`';
    return ids.map(id => `<@${id}>`).join(', ');
}

module.exports = async (interaction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    const guildConfig = loadConfig(guild.id);
    const departments = guildConfig ? guildConfig.departments : { admin: [], contact: [], system: [], discord: [], care: [] };

    // 1. กดปุ่มเปิดแผงเลือกฝ่าย -> เด้ง Dropdown Menu เลือกฝ่ายหลัก
    if (interaction.isButton() && interaction.customId === 'ticket_select_dept') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_dept_selected')
            .setPlaceholder('กรุณาคลิกเลือกฝ่ายที่ต้องการติดต่อ...')
            .addOptions([
                { label: '1. ฝ่ายแอดมินหลัก', description: 'ติดต่อเรื่องสำคัญ / ผู้ดูแลสูงสุด', value: 'admin' },
                { label: '2. ฝ่ายติดต่อสอบถาม', description: 'สอบถามข้อมูลการใช้งานทั่วไป', value: 'contact' },
                { label: '3. ฝ่ายแจ้งระบบ / ปัญหา', description: 'แจ้งบัค ปัญหาระบบ หรือแจ้งข้อผิดพลาด', value: 'system' },
                { label: '4. ฝ่ายดูแลระบบ Discord', description: 'แจ้งปัญหาห้องดิสคอร์ด หรือยศสมาชิก', value: 'discord' },
                { label: '5. ฝ่ายดูแลสมาชิกทั่วไป', description: 'ปรึกษา ขอความช่วยเหลือ หรือพูดคุย', value: 'care' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ 
            content: 'SHGOX Support Center: กรุณาเลือกฝ่ายที่คุณต้องการติดต่อจากเมนูด้านล่างนี้ครับ', 
            components: [row], 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    // 2. เมื่อเลือกฝ่ายจาก Dropdown ฝ่ายหลัก -> เช็กเจ้าหน้าที่ หรือเปิดเมนูเลือกรายบุคคล
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_dept_selected') {
        const selectedDept = interaction.values[0];
        const dept = DEPT_INFO[selectedDept] || { name: 'ฝ่ายซัพพอร์ต', color: '#5865F2' };
        const assignedUsers = departments[selectedDept] || [];
        const adminUsers = departments.admin || [];

        const allAvailableStaff = [...new Set([...adminUsers, ...assignedUsers])]

        if (allAvailableStaff.length === 0) {
            const warningEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setAuthor({ name: 'TICKET SYSTEM | ไม่พบผู้ให้บริการ', iconURL: ICONS.SHGOX })
                .setTitle(`ขออภัยครับ ไม่มีผู้ให้บริการใน "${dept.name}"`)
                .setDescription(`ในขณะนี้ยังไม่มีเจ้าหน้าที่หรือแอดมินประจำการอยู่ใน **${dept.name}** เลยครับ กรุณาเลือกติดต่อฝ่ายอื่น`)
                .setTimestamp();

            return interaction.update({ embeds: [warningEmbed], components: [], flags: [MessageFlags.Ephemeral] });
        }

        const staffSelectOptions = [
            {
                label: 'ติดต่อเจ้าหน้าที่ทุกคนในฝ่ายนี้',
                description: 'เปิดห้องตั๋วให้ทีมงานทุกคนในฝ่ายนี้เข้ามาดูแลร่วมกัน',
                value: `staff_all_${selectedDept}`
            }
        ];

        for (const userId of allAvailableStaff) {
            try {
                const targetMember = await guild.members.fetch(userId);
                if (targetMember) {
                    staffSelectOptions.push({
                        label: `คุยส่วนตัวกับ: ${targetMember.user.username}`,
                        description: `เลือกเปิดตั๋วเฉพาะเจาะจงกับ ${targetMember.user.tag} (เห็นกันแค่สองคน)`,
                        value: `staff_one_${selectedDept}_${userId}`
                    });
                }
            } catch (e) {}
        }

        const staffSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_staff_selected')
            .setPlaceholder(`เลือกเจ้าหน้าที่ที่คุณต้องการคุยด้วยใน ${dept.name}...`)
            .addOptions(staffSelectOptions);

        const row = new ActionRowBuilder().addComponents(staffSelectMenu);
        return interaction.update({
            content: `คุณเลือก **${dept.name}** เรียบร้อยแล้ว\nกรุณาเลือกรูปแบบการติดต่อหรือเลือกเจ้าหน้าที่เฉพาะคนที่ต้องการด้านล่างนี้ครับ:`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    }

    // 3. เมื่อผู้ใช้เลือกรายชื่อเจ้าหน้าที่เฉพาะคน (หรือเลือกทุกคน) -> สร้างห้องตั๋วส่วนตัว
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_staff_selected') {
        const selectedValue = interaction.values[0];
        const parts = selectedValue.split('_');
        const mode = parts[1]; // all หรือ one
        const selectedDept = parts[2]; // contact, admin, etc.
        const targetStaffId = mode === 'one' ? parts[3] : null;

        if (mode === 'one' && targetStaffId === member.id) {
            return interaction.reply({
                content: '❌ คุณไม่สามารถเปิดตั๋วส่วนตัวเพื่อคุยกับตัวเองได้ครับ กรุณาเลือกเจ้าหน้าที่ท่านอื่นหรือเลือกติดต่อทุกคนในฝ่าย',
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const dept = DEPT_INFO[selectedDept] || { name: 'ฝ่ายซัพพอร์ต', color: '#5865F2' };
        const assignedUsers = departments[selectedDept] || [];

        const channelNameSuffix = mode === 'one' ? `with-${targetStaffId}` : selectedDept;

        const existingChannel = guild.channels.cache.find(
            c => c.name === `ticket-${channelNameSuffix}-${member.user.username.toLowerCase()}`
        );

        if (existingChannel) {
            return interaction.editReply(`คุณมีห้องตั๋วเปิดใช้งานอยู่แล้วที่ <#${existingChannel.id}>`);
        }

        try {
            const permissionOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
                },
                {
                    id: interaction.client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                }
            ];

            let allowedStaffIds = [];
            if (mode === 'one' && targetStaffId) {
                allowedStaffIds = [targetStaffId];
            } else {
                allowedStaffIds = [...assignedUsers, ...(departments.admin || [])];
            }

            [...new Set(allowedStaffIds)].forEach(userId => {
                permissionOverwrites.push({
                    id: userId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles]
                });
            });

            const ticketChannel = await guild.channels.create({
                name: `ticket-${channelNameSuffix}-${member.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: permissionOverwrites
            });

            let responsibleStaffText = '';
            if (mode === 'one' && targetStaffId) {
                responsibleStaffText = `เจ้าหน้าที่เฉพาะบุคคล (ห้องส่วนตัว 1:1): <@${targetStaffId}>`;
            } else {
                responsibleStaffText = `เจ้าหน้าที่ฝ่าย (${dept.name}):${formatStaffList(assignedUsers)}`;
            }

            const welcomeEmbed = new EmbedBuilder()
                .setColor(dept.color)
                .setAuthor({ name: 'SHGOX SUPPORT TICKET SYSTEM', iconURL: ICONS.SHGOX })
                .setTitle(`ห้องตั๋วส่วนตัวของคุณ: ${member.user.username}`)
                .setDescription(
                    `ยินดีต้อนรับสู่ห้องบริการช่วยเหลือส่วนตัวครับ! ห้องนี้เห็นกันเฉพาะคุณและเจ้าหน้าที่ผู้รับผิดชอบ\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `รายละเอียดคำร้อง:\n` +
                    `• ผู้เปิดตั๋ว: <@${member.id}>\n` +
                    `• สังกัดฝ่าย: ${dept.name}\n` +
                    `• รูปแบบการเปิด: ${mode === 'one' ? 'สนทนากับเจ้าหน้าที่เฉพาะบุคคล (1:1)' : 'ติดต่อทีมงานในฝ่าย'}\n` +
                    `• สถานะห้อง: รอดำเนินการ (Pending)\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `ผู้ดูแลเคสนี้:\n${responsibleStaffText}`
                )
                .setImage(ICONS.BANNER)
                .setFooter({ text: `${interaction.client.user.username} • SHGOX ค่าย บักก๊อต Official`, iconURL: ICONS.FOOTER })
                .setTimestamp();

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_request_close').setLabel('ขอปิดตั๋ว (Close)').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_ping_staff').setLabel('เรียกทีมงาน (Ping Staff)').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_urgent').setLabel('ติดต่อด่วน (Urgent)').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('ticket_info').setLabel('ข้อมูลห้อง (Info)').setStyle(ButtonStyle.Secondary)
            );

            let pingContent = '';
            if (mode === 'one' && targetStaffId) {
                pingContent = `<@${targetStaffId}> (<@${member.id}> ได้เปิดตั๋วส่วนตัวหาคุณครับ!)`;
            } else {
                let staffMentions = assignedUsers.map(id => `<@${id}>`).join(' ');
                pingContent = `<@${member.id}> ได้เปิดตั๋วสำเร็จแล้ว!\nแจ้งเตือนทีมงาน: ${staffMentions || 'ทีมงาน'}`;
            }

            await ticketChannel.send({
                content: pingContent,
                embeds: [welcomeEmbed],
                components: [controlRow]
            });

            if (guildConfig && guildConfig.logChannelId) {
                const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setAuthor({ name: 'LOG | TICKET CREATED', iconURL: ICONS.SUCCESS })
                        .setTitle(`มีการเปิดตั๋วใหม่: #${ticketChannel.name}`)
                        .addFields(
                            { name: 'ผู้เปิดตั๋ว', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: 'ฝ่ายที่ติดต่อ', value: dept.name, inline: true },
                            { name: 'ห้องตั๋ว', value: `<#${ticketChannel.id}>`, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            await interaction.editReply(`สร้างห้องตั๋วส่วนตัวเรียบร้อยแล้วครับ: <#${ticketChannel.id}>`);

        } catch (error) {
            console.error('Error creating ticket:', error);
            await interaction.editReply('เกิดข้อผิดพลาดในการสร้างห้องตั๋ว กรุณาตรวจสอบสิทธิ์ของบอท (Manage Channels)');
        }
    }

    // 4. 🔔 ปุ่มกด "เรียกทีมงาน" (Ping Staff) -> แท็กเฉพาะฝ่ายที่เปิดตั๋วหรือคนที่ถูกเลือกในห้องนั้นๆ
    if (interaction.isButton() && interaction.customId === 'ticket_ping_staff') {
        const channelName = interaction.channel.name;
        
        let deptKey = 'contact';
        for (const key in DEPT_INFO) {
            if (channelName.includes(key)) {
                deptKey = key;
                break;
            }
        }

        // ตรวจสอบว่าห้องนี้เปิดแบบคุย 1:1 กับใคร (ดูจากชื่อห้อง with-USERID)
        let specificTargetId = null;
        if (channelName.includes('with-')) {
            const parts = channelName.split('-');
            const withIndex = parts.indexOf('with');
            if (withIndex !== -1 && parts[withIndex + 1]) {
                specificTargetId = parts[withIndex + 1];
            }
        }

        let staffMentions = '';
        if (specificTargetId) {
            staffMentions = `<@${specificTargetId}>`;
        } else {
            const staffList = departments[deptKey] || [];
            const adminList = departments.admin || [];
            const allTargetStaff = [...new Set([...staffList, ...adminList])];
            staffMentions = allTargetStaff.map(id => `<@${id}>`).join(' ');
        }

        await interaction.reply({ content: `🔔 <@${member.id}> ได้ส่งสัญญาณเรียกทีมงานเฉพาะฝ่าย/ผู้ดูแลห้องนี้: ${staffMentions || 'ไม่มีรายชื่อ'}` });
    }

    // 5. 🚨 ปุ่มกด "ติดต่อด่วน" (Urgent) -> แอด/แท็กทีมงานทั้งหมดทุกฝ่ายเข้ามาดูแลทันที
    if (interaction.isButton() && interaction.customId === 'ticket_urgent') {
        const allStaffCombined = [
            ...(departments.admin || []),
            ...(departments.contact || []),
            ...(departments.system || []),
            ...(departments.discord || []),
            ...(departments.care || [])
        ];

        const uniqueAllStaff = [...new Set(allStaffCombined)];
        const allStaffMentions = uniqueAllStaff.map(id => `<@${id}>`).join(' ');

        const urgentEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setAuthor({ name: '⚠️ URGENT TICKET ALERT', iconURL: ICONS.SHGOX })
            .setTitle('มีการแจ้งเตือนติดต่อด่วนขั้นสูงสุด!')
            .setDescription(`ผู้ใช้ <@${member.id}> กดปุ่ม **[ติดต่อด่วน]** ต้องการความช่วยเหลืออย่างเร่งด่วน! แท็กทีมงานทุกฝ่ายทั้งหมดเข้ามาดูแลแล้ว`)
            .setTimestamp();

        await interaction.reply({ 
            content: `🚨 **แจ้งเตือนด่วนถึงทีมงานทุกคนทุกฝ่าย:** ${allStaffMentions || 'ไม่มีรายชื่อทีมงาน'}`, 
            embeds: [urgentEmbed] 
        });
    }

    // 6. ปุ่มกด "ดูข้อมูลตั๋ว" (Info)
    if (interaction.isButton() && interaction.customId === 'ticket_info') {
        const infoEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({ name: 'TICKET INFORMATION', iconURL: ICONS.INFO })
            .addFields(
                { name: 'ชื่อห้อง', value: `\`${interaction.channel.name}\``, inline: true },
                { name: 'ID ห้อง', value: `\`${interaction.channel.id}\``, inline: true },
                { name: 'เวลาที่สร้าง', value: `<t:${Math.floor(interaction.channel.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [infoEmbed], flags: [MessageFlags.Ephemeral] });
    }

    // 7. ปุ่มกด "ขอปิดตั๋ว" 
    if (interaction.isButton() && interaction.customId === 'ticket_request_close') {
        const channelName = interaction.channel.name;
        
        let isAssignedStaff = false;
        for (const deptKey in departments) {
            const staffIds = departments[deptKey] || [];
            if (staffIds.includes(member.id) && channelName.includes(deptKey) || channelName.includes(member.id)) {
                isAssignedStaff = true;
                break;
            }
        }
        const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || isAssignedStaff || (channelName.includes('with-') && channelName.includes(member.id));

        if (isStaff) {
            await interaction.reply({ content: 'เจ้าหน้าที่กดปิดตั๋วแล้ว! กำลังลบห้องใน 5 วินาที...' });

            if (guildConfig && guildConfig.logChannelId) {
                const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setAuthor({ name: 'LOG | TICKET CLOSED BY STAFF', iconURL: ICONS.LOCKED })
                        .setTitle(`มีการปิดตั๋ว: #${interaction.channel.name}`)
                        .addFields(
                            { name: 'ผู้ปิดตั๋ว (เจ้าหน้าที่)', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: 'ห้องที่ถูกปิด', value: `\`${interaction.channel.name}\``, inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (e) {}
            }, 5000);
            return;
        }

        await interaction.deferUpdate();

        const pendingEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setAuthor({ name: 'TICKET CLOSE REQUEST', iconURL: ICONS.SHGOX })
            .setTitle('คำขอปิดตั๋วกำลังรอการยืนยัน')
            .setDescription(`สมาชิก **${member.user.tag}** ได้กดขอปิดตั๋วนี้\n*กรุณารอให้เจ้าหน้าที่ผู้รับผิดชอบเข้ามากดยืนยันปิดห้องขั้นสุดท้าย*`)
            .setTimestamp();

        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('ยืนยันปิดห้อง (Confirm)').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('ยกเลิก (Cancel)').setStyle(ButtonStyle.Secondary)
        );

        await interaction.channel.send({ embeds: [pendingEmbed], components: [confirmRow] });
    }

    // 8. ปุ่ม "ยกเลิกคำขอปิด"
    if (interaction.isButton() && interaction.customId === 'ticket_cancel_close') {
        await interaction.message.delete().catch(() => {});
    }

    // 9. ปุ่ม "ยืนยันปิดห้องขั้นสุดท้ายสำหรับเจ้าหน้าที่" + ส่ง Log ปิดตั๋ว
    if (interaction.isButton() && interaction.customId === 'ticket_confirm_close') {
        const channelName = interaction.channel.name;
        let isAssignedStaff = false;
        for (const deptKey in departments) {
            const staffIds = departments[deptKey] || [];
            if (staffIds.includes(member.id)) {
                isAssignedStaff = true;
                break;
            }
        }
        const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || isAssignedStaff;

        if (!isStaff) {
            return interaction.reply({ content: 'เฉพาะเจ้าหน้าที่ผู้รับผิดชอบเท่านั้นที่มีสิทธิ์กดยืนยันปิดตั๋วนี้!', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.reply({ content: 'เจ้าหน้าที่ยืนยันการปิดตั๋วแล้ว! กำลังทำความสะอาดและลบห้องใน 5 วินาที...' });

        if (guildConfig && guildConfig.logChannelId) {
            const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setAuthor({ name: 'LOG | TICKET CLOSED', iconURL: ICONS.LOCKED })
                    .setTitle(`มีการปิดตั๋ว: #${interaction.channel.name}`)
                    .addFields(
                        { name: 'ผู้กดยืนยันปิด', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                        { name: 'ห้องที่ถูกปิด', value: `\`${interaction.channel.name}\``, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        setTimeout(async () => {
            try { await interaction.channel.delete(); } catch (e) {}
        }, 5000);
    }
};
