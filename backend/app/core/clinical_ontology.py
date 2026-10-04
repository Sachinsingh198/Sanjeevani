"""
Clinical Ontology & Registry for Sanjeevani.
Contains canonical condition definitions, multilingual diagnosis templates,
targeted follow-up questions, and differential diagnosis scoring.
"""

import re
from typing import Dict, Any, Optional, List, Tuple

CLINICAL_SYMPTOM_REGISTRY: Dict[str, Dict[str, Any]] = {
    "allergic_rhinitis": {
        "keywords": (
            "allergic rhinitis", "chronic rhinitis", "nasal allergy", "dust allergy",
            "dhool se allergy", "mausami allergy", "purani allergy", "allergic", "rhinitis",
            "peenas", "sinusitis", "pollen allergy"
        ),
        "diagnosis_hin": "Purani Nasal Allergy / Vata-Kaphaja Pratishyaya (दीर्घकालिक नासा प्रकोपित अवस्था)",
        "diagnosis_eng": "Allergic Rhinitis and Nasal Irritation (Vata-Kaphaja Pratishyaya)",
        "diagnosis_garh_dev": "धूल या मौसमी एलर्जी से नाक मा रुकावट और छींक (प्रतिश्याय)।",
        "diagnosis_garh_rom": "Dhool ya mausami allergy se naak ma rukawat aur chheenk (Pratishyaya).",
        "spoken_hin": "naak ki allergy aur chheenk",
        "spoken_garh_dev": "नाक की एलर्जी और छींक",
        "spoken_garh_rom": "naak ki allergy aur chheenk",
        "t1_hin": "Maine aapki takleef sun li. Yeh allergy ya naak ki samasya kitne samay se hai?",
        "t2_hin": "Theek hai. Kya dhool-mitti ya mausam badalne par achanak chhinkon ki jhad lagti hai?",
        "t1_eng": "I understand. How long have you had this nasal allergy or recurrent sneezing?",
        "t2_eng": "Understood. Does exposure to dust, pollen, or weather changes trigger sudden sneezing?",
        "t1_garh_dev": "त्वरि बात सुणी ली। ये एलर्जी कतगा दिन बटि छ?",
        "t1_garh_rom": "Twari baat suni li. Yeh allergy katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या धूल या मौसम बदलणा पर छींक बढ़णी छन?",
        "t2_garh_rom": "Theek chha. Kya dhool ya mausam badalna par chheenk badhni chhan?",
    },
    "joint_pain": {
        "keywords": (
            "jod", "jodo", "jodon", "ghutna", "ghutne", "ghutno",
            "sandhi", "sandhivata", "gathiya", "joint", "joints", "arthritis", "stiffness", "jakdan", "amavata"
        ),
        "diagnosis_hin": "Jodon mein jakdan aur dard / Sandhivata (संधिवात / Osteoarthritis or Joint Inflammation)",
        "diagnosis_eng": "Joint inflammation, stiffness and discomfort (Sandhivata)",
        "diagnosis_garh_dev": "संधिवात या स्याल से गोड़ों (घुटनों) और जोड़ों मा पीर और जकड़न (Sandhivata)।",
        "diagnosis_garh_rom": "Sandhivata ya syal se godo (ghutno) aur jodo ma peed aur jakdan (Sandhivata).",
        "spoken_hin": "jodon mein dard aur sandhivata",
        "spoken_garh_dev": "जोड़ों मा पीर और संधिवात",
        "spoken_garh_rom": "jodo ma peed aur sandhivata",
        "t1_hin": "Samajh gayi. Jodon ya ghutnon mein dard kab se ho raha hai?",
        "t2_hin": "Theek hai. Kya subah uthne par jodon mein zyada jakdan ya soojan rehti hai?",
        "t1_eng": "I understand. How long have you had this joint or knee pain?",
        "t2_eng": "Understood. Do you experience morning stiffness or swelling in the joints?",
        "t1_garh_dev": "गोड़ों या जोड़ों मा पीर कतगा दिन बटि छ?",
        "t1_garh_rom": "Godo ya jodo ma peed katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या ब्याळ उठिक जोड़ों मा जकड़न या सूजण भी छ?",
        "t2_garh_rom": "Theek chha. Kya byal uthik jodo ma jakdan ya soojan bhi chha?",
    },
    "back_pain": {
        "keywords": (
            "kamar", "peeth", "kamar dard", "peeth dard", "back pain", "lower back", "reedh", "reedh ki haddi",
            "katishoola", "sciatica", "kamar me", "peeth me", "peeth ma"
        ),
        "diagnosis_hin": "Kamar aur peeth mein khinchav / Katishoola (कटिशूल - Musculoskeletal Back Strain)",
        "diagnosis_eng": "Musculoskeletal lower back strain and stiffness (Katishoola)",
        "diagnosis_garh_dev": "कमर या पीठ मा खिंचाव और जकड़न (कटिशूल / Back Strain)।",
        "diagnosis_garh_rom": "Kamar ya peeth ma khinchav aur jakdan (Katishoola / Back Strain).",
        "spoken_hin": "kamar dard aur katishoola",
        "spoken_garh_dev": "कमर और पीठ मा पीर",
        "spoken_garh_rom": "kamar aur peeth ma peed",
        "t1_hin": "Samajh gayi. Kamar ya peeth mein dard kab se hai aur kya jhukne par badhta hai?",
        "t2_hin": "Theek hai. Kya dard taangon tak neeche jaata hai ya sunn-pan lagta hai?",
        "t1_eng": "I understand. How long have you had this back pain, and does it worsen when bending?",
        "t2_eng": "Understood. Does the pain radiate down your legs or cause any numbness?",
        "t1_garh_dev": "कमर या पीठ मा पीर कतगा दिन बटि छ?",
        "t1_garh_rom": "Kamar ya peeth ma peed katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या पीर खुट्टों का तरफ भी जाणी छ?",
        "t2_garh_rom": "Theek chha. Kya peed khutto ka taraf bhi jaani chha?",
    },
    "acidity": {
        "keywords": (
            "acidity", "jalan", "seene mein jalan", "chhati mein jalan", "khatti dakar",
            "amlapitta", "heartburn", "acid reflux", "pet mein jalan"
        ),
        "diagnosis_hin": "Pitta dosha aur khan-paan se acidity / amlapitta (अम्लपित्त - Hyperacidity / Acid Reflux)",
        "diagnosis_eng": "Hyperacidity and acid reflux (Amlapitta)",
        "diagnosis_garh_dev": "खान-पान और पित्त से छाती और पैट मा जलन (अम्लपित्त / Acidity)।",
        "diagnosis_garh_rom": "Khan-paan aur pitta se chhati aur pet ma jalan (Amlapitta / Acidity).",
        "spoken_hin": "acidity aur amlapitta ki samasya",
        "spoken_garh_dev": "छाती मा जलन और अम्लपित्त",
        "spoken_garh_rom": "chhati ma jalan aur amlapitta",
        "t1_hin": "Samajh gayi. Seene ya pet mein jalan ki samasya kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya khana khane ke baad khatti dakar ya matli hoti hai?",
        "t1_eng": "I understand. How long have you been having this acidity or heartburn?",
        "t2_eng": "Understood. Do you experience sour burps or nausea after meals?",
        "t1_garh_dev": "पैट या छाती मा जलन कतगा दिन बटि छ?",
        "t1_garh_rom": "Pet ya chhati ma jalan katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या खाना खाणा बाद खट्टी डकार भी औणी छन?",
        "t2_garh_rom": "Theek chha. Kya khana khana baad khatti dakar bhi auni chhan?",
    },
    "diarrhea": {
        "keywords": (
            "dast", "loose motion", "loose motions", "patla pet", "atisara", "diarrhea", "pet kharab", "jhada"
        ),
        "diagnosis_hin": "Pachan gadbadi se dast aur patla pet / Atisara (अतिसार - Acute Diarrheal Illness)",
        "diagnosis_eng": "Acute diarrheal illness and digestive disturbance (Atisara)",
        "diagnosis_garh_dev": "अपच और दूषित पाणी से दस्त और पैट खराब (अतिसार)।",
        "diagnosis_garh_rom": "Apach aur dooshit paani se dast aur pet kharab (Atisara).",
        "spoken_hin": "dast aur atisara ki samasya",
        "spoken_garh_dev": "दस्त और पैट खराब की समस्या",
        "spoken_garh_rom": "dast aur pet kharab ki samasya",
        "t1_hin": "Dast kitne samay se ho rahe hain aur din mein kitni baar hue?",
        "t2_hin": "Theek hai. Kya dast ke sath ulti, bukhar ya marod bhi ho rahi hai?",
        "t1_eng": "How long have you had loose motions, and how many times today?",
        "t2_eng": "Understood. Do you also have abdominal cramps, fever, or vomiting?",
        "t1_garh_dev": "दस्त कतगा दिन बटि लग्यूँ छ और दिन मा कतगा बार ह्वा?",
        "t1_garh_rom": "Dast katga din bati lagyu chha aur din ma katga baar hwa?",
        "t2_garh_dev": "ठीक छ। क्या दस्त दगड़ मरोड़ या उलटी भी छ?",
        "t2_garh_rom": "Theek chha. Kya dast dagad marod ya ulti bhi chha?",
    },
    "constipation": {
        "keywords": (
            "kabz", "constipation", "pet saaf nahi", "pet saaf", "latrine tight", "shauch saaf nahi", "vibandha", "kosthabaddhata"
        ),
        "diagnosis_hin": "Rukha aahar aur pachan sust hone se kabz / Vibandha (विबन्ध - Chronic Constipation)",
        "diagnosis_eng": "Sluggish bowel motility and chronic constipation (Vibandha)",
        "diagnosis_garh_dev": "पैट साफ नी हुण और कब्ज की दिक्कत (विबन्ध)।",
        "diagnosis_garh_rom": "Pet saaf ni hun aur kabz ki dikkat (Vibandha).",
        "spoken_hin": "kabz aur pet saaf na hone ki samasya",
        "spoken_garh_dev": "कब्ज और पैट साफ नी हुण",
        "spoken_garh_rom": "kabz aur pet saaf ni hun",
        "t1_hin": "Pet saaf na hone ki takleef kitne din se hai?",
        "t2_hin": "Theek hai. Kya pet mein bhaari-pan, gas ya shauch ke waqt dard hota hai?",
        "t1_eng": "How many days have you had difficulty passing stools?",
        "t2_eng": "Understood. Do you experience abdominal heaviness, gas, or straining?",
        "t1_garh_dev": "पैट साफ नी हुण कतगा दिन बटि छ?",
        "t1_garh_rom": "Pet saaf ni hun katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या पैट मा भारीपन या गैस भी बणनी छ?",
        "t2_garh_rom": "Theek chha. Kya pet ma bhaareepan ya gas bhi banni chha?",
    },
    "urinary_issues": {
        "keywords": (
            "peshab jalan", "peshab me jalan", "peshab mein jalan", "urine burning", "mutrakrichchhra",
            "peshab me dard", "burning micturition", "peshab", "urine", "mutra"
        ),
        "diagnosis_hin": "Peshab mein jalan aur asuvidha / Mutrakrichchhra (मूत्रकृच्छ्र - Dysuria / UTI Symptoms)",
        "diagnosis_eng": "Urinary tract irritation and dysuria (Mutrakrichchhra)",
        "diagnosis_garh_dev": "पेशाब मा जलन और पीर (मूत्रकृच्छ्र)।",
        "diagnosis_garh_rom": "Peshab ma jalan aur peed (Mutrakrichchhra).",
        "spoken_hin": "peshab mein jalan aur mutrakrichchhra",
        "spoken_garh_dev": "पेशाब मा जलन और तकलीफ",
        "spoken_garh_rom": "peshab ma jalan aur takleef",
        "t1_hin": "Peshab mein jalan kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya peshab ke sath bukhar, thand ya kamar mein dard hai?",
        "t1_eng": "How long have you felt burning when urinating?",
        "t2_eng": "Understood. Do you have any fever, chills, or lower back pain with it?",
        "t1_garh_dev": "पेशाब मा जलन कतगा दिन बटि छ?",
        "t1_garh_rom": "Peshab ma jalan katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या पेशाब दगड़ बुखार या कमर मा पीर भी छ?",
        "t2_garh_rom": "Theek chha. Kya peshab dagad bukhar ya kamar ma peed bhi chha?",
    },
    "dental_pain": {
        "keywords": (
            "daant", "dant", "daant dard", "dant dard", "tooth pain", "toothache", "masooda", "masudo",
            "masoodon", "danta shoola", "teeth", "tooth", "daanth"
        ),
        "diagnosis_hin": "Daant aur masoodon mein dard / Danta Shoola (दन्तशूल - Dental Pain / Gingival Irritation)",
        "diagnosis_eng": "Dental discomfort and gum sensitivity (Danta Shoola)",
        "diagnosis_garh_dev": "दाँत या मसूड़ों मा पीर और सूजन (दन्तशूल)।",
        "diagnosis_garh_rom": "Daant ya masudo ma peed aur soojan (Danta Shoola).",
        "spoken_hin": "daant dard aur danta shoola",
        "spoken_garh_dev": "दाँत मा पीर और मसूड़ों की सूजन",
        "spoken_garh_rom": "daant ma peed aur masudo ki soojan",
        "t1_hin": "Daant ya masoodon mein dard kab se ho raha hai?",
        "t2_hin": "Theek hai. Kya thanda ya garam paani peene par jhanjhanahat hoti hai ya sujan hai?",
        "t1_eng": "How long have you had this tooth or gum pain?",
        "t2_eng": "Understood. Is there sensitivity to cold or hot liquids, or any visible gum swelling?",
        "t1_garh_dev": "दाँत मा पीर कतगा दिन बटि छ?",
        "t1_garh_rom": "Daant ma peed katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या ठण्डू पाणी पिणा पर झनझनाहट या सूजन छ?",
        "t2_garh_rom": "Theek chha. Kya thandu paani pina par jhanjhanahat ya soojan chha?",
    },
    "ear_pain": {
        "keywords": (
            "kaan", "kaan dard", "kaan me dard", "ear pain", "ear ache", "karna shoola", "ear"
        ),
        "diagnosis_hin": "Kaan mein dard aur sardi se sansanahat / Karna Shoola (कर्णशूल - Otalgia / Ear Discomfort)",
        "diagnosis_eng": "Ear canal inflammation and otalgia (Karna Shoola)",
        "diagnosis_garh_dev": "स्याल या पानी जाण से कान मा पीर (कर्णशूल)।",
        "diagnosis_garh_rom": "Syal ya paani jaan se kaan ma peed (Karna Shoola).",
        "spoken_hin": "kaan dard aur karna shoola",
        "spoken_garh_dev": "कान मा पीर और दर्द",
        "spoken_garh_rom": "kaan ma peed aur dard",
        "t1_hin": "Kaan mein dard kab se ho raha hai?",
        "t2_hin": "Theek hai. Kya kaan se paani ya peep beh raha hai ya sunayi kam de raha hai?",
        "t1_eng": "How long have you had this ear pain?",
        "t2_eng": "Understood. Is there any discharge or reduction in hearing from that ear?",
        "t1_garh_dev": "कान मा पीर कतगा दिन बटि छ?",
        "t1_garh_rom": "Kaan ma peed katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या कान बटि पाणी औणु छ या कम सुणीणु छ?",
        "t2_garh_rom": "Theek chha. Kya kaan bati paani aunu chha ya kam suninu chha?",
    },
    "eye_problems": {
        "keywords": (
            "aankh laal", "aankhon me dard", "eye pain", "aankhon mein jalan", "netra roga",
            "aankh me kichad", "conjunctivitis", "aankh dukhna"
        ),
        "diagnosis_hin": "Aankhon mein jalan aur laal-pan / Netra Abhishyanda (नेत्राभिश्यन्द - Conjunctival Irritation)",
        "diagnosis_eng": "Conjunctival redness and eye surface inflammation (Netra Abhishyanda)",
        "diagnosis_garh_dev": "धूल या स्याल से आँख्युं मा लाली और पीर (नेत्र विकार)।",
        "diagnosis_garh_rom": "Dhool ya syal se aankhyu ma laali aur peed (Netra Vikar).",
        "spoken_hin": "aankhon mein jalan aur laal-pan",
        "spoken_garh_dev": "आँख्युं मा जलन और लाली",
        "spoken_garh_rom": "aankhyu ma jalan aur laali",
        "t1_hin": "Aankhon mein jalan ya laali kab se hai?",
        "t2_hin": "Theek hai. Kya aankhon se kichad aa raha hai ya roshni dekhne mein dikkat hai?",
        "t1_eng": "How long have your eyes been red or irritated?",
        "t2_eng": "Understood. Is there any sticky discharge or light sensitivity?",
        "t1_garh_dev": "आँख्युं मा लाली या जलन कतगा दिन बटि छ?",
        "t1_garh_rom": "Aankhyu ma laali ya jalan katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या आँख्युं बटि कीचड़ भी औणु छ?",
        "t2_garh_rom": "Theek chha. Kya aankhyu bati keechad bhi aunu chha?",
    },
    "menstrual_issues": {
        "keywords": (
            "mahavari", "periods", "masik dharm", "periods me dard", "artava", "dysmenorrhea",
            "period pain", "irregular periods", "mahina rukna"
        ),
        "diagnosis_hin": "Masik dharm mein aniyamitta aur dard / Kashtartava (कष्टार्तव - Dysmenorrhea)",
        "diagnosis_eng": "Menstrual cramping and irregularity (Kashtartava)",
        "diagnosis_garh_dev": "मासिक धर्म मा पीर और अनियमितता (कष्टार्तव)।",
        "diagnosis_garh_rom": "Masik dharm ma peed aur aniyamitta (Kashtartava).",
        "spoken_hin": "masik dharm aur mahavari mein dard",
        "spoken_garh_dev": "मासिक धर्म मा पीर और तकलीफ",
        "spoken_garh_rom": "masik dharm ma peed aur takleef",
        "t1_hin": "Periods mein yeh takleef kitne din se ya kab se shuru hui?",
        "t2_hin": "Theek hai. Kya pet ke nichle hisse mein tez ainthan ya zyada bleeding hai?",
        "t1_eng": "How long have you been having menstrual cramps or irregularity?",
        "t2_eng": "Understood. Is the lower abdominal cramping severe, or is flow excessively heavy?",
        "t1_garh_dev": "महीना का बखत पीर कतगा दिन बटि छ?",
        "t1_garh_rom": "Mahina ka bakhat peed katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या पैट का निचला भाग मा तेज मरोड़ छ?",
        "t2_garh_rom": "Theek chha. Kya pet ka nichla bhaag ma tezz marod chha?",
    },
    "diabetes_symptoms": {
        "keywords": (
            "sugar", "madhumeh", "zyada pyaas", "baar baar peshab", "prameha", "diabetes", "blood sugar", "pyaas lagna"
        ),
        "diagnosis_hin": "Metabolic santulan aur sugar lakshan / Prameha (प्रमेह - Metabolic Glycemic Concern)",
        "diagnosis_eng": "Glycemic and metabolic imbalance concerns (Prameha)",
        "diagnosis_garh_dev": "रक्त मा शुगर का लक्षण और बार-बार पेशाब (प्रमेह)।",
        "diagnosis_garh_rom": "Rakt ma sugar ka lakshan aur baar-baar peshab (Prameha).",
        "spoken_hin": "sugar aur madhumeh ke lakshan",
        "spoken_garh_dev": "शुगर और बार-बार पेशाब की समस्या",
        "spoken_garh_rom": "sugar aur baar-baar peshab ki samasya",
        "t1_hin": "Zyada pyaas ya baar-baar peshab aane ki samasya kab se mehsoos ho rahi hai?",
        "t2_hin": "Theek hai. Kya sath mein achanak wazan kam hona ya thakawat bhi lagti hai?",
        "t1_eng": "How long have you noticed excessive thirst or frequent urination?",
        "t2_eng": "Understood. Have you also experienced unexplained weight loss or severe fatigue?",
        "t1_garh_dev": "बार-बार पेशाब या ज्यादा प्यास कतगा दिन बटि लगणी छ?",
        "t1_garh_rom": "Baar-baar peshab ya zyada pyaas katga din bati lagni chha?",
        "t2_garh_dev": "ठीक छ। क्या वजन कम हुण या कमजोरी भी छ?",
        "t2_garh_rom": "Theek chha. Kya wajan kam hun ya kamzori bhi chha?",
    },
    "hypertension_symptoms": {
        "keywords": (
            "bp high", "blood pressure", "uchcha raktachap", "sir bhari", "bechani bp", "high bp", "chhati dhadakna"
        ),
        "diagnosis_hin": "Raktachap mein badhavat ki aashanka / Uchcha Raktachap (Elevated Blood Pressure Concern)",
        "diagnosis_eng": "Possible elevated blood pressure and vascular tension",
        "diagnosis_garh_dev": "रक्तचाप (BP) मा बढ़त और मुंड भारी हुण।",
        "diagnosis_garh_rom": "Raktachap (BP) ma badhat aur mund bhaari hun.",
        "spoken_hin": "high blood pressure aur sir mein bhaari-pan",
        "spoken_garh_dev": "हाई ब्लड प्रेशर और मुंड भारी हुण",
        "spoken_garh_rom": "high blood pressure aur mund bhaari hun",
        "t1_hin": "Sir bhari rehne ya bechaini ki samasya kab se hai? Kya haal mein BP check karwaya?",
        "t2_hin": "Theek hai. Kya ghabrahat, paseena ya dhundhla dikhne jaisa lakshan hai?",
        "t1_eng": "How long have you felt head heaviness or restlessness, and have you checked your BP recently?",
        "t2_eng": "Understood. Are you experiencing anxiety, palpitations, or blurred vision?",
        "t1_garh_dev": "मुंड भारी हुण और घबराहट कतगा दिन बटि छ?",
        "t1_garh_rom": "Mund bhaari hun aur ghabrahat katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या धड़कन तेज हुण या पसीना भी औणु छ?",
        "t2_garh_rom": "Theek chha. Kya dhadkan tezz hun ya paseena bhi aunu chha?",
    },
    "respiratory_wheeze": {
        "keywords": (
            "saans phoolna", "asthma", "dama", "shwasa", "tamaka shwasa", "wheezing", "saans lene me awaz"
        ),
        "diagnosis_hin": "Shwasan nali mein sankochan / Tamaka Shwasa (तमक श्वास - Bronchial Wheezing / Mild Asthma)",
        "diagnosis_eng": "Bronchial sensitivity and reactive airway wheezing (Tamaka Shwasa)",
        "diagnosis_garh_dev": "स्याल या धूल से सांस फुलण और छाती मा आवाज (तमक श्वास)।",
        "diagnosis_garh_rom": "Syal ya dhool se saans phulan aur chhati ma aawaz (Tamaka Shwasa).",
        "spoken_hin": "saans phoolna aur shwasa roga",
        "spoken_garh_dev": "सांस फुलण और छाती मा आवाज",
        "spoken_garh_rom": "saans phulan aur chhati ma aawaz",
        "t1_hin": "Saans lene mein takleef ya seeti jaisi aawaz kab se aa rahi hai?",
        "t2_hin": "Theek hai. Kya sardi ya dhool-mitti se yeh takleef achanak badh jaati hai?",
        "t1_eng": "How long have you experienced shortness of breath or wheezing sounds?",
        "t2_eng": "Understood. Does exposure to cold air or dust noticeably trigger it?",
        "t1_garh_dev": "सांस फुलण या सीटी जनी आवाज कब बटि छ?",
        "t1_garh_rom": "Saans phulan ya seeti jani aawaz kaba bati chha?",
        "t2_garh_dev": "ठीक छ। क्या स्याल या धूल मा जाणा पर दिक्कत बढ़णी छ?",
        "t2_garh_rom": "Theek chha. Kya syal ya dhool ma jana par dikkat badhni chha?",
    },
    "skin_fungal": {
        "keywords": (
            "daad", "ringworm", "fungal", "dadru", "gol daane", "daadh", "fungal infection"
        ),
        "diagnosis_hin": "Tvacha par fungal sankraman / Dadru Kushta (दद्रु कुष्ठ - Superficial Fungal Infection)",
        "diagnosis_eng": "Superficial fungal dermatophytosis (Dadru)",
        "diagnosis_garh_dev": "त्वचा मा दाद और गोल चकत्ता (दद्रु कुष्ठ)।",
        "diagnosis_garh_rom": "Tvacha ma daad aur gol chakata (Dadru Kushta).",
        "spoken_hin": "daad aur tvacha ka fungal sankraman",
        "spoken_garh_dev": "दाद और त्वचा मा गोल चकत्ता",
        "spoken_garh_rom": "daad aur tvacha ma gol chakata",
        "t1_hin": "Tvacha par yeh daad ya gol daane kab se nikal rahe hain?",
        "t2_hin": "Theek hai. Kya paseene aane par wahan bahut tezz khujli ya jalan hoti hai?",
        "t1_eng": "How long have you had this circular rash or fungal patch?",
        "t2_eng": "Understood. Does it itch intensely with sweating or warmth?",
        "t1_garh_dev": "दाद या गोल दाणा कतगा दिन बटि छन?",
        "t1_garh_rom": "Daad ya gol daana katga din bati chhan?",
        "t2_garh_dev": "ठीक छ। क्या पसीना औणा पर बहुत खुजली हुणी छ?",
        "t2_garh_rom": "Theek chha. Kya paseena auna par bahut khujli huni chha?",
    },
    "insomnia": {
        "keywords": (
            "neend nahi", "neend", "insomnia", "anidra", "nindranash", "neend na aana", "sleeplessness", "raat ko jagna"
        ),
        "diagnosis_hin": "Mansik tanav aur Vata vriddhi se anidra / Insomnia (अनिद्रा - Sleep Disturbance)",
        "diagnosis_eng": "Stress-related sleep disturbance and insomnia (Anidra)",
        "diagnosis_garh_dev": "तनाव या वात बढ़ने से रात मा नींद नी औण (अनिद्रा)।",
        "diagnosis_garh_rom": "Tanav ya vata badhne se raat ma neend ni aun (Anidra).",
        "spoken_hin": "neend na aana aur anidra",
        "spoken_garh_dev": "नींद नी औण और तनाव",
        "spoken_garh_rom": "neend ni aun aur tanav",
        "t1_hin": "Neend na aane ki pareshani kitne samay se ho rahi hai?",
        "t2_hin": "Theek hai. Kya man mein zyada chinta, tanav ya raat mein baar baar achanak aankh khulti hai?",
        "t1_eng": "How long have you had difficulty falling or staying asleep?",
        "t2_eng": "Understood. Is this accompanied by racing thoughts, anxiety, or frequent night awakenings?",
        "t1_garh_dev": "रात मा नींद नी औण कतगा दिन बटि छ?",
        "t1_garh_rom": "Raat ma neend ni aun katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या मन मा चिंता या बेचैनी भी छ?",
        "t2_garh_rom": "Theek chha. Kya man ma chinta ya bechaini bhi chha?",
    },
    "anxiety_stress": {
        "keywords": (
            "ghabrahat", "tension", "chinta", "stress", "chittodvega", "man bechain", "anxiety", "dil ghabrana"
        ),
        "diagnosis_hin": "Mansik tanav aur ghabrahat / Chittodvega (चित्तोद्वेग - Mild Anxiety and Stress)",
        "diagnosis_eng": "Mild mental tension and distress (Chittodvega)",
        "diagnosis_garh_dev": "चिंता, बेचैनी और मानसिक तनाव (चित्तोद्वेग)।",
        "diagnosis_garh_rom": "Chinta, bechaini aur mansik tanav (Chittodvega).",
        "spoken_hin": "mansik tanav aur ghabrahat",
        "spoken_garh_dev": "चिंता और मन मा घबराहट",
        "spoken_garh_rom": "chinta aur man ma ghabrahat",
        "t1_hin": "Yeh ghabrahat ya bechaini kitne dino se mehsoos ho rahi hai?",
        "t2_hin": "Theek hai. Kya ghabrahat ke waqt dil ki dhadkan tezz lagti hai ya hath kaanpte hain?",
        "t1_eng": "How long have you been feeling this anxiety or restlessness?",
        "t2_eng": "Understood. Does it come with rapid heartbeat, tremor, or difficulty relaxing?",
        "t1_garh_dev": "घबराहट या चिंता कतगा दिन बटि छ?",
        "t1_garh_rom": "Ghabrahat ya chinta katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या धड़कन तेज हुण या हाथ कांपण भी छ?",
        "t2_garh_rom": "Theek chha. Kya dhadkan tezz hun ya haat kampan bhi chha?",
    },
    "cold_flu": {
        "keywords": (
            "zukaam", "zukam", "jukham", "jukhaam", "naak behna", "sardi", "cold", "flu", "sardi lagna",
            "chheenk", "chheekein", "chheken", "chhink", "chhik", "sneezing", "naak band", "band naak",
            "running nose", "runny nose", "naak", "nak", "balgam", "common cold"
        ),
        "diagnosis_hin": "Mausami Sardi-Zukaam / Pratishyaya (सर्दी-जुकाम / Acute Common Cold)",
        "diagnosis_eng": "Acute Common Cold and Nasal Congestion (Pratishyaya)",
        "diagnosis_garh_dev": "सर्दी और स्याल से जुकाम और नाक बगण (प्रतिश्याय)।",
        "diagnosis_garh_rom": "Sardi aur syal se zukaam aur naak bagan (Pratishyaya).",
        "spoken_hin": "sardi aur zukaam",
        "spoken_garh_dev": "सर्दी-जुकाम और नाक बगण",
        "spoken_garh_rom": "sardi-zukaam aur naak bagan",
        "t1_hin": "Sardi aur zukaam kitne din se hai?",
        "t2_hin": "Theek hai. Kya naak behne ke sath sar dard ya halka bukhar bhi hai?",
        "t1_eng": "How many days have you had this cold and runny nose?",
        "t2_eng": "Understood. Do you also have headache or low-grade fever with it?",
        "t1_garh_dev": "सर्दी-जुकाम कतगा दिन बटि छ?",
        "t1_garh_rom": "Sardi-zukaam katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या नाक बगण दगड़ मुंड पीड़ भी छ?",
        "t2_garh_rom": "Theek chha. Kya naak bagan dagad mund peed bhi chha?",
    },
    "wound_minor": {
        "keywords": (
            "chot", "kaat", "ghav", "wound", "vrana", "halka cut", "abrasion", "chhil gaya"
        ),
        "diagnosis_hin": "Sadharan chot aur khilav / Sadhyo Vrana (सद्योव्रण - Minor Superficial Cut / Wound)",
        "diagnosis_eng": "Minor superficial skin abrasion or cut (Sadhyo Vrana)",
        "diagnosis_garh_dev": "हल्की चोट या घाव (सद्योव्रण)।",
        "diagnosis_garh_rom": "Halki chot ya ghav (Sadhyo Vrana).",
        "spoken_hin": "sadharan chot aur ghav",
        "spoken_garh_dev": "हल्की चोट और घाव",
        "spoken_garh_rom": "halki chot aur ghav",
        "t1_hin": "Chot kab lagi aur kya khoon behna band ho gaya hai?",
        "t2_hin": "Theek hai. Kya ghav saaf paani se dho liya gaya hai aur wahan laali ya peep to nahi?",
        "t1_eng": "When did you get this minor injury, and has any bleeding stopped?",
        "t2_eng": "Understood. Have you washed it with clean water, and is there any pus or redness?",
        "t1_garh_dev": "चोट कब लगी और क्या खून बंद ह्वे गे?",
        "t1_garh_rom": "Chot kaba lagi aur kya khoon band hwe ge?",
        "t2_garh_dev": "ठीक छ। क्या घाव साफ पाणी से धोई ली?",
        "t2_garh_rom": "Theek chha. Kya ghav saaf paani se dhoi li?",
    },
    "muscle_cramp": {
        "keywords": (
            "ainthan", "cramp", "tod", "spasm", "mamsagata vata", "pindli me dard", "nas chadhna", "muscle pain"
        ),
        "diagnosis_hin": "Peshio mein khinchav aur ainthan / Mamsagata Vata (मांसगत वात - Muscular Spasm / Cramp)",
        "diagnosis_eng": "Acute muscular spasm and cramping (Mamsagata Vata)",
        "diagnosis_garh_dev": "मांसपेशियों मा खिंचाव और ऐंठन (मांसगत वात)।",
        "diagnosis_garh_rom": "Manspeshiyo ma khinchav aur ainthan (Mamsagata Vata).",
        "spoken_hin": "peshio mein ainthan aur nas chadhna",
        "spoken_garh_dev": "मांसपेशियों मा ऐंठन और दर्द",
        "spoken_garh_rom": "manspeshiyo ma ainthan aur dard",
        "t1_hin": "Ainthan ya nas chadhne ki takleef kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya yeh aksar raat ko ya thakan ke baad hoti hai?",
        "t1_eng": "How long have you been getting muscle cramps or spasms?",
        "t2_eng": "Understood. Does it occur mostly at night or after physical exertion?",
        "t1_garh_dev": "ऐंठन या नस चढ़ण कब बटि हो रयु छ?",
        "t1_garh_rom": "Ainthan ya nas chadhan kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या रात का बखत या ज्यादा थकावट मा हुणी छ?",
        "t2_garh_rom": "Theek chha. Kya raat ka bakhat ya zyada thakawat ma huni chha?",
    },
    "skin_allergy": {
        "keywords": (
            "tvacha", "chamdi", "khujli", "daane", "dane", "rash", "rashes",
            "charmarog", "hives", "sheeta pitta"
        ),
        "diagnosis_hin": "Tvacha ki allergy ya rakt-pitta asantulan (शीतपित्त / Allergic Urticaria)",
        "diagnosis_eng": "Allergic skin irritation or urticaria (Sheeta-Pitta)",
        "diagnosis_garh_dev": "त्वचा मा एलर्जी या पित्त से खाज-खुजली और दाने (शीतपित्त)।",
        "diagnosis_garh_rom": "Tvacha ma allergy ya pitta se khaj-khujli aur daane (Sheeta-Pitta).",
        "spoken_hin": "tvacha ki allergy aur khujli",
        "spoken_garh_dev": "त्वचा मा एलर्जी और खुजली",
        "spoken_garh_rom": "tvacha ma allergy aur khujli",
        "t1_hin": "Samajh gayi. Tvacha par khujli ya daane kab se nikal rahe hain?",
        "t2_hin": "Theek hai. Kya tvacha par laal dhabbe, soojan ya jalan bhi ho rahi hai?",
        "t1_eng": "I understand. How long have you had this skin itching or rash?",
        "t2_eng": "Understood. Are there red patches, swelling, or burning sensations?",
        "t1_garh_dev": "खाळ (त्वचा) मा खुजली या दाणा कतगा दिन बटि छन?",
        "t1_garh_rom": "Khaal (tvacha) ma khujli ya daana katga din bati chhan?",
        "t2_garh_dev": "ठीक छ। क्या खाळ मा लाल चकता या सूजण भी छ?",
        "t2_garh_rom": "Theek chha. Kya khaal ma laal chakata ya soojan bhi chha?",
    },
    "headache": {
        "keywords": ("mund", "sar dard", "headache", "peed", "peer", "sir me dard", "sar me dard", "mund ma peed"),
        "diagnosis_hin": "Thakan, sardi ya mansik tanav se hone wala sadharan sar dard (Tension Headache)",
        "diagnosis_eng": "Mild tension or fatigue-induced headache",
        "diagnosis_garh_dev": "स्याल, थकान या मानसिक तनाव से साधारण मुंड पीड़ (Tension Headache) लगणु छ।",
        "diagnosis_garh_rom": "Syal, thakawat ya tanav se sadharan mund peed (Tension Headache) lagnu chha.",
        "spoken_hin": "sardi ya tanav se sadharan sar dard",
        "spoken_garh_dev": "स्याल या थकान से साधारण मुंड पीड़",
        "spoken_garh_rom": "syal ya thakawat se aam mund pid",
        "t1_hin": "Maine aapki takleef sun li. Yeh sar dard kab se ho raha hai?",
        "t2_hin": "Theek hai. Kya sar dard ke sath chakkar ya ulti jaisa bhi lag raha hai?",
        "t1_eng": "I understand. How long have you had this headache?",
        "t2_eng": "Understood. Are you having any dizziness or nausea with it?",
        "t1_garh_dev": "त्वरि बात सुणी ली। मुंड पीड़ कब बटि हो रयु छ?",
        "t1_garh_rom": "Twari baat suni li. Mund pid kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या मुंड पीड़ दगड़ चक्कर या उलटी भी छन?",
        "t2_garh_rom": "Theek chha. Kya mund pid dagad ulti ya chakkar bhi chha?",
    },
    "stomach": {
        "keywords": ("pet", "stomach", "tummy", "abdomen", "pait", "marod", "krodh", "gas", "pet dard", "pet me dard"),
        "diagnosis_hin": "Khan-paan mein asantulan ya gas se pet dard (Indigestion / Gastritis)",
        "diagnosis_eng": "Mild gastritis or indigestion",
        "diagnosis_garh_dev": "खान-पान मा असंतुलन या अपच से पैट मा जलन और मरोड़ लगणु छ।",
        "diagnosis_garh_rom": "Khan-paan ma asantulan ya gas se pet ma jalan aur marod lagnu chha.",
        "spoken_hin": "apach ya gas se pet dard",
        "spoken_garh_dev": "खान-पान या गैस से पैट मा जलन",
        "spoken_garh_rom": "khan-paan ya gas se pet dard",
        "t1_hin": "Samajh gayi. Pet mein dard kab se shuru hua?",
        "t2_hin": "Theek hai. Kya ulti ya dast ki samasya bhi ho rahi hai?",
        "t1_eng": "I understand. How long have you had this stomach pain?",
        "t2_eng": "Understood. Are you having any vomiting or loose stools?",
        "t1_garh_dev": "पैट मा पीर कब बटि हो रयु छ?",
        "t1_garh_rom": "Pet ma peed kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या उलटी या दस्त भी लग्यूँ छ?",
        "t2_garh_rom": "Theek chha. Kya ulti ya dast bhi lagyu chha?",
    },
    "fever": {
        "keywords": ("bukhar", "fever", "thand", "syal", "taap", "feverish"),
        "diagnosis_hin": "Mausami badlav ya thakan se halka bukhar (Mild Seasonal Fever)",
        "diagnosis_eng": "Mild seasonal viral pyrexia",
        "diagnosis_garh_dev": "मौसमी बदलाव और स्याल से साधारण बुखार (Mild Seasonal Fever) लगणु छ।",
        "diagnosis_garh_rom": "Mausami badlav aur syal se aam bukhar (Mild Seasonal Pyrexia) lagnu chha.",
        "spoken_hin": "mausami badlav se halka bukhar",
        "spoken_garh_dev": "मौसमी बदलाव से साधारण बुखार",
        "spoken_garh_rom": "mausami badlav se aam bukhar",
        "t1_hin": "Bukhar kitne din se hai?",
        "t2_hin": "Theek hai. Kya bukhar ke sath thand ya kapkapi lag rahi hai?",
        "t1_eng": "How many days have you had this fever?",
        "t2_eng": "Understood. Are you having chills or shivering with the fever?",
        "t1_garh_dev": "बुखार कतगा दिन बटि छ?",
        "t1_garh_rom": "Bukhar katga din bati chha?",
        "t2_garh_dev": "ठीक छ। क्या बुखार दगड़ स्याल या कपकपी भी लगणी छ?",
        "t2_garh_rom": "Theek chha. Kya bukhar dagad kapkapi bhi lagni chha?",
    },
    "cough": {
        "keywords": ("khang", "khansi", "cough", "gala", "kanth", "gale me kharash"),
        "diagnosis_hin": "Sardi-zukham se gale mein kharash aur khansi (Common Cold / Pharyngitis)",
        "diagnosis_eng": "Common viral upper respiratory irritation",
        "diagnosis_garh_dev": "स्याल और सर्दी से सूखी खंग और गाळ मा खराश लगणी छ।",
        "diagnosis_garh_rom": "Syal aur sardi se sukhi khang aur gala ma kharash lagnu chha.",
        "spoken_hin": "sardi se gale mein kharash aur khansi",
        "spoken_garh_dev": "सर्दी से सूखी खंग और गाळ मा खराश",
        "spoken_garh_rom": "sardi se khang aur gala ma kharash",
        "t1_hin": "Yeh khansi kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya khansi ke sath saans lene mein dikkat ho rahi hai?",
        "t1_eng": "How long have you had this cough?",
        "t2_eng": "Understood. Are you having any difficulty breathing?",
        "t1_garh_dev": "खंग कब बटि लगी छ?",
        "t1_garh_rom": "Khang kaba bati lagi chha?",
        "t2_garh_dev": "ठीक छ। क्या सांस फुलणी त नी छ?",
        "t2_garh_rom": "Theek chha. Kya saans phulnu toh ni chha?",
    },
    "general": {
        "keywords": (),
        "diagnosis_hin": "Sharirik asuvidha aur thakan (Mild Fatigue / Discomfort)",
        "diagnosis_eng": "Physical fatigue and mild discomfort",
        "diagnosis_garh_dev": "शारीरिक थकावट और कमजोरी से सामान्य अस्वस्थता लगणी छ।",
        "diagnosis_garh_rom": "Sharirik thakawat aur kamzori se aam asuvidha lagnu chha.",
        "spoken_hin": "sharirik thakan aur aam asuvidha",
        "spoken_garh_dev": "शारीरिक थकावट और कमजोरी",
        "spoken_garh_rom": "sharirik thakawat aur kamzori",
        "t1_hin": "Samajh gayi. Yeh takleef kab se ho rahi hai?",
        "t2_hin": "Theek hai. Kya yeh takleef tezi se badh rahi hai?",
        "t1_eng": "I understand. How long have you been experiencing this discomfort?",
        "t2_eng": "Understood. Has this discomfort been worsening rapidly?",
        "t1_garh_dev": "त्वरि बात समझी गे। ये तकलीफ कब बटि हो रयी छ?",
        "t1_garh_rom": "Twari baat samajh ge. Yeh takleef kaba bati ho rahyu chha?",
        "t2_garh_dev": "ठीक छ। क्या ये तकलीफ तेजी से बढ़णी छ?",
        "t2_garh_rom": "Theek chha. Kya yeh takleef tezi se badhni chha?",
    },
}

PHRASE_WEIGHTS = {
    "daant dard": 10, "dant dard": 10, "tooth pain": 10, "toothache": 10, "danta shoola": 10,
    "daant": 6, "dant": 6, "tooth": 6, "teeth": 6, "masooda": 6, "masudo": 6,
    "peshab jalan": 10, "peshab mein jalan": 10, "peshab me jalan": 10, "mutrakrichchhra": 10,
    "peshab": 5, "mutra": 5, "urine burning": 10,
    "kamar dard": 10, "peeth dard": 10, "back pain": 10, "katishoola": 10, "kamar": 6, "peeth": 6,
    "zukaam": 10, "zukam": 10, "jukham": 10, "jukhaam": 10, "sardi": 8, "common cold": 10,
    "naak behna": 9, "running nose": 9, "runny nose": 9, "cold": 8, "flu": 8,
    "naak band": 8, "band naak": 8, "allergic rhinitis": 12, "pratishyaya": 8,
    "chheenk": 7, "aankhon me khujli": 8, "aankhon main khujli": 8, "watery eyes": 6,
    "sar dard": 8, "sir dard": 8, "sar me dard": 8, "sir me dard": 8,
    "sir": 5, "sar": 5, "mund": 6, "headache": 8, "jodon mein dard": 8, "jod": 6, "sandhivata": 8,
    "seene mein jalan": 8, "khatti dakar": 8, "pet dard": 8, "pet": 4, "pait": 4,
    "loose motion": 10, "loose motions": 10, "dast": 8, "atisara": 10,
    "kabz": 10, "constipation": 10, "pet saaf nahi": 10, "vibandha": 10,
    "kaan dard": 10, "kaan": 6, "ear pain": 10, "karna shoola": 10,
    "aankh laal": 10, "saans phoolna": 10, "dama": 8, "asthma": 8,
    "neend nahi": 10, "anidra": 10, "sugar": 8, "madhumeh": 8, "prameha": 8,
    "bp high": 8, "blood pressure": 8, "daad": 10, "ringworm": 10, "dadru": 10,
    "ainthan": 8, "cramp": 8, "chot": 8, "ghav": 8, "ghabrahat": 8
}

def get_symptom_data(text: str, patient_context: Optional[dict] = None) -> Dict[str, Any]:
    """
    Retrieves clinical diagnosis and follow-up templates matching patient complaints.
    Provides differential diagnosis awareness:
    - Identifies top matches and their clinical scores.
    - If the top two categories have close scores, returns both primary and differential.
    - Seamlessly backward-compatible: dictionary contains all primary fields at top level.
    """
    text_lower = (text or "").lower()
    matches = []

    for cat, data in CLINICAL_SYMPTOM_REGISTRY.items():
        if cat == "general":
            continue
        score = 0
        for kw in data["keywords"]:
            # Check whole word boundary match or substring for phrases
            if " " in kw:
                if kw in text_lower:
                    score += PHRASE_WEIGHTS.get(kw, 6)
            else:
                if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                    score += PHRASE_WEIGHTS.get(kw, 3)

        # Composite check: boost specific categories when key complaint indicators are present
        if cat == "cold_flu" and any(w in text_lower for w in ["zukaam", "zukam", "jukham", "jukhaam", "sardi", "cold", "flu", "naak behna"]):
            score += 10
        elif cat == "allergic_rhinitis" and any(w in text_lower for w in ["allergic rhinitis", "chronic rhinitis", "nasal allergy", "dust allergy", "dhool se allergy", "purani allergy"]):
            score += 12
        elif cat == "dental_pain" and (re.search(r"\bdaant\b|\bdant\b|\btooth\b", text_lower) and "dard" in text_lower):
            score += 8
        elif cat == "back_pain" and (re.search(r"\bkamar\b|\bpeeth\b", text_lower) and "dard" in text_lower):
            score += 8
        elif cat == "ear_pain" and ("kaan" in text_lower and "dard" in text_lower):
            score += 8
        elif cat == "urinary_issues" and ("peshab" in text_lower and ("jalan" in text_lower or "dard" in text_lower)):
            score += 8
        elif cat == "headache" and (re.search(r"\bsir\b|\bsar\b|\bmund\b", text_lower) and "dard" in text_lower):
            score += 8

        if score > 0:
            matches.append({"category": cat, "score": score, "data": data})

    matches.sort(key=lambda x: x["score"], reverse=True)

    if not matches:
        gen_data = dict(CLINICAL_SYMPTOM_REGISTRY["general"])
        gen_data.update({
            "primary": CLINICAL_SYMPTOM_REGISTRY["general"],
            "differential": None,
            "confidence": "low",
            "primary_category": "general",
            "differential_category": None
        })
        return gen_data

    top_match = matches[0]
    result_dict = dict(top_match["data"])
    result_dict["primary"] = top_match["data"]
    result_dict["primary_category"] = top_match["category"]

    # Differential diagnosis detection (close match within 70% threshold)
    if len(matches) >= 2 and matches[1]["score"] >= (0.70 * top_match["score"]):
        second_match = matches[1]
        result_dict["differential"] = second_match["data"]
        result_dict["differential_category"] = second_match["category"]
        result_dict["confidence"] = "moderate"
    else:
        result_dict["differential"] = None
        result_dict["differential_category"] = None
        result_dict["confidence"] = "high" if top_match["score"] >= 6 else "moderate"

    return result_dict
