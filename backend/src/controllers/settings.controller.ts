import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const DEFAULT_SETTINGS = {
  sources: ['WHATSAPP', 'INSTAGRAM', 'MANUAL', 'WEBSITE'],
  destinations: ['Kedarnath', 'Badrinath', 'Char Dham', 'Vaishno Devi', 'Manali', 'Shimla', 'Goa', 'Kerala', 'Rajasthan', 'Andaman'],
  lostReasons: ['Budget Issue', 'No Response', 'Booked Elsewhere', 'Date Not Suitable', 'Cancelled Trip', 'Not Interested', 'Other'],
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  companyWebsite: '',
};

async function getOrg(req: AuthenticatedRequest) {
  const orgId = req.user?.organizationId;
  if (!orgId) return null;
  return prisma.organization.findUnique({ where: { id: orgId } });
}

export const getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const org = await getOrg(req);
    if (!org) { res.json({ success: true, data: DEFAULT_SETTINGS }); return; }
    const settings = { ...DEFAULT_SETTINGS, ...(org.settings as object) };
    res.json({ success: true, data: settings });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    if (!orgId) { res.status(400).json({ success: false, error: 'No organization' }); return; }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) { res.status(404).json({ success: false, error: 'Organization not found' }); return; }

    const current = (org.settings as object) ?? {};
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { settings: { ...current, ...req.body } },
    });
    res.json({ success: true, data: { ...DEFAULT_SETTINGS, ...(updated.settings as object) } });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
