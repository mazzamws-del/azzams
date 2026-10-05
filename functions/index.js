const { onValueCreated } = require("firebase-functions/database");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const DB_INSTANCE = "azzams-system-default-rtdb";
const ADMIN_TOPIC = "azzams_admin";
const txt = (v) => v == null ? "" : String(v);
const money = (v) => Math.round(Number(v) || 0).toLocaleString("en-US") + " ج";

async function customerName(orderId, fallback) {
  if (!orderId) return fallback || "العميل";
  const snap = await getDatabase().ref("sales/" + orderId + "/customer").get();
  return snap.exists() ? txt(snap.val()) : (fallback || "العميل");
}

async function push(title, body, data) {
  return getMessaging().send({
    topic: ADMIN_TOPIC,
    notification: { title: txt(title), body: txt(body) },
    data: Object.fromEntries(Object.entries(data || {}).map(([k,v]) => [k, txt(v)])),
    android: {
      priority: "high",
      notification: { channelId: "azzams_events", sound: "default" }
    }
  });
}

exports.courierEventPush = onValueCreated({
  ref: "/courier_events/{eventId}",
  instance: DB_INSTANCE,
  region: "us-central1"
}, async (event) => {
  const e = event.data.val() || {};
  const orderId = txt(e.orderId);
  const courier = txt(e.courierName || "المندوب");
  const customer = await customerName(orderId);
  let title = "🛵 تحديث من المندوب";
  let body = courier + " حدّث أوردر " + customer;

  if (e.type === "postponed") {
    title = "⏰ تأجيل أوردر";
    body = courier + " أجّل أوردر " + customer + " إلى " + txt(e.until || "موعد جديد");
    if (e.note) body += " — " + txt(e.note);
  } else if (e.type === "note") {
    title = "📝 ملاحظة من المندوب";
    body = courier + " — " + customer + ": " + txt(e.note || "أضاف ملاحظة");
  } else if (e.type === "result" && e.result === "delivered") {
    title = "✅ تم تسليم أوردر";
    body = courier + " سلّم أوردر " + customer + " — هتستلم منه " + money(e.storeDue);
  } else if (e.type === "result" && e.result === "cancelled") {
    title = "❌ أوردر ملغي";
    body = courier + " ألغى أوردر " + customer + (e.reason ? " — " + txt(e.reason) : "");
  } else if (e.type === "result") {
    title = "↩️ أوردر مرتجع";
    body = courier + " رجّع أوردر " + customer + (e.reason ? " — " + txt(e.reason) : "");
  }

  const id = await push(title, body, {
    type: "courier_event",
    eventType: txt(e.type),
    result: txt(e.result),
    orderId
  });
  logger.info("Courier push sent", { id, orderId });
});

exports.moderatorEventPush = onValueCreated({
  ref: "/moderator_events/{eventId}",
  instance: DB_INSTANCE,
  region: "us-central1"
}, async (event) => {
  const e = event.data.val() || {};
  const orderId = txt(e.orderId);
  const moderator = txt(e.moderatorName || "الموديريتور");
  const customer = txt(e.customer) || await customerName(orderId);
  let title = "🎧 تحديث من موديريتور";
  let body = moderator + " حدّث أوردر " + customer;

  if (e.type === "new_order") {
    title = "🛒 أوردر جديد";
    body = moderator + " سجل أوردر " + customer + " — المطلوب " + money(e.total);
  } else if (e.type === "edit_order") {
    title = "✏️ تعديل أوردر";
    body = moderator + " عدّل بيانات أوردر " + customer;
  }

  const id = await push(title, body, {
    type: "moderator_event",
    eventType: txt(e.type),
    orderId
  });
  logger.info("Moderator push sent", { id, orderId });
});
