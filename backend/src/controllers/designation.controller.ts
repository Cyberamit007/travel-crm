import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getDesignations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, status } = req.query;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    const designations = await prisma.designation.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });

    res.json({ success: true, data: designations });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createDesignation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, departmentId, description } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Designation name is required' }); return; }
    if (!departmentId) { res.status(400).json({ success: false, error: 'Department is required' }); return; }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) { res.status(404).json({ success: false, error: 'Department not found' }); return; }

    const desig = await prisma.designation.create({
      data: { name: name.trim(), departmentId, description: description?.trim() || null },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
    });

    res.status(201).json({ success: true, data: desig });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateDesignation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.designation.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Designation not found' }); return; }

    const { name, departmentId, description, status } = req.body;
    const desig = await prisma.designation.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        departmentId: departmentId ?? existing.departmentId,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        status: status ?? existing.status,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
    });

    res.json({ success: true, data: desig });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteDesignation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const desig = await prisma.designation.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!desig) { res.status(404).json({ success: false, error: 'Designation not found' }); return; }
    if (desig._count.employees > 0) {
      res.status(400).json({ success: false, error: `Cannot delete: ${desig._count.employees} employee(s) have this designation` });
      return;
    }
    await prisma.designation.delete({ where: { id } });
    res.json({ success: true, message: 'Designation deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
