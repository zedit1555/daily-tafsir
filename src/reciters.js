// Récitateurs. La clé est celle choisie dans le workflow (et dans config.json).
//   everyayah : dossier sur https://everyayah.com/data/ (un MP3 par verset, sans minutage des mots)
//   qt        : identifiant dans https://github.com/baklarrrr/quran-timings (minutage mot par mot, CC BY 4.0)
//   qc        : motif pour retrouver le récitateur dans les minutages officiels de quran.com
export const RECITERS = {
  "Yasser_Ad-Dussary_128kbps": {
    ar: "ياسر الدوسري", en: "Yasser Al-Dosari",
    everyayah: "Yasser_Ad-Dussary_128kbps", qt: "yasser-dosari", qc: /dossar|dosari|dussary/i,
  },
  "Alafasy_128kbps": { ar: "مشاري العفاسي", en: "Mishary Alafasy", everyayah: "Alafasy_128kbps", qc: /afasy/i },
  "Minshawy_Mujawwad_192kbps": {
    ar: "محمد صديق المنشاوي", en: "Muhammad Siddiq Al-Minshawi",
    everyayah: "Minshawy_Mujawwad_192kbps", qc: /minshaw.*mujawwad/i,
  },
  "Saood_ash-Shuraym_128kbps": {
    ar: "سعود الشريم", en: "Saud Al-Shuraim", everyayah: "Saood_ash-Shuraym_128kbps", qc: /shura?y?m|shuraim/i,
  },
  "Abdurrahmaan_As-Sudais_192kbps": {
    ar: "عبد الرحمن السديس", en: "Abdul Rahman Al-Sudais", everyayah: "Abdurrahmaan_As-Sudais_192kbps", qc: /sudais/i,
  },
  "Maher_AlMuaiqly_64kbps": {
    ar: "ماهر المعيقلي", en: "Maher Al-Muaiqly", everyayah: "Maher_AlMuaiqly_64kbps", qt: "maher-muaiqly", qc: /mu.?aiqly/i,
  },
  "Abdul_Basit_Murattal_192kbps": {
    ar: "عبد الباسط عبد الصمد", en: "Abdul Basit Abdul Samad",
    everyayah: "Abdul_Basit_Murattal_192kbps", qc: /(abdul ?basit|abdulbaset).*murattal/i,
  },
  "Husary_128kbps": { ar: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary", everyayah: "Husary_128kbps", qc: /husary(?!.*muallim)/i },
  "Nasser_Alqatami_128kbps": {
    ar: "ناصر القطامي", en: "Nasser Al-Qatami", everyayah: "Nasser_Alqatami_128kbps", qt: "nasser-qatami", qc: /qatami/i,
  },
  "Islam_Sobhi": { ar: "إسلام صبحي", en: "Islam Sobhi", qt: "islam-sobhi" },
};

export const reciterName = (key, lang) => RECITERS[key]?.[lang] ?? null;
