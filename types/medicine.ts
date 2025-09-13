export interface Medicine {
  id: string;
  medicine_name: string;
  section_3_1_dosage?: string;
  section_4_precautions?: string;
  userid?: string | null;
  medicine_category?: string;
}
