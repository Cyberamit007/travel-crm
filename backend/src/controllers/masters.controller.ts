import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// ─── Destinations ─────────────────────────────────────────────────────────────

export const getDestinations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, status, isPopular, search } = req.query;
    const where: any = { organizationId: orgId(req) };
    if (type) where.type = type;
    if (status) where.status = status;
    if (isPopular !== undefined) where.isPopular = isPopular === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { country: { contains: search as string, mode: 'insensitive' } },
        { state: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const destinations = await prisma.destination.findMany({
      where,
      orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
    });

    res.json({ success: true, data: destinations });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createDestination = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, country, state, city, type, description, isPopular } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Destination name is required' }); return; }
    if (!country?.trim()) { res.status(400).json({ success: false, error: 'Country is required' }); return; }

    const dest = await prisma.destination.create({
      data: {
        name: name.trim(),
        country: country.trim(),
        state: state?.trim() || null,
        city: city?.trim() || null,
        type: type || 'DOMESTIC',
        description: description?.trim() || null,
        isPopular: Boolean(isPopular),
        organizationId: orgId(req),
      },
    });
    res.status(201).json({ success: true, data: dest });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateDestination = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.destination.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Destination not found' }); return; }

    const { name, country, state, city, type, description, isPopular, status } = req.body;
    const dest = await prisma.destination.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        country: country?.trim() ?? existing.country,
        state: state !== undefined ? state?.trim() || null : existing.state,
        city: city !== undefined ? city?.trim() || null : existing.city,
        type: type ?? existing.type,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isPopular: isPopular !== undefined ? Boolean(isPopular) : existing.isPopular,
        status: status ?? existing.status,
      },
    });
    res.json({ success: true, data: dest });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteDestination = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.destination.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Destination not found' }); return; }
    await prisma.destination.delete({ where: { id } });
    res.json({ success: true, message: 'Destination deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Tour Categories ──────────────────────────────────────────────────────────

export const getTourCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = { organizationId: orgId(req) };
    if (status) where.status = status;

    const categories = await prisma.tourCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: categories });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createTourCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, icon, sortOrder } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Category name is required' }); return; }

    const cat = await prisma.tourCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        organizationId: orgId(req),
      },
    });
    res.status(201).json({ success: true, data: cat });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateTourCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.tourCategory.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Category not found' }); return; }

    const { name, description, icon, sortOrder, status } = req.body;
    const cat = await prisma.tourCategory.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        icon: icon !== undefined ? icon?.trim() || null : existing.icon,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sortOrder,
        status: status ?? existing.status,
      },
    });
    res.json({ success: true, data: cat });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteTourCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.tourCategory.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Category not found' }); return; }
    await prisma.tourCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
