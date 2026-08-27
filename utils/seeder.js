const User = require("../models/User");
const Category = require("../models/Category");
const connectDB = require("../config/database");

const categories = [
  { name: "Way Forward Urban Edge Cap", description: "Urban edge cap available in black, army green, and navy blue" },
  { name: "Way Forward 09 Jersey", description: "Way Forward 09 Jersey available in black, wine, and white" },
  { name: "Way Forward Summer Armless", description: "Way Forward Summer Armless collection" },
];

const seed = async () => {
  try {
    await connectDB();

    // Seed admin
    const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log("✅ Admin already exists.");
    } else {
      await User.create({
        name: "WayForward Admin",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
        phone: process.env.ADMIN_PHONE,
      });
      console.log("✅ Admin created successfully.");
    }

    // Seed categories
    for (const cat of categories) {
      const existing = await Category.findOne({ name: cat.name });
      if (existing) {
        console.log(`⏭️  Category "${cat.name}" already exists.`);
      } else {
        await Category.create(cat);
        console.log(`✅ Category "${cat.name}" created.`);
      }
    }

    console.log("\n🎉 Seeding complete.");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();