const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const passwordHash = bcrypt.hashSync('StrongPass1', 10);

const clientId = '11111111-1111-4111-8111-111111111101';
const providerId = '11111111-1111-4111-8111-111111111102';
const adminId = '11111111-1111-4111-8111-111111111103';

const users = [
  { id: clientId, email: 'client@copyhouse.local', role: 'CLIENT', city: 'Калуга' },
  { id: providerId, email: 'provider@copyhouse.local', role: 'PrintProvider', city: 'Калуга' },
  { id: adminId, email: 'admin@copyhouse.local', role: 'ADMIN', city: 'Калуга' },
];

const points = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    name: 'Частник на Ленина',
    address: 'Ленина, 12',
    workingHours: 'пн-пт 10:00-19:00',
    pricePerPageBw: 400,
    pricePerPageColor: 1500,
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    name: 'Копицентр «Лист»',
    address: 'Кирова, 20',
    workingHours: 'ежедневно 09:00-21:00',
    pricePerPageBw: 500,
    pricePerPageColor: 2000,
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    name: 'Стойка в ТЦ',
    address: 'Московская, 5',
    workingHours: 'ежедневно 10:00-22:00',
    pricePerPageBw: 700,
    pricePerPageColor: 2500,
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    name: 'Копирка у вокзала',
    address: 'Вокзальная, 1',
    workingHours: 'ежедневно 08:00-20:00',
    pricePerPageBw: 350,
    pricePerPageColor: 1200,
  },
  {
    id: '22222222-2222-4222-8222-222222222205',
    name: 'Типография «Двор»',
    address: 'Дворцовая, 8',
    workingHours: 'пн-сб 09:00-18:00',
    pricePerPageBw: 600,
    pricePerPageColor: 2200,
  },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role: user.role,
        city: user.city,
        passwordHash,
      },
      create: { ...user, passwordHash },
    });
  }

  for (const point of points) {
    await prisma.printPoint.upsert({
      where: { id: point.id },
      update: {
        ownerId: providerId,
        name: point.name,
        city: 'Калуга',
        address: point.address,
        workingHours: point.workingHours,
        pricePerPageBw: point.pricePerPageBw,
        pricePerPageColor: point.pricePerPageColor,
        commissionBps: 0,
        status: 'APPROVED',
        isActive: true,
        rejectionReason: null,
      },
      create: {
        ...point,
        ownerId: providerId,
        city: 'Калуга',
        commissionBps: 0,
        status: 'APPROVED',
        isActive: true,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
