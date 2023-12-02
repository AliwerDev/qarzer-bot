const keys = {
  // MAIN KEYS
  createDebt: "➕ Qarz yaratish",
  myDebts: "Mening qarzlarim",
  joinGroup: "Guruhga qo'shilish",
  group: "Guruh sozlamlari ➡️",

  //GROUP
  createGroup: "➕ Guruh yaratish",
  myGroups: "Mening guruhlarim",
  currentGroup: "Joriy guruhim",
  members: "Guruh azolari",
  back: "🔙 Ortga",
};

module.exports.keys = keys;

module.exports.mainKeys = [
  [keys.createDebt, keys.myDebts, "clear"],
  [keys.currentGroup, keys.group],
];

module.exports.onlyBackKeys = [[keys.back]];

module.exports.noCurrentGroupKeys = [[keys.joinGroup, keys.createGroup]];

module.exports.groupKeys = [[keys.createGroup, keys.myGroups], [keys.members, keys.joinGroup], [keys.back]];
