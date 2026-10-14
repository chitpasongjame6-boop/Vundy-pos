/* global Mongo, sleep, print, quit */
// Retry through the official Mongo image's initial standalone setup/restart.
let ready = false;
for (let attempt = 0; attempt < 90; attempt += 1) {
  try {
    const connection = new Mongo("mongodb://mongo:27017/?directConnection=true&serverSelectionTimeoutMS=2000");
    const admin = connection.getDB("admin");
    admin.auth("vundy_root", process.env.MONGO_ROOT_PASSWORD);
    let status;
    try {
      status = admin.runCommand({ replSetGetStatus: 1 });
    } catch (error) {
      if (error.code !== 94) throw error;
      status = { code: 94 };
    }
    if (status.code === 94) {
      admin.runCommand({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] } });
    }
    const hello = admin.runCommand({ hello: 1 });
    if (hello.setName === "rs0" && hello.isWritablePrimary) {
      ready = true;
      break;
    }
  } catch {
    // Never log connection strings or credentials.
  }
  sleep(2000);
}
if (!ready) {
  print("Local MongoDB is not ready. Check container logs and the original credentials; do not reset volumes.");
  quit(1);
}
print("Local replica set rs0 is ready.");
