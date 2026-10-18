const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ai-config.json');
const sessionPath = path.join(__dirname, '../interview-sessions.json');

const ADMIN_ID = '1143741885098250281';

const interviewQuestions = [
    "1. แนะนำตัวหน่อยครับ (ชื่อเล่น / อายุ)",
    "2. ทำไมถึงสนใจอยากมาช่วยสร้างแมพ / ร่วมทีมกับเรา?",
    "3. มีทักษะอะไรที่ถนัดเป็นพิเศษบ้าง? (เช่น โมเดล, สคริปต์ Lua, ออกแบบฉาก, คุมระบบ)",
    "4. เคยมีผลงานการสร้างแมพหรือผลงานใน Roblox/เกมอื่นๆ มาก่อนไหม? *(กรุณาแนบลิงก์รูปภาพ ผลงาน หรือวิดีโอเพื่อประกอบการพิจารณา)*",
    "5. ปกติมีเวลาว่างให้โครงการนี้สัปดาห์ละกี่ชั่วโมง / ว่างช่วงวันไหนบ้าง?",
    "6. หากเจอความเห็นไม่ตรงกันในทีม คุณมีวิธีจัดการหรือรับมืออย่างไร?",
    "7. เคยใช้งานโปรแกรม Roblox Studio หรือโปรแกรมออกแบบ 3D อื่นๆ มานานแค่ไหนแล้ว?",
    "8. คาดหวังอะไรจากการเข้ามาเป็นส่วนหนึ่งของทีมงานเรา?",
    "9. ถ้าได้รับมอบหมายงานกะทันหัน พร้อมรับและทำส่งตามกำหนดได้ไหม?",
    "10. มีช่องทางการติดต่ออื่นๆ เพิ่มเติมไหม? *(เช่น Facebook / Line / Roblox Username)* — **กรุณาตรวจสอบข้อมูลทั้งหมดให้ครบถ้วนตามความจริงก่อนส่งระบบตรวจสอบ**"
];

function loadConfig() {
    if (!fs.existsSync(configPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

function loadSessions() {
    if (!fs.existsSync(sessionPath)) return new Map();
    try {
        const rawData = fs.readFileSync(sessionPath, 'utf8');
        const parsed = JSON.parse(rawData);
        return new Map(Object.entries(parsed));
    } catch (e) {
        return new Map();
    }
}

function saveSessions(mapObj) {
    try {
        const obj = Object.fromEntries(mapObj);
        fs.writeFileSync(sessionPath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
        console.error('⚠️ [Session Save Error]:', e.message);
    }
}

const activeInterviews = loadSessions();

module.exports = {
    async handleButton(interaction) {
        if (!interaction.isButton() || interaction.customId !== 'start_apply_btn') return false;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const userId = interaction.user.id;
        const guild = interaction.guild;
        const db = loadConfig();
        const logChannelId = db[guild.id]?.interviewLogChannel;

        if (!logChannelId) {
            return await interaction.editReply({
                content: '⚠️ แอดมินยังไม่ได้ตั้งค่าห้องรับผลสัมภาษณ์หลังบ้าน! กรุณาแจ้งแอดมินใช้คำสั่ง `/applysetup log` ก่อนครับ'
            });
        }

        // เช็กว่าถ้ามีเซสชันอยู่แล้ว และสถานะถูกปิดโดยแอดมิน (closed) ห้ามกดทำต่อ
        if (activeInterviews.has(userId)) {
            const existingSession = activeInterviews.get(userId);
            if (existingSession.status === 'closed') {
                return await interaction.editReply({
                    content: '❌ **เซสชันการสัมภาษณ์ของคุณถูกปิดการใช้งานชั่วคราวโดยแอดมิน!** กรุณาติดต่อแอดมินเพื่อเปิดใช้งานต่อ'
                });
            }
        }

        activeInterviews.delete(userId);
        saveSessions(activeInterviews);

        try {
            const dmChannel = await interaction.user.createDM();
            
            activeInterviews.set(userId, {
                guildId: guild.id,
                logChannelId: logChannelId,
                currentStep: 0,
                answers: [],
                status: 'active', // สถานะปกติ
                lastUpdated: Date.now()
            });
            saveSessions(activeInterviews);

            const startEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: 'SHGOX RECRUITMENT SYSTEM', iconURL: guild.iconURL({ dynamic: true }) || undefined })
                .setTitle(`🎙️ เริ่มต้นขั้นตอนการสัมภาษณ์ผู้สมัคร`)
                .setDescription(`ยินดีต้อนรับคุณ <@${userId}> สู่การสมัครทีมงานของ **${guild.name}** ครับ!\n\n> ⚠️ **คำแนะนำ:** กรุณากรอกข้อมูล **ตามความเป็นจริงทุกข้อ** และในข้อที่ให้ส่งผลงานสามารถแนบลิงก์รูปภาพหรือวิดีโอได้\n> 📌 เมื่อตอบครบทุกข้อและตรวจสอบความครบถ้วนแล้ว ระบบจะส่งให้แอดมินตรวจสอบทันที`)
                .addFields({ name: '📌 คำถามข้อที่ 1 / 10', value: `\`\`\`text\n${interviewQuestions[0]}\n\`\`\`` })
                .setFooter({ text: 'SHGOX Apply System • ขั้นตอนที่ 1 จาก 10' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('answer_question_btn')
                    .setLabel('✍️ กรอกคำตอบข้อที่ 1')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('apply_help_btn')
                    .setLabel('🚨 ฉุกเฉิน / แจ้งแอดมิน')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🆘')
            );

            await dmChannel.send({ embeds: [startEmbed], components: [row] });

            await interaction.editReply({
                content: '📩 บอทได้ส่งระบบสัมภาษณ์ไปที่แชตส่วนตัว (DM) ของคุณแล้ว! กรุณาเข้าไปกดปุ่มตอบคำถามได้เลยครับ ✨'
            });

        } catch (dmErr) {
            console.error('⚠️ [DM Fail]:', dmErr.message);
            await interaction.editReply({
                content: '❌ ไม่สามารถส่งข้อความถึงคุณทาง DM ได้! กรุณาเปิดการตั้งค่า **"Allow Direct Messages"** ของเซิร์ฟเวอร์นี้แล้วลองใหม่อีกครั้ง'
            });
        }

        return true;
    },

    async handleModalTrigger(interaction) {
        if (!interaction.isButton()) return false;

        if (interaction.customId === 'apply_help_btn') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            try {
                const adminUser = await interaction.client.users.fetch(ADMIN_ID).catch(() => null);
                if (adminUser) {
                    const alertEmbed = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('🚨 แจ้งเตือนฉุกเฉินระบบสมัครงาน (Apply System)')
                        .setDescription(`ผู้ใช้ **${interaction.user.tag}** (<@${interaction.user.id}>) กดปุ่มขอความช่วยเหลือ/แจ้งปัญหาขณะทำแบบสอบถามสัมภาษณ์`)
                        .addFields(
                            { name: '👤 ชื่อผู้ใช้', value: interaction.user.tag, inline: true },
                            { name: '🆔 User ID', value: interaction.user.id, inline: true },
                            { name: '⏰ เวลาที่แจ้ง', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                        )
                        .setTimestamp();

                    await adminUser.send({ embeds: [alertEmbed] });
                }
            } catch (err) {
                console.error('⚠️ [Admin Alert Fail]:', err.message);
            }

            return await interaction.editReply({
                content: '🚨 **ระบบได้ส่งเรื่องแจ้งเตือนไปยังแอดมินหลักเรียบร้อยแล้วครับ!** กรุณารอสักครู่ แอดมินจะรีบติดต่อกลับไปช่วยเหลือโดยเร็วที่สุดครับ'
            });
        }

        if (interaction.customId !== 'answer_question_btn') return false;

        const userId = interaction.user.id;
        if (!activeInterviews.has(userId)) {
            return await interaction.reply({ content: '⚠️ เซสชันการสัมภาษณ์ของคุณหมดอายุหรือถูกรีเซ็ตแล้ว กรุณากดเริ่มใหม่จากหน้าเซิร์ฟเวอร์', flags: [MessageFlags.Ephemeral] });
        }

        const session = activeInterviews.get(userId);
        if (session.status === 'closed') {
            return await interaction.reply({ content: '❌ เซสชันของคุณถูกปิดชั่วคราวโดยแอดมิน ไม่สามารถทำต่อได้ในขณะนี้', flags: [MessageFlags.Ephemeral] });
        }

        const currentQIndex = session.currentStep;
        const questionText = interviewQuestions[currentQIndex];

        const modal = new ModalBuilder()
            .setCustomId(`apply_modal_step_${currentQIndex}`)
            .setTitle(`คำถามข้อที่ ${currentQIndex + 1} จาก 10`);

        const answerInput = new TextInputBuilder()
            .setCustomId('answer_text')
            .setLabel(questionText.length > 45 ? questionText.slice(0, 42) + '...' : questionText)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('พิมพ์คำตอบของคุณตามความเป็นจริง (แนบลิงก์รูป/วิดีโอผลงานได้ถ้ามี)...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(answerInput));

        await interaction.showModal(modal);
        return true;
    },

    async handleModalSubmit(interaction) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith('apply_modal_step_')) return false;

        const userId = interaction.user.id;
        if (!activeInterviews.has(userId)) {
            return await interaction.reply({ content: '⚠️ เซสชันนี้หมดอายุหรือถูกรีเซ็ตแล้ว', flags: [MessageFlags.Ephemeral] });
        }

        const session = activeInterviews.get(userId);
        if (session.status === 'closed') {
            return await interaction.reply({ content: '❌ เซสชันของคุณถูกปิดชั่วคราว ไม่สามารถบันทึกคำตอบได้', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferUpdate();

        const userAnswer = interaction.fields.getTextInputValue('answer_text');

        session.answers.push({
            question: interviewQuestions[session.currentStep],
            answer: userAnswer
        });

        session.currentStep++;
        session.lastUpdated = Date.now();
        activeInterviews.set(userId, session);
        saveSessions(activeInterviews);

        if (session.currentStep < interviewQuestions.length) {
            const nextStep = session.currentStep + 1;
            const progressPercent = Math.round((session.currentStep / interviewQuestions.length) * 100);

            const nextEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({ name: `SHGOX RECRUITMENT • [${progressPercent}% Completed]` })
                .setTitle(`📌 คำถามข้อที่ ${nextStep} จาก 10`)
                .setDescription(`> ✅ บันทึกคำตอบเรียบร้อย! กรุณากรอกข้อมูลตามความเป็นจริงให้ครบถ้วน`)
                .addFields({ name: `💬 คำถามข้อที่ ${nextStep}`, value: `\`\`\`text\n${interviewQuestions[session.currentStep]}\n\`\`\`` })
                .setFooter({ text: `SHGOX Apply System • ขั้นตอนที่ ${nextStep} จาก 10` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('answer_question_btn')
                    .setLabel(`✍️ กรอกคำตอบข้อที่ ${nextStep}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('apply_help_btn')
                    .setLabel('🚨 ฉุกเฉิน / แจ้งแอดมิน')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🆘')
            );

            await interaction.channel.send({ embeds: [nextEmbed], components: [row] });

        } else {
            try {
                const client = interaction.client;
                const guild = await client.guilds.fetch(session.guildId).catch(() => null);
                const logChannel = await guild?.channels.fetch(session.logChannelId).catch(() => null);

                if (logChannel) {
                    const resultEmbed = new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle(`📄 รายงานผลการสัมภาษณ์ใหม่ (ตรวจสอบความครบถ้วนแล้ว)`)
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setDescription(`👤 **ผู้สมัคร:** <@${userId}> (\`${interaction.user.tag}\`)\n🆔 **Discord ID:** \`${userId}\`\n⏰ **ส่งข้อมูลเมื่อ:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                        .setTimestamp();

                    session.answers.forEach((item, index) => {
                        resultEmbed.addFields({
                            name: `📌 ข้อที่ ${index + 1}: ${item.question.split('. ')[1]}`,
                            value: item.answer.length > 1024 ? item.answer.slice(0, 1021) + '...' : item.answer,
                            inline: false
                        });
                    });

                    await logChannel.send({ embeds: [resultEmbed] });
                }

                const completeEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🎉 ยินดีด้วยครับ! ส่งใบสมัครเรียบร้อยแล้ว')
                    .setDescription('```ansi\n\u001b[1;32m[ STATUS: SUCCESS & VERIFIED ]\u001b[0m\n```\nระบบได้รับข้อมูลการตอบแบบสอบถามของคุณครบถ้วนทั้ง **10 ข้อ** (ตามความเป็นจริง) และจัดส่งให้ทีมงานแอดมินตรวจสอบเรียบร้อยแล้วครับ!\n\n📌 **กรุณารอประกาศผลการคัดเลือกในเซิร์ฟเวอร์ต่อไป ขอให้โชคดีครับ!** 🚀')
                    .setFooter({ text: 'SHGOX Official Recruitment System' })
                    .setTimestamp();

                await interaction.channel.send({ embeds: [completeEmbed], components: [] });

            } catch (err) {
                console.error('⚠️ [Submit Error]:', err.message);
                await interaction.channel.send('⚠️ เกิดข้อผิดพลาดในการส่งข้อมูลไปยังห้องหลังบ้าน กรุณาติดต่อแอดมิน');
            }

            activeInterviews.delete(userId);
            saveSessions(activeInterviews);
        }

        return true;
    },

    getAllSessions() {
        return activeInterviews;
    },

    getUserSession(userId) {
        return activeInterviews.get(userId) || null;
    },

    extendUserSession(userId) {
        if (activeInterviews.has(userId)) {
            const session = activeInterviews.get(userId);
            session.status = 'active'; // ปลดล็อกให้ทำต่อได้
            session.lastUpdated = Date.now();
            activeInterviews.set(userId, session);
            saveSessions(activeInterviews);
            return true;
        }
        return false;
    },

    resetUserSession(userId) {
        if (activeInterviews.has(userId)) {
            const session = activeInterviews.get(userId);
            session.status = 'active';
            session.currentStep = 0;
            session.answers = []; // รีเซ็ตคำตอบให้เริ่มใหม่แต่ข้อมูลเซสชันยังอยู่
            activeInterviews.set(userId, session);
            saveSessions(activeInterviews);
            return true;
        }
        return false;
    },

    closeUserSession(userId) {
        if (activeInterviews.has(userId)) {
            const session = activeInterviews.get(userId);
            session.status = 'closed'; // ปิดชั่วคราว ห้ามทำต่อ แต่ข้อมูลยังอยู่
            activeInterviews.set(userId, session);
            saveSessions(activeInterviews);
            return true;
        }
        return false;
    }
};
