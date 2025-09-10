import json
import logging
import os
import re
import urllib.parse
from pathlib import Path
from typing import Dict, List, Optional

import fitz  # PyMuPDF

# ตั้งค่า logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFExtractor:
    def __init__(self):
        self.text = ""
        self.medicine_data = {}
    
    def clean_pdf_path(self, pdf_path: str) -> str:
        """ทำความสะอาด PDF path ให้ใช้งานได้"""
        original_path = pdf_path
        
        try:
            # ลบ file:// ถ้ามี
            if pdf_path.startswith('file://'):
                pdf_path = pdf_path.replace('file://', '')
                logger.info(f"ลบ file:// prefix")
            
            # ลบ / หน้า path ในกรณี Windows
            if pdf_path.startswith('/') and ':' in pdf_path:
                pdf_path = pdf_path[1:]
                logger.info(f"ลบ / หน้า Windows path")
            
            # แปลง URL encoding
            pdf_path = urllib.parse.unquote(pdf_path)
            logger.info(f"แปลง URL encoding")
            
            # แปลงเป็น Path object
            path_obj = Path(pdf_path)
            if not path_obj.is_absolute():
                path_obj = path_obj.resolve()
            
            final_path = str(path_obj)
            logger.info(f"Path สุดท้าย: {final_path}")
            
            return final_path
            
        except Exception as e:
            logger.error(f"เกิดข้อผิดพลาดในการแปลง path: {e}")
            logger.error(f"Path เดิม: {original_path}")
            return pdf_path
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """แปลงข้อความจากไฟล์ PDF ด้วย PyMuPDF"""
        
        try:
            # ทำความสะอาด path
            cleaned_path = self.clean_pdf_path(pdf_path)
            
            # ตรวจสอบว่าไฟล์มีอยู่จริง
            if not Path(cleaned_path).exists():
                logger.error(f"ไม่พบไฟล์ PDF: {cleaned_path}")
                return ""
            
            logger.info(f"กำลังเปิดไฟล์: {cleaned_path}")
            
            # เปิดไฟล์ PDF
            doc = fitz.open(cleaned_path)
            text = ""
            
            # แปลงข้อความทุกหน้า
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text()
                text += page_text
                logger.info(f"แปลงหน้า {page_num + 1}: {len(page_text)} ตัวอักษร")
            
            # ปิดไฟล์
            doc.close()
            
            self.text = text
            logger.info(f"แปลงข้อความสำเร็จ (รวม {len(text)} ตัวอักษร)")
            
            # บันทึกข้อความเป็นไฟล์ txt ในโฟลเดอร์ที่กำหนด
            txt_folder = "F:/medicApp/medicines/info_medicinestxt"
            filename = Path(cleaned_path).stem
            output_filename = os.path.join(txt_folder, f"extracted_text_{filename}.txt")
            
            # ลบไฟล์เก่าถ้ามี
            if os.path.exists(output_filename):
                os.remove(output_filename)
                logger.info(f"ลบไฟล์ .txt เก่า: {output_filename}")
                
            # สร้างไฟล์ใหม่
            with open(output_filename, 'w', encoding='utf-8') as f:
                f.write(text)
            logger.info(f"บันทึกข้อความเป็นไฟล์: {output_filename}")
            
            return text
            
        except Exception as e:
            logger.error(f"ไม่สามารถแปลงข้อความจาก PDF: {e}")
            return ""
    
    def clean_text(self, text: str) -> str:
        """ทำความสะอาดข้อความ"""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'(\d+\.\d*)', r'\n\1', text)
        return text.strip()
    
    def find_section_boundaries(self, text: str) -> Dict[str, tuple]:
        """หาตำแหน่งเริ่มต้นและสิ้นสุดของแต่ละส่วน"""
        boundaries = {}
        
        section_patterns = {
            '1.1': [
                r'1\.1\.?\s*ยานี้มีชื่อว่าอะไร',
                r'1\.1\.?\s*ยานี้ชื่อว่าอะไร',
                r'1\.1\.?\s*ยานี้มีชอื่ว่าอะไร',
                r'1\.1\.?\s*ยานี้ชอื่ว่าอะไร',
                r'1\.1\.?\s*ยานี้มีชื่อ',
                r'1\.1\.?\s*ยานี้ชื่อ'
            ],
            '1.2': [
                r'1\.2\.\s*ยานี้ใช้เพื่ออะไร',
                r'1\.2\.?\s*ยานี้ใช้เพื่ออะไร',
                r'1\.2\s*ยานี้ใช้เพื่ออะไร'
            ],
            '2.1': [
                r'2\.1\.\s*ห้ามใช้ยานี้เมื่อไร',
                r'2\.1\.?\s*ห้ามใช้ยานี้เมื่อไร',
                r'2\.1\s*ห้ามใช้ยานี้เมื่อไร'
            ],
            '2.2': [
                r'2\.2\.?\s*ข้อควรระวัง\s*เมื่อใช้ยานี้',
                r'2\.2\.?\s*ข้อควรระวัง\s*เพื่อความปลอดภัยให้บอกแพทย์',
                r'2\.2\.?\s*ข้อควรระวัง\s*เพื่อความปลอดภัย',
                r'2\.2\.?\s*ข้อควรระวัง'
            ],
            '3.1': [
                r'3\.1\.?\s*ขนาดและวิธีใช้',
                r'3\.1\.?\s*ขนาดและวิธีใช',
                r'3\.1\.?\s*ขนาดและวิธี',
                r'3\.1\.?\s*ขนาดและวิธีใช้\s*น้ำหนักตัว',
                r'3\.1\.?\s*ขนาดและวิธีใช้\s*นํ้าหนักตัว'
            ],
            '3.2': [
                r'3\.2\.?\s*ถ้าลืมกินยาควรทำอย่างไร',
                r'3\.2\.?\s*ถ้าลืมกินยาควรทําอย่างไร',
                r'3\.2\.?\s*หากลืมกินยาควรทำอย่างไร',
                r'3\.2\.?\s*หากลืมกินยาควรทําอย่างไร',
                r'3\.2\.?\s*ถ้าลืมกินยา',
                r'3\.2\.?\s*หากลืมกินยา'
            ],
            '3.3': [
                r'3\.3\.?\s*ถ้ากินยาเกินขนาดที่แนะนำควรทำอย่างไร',
                r'3\.3\.?\s*ถ้ากินยาเกินขนาดที่แนะนําควรทําอย่างไร',
                r'3\.3\.?\s*ถ้ากินยานี้เกินขนาดที่แนะนำ\s*ควรทำอย่างไร',
                r'3\.3\.?\s*ถ้ากินยานี้เกินขนาดที่แนะนํา\s*ควรทําอย่างไร',
                r'3\.3\.?\s*ถ้ากินยาเกินขนาด'
            ],
            '4.': [
                r'4\.?\s*ข้อควรปฏิบัติระหว่างใช้ยา',
                r'4\.?\s*ข้อควรปฏิบัติระหว่างใชยา',
                r'4\.?\s*ข้อควรปฏิบัติระหว่างใช้ยานี้',
                r'4\.?\s*ข้อควรปฏิบัติ',
                r'4\.?\s*ข้อควรปฏิบัติระหว่างการใช้ยา'
            ],
            '5.1': [
                r'5\.1\.?\s*อาการที่ต้องหยุดยาแล้วรีบไปพบแพทย์',
                r'5\.1\.?\s*อาการที่ต้องหยุดยาแล้วไปพบแพทย์ทันที',
                r'5\.1\.?\s*อาการที่ต้องหยุดยา',
                r'5\.1\.?\s*อาการที่ตองหยุดยา',
                r'5\.1\.?\s*หากกินยาแล้วเกิดอาการ',
                r'5\.1\.?\s*หากกินยาแล้วเกิดอาการ\s*เช่น'
            ],
            '5.2': [
                r'5\.2\.?\s*อาการที่ไม่จำเป็นต้องหยุดยา\s*แต่ถ้ามีอาการรุนแรงให้ไปพบแพทย์',
                r'5\.2\.?\s*อาการที่ไม่จําเป็นต้องหยุดยา',
                r'5\.2\.?\s*อาการที่ไม่จำเป็น',
                r'5\.2\.?\s*หากจำเป็นต้องกินยานี้ต่อเนื่องแล้วเกิดอาการ',
                r'5\.2\.?\s*หากจําเป็นต้องกินยานี้ต่อเนื่องแล้วเกิดอาการ\s*เช่น'
            ],
            '6.': [
                r'6\.?\s*ควรเก็บยานี้อย่างไร',
                r'6\.?\s*ควรเก็บยา'
            ],
            '7.': [
                r'7\.?\s*ลักษณะและส่วนประกอบของยา',
                r'7\.?\s*ลักษณะและสวนประกอบของยา',
                r'7\.?\s*ลักษณะและส่วนประกอบ',
                r'7\.?\s*ลักษณะและส่วนประกอบของยานี้'
            ]
        }
        
        for section_num, patterns in section_patterns.items():
            found = False
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    start_pos = match.end()
                    end_pos = self._find_section_end(text, section_num, start_pos, section_patterns)
                    boundaries[section_num] = (start_pos, end_pos)
                    logger.info(f"✅ พบส่วน {section_num}: ตำแหน่ง {start_pos}-{end_pos}")
                    found = True
                    break
            
            if not found:
                logger.warning(f"❌ ไม่พบส่วน {section_num}")
        
        return boundaries
    
    def _find_section_end(self, text: str, current_section: str, start_pos: int, section_patterns: Dict) -> int:
        """หาตำแหน่งสิ้นสุดของส่วน"""
        sections_order = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3', '4.', '5.1', '5.2', '6.', '7.']
        
        try:
            current_index = sections_order.index(current_section)
            next_sections = sections_order[current_index + 1:]
        except ValueError:
            return len(text)
        
        end_pos = len(text)
        
        for next_section in next_sections:
            if next_section in section_patterns:
                for pattern in section_patterns[next_section]:
                    next_match = re.search(pattern, text[start_pos:], re.IGNORECASE)
                    if next_match:
                        end_pos = start_pos + next_match.start()
                        return end_pos
        
        return end_pos
    
    def extract_section_content(self, text: str, start_pos: int, end_pos: int) -> str:
        """แยกเนื้อหาของส่วนตามตำแหน่งที่กำหนด"""
        content = text[start_pos:end_pos].strip()
        content = re.sub(r'\s+', ' ', content)
        
        # ตัดหัวข้อส่วนถัดไป
        section_headers = [
            r'1\.1\.?\s*ยานี้', r'1\.2\.?\s*ยานี้', r'2\.1\.?\s*ห้าม',
            r'2\.2\.?\s*ข้อควร', r'3\.1\.?\s*ขนาด', r'3\.2\.?\s*ถ้าลืม',
            r'3\.3\.?\s*ถ้ากิน', r'4\.?\s*ข้อควร', r'5\.1\.?\s*อาการที่ต้อง',
            r'5\.2\.?\s*อาการที่ไม่', r'6\.?\s*ควรเก็บ', r'7\.?\s*ลักษณะ',
            r'1\.\s*ยานี้', r'2\.\s*ข้อควร', r'3\.\s*วิธี', r'4\.\s*ข้อควร',
            r'5\.\s*อันตราย', r'6\.\s*ควรเก็บ', r'7\.\s*ลักษณะ'
        ]
        
        for pattern in section_headers:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                content = content[:match.start()].strip()
                break
        
        return content
    
    def extract_bullet_points_only(self, content: str) -> str:
        """แยกข้อมูลที่มี • นำหน้าและข้อความสำคัญอื่นๆ"""
        if not content:
            return ""
        
        lines = content.split('\n')
        extracted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # หาบรรทัดที่เริ่มต้นด้วย •
            if line.startswith('•'):
                extracted_lines.append(line)
            # หรือหาบรรทัดที่มี • ในข้อความ
            elif '•' in line:
                # แยกข้อความที่มี • ออกมา
                parts = line.split('•')
                for i, part in enumerate(parts):
                    if i > 0:  # ข้าม part แรกที่อยู่ก่อน •
                        cleaned_part = part.strip()
                        if cleaned_part:
                            extracted_lines.append('• ' + cleaned_part)
            # เก็บข้อความสำคัญอื่นๆ ที่ไม่ใช่หัวข้อ
            elif (len(line) > 3 and 
                  not re.match(r'^\d+\.', line) and  # ไม่ใช่เลขหัวข้อ
                  not re.match(r'^[^\w]*$', line) and  # ไม่ใช่เครื่องหมายพิเศษล้วน
                  not re.match(r'^(ผู้ผลิต|ผู้นำเข้า|ผู้แทนจำหน่าย|เอกสารนี้|ศึกษาข้อมูลยา)', line)):  # ไม่ใช่คำที่ไม่ใช่เนื้อหา
                extracted_lines.append(line)
        
        return ' '.join(extracted_lines) if extracted_lines else content
    
    def clean_section_1_2_content(self, content: str) -> str:
        """ทำความสะอาดเนื้อหาส่วน 1.2 เพื่อลบหัวข้อ 2. ออก"""
        patterns_to_remove = [
            r'2\.?\s*ข้อควรรู้ก่อนใช้ยา.*',
            r'2\.\d+.*'
        ]
        
        for pattern in patterns_to_remove:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
        
        content = re.sub(r'\s+', ' ', content).strip()
        return content
    
    def extract_medicine_info(self, text: str, pdf_path: str = '') -> Dict:
        """แยกข้อมูลยาจากข้อความ"""
        logger.info("=== เริ่มการแยกข้อมูลยา ===")
        
        medicine_info = {
            'name': '',
            'category': '',
            'section_1_1_name': '',
            'section_1_2_purpose': '',
            'section_2_1_contraindications': '',
            'section_2_2_warnings': '',
            'section_3_1_dosage': '',
            'section_3_2_missed_dose': '',
            'section_3_3_overdose': '',
            'section_4_precautions': '',
            'section_5_1_severe_effects': '',
            'section_5_2_mild_effects': '',
            'section_6_storage': '',
            'section_7_appearance_ingredients': ''
        }
        
        print("\n" + "="*80)
        print("📋 การแยกข้อมูลยา")
        print("="*80)
        
        boundaries = self.find_section_boundaries(text)
        
        sections = {
            '1.1': ('section_1_1_name', '1.1 ยานี้มีชื่อว่าอะไร'),
            '1.2': ('section_1_2_purpose', '1.2 ยานี้ใช้เพื่ออะไร'),
            '2.1': ('section_2_1_contraindications', '2.1 ห้ามใช้ยานี้เมื่อไร'),
            '2.2': ('section_2_2_warnings', '2.2 ข้อควรระวัง'),
            '3.1': ('section_3_1_dosage', '3.1 ขนาดและวิธีใช้'),
            '3.2': ('section_3_2_missed_dose', '3.2 ถ้าลืมกินยา'),
            '3.3': ('section_3_3_overdose', '3.3 ถ้ากินยาเกิน'),
            '4.': ('section_4_precautions', '4. ข้อควรปฏิบัติ'),
            '5.1': ('section_5_1_severe_effects', '5.1 อาการรุนแรง'),
            '5.2': ('section_5_2_mild_effects', '5.2 อาการไม่รุนแรง'),
            '6.': ('section_6_storage', '6. วิธีเก็บยา'),
            '7.': ('section_7_appearance_ingredients', '7. ลักษณะและส่วนประกอบ')
        }
        
        current_main_section = ""
        sections_found = 0
        
        for section_num, (key, title) in sections.items():
            if section_num.startswith('1.') and current_main_section != "1":
                current_main_section = "1"
                print(f"\n1. **ยานี้คือยาอะไร**")
            elif section_num.startswith('2.') and current_main_section != "2":
                current_main_section = "2"
                print(f"\n2. **ข้อควรรู้ก่อนใช้ยา**")
            elif section_num.startswith('3.') and current_main_section != "3":
                current_main_section = "3"
                print(f"\n3. **วิธีใช้ยา**")
            elif section_num.startswith('4.') and current_main_section != "4":
                current_main_section = "4"
                print(f"\n4. **ข้อควรปฏิบัติระหว่างใช้ยา**")
            elif section_num.startswith('5.') and current_main_section != "5":
                current_main_section = "5"
                print(f"\n5. **อันตรายที่อาจเกิดจากยา**")
            elif section_num.startswith('6.') and current_main_section != "6":
                current_main_section = "6"
                print(f"\n6. **ควรเก็บยานี้อย่างไร**")
            elif section_num.startswith('7.') and current_main_section != "7":
                current_main_section = "7"
                print(f"\n7. **ลักษณะและส่วนประกอบของยา**")
            
            if section_num in boundaries:
                start_pos, end_pos = boundaries[section_num]
                section_content = self.extract_section_content(text, start_pos, end_pos)
                
                # ทำความสะอาดพิเศษสำหรับส่วน 1.2
                if section_num == '1.2':
                    section_content = self.clean_section_1_2_content(section_content)
                
                # แยกเฉพาะข้อมูลที่มี • นำหน้า
                section_content = self.extract_bullet_points_only(section_content)
                
                medicine_info[key] = section_content
                
                print(f"   {title}")
                if section_content:
                    lines = section_content.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and len(line) > 2:
                            print(f"       • {line}")
                    sections_found += 1
                else:
                    print(f"       • ไม่พบข้อมูล")
            else:
                print(f"   {title}")
                print(f"       • ไม่พบข้อมูล")
        
        # แยกชื่อยาและหมวดหมู่
        full_text_category_patterns = [
            r'ชนิด([^<\n]*?)(?:\s*ชื่อการค้า|\s*<|$)',  
            r'ชนิดยา([^<\n]*?)(?:\s*ชื่อการค้า|\s*<|$)'  
        ]
        
        for pattern in full_text_category_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                category = match.group(1).strip()
                # ลบเครื่องหมาย < และ > ออก (ถ้ามี)
                category = category.replace('<', '').replace('>', '').replace('[', '').replace(']', '').strip()
                # ลบช่องว่างเกินและจุลภาคท้าย (ถ้ามี)
                category = re.sub(r',\s*$', '', category).strip()
                medicine_info['category'] = category
                logger.info(f"พบหมวดหมู่ยาจาก 'ชนิด': {medicine_info['category']}")
                break
        
        # ค้นหาหมวดหมู่จากส่วนท้ายเอกสาร (ถ้ายังไม่พบ)
        if not medicine_info['category']:
            end_category_patterns = [
                r'ชนิด([^<\n]*?)(?=\n\s*เอกสารนี้เป็นข้อมูลโดยย่อ|\n\s*ศึกษาข้อมูลยา|\n\s*$)',  # ชนิดที่อยู่ท้ายเอกสาร
                r'ชนิดยา([^<\n]*?)(?=\n\s*เอกสารนี้เป็นข้อมูลโดยย่อ|\n\s*ศึกษาข้อมูลยา|\n\s*$)',  # ชนิดยาที่อยู่ท้ายเอกสาร
            ]
            
            for pattern in end_category_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    category = match.group(1).strip()
                    # ลบเครื่องหมาย < และ > ออก (ถ้ามี)
                    category = category.replace('<', '').replace('>', '').replace('[', '').replace(']', '').strip()
                    # ลบช่องว่างเกินและจุลภาคท้าย (ถ้ามี)
                    category = re.sub(r',\s*$', '', category).strip()
                    medicine_info['category'] = category
                    logger.info(f"พบหมวดหมู่ยาจากส่วนท้ายเอกสาร: {medicine_info['category']}")
                    break
        
        # ค้นหาชื่อยาจาก section 1.1
        if medicine_info['section_1_1_name']:
            name_patterns = [
                r'ยานี้มีชื่อว่า\s*([^\n•]+)',
                r'ยานี้ชื่อว่า\s*([^\n•]+)',
                r'ชื่อว่า\s*([^\n•]+)'
            ]
            
            for pattern in name_patterns:
                match = re.search(pattern, medicine_info['section_1_1_name'], re.IGNORECASE)
                if match:
                    medicine_info['name'] = match.group(1).strip()
                    break
        
        # ค้นหาชื่อยาจากส่วนท้ายของเอกสาร (ถ้ายังไม่พบจาก section 1.1)
        if not medicine_info['name']:
            # ค้นหาชื่อยาที่อยู่ท้ายเอกสาร (ก่อนส่วน "เอกสารนี้เป็นข้อมูลโดยย่อ")
            end_document_patterns = [
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม\s*ชนิด[^\n]*?(?=\n\s*เอกสารนี้เป็นข้อมูลโดยย่อ|\n\s*ศึกษาข้อมูลยา|\n\s*$)',  # เช่น "พาราเซตามอล ขนาด 500 มิลลิกรัม ชนิดเม็ด"
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม(?=\n\s*เอกสารนี้เป็นข้อมูลโดยย่อ|\n\s*ศึกษาข้อมูลยา|\n\s*$)',  # เช่น "พาราเซตามอล ขนาด 500 มิลลิกรัม"
                r'([^<\n]*?)\s*ชนิด[^\n]*?(?=\n\s*เอกสารนี้เป็นข้อมูลโดยย่อ|\n\s*ศึกษาข้อมูลยา|\n\s*$)',  # เช่น "พาราเซตามอล ชนิดเม็ด"
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม\s*ชนิด[^\n]*?(?=\n\s*$)',  # กรณีที่อยู่บรรทัดสุดท้าย
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม(?=\n\s*$)',  # กรณีที่อยู่บรรทัดสุดท้าย
            ]
            
            for pattern in end_document_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    potential_name = match.group(1).strip()
                    # ตรวจสอบว่าไม่ใช่ส่วนหัวข้อหรือคำที่ไม่ใช่ชื่อยา
                    if (len(potential_name) > 2 and 
                        not re.search(r'^\d+\.', potential_name) and  # ไม่ใช่เลขหัวข้อ
                        not re.search(r'^[^\w]*$', potential_name) and  # ไม่ใช่เครื่องหมายพิเศษล้วน
                        not re.search(r'^(ผู้ผลิต|ผู้นำเข้า|ผู้แทนจำหน่าย|เอกสารนี้)', potential_name)):  # ไม่ใช่คำที่ไม่ใช่ชื่อยา
                        medicine_info['name'] = potential_name
                        logger.info(f"พบชื่อยาจากส่วนท้ายเอกสาร: {medicine_info['name']}")
                        break
        
        # ค้นหาชื่อยาจากส่วนบนของเอกสาร (ถ้ายังไม่พบ)
        if not medicine_info['name']:
            # ค้นหาชื่อยาที่อยู่ส่วนบนของเอกสาร
            top_document_patterns = [
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม\s*ชนิด[^\n]*?(?=\n\s*คำเตือน|\n\s*1\.|\n\s*$)',  # ชื่อยาที่อยู่ก่อนคำเตือน
                r'([^<\n]*?)\s*ขนาด\s*\d+\s*มิลลิกรัม(?=\n\s*คำเตือน|\n\s*1\.|\n\s*$)',  # ชื่อยาที่อยู่ก่อนคำเตือน
            ]
            
            for pattern in top_document_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    potential_name = match.group(1).strip()
                    # ตรวจสอบว่าไม่ใช่ส่วนหัวข้อหรือคำที่ไม่ใช่ชื่อยา
                    if (len(potential_name) > 2 and 
                        not re.search(r'^\d+\.', potential_name) and  # ไม่ใช่เลขหัวข้อ
                        not re.search(r'^[^\w]*$', potential_name) and  # ไม่ใช่เครื่องหมายพิเศษล้วน
                        not re.search(r'^(ผู้ผลิต|ผู้นำเข้า|ผู้แทนจำหน่าย|เอกสารนี้)', potential_name)):  # ไม่ใช่คำที่ไม่ใช่ชื่อยา
                        medicine_info['name'] = potential_name
                        logger.info(f"พบชื่อยาจากส่วนบนเอกสาร: {medicine_info['name']}")
                        break
        
        # ค้นหาชื่อยาจากชื่อไฟล์ (ถ้ายังไม่พบ)
        if not medicine_info['name'] and pdf_path:
            filename = Path(pdf_path).stem
            if filename:
                # ลบคำที่ไม่ใช่ชื่อยาออกจากชื่อไฟล์
                cleaned_filename = re.sub(r'[_\-\s]+', ' ', filename)
                cleaned_filename = re.sub(r'extracted|text|media|\(\d+\)', '', cleaned_filename, flags=re.IGNORECASE)
                cleaned_filename = cleaned_filename.strip()
                
                if len(cleaned_filename) > 2:
                    medicine_info['name'] = cleaned_filename
                    logger.info(f"ใช้ชื่อยาจากชื่อไฟล์: {medicine_info['name']}")
        
        return medicine_info
    
    def convert_to_json(self, medicine_info: Dict) -> str:
        """แปลงข้อมูลเป็น JSON"""
        try:
            return json.dumps(medicine_info, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"ไม่สามารถแปลงเป็น JSON: {e}")
            return ""
    
    def process_pdf(self, pdf_path: str) -> Dict:
        """ประมวลผลไฟล์ PDF ทั้งหมด"""
        logger.info(f"เริ่มประมวลผลไฟล์: {pdf_path}")
        
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return {}
        
        cleaned_text = self.clean_text(text)
        medicine_info = self.extract_medicine_info(cleaned_text, pdf_path)
        
        return medicine_info