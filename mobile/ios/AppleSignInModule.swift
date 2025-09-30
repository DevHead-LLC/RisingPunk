import Foundation
import AuthenticationServices
import React
import UIKit

@objc(AppleSignInModule)
class AppleSignInModule: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 13.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }
  
  @objc
  func requestAppleSignIn(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 13.0, *) {
      self.resolve = resolve
      self.reject = reject
      
      let appleIDProvider = ASAuthorizationAppleIDProvider()
      let request = appleIDProvider.createRequest()
      request.requestedScopes = [.fullName, .email]
      
      let authorizationController = ASAuthorizationController(authorizationRequests: [request])
      authorizationController.delegate = self
      authorizationController.presentationContextProvider = self
      authorizationController.performRequests()
    } else {
      reject("UNSUPPORTED_VERSION", "Apple Sign In requires iOS 13.0 or later", nil)
    }
  }
  
  // MARK: - ASAuthorizationControllerPresentationContextProviding
  
  @available(iOS 13.0, *)
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let window = windowScene.windows.first else {
      // Fallback to key window if window scene is not available
      return UIApplication.shared.windows.first ?? UIWindow()
    }
    return window
  }
  
  // MARK: - ASAuthorizationControllerDelegate
  
  @available(iOS 13.0, *)
  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      self.reject?("INVALID_CREDENTIAL", "Invalid Apple ID credential", nil)
      return
    }
    
    let userIdentifier = appleIDCredential.user
    
    // Safely extract identity token
    guard let identityTokenData = appleIDCredential.identityToken,
          let identityToken = String(data: identityTokenData, encoding: .utf8) else {
      self.reject?("INVALID_IDENTITY_TOKEN", "Failed to extract identity token from Apple credential", nil)
      return
    }
    
    var result: [String: Any] = [
      "user": userIdentifier,
      "identityToken": identityToken
    ]
    
    // Email is only provided on first sign-in
    if let email = appleIDCredential.email {
      result["email"] = email
    }
    
    // Full name is only provided on first sign-in
    if let fullName = appleIDCredential.fullName {
      var nameDict: [String: String] = [:]
      if let givenName = fullName.givenName {
        nameDict["givenName"] = givenName
      }
      if let familyName = fullName.familyName {
        nameDict["familyName"] = familyName
      }
      if !nameDict.isEmpty {
        result["fullName"] = nameDict
      }
    }
    
    self.resolve?(result)
  }
  
  @available(iOS 13.0, *)
  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    if let authError = error as? ASAuthorizationError {
      switch authError.code {
      case .canceled:
        self.reject?("USER_CANCELED", "User canceled Apple Sign In", error)
      case .failed:
        self.reject?("AUTHORIZATION_FAILED", "Apple Sign In authorization failed", error)
      case .invalidResponse:
        self.reject?("INVALID_RESPONSE", "Invalid response from Apple Sign In", error)
      case .notHandled:
        self.reject?("NOT_HANDLED", "Apple Sign In request not handled", error)
      case .unknown:
        self.reject?("UNKNOWN_ERROR", "Unknown Apple Sign In error", error)
      @unknown default:
        self.reject?("UNKNOWN_ERROR", "Unknown Apple Sign In error", error)
      }
    } else {
      self.reject?("UNKNOWN_ERROR", "Unknown error during Apple Sign In", error)
    }
  }
}
