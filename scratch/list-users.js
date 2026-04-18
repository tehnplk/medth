import { query } from "../src/lib/db";

async function listUsers() {
  try {
    const users = await query("SELECT username, role FROM users");
    console.log("Users in DB:", JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

listUsers();
