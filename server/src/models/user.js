import bcrypt from "bcryptjs";
import mongoose from "mongoose";

/**
 * An account.
 *
 * The password hash never leaves this file in plain form: `select: false` keeps
 * it out of every query that doesn't ask for it explicitly, so a careless
 * `User.find()` can't leak it into a response.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email is not valid"],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    name: ret.name,
    email: ret.email,
  }),
});

/** Cost 10 is the usual balance: slow enough to matter, fast enough to log in. */
userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
