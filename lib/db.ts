import mongoose from "mongoose";

/**
 * Get MongoDB URI from environment variables
 * Next.js automatically loads .env.local, .env.development.local, .env.production.local
 * Priority: .env.local > .env.development.local/.env.production.local > .env
 */
const getUri = (): string => {
  // Check for MONGODB_URI in environment variables
  const uriEnv = process.env.MONGODB_URI;
  
  if (!uriEnv) {
    const errorMessage = `
MONGODB_URI is not set in your environment variables.

Please add it to your .env.local file:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

For Vercel deployment, add it in:
Vercel Dashboard → Settings → Environment Variables

Current NODE_ENV: ${process.env.NODE_ENV || "not set"}
    `.trim();
    throw new Error(errorMessage);
  }

  // Basic validation of MongoDB URI format
  if (!uriEnv.startsWith("mongodb://") && !uriEnv.startsWith("mongodb+srv://")) {
    throw new Error(
      `Invalid MONGODB_URI format. Must start with "mongodb://" or "mongodb+srv://".\n` +
      `Current value starts with: ${uriEnv.substring(0, 20)}...`
    );
  }

  return uriEnv;
};

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalWithMongoose.mongooseCache || { conn: null, promise: null };

globalWithMongoose.mongooseCache = cache;

/**
 * Connect to MongoDB database
 * Uses connection caching to prevent multiple connections in serverless environments
 * 
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 * @throws {Error} If connection fails or MONGODB_URI is not set
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cache.conn) {
    // Verify connection is still alive
    if (mongoose.connection.readyState === 1) {
      return cache.conn;
    }
    // Connection lost, reset cache
    cache.conn = null;
    cache.promise = null;
  }

  // Create new connection if not already in progress
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    
    const uri = getUri();
    
    // Connection options for better reliability
    const connectionOptions: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1, // Minimum number of connections in the pool
      retryWrites: true,
      retryReads: true,
    };

    console.log("[DB] Attempting to connect to MongoDB...");
    console.log("[DB] Connection URI format:", uri.startsWith("mongodb+srv://") ? "mongodb+srv://" : "mongodb://");
    
    cache.promise = mongoose
      .connect(uri, connectionOptions)
      .then((mongoose) => {
        console.log("[DB] ✅ Successfully connected to MongoDB");
        console.log("[DB] Database:", mongoose.connection.db?.databaseName || "unknown");
        console.log("[DB] Connection state:", mongoose.connection.readyState === 1 ? "connected" : "disconnected");
        return mongoose;
      })
      .catch((error) => {
        // Clear promise on error so we can retry
        cache.promise = null;
        console.error("[DB] ❌ Failed to connect to MongoDB:", error.message);
        throw new Error(
          `Database connection failed: ${error.message}\n` +
          `Please verify your MONGODB_URI in .env.local is correct.\n` +
          `For MongoDB Atlas, ensure your IP is whitelisted and the connection string is valid.`
        );
      });
  }

  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    // Clear cache on error
    cache.conn = null;
    cache.promise = null;
    throw error;
  }
}

/**
 * Check if database is connected
 * @returns {boolean} True if connected, false otherwise
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Get database connection status
 * @returns {string} Connection status string
 */
export function getDatabaseStatus(): string {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState as keyof typeof states] || "unknown";
}

