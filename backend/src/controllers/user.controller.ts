import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true, name: true, email: true, role: true,
          phone: true, isActive: true, createdAt: true,
          _count: { select: { assignedLeads: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        role: role || 'EMPLOYEE',
        phone: phone || null,
        organizationId: req.user?.organizationId ?? null,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { name, phone, isActive },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      return;
    }
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getEmployeePerformance = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: {
        id: true, name: true, email: true,
        assignedLeads: {
          select: { status: true, createdAt: true, followUpDate: true, followUpDone: true },
        },
      },
    });

    const performance = employees.map((emp) => {
      const leads = emp.assignedLeads;
      const total = leads.length;
      const confirmed = leads.filter((l) => l.status === 'CONFIRMED').length;
      const lost = leads.filter((l) => l.status === 'LOST').length;
      const active = leads.filter((l) => !['CONFIRMED', 'LOST'].includes(l.status)).length;
      const overdue = leads.filter(
        (l) => l.status === 'FOLLOW_UP_SCHEDULED' && !l.followUpDone && l.followUpDate && l.followUpDate < new Date()
      ).length;
      const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0';

      return { id: emp.id, name: emp.name, email: emp.email, total, confirmed, lost, active, overdue, conversionRate };
    });

    res.json({ success: true, data: performance });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
