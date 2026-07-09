import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgSelect = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

export const getDepartments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: any = { organizationId: orgSelect(req) };
    if (req.query.status) where.status = req.query.status;

    const departments = await prisma.department.findMany({
      where,
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { employees: true, designations: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: departments });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = orgSelect(req);
    const { name, code, description, headId } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ success: false, error: 'Department name is required' });
      return;
    }

    let deptCode = (code?.trim() || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 10)).toUpperCase();

    const exists = await prisma.department.findFirst({ where: { code: deptCode, organizationId: orgId } });
    if (exists) {
      const count = await prisma.department.count({ where: { organizationId: orgId } });
      deptCode = `${deptCode.slice(0, 8)}_${count + 1}`;
    }

    const dept = await prisma.department.create({
      data: {
        name: name.trim(),
        code: deptCode,
        description: description?.trim() || null,
        headId: headId || null,
        organizationId: orgId,
      },
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { employees: true, designations: true } },
      },
    });

    res.status(201).json({ success: true, data: dept });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = orgSelect(req);
    const existing = await prisma.department.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) { res.status(404).json({ success: false, error: 'Department not found' }); return; }

    const { name, code, description, headId, status } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code ? code.trim().toUpperCase() : existing.code,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        headId: headId !== undefined ? (headId || null) : existing.headId,
        status: status ?? existing.status,
      },
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { employees: true, designations: true } },
      },
    });

    res.json({ success: true, data: dept });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const orgId = orgSelect(req);
    const dept = await prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { employees: true } } },
    });
    if (!dept) { res.status(404).json({ success: false, error: 'Department not found' }); return; }
    if (dept._count.employees > 0) {
      res.status(400).json({ success: false, error: `Cannot delete: ${dept._count.employees} employee(s) are assigned to this department` });
      return;
    }
    await prisma.department.delete({ where: { id } });
    res.json({ success: true, message: 'Department deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
