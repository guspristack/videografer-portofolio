import { z } from 'zod';
import { disconnectDatabase, prisma } from './database';
import { hashPassword } from './password';

try {
  const email = z.email().safeParse(process.env.ADMIN_EMAIL?.trim().toLowerCase());
  const password = z.string().min(16).max(256).safeParse(process.env.ADMIN_PASSWORD);
  if (!email.success || !password.success) {
    throw new Error('Isi ADMIN_EMAIL dan ADMIN_PASSWORD. Kata sandi harus memiliki 16–256 karakter.');
  }

  const passwordHash = await hashPassword(password.data);
  await prisma.$transaction([
    prisma.admin.upsert({
      where: { id: 1 },
      create: { id: 1, email: email.data, passwordHash },
      update: { email: email.data, passwordHash },
    }),
    prisma.session.deleteMany(),
  ]);
  console.log('Akun admin siap. Sesi sebelumnya telah diakhiri.');
} finally {
  await disconnectDatabase();
}
