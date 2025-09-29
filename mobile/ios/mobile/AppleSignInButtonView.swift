import Foundation
import AuthenticationServices
import React

@objc(AppleSignInButtonView)
class AppleSignInButtonView: UIView {
  
  private var appleSignInButton: ASAuthorizationAppleIDButton?
  private var onPress: RCTBubblingEventBlock?
  
  override init(frame: CGRect) {
    super.init(frame: frame)
    setupAppleSignInButton()
  }
  
  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupAppleSignInButton()
  }
  
  private func setupAppleSignInButton() {
    if #available(iOS 13.0, *) {
      // Create the official Apple Sign In button
      let button = ASAuthorizationAppleIDButton(type: .signIn, style: .black)
      button.addTarget(self, action: #selector(appleSignInButtonTapped), for: .touchUpInside)
      
      self.appleSignInButton = button
      self.addSubview(button)
      
      // Set up constraints to fill the entire view
      button.translatesAutoresizingMaskIntoConstraints = false
      NSLayoutConstraint.activate([
        button.topAnchor.constraint(equalTo: self.topAnchor),
        button.leadingAnchor.constraint(equalTo: self.leadingAnchor),
        button.trailingAnchor.constraint(equalTo: self.trailingAnchor),
        button.bottomAnchor.constraint(equalTo: self.bottomAnchor)
      ])
    }
  }
  
  @objc
  func setOnPress(_ onPress: @escaping RCTBubblingEventBlock) {
    self.onPress = onPress
  }
  
  @objc
  private func appleSignInButtonTapped() {
    onPress?([:])
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    appleSignInButton?.frame = bounds
  }
}
