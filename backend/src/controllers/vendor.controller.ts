import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;
const orgFilter = (req: AuthenticatedRequest) => (orgId(req) ? { organizationId: orgId(req) } : {});

export const listVendors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, type, status } = req.query;
    const where: Record<string, unknown> = { ...orgFilter(req) };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) where.name = { contains: String(search), mode: 'insensitive' };

    const vendors = await prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ success: true, data: vendors });
  } catch (e) {
    console.error('[operations] listVendors error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, type, contact, notes, status } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Vendor name is required' }); return; }

    const vendor = await prisma.vendor.create({
      data: {
        organizationId: orgId(req),
        name: name.trim(),
        type: type || 'OTHER',
        contact: contact?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'ACTIVE',
      },
    });

    await prisma.activityLog.create({
      data: { action: 'Vendor Added', details: `Vendor "${vendor.name}" added`, entityType: 'VENDOR', entityId: vendor.id, userId: req.user!.id },
    });

    res.status(201).json({ success: true, data: vendor });
  } catch (e) {
    console.error('[operations] createVendor error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.vendor.findFirst({ where: { id, ...orgFilter(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Vendor not found' }); return; }

    const b = req.body;
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: b.name !== undefined ? String(b.name).trim() : existing.name,
        type: b.type ?? existing.type,
        contact: b.contact !== undefined ? b.contact?.trim() || null : existing.contact,
        notes: b.notes !== undefined ? b.notes?.trim() || null : existing.notes,
        status: b.status ?? existing.status,
      },
    });

    await prisma.activityLog.create({
      data: { action: 'Vendor Updated', details: `Vendor "${vendor.name}" updated by ${req.user?.name}`, entityType: 'VENDOR', entityId: id, userId: req.user!.id },
    });

    res.json({ success: true, data: vendor });
  } catch (e) {
    console.error('[operations] updateVendor error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.vendor.findFirst({ where: { id, ...orgFilter(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Vendor not found' }); return; }

    await prisma.vendor.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[operations] deleteVendor error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
