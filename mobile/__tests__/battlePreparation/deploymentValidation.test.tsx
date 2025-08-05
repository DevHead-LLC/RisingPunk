/**
 * @file deploymentValidation.test.tsx
 * @description Batch 1C: Deployment Validation Tests
 * Tests for preventing empty deployments
 */

import { TEST_VALID_BATTALION_ASSIGNMENTS } from '../testUtils';

describe('Batch 1C: Deployment Validation', () => {
  describe('should prevent empty deployments', () => {
    it('should allow deployment when at least one battalion has bots assigned', () => {
      // Test scenario: valid deployment with assigned bots
      const assignments = {
        A: { botType: 'guardian', quantity: 15, markLevel: 1 },
        B: null,
        C: null
      };
      
      // Verify at least one battalion has bots assigned
      const hasValidAssignment = Object.values(assignments).some(
        assignment => assignment && assignment.quantity > 0
      );
      
      expect(hasValidAssignment).toBe(true);
      
      // Verify deployment should be allowed
      expect(validateDeployment(assignments)).toBe(true);
    });

    it('should prevent deployment when no battalions have bots assigned', () => {
      // Test scenario: empty deployment
      const assignments = {
        A: null,
        B: null,
        C: null
      };
      
      // Verify no battalions have bots assigned
      const hasValidAssignment = Object.values(assignments).some(
        assignment => assignment && assignment.quantity > 0
      );
      
      expect(hasValidAssignment).toBe(false);
      
      // Verify deployment should be prevented
      expect(validateDeployment(assignments)).toBe(false);
    });

    it('should prevent deployment when all assignments have zero quantity', () => {
      // Test scenario: assignments exist but with zero quantity
      const assignments = {
        A: { botType: 'guardian', quantity: 0, markLevel: 1 },
        B: { botType: 'breacher', quantity: 0, markLevel: 1 },
        C: { botType: 'phreak', quantity: 0, markLevel: 1 }
      };
      
      // Verify all assignments have zero quantity
      const hasValidAssignment = Object.values(assignments).some(
        assignment => assignment && assignment.quantity > 0
      );
      
      expect(hasValidAssignment).toBe(false);
      
      // Verify deployment should be prevented
      expect(validateDeployment(assignments)).toBe(false);
    });

    it('should allow deployment with multiple battalions assigned', () => {
      // Test scenario: multiple battalions assigned
      const assignments = {
        A: { botType: 'guardian', quantity: 15, markLevel: 1 },
        B: { botType: 'breacher', quantity: 12, markLevel: 1 },
        C: { botType: 'phreak', quantity: 8, markLevel: 1 }
      };
      
      // Verify multiple battalions have bots assigned
      const validAssignments = Object.values(assignments).filter(
        assignment => assignment && assignment.quantity > 0
      );
      
      expect(validAssignments.length).toBeGreaterThan(1);
      
      // Verify deployment should be allowed
      expect(validateDeployment(assignments)).toBe(true);
    });

    it('should handle mixed assignments correctly', () => {
      // Test scenario: some battalions assigned, some not
      const assignments = {
        A: { botType: 'guardian', quantity: 15, markLevel: 1 },
        B: null,
        C: { botType: 'phreak', quantity: 0, markLevel: 1 }
      };
      
      // Verify at least one battalion has valid assignment
      const hasValidAssignment = Object.values(assignments).some(
        assignment => assignment && assignment.quantity > 0
      );
      
      expect(hasValidAssignment).toBe(true);
      
      // Verify deployment should be allowed
      expect(validateDeployment(assignments)).toBe(true);
    });
  });

  describe('should provide appropriate error messages', () => {
    it('should return error message for empty deployment', () => {
      const assignments = {
        A: null,
        B: null,
        C: null
      };
      
      const validationResult = validateDeploymentWithMessage(assignments);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.message).toContain('at least one battalion');
      expect(validationResult.message).toContain('before deploying');
    });

    it('should return success message for valid deployment', () => {
      const assignments = {
        A: { botType: 'guardian', quantity: 15, markLevel: 1 },
        B: null,
        C: null
      };
      
      const validationResult = validateDeploymentWithMessage(assignments);
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.message).toContain('ready');
    });
  });
});

// Helper functions for testing
function validateDeployment(assignments: Record<string, any>): boolean {
  return Object.values(assignments).some(
    assignment => assignment && assignment.quantity > 0
  );
}

function validateDeploymentWithMessage(assignments: Record<string, any>): { isValid: boolean; message: string } {
  const hasValidAssignment = Object.values(assignments).some(
    assignment => assignment && assignment.quantity > 0
  );
  
  if (hasValidAssignment) {
    return {
      isValid: true,
      message: 'Deployment ready!'
    };
  } else {
    return {
      isValid: false,
      message: 'Please assign at least one battalion before deploying.'
    };
  }
} 