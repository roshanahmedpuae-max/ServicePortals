/**
 * Database Connection Test API Route
 * 
 * This endpoint helps verify that your database connection is working correctly.
 * 
 * GET /api/test-db
 * 
 * Returns:
 * - Connection status
 * - Database information
 * - Collection count
 * 
 * Note: This is a development/testing endpoint. Consider removing or protecting it in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, isDatabaseConnected, getDatabaseStatus } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check if MONGODB_URI is set
    const hasUri = !!process.env.MONGODB_URI;
    
    if (!hasUri) {
      return NextResponse.json(
        {
          success: false,
          error: "MONGODB_URI is not set",
          message: "Please add MONGODB_URI to your .env.local file",
          environment: process.env.NODE_ENV || "development",
        },
        { status: 500 }
      );
    }

    // Attempt to connect
    const connection = await connectToDatabase();
    
    // Get connection details
    const db = connection.connection.db;
    const dbName = db?.databaseName || "unknown";
    const host = connection.connection.host || "unknown";
    const port = connection.connection.port || "unknown";
    
    // Test query - get collection count
    let collectionCount = 0;
    let collectionNames: string[] = [];
    try {
      const collections = await db?.listCollections().toArray();
      collectionCount = collections?.length || 0;
      collectionNames = collections?.map((c) => c.name) || [];
    } catch (queryError) {
      // Query failed but connection is established
      console.error("Collection query failed:", queryError);
    }

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      connection: {
        status: getDatabaseStatus(),
        isConnected: isDatabaseConnected(),
        readyState: connection.connection.readyState,
        database: dbName,
        host,
        port,
      },
      database: {
        name: dbName,
        collectionCount,
        collections: collectionNames,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        hasMongoUri: hasUri,
        uriFormat: process.env.MONGODB_URI?.startsWith("mongodb+srv://") 
          ? "mongodb+srv://" 
          : "mongodb://",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        message: errorMessage,
        troubleshooting: {
          step1: "Verify MONGODB_URI is set in .env.local",
          step2: "Check MongoDB Atlas network access (whitelist your IP)",
          step3: "Verify username and password are correct",
          step4: "Ensure the database name exists",
          step5: "Check your internet connection",
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          hasMongoUri: !!process.env.MONGODB_URI,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

