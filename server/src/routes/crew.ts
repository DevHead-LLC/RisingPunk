import express from 'express';
import { Request, Response } from 'express';
import auth from '../middleware/auth';
import { Crew } from '../models/Crew';
import { CrewStatus } from '../models/CrewStatus';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

interface CreateCrewRequest extends Request {
  body: {
    crewName: string;
    crewIdentifier: string;
    nativeLanguage: string;
  }
}

router.post('/create', auth, async (req: CreateCrewRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewName, crewIdentifier, nativeLanguage } = req.body;

    if (!crewName || !crewIdentifier || !nativeLanguage) {
      res.status(400).json({ error: 'Crew name, identifier, and language are required' });
      return;
    }

    if (crewName.length > 12) {
      res.status(400).json({ error: 'Crew name must be 12 characters or less' });
      return;
    }

    if (crewIdentifier.length > 5) {
      res.status(400).json({ error: 'Crew identifier must be 5 characters or less' });
      return;
    }

    const validCharRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validCharRegex.test(crewName)) {
      res.status(400).json({ error: 'Crew name contains invalid characters' });
      return;
    }

    if (!validCharRegex.test(crewIdentifier)) {
      res.status(400).json({ error: 'Crew identifier contains invalid characters' });
      return;
    }

    const normalizedCrewName = crewName.trim();
    const normalizedCrewIdentifier = crewIdentifier.trim().toUpperCase();

    const existingCrewByName = await Crew.findOne({ 
      crewName: { $regex: new RegExp(`^${normalizedCrewName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingCrewByName) {
      res.status(400).json({ error: 'Crew name already exists' });
      return;
    }

    const existingCrewByIdentifier = await Crew.findOne({ crewIdentifier: normalizedCrewIdentifier });
    if (existingCrewByIdentifier) {
      res.status(400).json({ error: 'Crew identifier already exists' });
      return;
    }

    const existingStatus = await CrewStatus.findOne({ userId });
    if (existingStatus && existingStatus.isInCrew) {
      res.status(400).json({ error: 'User is already in a crew' });
      return;
    }

    const newCrew = new Crew({
      crewName: normalizedCrewName,
      crewIdentifier: normalizedCrewIdentifier,
      nativeLanguage,
      presidentId: userId,
      members: [],
      executives: []
    });

    await newCrew.save();

    if (existingStatus) {
      existingStatus.isInCrew = true;
      existingStatus.crewId = newCrew._id as mongoose.Types.ObjectId;
      existingStatus.crewIdentifier = normalizedCrewIdentifier;
      existingStatus.role = 'president';
      await existingStatus.save();
    } else {
      const newStatus = new CrewStatus({
        userId,
        isInCrew: true,
        crewId: newCrew._id as mongoose.Types.ObjectId,
        crewIdentifier: normalizedCrewIdentifier,
        role: 'president'
      });
      await newStatus.save();
    }

    res.json({
      success: true,
      crew: {
        id: newCrew._id,
        crewName: newCrew.crewName,
        crewIdentifier: newCrew.crewIdentifier,
        nativeLanguage: newCrew.nativeLanguage
      }
    });
  } catch (error: any) {
    console.error('Error creating crew:', error);
    if (error.code === 11000) {
      if (error.keyPattern?.crewName) {
        res.status(400).json({ error: 'Crew name already exists' });
        return;
      }
      if (error.keyPattern?.crewIdentifier) {
        res.status(400).json({ error: 'Crew identifier already exists' });
        return;
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    
    if (!crewStatus) {
      res.json({
        isInCrew: false,
        crewId: null,
        crewIdentifier: null,
        role: null
      });
      return;
    }

    res.json({
      isInCrew: crewStatus.isInCrew,
      crewId: crewStatus.crewId,
      crewIdentifier: crewStatus.crewIdentifier,
      role: crewStatus.role,
      appliedCrewId: crewStatus.appliedCrewId,
      appliedCrewIdentifier: crewStatus.appliedCrewIdentifier
    });
  } catch (error) {
    console.error('Error fetching crew status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status/:userId', auth, async (req: Request, res: Response) => {
  try {
    const requestingUserId = req.user?._id;
    if (!requestingUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    
    if (!crewStatus) {
      res.json({
        isInCrew: false,
        crewId: null,
        crewIdentifier: null,
        role: null
      });
      return;
    }

    res.json({
      isInCrew: crewStatus.isInCrew,
      crewId: crewStatus.crewId ? crewStatus.crewId.toString() : null,
      crewIdentifier: crewStatus.crewIdentifier,
      role: crewStatus.role
    });
  } catch (error) {
    console.error('Error fetching user crew status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface DisbandCrewRequest extends Request {
  body: {
    crewIdentifier: string;
  }
}

router.get('/search', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      res.json({ crews: [] });
      return;
    }

    const searchTerm = query.trim();
    const regex = new RegExp(searchTerm, 'i');

    const crews = await Crew.find({
      $or: [
        { crewName: { $regex: regex } },
        { crewIdentifier: { $regex: regex } }
      ]
    })
      .select('crewName crewIdentifier nativeLanguage createdAt')
      .populate('presidentId', 'handle')
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();

    const crewsWithMemberCount = await Promise.all(
      crews.map(async (crew) => {
        const memberCount = await CrewStatus.countDocuments({ 
          crewId: crew._id, 
          isInCrew: true 
        });
        return {
          id: crew._id.toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier,
          nativeLanguage: crew.nativeLanguage,
          memberCount,
          createdAt: crew.createdAt
        };
      })
    );

    res.json({ crews: crewsWithMemberCount });
  } catch (error) {
    console.error('Error searching crews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/suggested', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crews = await Crew.find({})
      .select('crewName crewIdentifier nativeLanguage createdAt')
      .populate('presidentId', 'handle')
      .limit(10)
      .sort({ createdAt: -1 })
      .lean();

    const crewsWithMemberCount = await Promise.all(
      crews.map(async (crew) => {
        const memberCount = await CrewStatus.countDocuments({ 
          crewId: crew._id, 
          isInCrew: true 
        });
        return {
          id: crew._id.toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier,
          nativeLanguage: crew.nativeLanguage,
          memberCount,
          createdAt: crew.createdAt
        };
      })
    );

    res.json({ crews: crewsWithMemberCount });
  } catch (error) {
    console.error('Error fetching suggested crews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface ApplyToCrewRequest extends Request {
  body: {
    crewId: string;
  }
}

router.post('/apply', auth, async (req: ApplyToCrewRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId } = req.body;
    if (!crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew ID is required' });
      return;
    }

    const crew = await Crew.findById(crewId).session(session);
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let crewStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!crewStatus) {
      crewStatus = new CrewStatus({
        userId,
        isInCrew: false,
        crewId: null,
        crewIdentifier: null,
        role: null,
        appliedCrewId: null,
        appliedCrewIdentifier: null
      });
    }

    if (crewStatus.isInCrew) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'User is already in a crew' });
      return;
    }

    if (crewStatus.appliedCrewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'User has already applied to a crew' });
      return;
    }

    if (crew.applicants.some((app: any) => app.userId.toString() === userId.toString())) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'User has already applied to this crew' });
      return;
    }

    crewStatus.appliedCrewId = crew._id as mongoose.Types.ObjectId;
    crewStatus.appliedCrewIdentifier = crew.crewIdentifier;
    await crewStatus.save({ session });

    crew.applicants.push({
      userId: new mongoose.Types.ObjectId(userId),
      handle: user.handle,
      appliedAt: new Date()
    });
    await crew.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error applying to crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:crewId/rules', auth, async (req: Request, res: Response) => {
  try {
    const { crewId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crew = await Crew.findById(crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId, crewId });
    if (!crewStatus || !crewStatus.isInCrew) {
      res.status(403).json({ error: 'You are not a member of this crew' });
      return;
    }

    res.json({
      success: true,
      crewRules: crew.crewRules || []
    });
  } catch (error) {
    console.error('Error fetching crew rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:crewId/rules', auth, async (req: Request, res: Response) => {
  try {
    const { crewId } = req.params;
    const { crewRules } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!Array.isArray(crewRules)) {
      res.status(400).json({ error: 'crewRules must be an array' });
      return;
    }

    const crew = await Crew.findById(crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId, crewId });
    if (!crewStatus || !crewStatus.isInCrew) {
      res.status(403).json({ error: 'You are not a member of this crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update crew rules' });
      return;
    }

    crew.crewRules = crewRules.filter((rule: string) => typeof rule === 'string' && rule.trim().length > 0);
    await crew.save();

    res.json({
      success: true,
      crewRules: crew.crewRules
    });
  } catch (error) {
    console.error('Error updating crew rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/war-status', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    const crewId = crewStatus.crewId;
    const crew = await Crew.findById(crewId)
      .populate('warWithCrewId', 'crewName crewIdentifier')
      .lean();

    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const warsWeDeclared = [];
    if (crew.warWithCrewId) {
      const enemyCrew = crew.warWithCrewId as any;
      warsWeDeclared.push({
        enemyCrewId: enemyCrew._id.toString(),
        enemyCrewName: enemyCrew.crewName,
        enemyCrewIdentifier: enemyCrew.crewIdentifier,
        warDeclaredAt: crew.warDeclaredAt ? crew.warDeclaredAt.toISOString() : null
      });
    }

    const crewsWhoDeclaredWarOnUs = await Crew.find({
      warWithCrewId: crewId
    })
      .select('crewName crewIdentifier warDeclaredAt')
      .lean();

    const warsDeclaredOnUs = crewsWhoDeclaredWarOnUs.map((enemyCrew: any) => ({
      enemyCrewId: enemyCrew._id.toString(),
      enemyCrewName: enemyCrew.crewName,
      enemyCrewIdentifier: enemyCrew.crewIdentifier,
      warDeclaredAt: enemyCrew.warDeclaredAt ? enemyCrew.warDeclaredAt.toISOString() : null
    }));

    const isAtWar = warsWeDeclared.length > 0 || warsDeclaredOnUs.length > 0;

    res.json({
      success: true,
      isAtWar,
      warsWeDeclared,
      warsDeclaredOnUs
    });
  } catch (error) {
    console.error('Error fetching war status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/war-management/crews', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can manage wars' });
      return;
    }

    const userCrewId = crewStatus.crewId;
    const crews = await Crew.find({
      _id: { $ne: userCrewId }
    })
      .select('crewName crewIdentifier createdAt')
      .limit(100)
      .sort({ createdAt: -1 })
      .lean();

    const crewsWithMemberCount = await Promise.all(
      crews.map(async (crew) => {
        const memberCount = await CrewStatus.countDocuments({ 
          crewId: crew._id, 
          isInCrew: true 
        });
        return {
          id: crew._id.toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier,
          memberCount,
          createdAt: crew.createdAt ? crew.createdAt.toISOString() : null
        };
      })
    );

    res.json({
      success: true,
      crews: crewsWithMemberCount
    });
  } catch (error) {
    console.error('Error fetching crews for war management:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:crewId', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId } = req.params;
    const crew = await Crew.findById(crewId)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .lean();

    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId, crewId });
    const isCrewMember = crewStatus?.isInCrew && crewStatus?.crewId?.toString() === crewId;

    const president = crew.presidentId as any;
    const executives = (crew.executives || []) as any[];
    const members = (crew.members || []) as any[];

    const memberCount = 1 + executives.length + members.length;

    res.json({
      success: true,
      crew: {
        id: crew._id.toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier,
        nativeLanguage: crew.nativeLanguage,
        createdAt: crew.createdAt ? crew.createdAt.toISOString() : null,
        memberCount: memberCount,
        applicants: crew.applicants || [],
        crewRules: crew.crewRules || [],
        internalMessage: isCrewMember ? (crew.internalMessage || '') : '',
        externalMessage: crew.externalMessage || '',
        president: president ? { userId: president._id.toString(), handle: president.handle, level: president.level || 1 } : null,
        executives: executives.map((exec: any) => ({
          userId: exec._id.toString(),
          handle: exec.handle,
          level: exec.level || 1
        })),
        members: members.map((member: any) => ({
          userId: member._id.toString(),
          handle: member.handle,
          level: member.level || 1
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching crew details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/withdraw-application', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.appliedCrewId) {
      res.status(400).json({ error: 'No application found to withdraw' });
      return;
    }

    const crew = await Crew.findById(crewStatus.appliedCrewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    crew.applicants = crew.applicants.filter(
      (app: any) => app.userId.toString() !== userId.toString()
    );
    await crew.save();

    crewStatus.appliedCrewId = null;
    crewStatus.appliedCrewIdentifier = null;
    await crewStatus.save();

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface AcceptApplicantRequest extends Request {
  body: {
    crewId: string;
    applicantUserId: string;
  }
}

router.post('/accept-applicant', auth, async (req: AcceptApplicantRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId, applicantUserId } = req.body;
    if (!crewId || !applicantUserId) {
      res.status(400).json({ error: 'Crew ID and applicant user ID are required' });
      return;
    }

    const crew = await Crew.findById(crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId });
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    const isPresident = requesterStatus.role === 'president';
    const isExecutive = crew.executives.some((execId: mongoose.Types.ObjectId) => 
      execId.toString() === userId.toString()
    );

    if (!isPresident && !isExecutive) {
      res.status(403).json({ error: 'Only president or executives can accept applicants' });
      return;
    }

    const applicantObjectId = new mongoose.Types.ObjectId(applicantUserId);
    const applicantIndex = crew.applicants.findIndex((app: any) => 
      app.userId.toString() === applicantUserId
    );

    if (applicantIndex === -1) {
      res.status(404).json({ error: 'Applicant not found in crew applicants list' });
      return;
    }

    const applicantStatus = await CrewStatus.findOne({ userId: applicantObjectId });
    if (!applicantStatus) {
      res.status(404).json({ error: 'Applicant crew status not found' });
      return;
    }

    if (applicantStatus.isInCrew) {
      res.status(400).json({ error: 'Applicant is already in a crew' });
      return;
    }

    if (applicantStatus.appliedCrewId?.toString() !== crewId) {
      res.status(400).json({ error: 'Applicant has not applied to this crew' });
      return;
    }

    applicantStatus.isInCrew = true;
    applicantStatus.crewId = crew._id as mongoose.Types.ObjectId;
    applicantStatus.crewIdentifier = crew.crewIdentifier;
    applicantStatus.role = 'member';
    applicantStatus.appliedCrewId = null;
    applicantStatus.appliedCrewIdentifier = null;
    await applicantStatus.save();

    crew.applicants.splice(applicantIndex, 1);
    if (!crew.members.some((memberId: mongoose.Types.ObjectId) => 
      memberId.toString() === applicantUserId
    )) {
      crew.members.push(applicantObjectId);
    }
    await crew.save();

    res.json({
      success: true,
      message: 'Applicant accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting applicant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface DenyApplicantRequest extends Request {
  body: {
    crewId: string;
    applicantUserId: string;
  }
}

router.post('/deny-applicant', auth, async (req: DenyApplicantRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId, applicantUserId } = req.body;
    if (!crewId || !applicantUserId) {
      res.status(400).json({ error: 'Crew ID and applicant user ID are required' });
      return;
    }

    const crew = await Crew.findById(crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId });
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    const isPresident = requesterStatus.role === 'president';
    const isExecutive = crew.executives.some((execId: mongoose.Types.ObjectId) => 
      execId.toString() === userId.toString()
    );

    if (!isPresident && !isExecutive) {
      res.status(403).json({ error: 'Only president or executives can deny applicants' });
      return;
    }

    const applicantObjectId = new mongoose.Types.ObjectId(applicantUserId);
    const initialApplicantCount = crew.applicants.filter((app: any) => 
      app.userId.toString() === applicantUserId
    ).length;

    if (initialApplicantCount === 0) {
      res.status(404).json({ error: 'Applicant not found in crew applicants list' });
      return;
    }

    const applicantStatus = await CrewStatus.findOne({ userId: applicantObjectId });
    if (!applicantStatus) {
      res.status(404).json({ error: 'Applicant crew status not found' });
      return;
    }

    if (applicantStatus.appliedCrewId?.toString() !== crewId) {
      res.status(400).json({ error: 'Applicant has not applied to this crew' });
      return;
    }

    crew.applicants = crew.applicants.filter(
      (app: any) => app.userId.toString() !== applicantUserId
    );
    await crew.save();

    applicantStatus.appliedCrewId = null;
    applicantStatus.appliedCrewIdentifier = null;
    await applicantStatus.save();

    res.json({
      success: true,
      message: 'Applicant denied successfully'
    });
  } catch (error) {
    console.error('Error denying applicant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/disband', auth, async (req: DisbandCrewRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewIdentifier } = req.body;

    if (!crewIdentifier) {
      res.status(400).json({ error: 'Crew identifier is required' });
      return;
    }

    const normalizedCrewIdentifier = crewIdentifier.trim().toUpperCase();

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can disband the crew' });
      return;
    }

    if (crewStatus.crewIdentifier?.toUpperCase() !== normalizedCrewIdentifier) {
      res.status(400).json({ error: 'Crew identifier does not match' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    if (crew.crewIdentifier.toUpperCase() !== normalizedCrewIdentifier) {
      res.status(400).json({ error: 'Crew identifier does not match' });
      return;
    }

    const crewId = crew._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Clear war references from crews that declared war on this crew
      await Crew.updateMany(
        { warWithCrewId: crewId },
        {
          $set: {
            warWithCrewId: null,
            warDeclaredAt: null
          }
        },
        { session }
      );

      await CrewStatus.updateMany(
        { crewId: crewId },
        {
          $set: {
            isInCrew: false,
            crewId: null,
            crewIdentifier: null,
            role: null
          }
        },
        { session }
      );

      await CrewStatus.updateMany(
        { appliedCrewId: crewId },
        {
          $set: {
            appliedCrewId: null,
            appliedCrewIdentifier: null
          }
        },
        { session }
      );

      await Crew.deleteOne({ _id: crewId }, { session });

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: 'Crew disbanded successfully'
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error disbanding crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leave', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role === 'president') {
      res.status(403).json({ error: 'President cannot leave crew. Use Resign or Disband Crew instead.' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    if (crewStatus.role === 'member') {
      crew.members = crew.members.filter(
        (memberId: mongoose.Types.ObjectId) => memberId.toString() !== userId.toString()
      );
    } else if (crewStatus.role === 'executive') {
      crew.executives = crew.executives.filter(
        (execId: mongoose.Types.ObjectId) => execId.toString() !== userId.toString()
      );
    }

    await crew.save();

    crewStatus.isInCrew = false;
    crewStatus.crewId = null;
    crewStatus.crewIdentifier = null;
    crewStatus.role = null;
    await crewStatus.save();

    res.json({
      success: true,
      message: 'Left crew successfully'
    });
  } catch (error) {
    console.error('Error leaving crew:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateCrewNameRequest extends Request {
  body: {
    crewName: string;
  }
}

router.post('/update-name', auth, async (req: UpdateCrewNameRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewName } = req.body;
    if (!crewName) {
      res.status(400).json({ error: 'Crew name is required' });
      return;
    }

    if (crewName.length > 12) {
      res.status(400).json({ error: 'Crew name must be 12 characters or less' });
      return;
    }

    const validCharRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validCharRegex.test(crewName)) {
      res.status(400).json({ error: 'Crew name contains invalid characters' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update the crew name' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const normalizedCrewName = crewName.trim();

    if (normalizedCrewName.toLowerCase() === crew.crewName.toLowerCase()) {
      res.json({
        success: true,
        message: 'Crew name unchanged',
        crew: {
          id: (crew._id as mongoose.Types.ObjectId).toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier
        }
      });
      return;
    }

    const existingCrewByName = await Crew.findOne({ 
      crewName: { $regex: new RegExp(`^${normalizedCrewName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      _id: { $ne: crew._id }
    });
    if (existingCrewByName) {
      res.status(400).json({ error: 'Crew name already exists' });
      return;
    }

    crew.crewName = normalizedCrewName;
    await crew.save();

    res.json({
      success: true,
      message: 'Crew name updated successfully',
      crew: {
        id: (crew._id as mongoose.Types.ObjectId).toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier
      }
    });
  } catch (error: any) {
    console.error('Error updating crew name:', error);
    if (error.code === 11000) {
      if (error.keyPattern?.crewName) {
        res.status(400).json({ error: 'Crew name already exists' });
        return;
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateCrewLanguageRequest extends Request {
  body: {
    nativeLanguage: string;
  }
}

router.post('/update-language', auth, async (req: UpdateCrewLanguageRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { nativeLanguage } = req.body;
    if (!nativeLanguage) {
      res.status(400).json({ error: 'Native language is required' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update the crew language' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    if (crew.nativeLanguage === nativeLanguage) {
      res.json({
        success: true,
        message: 'Crew language unchanged',
        crew: {
          id: (crew._id as mongoose.Types.ObjectId).toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier,
          nativeLanguage: crew.nativeLanguage
        }
      });
      return;
    }

    crew.nativeLanguage = nativeLanguage;
    await crew.save();

    res.json({
      success: true,
      message: 'Crew language updated successfully',
      crew: {
        id: (crew._id as mongoose.Types.ObjectId).toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier,
        nativeLanguage: crew.nativeLanguage
      }
    });
  } catch (error: any) {
    console.error('Error updating crew language:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateInternalMessageRequest extends Request {
  body: {
    internalMessage: string;
  }
}

router.post('/update-internal-message', auth, async (req: UpdateInternalMessageRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { internalMessage } = req.body;
    if (typeof internalMessage !== 'string') {
      res.status(400).json({ error: 'Internal message must be a string' });
      return;
    }

    if (internalMessage.length > 1500) {
      res.status(400).json({ error: 'Internal message must be 1500 characters or less' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update the internal message' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const trimmedMessage = internalMessage.trim();
    crew.internalMessage = trimmedMessage;
    await crew.save();

    res.json({
      success: true,
      message: 'Internal message updated successfully',
      crew: {
        id: (crew._id as mongoose.Types.ObjectId).toString(),
        internalMessage: crew.internalMessage
      }
    });
  } catch (error: any) {
    console.error('Error updating internal message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateExternalMessageRequest extends Request {
  body: {
    externalMessage: string;
  }
}

router.post('/update-external-message', auth, async (req: UpdateExternalMessageRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { externalMessage } = req.body;
    if (typeof externalMessage !== 'string') {
      res.status(400).json({ error: 'External message must be a string' });
      return;
    }

    if (externalMessage.length > 1500) {
      res.status(400).json({ error: 'External message must be 1500 characters or less' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update the external message' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const trimmedMessage = externalMessage.trim();
    crew.externalMessage = trimmedMessage;
    await crew.save();

    res.json({
      success: true,
      message: 'External message updated successfully',
      crew: {
        id: (crew._id as mongoose.Types.ObjectId).toString(),
        externalMessage: crew.externalMessage
      }
    });
  } catch (error: any) {
    console.error('Error updating external message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface GiftAllMembersRequest extends Request {
  body: {
    giftAmount: number;
  }
}

router.post('/gift-all-members', auth, async (req: GiftAllMembersRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { giftAmount } = req.body;
    if (!giftAmount || typeof giftAmount !== 'number') {
      res.status(400).json({ error: 'Gift amount is required' });
      return;
    }

    const MIN_GIFT = 10000;
    const MAX_GIFT = 1000000;
    const INCREMENT = 10000;
    const TRANSACTION_FEE_PERCENT = 0.1;

    if (giftAmount < MIN_GIFT || giftAmount > MAX_GIFT) {
      res.status(400).json({ error: `Gift amount must be between $${MIN_GIFT.toLocaleString()} and $${MAX_GIFT.toLocaleString()}` });
      return;
    }

    if (giftAmount % INCREMENT !== 0) {
      res.status(400).json({ error: `Gift amount must be in $${INCREMENT.toLocaleString()} increments` });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can gift members' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const allMemberIds = [
      ...(crew.executives || []),
      ...(crew.members || [])
    ]
      .filter(memberId => !memberId.equals(userId))
      .filter((memberId, index, self) => 
        index === self.findIndex((id) => id.equals(memberId))
      );

    if (allMemberIds.length === 0) {
      res.status(400).json({ error: 'No members to gift' });
      return;
    }

    const transactionFee = Math.floor(giftAmount * TRANSACTION_FEE_PERCENT);
    const totalCost = giftAmount + transactionFee;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const president = await User.findById(userId).session(session);
      if (!president) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ error: 'President not found' });
        return;
      }

      const now = new Date();
      const secondsElapsed = (now.getTime() - president.balance.lastUpdated.getTime()) / 1000;
      const roundedSecondsElapsed = Math.floor(secondsElapsed / 10) * 10;
      const fullPrecisionIncome = roundedSecondsElapsed * president.balance.ratePerSecond;
      const totalWithRemainder = (president.balance.fractionalRemainder || 0) + fullPrecisionIncome;
      const wholeDollarsToAdd = Math.floor(totalWithRemainder);
      const currentBalance = president.balance.total + wholeDollarsToAdd;

      if (currentBalance < totalCost) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ 
          error: `Insufficient balance. You need $${totalCost.toLocaleString()} but only have $${currentBalance.toLocaleString()}` 
        });
        return;
      }

      const memberUsersForTransaction = await User.find({ _id: { $in: allMemberIds } }).session(session);

      if (memberUsersForTransaction.length !== allMemberIds.length) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ 
          error: `Data inconsistency detected: ${allMemberIds.length} members expected but only ${memberUsersForTransaction.length} found. Please try again.` 
        });
        return;
      }

      if (memberUsersForTransaction.length === 0) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'No valid members to gift' });
        return;
      }

      const baseAmountPerMember = Math.floor(giftAmount / memberUsersForTransaction.length);
      const remainder = giftAmount % memberUsersForTransaction.length;

      if (baseAmountPerMember <= 0) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'Gift amount is too small to distribute among members' });
        return;
      }

      president.balance.total = currentBalance - totalCost;
      president.balance.fractionalRemainder = totalWithRemainder - wholeDollarsToAdd;
      president.balance.lastUpdated = new Date(president.balance.lastUpdated.getTime() + (roundedSecondsElapsed * 1000));
      await president.save({ session });
      
      for (let i = 0; i < memberUsersForTransaction.length; i++) {
        const member = memberUsersForTransaction[i];
        const memberSecondsElapsed = (now.getTime() - member.balance.lastUpdated.getTime()) / 1000;
        const memberRoundedSeconds = Math.floor(memberSecondsElapsed / 10) * 10;
        const memberFullPrecisionIncome = memberRoundedSeconds * member.balance.ratePerSecond;
        const memberTotalWithRemainder = (member.balance.fractionalRemainder || 0) + memberFullPrecisionIncome;
        const memberWholeDollarsToAdd = Math.floor(memberTotalWithRemainder);
        
        const giftAmountForThisMember = baseAmountPerMember + (i < remainder ? 1 : 0);
        
        member.balance.total += memberWholeDollarsToAdd + giftAmountForThisMember;
        member.balance.fractionalRemainder = memberTotalWithRemainder - memberWholeDollarsToAdd;
        member.balance.lastUpdated = new Date(member.balance.lastUpdated.getTime() + (memberRoundedSeconds * 1000));
        await member.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({
        success: true,
        message: `Successfully gifted $${giftAmount.toLocaleString()} to ${memberUsersForTransaction.length} member${memberUsersForTransaction.length !== 1 ? 's' : ''}`,
        giftAmount,
        transactionFee,
        totalCost,
        baseAmountPerMember: baseAmountPerMember,
        remainder: remainder,
        memberCount: memberUsersForTransaction.length,
        newBalance: president.balance.total,
        lastUpdated: president.balance.lastUpdated,
        fractionalRemainder: president.balance.fractionalRemainder || 0
      });
    } catch (transactionError: any) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error: any) {
    console.error('Error gifting members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface UpdateCrewIdentifierRequest extends Request {
  body: {
    crewIdentifier: string;
  }
}

router.post('/update-identifier', auth, async (req: UpdateCrewIdentifierRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewIdentifier } = req.body;
    if (!crewIdentifier) {
      res.status(400).json({ error: 'Crew identifier is required' });
      return;
    }

    if (crewIdentifier.length > 5) {
      res.status(400).json({ error: 'Crew identifier must be 5 characters or less' });
      return;
    }

    const validCharRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validCharRegex.test(crewIdentifier)) {
      res.status(400).json({ error: 'Crew identifier contains invalid characters' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId });
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      res.status(403).json({ error: 'Only the president can update the crew identifier' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId);
    if (!crew) {
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const normalizedCrewIdentifier = crewIdentifier.trim().toUpperCase();

    if (crew.crewIdentifier && normalizedCrewIdentifier === crew.crewIdentifier.toUpperCase()) {
      res.json({
        success: true,
        message: 'Crew identifier unchanged',
        crew: {
          id: (crew._id as mongoose.Types.ObjectId).toString(),
          crewName: crew.crewName,
          crewIdentifier: crew.crewIdentifier
        }
      });
      return;
    }

    const existingCrewByIdentifier = await Crew.findOne({ 
      crewIdentifier: normalizedCrewIdentifier,
      _id: { $ne: crew._id }
    });
    if (existingCrewByIdentifier) {
      res.status(400).json({ error: 'Crew identifier already exists' });
      return;
    }

    crew.crewIdentifier = normalizedCrewIdentifier;
    await crew.save();

    const crewId = crew._id;
    await CrewStatus.updateMany(
      { crewId: crewId },
      {
        $set: {
          crewIdentifier: normalizedCrewIdentifier
        }
      }
    );

    res.json({
      success: true,
      message: 'Crew identifier updated successfully',
      crew: {
        id: (crew._id as mongoose.Types.ObjectId).toString(),
        crewName: crew.crewName,
        crewIdentifier: crew.crewIdentifier
      }
    });
  } catch (error: any) {
    console.error('Error updating crew identifier:', error);
    if (error.code === 11000) {
      if (error.keyPattern?.crewIdentifier) {
        res.status(400).json({ error: 'Crew identifier already exists' });
        return;
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface PromoteMemberRequest extends Request {
  body: {
    crewId: string;
    memberUserId: string;
  }
}

router.post('/promote-member', auth, async (req: PromoteMemberRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let updatedCrew: any = null;
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId, memberUserId } = req.body;
    if (!crewId || !memberUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew ID and member user ID are required' });
      return;
    }

    const crew = await Crew.findById(crewId).session(session);
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    if (requesterStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can promote members' });
      return;
    }

    const memberObjectId = new mongoose.Types.ObjectId(memberUserId);
    
    if (crew.presidentId.toString() === memberUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Cannot promote the president' });
      return;
    }

    const memberStatus = await CrewStatus.findOne({ userId: memberObjectId }).session(session);
    if (!memberStatus) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Member crew status not found' });
      return;
    }

    if (memberStatus.crewId?.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Member is not in this crew' });
      return;
    }

    updatedCrew = await Crew.findOneAndUpdate(
      {
        _id: crewId,
        $expr: { $lt: [{ $size: '$executives' }, 4] },
        members: memberObjectId,
        executives: { $ne: memberObjectId }
      },
      {
        $pull: { members: memberObjectId },
        $addToSet: { executives: memberObjectId }
      },
      { new: true, session }
    );

    if (!updatedCrew) {
      const currentCrew = await Crew.findById(crewId).session(session);
      if (!currentCrew) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ error: 'Crew not found' });
        return;
      }
      
      if (currentCrew.executives.length >= 4) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'Crew already has maximum number of executives (4)' });
        return;
      }
      
      const isAlreadyExecutive = currentCrew.executives.some((execId: mongoose.Types.ObjectId) => 
        execId.toString() === memberUserId
      );
      if (isAlreadyExecutive) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'User is already an executive' });
        return;
      }
      
      const isMember = currentCrew.members.some((memberId: mongoose.Types.ObjectId) => 
        memberId.toString() === memberUserId
      );
      if (!isMember) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'User is not a member of this crew' });
        return;
      }
      
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Unable to promote member. Please try again.' });
      return;
    }

    memberStatus.role = 'executive';
    await memberStatus.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error promoting member:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    if (!updatedCrew) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const populatedCrew = await Crew.findById(updatedCrew._id)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .lean();

    if (!populatedCrew || !populatedCrew._id) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const president = populatedCrew.presidentId as any;
    const executives = (populatedCrew.executives || []) as any[];
    const members = (populatedCrew.members || []) as any[];

    res.json({
      success: true,
      message: 'Member promoted to executive successfully',
      crew: {
        id: populatedCrew._id.toString(),
        executives: executives.map((exec: any) => ({
          userId: exec._id.toString(),
          handle: exec.handle,
          level: exec.level || 1
        })),
        members: members.map((member: any) => ({
          userId: member._id.toString(),
          handle: member.handle,
          level: member.level || 1
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching crew after promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface DemoteExecutiveRequest extends Request {
  body: {
    crewId: string;
    executiveUserId: string;
  }
}

router.post('/demote-executive', auth, async (req: DemoteExecutiveRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let crewId: string | undefined;
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const bodyData = req.body;
    crewId = bodyData.crewId;
    const executiveUserId = bodyData.executiveUserId;
    if (!crewId || !executiveUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew ID and executive user ID are required' });
      return;
    }

    const crew = await Crew.findById(crewId).session(session);
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    if (requesterStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can demote executives' });
      return;
    }

    const executiveObjectId = new mongoose.Types.ObjectId(executiveUserId);
    
    if (crew.presidentId.toString() === executiveUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Cannot demote the president' });
      return;
    }

    const executiveStatus = await CrewStatus.findOne({ userId: executiveObjectId }).session(session);
    if (!executiveStatus) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Executive crew status not found' });
      return;
    }

    if (executiveStatus.crewId?.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Executive is not in this crew' });
      return;
    }

    const crewAfterUpdate = await Crew.findOneAndUpdate(
      {
        _id: crewId,
        executives: executiveObjectId,
        members: { $ne: executiveObjectId }
      },
      {
        $pull: { executives: executiveObjectId },
        $addToSet: { members: executiveObjectId }
      },
      { new: true, session }
    );

    if (!crewAfterUpdate) {
      const currentCrew = await Crew.findById(crewId).session(session);
      if (!currentCrew) {
        await session.abortTransaction();
        session.endSession();
        res.status(404).json({ error: 'Crew not found' });
        return;
      }
      
      const isExecutive = currentCrew.executives.some((execId: mongoose.Types.ObjectId) => 
        execId.toString() === executiveUserId
      );
      if (!isExecutive) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'User is not an executive of this crew' });
        return;
      }
      
      const isMember = currentCrew.members.some((memberId: mongoose.Types.ObjectId) => 
        memberId.toString() === executiveUserId
      );
      if (isMember) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: 'User is already a member' });
        return;
      }
      
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Unable to demote executive. Please try again.' });
      return;
    }

    executiveStatus.role = 'member';
    await executiveStatus.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error demoting executive:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    if (!crewId) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const updatedCrew = await Crew.findById(crewId)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .lean();

    const president = updatedCrew?.presidentId as any;
    const executives = (updatedCrew?.executives || []) as any[];
    const members = (updatedCrew?.members || []) as any[];

    res.json({
      success: true,
      message: 'Executive demoted to member successfully',
      crew: {
        id: updatedCrew?._id.toString(),
        executives: executives.map((exec: any) => ({
          userId: exec._id.toString(),
          handle: exec.handle,
          level: exec.level || 1
        })),
        members: members.map((member: any) => ({
          userId: member._id.toString(),
          handle: member.handle,
          level: member.level || 1
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching crew after demotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface ChooseSuccessorRequest extends Request {
  body: {
    crewId: string;
    successorUserId: string;
  }
}

router.post('/choose-successor', auth, async (req: ChooseSuccessorRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let updatedCrew: any = null;
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId, successorUserId } = req.body;
    if (!crewId || !successorUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew ID and successor user ID are required' });
      return;
    }

    const crew = await Crew.findById(crewId).session(session);
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    if (requesterStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can choose a successor' });
      return;
    }

    if (crew.presidentId.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the current president can choose a successor' });
      return;
    }

    const successorObjectId = new mongoose.Types.ObjectId(successorUserId);
    
    if (crew.presidentId.toString() === successorUserId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Cannot choose yourself as successor' });
      return;
    }

    const successorStatus = await CrewStatus.findOne({ userId: successorObjectId }).session(session);
    if (!successorStatus) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Successor crew status not found' });
      return;
    }

    if (successorStatus.crewId?.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Successor is not a member of this crew' });
      return;
    }

    const oldPresidentId = crew.presidentId;
    const isSuccessorExecutive = crew.executives.some((execId: mongoose.Types.ObjectId) => 
      execId.toString() === successorUserId
    );
    const isSuccessorMember = crew.members.some((memberId: mongoose.Types.ObjectId) => 
      memberId.toString() === successorUserId
    );

    if (!isSuccessorExecutive && !isSuccessorMember) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Successor must be an executive or member of this crew' });
      return;
    }

    const updateOperations: any = {
      presidentId: successorObjectId
    };

    const isOldPresidentInExecutives = crew.executives.some((execId: mongoose.Types.ObjectId) => 
      execId.toString() === oldPresidentId.toString()
    );
    const isOldPresidentInMembers = crew.members.some((memberId: mongoose.Types.ObjectId) => 
      memberId.toString() === oldPresidentId.toString()
    );

    const executivesToPull: mongoose.Types.ObjectId[] = [];
    const membersToPull: mongoose.Types.ObjectId[] = [];

    if (isSuccessorExecutive) {
      executivesToPull.push(successorObjectId);
    } else if (isSuccessorMember) {
      membersToPull.push(successorObjectId);
    }

    if (isOldPresidentInExecutives) {
      executivesToPull.push(oldPresidentId);
    }

    if (executivesToPull.length > 0) {
      updateOperations.$pull = { executives: { $in: executivesToPull } };
    }
    if (membersToPull.length > 0) {
      if (updateOperations.$pull) {
        updateOperations.$pull.members = { $in: membersToPull };
      } else {
        updateOperations.$pull = { members: { $in: membersToPull } };
      }
    }

    updatedCrew = await Crew.findByIdAndUpdate(
      crewId,
      updateOperations,
      { new: true, session }
    );

    if (!updatedCrew) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: 'Failed to update crew' });
      return;
    }

    if (!isOldPresidentInMembers) {
      await Crew.findByIdAndUpdate(
        crewId,
        { $addToSet: { members: oldPresidentId } },
        { session }
      );
      updatedCrew = await Crew.findById(crewId).session(session);
    }

    requesterStatus.role = 'member';
    await requesterStatus.save({ session });

    successorStatus.role = 'president';
    await successorStatus.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error choosing successor:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    if (!updatedCrew) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const populatedCrew = await Crew.findById(updatedCrew._id)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .lean();

    if (!populatedCrew || !populatedCrew._id) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const president = populatedCrew.presidentId as any;
    const executives = (populatedCrew.executives || []) as any[];
    const members = (populatedCrew.members || []) as any[];

    res.json({
      success: true,
      message: 'Successor chosen and leadership transferred successfully',
      crew: {
        id: populatedCrew._id.toString(),
        president: president ? { userId: president._id.toString(), handle: president.handle, level: president.level || 1 } : null,
        executives: executives.map((exec: any) => ({
          userId: exec._id.toString(),
          handle: exec.handle,
          level: exec.level || 1
        })),
        members: members.map((member: any) => ({
          userId: member._id.toString(),
          handle: member.handle,
          level: member.level || 1
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching crew after choosing successor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface ResignRequest extends Request {
  body: {
    crewId: string;
  }
}

router.post('/resign', auth, async (req: ResignRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let updatedCrew: any = null;
  
  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { crewId } = req.body;
    if (!crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew ID is required' });
      return;
    }

    const crew = await Crew.findById(crewId)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .session(session);
    
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    const requesterStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!requesterStatus || !requesterStatus.isInCrew || !requesterStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Requester is not in a crew' });
      return;
    }

    if (requesterStatus.crewId.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Requester is not a member of this crew' });
      return;
    }

    if (requesterStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can resign' });
      return;
    }

    const presidentId = (crew.presidentId as any)?._id || crew.presidentId;
    if (presidentId.toString() !== userId.toString()) {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the current president can resign' });
      return;
    }

    const oldPresidentId = (crew.presidentId as any)?._id || crew.presidentId;
    const oldPresidentIdString = oldPresidentId.toString();
    const executives = (crew.executives || []) as any[];
    const members = (crew.members || []) as any[];

    const eligibleExecutives = executives
      .filter((exec: any) => exec._id.toString() !== oldPresidentIdString)
      .sort((a: any, b: any) => (b.level || 1) - (a.level || 1));

    const eligibleMembers = members
      .filter((member: any) => member._id.toString() !== oldPresidentIdString)
      .sort((a: any, b: any) => (b.level || 1) - (a.level || 1));

    let successorObjectId: mongoose.Types.ObjectId | null = null;
    let isSuccessorExecutive = false;
    let isSuccessorMember = false;

    if (eligibleExecutives.length > 0) {
      successorObjectId = eligibleExecutives[0]._id;
      isSuccessorExecutive = true;
    } else if (eligibleMembers.length > 0) {
      successorObjectId = eligibleMembers[0]._id;
      isSuccessorMember = true;
    } else {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Cannot resign. No eligible executives or members available to take over.' });
      return;
    }

    if (!successorObjectId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'No eligible successor found' });
      return;
    }

    const successorStatus = await CrewStatus.findOne({ userId: successorObjectId }).session(session);
    if (!successorStatus) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Successor crew status not found' });
      return;
    }

    if (successorStatus.crewId?.toString() !== crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Successor is not a member of this crew' });
      return;
    }

    const isOldPresidentInExecutives = executives.some((exec: any) => 
      exec._id.toString() === oldPresidentIdString
    );
    const isOldPresidentInMembers = members.some((member: any) => 
      member._id.toString() === oldPresidentIdString
    );

    const executivesToPull: mongoose.Types.ObjectId[] = [];
    const membersToPull: mongoose.Types.ObjectId[] = [];

    if (isSuccessorExecutive) {
      executivesToPull.push(successorObjectId);
    } else if (isSuccessorMember) {
      membersToPull.push(successorObjectId);
    }

    const oldPresidentObjectId = new mongoose.Types.ObjectId(oldPresidentIdString);
    if (isOldPresidentInExecutives) {
      executivesToPull.push(oldPresidentObjectId);
    }

    const updateOperations: any = {
      presidentId: successorObjectId
    };

    if (executivesToPull.length > 0) {
      updateOperations.$pull = { executives: { $in: executivesToPull } };
    }
    if (membersToPull.length > 0) {
      if (updateOperations.$pull) {
        updateOperations.$pull.members = { $in: membersToPull };
      } else {
        updateOperations.$pull = { members: { $in: membersToPull } };
      }
    }

    updatedCrew = await Crew.findByIdAndUpdate(
      crewId,
      updateOperations,
      { new: true, session }
    );

    if (!updatedCrew) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ error: 'Failed to update crew' });
      return;
    }

    if (!isOldPresidentInMembers) {
      await Crew.findByIdAndUpdate(
        crewId,
        { $addToSet: { members: oldPresidentObjectId } },
        { session }
      );
      updatedCrew = await Crew.findById(crewId).session(session);
    }

    requesterStatus.role = 'member';
    await requesterStatus.save({ session });

    successorStatus.role = 'president';
    await successorStatus.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error resigning:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    if (!updatedCrew) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const populatedCrew = await Crew.findById(updatedCrew._id)
      .populate('presidentId', 'handle level')
      .populate('executives', 'handle level')
      .populate('members', 'handle level')
      .lean();

    if (!populatedCrew || !populatedCrew._id) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const president = populatedCrew.presidentId as any;
    const executives = (populatedCrew.executives || []) as any[];
    const members = (populatedCrew.members || []) as any[];

    res.json({
      success: true,
      message: 'Resigned successfully. Leadership transferred to next in line.',
      crew: {
        id: populatedCrew._id.toString(),
        president: president ? { userId: president._id.toString(), handle: president.handle, level: president.level || 1 } : null,
        executives: executives.map((exec: any) => ({
          userId: exec._id.toString(),
          handle: exec.handle,
          level: exec.level || 1
        })),
        members: members.map((member: any) => ({
          userId: member._id.toString(),
          handle: member.handle,
          level: member.level || 1
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching crew after resigning:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

interface DeclareWarRequest extends Request {
  body: {
    targetCrewId: string;
  }
}

router.post('/war-management/declare', auth, async (req: DeclareWarRequest, res: Response) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let userCrewId: mongoose.Types.ObjectId | null = null;

  try {
    const { targetCrewId } = req.body;
    if (!targetCrewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Target crew ID is required' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can declare war' });
      return;
    }

    userCrewId = crewStatus.crewId;
    if (userCrewId.toString() === targetCrewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Cannot declare war on your own crew' });
      return;
    }

    const userCrew = await Crew.findById(userCrewId).session(session);
    if (!userCrew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    // A crew can only declare war on ONE other crew at a time
    if (userCrew.warWithCrewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'You are already at war with another crew' });
      return;
    }

    const targetCrew = await Crew.findById(targetCrewId).session(session);
    if (!targetCrew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Target crew not found' });
      return;
    }

    // Note: We intentionally allow:
    // 1. Multiple crews to declare war on the same target crew
    // 2. Mutual wars (if crew A declares war on crew B, crew B can declare war back on crew A)
    // 3. A crew to declare war on a crew that has declared war on them
    // The only restriction is: a crew can only declare war on ONE other crew at a time (enforced above by checking userCrew.warWithCrewId)
    // This is the intended behavior - a crew can be targeted by multiple crews simultaneously.

    userCrew.warWithCrewId = new mongoose.Types.ObjectId(targetCrewId);
    userCrew.warDeclaredAt = new Date();
    await userCrew.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error declaring war:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    if (!userCrewId) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const updatedCrew = await Crew.findById(userCrewId)
      .populate('warWithCrewId', 'crewName crewIdentifier')
      .lean();

    if (!updatedCrew || !updatedCrew.warWithCrewId) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    const enemyCrew = updatedCrew.warWithCrewId as any;
    res.json({
      success: true,
      message: 'War declared successfully',
      warStatus: {
        enemyCrewId: enemyCrew._id.toString(),
        enemyCrewName: enemyCrew.crewName,
        enemyCrewIdentifier: enemyCrew.crewIdentifier,
        warDeclaredAt: updatedCrew.warDeclaredAt ? updatedCrew.warDeclaredAt.toISOString() : null
      }
    });
  } catch (error) {
    console.error('Error fetching crew after declaring war:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/war-management/terminate', auth, async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const crewStatus = await CrewStatus.findOne({ userId }).session(session);
    if (!crewStatus || !crewStatus.isInCrew || !crewStatus.crewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'User is not in a crew' });
      return;
    }

    if (crewStatus.role !== 'president') {
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({ error: 'Only the president can terminate war' });
      return;
    }

    const crew = await Crew.findById(crewStatus.crewId).session(session);
    if (!crew) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: 'Crew not found' });
      return;
    }

    if (!crew.warWithCrewId) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ error: 'Crew is not currently at war' });
      return;
    }

    crew.warWithCrewId = null;
    crew.warDeclaredAt = null;
    await crew.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'War declaration terminated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error terminating war:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

