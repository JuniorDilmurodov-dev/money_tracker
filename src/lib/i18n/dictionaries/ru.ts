import type { Dictionary } from "./en";

/** Russian counts in three plural forms, so counters pick their own ending. */
function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export const ru: Dictionary = {
  appName: "Xarajat",
  currency: "сум",

  meta: {
    description:
      "Записывайте траты за секунды. Недельная и месячная разбивка в сумах.",
    add: "Добавить расход — Xarajat",
    week: "Эта неделя — Xarajat",
    month: "Этот месяц — Xarajat",
    history: "История — Xarajat",
    insights: "Аналитика — Xarajat",
    settings: "Настройки — Xarajat",
    login: "Вход — Xarajat",
  },

  nav: {
    label: "Основное",
    add: "Добавить",
    week: "Неделя",
    month: "Месяц",
    history: "История",
    insights: "Аналитика",
  },

  header: {
    settings: "Настройки",
    toLight: "Переключить на светлую тему",
    toDark: "Переключить на тёмную тему",
    language: "Язык",
  },

  dates: {
    today: "Сегодня",
    yesterday: "Вчера",
  },

  home: {
    today: "Сегодня",
    thisWeek: "Эта неделя",
    loggedToday: "Записано сегодня",
    nothingToday: "Сегодня пока ничего не записано.",
  },

  quickAdd: {
    amountLabel: "Сумма в сумах",
    category: "Категория",
    today: "Сегодня",
    yesterday: "Вчера",
    pickDate: "Выберите дату",
    addNote: "+ Заметка",
    note: "Заметка (необязательно)",
    saving: "Сохранение…",
    save: "Сохранить расход",
    saved: "Сохранено ✓",
  },

  week: {
    title: "Эта неделя",
    thisWeek: "Эта неделя",
    lastWeek: "Прошлая неделя",
    vsLastWeek: "к прошлой неделе",
    dailySpending: "Траты по дням",
    nothingTwoWeeks: "За последние две недели трат не записано.",
    byCategory: "По категориям",
    nothingThisWeek: "На этой неделе пока ничего не записано.",
    expenses: "Расходы этой недели",
  },

  month: {
    thisMonth: "Этот месяц",
    lastMonth: "Прошлый месяц",
    vsLastMonth: "к прошлому месяцу",
    dayCount: (day: number) => `${day}-й день`,
    dailyAverage: (amount: string) => `в среднем ${amount} в день`,
    budget: "Бюджет",
    change: "Изменить",
    setBudget: "Задать бюджет",
    budgetUsed: "Использовано от месячного бюджета",
    budgetOf: (budget: string) => `из ${budget}`,
    overBudget: "Превышение бюджета на",
    leftThisMonth: "осталось в этом месяце.",
    noBudget: "Месячный бюджет не задан.",
    addBudget: "Задайте его",
    toTrackRemaining: "чтобы видеть остаток.",
    dailySpending: "Траты по дням",
    nothingTwoMonths: "За последние два месяца трат не записано.",
    byCategory: "По категориям",
    nothingThisMonth: "В этом месяце пока ничего не записано.",
    topCategory: (category: string, share: number) => ({
      before: `На категорию «${category}» пришлось `,
      value: `${share}%`,
      after: " ваших трат в этом месяце.",
    }),
  },

  history: {
    title: "История",
    last7Days: "Последние 7 дней",
    last30Days: "Последние 30 дней",
    thisMonth: "Этот месяц",
    lastMonth: "Прошлый месяц",
    from: "С",
    to: "По",
    category: "Категория",
    allCategories: "Все категории",
    clearFilters: "Сбросить фильтры",
    expenseCount: (count: number) =>
      `${count} ${plural(count, "расход", "расхода", "расходов")}`,
    noMatches: "Под эти фильтры ничего не подходит.",
    capped:
      "Показаны 300 последних совпадений — сузьте диапазон дат, чтобы увидеть больше.",
  },

  insights: {
    title: "Аналитика",
    subtitle: "Короткий разбор ваших трат, создаётся по запросу.",
    period: "Период",
    thisWeek: "Эта неделя",
    lastWeek: "Прошлая неделя",
    thisMonth: "Этот месяц",
    lastMonth: "Прошлый месяц",
    generate: "Создать аналитику",
    generating: "Читаем ваши траты…",
    nothingSent: "Пока вы не нажмёте кнопку, ИИ ничего не отправляется.",
    stale: "Показан прошлый разбор — нажмите ещё раз для текущего выбора.",
    language: "Язык разбора",
    past: "Прошлые разборы",
    weekOf: (date: string) => `Неделя с ${date}`,
    monthOf: (date: string) => `Месяц с ${date}`,
    failed: "Не удалось создать аналитику.",
    unreachable: "Не удалось связаться с сервером.",
    retry: "Повторить",
    remaining: (n: number) =>
      n === 0
        ? "На сегодня лимит исчерпан. Обновится в полночь."
        : `Осталось сегодня: ${n}.`,
    fewDataHint:
      "Меньше 3 дней данных за этот период — законченный период может быть полезнее.",
  },

  settings: {
    title: "Настройки",
    monthlyBudget: "Месячный бюджет",
    budgetLabel: "Сумма в сумах (пусто — без бюджета)",
    budgetPlaceholder: "например, 5 000 000",
    categories: "Категории",
    addCategory: "Добавить категорию",
    categoryPlaceholder: "например, Кофе",
    removeCategory: (name: string) => `Удалить категорию «${name}»`,
    removalNote:
      "Удаление категории убирает её только из списка выбора — уже записанные расходы сохраняют свою категорию.",
    account: "Аккаунт",
    signOut: "Выйти",
    save: "Сохранить",
    add: "Добавить",
    saved: "Сохранено ✓",
  },

  pwa: {
    install: "Установить приложение",
    description:
      "Добавьте Xarajat на главный экран. Оно открывается без панелей браузера и запускается мгновенно.",
    installButton: "Установить",
    installed: "Установлено ✓",
    iosHint:
      "В Safari нажмите «Поделиться», затем «На экран «Домой»».",
    unavailable:
      "Ваш браузер предложит установить приложение из собственного меню.",
    bannerTitle: "Установите Xarajat",
    bannerBody: "Добавьте на главный экран — открывается одним касанием.",
    dismiss: "Не сейчас",
    offlineTitle: "Нет соединения",
    offlineBody:
      "Чтобы загрузить траты, нужно подключение. Всё уже сохранённое на месте.",
    retry: "Повторить",
  },

  notifications: {
    title: "Напоминания",
    description: "Получайте напоминание вечером, если в этот день ничего не записано.",
    enableButton: "Включить напоминания",
    enabled: "Включено ✓",
    disableButton: "Выключить",
    iosHint:
      "Сначала установите Xarajat на главный экран (см. выше), затем вернитесь сюда.",
    deniedHint:
      "Уведомления заблокированы для этого сайта. Включите их в настройках сайта в браузере.",
    unavailable: "Не поддерживается в этом браузере.",
    failed: "Не удалось включить напоминания.",
  },

  expense: {
    amount: "Сумма",
    date: "Дата",
    category: "Категория",
    note: "Заметка",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
  },

  chart: {
    categoryShare: (category: string, amount: string, share: number) =>
      `${category}: ${amount}, ${share} процентов трат за период`,
  },

  login: {
    tagline: "Учёт трат в сумах. Синхронно на всех ваших устройствах.",
    account: "Аккаунт",
    email: "Email",
    password: "Пароль",
    signIn: "Войти",
    createAccount: "Создать аккаунт",
    linkExpired:
      "Срок действия ссылки для подтверждения истёк, либо она уже использована. Создайте аккаунт заново, чтобы получить новую.",
    linkInvalid:
      "Ссылка для подтверждения неполная. Откройте последнее письмо и нажмите ссылку в нём.",
  },

  error: {
    sessionHiccup: "При загрузке страницы сессия дала сбой.",
    generic: "При загрузке страницы что-то пошло не так.",
    tryAgain: "Повторить",
    hiccupHint:
      "Обычно это проходит само. Если повторяется — выйдите и войдите снова.",
    dataSafe: "Ваши данные в порядке — ничего не потеряно.",
  },

  actions: {
    credentialsRequired: "Нужны email и пароль.",
    passwordTooShort: "Пароль должен быть не короче 8 символов.",
    confirmEmail:
      "Аккаунт создан. Подтвердите email в письме, затем войдите.",
    authEmailRateLimited:
      "Письмо с подтверждением не отправлено — приложение исчерпало часовой лимит писем. Попробуйте через час.",
    authEmailNotAuthorized:
      "Приложение пока не может отправлять письма на этот адрес. Попробуйте другой или свяжитесь с администратором.",
    authTooManyRequests: "Слишком много попыток. Подождите немного и попробуйте снова.",
    authEmailNotConfirmed:
      "Этот email ещё не подтверждён. Найдите письмо со ссылкой — проверьте и папку «Спам».",
    authInvalidCredentials: "Email и пароль не совпадают.",
    authEmailExists: "Аккаунт с таким email уже существует. Просто войдите.",
    authWeakPassword: "Такой пароль слишком легко подобрать. Возьмите подлиннее.",
    authSignupDisabled: "Создание новых аккаунтов на этом сервере отключено.",
    amountRequired: "Введите сумму больше нуля.",
    categoryRequired: "Выберите категорию.",
    invalidDate: "Эта дата неверна.",
    missingExpense: "Расход не найден.",
    categoryNameRequired: "Введите название категории.",
    categoryNameTooLong: "Название должно быть короче 40 символов.",
    categoryExists: "Такая категория уже есть.",
    budgetInvalid: "Введите бюджет больше нуля или оставьте поле пустым.",
    notSignedIn: "Вы не вошли в аккаунт.",
    missingApiKey: "На сервере не задан OPENAI_API_KEY.",
    modelNoText: "Модель не вернула текст.",
    modelBadJson: "Модель вернула некорректный JSON.",
    rateLimited: "OpenAI ограничил частоту запросов. Попробуйте через минуту.",
    insightsDisabled: "Аналитика отключена на этом сервере.",
    dailyLimitReached: (limit: number) =>
      `Вы использовали все аналитики на сегодня (${limit}). Лимит обновится в полночь — сохранённые аналитики остаются на месте.`,
    badApiKey: "Неверный OPENAI_API_KEY.",
    modelUnavailable: (model: string) =>
      `Модель «${model}» недоступна для этого аккаунта.`,
    openaiError: (status: number | undefined, message: string) =>
      `Ошибка OpenAI API (${status}): ${message}`,
    insightsFailed: "Не удалось создать аналитику.",
  },

  categories: {
    food: "Еда",
    transport: "Транспорт",
    utilities: "Коммунальные",
    entertainment: "Развлечения",
    shopping: "Покупки",
    health: "Здоровье",
    other: "Другое",
  },
};
