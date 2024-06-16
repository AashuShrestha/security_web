const Users = require("../model/userModel");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary");
const jwt = require("jsonwebtoken");
//* Importing required modules
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Email and Password Regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password
  },
});
const createUser = async (req, res) => {
  // Sanitize input
  const firstName = validator.trim(req.body.firstName);
  const lastName = validator.trim(req.body.lastName);
  const email = validator.normalizeEmail(validator.trim(req.body.email));
  const password = validator.trim(req.body.password);

  if (!firstName || !lastName || !email || !password) {
    return res.json({
      success: false,
      message: "Please enter all the fields.",
    });
  }

  if (!emailRegex.test(email)) {
    return res.json({
      success: false,
      message: "Invalid email format.",
    });
  }

  if (!passwordRegex.test(password)) {
    return res.json({
      success: false,
      message: "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.",
    });
  }

  try {
    const existingUser = await Users.findOne({ email: email });
    if (existingUser) {
      return res.json({
        success: false,
        message: "User already exists.",
      });
    }

    const randomSalt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, randomSalt);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 3600000; // 1 hour from now

    const newUser = new Users({
      firstName,
      lastName,
      email,
      password: encryptedPassword,
      verificationToken,
      verificationTokenExpires,
    });

    await newUser.save();

    const verificationUrl = `${req.protocol}://${req.get("host")}/api/user/verify-email?token=${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL,
      to: newUser.email,
      subject: 'Verify your email address',
      html: `<p>Please verify your email address by clicking the following link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Email sending failed." });
      }
      res.status(200).json({
        success: true,
        message: "User created successfully. Please verify your email.",
      });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json("Server Error");
  }
};

const loginUser = async (req, res) => {
  // Sanitize input
  const email = validator.normalizeEmail(validator.trim(req.body.email));
  const password = validator.trim(req.body.password);

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please enter all fields.",
    });
  }

  try {
    const user = await Users.findOne({ email: email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials.",
      });
    }

    if (!user.emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials.",
      });
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour in milliseconds
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      userData: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await Users.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token.",
      });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


//todo: get user by id
const getUserById = async (req, res) => {
  const { userId } = req.params; // Retrieve userId from request parameters

  try {
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "User found successfully",
      user: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
};

//todo: change password
const changePassword = async (req, res) => {
  try {
    console.log(req.body);
    const { oldPassword, newPassword, userId } = req.body;

    const user = await Users.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const isMatched = await bcrypt.compare(oldPassword, user.password);

    if (!isMatched) {
      return res.json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//todo: forgot password
const forgotPassword = async (req, res) => {
  //*desstructuring
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Please enter your email address",
    });
  }

  try {
    //* check existing user
    const user = await Users.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    //* create a token
    const secret = process.env.JWT_SECRET + user.password;
    const token = jwt.sign({ email: user.email }, secret, { expiresIn: "15m" });

    //* create a link
    const link = `http://localhost:5000/api/user/reset-password/${user._id}/${token}`;

    //* send email thorough nodemailer
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "aashu.shrestha9@gmail.com",
        pass: "odpxtfekzroqdfdh",
      },
    });

    //* mail options and send mail
    var mailOptions = {
      from: "aashu.shrestha9@gmail.com",
      to: email,
      subject: "Password Reset Link",
      text: link,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent:" + info.response);
      }
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//todo: update password link check
const updatePasswordLinkCheck = async (req, res) => {
  //* get id and token from params
  const { id, token } = req.params;

  //* if id or token is not provided
  const oldUser = await Users.findOne({ _id: id });
  if (!oldUser) {
    return res.status(404).json({
      message: "User does not exist",
    });
  }

  //* verify token
  const secret = process.env.JWT_SECRET + oldUser.password;
  try {
    // Render the index.ejs template and pass the id and token variables
    const verify = jwt.verify(token, secret);
    if (verify) {
      res.render("index", { id: id, token: token, email: verify.email });
    }
  } catch (e) {
    res.status(500).json("Password reset link not verified");
  }
};

//todo: update password link check
const updatePassword = async (req, res) => {
  //* get id and token from params
  const { id, token } = req.params;

  //* get password from body
  const {password } = req.body;

  //* find user
  const oldUser = await Users.findOne({ _id: id });
  //* if user does not exists
  if (!oldUser) {
    return res.status(404).json({
      message: "User does not exist",
    });
  }

  //* verify token
  const secret = process.env.JWT_SECRET + oldUser.password;
  try {
    const encryptedPassword = await bcrypt.hash(password, 10);
    await Users.updateOne(
      { _id: id },
      { $set: { password: encryptedPassword } }
    );
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (e) {
    res.status(500).json("Password reset failed");
  }
};


// //todo: Update user profile including image
// const updateUserProfile = async (req, res) => {
//   const userId = req.params.userId;
//   const { firstName, lastName, email } = req.body; // Extract other user data fields
//   const { profileImage } = req.files;
//   console.log(userId); // Assuming image is uploaded as a file
//   console.log(profileImage);// Assuming image is uploaded as a file

//   try {
//     // Upload image to Cloudinary
//     const result = await cloudinary.v2.uploader.upload(
//       profileImage.path,
//       {
//       folder :  'users',
//       crop: 'scale'
//       }
//       ); // Assuming the image is temporarily stored in a tempFilePath

//     // Find the user by ID
//     let user = await Users.findById(userId);

//     // If the user is not found, return a 404 error
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Update user data fields
//     user.firstName = firstName;
//     user.lastName = lastName;
//     user.email = email;
//     user.profileImage = result.secure_url; // Save the image URL from Cloudinary

//     // Save the updated user data
//     user = await user.save();

//     res.status(200).json({
//       success: true,
//       message: 'User profile updated successfully',
//       user });
//   } catch (error) {
//     console.error('Error updating user profile:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
const updateUserProfile = async (req, res) => {
  const userId = req.params.userId;
  const { firstName, lastName, email } = req.body;

  try {
    let user = await Users.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if profile image is provided in the request
    if (req.files && req.files.profileImage) {
      const { profileImage } = req.files;
      // Upload image to Cloudinary
      const result = await cloudinary.v2.uploader.upload(profileImage.path, {
        folder: 'users',
        crop: 'scale'
      });
      // Save the image URL from Cloudinary
      user.profileImage = result.secure_url;
    }

    // Update user data fields
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    // Save the updated user data
    user = await user.save();

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


//todo: get all users
const getAllUsers = async (req, res) => {
  try {
    // Fetch all users from the database
    const users = await Users.find();

    console.log(users);

    // Check if any users are found
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found.",
      });
    }

    // Return the list of users
    res.status(200).json({
      success: true,
      users: users,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  changePassword,
  forgotPassword,
  updatePasswordLinkCheck,
  updatePassword,
  updateUserProfile,
  getAllUsers,
  getUserById,
  verifyEmail
};
