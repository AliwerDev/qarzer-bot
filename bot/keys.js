const keys = {
  // COMMANDS
  start: "/start",
  clear: "/clear",

  // MAIN KEYS
  createExpens: "➕ Qarz yaratish",
  myExpenses: "Mening qarzlarim",
  joinGroup: "Guruhga qo'shilish",
  group: "Guruh sozlamalari ➡️",

  //GROUP
  createGroup: "➕ Guruh yaratish",
  myGroups: "Mening guruhlarim",
  currentGroup: "Joriy guruhim",
  members: "Guruh azolari",
  homePage: "🔙 Asosiy bo'lim",
};

module.exports.botSteps = {
  joinGroup: "JOIN_TO_GROUP",
  createGroup: "CREATE_GROUP",
  expensAmount: "EXPENS_AMOUNT",
  expensDescription: "EXPENS_DESCRIPTION",
  expensType: "EXPENS_TYPE",
  distributionType: "DISTRIBUTATION",
  chooseDebtors: "CHOOSE_DEBTORS",
};

module.exports.keys = keys;

module.exports.mainKeys = [
  [keys.createExpens, keys.myExpenses, keys.clear],
  [keys.currentGroup, keys.group],
];

module.exports.onlyHomePageKey = [[keys.homePage]];

module.exports.noCurrentGroupKeys = [[keys.joinGroup, keys.createGroup]];

module.exports.groupKeys = [[keys.createGroup, keys.myGroups], [keys.members, keys.joinGroup], [keys.homePage]];
