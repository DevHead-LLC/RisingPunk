import Foundation
import GameKit
import React
import UIKit

@objc(GameCenterModule)
class GameCenterModule: NSObject {
  
  private let authLock = NSLock()
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func authenticate(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    let localPlayer = GKLocalPlayer.local
    
    if localPlayer.isAuthenticated {
      let result: [String: Any] = [
        "authenticated": true,
        "playerID": localPlayer.gamePlayerID,
        "displayName": localPlayer.displayName,
        "alias": localPlayer.alias
      ]
      resolve(result)
      return
    }
    
    var hasResolved = false
    let lock = authLock
    
    localPlayer.authenticateHandler = { [weak self] viewController, error in
      guard let self = self else {
        // Module was deallocated - check if promise already resolved before rejecting
        lock.lock()
        let alreadyResolved = hasResolved
        if !alreadyResolved {
          hasResolved = true
        }
        lock.unlock()
        
        if !alreadyResolved {
          reject("MODULE_DEALLOCATED", "Game Center module was deallocated during authentication", nil)
        }
        return
      }
      
      // Check if already resolved (atomic check)
      self.authLock.lock()
      let alreadyResolved = hasResolved
      if alreadyResolved {
        self.authLock.unlock()
        return
      }
      self.authLock.unlock()
      
      if let error = error {
        // Atomic check-and-set before rejecting
        self.authLock.lock()
        if hasResolved {
          self.authLock.unlock()
          return
        }
        hasResolved = true
        self.authLock.unlock()
        reject("AUTHENTICATION_FAILED", "Game Center authentication failed: \(error.localizedDescription)", error)
        return
      }
      
      if let viewController = viewController {
        // First call: Present sign-in UI, but don't resolve yet
        // Handler will be called again after user completes sign-in
        DispatchQueue.main.async {
          guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let window = windowScene.windows.first,
                let rootViewController = window.rootViewController else {
            // Atomic check-and-set before rejecting
            self.authLock.lock()
            if hasResolved {
              self.authLock.unlock()
              return
            }
            hasResolved = true
            self.authLock.unlock()
            reject("NO_ROOT_VIEW_CONTROLLER", "Could not find root view controller", nil)
            return
          }
          rootViewController.present(viewController, animated: true)
        }
        return
      }
      
      // Second call: User completed sign-in, now resolve or reject
      // Atomic check-and-set before resolving/rejecting
      self.authLock.lock()
      if hasResolved {
        self.authLock.unlock()
        return
      }
      hasResolved = true
      self.authLock.unlock()
      
      if localPlayer.isAuthenticated {
        let result: [String: Any] = [
          "authenticated": true,
          "playerID": localPlayer.gamePlayerID,
          "displayName": localPlayer.displayName,
          "alias": localPlayer.alias
        ]
        resolve(result)
      } else {
        reject("NOT_AUTHENTICATED", "Player is not authenticated", nil)
      }
    }
    
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      guard let self = self else {
        // Module was deallocated - check if promise already resolved before rejecting
        lock.lock()
        let alreadyResolved = hasResolved
        if !alreadyResolved {
          hasResolved = true
        }
        lock.unlock()
        
        if !alreadyResolved {
          reject("MODULE_DEALLOCATED", "Game Center module was deallocated during authentication", nil)
        }
        return
      }
      
      // Evaluate authentication state once before locking
      let isAuthenticated = localPlayer.isAuthenticated
      
      // Atomic check-and-set before resolving
      self.authLock.lock()
      if hasResolved || !isAuthenticated {
        self.authLock.unlock()
        return
      }
      hasResolved = true
      self.authLock.unlock()
      
      // Use the stored authentication state (already verified above)
      let result: [String: Any] = [
        "authenticated": true,
        "playerID": localPlayer.gamePlayerID,
        "displayName": localPlayer.displayName,
        "alias": localPlayer.alias
      ]
      resolve(result)
    }
  }
  
  @objc
  func submitScore(
    _ leaderboardID: String,
    score: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    
    let localPlayer = GKLocalPlayer.local
    
    guard localPlayer.isAuthenticated else {
      reject("NOT_AUTHENTICATED", "Player must be authenticated before submitting scores", nil)
      return
    }
    
    let scoreReporter = GKScore(leaderboardIdentifier: leaderboardID)
    scoreReporter.value = score.int64Value
    
    GKScore.report([scoreReporter]) { error in
      if let error = error {
        reject("SUBMIT_FAILED", "Failed to submit score: \(error.localizedDescription)", error)
        return
      }
      
      let result: [String: Any] = [
        "success": true,
        "leaderboardID": leaderboardID,
        "score": score.int64Value
      ]
      resolve(result)
    }
  }
  
  @objc
  func isAuthenticated(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let localPlayer = GKLocalPlayer.local
    resolve(localPlayer.isAuthenticated)
  }
  
  @objc
  func getPlayerID(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let localPlayer = GKLocalPlayer.local
    
    guard localPlayer.isAuthenticated else {
      reject("NOT_AUTHENTICATED", "Player is not authenticated", nil)
      return
    }
    
    resolve(localPlayer.gamePlayerID)
  }
}
