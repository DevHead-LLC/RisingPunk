import { useEffect, useRef, useState } from 'react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import './MailchimpSignup.css'

function MailchimpSignup() {
  const [ref, isVisible] = useScrollAnimation()
  const formRef = useRef(null)
  const scriptsLoadedRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const emailInputRef = useRef(null)

  useEffect(() => {
    // Only load Mailchimp scripts when component is visible (performance optimization)
    if (!isVisible || scriptsLoadedRef.current) return

    // Load Mailchimp CSS
    const link = document.createElement('link')
    link.href = '//cdn-images.mailchimp.com/embedcode/classic-061523.css'
    link.rel = 'stylesheet'
    link.type = 'text/css'
    document.head.appendChild(link)

    // Load Mailchimp validation script
    const script = document.createElement('script')
    script.src = '//s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js'
    script.async = true
    script.defer = true
    script.onload = () => {
      // Initialize Mailchimp validation after script loads
      if (window.mcValidate) {
        window.mcValidate()
      }
    }
    document.body.appendChild(script)

    scriptsLoadedRef.current = true

    // Cleanup function
    return () => {
      // Note: We don't remove the scripts on unmount as they may be needed for form submission
    }
  }, [isVisible])

  const handleEmailFocus = () => {
    setIsExpanded(true)
  }

  const handleEmailClick = () => {
    setIsExpanded(true)
  }

  useEffect(() => {
    // Set up GA4 tracking for form submission
    const form = formRef.current
    if (!form) return

    const handleSubmit = (e) => {
      // Track form start (user began filling it out)
      if (window.gtag) {
        window.gtag('event', 'form_start', {
          event_category: 'engagement',
          event_label: 'mailchimp_newsletter',
          value: 1
        })
      }
      
      // Expand form on submit to show GDPR if not already expanded
      if (!isExpanded) {
        e.preventDefault()
        setIsExpanded(true)
        // Scroll GDPR into view after a brief delay
        setTimeout(() => {
          const gdprSection = document.getElementById('mergeRow-gdpr')
          if (gdprSection) {
            gdprSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
        return false
      }
    }

    // Listen for Mailchimp's success callback
    const handleSuccess = () => {
      if (window.gtag) {
        window.gtag('event', 'email_signup', {
          event_category: 'engagement',
          event_label: 'mailchimp_newsletter',
          value: 1
        })
      }
    }

    // Mailchimp forms use AJAX, so we need to listen for their success message
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const successMessage = node.querySelector?.('#mce-success-response')
              if (successMessage && successMessage.style.display !== 'none') {
                handleSuccess()
              }
            }
          })
        }
      })
    })

    form.addEventListener('submit', handleSubmit)
    
    // Observe the form container for success messages
    const formContainer = form.closest('#mc_embed_signup')
    if (formContainer) {
      observer.observe(formContainer, {
        childList: true,
        subtree: true
      })
    }

    return () => {
      form.removeEventListener('submit', handleSubmit)
      observer.disconnect()
    }
  }, [isExpanded])

  return (
    <section className="mailchimp-signup section" id="newsletter-signup">
      <div className="container">
        <div className={`mailchimp-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <div 
            id="mc_embed_signup"
            className={`mailchimp-form-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}
            ref={formRef}
            aria-label="Newsletter signup form"
          >
            {/* Header - Always visible */}
            <div className="mailchimp-header">
              <h2 className="mailchimp-title">🌟 Get RisingPunk Updates & Exclusive Rewards!</h2>
              <p className="mailchimp-description">
                Join the RisingPunk Newsletter for game updates, strategy tips, and exclusive rewards like balance increases you can claim in-game!
              </p>
            </div>
            <form
              action="https://risingpunk.us18.list-manage.com/subscribe/post?u=3eb7c4be12b4d9e2d7ea5072c&amp;id=4cb2e84851&amp;f_id=0073ace6f0"
              method="post"
              id="mc-embedded-subscribe-form"
              name="mc-embedded-subscribe-form"
              className="validate"
              target="_blank"
              noValidate
              aria-label="Subscribe to RisingPunk Newsletter"
            >
              <div id="mc_embed_signup_scroll">
                <div className={`indicates-required ${!isExpanded ? 'field-hidden' : ''}`}>
                  <span className="asterisk">*</span> indicates required
                </div>
                <div className="mc-field-group">
                  <label htmlFor="mce-EMAIL">
                    Email Address <span className="asterisk">*</span>
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    name="EMAIL"
                    className="required email"
                    id="mce-EMAIL"
                    required
                    aria-required="true"
                    aria-describedby="email-help"
                    placeholder="your.email@example.com"
                    onFocus={handleEmailFocus}
                    onClick={handleEmailClick}
                  />
                  <span id="email-help" className="sr-only">
                    Enter your email address to subscribe
                  </span>
                </div>
                <div className={`mc-field-group ${!isExpanded ? 'field-hidden' : ''}`}>
                  <label htmlFor="mce-FNAME">First Name</label>
                  <input
                    type="text"
                    name="FNAME"
                    className="text"
                    id="mce-FNAME"
                    placeholder="Your first name (optional)"
                    aria-describedby="name-help"
                  />
                  <span id="name-help" className="sr-only">
                    Enter your first name for personalization (optional)
                  </span>
                </div>
                {/* GDPR Consent Checkbox - Always in DOM, hidden when collapsed */}
                <div 
                  id="mergeRow-gdpr" 
                  className={`mergeRow gdpr-mergeRow content__gdprBlock mc-field-group ${!isExpanded ? 'gdpr-hidden' : ''}`}
                >
                  <div className="content__gdpr">
                    <label>Email Consent</label>
                    <p>I agree to receive emails from RisingPunk, including game updates, strategy tips, and exclusive rewards. You can unsubscribe at any time.</p>
                    <fieldset className="mc_fieldset gdprRequired mc-field-group" name="interestgroup_field">
                      <label className="checkbox subfield" htmlFor="gdpr_105529">
                        <input
                          type="checkbox"
                          id="gdpr_105529"
                          name="gdpr[105529]"
                          className="gdpr"
                          value="Y"
                          required
                          aria-required="true"
                        />
                        <span>I agree to receive marketing emails from RisingPunk</span>
                      </label>
                    </fieldset>
                    <p>You can unsubscribe at any time by clicking the link in the footer of our emails. For information about our privacy practices, please visit our website.</p>
                  </div>
                  <div className="content__gdprLegal">
                    <p>
                      We use Mailchimp as our marketing platform. By clicking below to subscribe, you acknowledge that your information will be transferred to Mailchimp for processing.{' '}
                      <a href="https://mailchimp.com/legal/terms" target="_blank" rel="noopener noreferrer">
                        Learn more
                      </a>{' '}
                      about Mailchimp's privacy practices.
                    </p>
                  </div>
                </div>
                <div id="mce-responses" className="clear">
                  <div className="response" id="mce-error-response" style={{ display: 'none' }} role="alert" aria-live="polite"></div>
                  <div className="response" id="mce-success-response" style={{ display: 'none' }} role="alert" aria-live="polite"></div>
                </div>
                {/* Honeypot field for spam prevention */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
                  <input
                    type="text"
                    name="b_3eb7c4be12b4d9e2d7ea5072c_4cb2e84851"
                    tabIndex="-1"
                    value=""
                    readOnly
                  />
                </div>
                <div className="clear">
                  <input
                    type="submit"
                    name="subscribe"
                    id="mc-embedded-subscribe"
                    className="button mailchimp-submit"
                    value="Subscribe"
                    aria-label="Subscribe to newsletter"
                  />
                </div>
              </div>
            </form>
            <p className="mailchimp-privacy">
              By subscribing, you agree to our{' '}
              <a href="/privacy" className="privacy-link">
                Privacy Policy
              </a>
              . We respect your privacy and will never spam you.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MailchimpSignup
