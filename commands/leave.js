const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

// 🔗 ชุดลิงก์ไอคอนรูปภาพ (พรีเมียม คลีน ไร้อีโมจิข้อความ)
const ICONS = {
    VOICE: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('สั่งให้บอทออกจากห้องเสียง (Voice Channel)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Connect),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        // 1. ตรวจสอบว่าบอทรออยู่ในห้องเสียงของเซิร์ฟเวอร์นี้หรือไม่
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            return interaction.reply({ 
                content: 'บอทไม่ได้อยู่ในห้องเสียงใดๆ ในขณะนี้', 
                ephemeral: true 
            });
        }

        try {
            // 2. ตัดการเชื่อมต่อออกจากห้องเสียง
            connection.destroy();

            // 3. สร้าง Embed แจ้งเตือนแบบพรีเมียม คลีน ไร้อีโมจิข้อความ
            const embedLeave = new EmbedBuilder()
                .setColor('#ED4245') // สีแดงสำหรับสถานะออกจากการเชื่อมต่อ
                .setAuthor({ 
                    name: 'VOICE SYSTEM', 
                    iconURL: ICONS.VOICE 
                })
                .setTitle('ออกจากห้องเสียงเรียบร้อยแล้ว')
                .setDescription('บอทได้ทำการตัดการเชื่อมต่อและออกจากห้องเสียงตามคำสั่งของคุณ')
                .addFields(
                    { name: 'ผู้สั่งการ', value: `${interaction.user.username}`, inline: true }
                )
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ 
                    text: `${interaction.client.user.username} | Disconnected`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embedLeave] });

        } catch (error) {
            console.error('Error in /leave:', error);
            await interaction.reply({ 
                content: 'เกิดข้อผิดพลาดในการออกจากห้องเสียง', 
                ephemeral: true 
            });
        }
    },
};
