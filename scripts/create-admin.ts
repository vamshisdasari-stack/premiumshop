/**
 * Create an admin user from the command line.
 * Usage: pnpm create-admin
 *
 * Reads from environment variables or prompts interactively.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (hidden) {
      process.stdout.write(question);
      process.stdin.setRawMode?.(true);
      let val = "";
      process.stdin.on("data", (char) => {
        const c = char.toString();
        if (c === "\n" || c === "\r" || c === "\u0003") {
          process.stdin.setRawMode?.(false);
          process.stdout.write("\n");
          rl.close();
          resolve(val);
        } else if (c === "\u007f") {
          val = val.slice(0, -1);
        } else {
          val += c;
          process.stdout.write("*");
        }
      });
    } else {
      rl.question(question, (answer) => { rl.close(); resolve(answer); });
    }
  });
}

async function main() {
  console.log("\n🔐 PremiumShop — Create Admin User\n");

  const name = await ask("Admin name: ");
  const email = await ask("Admin email: ");
  const password = await ask("Admin password (min 8 chars): ", false);
  const role = await ask("Role [ADMIN/SUPER_ADMIN] (default: ADMIN): ");

  if (!name || !email || !password) {
    console.error("❌ All fields are required.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ User with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const adminRole = role?.trim().toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN";

  const admin = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: adminRole as "ADMIN" | "SUPER_ADMIN",
      emailVerified: true,
    },
  });

  // Create cart for admin too
  await prisma.cart.create({ data: { userId: admin.id } });

  console.log(`\n✅ Admin created successfully!`);
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log(`\n→ Login at: /admin/login\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
