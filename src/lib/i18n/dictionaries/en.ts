/**
 * The canonical dictionary. `Dictionary` is derived from this object, so a key
 * added here is a compile error in `ru.ts` and `uz.ts` until it's translated —
 * that type check is the only thing keeping the three files in step.
 *
 * Strings that carry a value are functions rather than templates with
 * placeholders, so each language can put the number where its grammar wants it
 * and pick its own plural form.
 */
export const en = {
  appName: "Xarajat",
  currency: "so'm",

  meta: {
    description: "Log spending in seconds. Weekly and monthly breakdowns in so'm.",
    add: "Add expense — Xarajat",
    week: "This week — Xarajat",
    month: "This month — Xarajat",
    history: "History — Xarajat",
    insights: "Insights — Xarajat",
    settings: "Settings — Xarajat",
    login: "Sign in — Xarajat",
  },

  nav: {
    label: "Main",
    add: "Add",
    week: "Week",
    month: "Month",
    history: "History",
    insights: "Insights",
  },

  header: {
    settings: "Settings",
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
    language: "Language",
  },

  dates: {
    today: "Today",
    yesterday: "Yesterday",
  },

  home: {
    today: "Today",
    thisWeek: "This week",
    loggedToday: "Logged today",
    nothingToday: "Nothing logged today yet.",
  },

  quickAdd: {
    amountLabel: "Amount in so'm",
    category: "Category",
    today: "Today",
    yesterday: "Yesterday",
    pickDate: "Pick a date",
    addNote: "+ Note",
    note: "Note (optional)",
    saving: "Saving…",
    save: "Save expense",
    saved: "Saved ✓",
  },

  week: {
    title: "This week",
    thisWeek: "This week",
    lastWeek: "Last week",
    vsLastWeek: "vs last week",
    dailySpending: "Daily spending",
    nothingTwoWeeks: "No spending logged in the last two weeks.",
    byCategory: "By category",
    nothingThisWeek: "Nothing logged this week yet.",
    expenses: "This week's expenses",
  },

  month: {
    thisMonth: "This month",
    lastMonth: "Last month",
    vsLastMonth: "vs last month",
    dayCount: (day: number) => `Day ${day}`,
    dailyAverage: (amount: string) => `${amount} a day on average`,
    budget: "Budget",
    change: "Change",
    setBudget: "Set budget",
    budgetUsed: "Monthly budget used",
    budgetOf: (budget: string) => `of ${budget}`,
    overBudget: "Over budget by",
    leftThisMonth: "left this month",
    noBudget: "No monthly budget set.",
    addBudget: "Add one",
    toTrackRemaining: "to track what's left.",
    dailySpending: "Daily spending",
    nothingTwoMonths: "No spending logged in the last two months.",
    byCategory: "By category",
    nothingThisMonth: "Nothing logged this month yet.",
    topCategory: (category: string, share: number) => ({
      before: `${category} was `,
      value: `${share}%`,
      after: " of your spending this month.",
    }),
  },

  history: {
    title: "History",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    thisMonth: "This month",
    lastMonth: "Last month",
    from: "From",
    to: "To",
    category: "Category",
    allCategories: "All categories",
    clearFilters: "Clear filters",
    expenseCount: (count: number) => `${count} expense${count === 1 ? "" : "s"}`,
    noMatches: "Nothing matches those filters.",
    capped: "Showing the 300 most recent matches — narrow the date range to see more.",
  },

  insights: {
    title: "Insights",
    subtitle: "A short read on your spending, generated on demand.",
    period: "Period",
    thisWeek: "This week",
    thisMonth: "This month",
    generate: "Generate insights",
    generating: "Reading your spending…",
    nothingSent: "Nothing is sent to the AI until you press the button.",
    stale: "Showing an earlier summary — press generate again for what's selected now.",
    language: "Summary language",
    past: "Past insights",
    weekOf: (date: string) => `Week of ${date}`,
    monthOf: (date: string) => `Month of ${date}`,
    failed: "Could not generate insights.",
    unreachable: "Could not reach the server.",
  },

  settings: {
    title: "Settings",
    monthlyBudget: "Monthly budget",
    budgetLabel: "Amount in so'm (blank = no budget)",
    budgetPlaceholder: "e.g. 5 000 000",
    categories: "Categories",
    addCategory: "Add a category",
    categoryPlaceholder: "e.g. Coffee",
    removeCategory: (name: string) => `Remove ${name}`,
    removalNote:
      "Removing a category only takes it out of the picker — expenses already logged under it keep their category.",
    account: "Account",
    signOut: "Sign out",
    save: "Save",
    add: "Add",
    saved: "Saved ✓",
  },

  expense: {
    amount: "Amount",
    date: "Date",
    category: "Category",
    note: "Note",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
  },

  chart: {
    categoryShare: (category: string, amount: string, share: number) =>
      `${category}: ${amount}, ${share} percent of the period`,
  },

  login: {
    tagline: "Track spending in so'm. Synced across your devices.",
    account: "Account",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    createAccount: "Create account",
  },

  error: {
    sessionHiccup: "Your session hiccuped while loading this page.",
    generic: "Something went wrong loading this page.",
    tryAgain: "Try again",
    hiccupHint:
      "This usually clears on its own. If it keeps happening, sign out and back in.",
    dataSafe: "Your data is safe — nothing was lost.",
  },

  /** Returned by Server Actions and the insights route, so they live here too. */
  actions: {
    credentialsRequired: "Email and password are required.",
    passwordTooShort: "Password must be at least 8 characters.",
    confirmEmail: "Account created. Check your email to confirm it, then sign in.",
    amountRequired: "Enter an amount greater than zero.",
    categoryRequired: "Pick a category.",
    invalidDate: "That date isn't valid.",
    missingExpense: "Missing expense.",
    categoryNameRequired: "Enter a category name.",
    categoryNameTooLong: "Keep the name under 40 characters.",
    categoryExists: "That category already exists.",
    budgetInvalid: "Enter a budget greater than zero, or leave it blank.",
    notSignedIn: "Not signed in.",
    missingApiKey: "OPENAI_API_KEY is not set on the server.",
    modelNoText: "The model returned no text.",
    modelBadJson: "The model returned malformed JSON.",
    rateLimited: "Rate limited by OpenAI. Try again in a moment.",
    badApiKey: "Invalid OPENAI_API_KEY.",
    modelUnavailable: (model: string) =>
      `Model "${model}" is not available on this account.`,
    openaiError: (status: number | undefined, message: string) =>
      `OpenAI API error (${status}): ${message}`,
    insightsFailed: "Could not generate insights.",
  },

  /**
   * Only the categories seeded for every new account. Anything the user typed
   * themselves is their own text and is shown exactly as entered.
   */
  categories: {
    food: "Food",
    transport: "Transport",
    utilities: "Utilities",
    entertainment: "Entertainment",
    shopping: "Shopping",
    health: "Health",
    other: "Other",
  },
};

export type Dictionary = typeof en;
