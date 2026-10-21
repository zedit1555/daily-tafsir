// Nom arabe et nombre de versets de chaque sourate (index 0 = sourate 1).
export const SURAHS = [
  ["الفاتحة", 7], ["البقرة", 286], ["آل عمران", 200], ["النساء", 176], ["المائدة", 120],
  ["الأنعام", 165], ["الأعراف", 206], ["الأنفال", 75], ["التوبة", 129], ["يونس", 109],
  ["هود", 123], ["يوسف", 111], ["الرعد", 43], ["إبراهيم", 52], ["الحجر", 99],
  ["النحل", 128], ["الإسراء", 111], ["الكهف", 110], ["مريم", 98], ["طه", 135],
  ["الأنبياء", 112], ["الحج", 78], ["المؤمنون", 118], ["النور", 64], ["الفرقان", 77],
  ["الشعراء", 227], ["النمل", 93], ["القصص", 88], ["العنكبوت", 69], ["الروم", 60],
  ["لقمان", 34], ["السجدة", 30], ["الأحزاب", 73], ["سبأ", 54], ["فاطر", 45],
  ["يس", 83], ["الصافات", 182], ["ص", 88], ["الزمر", 75], ["غافر", 85],
  ["فصلت", 54], ["الشورى", 53], ["الزخرف", 89], ["الدخان", 59], ["الجاثية", 37],
  ["الأحقاف", 35], ["محمد", 38], ["الفتح", 29], ["الحجرات", 18], ["ق", 45],
  ["الذاريات", 60], ["الطور", 49], ["النجم", 62], ["القمر", 55], ["الرحمن", 78],
  ["الواقعة", 96], ["الحديد", 29], ["المجادلة", 22], ["الحشر", 24], ["الممتحنة", 13],
  ["الصف", 14], ["الجمعة", 11], ["المنافقون", 11], ["التغابن", 18], ["الطلاق", 12],
  ["التحريم", 12], ["الملك", 30], ["القلم", 52], ["الحاقة", 52], ["المعارج", 44],
  ["نوح", 28], ["الجن", 28], ["المزمل", 20], ["المدثر", 56], ["القيامة", 40],
  ["الإنسان", 31], ["المرسلات", 50], ["النبأ", 40], ["النازعات", 46], ["عبس", 42],
  ["التكوير", 29], ["الانفطار", 19], ["المطففين", 36], ["الانشقاق", 25], ["البروج", 22],
  ["الطارق", 17], ["الأعلى", 19], ["الغاشية", 26], ["الفجر", 30], ["البلد", 20],
  ["الشمس", 15], ["الليل", 21], ["الضحى", 11], ["الشرح", 8], ["التين", 8],
  ["العلق", 19], ["القدر", 5], ["البينة", 8], ["الزلزلة", 8], ["العاديات", 11],
  ["القارعة", 11], ["التكاثر", 8], ["العصر", 3], ["الهمزة", 9], ["الفيل", 5],
  ["قريش", 4], ["الماعون", 7], ["الكوثر", 3], ["الكافرون", 6], ["النصر", 3],
  ["المسد", 5], ["الإخلاص", 4], ["الفلق", 5], ["الناس", 6],
];

export const surahName = (n) => SURAHS[n - 1][0];
export const ayahCount = (n) => SURAHS[n - 1][1];

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arNum = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

// Translittération anglaise courante (pour les posts en anglais).
export const SURAHS_EN = [
  "Al-Fatihah", "Al-Baqarah", "Al-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal",
  "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf",
  "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara",
  "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
  "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan",
  "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur",
  "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr",
  "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim",
  "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir",
  "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar",
  "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr",
  "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr",
  "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah",
  "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas",
  "Al-Falaq", "An-Nas",
];
export const surahNameEn = (n) => SURAHS_EN[n - 1];
