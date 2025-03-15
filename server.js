const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI =
  "mongodb+srv://abhiramdadi2005:Abhiram17@cluster0.tpk3b.mongodb.net/event_management?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["customer", "vendor"], default: "customer" },
  services: [
    {
      name: String,
      price: Number,
      description: String,
    },
  ],
  cart: [
    {
      vendorId: mongoose.Schema.Types.ObjectId,
      serviceName: String,
      price: Number,
      description: String,
    },
  ],
});

const User = mongoose.model("User", UserSchema);

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ error: "Access Denied" });

  try {
    const verified = jwt.verify(token.split(" ")[1], "my_secret_key");
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid Token" });
  }
};

// Update vendor's services
// Add service to vendor and return updated services
app.post("/add-service", authenticateToken, async (req, res) => {
  const { name, price, description } = req.body;
  try {
    const updatedVendor = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { services: { name, price, description } } },
      { new: true }
    );
    res.status(200).json(updatedVendor.services);
  } catch (error) {
    res.status(500).json({ error: "Failed to add service." });
  }
});

// Fetch vendors with their services
// Ensure correct fetching of vendor services
app.get("/vendors", async (req, res) => {
  try {
    const vendors = await User.find({ role: "vendor" }).select("name services");
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors." });
  }
});

app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: user.role }, "my_secret_key", {
    expiresIn: "1h",
  });
  res.json({
    token,
    user: { name: user.name, email: user.email, role: user.role },
  });
});

app.get("/vendors", async (req, res) => {
  try {
    const vendors = await User.find({ role: "vendor" }).select("name services");
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors." });
  }
});

app.post("/cart", authenticateToken, async (req, res) => {
  const { vendorId, serviceName, price, description } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $push: { cart: { vendorId, serviceName, price, description } },
    });
    res.status(200).json({ message: "Service added to cart." });
  } catch (error) {
    res.status(500).json({ error: "Failed to add service to cart." });
  }
});

app.get("/cart", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.cart);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cart." });
  }
});

app.get("/protected", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "You have accessed a protected route!", user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch vendor's own services
app.get("/vendor-services", authenticateToken, async (req, res) => {
  try {
    const vendor = await User.findById(req.user.id);

    if (!vendor || vendor.role !== "vendor") {
      return res.status(403).json({ error: "Access denied." });
    }

    res.status(200).json(vendor.services || []);
  } catch (error) {
    console.error("Error fetching vendor services:", error);
    res.status(500).json({ error: "Failed to load services." });
  }
});

// Remove item from cart
app.delete("/cart/:serviceId", authenticateToken, async (req, res) => {
  const { serviceId } = req.params;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { cart: { _id: serviceId } } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    res.status(200).json({ message: "Service removed from cart." });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ error: "Failed to remove service from cart." });
  }
});

app.post("/forgot-password", (req, res) => {
  res.json({ message: "Password reset link sent (dummy response)" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
