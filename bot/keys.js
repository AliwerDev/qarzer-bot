const keys = {
  // COMMANDS
  start: "/start",
  clear: "/clear",
  menu: "/menu",

  // MAIN KEYS
  createExpens: "➕ Qarz yaratish",
  myExpenses: "📊 Qarzlarim",
  joinGroup: "🤝 Guruhga qo'shilish",
  group: "Guruh sozlamalari ➡️",

  //GROUP
  createGroup: "➕ Guruh yaratish",
  myGroups: "📋 Mening guruhlarim",
  currentGroup: "📌 Joriy guruhim",
  members: "👥 Guruh azolari",
  homePage: "🔙 Asosiy bo'lim",

  // Expense types
  activeExpense: "🕧 To'lanmagan",
  paidExpense: "✅ To'langan",
  createdByMe: "💰 Mening harajatlarim",
  clearAllExpenses: "🔄 Hisobni yangilash",
};

module.exports.botSteps = {
  joinGroup: "JOIN_TO_GROUP",
  groupName: "GROUP_NAME",
  groupCurrency: "GROUP_CURRENCY",
  expensAmount: "EXPENS_AMOUNT",
  expensDescription: "EXPENS_DESCRIPTION",
  expensType: "EXPENS_TYPE",
  distributionType: "DISTRIBUTATION",
  chooseDebtors: "CHOOSE_DEBTORS",
};

module.exports.keys = keys;

module.exports.mainKeys = [
  [keys.createExpens, keys.myExpenses],
  [keys.currentGroup, keys.group],
];

module.exports.onlyHomePageKey = [[keys.homePage]];

module.exports.noCurrentGroupKeys = [[keys.joinGroup, keys.createGroup]];

module.exports.expenseKeys = [[keys.activeExpense, keys.paidExpense], [keys.createdByMe, keys.clearAllExpenses], [keys.homePage]];

module.exports.groupKeys = [[keys.createGroup, keys.myGroups], [keys.members, keys.joinGroup], [keys.homePage]];
