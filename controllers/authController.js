import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (userId, email = null) => {
  const payload = { id: userId };
  if (email) payload.email = email;

  const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
  console.log('🔐 JWT Secret during generation (first 20 chars):', jwtSecret.substring(0, 20) + '...');
  console.log('🔐 JWT Secret length during generation:', jwtSecret.length);
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "7d",
  });
};

// 🟢 Register User
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id, user.email);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔵 Login User
export const login = async (req, res) => {
  try {
    console.log("🔵 Login function called");
    console.log("🔵 Request body:", JSON.stringify(req.body));
    console.log("🔵 Request headers:", JSON.stringify(req.headers));
    const { email, password } = req.body;
    console.log("🔵 Email and password received:", email, password ? "Yes" : "No");

    // Validation
    console.log("🔵 Validating input");
    console.log("🔵 Email value:", email);
    console.log("🔵 Password value:", password);
    if (!email || !password) {
      console.log("🔵 Validation failed - missing email or password");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    console.log("🔵 Validation passed");

    // Special case for admin user
    console.log("🔍 Checking if admin user");
    console.log("🔍 Email check:", email === "outzen@gmail.com");
    console.log("🔍 Password check:", password === "123456");
    if (email === "outzen@gmail.com" && password === "123456") {
      console.log("🔍 Special admin login attempt");
      // Check if admin user exists
      console.log("🔍 Finding admin user in database");
      let user;
      try {
        console.log("🔍 About to call User.findOne");
        user = await User.findOne({ email });
        console.log("🔍 User.findOne completed");
        console.log("🔍 Admin user exists:", user ? 'Yes' : 'No');
        console.log("🔍 Admin user object:", user);
      } catch (dbError) {
        console.error("🔴 Database error finding admin user:", dbError);
        console.error("🔴 Database error stack:", dbError.stack);
        throw dbError;
      }

      if (!user) {
        // Create admin user if doesn't exist
        console.log("🔍 Creating admin user");
        try {
          console.log("🔍 About to call User.create");
          user = await User.create({
            name: "Admin User",
            email: "outzen@gmail.com",
            password: "123456",
            role: "admin"
          });
          console.log("✅ Admin user created");
          console.log("🔍 Created user object:", user);
        } catch (createError) {
          console.error("🔴 Error creating admin user:", createError);
          console.error("🔴 Create error stack:", createError.stack);
          throw createError;
        }
      } else {
        console.log("🔍 Admin user already exists, using existing user");
        console.log("🔍 Existing user object:", user);
      }

      // Generate token
      console.log("🔍 Generating token for admin user");
      console.log("🔍 User ID:", user._id);
      console.log("🔍 User email:", user.email);
      console.log("🔍 JWT_SECRET from env:", process.env.JWT_SECRET ? "Set" : "Not set");
      console.log("🔍 About to call generateToken");
      let token;
      try {
        token = generateToken(user._id, user.email);
        console.log("🔍 Token generated successfully");
        console.log("🔍 Token preview:", token.substring(0, 20) + "...");
      } catch (tokenError) {
        console.error("🔴 Admin token generation error:", tokenError);
        console.error("🔴 Admin token error stack:", tokenError.stack);
        throw tokenError;
      }

      console.log("🔍 About to return admin login response");
      console.log("🔍 Response data:", {
        success: true,
        message: "Admin login successful",
        token: token.substring(0, 20) + "...",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
      console.log("🔍 Sending response...");
      const responseData = {
        success: true,
        message: "Admin login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
      console.log("🔍 Response object created");
      console.log("🔍 About to call res.status(200).json");
      return res.status(200).json(responseData);
    }

    // Regular user login
    console.log('🔍 Regular user login path');
    // Find user and include password for comparison
    console.log('🔍 Finding user with email:', email);
    let user;
    try {
      console.log('🔍 About to call User.findOne for regular user');
      user = await User.findOne({ email }).select("+password");
      console.log('🔍 User.findOne completed for regular user');
      console.log('🔍 User found:', user ? 'Yes' : 'No');
      console.log('🔍 User object:', user);
      if (user) {
        console.log('🔍 User password field exists:', user.password ? 'Yes' : 'No');
      }
    } catch (dbError) {
      console.error("🔴 Database error finding user:", dbError);
      console.error("🔴 Database error stack:", dbError.stack);
      throw dbError;
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    console.log('🔍 Comparing password for user:', user.email);
    console.log('🔍 Password provided:', password);
    console.log('🔍 User password hash:', user.password ? user.password.substring(0, 20) + '...' : 'No password');
    console.log('🔍 About to call user.comparePassword');
    let isPasswordCorrect;
    try {
      isPasswordCorrect = await user.comparePassword(password);
      console.log('🔍 Password correct:', isPasswordCorrect);
    } catch (passwordError) {
      console.error("🔴 Password comparison error:", passwordError);
      console.error("🔴 Password error stack:", passwordError.stack);
      throw passwordError;
    }
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    console.log('🔍 Generating token for regular user');
    console.log('🔍 User ID for token:', user._id);
    console.log('🔍 User email for token:', user.email);
    console.log('🔍 JWT_SECRET from env:', process.env.JWT_SECRET ? "Set" : "Not set");
    let token;
    try {
      token = generateToken(user._id, user.email);
      console.log('🔍 Regular user token generated');
      console.log('🔍 Token preview:', token.substring(0, 20) + '...');
    } catch (tokenError) {
      console.error("🔴 Token generation error:", tokenError);
      console.error("🔴 Token error stack:", tokenError.stack);
      throw tokenError;
    }

    console.log('🔍 About to return regular user response');
    console.log('🔍 Response data:', {
      success: true,
      message: "Login successful",
      token: token.substring(0, 20) + "...",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    console.log('🔍 Sending regular user response...');
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("🔴 Login error:", error.message);
    console.error("🔴 Login error stack:", error.stack);
    console.error("🔴 Full error object:", error);
    console.error("🔴 Error name:", error.name);
    console.error("🔴 Error code:", error.code);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟡 Get Current User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🟠 Special Admin Profile Check (for token verification)
export const checkAdminProfile = async (req, res) => {
  try {
    // If it's the special admin user, return admin profile directly
    if (req.user.email === "outzen@gmail.com") {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          name: "Admin User",
          email: "outzen@gmail.com",
          role: "admin",
        },
      });
    }

    // Regular user profile check
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Check profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};