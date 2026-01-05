import { v2 as cloudinary } from "cloudinary";

// Function to configure Cloudinary from environment variable
// Always checks configuration at runtime to handle Next.js serverless environments
function configureCloudinary(): { configured: boolean; error?: string } {
  // Check at runtime, not just module load time
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  
  // Support both CLOUDINARY_URL format and separate variables
  let apiKey: string | undefined;
  let apiSecret: string | undefined;
  let cloudName: string | undefined;

  if (cloudinaryUrl) {
    // Parse CLOUDINARY_URL if provided
    // Format: cloudinary://api_key:api_secret@cloud_name
    try {
      const url = new URL(cloudinaryUrl);
      apiKey = url.username;
      apiSecret = url.password;
      cloudName = url.hostname;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error parsing CLOUDINARY_URL:", errorMessage);
      return { 
        configured: false, 
        error: `Invalid CLOUDINARY_URL format: ${errorMessage}` 
      };
    }
  }

  // Fallback to separate environment variables
  if (!apiKey || !apiSecret || !cloudName) {
    apiKey = process.env.CLOUDINARY_API_KEY;
    apiSecret = process.env.CLOUDINARY_API_SECRET;
    cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  }

  if (apiKey && apiSecret && cloudName) {
    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      return { configured: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error configuring Cloudinary:", errorMessage);
      return { 
        configured: false, 
        error: `Failed to configure Cloudinary: ${errorMessage}` 
      };
    }
  } else {
    const missing = [];
    if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
    
    const errorMsg = `Missing Cloudinary credentials: ${missing.join(", ")}. Please set either CLOUDINARY_URL or all of CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET`;
    console.warn(errorMsg);
    return { configured: false, error: errorMsg };
  }
}

// Validate data URL format
function validateDataUrl(dataUrl: string): { valid: boolean; error?: string } {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { valid: false, error: "Data URL must be a non-empty string" };
  }

  if (!dataUrl.startsWith("data:")) {
    return { valid: false, error: "Data URL must start with 'data:'" };
  }

  // Check for basic data URL format: data:[<mediatype>][;base64],<data>
  const dataUrlPattern = /^data:([a-zA-Z][a-zA-Z0-9]*\/[a-zA-Z0-9][a-zA-Z0-9]*)?(;[a-zA-Z0-9]+)?(;base64)?,(.+)$/;
  if (!dataUrlPattern.test(dataUrl)) {
    return { valid: false, error: "Invalid data URL format" };
  }

  // Check if data URL is too large (Cloudinary has limits)
  // Rough estimate: base64 is ~33% larger than original
  try {
    const parts = dataUrl.split(",");
    if (parts.length > 1) {
      const base64Data = parts[1];
      if (base64Data && base64Data.length > 10 * 1024 * 1024) { // ~10MB base64 = ~7.5MB original
        return { valid: false, error: "File size exceeds maximum limit (approximately 7.5MB)" };
      }
    }
  } catch {
    // If splitting fails, let Cloudinary handle the validation
    return { valid: true };
  }

  return { valid: true };
}

export const uploadImage = async (dataUrl: string, folder?: string) => {
  // Validate data URL format before attempting upload
  const validation = validateDataUrl(dataUrl);
  if (!validation.valid) {
    throw new Error(`Invalid data URL: ${validation.error}`);
  }

  // Check data URL size before attempting upload to prevent memory issues
  if (dataUrl.length > 15 * 1024 * 1024) { // 15MB limit for data URL string
    throw new Error("Image file is too large. Maximum size is approximately 10MB.");
  }

  // Always check configuration at upload time (don't rely on stale flag)
  const config = configureCloudinary();
  if (!config.configured) {
    const errorMessage = config.error || "Cloudinary is not configured";
    throw new Error(
      `${errorMessage}. Please set one of the following in your .env.local file:\n\n` +
      "Option 1 (Recommended - Single URL):\n" +
      "CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name\n\n" +
      "Option 2 (Separate variables):\n" +
      "CLOUDINARY_CLOUD_NAME=your_cloud_name\n" +
      "CLOUDINARY_API_KEY=your_api_key\n" +
      "CLOUDINARY_API_SECRET=your_api_secret\n\n" +
      "After adding the variables, restart your development server.\n" +
      "You can find these values in your Cloudinary dashboard at https://cloudinary.com/console"
    );
  }

  try {
    console.log(`[Cloudinary] Uploading image to folder: ${folder || "root"} (size: ${(dataUrl.length / 1024 / 1024).toFixed(2)}MB)`);
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: "image",
      timeout: 60000, // 60 second timeout
    });

    console.log(`[Cloudinary] Successfully uploaded image: ${result.secure_url} (public_id: ${result.public_id})`);
    return result.secure_url;
  } catch (error: any) {
    // Safely extract error details to avoid circular reference issues
    let errorMessage = "Unknown error";
    let httpCode: number | undefined;
    let errorName: string | undefined;
    
    try {
      if (error instanceof Error) {
        errorMessage = error.message || "Unknown error";
        errorName = error.name;
      } else if (error && typeof error === "object") {
        // Safely extract properties without triggering circular references
        if (typeof error.message === "string") {
          errorMessage = error.message;
        }
        if (typeof error.http_code === "number") {
          httpCode = error.http_code;
        }
        if (typeof error.name === "string") {
          errorName = error.name;
        }
      }
    } catch {
      // If error extraction fails, use default values
    }
    
    const errorDetails = {
      message: errorMessage,
      http_code: httpCode,
      name: errorName,
      folder,
    };
    console.error("[Cloudinary] Image upload failed:", errorDetails);
    
    // Provide more detailed error message
    let finalErrorMessage = "Failed to upload image to Cloudinary";
    if (httpCode) {
      finalErrorMessage += ` (HTTP ${httpCode})`;
    }
    if (errorMessage && errorMessage !== "Unknown error") {
      finalErrorMessage += `: ${errorMessage}`;
    } else {
      finalErrorMessage += ". Please check your Cloudinary configuration.";
    }
    
    throw new Error(finalErrorMessage);
  }
};

export const uploadFile = async (dataUrl: string, folder?: string) => {
  // Validate data URL format before attempting upload
  const validation = validateDataUrl(dataUrl);
  if (!validation.valid) {
    throw new Error(`Invalid data URL: ${validation.error}`);
  }

  // Always check configuration at upload time (don't rely on stale flag)
  const config = configureCloudinary();
  if (!config.configured) {
    const errorMessage = config.error || "Cloudinary is not configured";
    throw new Error(
      `${errorMessage}. Please set one of the following in your .env.local file:\n\n` +
      "Option 1 (Recommended - Single URL):\n" +
      "CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name\n\n" +
      "Option 2 (Separate variables):\n" +
      "CLOUDINARY_CLOUD_NAME=your_cloud_name\n" +
      "CLOUDINARY_API_KEY=your_api_key\n" +
      "CLOUDINARY_API_SECRET=your_api_secret\n\n" +
      "After adding the variables, restart your development server.\n" +
      "You can find these values in your Cloudinary dashboard at https://cloudinary.com/console"
    );
  }

  try {
    console.log(`[Cloudinary] Uploading file to folder: ${folder || "root"}`);
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: "raw",
      timeout: 60000, // 60 second timeout
    });

    console.log(`[Cloudinary] Successfully uploaded file: ${result.secure_url} (public_id: ${result.public_id})`);
    return result.secure_url;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || "Unknown error",
      http_code: error?.http_code,
      name: error?.name,
      folder,
    };
    console.error("[Cloudinary] File upload failed:", errorDetails);
    
    // Provide more detailed error message
    let errorMessage = "Failed to upload file to Cloudinary";
    if (error?.http_code) {
      errorMessage += ` (HTTP ${error.http_code})`;
    }
    if (error?.message) {
      errorMessage += `: ${error.message}`;
    } else {
      errorMessage += ". Please check your Cloudinary configuration.";
    }
    
    throw new Error(errorMessage);
  }
};

