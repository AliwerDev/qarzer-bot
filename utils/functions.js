const jwt = require("jsonwebtoken");
const { JWT_KEY, BASE_URL, HOST_URL } = require("../const");

module.exports.getFullName = (user) => `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

module.exports.reminderText = () => {
  const reminders = [
    "Assalomu alaykum! Shunchaki siz olgan qarzingiz haqida eslashni xohlardim - bu esdalik emas, bilasizmi?",
    "Men sizni unutuvchan deb aytmayapman, lekin hatto fillar ham qarzlarni eslaydilar. Sizchi?",
    "Umid qilamanki, xotirangiz ham uzringiz kabi yaxshidir. Bu qarzni unutmang, do'stim!",
    "Shunchaki do'stona eslatma, sizning qarzingizdan tezroq o'sib borayotgan yagona narsa bu mening sabrsizligimdir.",
    "Qarzingiz qo'ng'iroq qildi. U uyga qaytmoqchi. Uyni sog'inmoqda.",
    "Men hamyonimni ko'zdan kechirayotgan edim va sizning rasmingizni topdim. Bu sizning qarzingizni eslatdi.",
    "Men sizning qarzingizni mashhur deb aytmayapman, lekin u qanday qilib diqqat markazida qolishni biladi.",
    "Odamlar kulgi eng yaxshi dori deyishadi. Agar siz kimdandir qarz bolsangiz - bu to'lov.",
    "Olimlar yangi elementni kashf qilganini eshitdim - bu 'Qarzni to'lash sirlari' deb nomlanadi. Siz buni ko'rib chiqishingiz mumkin.",
    "Asabiylashish ninjaga o'xshashligini eslatish uchun shunchaki qisqa eslatma - sokin, lekin halokatli. U paydo bo'lishidan oldin uni hal qiling.",
    "Umid qilamanki, sizning xotirangiz balansingizdan yaxshiroq. Bu qarzni unutmang!",
    "Agar qarzlarni unutish sport bo'lsa, siz hozirga qadar Olimpiada oltin medali sohibi bo'lar edingiz. Rekordni yangilash vaqti!",
    "Men sizga qarzingiz haqida hazil yubormoqchi edim, ammo moliyaviy ahvolingiz juda kulgili deb o'yladim.",
    "Sizning qarzingiz arvohga o'xshaydi - u meni ta'qib qilmoqda, ammo bu holda men sizni ham ta'qib qilishni xohlayman.",
    "Men sizga she'r yozishni o'yladim, lekin eslatmalar samaraliroq deb o'yladim. To'lang!",
    "Sizning qarzingiz yomon davomiy filmga o'xshaydi - hech kim buni so'ramagan, lekin kayfiyatni buzishda davom etyapti.",
    "Vaqt hamma yaralarni davolaydi, deyishadi. Unutmang, vaqt qarzga foiz to'playdiham. Tik-tok!",
  ];

  const randomIndex = Math.floor(Math.random() * reminders.length);

  return reminders[randomIndex];
};

module.exports.formatMoney = (currency, money) => {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(money);
};

module.exports.generateAccessUrl = (userId, groupId) => {
  const token = jwt.sign({ userId, groupId }, JWT_KEY, {
    expiresIn: "24h",
  });
  return `${HOST_URL}?login=true&token=${token}`;
};
