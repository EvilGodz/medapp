from database import DatabaseConnection

CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS medicines (
    id SERIAL PRIMARY KEY,
    medicine_name TEXT NOT NULL,
    medicine_category TEXT NOT NULL,
    section_1_1_name TEXT,
    section_1_2_purpose TEXT,
    section_2_1_contraindications TEXT,
    section_2_2_warnings TEXT,
    section_3_1_dosage TEXT,
    section_3_2_missed_dose TEXT,
    section_3_3_overdose TEXT,
    section_4_precautions TEXT,
    section_5_1_severe_effects TEXT,
    section_5_2_mild_effects TEXT,
    section_6_storage TEXT,
    section_7_appearance_ingredients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
'''

def main():
    db = DatabaseConnection()
    if not db.connect():
        print("❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้")
        return
    print("✅ เชื่อมต่อฐานข้อมูลสำเร็จ")
    print("🔨 กำลังสร้างตาราง medicines (ถ้ายังไม่มี)...")
    if db.execute_query(CREATE_TABLE_SQL):
        print("✅ สร้างตาราง medicines สำเร็จหรือมีอยู่แล้ว")
    else:
        print("❌ สร้างตาราง medicines ไม่สำเร็จ")
    db.disconnect()

if __name__ == "__main__":
    main() 