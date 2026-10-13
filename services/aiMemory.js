const fs = require('fs');
const path = require('path');

const memoryPath = path.join(__dirname, '../ai-memory.json');

// โหลดความจำทั้งหมด (ปลอดภัยและรองรับโครงสร้างหมวดหมู่)
function loadMemory() {
    if (fs.existsSync(memoryPath)) {
        try {
            const rawData = fs.readFileSync(memoryPath, 'utf8');
            const data = JSON.parse(rawData);
            return {
                facts: Array.isArray(data.facts) ? data.facts : [],
                userNotes: typeof data.userNotes === 'object' && data.userNotes !== null ? data.userNotes : {},
                categories: typeof data.categories === 'object' && data.categories !== null ? data.categories : {}
            };
        } catch (e) {
            console.error('Error reading memory file, resetting structure:', e.message);
            return { facts: [], userNotes: {}, categories: {} };
        }
    }
    return { facts: [], userNotes: {}, categories: {} };
}

// บันทึกความจำลงไฟล์
function saveMemory(data) {
    try {
        fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving memory file:', e.message);
    }
}

// ฟังก์ชันจดจำข้อมูลใหม่ (ป้องกันข้อมูลซ้ำ และจำกัดโควต้าไม่ให้ไฟล์บวม)
function rememberFact(newFact, category = 'general') {
    if (!newFact || typeof newFact !== 'string') return;
    
    const memory = loadMemory();
    const cleanFact = newFact.trim();

    // เช็คว่ามีข้อความนี้อยู่แล้วหรือยัง (Case-insensitive)
    const isDuplicate = memory.facts.some(fact => fact.toLowerCase() === cleanFact.toLowerCase());

    if (!isDuplicate) {
        memory.facts.push(cleanFact);

        if (!memory.categories[category]) {
            memory.categories[category] = [];
        }
        memory.categories[category].push(cleanFact);
        
        // จำกัดความจำรวมไม่เกิน 50 รายการ (ลบตัวเก่าสุดทิ้งอัตโนมัติ)
        if (memory.facts.length > 50) {
            const removed = memory.facts.shift();
            for (const cat in memory.categories) {
                memory.categories[cat] = memory.categories[cat].filter(f => f !== removed);
            }
        }
        
        saveMemory(memory);
    }
}

// ฟังก์ชันลบความจำด้วย Keyword
function forgetFact(keyword) {
    if (!keyword) return false;
    const memory = loadMemory();
    const initialLength = memory.facts.length;
    
    memory.facts = memory.facts.filter(fact => !fact.toLowerCase().includes(keyword.toLowerCase()));
    
    for (const cat in memory.categories) {
        memory.categories[cat] = memory.categories[cat].filter(fact => !fact.toLowerCase().includes(keyword.toLowerCase()));
    }

    if (memory.facts.length < initialLength) {
        saveMemory(memory);
        return true;
    }
    return false;
}

// ฟังก์ชันดึงความจำแบบวิเคราะห์คำค้นหา (ฉลาดและตรงประเด็นขึ้น)
function getMemoryContext(query = '') {
    const memory = loadMemory();
    if (memory.facts.length === 0) return 'ยังไม่มีความจำพิเศษ';

    if (query && query.trim() !== '') {
        // ตัดคำหยาบหรือคำฟุ่มเฟือยออก เพื่อดึงเฉพาะคีย์หลักไปค้นหาในความจำ
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        // ค้นหาข้อความที่ตรงกับคีย์เวิร์ดอย่างน้อย 1 คำ
        const relevantFacts = memory.facts.filter(fact => {
            const lowerFact = fact.toLowerCase();
            return words.some(word => lowerFact.includes(word));
        });

        if (relevantFacts.length > 0) {
            return relevantFacts.slice(-5).map((fact, index) => `${index + 1}. ${fact}`).join('\n');
        }
    }
    
    // ถ้าไม่มีคำค้นที่ตรงกัน ให้ดึงความจำล่าสุดมา 10 รายการพอดีๆ ไม่รก
    const latestFacts = memory.facts.slice(-10);
    return latestFacts.map((fact, index) => `${index + 1}. ${fact}`).join('\n');
}

module.exports = {
    rememberFact,
    forgetFact,
    getMemoryContext
};
