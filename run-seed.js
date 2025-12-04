const { query } = require("./lib/db");
const fs = require("fs");

async function runSeed() {
  try {
    // Use combined SQL file for schema + seed + migrations
    const seedSQL = fs.readFileSync(
      "./scripts/all-schema-and-seed.sql",
      "utf8"
    );
    await query(seedSQL);
    console.log("Schema and seed applied successfully");
  } catch (error) {
    console.error("Error running combined seed:", error);
  }
}

runSeed();
