// Récitateurs : nom du dossier sur everyayah.com -> nom affiché sur la couverture.
// Pour en ajouter un, copie le nom exact du dossier depuis https://everyayah.com/data/
export const RECITERS = {
  "Yasser_Ad-Dussary_128kbps": { ar: "ياسر الدوسري", en: "Yasser Al-Dosari" },
  "Alafasy_128kbps": { ar: "مشاري العفاسي", en: "Mishary Alafasy" },
  "Minshawy_Mujawwad_192kbps": { ar: "محمد صديق المنشاوي", en: "Muhammad Siddiq Al-Minshawi" },
  "Saood_ash-Shuraym_128kbps": { ar: "سعود الشريم", en: "Saud Al-Shuraim" },
  "Abdurrahmaan_As-Sudais_192kbps": { ar: "عبد الرحمن السديس", en: "Abdul Rahman Al-Sudais" },
  "Maher_AlMuaiqly_64kbps": { ar: "ماهر المعيقلي", en: "Maher Al-Muaiqly" },
  "Abdul_Basit_Murattal_192kbps": { ar: "عبد الباسط عبد الصمد", en: "Abdul Basit Abdul Samad" },
  "Husary_128kbps": { ar: "محمود خليل الحصري", en: "Mahmoud Khalil Al-Husary" },
};

export const reciterName = (folder, lang) => RECITERS[folder]?.[lang] ?? null;
