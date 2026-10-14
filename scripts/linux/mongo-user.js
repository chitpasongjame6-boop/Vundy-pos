/* global db */
// Runs only for a new, empty MongoDB data volume. The app cannot administer other DBs.
if (!process.env.MONGO_APP_PASSWORD) throw new Error("Missing app database password");
db.getSiblingDB("vundy_pos").createUser({
  user: "vundy_app",
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "vundy_pos" }]
});
