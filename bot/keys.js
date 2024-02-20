const keys = {
  // COMMANDS
  start: "/start",
  clear: "/clear",
  menu: "/menu",
  home: "/home",
  change_name: "/change_name",
  group_link: "/group_link",
  message: "/message",
  join: "join/",

  // MAIN KEYS
  createExpens: "➕ Qarz yaratish",
  payExpense: "💵 Qarz to'lash",
  myExpenses: "📊 Qarzlarim",
  group: "⚙️ Guruh sozlamalari",

  //GROUP
  createGroup: "➕ Guruh yaratish",
  myGroups: "📋 Guruhlarim",
  members: "👥 Guruh azolari",
  homePage: "🔙 Asosiy bo'lim",
};

module.exports.botSteps = {
  groupName: "GROUP_NAME",
  groupCurrency: "GROUP_CURRENCY",
  expensAmount: "EXPENSE_AMOUNT",
  expensDescription: "EXPENS_DESCRIPTION",
  expensType: "EXPENS_TYPE",
  distributionType: "DISTRIBUTATION",
  chooseDebtors: "CHOOSE_DEBTORS",
  payExpenseAmount: "PAY_EXPENSE_AMOUNT",
  changeUserName: "CHANGE_USER_NAME",
};

module.exports.keys = keys;

module.exports.mainKeys = [
  [keys.createExpens, keys.payExpense],
  [keys.myExpenses, keys.group],
];

module.exports.onlyHomePageKey = [[keys.homePage]];

module.exports.noCurrentGroupKeys = [[keys.createGroup]];

module.exports.groupKeys = [
  [keys.createGroup, keys.myGroups],
  [keys.members, keys.homePage],
];
