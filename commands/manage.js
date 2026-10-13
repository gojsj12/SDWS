const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (พรีเมียม คลีน ไร้อีโมจิข้อความ)
const ICONS = {
    MODERATION: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('ระบบจัดการสมาชิกในเซิร์ฟเวอร์')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        // Subcommand: Kick
        .addSubcommand(subcommand =>
            subcommand.setName('kick')
                .setDescription('เตะสมาชิกออกจากเซิร์ฟเวอร์')
                .addUserOption(opt => opt.setName('user').setDescription('เลือกสมาชิกที่ต้องการเตะ').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('เหตุผลในการเตะ').setRequired(false))
        )
        // Subcommand: Ban
        .addSubcommand(subcommand =>
            subcommand.setName('ban')
                .setDescription('แบนสมาชิกออกจากเซิร์ฟเวอร์')
                .addUserOption(opt => opt.setName('user').setDescription('เลือกสมาชิกที่ต้องการแบน').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('เหตุผลในการแบน').setRequired(false))
        )
        // Subcommand: Timeout
        .addSubcommand(subcommand =>
            subcommand.setName('timeout')
                .setDescription('ปิดการโต้ตอบสมาชิกชั่วคราว (Timeout)')
                .addUserOption(opt => opt.setName('user').setDescription('เลือกสมาชิกที่ต้องการลงโทษ').setRequired(true))
                .addIntegerOption(opt => opt.setName('minutes').setDescription('จำนวนนาที (เช่น 5, 10, 60)').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('เหตุผล').setRequired(false))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'ไม่ได้ระบุเหตุผล';
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: 'ไม่พบสมาชิกคนนี้ในเซิร์ฟเวอร์', ephemeral: true });
        }

        // เช็คการสืบทอดสิทธิ์ (ไม่สามารถจัดการคนที่มีบทบาทสูงกว่าบอทหรือผู้สั่งได้)
        if (!member.manageable) {
            return interaction.reply({ content: 'ไม่สามารถดำเนินการกับสมาชิกคนนี้ได้ เนื่องจากมีบทบาทสูงกว่าหรือเท่ากับระบบ', ephemeral: true });
        }

        try {
            let actionName = '';

            if (subcommand === 'kick') {
                await member.kick(reason);
                actionName = 'เตะสมาชิกออกจากเซิร์ฟเวอร์เรียบร้อย';
            } else if (subcommand === 'ban') {
                await member.ban({ reason });
                actionName = 'แบนสมาชิกออกจากเซิร์ฟเวอร์เรียบร้อย';
            } else if (subcommand === 'timeout') {
                const minutes = interaction.options.getInteger('minutes');
                await member.timeout(minutes * 60 * 1000, reason);
                actionName = `ปิดการโต้ตอบชั่วคราวเป็นเวลา ${minutes} นาที`;
            }

            // สร้าง Embed แจ้งเตือนการจัดการสมาชิกแบบดีไซน์หรูหรา
            const embedMod = new EmbedBuilder()
                .setColor('#ED4245') // สีแดงสำหรับงานจัดการ/ลงโทษ
                .setAuthor({ 
                    name: 'MODERATION SYSTEM', 
                    iconURL: ICONS.MODERATION 
                })
                .setTitle(actionName)
                .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
                .addFields(
                    { name: 'สมาชิก', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'ผู้ดำเนินการ', value: `${interaction.user.username}`, inline: true },
                    { name: 'เหตุผล', value: `\`\`\`${reason}\`\`\``, inline: false }
                )
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ 
                    text: `${interaction.client.user.username} | Management Logs`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embedMod] });

        } catch (error) {
            console.error('Error executing /manage:', error);
            await interaction.reply({ content: 'เกิดข้อผิดพลาดในการดำเนินการจัดการสมาชิก', ephemeral: true });
        }
    },
};
