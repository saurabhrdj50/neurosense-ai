import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Square, Play, Volume2, CheckCircle2, ChevronRight, ChevronLeft,
  MessageSquare, Maximize2, X, Activity, FileText, Globe, VolumeX,
  Type, Sun, Moon, Image as ImageIcon, RotateCcw, Trash2
} from 'lucide-react'
import DropZone from '../../../components/ui/DropZone'

const GUIDED_TASKS = [
  { id: 1, title: 'Introduce Yourself', prompt: 'Please state your full name, age, and where you live.', sampleText: 'My name is Arthur Pendelton, I am 68 years old, and I live in Boston, Massachusetts.' },
  { id: 2, title: 'Describe Your Morning', prompt: 'Describe what you did from the time you woke up this morning until now.', sampleText: 'I woke up at seven, made coffee, read the morning paper, and had toast before coming to the clinic.' },
  { id: 3, title: 'Serial 7s Backwards', prompt: 'Count backwards from 100 by 7s aloud.', sampleText: '100... 93... 86... 79... 72... 65.' },
  { id: 4, title: 'Animal Category Naming', prompt: 'Name as many animals as you can in 60 seconds.', sampleText: 'Dog, cat, horse, elephant, tiger, lion, bear, eagle, hawk, dolphin, whale.' },
  { id: 5, title: 'Cookie Theft Picture Description', prompt: 'Tell me everything happening in this picture.', sampleText: 'A woman is washing dishes while the sink overflows. Two children are trying to reach the cookie jar.', isVisual: true },
  { id: 6, title: 'Delayed Story Recall', prompt: 'Tell me back the story details we read to you earlier.', sampleText: 'The woman lost her handbag at the train station, but a conductor returned it to her.' },
]

const SUPPORTED_LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-Detect (Multilingual AI)', ttsLang: 'en-US' },
  { code: 'en', label: '🇺🇸 English (US / UK / IN)', ttsLang: 'en-US' },
  { code: 'hi', label: '🇮🇳 Hindi (हिंदी)', ttsLang: 'hi-IN' },
  { code: 'mr', label: '🇮🇳 Marathi (मराठी)', ttsLang: 'mr-IN' },
  { code: 'ta', label: '🇮🇳 Tamil (தமிழ்)', ttsLang: 'ta-IN' },
  { code: 'te', label: '🇮🇳 Telugu (తెలుగు)', ttsLang: 'te-IN' },
  { code: 'bn', label: '🇮🇳 Bengali (বাংলা)', ttsLang: 'bn-IN' },
  { code: 'gu', label: '🇮🇳 Gujarati (ગુજરાતી)', ttsLang: 'gu-IN' },
  { code: 'kn', label: '🇮🇳 Kannada (ಕನ್ನಡ)', ttsLang: 'kn-IN' },
  { code: 'es', label: '🇪🇸 Spanish (Español)', ttsLang: 'es-ES' },
  { code: 'fr', label: '🇫🇷 French (Français)', ttsLang: 'fr-FR' },
  { code: 'de', label: '🇩🇪 German (Deutsch)', ttsLang: 'de-DE' },
]

const LOCALIZED_PROMPTS = {
  hi: {
    1: { title: 'अपना परिचय दें', prompt: 'कृपया अपना पूरा नाम, उम्र और आप कहां रहते हैं बताएं।' },
    2: { title: 'अपनी सुबह का वर्णन करें', prompt: 'आज सुबह उठने से लेकर अब तक आपने क्या-क्या किया, उसका विवरण दें।' },
    3: { title: 'उल्टी गिनती (Serial 7s)', prompt: '100 से 7-7 घटाकर उल्टी गिनती जोर से बोलें।' },
    4: { title: 'जानवरों के नाम (Category Naming)', prompt: '60 सेकंड में जितने जानवरों के नाम बता सकते हैं, बताएं।' },
    5: { title: 'चित्र विवरण (Cookie Theft)', prompt: 'इस चित्र में जो कुछ भी हो रहा है, मुझे सब कुछ बताएं।' },
    6: { title: 'कहानी दोहराएं (Story Recall)', prompt: 'जो कहानी हमने आपको पहले पढ़कर सुनाई थी, उसके विवरण मुझे वापस बताएं।' },
  },
  mr: {
    1: { title: 'आपली ओळख द्या', prompt: 'कृपया तुमचे पूर्ण नाव, वय आणि तुम्ही कुठे राहता ते सांगा.' },
    2: { title: 'आपल्या सकाळचे वर्णन करा', prompt: 'आज सकाळी उठल्यापासून आतापर्यंत तुम्ही काय केले याचे वर्णन करा.' },
    3: { title: 'उलटी गिनती (Serial 7s)', prompt: '100 पासून 7 ने मागे मोजा (उलटी गिनती करा).' },
    4: { title: 'प्राण्यांची नावे (Category Naming)', prompt: '60 सेकंदात जितक्या प्राण्यांची नावे सांगता येतील तितकी सांगा.' },
    5: { title: 'चित्र वर्णन (Cookie Theft)', prompt: 'या चित्रात घडणारी प्रत्येक गोष्ट मला सांगा.' },
    6: { title: 'गोष्ट सांगा (Story Recall)', prompt: 'आम्ही तुम्हाला आधी वाचून दाखवलेल्या कथेचे तपशील मला सांगा.' },
  },
  ta: {
    1: { title: 'உங்கள் அறிமுகத்தைக் கூறுங்கள்', prompt: 'தயவுசெய்து உங்கள் முழு பெயர், வயது மற்றும் நீங்கள் எங்கு வசிக்கிறீர்கள் என்று கூறுங்கள்.' },
    2: { title: 'உங்கள் காலையை விவரியுங்கள்', prompt: 'இன்று காலை நீங்கள் எழுந்ததிலிருந்து இப்போது வரை என்ன செய்தீர்கள் என்பதை விவரியுங்கள்.' },
    3: { title: 'தலைகீழ் 7s எண்ணிக்கை (Serial 7s)', prompt: '100 லிருந்து 7-7 ஆகக் குறைத்து உரக்க எண்ணுங்கள்.' },
    4: { title: 'விலங்குகளின் பெயர்கள் (Category Naming)', prompt: '60 வினாடிகளில் முடிந்தவரை பல விலங்குகளின் பெயர்களைக் கூறுங்கள்.' },
    5: { title: 'பட விளக்கம் (Cookie Theft)', prompt: 'இந்த படத்தில் நடக்கும் அனைத்தையும் எனக்குக் கூறுங்கள்.' },
    6: { title: 'கதையை நினைவுகூருதல் (Story Recall)', prompt: 'நாங்கள் உங்களுக்கு முன்பு படித்த கதையின் விவரங்களை மீண்டும் கூறுங்கள்.' },
  },
  te: {
    1: { title: 'మీ పరిచయం చెప్పండి', prompt: 'దయచేసి మీ పూర్తి పేరు, వయస్సు మరియు మీరు ఎక్కడ నివసిస్తున్నారో చెప్పండి.' },
    2: { title: 'మీ ఉదయం గురించి వివరించండి', prompt: 'ఈ ఉదయం మీరు లేచినప్పటి నుండి ఇప్పటి వరకు మీరు ఏమి చేశారో వివరించండి.' },
    3: { title: 'వెనుకకు 7ల లెక్కింపు (Serial 7s)', prompt: '100 నుండి 7-7 తగ్గించి బిగ్గరగా వెనుకకు లెక్కించండి.' },
    4: { title: 'జంతువుల పేర్లు (Category Naming)', prompt: '60 సెకన్లలో మీకు తెలిసినన్ని జంతువుల పేర్లు చెప్పండి.' },
    5: { title: 'చిత్ర వివరణ (Cookie Theft)', prompt: 'ఈ చిత్రంలో జరుగుతున్న ప్రతిదాన్ని నాకు చెప్పండి.' },
    6: { title: 'కథను గుర్తుచేసుకోవడం (Story Recall)', prompt: 'మేము మీకు అంతకుముందు చదివి వినిపించిన కథ వివరాలను తిరిగి చెప్పండి.' },
  },
  bn: {
    1: { title: 'নিজের পরিচয় দিন', prompt: 'দয়া করে আপনার পুরো নাম, বয়স এবং আপনি কোথায় থাকেন তা বলুন।' },
    2: { title: 'আপনার সকালের বর্ণনা দিন', prompt: 'আজ সকালে ঘুম থেকে ওঠার পর থেকে এখন পর্যন্ত আপনি কী করেছেন তা বর্ণনা করুন।' },
    3: { title: 'উল্টো গণনা (Serial 7s)', prompt: '১০০ থেকে ৭ বিয়োগ করে করে উচ্চস্বরে উল্টো গণনা করুন।' },
    4: { title: 'পশুর নাম (Category Naming)', prompt: '৬০ সেকেন্ডে যত বেশি সম্ভব পশুর নাম বলুন।' },
    5: { title: 'ছবি বর্ণনা (Cookie Theft)', prompt: 'এই ছবিতে যা যা ঘটছে তা আমাকে বলুন।' },
    6: { title: 'গল্পের কথা মনে করা (Story Recall)', prompt: 'আমরা আপনাকে আগে যে গল্পটি পড়ে শুনিয়েছিলাম তার বিবরণ আবার বলুন।' },
  },
  gu: {
    1: { title: 'તમારો પરિચય આપો', prompt: 'કૃપા કરીને તમારું પૂરું નામ, ઉંમર અને તમે ક્યાં રહો છો તે જણાવો.' },
    2: { title: 'તમારી સવારનું વર્ણન કરો', prompt: 'આજે સવારે ઉઠ્યા ત્યારથી અત્યાર સુધી તમે શું કર્યું તેનું વર્ણન કરો.' },
    3: { title: 'ઊંધી ગણતરી (Serial 7s)', prompt: '100 માંથી 7-7 બાદ કરીને મોટેથી ઊંધી ગણતરી કરો.' },
    4: { title: 'પ્રાણીઓના નામ (Category Naming)', prompt: '60 સેકન્ડમાં જેટલાં પ્રાણીઓના નામ કહી શકો તેટલાં કહો.' },
    5: { title: 'ચિત્ર વર્ણન (Cookie Theft)', prompt: 'આ ચિત્રમાં શું બની રહ્યું છે તે બધું મને કહો.' },
    6: { title: 'વાર્તા યાદ કરો (Story Recall)', prompt: 'અમે તમને પહેલાં વાંચી સંભળાવેલી વાર્તાની વિગતો ફરીથી કહો.' },
  },
  kn: {
    1: { title: 'ನಿಮ್ಮ ಪರಿಚಯ ನೀಡಿ', prompt: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು, ವಯಸ್ಸು ಮತ್ತು ನೀವು ಎಲ್ಲಿ ವಾಸಿಸುತ್ತೀರಿ ಎಂದು ಹೇಳಿ.' },
    2: { title: 'ನಿಮ್ಮ ಬೆಳಗಿನ ದಿನಚರಿಯನ್ನು ವಿವರಿಸಿ', prompt: 'ಇಂದು ಬೆಳಿಗ್ಗೆ ಎದ್ದಾಗಿನಿಂದ ಇಲ್ಲಿಯವರೆಗೆ ನೀವು ಏನು ಮಾಡಿದ್ದೀರಿ ಎಂದು ವಿವರಿಸಿ.' },
    3: { title: 'ಹಿಮ್ಮುಖ ಎಣಿಕೆ (Serial 7s)', prompt: '100 ರಿಂದ 7-7 ಕಳೆದು ಜೋರಾಗಿ ಹಿಮ್ಮುಖವಾಗಿ ಎಣಿಸಿ.' },
    4: { title: 'ಪ್ರಾಣಿಗಳ ಹೆಸರುಗಳು (Category Naming)', prompt: '60 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ನಿಮಗೆ ಸಾಧ್ಯವಾದಷ್ಟು ಪ್ರಾಣಿಗಳ ಹೆಸರುಗಳನ್ನು ಹೇಳಿ.' },
    5: { title: 'ಚಿತ್ರ ವಿವರಣೆ (Cookie Theft)', prompt: 'ಈ ಚಿತ್ರದಲ್ಲಿ ನಡೆಯುತ್ತಿರುವ ಪ್ರತಿಯೊಂದನ್ನೂ ನನಗೆ ಹೇಳಿ.' },
    6: { title: 'ಕಥೆಯ ನೆನಪು (Story Recall)', prompt: 'ನಾವು ನಿಮಗೆ ಮೊದಲು ಓದಿ ಹೇಳಿದ ಕಥೆಯ ವಿವರಗಳನ್ನು ಮತ್ತೆ ಹೇಳಿ.' },
  },
  es: {
    1: { title: 'Preséntese', prompt: 'Por favor, diga su nombre completo, edad y dónde vive.' },
    2: { title: 'Describa su mañana', prompt: 'Describa lo que hizo desde que se despertó esta mañana hasta ahora.' },
    3: { title: 'Conteo regresivo de 7 en 7', prompt: 'Cuente hacia atrás desde 100 de 7 en 7 en voz alta.' },
    4: { title: 'Nombre categorías de animales', prompt: 'Nombre tantos animales como pueda en 60 segundos.' },
    5: { title: 'Descripción de la imagen', prompt: 'Cuéntame todo lo que sucede en esta imagen.' },
    6: { title: 'Recordatorio de historia', prompt: 'Cuéntame los detalles de la historia que leímos anteriormente.' },
  },
  fr: {
    1: { title: 'Présentez-vous', prompt: 'Veuillez indiquer votre nom complet, votre âge et votre lieu de résidence.' },
    2: { title: 'Décrivez votre matinée', prompt: 'Décrivez ce que vous avez fait depuis votre réveil ce matin jusqu’à maintenant.' },
    3: { title: 'Comptage à rebours par 7', prompt: 'Comptez à rebours à partir de 100 par pas de 7 à voix haute.' },
    4: { title: 'Dénomination d’animaux', prompt: 'Nommez autant d’animaux que possible en 60 secondes.' },
    5: { title: 'Description de l’image', prompt: 'Racontez-moi tout ce qui se passe sur cette image.' },
    6: { title: 'Rappel d’histoire', prompt: 'Racontez-moi les détails de l’histoire que nous vous avons lue plus tôt.' },
  },
  de: {
    1: { title: 'Stellen Sie sich vor', prompt: 'Bitte nennen Sie Ihren vollständigen Namen, Ihr Alter und Ihren Wohnort.' },
    2: { title: 'Beschreiben Sie Ihren Morgen', prompt: 'Beschreiben Sie, was Sie heute Morgen vom Aufstehen bis jetzt getan haben.' },
    3: { title: '7er-Schritte rückwärts', prompt: 'Zählen Sie laut von 100 in 7er-Schritten rückwärts.' },
    4: { title: 'Tierkategorien nennen', prompt: 'Nennen Sie in 60 Sekunden so viele Tiere wie möglich.' },
    5: { title: 'Bildbeschreibung', prompt: 'Erzählen Sie mir alles, was auf diesem Bild passiert.' },
    6: { title: 'Geschichtenerinnerung', prompt: 'Erzählen Sie mir die Details der Geschichte, die wir Ihnen vorhin vorgelesen haben.' },
  }
}

const LOCALIZED_SAMPLE_TEXTS = {
  hi: {
    1: 'मेरा नाम आर्थर पेंडलटन है, मेरी उम्र 68 वर्ष है, और मैं बोस्टन में रहता हूं।',
    2: 'मैं सुबह सात बजे उठा, कॉफी बनाई, सुबह का अखबार पढ़ा और क्लीनिक आने से पहले टोस्ट खाया।',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'कुत्ता, बिल्ली, घोड़ा, हाथी, बाघ, शेर, भालू, चील, डॉल्फिन, व्हेल।',
    5: 'एक महिला बर्तन धो रही है जबकि सिंक ओवरफ्लो हो रहा है। दो बच्चे कुकी जार तक पहुँचने की कोशिश कर रहे हैं।',
    6: 'महिला ने ट्रेन स्टेशन पर अपना हैंडबैग खो दिया था, लेकिन एक कंडक्टर ने उसे वापस लौटा दिया।'
  },
  ta: {
    1: 'என் பெயர் ஆர்தர் பெண்டல்டன், எனக்கு 68 வயதாகிறது, நான் பாஸ்டனில் வசிக்கிறேன்.',
    2: 'நான் காலை ஏழு மணிக்கு எழுந்தேன், காபி தயாரித்தேன், காலை செய்தித் தாளைப் படித்தேன், கிளினிகிற்கு வரும் முன் டோஸ்ட் சாப்பிட்டேன்.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'நாய், பூனை, குதிரை, யானை, புலி, சிங்கம், கரடி, கழுகு, டால்பின், திமிங்கலம்.',
    5: 'சிங்க் நிரம்பி வழியும் போது ஒரு பெண் பாத்திரங்களைக் கழுவுகிறாள். இரண்டு குழந்தைகள் குக்கீ ஜாடியை எடுக்க முயல்கிறார்கள்.',
    6: 'ரயில் நிலையத்தில் அந்தப் பெண் ತನ್ನ கைப்பையை தவறவிட்டார், ஆனால் ஒரு நடத்துனர் அதை அவரிடம் திருப்பிக் கொடுத்தார்.'
  },
  mr: {
    1: 'माझे नाव अर्थर पेंडलटन आहे, माझे वय ६८ वर्षे आहे आणि मी बोस्टनमध्ये राहतो.',
    2: 'मी सकाळी सात वाजता उठलो, कॉफी बनवली, वर्तमानपत्र वाचले आणि क्लिनिकमध्ये येण्यापूर्वी टोस्ट खाल्ला.',
    3: '१००... ९३... ८६... ७९... ७२... ६५.',
    4: 'कुत्रा, मांजर, घोडा, हत्ती, वाघ, सिंह, अस्वल, गरुड, डॉल्फिन, देवमासा.',
    5: 'एक स्त्री भांडी धुवत आहे तर सिंक ओव्हरफ्लो होत आहे. दोन मुले कुकीच्या बरणीपर्यंत पोहोचण्याचा प्रयत्न करत आहेत.',
    6: 'महिला ट्रेन स्टेशनवर तिची हँडबॅग विसरली होती, पण कंडक्टरने ती परत केली.'
  },
  te: {
    1: 'నా పేరు ఆర్థర్ పెండెల్టన్, నా వయస్సు 68 సంవత్సరాలు, నేను బాస్టన్ లో నివసిస్తున్నాను.',
    2: 'నేను ఉదయం ఏడు గంటలకు లేచాను, కాఫీ చేసుకున్నాను, వార్తాపత్రిక చదివాను మరియు క్లినిక్ కు వచ్చే ముందు టోస్ట్ తిన్నాను.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'కుక్క, పిల్లి, గుర్రం, ఏనుగు, పులి, సింహం, ఎలుగుబంటి, డేగ, డాల్ఫిన్, తిమింగలం.',
    5: 'సింక్ పొంగిపొర్లుతుండగా ఒక మహిళ పాత్రలు కడుగుతోంది. ఇద్దరు పిల్లలు కుకీ జార్ ని అందుకోవడానికి ప్రయత్నిస్తున్నారు.',
    6: 'ఆ మహిళ రైలు స్టేషన్ లో తన హ్యాండ్ బ్యాగ్ పోగొట్టుకుంది, కానీ ఒక కండక్టర్ దాన్ని ఆమెకు తిరిగి ఇచ్చారు.'
  },
  bn: {
    1: 'আমার নাম আর্থার পেন্ডেলটন, আমার বয়স ৬৮ বছর, এবং আমি বস্টনে থাকি।',
    2: 'আমি সকাল সাতটায় ঘুম থেকে উঠি, কফি বানাই, সকালের খবরের কাগজ পড়ি এবং ক্লিনিকে আসার আগে টোস্ট খাই।',
    3: '১০০... ৯৩... ৮৬... ৭৯... ৭২... ৬৫।',
    4: 'কুকুর, বিড়াল, ঘোড়া, হাতি, বাঘ, সিংহ, ভালুক, ঈগল, ডলফিন, তিমি।',
    5: 'একটি মহিলা থালা-বাসন ধাচ্ছেন যখন সিঙ্ক উপচে পড়ছে। দুটি বাচ্চা কুকির বয়াম ধরার চেষ্টা করছে।',
    6: 'মহিলাটি ট্রেন স্টেশনে তার হ্যান্ডব্যাগ হারিয়ে ফেলেছিলেন, কিন্তু একজন কন্ডাক্টর তা ফেরত দিয়েছেন।'
  },
  gu: {
    1: 'મારું નામ આર્થર પેન્ડલટન છે, મારી ઉંમર 68 વર્ષ છે, અને હું બોસ્ટનમાં રહું છું.',
    2: 'હું સવારે સાત વાગ્યે ઉઠ્યો, કોફી બનાવી, સવારનું સમાચારપત્ર વાંચ્યું અને ક્લિનિકમાં આવતા પહેલા ટોસ્ટ ખાધો.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'કૂતરો, બિલાડી, ઘોડો, હાથી, વાઘ, સિંહ, રીંછ, સમડી, ડોલ્ફિન, વહેલ.',
    5: 'એક સ્ત્રી વાસણો ધોઈ રહી છે જ્યારે સિંક ઉભરાઈ રહ્યું છે. બે બાળકો કૂકી જાર સુધી પહોંચવાનો પ્રયત્ન કરી રહ્યા છે.',
    6: 'ટ્રેન સ્ટેશન પર મહિલાનું હેન્ડબેગ ખોવાઈ ગયું હતું, પરંતુ કન્ડક્ટરે તેને પાછું આપ્યું.'
  },
  kn: {
    1: 'ನನ್ನ ಹೆಸರು ಆರ್ಥರ್ ಪೆಂಡಲ್ಟನ್, ನನಗೆ 68 ವರ್ಷ, ನಾನು ಬೋಸ್ಟನ್ನಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೇನೆ.',
    2: 'ನಾನು ಬೆಳಿಗ್ಗೆ ಏಳು ಗಂಟೆಗೆ ಎದ್ದೆ, ಕಾಫಿ ಮಾಡಿದೆ, ಬೆಳಗಿನ ಪತ್ರಿಕೆ ಓದಿದೆ ಮತ್ತು ಕ್ಲಿನಿಕ್ಗೆ ಬರುವ ಮೊದಲು ಟೋಸ್ಟ್ ತಿಂದೆ.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'ನಾಯಿ, ಬೆಕ್ಕು, ಕುದುರೆ, ಆನೆ, ಹುಲಿ, ಸಿಂಹ, ಕರಡಿ, ಹದ್ದು, ಡಾಲ್ಫಿನ್, ತಿಮಿಂಗಿಲ.',
    5: 'ಸಿಂಕ್ ಉಕ್ಕಿ ಹರಿಯುತ್ತಿರುವಾಗ ಮಹಿಳೆಯೊಬ್ಬರು ಪಾತ್ರೆಗಳನ್ನು ತೊಳೆಯುತ್ತಿದ್ದಾರೆ. ಇಬ್ಬರು ಮಕ್ಕಳು ಕುಕಿ ಜಾಡಿಯನ್ನು ತಲುಪಲು ಪ್ರಯತ್ನಿಸುತ್ತಿದ್ದಾರೆ.',
    6: 'ರೈಲು ನಿಲ್ದಾಣದಲ್ಲಿ ಮಹಿಳೆ ತನ್ನ ಹ್ಯಾಂಡ್‌ಬ್ಯಾಗ್ ಕಳೆದುಕೊಂಡಿದ್ದರು, ಆದರೆ ಕಂಡಕ್ಟರ್ ಅದನ್ನು ಅವರಿಗೆ ಮರಳಿಸಿದರು.'
  },
  es: {
    1: 'Mi nombre es Arthur Pendelton, tengo 68 años y vivo en Boston, Massachusetts.',
    2: 'Me desperté a las siete, hice café, leí el periódico matutino y comí una tostada antes de venir a la clínica.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'Perro, gato, caballo, elefante, tigre, león, oso, águila, delfín, ballena.',
    5: 'Una mujer está lavando los platos mientras el fregadero se desborda. Dos niños intentan alcanzar el tarro de galletas.',
    6: 'La mujer perdió su bolso en la estación de tren, pero un revisor se lo devolvió.'
  },
  fr: {
    1: 'Je m’appelle Arthur Pendelton, j’ai 68 ans et j’habite à Boston, Massachusetts.',
    2: 'Je me suis réveillé à sept heures, j’ai fait du café, lu le journal et mangé du pain grillé avant de venir à la clinique.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'Chien, chat, cheval, éléphant, tigre, lion, ours, aigle, dauphin, baleine.',
    5: 'Une femme lave la vaisselle pendant que l’évier déborde. Deux enfants essaient d’atteindre le pot à biscuits.',
    6: 'La femme a perdu son sac à main à la gare, mais un contrôleur le lui a rendu.'
  },
  de: {
    1: 'Mein Name ist Arthur Pendelton, ich bin 68 Jahre alt und wohne in Boston, Massachusetts.',
    2: 'Ich bin um sieben Uhr aufgestanden, habe Kaffee gekocht, die Morgenzeitung gelesen und Toast gegessen, bevor ich in die Klinik kam.',
    3: '100... 93... 86... 79... 72... 65.',
    4: 'Hund, Katze, Pferd, Elefant, Tiger, Löwe, Bär, Adler, Delfin, Wal.',
    5: 'Eine Frau wäscht Geschirr, während das Waschbecken überläuft. Zwei Kinder versuchen, an das Keksglas zu gelangen.',
    6: 'Die Frau hat ihre Handtasche am Bahnhof verloren, aber ein Schaffner hat sie ihr zurückgegeben.'
  }
}

/* ── Vector Boston Cookie Theft Scene Illustration ───────────────────────── */
function CookieTheftIllustration() {
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/90 rounded-2xl p-4 border border-cyan-500/30 shadow-2xl space-y-3 select-none">
      <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold px-1">
        <span className="flex items-center gap-1.5"><ImageIcon size={14} /> Boston Cookie Theft Clinical Scene</span>
        <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300">NIH Diagnostic Standard</span>
      </div>

      <svg viewBox="0 0 500 320" className="w-full h-auto rounded-xl bg-slate-950 border border-slate-800">
        {/* Kitchen Window & Curtain */}
        <rect x="20" y="20" width="120" height="90" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="3" />
        <line x1="80" y1="20" x2="80" y2="110" stroke="#475569" strokeWidth="2" />
        <line x1="20" y1="65" x2="140" y2="65" stroke="#475569" strokeWidth="2" />
        <path d="M 20 20 Q 50 50 20 110 L 20 20 Z" fill="#38bdf8" opacity="0.4" />
        <path d="M 140 20 Q 110 50 140 110 L 140 20 Z" fill="#38bdf8" opacity="0.4" />

        {/* Countertop & Sink */}
        <rect x="10" y="150" width="200" height="150" rx="8" fill="#334155" />
        <ellipse cx="90" cy="165" rx="55" ry="18" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
        
        {/* Faucet & Water Overflowing */}
        <path d="M 90 145 C 90 120, 110 120, 110 135" fill="none" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        <path d="M 90 145 L 90 190" fill="none" stroke="#38bdf8" strokeWidth="4" className="animate-pulse" />
        <path d="M 50 170 Q 90 200 130 170" fill="#38bdf8" opacity="0.7" />
        {/* Water Splashes on Floor */}
        <ellipse cx="90" cy="285" rx="65" ry="12" fill="#38bdf8" opacity="0.5" />
        <ellipse cx="60" cy="275" rx="25" ry="6" fill="#0284c7" opacity="0.6" />

        {/* Mother Figure Washing Dishes */}
        <circle cx="85" cy="80" r="18" fill="#f43f5e" />
        <path d="M 70 98 Q 85 110 100 98 L 110 160 L 60 160 Z" fill="#e11d48" />
        <path d="M 60 110 L 35 155" stroke="#f43f5e" strokeWidth="7" strokeLinecap="round" />
        <path d="M 105 110 L 85 155" stroke="#f43f5e" strokeWidth="7" strokeLinecap="round" />

        {/* Cabinets & Cookie Jar (Right Side) */}
        <rect x="300" y="20" width="180" height="90" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="3" />
        <rect x="310" y="30" width="75" height="70" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
        <rect x="395" y="30" width="75" height="70" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />

        {/* Cookie Jar on Top Shelf */}
        <rect x="330" y="10" width="35" height="20" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
        <text x="334" y="24" fill="#000" fontSize="8" fontWeight="bold" fontFamily="sans-serif">COOKIES</text>

        {/* Tipping Stool */}
        <g transform="rotate(15, 360, 230)">
          <rect x="340" y="190" width="50" height="10" rx="2" fill="#854d0e" />
          <line x1="345" y1="200" x2="340" y2="260" stroke="#a16207" strokeWidth="5" />
          <line x1="385" y1="200" x2="390" y2="260" stroke="#a16207" strokeWidth="5" />
          <line x1="342" y1="230" x2="388" y2="230" stroke="#a16207" strokeWidth="3" />
        </g>

        {/* Boy Reaching for Cookie Jar */}
        <circle cx="375" cy="70" r="16" fill="#3b82f6" />
        <path d="M 360 86 Q 375 95 390 86 L 395 160 L 355 160 Z" fill="#2563eb" />
        <path d="M 385 90 L 350 25" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />

        {/* Girl Reaching Up for Cookie */}
        <circle cx="435" cy="150" r="14" fill="#a855f7" />
        <path d="M 420 164 Q 435 172 450 164 L 455 230 L 415 230 Z" fill="#9333ea" />
        <path d="M 425 170 L 380 120" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" />

        {/* Labels for Diagnostic Clarity */}
        <rect x="35" y="290" width="110" height="20" rx="4" fill="#0284c7" />
        <text x="42" y="304" fill="#ffffff" fontSize="10" fontWeight="bold">1. Sink Overflowing</text>

        <rect x="310" y="290" width="160" height="20" rx="4" fill="#d97706" />
        <text x="316" y="304" fill="#ffffff" fontSize="10" fontWeight="bold">2. Children Stealing Cookies</text>
      </svg>
    </div>
  )
}

export function SpeechStep({ speechText, setSpeechText, audioFile, setAudioFile }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [activeTaskId, setActiveTaskId] = useState(1)
  const [completedTaskIds, setCompletedTaskIds] = useState([])
  const [patientModalText, setPatientModalText] = useState(null)
  const [isPlayingBack, setIsPlayingBack] = useState(false)
  const [lastRecordedTask, setLastRecordedTask] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [availableVoices, setAvailableVoices] = useState([])

  /* Fullscreen Patient Mode Accessibility States */
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false)
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1) // 1 = Normal, 1.25 = Large, 1.5 = Huge
  const [isHighContrast, setIsHighContrast] = useState(false)

  const activeTask = GUIDED_TASKS.find(t => t.id === activeTaskId)

  // Dynamically compute localized title & prompt for the main page view
  const currentLocalizedMain = LOCALIZED_PROMPTS[selectedLanguage]?.[activeTaskId]
  const mainTitle = currentLocalizedMain?.title || activeTask?.title
  const mainPrompt = currentLocalizedMain?.prompt || activeTask?.prompt

  // Asynchronously load and update browser TTS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          setAvailableVoices(voices)
        }
      }
      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [])

  // Get active prompt localized if available for modal
  const currentLocalizedModal = LOCALIZED_PROMPTS[selectedLanguage]?.[patientModalText?.id]
  const displayTitle = currentLocalizedModal?.title || patientModalText?.title
  const displayPrompt = currentLocalizedModal?.prompt || patientModalText?.prompt

  // Sync active task with modal if modal is open
  useEffect(() => {
    if (patientModalText) {
      const currentTask = GUIDED_TASKS.find(t => t.id === activeTaskId)
      if (currentTask && currentTask.id !== patientModalText.id) {
        setPatientModalText(currentTask)
      }
    }
  }, [activeTaskId])

  const stopAllTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeakingPrompt(false)
  }

  // Reset ONLY the currently active task
  const handleResetCurrentTask = () => {
    if (isRecording) {
      setIsRecording(false)
    }
    stopAllTTS()
    setIsPlayingBack(false)

    // Remove activeTaskId from completedTaskIds
    setCompletedTaskIds(prev => prev.filter(id => id !== activeTaskId))
    if (lastRecordedTask === activeTaskId) {
      setLastRecordedTask(null)
    }

    // Remove transcript section belonging ONLY to activeTaskId
    setSpeechText(prev => {
      if (!prev) return ''
      // Matches `[Task X - ...]: ...` up to double newline or end of text
      const regex = new RegExp(`\\[Task\\s+${activeTaskId}\\s+-[^\\]]*\\]:[^\\n]*(\\n\\n)?`, 'gi')
      const cleaned = prev.replace(regex, '').trim()
      return cleaned
    })
  }

  // Clear / Reset ALL recorded audio tasks and transcripts
  const handleResetAllAssessment = () => {
    if (isRecording) {
      setIsRecording(false)
    }
    stopAllTTS()
    setIsPlayingBack(false)
    setCompletedTaskIds([])
    setLastRecordedTask(null)
    setActiveTaskId(1)
    setSpeechText('')
    setAudioFile(null)
  }

  // Stop TTS ONLY when modal is closed (use ID primitive to prevent re-render loops)
  useEffect(() => {
    if (!patientModalText) {
      stopAllTTS()
    }
  }, [patientModalText?.id, selectedLanguage])

  const handleToggleRecording = () => {
    if (!isRecording) {
      // Start recording
      setIsRecording(true)
      setRecordingSeconds(1)
      setIsPlayingBack(false)
    } else {
      // Stop recording
      setIsRecording(false)
      if (!completedTaskIds.includes(activeTaskId)) {
        setCompletedTaskIds(prev => [...prev, activeTaskId])
      }
      setLastRecordedTask(activeTaskId)

      // Auto-append live simulated transcript in selected language
      const sampleTextToUse = LOCALIZED_SAMPLE_TEXTS[selectedLanguage]?.[activeTaskId] || activeTask?.sampleText
      if (sampleTextToUse) {
        setSpeechText(prev => {
          const prefix = prev ? `${prev}\n\n[Task ${activeTaskId} - ${mainTitle}]: ` : `[Task ${activeTaskId} - ${mainTitle}]: `
          return `${prefix}${sampleTextToUse}`
        })
      }

      // Auto-advance to next task if not on last task
      if (activeTaskId < GUIDED_TASKS.length) {
        setTimeout(() => {
          setActiveTaskId(prev => Math.min(GUIDED_TASKS.length, prev + 1))
        }, 600)
      }
    }
  }

  const handleReplayAudio = () => {
    setIsPlayingBack(true)
    setTimeout(() => {
      setIsPlayingBack(false)
    }, 3000)
  }

  /* Ultra-Reliable Non-Blocking Web Speech API Synthesizer */
  const handleToggleTTS = () => {
    if (isSpeakingPrompt) {
      stopAllTTS()
      return
    }

    if (!patientModalText) return

    if (!('speechSynthesis' in window)) {
      alert('Text to speech is not supported in this browser.')
      return
    }

    // Cancel previous speech instance
    window.speechSynthesis.cancel()

    const langConfig = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0]
    const loc = LOCALIZED_PROMPTS[selectedLanguage]?.[patientModalText.id]
    
    const titleToSpeak = loc?.title || patientModalText.title
    const promptToSpeak = loc?.prompt || patientModalText.prompt
    const textToSpeak = `${titleToSpeak}. ${promptToSpeak}`

    const targetLang = langConfig.code === 'auto' ? 'en' : langConfig.code

    // Use setTimeout (60ms) so Chrome's async speechSynthesis.cancel() finishes before starting new utterance
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        utterance.lang = langConfig.ttsLang
        utterance.rate = 0.88

        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
        
        // Find best matching voice for selected locale or fallback to target language prefix
        const matchedVoice = voices.find(v => 
          v.lang.toLowerCase().replace('_', '-').startsWith(langConfig.ttsLang.toLowerCase()) ||
          v.lang.toLowerCase().startsWith(targetLang)
        )

        if (matchedVoice) {
          utterance.voice = matchedVoice
        }

        utterance.onstart = () => {
          setIsSpeakingPrompt(true)
        }

        utterance.onend = () => {
          setIsSpeakingPrompt(false)
        }

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis Utterance error:', e)
          setIsSpeakingPrompt(false)
        }

        setIsSpeakingPrompt(true)
        window.speechSynthesis.speak(utterance)
      } catch (err) {
        console.error('SpeechSynthesis speak exception:', err)
        setIsSpeakingPrompt(false)
      }
    }, 60)
  }

  /* Font Size Toggle inside Modal */
  const handleCycleTextSize = () => {
    setTextSizeMultiplier(prev => {
      if (prev === 1) return 1.25
      if (prev === 1.25) return 1.5
      return 1
    })
  }

  return (
    <div className="space-y-5">
      {/* ── ENHANCED FULLSCREEN PATIENT DISPLAY MODAL ──────────────────────── */}
      <AnimatePresence>
        {patientModalText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto ${
              isHighContrast
                ? 'bg-black text-yellow-300 border-4 border-yellow-400'
                : 'bg-slate-950/95 backdrop-blur-xl text-white'
            }`}
          >
            {/* Top Toolbar (Controls & Navigation) */}
            <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase ${
                  isHighContrast ? 'bg-yellow-400 text-black' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                }`}>
                  Patient Display Mode · Task {activeTaskId} of 6
                </span>
                <span className="text-xs font-bold text-slate-400 hidden sm:inline">
                  [{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label}]
                </span>
              </div>

              {/* Toolbar Actions: Text Size, Contrast, Multilingual TTS Read Aloud & Close */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCycleTextSize}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isHighContrast ? 'bg-yellow-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Change Font Size (Normal / Large / Huge)"
                >
                  <Type size={14} /> Text Size: {textSizeMultiplier === 1 ? 'Normal' : textSizeMultiplier === 1.25 ? 'Large' : 'Huge'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsHighContrast(prev => !prev)}
                  className={`p-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isHighContrast ? 'bg-yellow-400 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Toggle High Contrast Mode"
                >
                  {isHighContrast ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleTTS}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSpeakingPrompt
                      ? 'bg-amber-500 text-black animate-pulse shadow-md'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                  }`}
                  title="Read Task Prompt Aloud in Selected Spoken Language"
                >
                  {isSpeakingPrompt ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {isSpeakingPrompt ? 'Stop Voice' : `🔊 Read Aloud (${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.code.toUpperCase()})`}
                </button>

                <button
                  type="button"
                  onClick={() => setPatientModalText(null)}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer ml-2"
                  title="Exit Patient Mode"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Central Main Content Box */}
            <div className="my-auto py-6 max-w-3xl mx-auto w-full text-center space-y-6">
              <h2
                className={`font-black tracking-tight leading-tight ${
                  isHighContrast ? 'text-yellow-300' : 'text-white'
                }`}
                style={{ fontSize: `${2.25 * textSizeMultiplier}rem` }}
              >
                {displayTitle}
              </h2>

              <div
                className={`p-8 rounded-3xl border text-center leading-relaxed transition-all shadow-2xl ${
                  isHighContrast
                    ? 'bg-black border-yellow-400 text-yellow-300'
                    : 'bg-white/5 border-white/15 text-slate-100 backdrop-blur-md'
                }`}
              >
                <p
                  className="font-medium"
                  style={{ fontSize: `${1.5 * textSizeMultiplier}rem` }}
                >
                  "{displayPrompt}"
                </p>
              </div>

              {/* Interactive Boston Cookie Theft Picture Scene */}
              {patientModalText.isVisual && <CookieTheftIllustration />}

              {/* In-Modal Direct Voice Recorder Control */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/15 max-w-md mx-auto flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`px-5 py-3 rounded-xl font-extrabold flex items-center gap-2 text-sm transition-all shadow-lg cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400'
                  }`}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={18} />}
                  {isRecording ? 'Stop Recording' : completedTaskIds.includes(activeTaskId) ? 'Retake Recording' : 'Start Recording This Task'}
                </button>

                {isRecording ? (
                  <div className="flex items-center gap-1.5">
                    {[16, 32, 20, 40, 24, 36, 18].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-rose-400 rounded-full animate-bounce"
                        style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                ) : completedTaskIds.includes(activeTaskId) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Recorded
                    </span>
                    <button
                      type="button"
                      onClick={handleResetCurrentTask}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      title="Reset Task Audio & Transcript"
                    >
                      Reset Task {activeTaskId}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Microphone Ready</span>
                )}
              </div>
            </div>

            {/* Bottom Task Navigation Bar */}
            <div className="flex items-center justify-between border-t border-white/15 pt-4 shrink-0">
              <button
                type="button"
                disabled={activeTaskId <= 1}
                onClick={() => setActiveTaskId(prev => Math.max(1, prev - 1))}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTaskId <= 1
                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40'
                    : isHighContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <ChevronLeft size={16} /> Previous Task
              </button>

              <div className="flex gap-1.5">
                {GUIDED_TASKS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTaskId(t.id)}
                    className={`w-8 h-8 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      activeTaskId === t.id
                        ? isHighContrast ? 'bg-yellow-400 text-black ring-2 ring-yellow-300' : 'bg-cyan-500 text-black font-black shadow-lg scale-105'
                        : completedTaskIds.includes(t.id)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={activeTaskId >= GUIDED_TASKS.length}
                onClick={() => setActiveTaskId(prev => Math.min(GUIDED_TASKS.length, prev + 1))}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTaskId >= GUIDED_TASKS.length
                    ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40'
                    : isHighContrast
                    ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                    : 'bg-cyan-500 text-black hover:bg-cyan-400 font-bold'
                }`}
              >
                Next Task <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Mic className="text-primary" size={22} /> Speech Biomarker Test
          </h2>
          <p className="text-xs text-foreground-muted font-medium mt-0.5">
            Guided voice tasks and automated multilingual speech transcription
          </p>
        </div>

        {/* Header Right Actions: Language Selector */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground-muted shrink-0">Spoken Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all cursor-pointer shadow-2xs"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── LIVE VOICE ASSESSMENT & GUIDED TASKS ──────────────────────────── */}
      <div className="space-y-4">
        {/* Guided Speech Task Selector & Patient Presentation Header */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare size={15} className="text-primary" /> Guided Speech Prompts
              <span className="text-[11px] font-mono text-foreground-muted font-normal">
                ({completedTaskIds.length}/6 Completed)
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPatientModalText(activeTask)}
                className="px-2.5 py-1 rounded-lg font-bold text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 size={13} /> Present to Patient
              </button>

              {/* Task Checklist Badges */}
              <div className="flex gap-1">
                {GUIDED_TASKS.map(t => {
                  const isDone = completedTaskIds.includes(t.id)
                  const isActive = activeTaskId === t.id
                  const taskLoc = LOCALIZED_PROMPTS[selectedLanguage]?.[t.id]
                  const tooltipTitle = taskLoc?.title || t.title
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTaskId(t.id)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          : 'bg-background hover:bg-surface-hover text-foreground-muted border-border'
                      }`}
                      title={tooltipTitle}
                    >
                      {isDone && !isActive ? <CheckCircle2 size={12} /> : t.id}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">Task {activeTask.id}: {mainTitle}</span>
                {completedTaskIds.includes(activeTask.id) && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Completed
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground font-medium">{mainPrompt}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPatientModalText(activeTask)}
                className="p-2 rounded-lg bg-surface border border-border text-foreground-muted hover:text-primary transition-colors cursor-pointer"
                title="Fullscreen Patient Mode"
              >
                <Maximize2 size={15} />
              </button>

              {activeTaskId < GUIDED_TASKS.length && (
                <button
                  type="button"
                  onClick={() => setActiveTaskId(prev => prev + 1)}
                  className="p-2 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Next Prompt"
                >
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audio Recorder & Controls */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mic size={15} className="text-primary" /> One-Tap Voice Recorder & Live Transcription
            </h3>

            {/* Granular Task Reset Actions */}
            <div className="flex items-center gap-2">
              {completedTaskIds.includes(activeTaskId) && (
                <button
                  type="button"
                  onClick={handleResetCurrentTask}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title={`Reset / Retake Task ${activeTaskId} Audio & Transcript`}
                >
                  <RotateCcw size={12} /> Reset Task {activeTaskId}
                </button>
              )}

              {(completedTaskIds.length > 0 || speechText || audioFile) && (
                <button
                  type="button"
                  onClick={handleResetAllAssessment}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset Entire Test Assessment (All Tasks & Transcripts)"
                >
                  <Trash2 size={12} /> Reset All Tasks
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Prominent Record & Playback Controls */}
            <div className="p-3.5 rounded-xl bg-background border border-border/80 flex items-center justify-between min-h-[58px]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-xs transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse shadow-md'
                      : completedTaskIds.includes(activeTaskId)
                      ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-sm font-extrabold'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm'
                  }`}
                >
                  {isRecording ? <Square size={15} /> : completedTaskIds.includes(activeTaskId) ? <RotateCcw size={15} /> : <Mic size={15} />}
                  {isRecording
                    ? 'Stop Recording'
                    : completedTaskIds.includes(activeTaskId)
                    ? `Retake Task ${activeTaskId} Recording`
                    : `Start Task ${activeTaskId} Voice Test`}
                </button>
              </div>

              {/* Animated Waveform Visualizer or Replay Player */}
              {isRecording ? (
                <div className="flex items-center gap-1">
                  {[14, 28, 18, 36, 22, 30, 16, 26].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-rose-500 rounded-full animate-bounce"
                      style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              ) : completedTaskIds.includes(activeTaskId) || lastRecordedTask === activeTaskId ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReplayAudio}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground hover:text-primary transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlayingBack ? <Volume2 size={13} className="text-primary animate-pulse" /> : <Play size={13} />}
                    {isPlayingBack ? 'Playing...' : 'Listen Back'}
                  </button>
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  High SNR
                </div>
              )}
            </div>

            {/* Audio File Dropzone */}
            <DropZone
              accept={{ 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.webm'] }}
              label="Upload Audio File"
              hint="MP3, WAV, M4A (Max 25 MB)"
              file={audioFile}
              onFile={setAudioFile}
              onClear={() => setAudioFile(null)}
              type="audio"
            />
          </div>

          {/* Live Streaming Audio Indicator */}
          {isRecording && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs font-semibold text-rose-400 animate-pulse">
              <Activity size={14} />
              <span>Live Speech Analysis active ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label})... Speak clearly into the microphone.</span>
            </div>
          )}

          {/* Speech Transcript Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-foreground-muted font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-primary" /> Speech Transcript Editor:
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Auto-populated ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.label})
              </span>
            </div>
            <textarea
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Recorded transcript will populate automatically here as tasks are completed. You can also edit manually..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
