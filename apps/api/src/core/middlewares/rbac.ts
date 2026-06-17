import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { groupMemberRepository } from '../../modules/groups/group.repository';

// Extend Express Request object to include groupMember info
declare global {
  namespace Express {
    interface Request {
      groupMember?: any;
    }
  }
}

export type GroupRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type GroupPermission =
  | 'VIEW_GROUP'           // View details, timeline, settlements, analytics
  | 'RECORD_EXPENSE'       // Add/edit/delete own expenses
  | 'MANAGE_EXPENSES'      // Delete/edit any expense
  | 'RECORD_SETTLEMENT'    // Settle debts
  | 'INVITE_MEMBER'        // Invite new members
  | 'REMOVE_MEMBER'        // Remove member (MEMBER/VIEWER, or ADMIN by OWNER)
  | 'MANAGE_SETTINGS'      // Update name/description/currency
  | 'DELETE_GROUP'         // Delete group
  | 'UPDATE_MEMBER_ROLE';   // Change role of other members

export const RolePermissions: Record<GroupRole, GroupPermission[]> = {
  OWNER: [
    'VIEW_GROUP',
    'RECORD_EXPENSE',
    'MANAGE_EXPENSES',
    'RECORD_SETTLEMENT',
    'INVITE_MEMBER',
    'REMOVE_MEMBER',
    'MANAGE_SETTINGS',
    'DELETE_GROUP',
    'UPDATE_MEMBER_ROLE'
  ],
  ADMIN: [
    'VIEW_GROUP',
    'RECORD_EXPENSE',
    'MANAGE_EXPENSES',
    'RECORD_SETTLEMENT',
    'INVITE_MEMBER',
    'REMOVE_MEMBER',
    'MANAGE_SETTINGS',
    'UPDATE_MEMBER_ROLE'
  ],
  MEMBER: [
    'VIEW_GROUP',
    'RECORD_EXPENSE',
    'RECORD_SETTLEMENT',
    'INVITE_MEMBER'
  ],
  VIEWER: [
    'VIEW_GROUP'
  ]
};

export const requireGroupRole = (allowedRoles: GroupRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Authentication required', 401));
      }

      // Check groupId in request params. Route parameters can be "groupId" (for nested routers) or "id" (for direct group requests)
      const groupId = req.params.groupId || req.params.id;
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      const member = await groupMemberRepository.findOne({ group: groupId, user: user.id });
      if (!member) {
        return next(new AppError('You are not a member of this group', 403));
      }

      if (!allowedRoles.includes(member.role as GroupRole)) {
        return next(new AppError('You do not have permission to perform this action', 403));
      }

      req.groupMember = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireGroupPermission = (permission: GroupPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError('Authentication required', 401));
      }

      const groupId = req.params.groupId || req.params.id;
      if (!groupId) {
        return next(new AppError('Group ID is required', 400));
      }

      const member = await groupMemberRepository.findOne({ group: groupId, user: user.id });
      if (!member) {
        return next(new AppError('You are not a member of this group', 403));
      }

      const permissions = RolePermissions[member.role as GroupRole] || [];
      if (!permissions.includes(permission)) {
        return next(new AppError('You do not have permission to perform this action', 403));
      }

      req.groupMember = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};
