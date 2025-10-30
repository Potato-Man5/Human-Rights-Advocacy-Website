const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.submitVote = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const isYes = req.body.isYes;

  if (!ip) return res.status(400).send("IP not found");

  const db = admin.database();
  const ipRef = db.ref("ipVotes/" + encodeURIComponent(ip.replace(/\./g, "_")));

  const existing = await ipRef.once("value");
  if (existing.exists()) {
    return res.status(403).send("Already voted");
  }

  await ipRef.set({
    vote: isYes ? "yes" : "no",
    ts: admin.database.ServerValue.TIMESTAMP
  });

  const votesRef = db.ref("pollVotes");
  await votesRef.push({
    vote: isYes ? "yes" : "no",
    ip: ip,
    ts: admin.database.ServerValue.TIMESTAMP
  });

  res.status(200).send("Vote recorded");
});
