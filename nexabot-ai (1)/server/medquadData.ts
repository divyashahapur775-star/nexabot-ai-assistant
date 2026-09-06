/**
 * MedQuAD (Medical Question Answering Dataset) Knowledge Base & Engine
 * Curated from trusted medical sources (NIH, NIDDK, MedlinePlus, CDC, GARD)
 */

export interface MedQuADRecord {
  id: string;
  question: string;
  focus: string; // Disease / Condition / Medical entity
  category: 'Disease/Condition' | 'Treatment/Medication' | 'Symptom/Diagnosis' | 'Prevention/Lifestyle';
  source: 'NIH' | 'MedlinePlus' | 'NIDDK' | 'CDC' | 'GARD';
  answer: string;
  keywords: string[];
  entities: {
    diseases: string[];
    symptoms: string[];
    treatments: string[];
  };
}

export const MEDQUAD_DATABASE: MedQuADRecord[] = [
  {
    id: 'medquad_001',
    question: 'What are the symptoms and warning signs of Type 2 Diabetes?',
    focus: 'Type 2 Diabetes',
    category: 'Symptom/Diagnosis',
    source: 'NIDDK',
    keywords: ['diabetes', 'type 2', 'thirst', 'urination', 'fatigue', 'blurry vision', 'glucose', 'insulin', 'blood sugar'],
    entities: {
      diseases: ['Type 2 Diabetes', 'Hyperglycemia', 'Insulin Resistance'],
      symptoms: ['Increased thirst (polydipsia)', 'Frequent urination (polyuria)', 'Unexplained weight loss', 'Fatigue', 'Blurred vision', 'Slow-healing sores'],
      treatments: ['Blood glucose monitoring', 'Metformin', 'Insulin therapy', 'Dietary modification', 'Regular exercise']
    },
    answer: `**Type 2 Diabetes Clinical Summary (Source: NIDDK / MedQuAD):**

Type 2 diabetes develops when body cells become resistant to insulin or when the pancreas cannot produce sufficient insulin to regulate blood glucose levels.

**Primary Symptoms & Warning Signs:**
- **Polydipsia & Polyuria:** Excessively frequent urination and unquenchable thirst due to renal glucose dumping.
- **Persistent Fatigue & Lethargy:** Inability of cells to absorb glucose for metabolic cellular energy.
- **Blurred Vision:** Fluid shifts affecting the lens of the eye.
- **Paresthesia:** Tingling, numbness, or burning sensation in the hands and feet (peripheral neuropathy).
- **Acanthosis Nigricans:** Darkened skin patches in body folds (neck, axilla, groin).

**Diagnostic Thresholds:**
- Fasting Plasma Glucose $\\ge 126\\text{ mg/dL}$
- HbA1c $\\ge 6.5\\%$
- Oral Glucose Tolerance Test (2-hour) $\\ge 200\\text{ mg/dL}$`
  },
  {
    id: 'medquad_002',
    question: 'What are the causes, treatment options, and lifestyle modifications for Hypertension (High Blood Pressure)?',
    focus: 'Hypertension',
    category: 'Treatment/Medication',
    source: 'NIH',
    keywords: ['hypertension', 'blood pressure', 'systolic', 'diastolic', 'ace inhibitor', 'dash diet', 'heart', 'cardiovascular'],
    entities: {
      diseases: ['Hypertension', 'Essential Hypertension', 'Cardiovascular Disease', 'Stroke'],
      symptoms: ['Often asymptomatic (Silent Killer)', 'Occipital headaches', 'Dizziness', 'Shortness of breath', 'Chest tightness'],
      treatments: ['ACE inhibitors (Lisinopril)', 'ARBs (Losartan)', 'Calcium Channel Blockers (Amlodipine)', 'Thiazide diuretics', 'DASH diet', 'Sodium restriction (<2,300mg/day)']
    },
    answer: `**Hypertension Management & Treatment Protocol (Source: NIH / MedlinePlus):**

Hypertension is a chronic hemodynamic disorder defined as persistent arterial systolic pressure $\\ge 130\\text{ mmHg}$ or diastolic pressure $\\ge 80\\text{ mmHg}$.

**First-Line Pharmacological Interventions:**
1. **ACE Inhibitors / ARBs:** Lisinopril, Losartan, Valsartan (renal protective, reduces systemic vascular resistance).
2. **Dihydropyridine Calcium Channel Blockers:** Amlodipine (induces peripheral vasodilation).
3. **Thiazide Diuretics:** Chlorthalidone, Hydrochlorothiazide (promotes natriuresis).

**Evidence-Based Non-Pharmacological Interventions:**
- **DASH Dietary Pattern:** High in fruits, vegetables, potassium, and low in saturated fats.
- **Sodium Restriction:** Limit dietary sodium intake to $< 1,500 - 2,300\\text{ mg/day}$.
- **Aerobic Exercise:** Minimum 150 minutes/week of moderate-intensity cardiovascular training.`
  },
  {
    id: 'medquad_003',
    question: 'What causes Asthma flare-ups, and how is acute bronchospasm managed?',
    focus: 'Asthma',
    category: 'Disease/Condition',
    source: 'MedlinePlus',
    keywords: ['asthma', 'wheezing', 'bronchospasm', 'inhaler', 'albuterol', 'corticosteroid', 'shortness of breath', 'allergen'],
    entities: {
      diseases: ['Asthma', 'Bronchial Hyperresponsiveness', 'Allergic Asthma', 'Exercise-Induced Bronchoconstriction'],
      symptoms: ['Wheezing (expiratory)', 'Dyspnea (shortness of breath)', 'Chest tightness', 'Nocturnal cough'],
      treatments: ['Inhaled Short-Acting Beta-2 Agonists (SABA / Albuterol)', 'Inhaled Corticosteroids (ICS / Fluticasone, Budesonide)', 'Long-Acting Beta Agonists (LABA)', 'Leukotriene Receptor Antagonists (Montelukast)']
    },
    answer: `**Asthma Etiology & Pharmacotherapy (Source: MedlinePlus / MedQuAD):**

Asthma is a chronic inflammatory disorder of the conducting airways characterized by bronchial hyperresponsiveness and episodic, reversible airflow obstruction.

**Common Exacerbation Triggers:**
- Environmental aeroallergens (dust mites, pollen, mold, animal dander).
- Viral respiratory tract infections (Rhinovirus, RSV).
- Cold dry air, air pollution, particulate matter, and tobacco smoke.

**Stepwise Pharmacological Protocol:**
- **Rescue / Reliever:** Inhaled Short-Acting $\\beta_2$-Agonist (Albuterol 2 puffs every 4–6 hours PRN) for acute bronchodilation.
- **Maintenance / Controller:** Daily Inhaled Corticosteroid (Budesonide or Fluticasone) with or without Formoterol to suppress airway mucosal inflammation.`
  },
  {
    id: 'medquad_004',
    question: 'What are the diagnostic criteria, symptoms, and treatments for Migraine Headaches?',
    focus: 'Migraine',
    category: 'Disease/Condition',
    source: 'NIH',
    keywords: ['migraine', 'headache', 'aura', 'triptan', 'sumatriptan', 'photophobia', 'phonophobia', 'nausea', 'throbbing'],
    entities: {
      diseases: ['Migraine with Aura', 'Migraine without Aura', 'Chronic Migraine'],
      symptoms: ['Unilateral throbbing head pain', 'Photophobia (light sensitivity)', 'Phonophobia (sound sensitivity)', 'Nausea', 'Vomiting', 'Visual scintillating scotoma'],
      treatments: ['Triptans (Sumatriptan, Rizatriptan)', 'NSAIDs (Naproxen, Ibuprofen)', 'CGRP antagonists (Ubrogepant, Rimegepant)', 'Beta-blockers (Propranolol for prophylaxis)', 'Topiramate']
    },
    answer: `**Migraine Diagnosis & Therapeutic Management (Source: NIH / MedQuAD):**

Migraine is a complex neurovascular disorder involving cortical spreading depression and activation of the trigeminovascular system with release of vasoactive neuropeptides (such as CGRP).

**Clinical Characteristics:**
- **Pound Quality:** Pulsating, unilateral, moderate-to-severe intensity (typically lasting 4 to 72 hours).
- **Associated Features:** Marked photophobia, phonophobia, nausea, and osmophobia.
- **Aura Phase (in ~25-30%):** Transient focal neurological symptoms (visual zig-zag lights, blind spots, paresthesia).

**Acute Abortive Therapy:**
- 5-HT$_{1B/1D}$ Receptor Agonists (Sumatriptan 50–100mg PO or subcutaneous).
- Oral CGRP Receptor Antagonists (Gepants).
- Combination Analgesics (Acetaminophen / Aspirin / Caffeine).`
  },
  {
    id: 'medquad_005',
    question: 'What is Gastroesophageal Reflux Disease (GERD), what are its complications, and how is it treated?',
    focus: 'GERD',
    category: 'Treatment/Medication',
    source: 'NIDDK',
    keywords: ['gerd', 'acid reflux', 'heartburn', 'omeprazole', 'ppi', 'esophagitis', 'barrett esophagus', 'antacid'],
    entities: {
      diseases: ['GERD', 'Reflux Esophagitis', 'Barrett Esophagus', 'Hiatal Hernia'],
      symptoms: ['Pyrosis (Heartburn)', 'Acid regurgitation', 'Dysphagia', 'Chronic dry cough', 'Globus sensation', 'Dental erosions'],
      treatments: ['Proton Pump Inhibitors (Omeprazole, Pantoprazole)', 'H2 Receptor Antagonists (Famotidine)', 'Antacids', 'Elevating head of bed', 'Avoiding trigger foods']
    },
    answer: `**Gastroesophageal Reflux Disease (GERD) Protocol (Source: NIDDK / MedQuAD):**

GERD is a chronic digestive condition where gastric acid repeatedly flows back into the esophagus due to transient lower esophageal sphincter (LES) relaxation.

**Clinical Manifestations:**
- **Pyrosis (Heartburn):** Retrosternal burning sensation radiating toward the pharynx, often exacerbated postprandially or when supine.
- **Acid Regurgitation:** Sour or bitter taste in the hypopharynx.
- **Alarm Symptoms Warranting Endoscopy:** Dysphagia (difficulty swallowing), odynophagia (painful swallowing), unexplained hematemesis, or involuntary weight loss.

**Pharmacotherapy:**
- **Proton Pump Inhibitors (PPIs):** Omeprazole 20–40mg daily taken 30–60 minutes before the first meal.
- **H2 Blockers:** Famotidine 20mg twice daily for maintenance.
- **Long-term Complication Monitoring:** Barrett's esophagus (intestinal metaplasia of esophageal mucosa).`
  },
  {
    id: 'medquad_006',
    question: 'What are the symptoms, diagnostic tests, and clinical treatments for Hypothyroidism?',
    focus: 'Hypothyroidism',
    category: 'Disease/Condition',
    source: 'GARD',
    keywords: ['thyroid', 'hypothyroidism', 'levothyroxine', 'tsh', 'free t4', 'hashimoto', 'cold intolerance', 'weight gain', 'fatigue'],
    entities: {
      diseases: ['Hypothyroidism', 'Hashimoto Thyroiditis', 'Myxedema'],
      symptoms: ['Cold intolerance', 'Unexplained weight gain', 'Severe fatigue', 'Dry skin', 'Constipation', 'Bradycardia', 'Depression', 'Hair loss'],
      treatments: ['Synthetic Levothyroxine (T4 replacement)', 'Thyroid hormone monitoring (TSH calibration)', 'Iodine sufficiency evaluation']
    },
    answer: `**Hypothyroidism Clinical Overview (Source: GARD / MedQuAD):**

Hypothyroidism is an endocrine deficiency resulting from underproduction of thyroid hormones ($T_4$ and $T_3$) by the thyroid gland, most commonly triggered by autoimmune Hashimoto's thyroiditis.

**Diagnostic Laboratory Evaluation:**
- **Elevated Serum TSH ($> 4.5\\text{ mIU/L}$):** Primary indicator of pituitary compensation.
- **Low Free Thyroxine (Free $T_4$):** Confirms overt primary hypothyroidism.
- **Anti-TPO & Anti-Thyroglobulin Antibodies:** Confirms underlying autoimmune Hashimoto's etiology.

**Standard Medical Treatment:**
- **Levothyroxine (Synthroid / Generic $T_4$):** Standard dosing titrated at $1.6\\,\\mu\\text{g}/\\text{kg}/\\text{day}$ on an empty stomach with water, 30–60 minutes prior to breakfast.
- **Therapeutic Monitoring:** Serum TSH re-evaluation every 6–8 weeks until euthyroid stabilization.`
  },
  {
    id: 'medquad_007',
    question: 'What are the signs of Acute Myocardial Infarction (Heart Attack), and what emergency actions are required?',
    focus: 'Myocardial Infarction',
    category: 'Disease/Condition',
    source: 'CDC',
    keywords: ['heart attack', 'myocardial infarction', 'chest pain', 'cardiac', 'troponin', 'emergency', 'angina', 'coronary'],
    entities: {
      diseases: ['Acute Myocardial Infarction (STEMI / NSTEMI)', 'Coronary Artery Disease', 'Acute Coronary Syndrome'],
      symptoms: ['Crushing substernal chest pressure / angina', 'Radiation to left arm, neck, jaw, or epigastrium', 'Diaphoresis (cold sweats)', 'Severe dyspnea', 'Dizziness / presyncope', 'Nausea / atypical presentations in women & diabetics'],
      treatments: ['Immediate EMS activation (Call 911 / Emergency)', 'Chewable Aspirin (325mg non-enteric)', 'Sublingual Nitroglycerin', 'Emergency Percutaneous Coronary Intervention (PCI / Cardiac Cath)', 'Thrombolytics / Anticoagulants']
    },
    answer: `**Acute Myocardial Infarction (Source: CDC / MedlinePlus):**

🚨 **EMERGENCY MEDICAL PROTOCOL:**
A heart attack occurs when blood flow to a coronary artery is critically compromised, resulting in ischemic myocardial necrosis.

**Cardinal Symptoms:**
- **Substernal Pressure:** Sensation of intense squeezing, fullness, or crushing retrosternal pain lasting $>几\\text{ minutes}$.
- **Referred Pain:** Radiation to left shoulder, arm, back, neck, jaw, or upper abdomen.
- **Associated Signs:** Diaphoresis (profuse sweating), severe dyspnea, nausea, lightheadedness.

**Immediate First-Response Actions:**
1. **Activate Emergency Services (Dial 911 / EMS immediately).**
2. **Administer Chewable Aspirin (160–325 mg):** Inhibits platelet aggregation and thrombus propagation.
3. **Rest & Nitroglycerin:** If previously prescribed, administer 1 sublingual tablet under medical supervision while awaiting EMS.`
  },
  {
    id: 'medquad_008',
    question: 'What are the symptoms, stages, and prevention guidelines for Chronic Kidney Disease (CKD)?',
    focus: 'Chronic Kidney Disease',
    category: 'Disease/Condition',
    source: 'NIDDK',
    keywords: ['kidney', 'renal', 'ckd', 'gfr', 'creatinine', 'proteinuria', 'edema', 'dialysis'],
    entities: {
      diseases: ['Chronic Kidney Disease', 'End-Stage Renal Disease (ESRD)', 'Diabetic Nephropathy', 'Hypertensive Nephrosclerosis'],
      symptoms: ['Peripheral edema (swelling in ankles/legs)', 'Foamy urine (proteinuria)', 'Fatigue', 'Decreased appetite', 'Pruritus (itching)', 'Nocturia'],
      treatments: ['Blood pressure control (ACEi / ARB)', 'SGLT2 inhibitors (Dapagliflozin, Empagliflozin)', 'Low-protein & low-sodium diet', 'Hemodialysis or Peritoneal Dialysis (Stage 5)', 'Kidney transplantation']
    },
    answer: `**Chronic Kidney Disease (CKD) Overview (Source: NIDDK / MedQuAD):**

CKD involves gradual, irreversible loss of renal excretory and endocrine function defined as persistent GFR $< 60\\text{ mL/min}/1.73\\text{m}^2$ or persistent albuminuria for $>3\\text{ months}$.

**Staging by eGFR:**
- **Stage 1 & 2:** Kidney damage with normal/mildly decreased eGFR ($\\ge 60\\text{ mL/min}$).
- **Stage 3a/3b:** Moderate reduction ($30 - 59\\text{ mL/min}$).
- **Stage 4:** Severe reduction ($15 - 29\\text{ mL/min}$).
- **Stage 5 (Kidney Failure):** eGFR $< 15\\text{ mL/min}$ requiring renal replacement therapy (dialysis or transplant).

**Renoprotective Management:**
- Blood pressure optimization with ACE inhibitors or ARBs to reduce intraglomerular pressure.
- SGLT2 inhibitors for cardiovascular and renal risk mitigation.
- Monitoring of serum creatinine, eGFR, potassium, and urine albumin-to-creatinine ratio (uACR).`
  }
];
