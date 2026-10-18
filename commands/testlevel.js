const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testlevel')
        .setDescription('ทดสอบการแจ้งเตือนเลเวลอัปแบบการ์ดสุดเท่')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const user = interaction.user;
        const guild = interaction.guild;

        // จำลองการ์ดเลเวลอัปสุดพรีเมียม
        const levelEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: '🌟 LEVEL UP REWARD SYSTEM (TEST)', iconURL: guild.iconURL({ dynamic: true }) || undefined })
            .setTitle(`🎉 ขอแสดงความยินดีด้วยครับ! (ทดสอบระบบ)`)
            .setDescription(`> ผู้เล่น <@${user.id}> สามารถเก็บสะสม XP จนเลเวลอัปขึ้นไปอีกขั้นแล้ว!`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 ผู้ใช้งาน', value: `\`${user.tag}\``, inline: true },
                { name: '🚀 เลเวลจำลอง', value: `\`Level 5 (Test)\``, inline: true },
                { name: '✨ สถานะ', value: 'ระบบแจ้งเตือนทำงานปกติพร้อมใช้งานจริง!', inline: false }
            )
            .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
            .setFooter({ text: 'SHGOX Rank System | ยิ่งพิมพ์เยอะ ยิ่งเลเวลสูง' })
            .setTimestamp();

        // ส่งข้อความจำลองเข้าห้องแชทปัจจุบัน
        await interaction.channel.send({ 
            content: `🚀 [ทดสอบระบบเลเวล] เก่งมากครับ <@${user.id}> เลเวลอัปแล้ว!`, 
            embeds: [levelEmbed] 
        });

        await interaction.editReply({ 
            content: '✅ ส่งข้อความทดสอบระบบเลเวลอัปเรียบร้อยแล้วครับ ลองดูที่ห้องแชทได้เลย!' 
        });
    }
};
