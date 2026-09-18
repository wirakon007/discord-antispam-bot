// เก็บข้อมูลสแปม { userId: { count, lastTime } }
const spamTracker = new Map();

const LIMIT = 5; 
const ANNOUNCEMENT_CHANNEL_ID = '1462415081110503533';

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const channelWhereSpammed = message.channel;
    const now = Date.now();

    let userData = spamTracker.get(userId);

    // ถ้าพิมพ์เว้นช่วงเกิน 5 วินาที ให้รีเซิตนับ 1 ใหม่ แต่ถ้าพิมพ์รัวๆ จะนับบวกเพิ่มต่อเนื่อง
    if (!userData || (now - userData.lastTime > 5000)) {
        userData = { count: 1, lastTime: now };
    } else {
        userData.count += 1;
        userData.lastTime = now;
    }

    spamTracker.set(userId, userData);
    console.log(`[Anti-Spam] ${message.author.tag} พิมพ์แล้ว ${userData.count}/${LIMIT} ข้อความ`);

    // ถ้าพิมพ์ครบ 5 ข้อความรัวๆ (ภายใน 5 วินาทีต่อข้อความ)
    if (userData.count >= LIMIT) {
        spamTracker.delete(userId);

        try {
            const member = message.guild.members.cache.get(userId);

            if (message.guild.ownerId === userId) {
                console.log(`ไม่สามารถเตะ ${message.author.tag} ได้เนื่องจากเป็นเจ้าของเซิร์ฟเวอร์`);
                return;
            }

            if (member && member.kickable) {
                await member.kick('สแปมข้อความติดต่อกันเกินกำหนด');
                console.log(`[SUCCESS] เตะ ${message.author.tag} เรียบร้อยแล้ว!`);
            } else {
                console.log(`[ERROR] บอทไม่มีสิทธิ์เตะ ${message.author.tag}`);
                return;
            }

            const announcementChannel = message.guild.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);
            if (announcementChannel) {
                await announcementChannel.send(
                    `🚨 **แจ้งเตือนการลงโทษ:** ผู้ใช้ <@${userId}> (${message.author.tag}) ถูกเตะออกจากเซิร์ฟเวอร์เนื่องจากพิมพ์ข้อความสแปมติดต่อกัน ${LIMIT} ข้อความรัวๆ ที่ห้อง <#${channelWhereSpammed.id}>`
                );
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการเตะ:', error);
        }
    }
});