import Foundation
import GameKit
import React
import UIKit

@objc(GameCenterModule)
class GameCenterModule: NSObject {
  
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
    
    localPlayer.authenticateHandler = { viewController, error in
      guard !hasResolved else { return }
      
      if let error = error {
        hasResolved = true
        reject("AUTHENTICATION_FAILED", "Game Center authentication failed: \(error.localizedDescription)", error)
        return
      }
      
      if let viewController = viewController {
        DispatchQueue.main.async {
          guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let window = windowScene.windows.first,
                let rootViewController = window.rootViewController else {
            hasResolved = true
            reject("NO_ROOT_VIEW_CONTROLLER", "Could not find root view controller", nil)
            return
          }
          rootViewController.present(viewController, animated: true)
        }
        return
      }
      
      if localPlayer.isAuthenticated {
        hasResolved = true
        let result: [String: Any] = [
          "authenticated": true,
          "playerID": localPlayer.gamePlayerID,
          "displayName": localPlayer.displayName,
          "alias": localPlayer.alias
        ]
        resolve(result)
      } else {
        hasResolved = true
        reject("NOT_AUTHENTICATED", "Player is not authenticated", nil)
      }
    }
    
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      if !hasResolved && localPlayer.isAuthenticated {
        hasResolved = true
        let result: [String: Any] = [
          "authenticated": true,
          "playerID": localPlayer.gamePlayerID,
          "displayName": localPlayer.displayName,
          "alias": localPlayer.alias
        ]
        resolve(result)
      }
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
