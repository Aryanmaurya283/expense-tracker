import mongoose from "mongoose";

/**
 * One expense.
 *
 * Amount is stored in paise as an integer rather than as a float. Money in
 * floating point accumulates rounding error the moment you sum it — and this
 * application's headline number is a sum.
 */
const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than zero"],
      validate: {
        validator: Number.isInteger,
        message: "Amount must be a whole number of paise",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [120, "Description cannot exceed 120 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: {
        values: ["Food", "Transport", "Housing", "Utilities", "Health", "Shopping", "Other"],
        message: "{VALUE} is not a supported category",
      },
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
  },
  { timestamps: true },
);

/** The list is always read newest first, so index for exactly that. */
/** Every query is "this user's expenses, newest first" — index exactly that. */
expenseSchema.index({ userId: 1, date: -1 });

/** Never leak Mongo's internals to the client; hand back a clean shape. */
expenseSchema.set("toJSON", {
  transform: (_doc, ret) => ({
    id: ret._id.toString(),
    amountPaise: ret.amountPaise,
    description: ret.description,
    category: ret.category,
    date: ret.date,
    createdAt: ret.createdAt,
  }),
});

export const Expense = mongoose.model("Expense", expenseSchema);
