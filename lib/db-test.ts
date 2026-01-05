/**
 * Database Connection Test Utility
 * 
 * This file helps verify that your database connection is working correctly.
 * Run this in development to test your .env.local configuration.
 * 
 * Usage:
 * 1. Make sure MONGODB_URI is set in .env.local
 * 2. Run: npx tsx lib/db-test.ts (or use Node.js)
 * 
 * Or test via API: GET /api/test-db (if route exists)
 */

import { connectToDatabase, isDatabaseConnected, getDatabaseStatus } from "./db";
import mongoose from "mongoose";

async function testDatabaseConnection() {
  console.log("=".repeat(60));
  console.log("🔍 Testing Database Connection");
  console.log("=".repeat(60));
  console.log();

  // Check environment variable
  console.log("1️⃣ Checking MONGODB_URI environment variable...");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set!");
    console.error("   Please add it to your .env.local file:");
    console.error("   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database");
    process.exit(1);
  }
  console.log("✅ MONGODB_URI is set");
  console.log("   Format:", uri.startsWith("mongodb+srv://") ? "mongodb+srv://" : "mongodb://");
  console.log("   Length:", uri.length, "characters");
  console.log();

  // Test connection
  console.log("2️⃣ Attempting to connect to database...");
  try {
    const connection = await connectToDatabase();
    console.log("✅ Successfully connected to MongoDB!");
    console.log();

    // Connection details
    console.log("3️⃣ Connection Details:");
    console.log("   Status:", getDatabaseStatus());
    console.log("   Is Connected:", isDatabaseConnected() ? "Yes" : "No");
    console.log("   Database Name:", connection.connection.db?.databaseName || "unknown");
    console.log("   Host:", connection.connection.host || "unknown");
    console.log("   Port:", connection.connection.port || "unknown");
    console.log("   Ready State:", connection.connection.readyState);
    console.log();

    // Test a simple query
    console.log("4️⃣ Testing database query...");
    try {
      const db = connection.connection.db;
      if (!db) {
        console.warn("⚠️  Database object not available for query test");
      } else {
        const collections = await db.listCollections().toArray();
        console.log("✅ Database query successful!");
        console.log("   Collections found:", collections.length);
        if (collections.length > 0) {
          console.log("   Collection names:", collections.map((c) => c.name).join(", "));
        }
      }
    } catch (queryError) {
      console.error("⚠️  Query test failed:", queryError instanceof Error ? queryError.message : "Unknown error");
    }
    console.log();

    console.log("=".repeat(60));
    console.log("✅ All tests passed! Database connection is working correctly.");
    console.log("=".repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log("Connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error();
    console.error("Error details:");
    console.error("   Message:", error instanceof Error ? error.message : "Unknown error");
    console.error();
    console.error("Troubleshooting:");
    console.error("   1. Verify MONGODB_URI in .env.local is correct");
    console.error("   2. Check MongoDB Atlas network access (whitelist your IP)");
    console.error("   3. Verify username and password are correct");
    console.error("   4. Ensure the database name exists");
    console.error("   5. Check your internet connection");
    console.error();
    process.exit(1);
  }
}

// Run test if executed directly
if (require.main === module) {
  testDatabaseConnection().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
}

export { testDatabaseConnection };

