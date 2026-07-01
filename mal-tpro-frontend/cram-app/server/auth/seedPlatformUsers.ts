import { PLATFORM_USERS } from "../../src/config/platformUsers";
import { prisma } from "../db/client";

/** Idempotent upsert of executive platform users into app_users. */
export async function seedPlatformUsers(): Promise<number> {
  let count = 0;
  for (const u of PLATFORM_USERS) {
    await prisma.appUser.upsert({
      where: { email: u.email },
      create: { id: u.id, email: u.email, name: u.name, roles: [...u.roles] },
      update: { name: u.name, roles: [...u.roles] },
    });
    count++;
  }
  // System service account (feeds pipeline)
  await prisma.appUser.upsert({
    where: { email: "feeds@mal.ae" },
    create: { id: "u_service", email: "feeds@mal.ae", name: "Feed Service", roles: ["ServiceAccount"] },
    update: { roles: ["ServiceAccount"] },
  });
  return count;
}
