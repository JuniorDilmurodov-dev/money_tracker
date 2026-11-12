import type { Dictionary } from "./en";

export const uz: Dictionary = {
  appName: "Xarajat",
  currency: "so'm",

  meta: {
    description:
      "Xarajatlaringizni bir necha soniyada yozing. Haftalik va oylik tahlil so'mda.",
    add: "Xarajat qo'shish — Xarajat",
    week: "Shu hafta — Xarajat",
    month: "Shu oy — Xarajat",
    history: "Tarix — Xarajat",
    insights: "Tahlil — Xarajat",
    weekly: "Haftalik hisobot — Xarajat",
    settings: "Sozlamalar — Xarajat",
    login: "Kirish — Xarajat",
  },

  nav: {
    label: "Asosiy",
    add: "Qo'shish",
    week: "Hafta",
    month: "Oy",
    history: "Tarix",
    insights: "Tahlil",
  },

  header: {
    settings: "Sozlamalar",
    toLight: "Yorug' rejimga o'tish",
    toDark: "Qorong'i rejimga o'tish",
    language: "Til",
  },

  dates: {
    today: "Bugun",
    yesterday: "Kecha",
  },

  home: {
    today: "Bugun",
    thisWeek: "Shu hafta",
    loggedToday: "Bugun kiritilgan",
    nothingToday: "Bugun hali hech narsa kiritilmagan.",
  },

  quickAdd: {
    amountLabel: "Miqdor, so'mda",
    category: "Kategoriya",
    today: "Bugun",
    yesterday: "Kecha",
    pickDate: "Sanani tanlang",
    addNote: "+ Izoh",
    note: "Izoh (ixtiyoriy)",
    saving: "Saqlanmoqda…",
    save: "Xarajatni saqlash",
    saved: "Saqlandi ✓",
  },

  week: {
    title: "Shu hafta",
    thisWeek: "Shu hafta",
    lastWeek: "O'tgan hafta",
    vsLastWeek: "o'tgan haftaga nisbatan",
    dailySpending: "Kunlik xarajatlar",
    nothingTwoWeeks: "So'nggi ikki haftada xarajat kiritilmagan.",
    byCategory: "Kategoriyalar bo'yicha",
    nothingThisWeek: "Bu hafta hali hech narsa kiritilmagan.",
    expenses: "Shu haftadagi xarajatlar",
  },

  weekly: {
    title: "Haftalik hisobot",
    total: "Jami",
    vsLastWeek: "o'tgan haftaga nisbatan",
    noBaseline: "o'tgan hafta ma'lumot yo'q",
    breakdown: "Pul qayerga ketdi",
    other: "Boshqa",
    empty: "Bu hafta xarajat kiritilmagan.",
    chartLabel: (currency: string) => `Kategoriyalar bo'yicha xarajat, ${currency}`,
    aiTitle: "AI xulosa",
    aiGenerate: "Xulosa yozish",
    aiGenerating: "Haftangiz o'qilmoqda…",
    aiFailed: "Xulosa tayyorlanmadi. Keyinroq urinib ko'ring.",
    aiRemaining: (n: number) => `Bugun ${n} ta qoldi`,
    link: "Haftalik hisobot",
  },

  month: {
    thisMonth: "Shu oy",
    lastMonth: "O'tgan oy",
    vsLastMonth: "o'tgan oyga nisbatan",
    dayCount: (day: number) => `${day}-kun`,
    dailyAverage: (amount: string) => `kuniga o'rtacha ${amount}`,
    budget: "Byudjet",
    change: "O'zgartirish",
    setBudget: "Byudjet belgilash",
    budgetUsed: "Oylik byudjetdan foydalanilgan qismi",
    budgetOf: (budget: string) => `${budget} dan`,
    overBudget: "Byudjetdan oshgan miqdor:",
    leftThisMonth: "shu oyga qoldi.",
    noBudget: "Oylik byudjet belgilanmagan.",
    addBudget: "Belgilash",
    toTrackRemaining: "orqali qolganini kuzatib boring.",
    dailySpending: "Kunlik xarajatlar",
    nothingTwoMonths: "So'nggi ikki oyda xarajat kiritilmagan.",
    byCategory: "Kategoriyalar bo'yicha",
    nothingThisMonth: "Bu oy hali hech narsa kiritilmagan.",
    topCategory: (category: string, share: number) => ({
      before: `Bu oy xarajatlaringizning `,
      value: `${share}%`,
      after: ` qismi ${category} kategoriyasiga to'g'ri keldi.`,
    }),
  },

  history: {
    title: "Tarix",
    last7Days: "So'nggi 7 kun",
    last30Days: "So'nggi 30 kun",
    thisMonth: "Shu oy",
    lastMonth: "O'tgan oy",
    from: "Dan",
    to: "Gacha",
    category: "Kategoriya",
    allCategories: "Barcha kategoriyalar",
    clearFilters: "Filtrlarni tozalash",
    expenseCount: (count: number) => `${count} ta xarajat`,
    noMatches: "Bu filtrlarga mos xarajat yo'q.",
    capped:
      "So'nggi 300 ta mos xarajat ko'rsatilmoqda — ko'proq ko'rish uchun sana oralig'ini toraytiring.",
  },

  insights: {
    title: "Tahlil",
    subtitle: "Xarajatlaringiz haqida qisqa tahlil, so'rov bo'yicha tayyorlanadi.",
    period: "Davr",
    thisWeek: "Shu hafta",
    lastWeek: "O'tgan hafta",
    thisMonth: "Shu oy",
    lastMonth: "O'tgan oy",
    generate: "Tahlil tayyorlash",
    generating: "Xarajatlaringiz o'qilmoqda…",
    nothingSent: "Tugmani bosmaguningizcha sun'iy intellektga hech narsa yuborilmaydi.",
    stale:
      "Oldingi tahlil ko'rsatilmoqda — hozirgi tanlov uchun tugmani qaytadan bosing.",
    language: "Tahlil tili",
    past: "Oldingi tahlillar",
    weekOf: (date: string) => `${date} dan boshlangan hafta`,
    monthOf: (date: string) => `${date} dan boshlangan oy`,
    failed: "Tahlil tayyorlab bo'lmadi.",
    unreachable: "Serverga ulanib bo'lmadi.",
    retry: "Qayta urinish",
    remaining: (n: number) =>
      n === 0
        ? "Bugun uchun tahlil qolmadi. Yarim tunda yangilanadi."
        : `Bugun yana ${n} ta tahlil qoldi.`,
    fewDataHint:
      "Bu davrda hali 3 kundan kam ma'lumot bor — to'liq o'tgan davrni tanlash foydaliroq bo'lishi mumkin.",
  },

  settings: {
    title: "Sozlamalar",
    monthlyBudget: "Oylik byudjet",
    budgetLabel: "Miqdor, so'mda (bo'sh qoldirilsa — byudjetsiz)",
    budgetPlaceholder: "masalan, 5 000 000",
    categories: "Kategoriyalar",
    addCategory: "Kategoriya qo'shish",
    categoryPlaceholder: "masalan, Kofe",
    removeCategory: (name: string) => `${name} kategoriyasini o'chirish`,
    removalNote:
      "Kategoriyani o'chirish uni faqat ro'yxatdan olib tashlaydi — unga yozilgan xarajatlar o'z kategoriyasida qoladi.",
    account: "Hisob",
    signOut: "Chiqish",
    save: "Saqlash",
    add: "Qo'shish",
    saved: "Saqlandi ✓",
  },

  pwa: {
    install: "Ilovani o'rnatish",
    description:
      "Xarajatni bosh ekranga qo'shing. U brauzersiz ochiladi va bir zumda ishga tushadi.",
    installButton: "O'rnatish",
    installed: "O'rnatilgan ✓",
    iosHint:
      "Safarida \"Ulashish\" tugmasini bosing va \"Bosh ekranga qo'shish\"ni tanlang.",
    unavailable:
      "Brauzeringiz ilovani o'z menyusidan o'rnatishni taklif qiladi.",
    bannerTitle: "Xarajatni o'rnating",
    bannerBody: "Bir bosishda ochish uchun bosh ekranga qo'shing.",
    dismiss: "Hozir emas",
    offlineTitle: "Internet yo'q",
    offlineBody:
      "Xarajatlaringizni yuklash uchun ulanish kerak. Saqlanganlarning hammasi joyida.",
    retry: "Qayta urinish",
  },

telegram: {
    title: "Telegram",
    description: "Telegram'ni ulang — Mini App aynan shu hisobni va barcha xarajatlaringizni ochadi.",
    linked: "Telegram ulangan. Mini App shu hisobni ko'rsatadi.",
    connect: "Telegram'ni ulash",
    relink: "Boshqa Telegram'ni ulash",
    error: "Havola yaratib bo'lmadi. Qayta urinib ko'ring.",
  },

  notifications: {
    title: "Eslatmalar",
    description: "Kunni xarajat kiritmasdan o'tkazsangiz, kechqurun eslatib qo'yamiz.",
    enableButton: "Eslatmalarni yoqish",
    enabled: "Yoqilgan ✓",
    disableButton: "O'chirish",
    iosHint:
      "Avval Xarajatni bosh ekranga o'rnating (yuqoridagi bo'lim), keyin bu yerga qayting.",
    deniedHint:
      "Bu sayt uchun bildirishnomalar bloklangan. Brauzeringizning sayt sozlamalaridan yoqing.",
    unavailable: "Bu brauzerda qo'llab-quvvatlanmaydi.",
    failed: "Eslatmalarni yoqib bo'lmadi.",
  },

  expense: {
    amount: "Miqdor",
    date: "Sana",
    category: "Kategoriya",
    note: "Izoh",
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    currency: "Valyuta",
  },

  chart: {
    categoryShare: (category: string, amount: string, share: number) =>
      `${category}: ${amount}, davr xarajatlarining ${share} foizi`,
  },

  login: {
    tagline: "Xarajatlarni so'mda kuzating. Barcha qurilmalaringizda sinxron.",
    account: "Hisob",
    email: "Email",
    password: "Parol",
    signIn: "Kirish",
    createAccount: "Hisob yaratish",
    linkExpired:
      "Bu tasdiqlash havolasining muddati o'tgan yoki u allaqachon ishlatilgan. Yangisini olish uchun hisobni qaytadan yarating.",
    linkInvalid:
      "Bu tasdiqlash havolasi to'liq emas. Eng oxirgi emailni oching va o'sha yerdagi havolani bosing.",
  },

  error: {
    sessionHiccup: "Sahifa yuklanayotganda seansingizda uzilish yuz berdi.",
    generic: "Sahifani yuklashda xatolik yuz berdi.",
    tryAgain: "Qayta urinish",
    hiccupHint:
      "Odatda o'zi tuzalib ketadi. Takrorlanaversa, chiqib qaytadan kiring.",
    dataSafe: "Ma'lumotlaringiz joyida — hech narsa yo'qolmadi.",
  },

  actions: {
    credentialsRequired: "Email va parol kiritilishi shart.",
    passwordTooShort: "Parol kamida 8 ta belgidan iborat bo'lishi kerak.",
    confirmEmail:
      "Hisob yaratildi. Emailingizni tasdiqlang, so'ng tizimga kiring.",
    authEmailRateLimited:
      "Tasdiqlash xati yuborilmadi — ilova soatlik email limitiga yetdi. Bir soatdan keyin qayta urinib ko'ring.",
    authEmailNotAuthorized:
      "Ilova hozircha bu manzilga xat yubora olmaydi. Boshqa manzilni sinab ko'ring yoki ma'mur bilan bog'laning.",
    authTooManyRequests: "Juda ko'p urinish. Biroz kuting va qayta urinib ko'ring.",
    authEmailNotConfirmed:
      "Bu email hali tasdiqlanmagan. Tasdiqlash havolasini qidiring — spam papkasini ham tekshiring.",
    authInvalidCredentials: "Email va parol mos kelmadi.",
    authEmailExists: "Bu email bilan hisob allaqachon mavjud. Tizimga kiring.",
    authWeakPassword: "Bu parolni topish juda oson. Uzunrog'ini tanlang.",
    authSignupDisabled: "Bu serverda yangi hisob yaratish o'chirilgan.",
    amountRequired: "Noldan katta miqdor kiriting.",
    categoryRequired: "Kategoriyani tanlang.",
    invalidDate: "Bu sana noto'g'ri.",
    missingExpense: "Xarajat topilmadi.",
    categoryNameRequired: "Kategoriya nomini kiriting.",
    categoryNameTooLong: "Nom 40 ta belgidan oshmasin.",
    categoryExists: "Bunday kategoriya allaqachon mavjud.",
    budgetInvalid: "Noldan katta byudjet kiriting yoki bo'sh qoldiring.",
    notSignedIn: "Tizimga kirilmagan.",
    missingApiKey: "Serverda OPENAI_API_KEY o'rnatilmagan.",
    modelNoText: "Model hech qanday matn qaytarmadi.",
    modelBadJson: "Model noto'g'ri JSON qaytardi.",
    rateLimited: "OpenAI so'rovlar sonini cheklab qo'ydi. Birozdan so'ng urinib ko'ring.",
    insightsDisabled: "Bu serverda tahlillar o'chirib qo'yilgan.",
    dailyLimitReached: (limit: number) =>
      `Bugungi ${limit} ta tahlilni ishlatib bo'ldingiz. Cheklov yarim tunda yangilanadi — saqlangan tahlillaringiz joyida turibdi.`,
    badApiKey: "OPENAI_API_KEY yaroqsiz.",
    modelUnavailable: (model: string) =>
      `"${model}" modeli bu hisobda mavjud emas.`,
    openaiError: (status: number | undefined, message: string) =>
      `OpenAI API xatosi (${status}): ${message}`,
    insightsFailed: "Tahlil tayyorlab bo'lmadi.",
  },

  categories: {
    food: "Oziq-ovqat",
    transport: "Transport",
    utilities: "Kommunal",
    entertainment: "Ko'ngilochar",
    shopping: "Xaridlar",
    health: "Salomatlik",
    other: "Boshqa",
  },
};
