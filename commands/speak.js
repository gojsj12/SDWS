const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const simplementts = require('discord-tts'); 
const fs = require('fs');
const path = require('path');

const ICONS = {
    SPEAK: 'https://img1.pic.in.th/images/Neon-Chibi-Bear-Group-Badge.png',
    FOOTER: 'https://cdn-icons-png.flaticon.com/512/2913/2913144.png'
};

// 📂 ฟังก์ชันสำหรับบันทึกประวัติลงไฟล์ Log อัตโนมัติ
function logToFile(action, details) {
    try {
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, 'voice_keeper.log');
        const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const logMessage = `[${timestamp}] [${action}] ${details}\n`;
        fs.appendFileSync(logFile, logMessage, 'utf8');
    } catch (err) {
        console.error('Error writing to log file:', err);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speak')
        .setDescription('ให้บอทเข้าห้องเสียงและพูดข้อความที่คุณต้องการ (ปักหลักถาวร + ระบบ Log)')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('ข้อความที่ต้องการให้บอทพูด')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            const voiceChannel = interaction.member?.voice?.channel;

            if (!voiceChannel) {
                return interaction.reply({ 
                    content: '❌ กรุณาเข้าห้องเสียง (Voice Channel) ก่อนใช้งานคำสั่งนี้', 
                    ephemeral: true 
                });
            }

            // ตรวจสอบสิทธิ์การเข้าและพูดในห้องเสียง
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
                logToFile('ERROR', `บอทไม่มีสิทธิ์ Connect/Speak ในห้อง: ${voiceChannel.name}`);
                return interaction.reply({ 
                    content: '❌ บอทไม่มีสิทธิ์ในการ **Connect (เข้าห้อง)** หรือ **Speak (พูด)** ในห้องเสียงนี้ กรุณาตรวจสอบยศหรือสิทธิ์ของบอท', 
                    ephemeral: true 
                });
            }

            const textToSpeak = interaction.options.getString('text');
            await interaction.deferReply();

            // ตรวจสอบสถานะการเชื่อมต่อเดิม
            let connection = getVoiceConnection(interaction.guild.id);

            // ถ้าบอทยังไม่ได้เข้าห้อง หรืออยู่ผิดห้อง ให้ดึงบอทเข้าห้องเสียงปัจจุบันทันที
            if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
                connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false
                });

                logToFile('JOIN', `บอทเข้าห้องเสียง: ${voiceChannel.name} (${voiceChannel.id}) ในเซิร์ฟเวอร์ ${interaction.guild.name}`);

                // 🛡️ ระบบ Anti-Disconnect: ถ้าบอทถูกเตะหรือสัญญาณหลุด ให้พยายามเชื่อมต่อใหม่ถาวร
                connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    logToFile('WARNING', `บอทหลุดจากห้อง ${voiceChannel.name} กำลังพยายามเชื่อมต่อกลับอัตโนมัติ...`);
                    try {
                        await Promise.race([
                            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                        logToFile('RECONNECT', `เชื่อมต่อกลับห้อง ${voiceChannel.name} สำเร็จ`);
                    } catch (error) {
                        try { connection.destroy(); } catch {}
                        try {
                            joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: interaction.guild.id,
                                adapterCreator: interaction.guild.voiceAdapterCreator,
                                selfDeaf: false,
                                selfMute: false
                            });
                            logToFile('SUCCESS', `ดึงบอทกลับเข้าห้อง ${voiceChannel.name} สำเร็จเรียบร้อย`);
                        } catch (reconnectErr) {
                            logToFile('CRITICAL', `ไม่สามารถต่อสายกลับห้องเสียงได้: ${reconnectErr.message}`);
                        }
                    }
                });
            }

            // แปลงข้อความ TTS
            let stream;
            try {
                stream = await simplementts.getVoiceStream(textToSpeak, { lang: 'th' });
            } catch (ttsError) {
                logToFile('TTS_ERROR', ttsError.message);
                console.error('TTS Error:', ttsError);
                return interaction.editReply('❌ เกิดข้อผิดพลาดในการสร้างเสียงพูด');
            }

            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            // ดัก Error กันตัวเล่นเสียงค้าง/ดับ
            player.on('error', error => {
                logToFile('PLAYER_ERROR', error.message);
                console.error('Audio Player Error:', error);
            });

            connection.subscribe(player);
            player.play(resource);

            const embedSpeak = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ 
                    name: 'VOICE TTS SYSTEM', 
                    iconURL: ICONS.SPEAK 
                })
                .setTitle('กำลังพูดข้อความในห้องเสียง')
                .setDescription(`\`\`\`${textToSpeak}\`\`\``)
                .addFields(
                    { name: 'ห้องเสียง', value: `${voiceChannel.name}`, inline: true },
                    { name: 'ผู้สั่งการ', value: `${interaction.user.username}`, inline: true },
                    { name: 'สถานะระบบ', value: '🟢 ปักหลักถาวร + บันทึก Log แล้ว', inline: false }
                )
                .setImage('https://img1.pic.in.th/images/Neon-Bear-Gamer-Welcome-Lounge.png')
                .setFooter({ 
                    text: `${interaction.client.user.username} | Text-to-Speech`, 
                    iconURL: ICONS.FOOTER 
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embedSpeak] });

            // 🔒 สั่งให้เมื่อพูดจบแล้ว ให้อยู่ในห้องต่อถาวร (ไม่มีการ destroy)
            player.on(AudioPlayerStatus.Idle, () => {
                // คงสถานะการเชื่อมต่อไว้ในห้องตลอดไป
            });

        } catch (error) {
            logToFile('EXECUTE_ERROR', error.message);
            console.error('Error in /speak:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('❌ เกิดข้อผิดพลาดบางประการในการสั่งงานเสียง').catch(() => {});
            }
        }
    },
};
