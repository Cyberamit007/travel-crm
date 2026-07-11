import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

const parseList = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return raw.split('\n').map((s) => s.trim()).filter(Boolean); }
  }
  return [];
};

// ─── List packages ────────────────────────────────────────────────────────────

export const getPackages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, destinationId, tourCategoryId, search, difficultyLevel } = req.query;
    const where: any = { organizationId: orgId(req) };
    if (status) where.status = status;
    if (destinationId) where.destinationId = destinationId;
    if (tourCategoryId) where.tourCategoryId = tourCategoryId;
    if (difficultyLevel) where.difficultyLevel = difficultyLevel;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        destination: { select: { id: true, name: true, country: true, state: true } },
        tourCategory: { select: { id: true, name: true, icon: true } },
        _count: { select: { itineraryItems: true, bookings: true } },
      },
      orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
    });

    res.json({ success: true, data: packages });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Get single package ───────────────────────────────────────────────────────

export const getPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pkg = await prisma.package.findFirst({
      where: { id, organizationId: orgId(req) },
      include: {
        destination: { select: { id: true, name: true, country: true, state: true } },
        tourCategory: { select: { id: true, name: true, icon: true } },
        itineraryItems: { orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }] },
        _count: { select: { bookings: true } },
      },
    });
    if (!pkg) { res.status(404).json({ success: false, error: 'Package not found' }); return; }
    res.json({ success: true, data: pkg });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Create package ───────────────────────────────────────────────────────────

export const createPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name, code, description, overview, destinationId, tourCategoryId,
      nights, days, inclusions, exclusions, highlights, thingsToCarry,
      pricePerPerson, priceSingle, priceDouble, priceTriple, priceQuad, offerPrice,
      capacityMin, capacityMax, difficultyLevel, bestSeason,
      pickupLocation, dropLocation, cancellationPolicy, termsAndConditions, packageNotes,
      images, gallery, isPopular, status,
    } = req.body;

    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Package name is required' }); return; }
    if (!code?.trim()) { res.status(400).json({ success: false, error: 'Package code is required' }); return; }
    if (!nights || isNaN(Number(nights))) { res.status(400).json({ success: false, error: 'Nights is required' }); return; }
    if (!days || isNaN(Number(days))) { res.status(400).json({ success: false, error: 'Days is required' }); return; }
    if (pricePerPerson === undefined || isNaN(Number(pricePerPerson))) {
      res.status(400).json({ success: false, error: 'Price per person is required' }); return;
    }

    const pkg = await prisma.package.create({
      data: {
        organizationId: orgId(req),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        overview: overview?.trim() || null,
        destinationId: destinationId || null,
        tourCategoryId: tourCategoryId || null,
        nights: Number(nights),
        days: Number(days),
        inclusions: JSON.stringify(parseList(inclusions)),
        exclusions: JSON.stringify(parseList(exclusions)),
        highlights: JSON.stringify(parseList(highlights)),
        thingsToCarry: JSON.stringify(parseList(thingsToCarry)),
        pricePerPerson: Number(pricePerPerson),
        priceSingle: priceSingle != null ? Number(priceSingle) : null,
        priceDouble: priceDouble != null ? Number(priceDouble) : null,
        priceTriple: priceTriple != null ? Number(priceTriple) : null,
        priceQuad: priceQuad != null ? Number(priceQuad) : null,
        offerPrice: offerPrice != null ? Number(offerPrice) : null,
        capacityMin: capacityMin != null ? Number(capacityMin) : null,
        capacityMax: capacityMax != null ? Number(capacityMax) : null,
        difficultyLevel: difficultyLevel || null,
        bestSeason: JSON.stringify(parseList(bestSeason)),
        pickupLocation: pickupLocation?.trim() || null,
        dropLocation: dropLocation?.trim() || null,
        cancellationPolicy: cancellationPolicy?.trim() || null,
        termsAndConditions: termsAndConditions?.trim() || null,
        packageNotes: packageNotes?.trim() || null,
        images: JSON.stringify(parseList(images)),
        gallery: JSON.stringify(parseList(gallery)),
        isPopular: Boolean(isPopular),
        status: status || 'ACTIVE',
      },
      include: {
        destination: { select: { id: true, name: true, country: true, state: true } },
        tourCategory: { select: { id: true, name: true, icon: true } },
      },
    });

    res.status(201).json({ success: true, data: pkg });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Package code already exists' }); return;
    }
    console.error('[packages] createPackage error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Update package ───────────────────────────────────────────────────────────

export const updatePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.package.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Package not found' }); return; }

    const {
      name, code, description, overview, destinationId, tourCategoryId,
      nights, days, inclusions, exclusions, highlights, thingsToCarry,
      pricePerPerson, priceSingle, priceDouble, priceTriple, priceQuad, offerPrice,
      capacityMin, capacityMax, difficultyLevel, bestSeason,
      pickupLocation, dropLocation, cancellationPolicy, termsAndConditions, packageNotes,
      images, gallery, isPopular, status,
    } = req.body;

    const pkg = await prisma.package.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        code: code ? code.trim().toUpperCase() : existing.code,
        description: description !== undefined ? description?.trim() || null : existing.description,
        overview: overview !== undefined ? overview?.trim() || null : existing.overview,
        destinationId: destinationId !== undefined ? destinationId || null : existing.destinationId,
        tourCategoryId: tourCategoryId !== undefined ? tourCategoryId || null : existing.tourCategoryId,
        nights: nights !== undefined ? Number(nights) : existing.nights,
        days: days !== undefined ? Number(days) : existing.days,
        inclusions: inclusions !== undefined ? JSON.stringify(parseList(inclusions)) : existing.inclusions,
        exclusions: exclusions !== undefined ? JSON.stringify(parseList(exclusions)) : existing.exclusions,
        highlights: highlights !== undefined ? JSON.stringify(parseList(highlights)) : existing.highlights,
        thingsToCarry: thingsToCarry !== undefined ? JSON.stringify(parseList(thingsToCarry)) : existing.thingsToCarry,
        pricePerPerson: pricePerPerson !== undefined ? Number(pricePerPerson) : existing.pricePerPerson,
        priceSingle: priceSingle !== undefined ? (priceSingle != null ? Number(priceSingle) : null) : existing.priceSingle,
        priceDouble: priceDouble !== undefined ? (priceDouble != null ? Number(priceDouble) : null) : existing.priceDouble,
        priceTriple: priceTriple !== undefined ? (priceTriple != null ? Number(priceTriple) : null) : existing.priceTriple,
        priceQuad: priceQuad !== undefined ? (priceQuad != null ? Number(priceQuad) : null) : existing.priceQuad,
        offerPrice: offerPrice !== undefined ? (offerPrice != null ? Number(offerPrice) : null) : existing.offerPrice,
        capacityMin: capacityMin !== undefined ? (capacityMin != null ? Number(capacityMin) : null) : existing.capacityMin,
        capacityMax: capacityMax !== undefined ? (capacityMax != null ? Number(capacityMax) : null) : existing.capacityMax,
        difficultyLevel: difficultyLevel !== undefined ? difficultyLevel || null : existing.difficultyLevel,
        bestSeason: bestSeason !== undefined ? JSON.stringify(parseList(bestSeason)) : existing.bestSeason,
        pickupLocation: pickupLocation !== undefined ? pickupLocation?.trim() || null : existing.pickupLocation,
        dropLocation: dropLocation !== undefined ? dropLocation?.trim() || null : existing.dropLocation,
        cancellationPolicy: cancellationPolicy !== undefined ? cancellationPolicy?.trim() || null : existing.cancellationPolicy,
        termsAndConditions: termsAndConditions !== undefined ? termsAndConditions?.trim() || null : existing.termsAndConditions,
        packageNotes: packageNotes !== undefined ? packageNotes?.trim() || null : existing.packageNotes,
        images: images !== undefined ? JSON.stringify(parseList(images)) : existing.images,
        gallery: gallery !== undefined ? JSON.stringify(parseList(gallery)) : existing.gallery,
        isPopular: isPopular !== undefined ? Boolean(isPopular) : existing.isPopular,
        status: status ?? existing.status,
      },
      include: {
        destination: { select: { id: true, name: true, country: true, state: true } },
        tourCategory: { select: { id: true, name: true, icon: true } },
      },
    });

    res.json({ success: true, data: pkg });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Package code already exists' }); return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Delete package ───────────────────────────────────────────────────────────

export const deletePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.package.findFirst({ where: { id, organizationId: orgId(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Package not found' }); return; }
    await prisma.package.delete({ where: { id } });
    res.json({ success: true, message: 'Package deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
